// Manual test script: convert example1.Rmd to example1.ipynb
const fs = require('fs');
const path = require('path');
const { convertMarkdownToIpynb } = require('../out/src/converter.js');

const inputPath = path.join(__dirname, 'example1.Rmd');
const outputPath = path.join(__dirname, 'example1.ipynb');

const text = fs.readFileSync(inputPath, 'utf8');
const nb = convertMarkdownToIpynb(text);
fs.writeFileSync(outputPath, JSON.stringify(nb, null, 2), 'utf8');
console.log('Converted', inputPath, 'to', outputPath);
