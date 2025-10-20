const knitr = require('./knitr');
const { find_stata } = require('./find_stata');
//const { StataMarkdown } = require('./misc');
//note4: -1
//const { stata_collectcode } = require('./stata_collectcode');
const { stata_engine } = require('./stata_engine');
const { stataoutput } = require('./stataoutputhook');

async function doStata(stataCode,workdir,metadata,dotask) {
    try {
        // Initialize StataMarkdown
        //const statamd = new StataMarkdown();
        //note2: -1
        //await statamd.onLoad();
        
        // Find Stata executable
        const stataexe = await find_stata();
        
        if (stataexe !== "") {
            knitr.opts_chunk.engine_path={stata: stataexe};
            knitr.opts_chunk.engine="stata";
        } else {
            console.log("No Stata executable found.");
        }        

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
        //note4:-1
        //const dotask = await stata_collectcode();
        await dotask(false, knitr.opts_chunk);
        // Store original output hook and set new one
        //note1: -2
        // this.hook_orig = knitr.knit_hooks.get('output');
        // knitr.knit_hooks.set('output', stataoutputhook);








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