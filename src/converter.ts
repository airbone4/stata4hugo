import { unified } from 'unified';
import remarkParse from 'remark-parse';
import { Root, Content, Paragraph, Heading, Code, Literal } from 'mdast';

const {doStata} = require('./statatool/dostata');
//const { stata_collectcode } = require('./statatool/stata_collectcode');

function nodeToMarkdown(node: Content, depth: number = 0, opts?: { listStyle?: 'gfm' | 'pandoc' }): string {
  // Simple serializer for common block nodes to markdown source
  switch (node.type) {
    case 'paragraph':
      return (node as Paragraph).children.map(c => nodeToMarkdown(c, depth, opts)).join('') + '\n\n';
    case 'heading':
      const h = node as Heading;
      return '#'.repeat(h.depth) + ' ' + h.children.map(c => (c as any).value || '').join('') + '\n\n';
    case 'list':
      // Render list items by converting their child nodes instead of naively stringifying values.
      const listNode: any = node as any;
      const ordered = !!listNode.ordered;
      const startIndex = Number(listNode.start) || 1;
  let maxIndex = startIndex + (listNode.children ? listNode.children.length - 1 : 0);
  const style = (opts && opts.listStyle) || 'gfm';
      // If pandoc style and source text provided, attempt to parse explicit numbers in the source to compute padding
      let explicitNumbers: number[] | undefined;
      if (style === 'pandoc' && opts && (opts as any).sourceText) {
        try {
          const src: string = (opts as any).sourceText || '';
          // find lines with optional indentation followed by digits and a dot, capture digits in order
          const lines = src.split(/\r?\n/);
          const found: number[] = [];
          for (const ln of lines) {
            const m = ln.match(/^\s*(\d+)\./);
            if (m) {
              const n = Number(m[1]);
              if (!Number.isNaN(n)) found.push(n);
            }
          }
          if (found.length > 0) explicitNumbers = found;
          if (explicitNumbers && explicitNumbers.length > 0) {
            const maxFound = Math.max(...explicitNumbers, maxIndex);
            maxIndex = maxFound;
          }
        } catch (e) {
          // ignore and fall back
        }
      }
  const numWidth = ordered ? String(maxIndex).length : 0;
  const indent = '   '.repeat(depth);

      return (listNode.children || []).map((item: any, idx: number) => {
        const children = item.children || [];
        const seqNum = startIndex + idx;
        const itemNum = (explicitNumbers && explicitNumbers[idx] !== undefined) ? explicitNumbers[idx] : seqNum;
        const prefix = ordered
          ? (style === 'pandoc' ? itemNum.toString().padStart(numWidth, ' ') + '. ' : itemNum.toString() + '. ')
          : '- ';
        if (children.length === 0) return indent + prefix.trim();

        // Render first child inline when possible (e.g., paragraph)
        const first = children[0];
        let firstText = '';
        if (first.type === 'paragraph') {
          firstText = (first.children || []).map((c: any) => (c.value || '')).join('');
        } else {
          firstText = nodeToMarkdown(first, depth + 1).replace(/\n+/g, ' ').trim();
        }

        // Render remaining block children as indented blocks (preserve multi-line output)
        const rest = (children.slice(1) || []).map((c: any) => nodeToMarkdown(c, depth + 1, opts)).join('');
        const spacer = ordered ? (style === 'pandoc' ? ' '.repeat(numWidth + 2) : '  ') : '   ';
        const indentedRest = rest
          ? rest.split('\n').map((l: string) => (l ? indent + spacer + l : l)).join('\n')
          : '';

        return indent + prefix + firstText + (indentedRest ? '\n' + indentedRest : '');
      }).join('\n') + '\n\n';
    case 'code':
      const c = node as Code;
      return '```' + (c.lang || '') + '\n' + (c.value || '') + '\n```\n\n';
    case 'link':
      const link = node as any;
      const linkText = link.children?.map((c: any) => nodeToMarkdown(c, depth, opts)).join(' ').replace(/\s+/g, ' ').trim() || link.title || '';
      return `[${linkText}](${link.url})`;
    case 'image':
      const img = node as any;
      const alt = img.alt || img.title || '';
      return `![${alt}](${img.url})`;
    case 'text':
      return (node as any).value || '';
    case 'emphasis':
      return '*' + ((node as any).children || []).map((c: any) => nodeToMarkdown(c, depth, opts)).join('') + '*';
    case 'strong':
      return '**' + ((node as any).children || []).map((c: any) => nodeToMarkdown(c, depth, opts)).join('') + '**';
    default:
      // try to stringify known literals
      if ((node as any).value) return ((node as any).value as string) + '\n\n';
      return '';
  }
}

export async function convertMarkdownToIpynb(text: string, workdir?:string, opts?: { listStyle?: 'gfm' | 'pandoc', sourceText?: string }): Promise<any> {
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
  //note4 +1
  //note5 -1
  //const dotask = await stata_collectcode();
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


      if ((lang || '').toLowerCase() === 'stata') {
        const rst=await doStata(codeSource,workdir,metadata);
        //原來的程式碼
        let rstnode: Object={};
        if (metadata.echo!==false){
          rstnode={lang:info,type:'code',value:codeSource} as Literal;
          pendingMarkdown.push(nodeToMarkdown(rstnode as Content)); 
        }
        //執行結果程式碼
        if(metadata.results!=='hide'){
          rstnode={lang:'stata',type:'code',value:rst} as Literal;
          pendingMarkdown.push(nodeToMarkdown(rstnode as Content));
        }
      }else {
        cells.push({
          cell_type: 'code',
          execution_count: null,
          metadata: Object.assign({ language: lang || '' }, metadata),
          outputs: [],
          source: codeSource
        });
      }



    } else {
  // provide the original restText as sourceText so list rendering can inspect marker numbers for pandoc style
  const md = nodeToMarkdown(node as Content, 0, Object.assign({}, opts, { sourceText: restText }));
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
