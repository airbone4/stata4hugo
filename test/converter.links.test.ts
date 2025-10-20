import { convertMarkdownToIpynb } from '../src/converter';
import * as assert from 'assert';

describe('converter links and images', () => {
  it('renders markdown links correctly', async () => {
    const md = 'Here is a [link to example](https://example.com)';
    const nb = await convertMarkdownToIpynb(md);
    const mdOut = nb.cells.map((c: any) => c.cell_type === 'markdown' ? c.source : '').join('\n');
    console.log('ACTUAL OUTPUT:', mdOut);
    assert.ok(mdOut.includes('[link to example](https://example.com)'));
  });

  it('renders images correctly', async () => {
    const md = 'An image: ![Image alt text](image.png)';
    const nb = await convertMarkdownToIpynb(md);
    const mdOut = nb.cells.map((c: any) => c.cell_type === 'markdown' ? c.source : '').join('\n');
    assert.ok(mdOut.includes('![Image alt text](image.png)'));
  });

  it('handles links with nested formatting', async () => {
    const md = 'A [link with *italic* text](https://example.com)';
    const nb = await convertMarkdownToIpynb(md);
    const mdOut = nb.cells.map((c: any) => c.cell_type === 'markdown' ? c.source : '').join('\n');
    console.log('EXPECTED:', '[link with *italic* text](https://example.com)');
    console.log('ACTUAL:', mdOut);
    assert.ok(mdOut.includes('[link with *italic* text](https://example.com)'));
  });
});