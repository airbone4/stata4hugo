import { convertMarkdownToIpynb } from '../src/converter';
import * as assert from 'assert';

describe('converter list rendering', () => {
  it('renders unordered lists with nested blocks', async () => {
    const md = `
- item one
  
    code block
- item two
`;
    const nb = await convertMarkdownToIpynb(md);
    const mdOut = nb.cells.map((c: any) => c.cell_type === 'markdown' ? c.source : '').join('\n');
    assert.ok(mdOut.includes('- item one'));
    assert.ok(mdOut.includes('code block'));
  });

  it('renders ordered lists with proper numbering and padding', async () => {
    const md = `
1. first
2. second
3. third
`;
    const nb = await convertMarkdownToIpynb(md);
    const mdOut = nb.cells.map((c: any) => c.cell_type === 'markdown' ? c.source : '').join('\n');
    assert.ok(mdOut.includes('1. first') || mdOut.includes('1.  first'));
    assert.ok(mdOut.includes('2. second') || mdOut.includes('2.  second'));
  });
});
