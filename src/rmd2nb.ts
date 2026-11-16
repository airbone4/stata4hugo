import { unified } from 'unified';
import remarkParse from 'remark-parse';
import { Root, Content, Paragraph, Heading, Code, Literal } from 'mdast';
import * as fs from 'fs';
import * as path from 'path';

import { doStata } from './statatool/dostata.js';
import { parseOptionValue,parseChunkHeader } from './statatool/common.js';
import { getStataPath } from './statatool/index.js';

function nodeToMarkdown(node: Content, depth: number = 0, opts?: { listStyle?: 'gfm' | 'pandoc' }): string {
  switch (node.type) {
    case 'paragraph':
      return (node as Paragraph).children.map(c => nodeToMarkdown(c, depth, opts)).join('') + '\n\n';
    case 'heading': {
      const h = node as Heading;
      return '#'.repeat(h.depth) + ' ' + h.children.map(c => (c as any).value || '').join('') + '\n\n';
    }
    case 'list': {
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
            maxIndex = Math.max(...explicitNumbers, maxIndex);
          }
        } catch (e) {
          // ignore
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
    }
    case 'code': {
      const c = node as Code;
      if (/```.*```/.test(c.value)) {
        return '````' + (c.lang || '') + '\n' + (c.value || '') + '\n````\n\n';
      } else {
        return '```' + (c.lang || '') + '\n' + (c.value || '') + '\n```\n\n';
      }
    }
    case 'link': {
      const link = node as any;
      const linkText = link.children?.map((c: any) => nodeToMarkdown(c, depth, opts)).join(' ').replace(/\s+/g, ' ').trim() || link.title || '';
      return `[${linkText}](${link.url})`;
    }
    case 'image': {
      const img = node as any;
      const alt = img.alt || img.title || '';
      return `![${alt}](${img.url})`;
    }
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

export async function rmd2nb(text: string, env?: any, opts?: { listStyle?: 'gfm' | 'pandoc', sourceText?: string }): Promise<any> {
  // 嚴謹解析 YAML front matter
  let yamlFront = '';
  let restText = text;
  const yamlMatch = text.match(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/);
  if (yamlMatch) {
    yamlFront = yamlMatch[0].trim();
    restText = text.slice(yamlMatch[0].length);
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

  const exePath = getStataPath();
  const stataDir = exePath ? path.dirname(exePath).replaceAll('\\', '/') + '/' : 'C:/Program Files/Stata18/';

  cells.push({
    cell_type: 'code',
    execution_count: null,
    metadata: { tags: ['hide'] },
    outputs: [],
    source: `import stata_setup\nstata_setup.config("${stataDir}", "mp")\n`
  });

  cells.push({
    cell_type: 'code',
    execution_count: null,
    metadata: { tags: ['hide'] },
    outputs: [],
    source: ['%stata set linesize 255']
  });

  let pendingMarkdown: string[] = [];

  function flushMarkdown() {
    //將累積的部分而輸出成markdown block
    if (pendingMarkdown.length === 0) return;
    const acell: any = {
      cell_type: 'markdown',
      metadata: {},
      source: pendingMarkdown.join('')
    };
    cells.push(acell);
    pendingMarkdown = [];
    return acell;
  }

  for (const node of tree.children) {
    if (node.type === 'code') {
      const c = node as Code;
      // parse fenced code info by combining c.lang and c.meta into one info string
      const infoParts: string[] = [];
      if (c.lang) infoParts.push(String(c.lang)); //c.lang例如:'{stata,echo=T,block.pre.class="ms-5.w-75"}'
      if ((c as any).meta) infoParts.push(String((c as any).meta)); //這裡meta 不知道是甚麼,如果有也要推進來。❓
      const rawInfo = infoParts.join(' ').trim(); //rawInfo '{stata,echo=T,block.pre.class="ms-5.w-75"}'

      // 如果沒有大括號 (e.g. ```python), 那就是一般的markdown code block
      // 但是現在我要允許例如 {}?class=.d-none,所以只檢查第一個括號
      const isCurly = rawInfo.startsWith('{') //&& rawInfo.endsWith('}');
      if (!isCurly) {
        // treat as markdown fenced code (do not flush pending markdown yet — group naturally)
        pendingMarkdown.push(nodeToMarkdown(node as Content));
        continue;
      }

      flushMarkdown();
      const { engineName:lang, options } = parseChunkHeader(rawInfo);
      
      

      //只有```{lang} 會到這裡
      const codeSource = (c.value || '') + '\n';
      //metadata = { ...metadata, ...env };
      let parsedOptions={...options,...env}

      if ((lang || '').toLowerCase() === 'stata') {
        const rst = await doStata(codeSource, parsedOptions);
        const rstnode = { lang: lang, type: 'code', value: codeSource } as Literal;
        pendingMarkdown.push(nodeToMarkdown(rstnode as Content));
        const acodecell = flushMarkdown();

        acodecell.source = '%%stata\n' + codeSource;
        acodecell.cell_type = 'code';
        acodecell.execution_count = 1;
        //把原先的rmarkdown 設定放到metadata中的options
        acodecell.metadata = { tags: [],options:parsedOptions };

        if (parsedOptions.echo === false) {
          acodecell.metadata.tags.push('hidesource');
        }

        acodecell.outputs = [];
        const cellout: any = {
          name: 'stdout',
          output_type: 'stream',
          text: rst?.txt ? rst.txt.split('\n') : []
        };
        acodecell.outputs.push(cellout);

        if (parsedOptions.results === 'hide') {
          acodecell.metadata.tags.push('hideoutput');
        }

        for (const item of rst?.imglist?.filter(Boolean) || []) {
          const imgobject: any = {
            data: {},
            metadata: {},
            output_type: 'display_data'
          };
          const imgcontent = fs.readFileSync(item, 'utf8');
          imgobject.data['image/svg+xml'] = imgcontent;
          acodecell.outputs.push(imgobject);
        }
      } else {
        //其他語言,例如{js}{python}不處理,留著給ipynb處理
        cells.push({
          cell_type: 'code',
          execution_count: null,
          metadata: Object.assign({ language: lang || '' }, parsedOptions),
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

  flushMarkdown();

  return {
    nbformat: 4,
    nbformat_minor: 2,
    metadata: {},
    cells
  };
}
