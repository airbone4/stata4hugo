
import { convertMarkdownToIpynb } from '../src/converter';
import { convertIpynbToMarkdown } from '../src/ipynbToMd';
import * as path from 'path';
import * as fs from 'fs';

//const { promisify } = require('util');
//const knitr = require('../src/statatool/knitr');
//const { find_stata } = require('../src/statatool/find_stata');
//import {promisify} from 'util'
import * as knitr from '../src/statatool/knitr.js'
import {find_stata } from '../src/statatool/find_stata'





//const access = promisify(fs.access);

async function try1(){
    const doc = "./examples/逐步幫手文件.Rmarkdown";
    const text = fs.readFileSync(doc,'utf8')
    //console.log(text)
    const __dirname = path.resolve();
    console.log(__dirname)
}    
try1()