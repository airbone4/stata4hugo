import { convertMarkdownToIpynb } from '../src/converter';
import { strict as assert } from 'assert';

describe('converter options', () => {
  it('parses R chunk options into metadata', () => {
    const md = "```{r, echo=FALSE, fig.height=4, label='plot1'}\n1+1\n```\n";
    const nb = convertMarkdownToIpynb(md);
    assert.equal(nb.cells.length, 1);
    const cell = nb.cells[0];
    assert.equal(cell.cell_type, 'code');
    // metadata should include parsed options and language
    assert.equal(cell.metadata.language, 'r');
    assert.equal(cell.metadata.echo, false);
    assert.equal(cell.metadata['fig.height'], 4);
    assert.equal(cell.metadata.label, 'plot1');
  });
});
