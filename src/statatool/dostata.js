import fs from 'fs';
import path from 'path';

import { fileURLToPath } from 'url';

// 在 ESM 中引入同目錄的自訂模組，必須加上擴充副檔名（例如 .js 或 .mjs）
import * as knitr from './knitr.js';
import { find_stata } from './find_stata.js';
import { stata_engine } from './stata_engine.js';
import { stataoutput } from './stataoutputhook.js';


function predo(afolder=''){
  
const toolpath = afolder === '' 
  ? path.resolve(import.meta.dirname, '../../../tools') 
  : afolder;  

  const rst=`adopath + "${toolpath}"
  set linesize 255
  //<<- pre ->>
  `
  return rst
}
function postdo(adir){
const rst=  `//<<- post ->>
graph dir
return list
foreach item in \`r(list)'{
  graph export ${adir}/\`item'.svg, replace name(\`item')
  
}
`
return rst
}
export async function doStata(stataCode, workdir, metadata) {
  
  try {
    // 💡 已將原本的物件點號賦值（.key = ...）改為 Map 的 .set() 方法
    knitr.opts_chunk.set('code', stataCode.split("\n"));
    
    // savedo: 執行的暫存檔要不要留著,如果要留要給個label否則就是undefiend.do
    knitr.opts_chunk.set('savedo', metadata.savedo ? metadata.savedo : false);
    knitr.opts_chunk.set('error', metadata.error ? metadata.error : false);
    
    // 指令碼要不要留在結果中,和log file 無關
    knitr.opts_chunk.set('cleanlog', metadata.cleanlog ? metadata.cleanlog : false);
    knitr.opts_chunk.set('comment', metadata.comment ? metadata.comment : false);
    knitr.opts_chunk.set('collectcode', metadata.collectcode); // todo :沒必要的這行
    
    // 💡 knit_engines 也是 Map，改用 .set()
    knitr.knit_engines.set('stata', stata_engine);
    
    // 主要工作
    // 💡 取值部分（原本的 .workdir、.collectcode、.code）改為 .get()
    const currentWorkdir = knitr.opts_chunk.get('workdir');
    const currentCollectCode = knitr.opts_chunk.get('collectcode');
    const currentCode = knitr.opts_chunk.get('code');

    fs.appendFileSync(
      path.join(currentWorkdir, 'profile.do'), 
      currentCollectCode ? currentCode.join('\n') + '\n' : '\n'
    );
    
    let pretxt=predo()
    let posttxt=postdo(path.join(import.meta.dirname,'../../../temp'))
    
    //整合原來的程式碼 + posttxt
    // 💡 重新設定 code 陣列，使用 .set()
    knitr.opts_chunk.set('code', [...pretxt.split('\n'), ...currentCode, ...posttxt.split('\n')]);
    
    // 💡 傳遞參數給 stata_engine，因為原本預期傳入物件，
    // 如果 stata_engine 內部也需要讀取這些設定，您可能需要傳入 knitr.opts_chunk（Map 物件）
    // 或者將 Map 轉回一般物件傳過去，例如：Object.fromEntries(knitr.opts_chunk)
    // 這裡先依原本邏輯直接傳入 Map 實例：
    //const rst = await stata_engine(knitr.opts_chunk);
    const rst = await stata_engine(Object.fromEntries(knitr.opts_chunk));
    
    
    // 💡 同理，stataoutput 傳入 Map 實例
    const final_rst = stataoutput(rst.output.split("\n"), knitr.opts_chunk);
    
    return {
      txt:Array.isArray(final_rst) ? final_rst.join('\n') : final_rst,
      imglist:rst.imglist||[]
    }
  } catch (error) {
    console.error('Error running example:', error);
    // note2: -1 為甚麼
    // process.exit(1);
  }
}
