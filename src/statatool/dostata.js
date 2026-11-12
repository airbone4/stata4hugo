import fs from 'fs';
import path from 'path';

import { fileURLToPath } from 'url';

// 在 ESM 中引入同目錄的自訂模組，必須加上擴充副檔名（例如 .js 或 .mjs）
import * as knitr from './knitr.js';
import { find_stata } from './find_stata.js';
import { stata_engine } from './stata_engine.js';
import { stataoutput } from './stataoutputhook.js';

const stata_chunk_default={
  savedo:false,
  savelog:false
}
knitr.lang_chunk["stata"]=stata_chunk_default

const stataexe = await find_stata();
if (stataexe !== "") {
  knitr.opts_chunk['engine_path'] = { stata: stataexe };
  knitr.opts_chunk['engine'] = "stata";
}


function getStataPath() {
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
//dddd1 postdo 圖形加底線
// function postdo(adir) {
//   const rst = `//<<- post ->>
// graph dir
// return list
// foreach item in \`r(list)'{
//   graph export ${adir}/_\`item'.svg, replace name(\`item')
  
// }
// `
//   return rst
// }
function postdo(adir) {
  const rst = `//<<- post ->>
graph dir
return list
foreach item in \`r(list)'{
  tempfile tmp
  local imgname=subinstr("\`tmp'",".tmp","",.)
  graph export "\`imgname'.svg", replace name(\`item')
  
}
`
  return rst
}

const defaultOption = {
  savedo: false,
  error: false,
  cleanlog: false,
  comment: false,
  collectcode: false

}
async function doStata(stataCode, chunkParam) {
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

    chunkOpt = { stata_chunk_default,...knitr.opts_chunk  }
    chunkOpt = { ...knitr.opts_chunk, ...defaultOption }
    chunkOpt = { ...chunkOpt, ...chunkParam }
 
    const rawcode = typeof stataCode === "string" ? stataCode.split("\n") : stataCode;
    if (chunkOpt['collectcode']) {
      fs.appendFileSync(
        path.join(chunkOpt['workdir'], 'profile.do'),
        rawcode.join('\n') + '\n'
      );
    }

    let pretxt = predo()
    //dddd1 check
    //let posttxt = postdo(path.join(import.meta.dirname, '../../../temp'))
    let posttxt = postdo( chunkParam.imgdir)

    // 整合原來的程式碼 pretxt+ rawcode + posttxt
    chunkOpt['code'] = [...pretxt.split('\n'), ...rawcode, ...posttxt.split('\n')];

    const rst = await stata_engine(chunkOpt);
    const final_rst = stataoutput(rst.output.split("\n"), chunkOpt);

    return {
      txt: Array.isArray(final_rst) ? final_rst.join('\n') : final_rst,
      imglist: rst.imglist || []
    }
  } catch (error) {
    console.error('Error running example:', error);
  }
}

export { getStataPath, doStata }
