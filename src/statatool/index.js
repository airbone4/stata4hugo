// Main entry point for the Statamarkdown package
const { find_stata } = require('./find_stata');

const { stata_engine } = require('./stata_engine');
const { stataoutput } = require('./stataoutputhook');
const { stata_collectcode } = require('./stata_collectcode');


module.exports = {
    find_stata,
    stata_engine,
    stataoutput,
    stata_collectcode
    
};