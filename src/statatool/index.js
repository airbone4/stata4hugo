// Main entry point for the Statamarkdown package
import { find_stata } from './find_stata.js';
import { stata_engine } from './stata_engine.js';
import { stataoutput } from './stataoutputhook.js';
import {out_prefix_img } from './config.js'
import * as knitr from './knitr.js'
//import { stata_collectcode } from './stata_collectcode.js';

export {
    find_stata,
    stata_engine,
    stataoutput,
    knitr,
    out_prefix_img
    //stata_collectcode
};
