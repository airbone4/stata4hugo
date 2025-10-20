const knitr = require('./knitr');
//note5 -1
//const { find_stata } = require('./find_stata');

const { stata_engine } = require('./stata_engine');
const { stataoutput } = require('./stataoutputhook');

const appendFile = promisify(fs.appendFile);

async function doStata(stataCode,workdir,metadata) {
    try {
   
        knitr.opts_chunk.code=stataCode.split("\n");
        knitr.opts_chunk.savedo=true;  //執行的站存檔要不要留著
        knitr.opts_chunk.error= true;
        knitr.opts_chunk.cleanlog= false;
        knitr.opts_chunk.comment= null;
        knitr.opts_chunk.workdir= workdir;

        //note3
        knitr.opts_chunk.collectcode=metadata.collectcode
        


        knitr.knit_engines.stata= stata_engine;


        // Set default chunk options
        //note5 -1
        //await dotask(false, knitr.opts_chunk);

        appendFile(path.join(knitr.opts_chunk.workdir, 'profile.do'), (knitr.opts_chunk.collectcode)? knitr.opts_chunk.code.join('\n') + '\n':'\n')



        const rst=await stata_engine(knitr.opts_chunk);
        const final_rst=stataoutput(rst.output.split("\n"), knitr.opts_chunk);
        //final_rst=Array.isArray(final_rst) ? final_rst.join('\n') : final_rst;

        return Array.isArray(final_rst) ? final_rst.join('\n') : final_rst;
    } catch (error) {
        console.error('Error running example:', error);
        //note2: -1 為甚麼
        //process.exit(1);
    }
}

module.exports = { doStata };