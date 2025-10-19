// Main entry point for the Statamarkdown package
const { find_stata } = require('./find_stata');
const { StataMarkdown } = require('./misc');
const { stata_engine } = require('./stata_engine');
const { stataoutput } = require('./stataoutputhook');
const { stata_collectcode } = require('./stata_collectcode');
const { spinstata } = require('./spinstata');

module.exports = {
    find_stata,
    StataMarkdown,
    stata_engine,
    stataoutput,
    stata_collectcode,
    spinstata
};