import * as fs from 'fs';

export function convertIpynbToMarkdown(nb: any): string {
  const parts: string[] = [];

  if (nb.metadata && nb.metadata.title) {
    parts.push('---');
    for (const k of Object.keys(nb.metadata)) {
      parts.push(`${k}: ${nb.metadata[k]}`);
    }
    parts.push('---\n');
  }

  for (const cell of nb.cells || []) {
    if (cell.cell_type === 'markdown') {
      // markdown cells have source as string or array
      const src = Array.isArray(cell.source) ? cell.source.join('') : cell.source;
      parts.push(src.trim() + '\n');
    } else if (cell.cell_type === 'code') {
      const src = Array.isArray(cell.source) ? cell.source.join('') : cell.source;
      // try to preserve language from metadata
      const lang = (cell.metadata && cell.metadata.language) || '';
      // if raw stata magic present, remove it and mark language stata
      let body = src;
      if (body.startsWith('%%stata')) {
        body = body.replace(/^%%stata\n/, '');
      }
      parts.push('```' + (lang || '') + '\n' + body.trim() + '\n```\n');
    } else if (cell.cell_type === 'raw') {
      const src = Array.isArray(cell.source) ? cell.source.join('') : cell.source;
      parts.push(src.trim() + '\n');
    }
  }

  return parts.join('\n');
}

export function convertIpynbFileToMd(inputPath: string, outputPath: string) {
  const data = fs.readFileSync(inputPath, 'utf8');
  const nb = JSON.parse(data);
  const md = convertIpynbToMarkdown(nb);
  fs.writeFileSync(outputPath, md, 'utf8');
}
