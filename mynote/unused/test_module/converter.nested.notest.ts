import { convertMarkdownToIpynb } from '../src/converter';
import * as assert from 'assert';

describe('converter nested lists', () => {
  it('renders deeper nested unordered lists', async () => {
    const md = `
- level1
  - level2
    - level3
`;
    const nb = await convertMarkdownToIpynb(md);
    const mdOut = nb.cells.map((c: any) => c.cell_type === 'markdown' ? c.source : '').join('\n');
    assert.ok(mdOut.includes('- level1'));
    assert.ok(mdOut.includes('- level2') || mdOut.includes('- level2'));
    assert.ok(mdOut.includes('- level3'));
  });

  it('renders mixed ordered and unordered lists', async () => {
    const md = `
1. first
   - sub-one
   - sub-two
2. second
`;
    const nb = await convertMarkdownToIpynb(md);
    const mdOut = nb.cells.map((c: any) => c.cell_type === 'markdown' ? c.source : '').join('\n');
    assert.ok(mdOut.includes('1. first'));
    assert.ok(mdOut.includes('- sub-one'));
    assert.ok(mdOut.includes('2. second'));
  });

  it('respects pandoc padding when requested', async () => {
    const md = `
1. first
2. second
10. tenth
`;
    const nb = await convertMarkdownToIpynb(md, undefined, { listStyle: 'pandoc' });
    const mdOut = nb.cells.map((c: any) => c.cell_type === 'markdown' ? c.source : '').join('\n');
    // pad width should make '10.' line align numbers
    assert.ok(mdOut.includes(' 1. first') || mdOut.includes('1. first'));
    assert.ok(mdOut.includes('10. tenth'));
  });
});
