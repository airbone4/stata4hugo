import fs from 'fs';
import path from 'path';

import { fileURLToPath } from 'url';

// 在 ESM 中引入同目錄的自訂模組，必須加上擴充副檔名（例如 .js 或 .mjs）
//import knitr from './knitr.js'; 
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
    // Set default chunk options
    knitr.opts_chunk.code = stataCode.split("\n");
    
    // savedo: 執行的暫存檔要不要留著,如果要留要給個label否則就是undefiend.do
    knitr.opts_chunk.savedo = metadata.savedo ? metadata.savedo : false;
    knitr.opts_chunk.error = metadata.error ? metadata.error : false;
    
    // 指令碼要不要留在結果中,和log file 無關
    knitr.opts_chunk.cleanlog = metadata.cleanlog ? metadata.cleanlog : false;
    knitr.opts_chunk.comment = metadata.comment ? metadata.comment : false;
    knitr.opts_chunk.collectcode = metadata.collectcode; // todo :沒必要的這行
    
    knitr.knit_engines.stata = stata_engine;
    
    // 主要工作
    fs.appendFileSync(
      path.join(knitr.opts_chunk.workdir, 'profile.do'), 
      knitr.opts_chunk.collectcode ? knitr.opts_chunk.code.join('\n') + '\n' : '\n'
    );
    let pretxt=predo()
    let posttxt=postdo(path.join(import.meta.dirname,'../../../temp'))
    //整合原來的程式碼 + posttxt
    knitr.opts_chunk.code=[...pretxt.split('\n'), ...knitr.opts_chunk.code,...posttxt.split('\n')];
    const rst = await stata_engine(knitr.opts_chunk);
    const final_rst = stataoutput(rst.output.split("\n"), knitr.opts_chunk);
    
    return {
      txt:Array.isArray(final_rst) ? final_rst.join('\n') : final_rst,
      imglist:rst.imglist
    }
  } catch (error) {
    console.error('Error running example:', error);
    // note2: -1 為甚麼
    // process.exit(1);
  }
}
