import { convertMarkdownToIpynb } from '../src/converter';
import { strict as assert } from 'assert';

describe('converter', () => {
  it('converts simple markdown and code fences', () => {
    const md = '# Title\n\nSome text.\n\n```{r}\n1+1\n```\n';
    const nb = convertMarkdownToIpynb(md);
    assert.equal(nb.cells.length, 2);
    assert.equal(nb.cells[0].cell_type, 'markdown');
    assert.equal(nb.cells[1].cell_type, 'code');
  });
});
