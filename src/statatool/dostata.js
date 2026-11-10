import fs from 'fs';
import path from 'path';

import { fileURLToPath } from 'url';

// 在 ESM 中引入同目錄的自訂模組，必須加上擴充副檔名（例如 .js 或 .mjs）
import * as knitr from './knitr.js';
import { find_stata } from './find_stata.js';
import { stata_engine } from './stata_engine.js';
import { stataoutput } from './stataoutputhook.js';


const stataexe = await find_stata();
if (stataexe !== "") {
  knitr.opts_chunk['engine_path'] = { stata: stataexe };
  knitr.opts_chunk['engine'] = "stata";
}  


function getStataPath()
{
  return knitr.opts_chunk?.engine_path?.['stata'] || "";
}


function predo(afolder = '') {
  const toolpath = afolder === ''
    ? path.resolve(import.meta.dirname, '../../../tools')
    : afolder;

  const rst = `adopath + "${toolpath}"
  set linesize 255
  //<<- pre ->>
  `
  return rst
}
function postdo(adir) {
  const rst = `//<<- post ->>
graph dir
return list
foreach item in \`r(list)'{
  graph export ${adir}/\`item'.svg, replace name(\`item')
  
}
`
  return rst
}
const defaultOption={
  savedo:false,
  error:false,
  cleanlog:false,
  comment:false,
  collectcode:false
  
}
async function doStata(stataCode,  chunkParam) {
  let chunkOpt;
  if (chunkParam === null || typeof chunkParam !== 'object') {
    throw new TypeError("預期參數必須是一個一般物件！");
  }

  try {
    // 檢查是否為 Map 物件，如果是則轉成一般物件，否則直接淺拷貝物件
    if (chunkParam instanceof Map) {
      chunkOpt = Object.fromEntries(chunkParam);
    } else {
      chunkOpt = { ...chunkParam };
    }

    // 將原本的 Map .set() 方法改為物件屬性賦值
    knitr.opts_chunk['code'] = stataCode.split("\n");

    // savedo: 執行的暫存檔要不要留著,如果要留要給個label否則就是undefiend.do
    knitr.opts_chunk['savedo'] = chunkOpt['savedo'] ? chunkOpt['savedo'] : false;
    knitr.opts_chunk['error'] = chunkOpt['error'] ? chunkOpt['error'] : false;

    // 指令碼要不要留在結果中,和log file 無關
    knitr.opts_chunk['cleanlog'] = chunkOpt['cleanlog'] ? chunkOpt['cleanlog'] : false;
    knitr.opts_chunk['comment'] = chunkOpt['comment'] ? chunkOpt['comment'] : false;
    knitr.opts_chunk['collectcode'] = chunkOpt['collectcode']; // todo :沒必要的這行
    knitr.opts_chunk['workdir'] = chunkOpt['workdir'];

    // 主要工作
    // 取值部分改為物件屬性讀取
    const currentWorkdir = knitr.opts_chunk['workdir'];
    const currentCollectCode = knitr.opts_chunk['collectcode'];
    const currentCode = knitr.opts_chunk['code'];

    fs.appendFileSync(
      path.join(currentWorkdir, 'profile.do'),
      currentCollectCode ? currentCode.join('\n') + '\n' : '\n'
    );

    let pretxt = predo()
    let posttxt = postdo(path.join(import.meta.dirname, '../../../temp'))

    // 整合原來的程式碼 + posttxt
    knitr.opts_chunk['code'] = [...pretxt.split('\n'), ...currentCode, ...posttxt.split('\n')];

    // 直接傳入一般物件 knitr.opts_chunk
    const rst = await stata_engine(knitr.opts_chunk);

    // 傳入一般物件 knitr.opts_chunk
    const final_rst = stataoutput(rst.output.split("\n"), knitr.opts_chunk);

    return {
      txt: Array.isArray(final_rst) ? final_rst.join('\n') : final_rst,
      imglist: rst.imglist || []
    }
  } catch (error) {
    console.error('Error running example:', error);
  }
}

export {getStataPath,doStata}
