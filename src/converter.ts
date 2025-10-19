import { unified } from 'unified';
import remarkParse from 'remark-parse';
import { Root, Content, Paragraph, Heading, Code, Literal } from 'mdast';
//note2 +1
const {doStata} = require('./statatool/dostata');


function nodeToMarkdown(node: Content): string {
  // Simple serializer for common block nodes to markdown source
  switch (node.type) {
    case 'paragraph':
      return (node as Paragraph).children.map(c => (c as any).value || '').join('') + '\n\n';
    case 'heading':
      const h = node as Heading;
      return '#'.repeat(h.depth) + ' ' + h.children.map(c => (c as any).value || '').join('') + '\n\n';
    case 'list':
      // fallback: stringify children
      return (node as any).children.map((item: any) => ' - ' + (item.children || []).map((c: any) => c.value || '').join('')).join('\n') + '\n\n';
    case 'code':
      const c = node as Code;
      return '```' + (c.lang || '') + '\n' + (c.value || '') + '\n```\n\n';
    default:
      // try to stringify known literals
      if ((node as any).value) return ((node as any).value as string) + '\n\n';
      return '';
  }
}

export async function convertMarkdownToIpynb(text: string) {
  // Detect YAML front matter (--- ... --- at the top)
  let yamlFront = '';
  let restText = text;
  if (text.startsWith('---')) {
    const end = text.indexOf('---', 3);
    if (end !== -1) {
      yamlFront = text.slice(0, end + 3).trim();
      restText = text.slice(end + 3);
    }
  }

  const tree = unified().use(remarkParse).parse(restText) as Root;

  const cells: any[] = [];

  // If YAML front matter found, treat as raw code cell at top
  if (yamlFront) {
    cells.push({
      cell_type: 'raw',
      execution_count: null,
      metadata: { language: 'yaml', raw: true },
      outputs: [],
      source: yamlFront + '\n'
    });
  }

  // We'll iterate and group consecutive non-code nodes into one markdown cell.
  let pendingMarkdown: string[] = [];

  function flushMarkdown() {
    if (pendingMarkdown.length === 0) return;
    cells.push({
      cell_type: 'markdown',
      metadata: {},
      source: pendingMarkdown.join('')
    });
    pendingMarkdown = []; 
  }

  for (const node of tree.children) {
    if (node.type === 'code') {
      const c = node as Code;
      // parse fenced code info by combining c.lang and c.meta into one info string
      const infoParts: string[] = [];
      if (c.lang) infoParts.push(String(c.lang));
      if ((c as any).meta) infoParts.push(String((c as any).meta));
      const rawInfo = infoParts.join(' ').trim();

      // If the fence is NOT curly-braced (e.g. ```python), keep it as a fenced code block in markdown
      const isCurly = rawInfo.startsWith('{') && rawInfo.endsWith('}');
      if (!isCurly) {
        // treat as markdown fenced code (do not flush pending markdown yet — group naturally)
        pendingMarkdown.push(nodeToMarkdown(node as Content));
        continue;
      }

      // For curly-braced chunks, convert to a code cell
      flushMarkdown();
      let info = rawInfo;
      let lang = '';
      let metadata: any = {};
      if (info.length > 0) {
        // remove surrounding braces
        info = info.slice(1, -1).trim();

        // split by commas first
        const parts = info.split(',').map(p => p.trim()).filter(p => p.length > 0);
        if (parts.length > 0) {
          // first part may contain language and possibly inline options separated by whitespace
          let first = parts[0];
          const firstTokens = first.split(/\s+/).filter(Boolean);
          lang = firstTokens[0] || '';
          const restParts: string[] = [];
          if (firstTokens.length > 1) {
            restParts.push(firstTokens.slice(1).join(' '));
          }
          if (parts.length > 1) restParts.push(...parts.slice(1));

          // parse each rest part as key[=value]
          for (const p of restParts) {
            const [kRaw, ...rest] = p.split('=');
            const k = kRaw ? kRaw.trim() : '';
            if (!k) continue;
            const v = rest.length > 0 ? rest.join('=').trim() : undefined;
            metadata[k] = v === undefined ? true : parseOptionValue(v);
          }
        }
      }

      let codeSource = (c.value || '') + '\n';
      //note2 -1b
      // if ((lang || '').toLowerCase() === 'stata') {
      //   // Prepend magic command for stata
      //   codeSource = '%%stata\n' + codeSource;
      // }
      //code block 直接進celss
      cells.push({
        cell_type: 'code',
        execution_count: null,
        metadata: Object.assign({ language: lang || '' }, metadata),
        outputs: [],
        source: codeSource
      });
      if ((lang || '').toLowerCase() === 'stata') {
        const rst=await doStata(codeSource);

 
        const rstnode={type:'code',value:rst} as Literal;
        pendingMarkdown.push(nodeToMarkdown(rstnode as Content));
      }



    } else {
      const md = nodeToMarkdown(node as Content);
      if (md.trim().length === 0) continue;
      pendingMarkdown.push(md);
    }
  }

function parseOptionValue(v: string): any {
  if (!v) return v;
  const low = v.toLowerCase();
  if (low === 'true') return true;
  if (low === 'false') return false;
  // number?
  const n = Number(v);
  if (!Number.isNaN(n)) return n;
  // strip quotes if present
  const m = v.match(/^['"](.*)['"]$/);
  if (m) return m[1];
  return v;
}
  flushMarkdown();

  return {
    nbformat: 4,
    nbformat_minor: 2,
    metadata: {},
    cells
  };
}
