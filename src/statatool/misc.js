// JavaScript equivalent of misc.r
// Note: This is a conceptual translation as some R-specific functionality
// doesn't have direct equivalents in JavaScript

const utils = require('./utils');
const knitr = require('./knitr');
const { find_stata } = require('./find_stata');
const { stata_engine } = require('./stata_engine');
const { stata_collectcode } = require('./stata_collectcode');
const { stataoutputhook } = require('./stataoutputhook');

class StataMarkdown {
    constructor() {
        this.hook_orig = null;
        this.globalVariables = new Map();
    }

    // Equivalent to .onLoad
    onLoad() {
        if (!utils) {
            throw new Error("Requires utils package.");
        }
        // Set global variables
        this.globalVariables.set("hook_orig", null);
    }

    // onAttach(): 這裡應該是說如果collect=T, 那麼就把目前的code 放到 profile.do 裡面去
    //notes: + prefix async
    async onAttach() {
        // Set up Stata engine
        knitr.knit_engines.stata= stata_engine;
        // Find Stata executable
        const stataexe = await find_stata();
        
        if (stataexe !== "") {
            knitr.opts_chunk.engine_path={stata: stataexe};
            knitr.opts_chunk.engine="stata";
        } else {
            console.log("No Stata executable found.");
        }

        // Set default chunk options

        knitr.opts_chunk.error= true;
        knitr.opts_chunk.cleanlog= false;
        knitr.opts_chunk.comment= null;


        // Set up code collection
        //note -1+2
        //stata_collectcode();
        //note1: +await
        const dotask = await stata_collectcode();
        await dotask(false, knitr.opts_chunk);
        // Store original output hook and set new one
        //note1: -2
        // this.hook_orig = knitr.knit_hooks.get('output');
        // knitr.knit_hooks.set('output', stataoutputhook);

        console.log("The 'stata' engine is ready to use.");
    }
}

// Export the class as a named export
module.exports = { StataMarkdown };