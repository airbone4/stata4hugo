const knitr = require('./knitr');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const { find_stata } = require('./find_stata');

const { stata_engine } = require('./stata_engine');
const { stataoutput } = require('./stataoutputhook');

const appendFile = promisify(fs.appendFile);

async function doStata(stataCode,workdir,metadata) {
    try {
        // Set default chunk options
        knitr.opts_chunk.code=stataCode.split("\n");
        //savedo: 執行的暫存檔要不要留著,如果要留要給個label否則就是undefiend.do
        knitr.opts_chunk.savedo=metadata.savedo?metadata.savedo:false;  
        knitr.opts_chunk.error= metadata.error?metadata.error:false;
        knitr.opts_chunk.cleanlog= metadata.cleanlog?metadata.cleanlog:true;
        knitr.opts_chunk.comment= null;
        knitr.opts_chunk.collectcode=metadata.collectcode
        

        //todo :沒必要的這行
        knitr.knit_engines.stata= stata_engine;
        //主要工作
        await appendFile(path.join(knitr.opts_chunk.workdir, 'profile.do'), (knitr.opts_chunk.collectcode)? knitr.opts_chunk.code.join('\n') + '\n':'\n')
        const rst=await stata_engine(knitr.opts_chunk);
        const final_rst=stataoutput(rst.output.split("\n"), knitr.opts_chunk);

        return Array.isArray(final_rst) ? final_rst.join('\n') : final_rst;
    } catch (error) {
        console.error('Error running example:', error);
        //note2: -1 為甚麼
        //process.exit(1);
    }
}

module.exports = { doStata };