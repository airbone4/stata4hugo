// Manual test: convert examples/example1.ipynb -> examples/example1.md
const path = require('path');
const { convertIpynbFileToMd } = require('../out/src/ipynbToMd.js');

const input = path.join(__dirname, 'example1.ipynb');
const out = path.join(__dirname, 'example1.md');
convertIpynbFileToMd(input, out);
console.log('Wrote', out);
