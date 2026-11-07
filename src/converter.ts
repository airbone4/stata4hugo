import { unified } from 'unified';
import remarkParse from 'remark-parse';
import { Root, Content, Paragraph, Heading, Code, Literal } from 'mdast';
import * as fs from 'fs'

import { doStata } from './statatool/dostata.js'

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
      
      if(/```[\s|\S]*```/.test(c.value)) //nest code block
      return '````' + (c.lang || '') + '\n' + (c.value || '') + '\n````\n\n';
      else
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

export async function convertMarkdownToIpynb(text: string, workdir?: string, opts?: { listStyle?: 'gfm' | 'pandoc', sourceText?: string }): Promise<any> {
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
  cells.push({
      cell_type: 'code',
      execution_count: null,
      metadata: {
        tags: [   "hide" ]
      },      
      outputs: [],
      source: 'import stata_setup\n' + 'stata_setup.config("C:/Program Files/Stata18/", "mp")\n'
    })
  cells.push({
   cell_type: "code",
   execution_count: null,   
   metadata: {
    tags: [
     "hide"
    ]
   },
   outputs: [],
   source: [
    "%stata set linesize 255"
   ]
  })
  // We'll iterate and group consecutive non-code nodes into one markdown cell.
  let pendingMarkdown: string[] = [];

  function flushMarkdown() {
    //將累積的部分而輸出成markdown block
    if (pendingMarkdown.length === 0) return;
    let acell = {
      cell_type: 'markdown',
      metadata: {},
      source: pendingMarkdown.join('')
    }
    cells.push(acell);
    pendingMarkdown = [];
    return acell
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

      
      flushMarkdown();
      // For curly-braced chunks, convert to a code cell
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
          let first = parts[0]; //就是code fence 三個反頓號後面的字串
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
       
      //只有```{lang} 會到這裡
      let codeSource = (c.value || '') + '\n';

      if ((lang || '').toLowerCase() === 'stata') {
        const rst = await doStata(codeSource, workdir, metadata);

        //原來的程式碼
        let rstnode: any = {};
        let acodecell:any={}
        
          rstnode = { lang: info, type: 'code', value: codeSource } as Literal;          
          pendingMarkdown.push(nodeToMarkdown(rstnode as Content));
          acodecell=flushMarkdown()
          //懶得重寫flushMarkdown ,因此用這兩行直接修正
          acodecell.source='%%stata\n'+codeSource
          acodecell.cell_type='code'
          acodecell.execution_count=1
          acodecell.metadata={tags:[]}; //初始化,空的
        if (metadata.echo == false) {          
          const hidesource=["hidesource"];  
          acodecell.metadata.tags=[...acodecell.metadata.tags,...hidesource]
        }
        //執行結果程式碼
        //hide:=true 只有顯示程式碼,不顯示結果
        
          
          //這裡只有處理 字串輸出,圖形輸出沒有
          acodecell.outputs=[]
          let cellout:any={}
          cellout.name="stdout"
          cellout.output_type="stream"
          cellout.text=rst.txt.split('\n')

          acodecell.outputs.push(cellout) 
         if (metadata.results == 'hide') {  
           const hideoutput=["hideoutput"];  
           acodecell.metadata.tags=[...acodecell.metadata.tags,...hideoutput]          
          }
         for (const item of rst.imglist){
          let imgobject = {
            data: {},
            "metadata": {},
            "output_type": "display_data"            
          }
          const imgcontent =fs.readFileSync(item,'utf8');
          imgobject.data["image/svg+xml"]=imgcontent
          acodecell.outputs.push(imgobject)
         }

           
        
      } else {
        //其他語言不處理,留著給ipynb處理
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
    if (low === 'true' || low==='t') return true;
    if (low === 'false'|| low==='f') return false;
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
