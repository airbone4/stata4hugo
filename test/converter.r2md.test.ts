import { convertMarkdownToIpynb } from '../src/converter';
import { strict as assert } from 'assert';
import * as path from 'path';
import * as fs from 'fs';

describe('rmd2md', () => {
  it('rmd直接轉到md', async () => {
    
    const md = fs.readFileSync('./examples/逐步幫手文件.Rmarkdown','utf8') 
    //const nb = await convertMarkdownToIpynb(md);
    // assert.equal(nb.cells.length, 2);
    // assert.equal(nb.cells[0].cell_type, 'markdown');
    // assert.equal(nb.cells[1].cell_type, 'code');
  });
});
