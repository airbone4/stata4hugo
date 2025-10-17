import { convertMarkdownToIpynb } from '../src/converter';
import { strict as assert } from 'assert';

describe('converter grouping', () => {
  it('groups consecutive markdown blocks into one markdown cell', () => {
    const md = '# Title\n\nFirst paragraph.\n\n- item 1\n- item 2\n\n```{r}\n1+1\n```\n\nSecond paragraph after code.';
    const nb = convertMarkdownToIpynb(md);
    // expectation: markdown group before code -> 1 cell, then code -> 1, then markdown after ->1 => 3
    assert.equal(nb.cells.length, 3);
    assert.equal(nb.cells[0].cell_type, 'markdown');
    assert.equal(nb.cells[1].cell_type, 'code');
    assert.equal(nb.cells[2].cell_type, 'markdown');
  });
});
