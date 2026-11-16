import * as fs from 'fs';
import * as path from 'path';
import { out_prefix_img, getUniqueFilenameSync } from './statatool/index.js';

function saveBase64ToPNGFile(base64String: string, outputPath: string) {
  // 1. 移除可能帶有的 Data URL 標頭前綴
  const base64Data = base64String.replace(/^data:image\/\w+;base64,/, '');
  // 2. 將 Base64 字串直接轉換為 Node.js Buffer
  const imageBuffer = Buffer.from(base64Data, 'base64');
  fs.writeFileSync(outputPath, imageBuffer);
}

function saveSvgToFile(svgString: string, outputPath: string) {
  // 參數：檔案路徑、寫入內容、編碼（SVG 是純文字，指定 utf8）
  fs.writeFileSync(outputPath, svgString, 'utf8');
}

export function nb2md(nb: any, imgfolder: string): string {
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
      const tags: string[] = cell.metadata?.tags || [];

      if (tags.includes('hide')) {
        continue;
      }

      const src = Array.isArray(cell.source) ? cell.source.join('') : cell.source;
      let lang = (cell.metadata && cell.metadata.language) || '';
      let body = src;

      if (body.startsWith('%%stata')) {
        body = body.replace(/^%%stata\s*\n/, '');
        lang = 'stata';
      }

      // 包裝 STATA source body
      if (!tags.includes('hidesource')) {
        parts.push('```' + (lang || '') + '\n' + body.trim() + '\n```\n');
      }

      const out_stata: string[] = [];
      const out_images: string[] = [];

      if (cell.outputs) {
        cell.outputs.forEach((obj: any) => {
          if (obj.output_type === 'stream') {
            const textStr = Array.isArray(obj.text) ? obj.text.join('') : (obj.text || '');
            out_stata.push(textStr);
          }
        });

        cell.outputs.forEach((obj: any) => {
          if (obj.output_type === 'display_data') {
            fs.mkdirSync(imgfolder, { recursive: true });
            let outtxt = 'unknown image type';

            if (obj.data['image/svg+xml']) {
              const imgfile = getUniqueFilenameSync(imgfolder, out_prefix_img + path.parse(imgfolder).name, '.svg');
              const fullpath = path.join(imgfolder, imgfile);
              const relativePath = path.posix.join(path.basename(imgfolder), imgfile);
              const upath = encodeURI(relativePath);
              const svgData = Array.isArray(obj.data['image/svg+xml'])
                ? obj.data['image/svg+xml'].join('')
                : obj.data['image/svg+xml'];

              saveSvgToFile(svgData, fullpath);
              //dddd3
              const imgclass=cell.metadata?.options? cell.metadata.options['imgclass']:'lineimg w-100 h-50'
              outtxt = `\n![](${upath})\n{class="${imgclass}"}\n\n`;
            }

            if (obj.data['image/png']) {
              const imgfile = getUniqueFilenameSync(imgfolder, out_prefix_img + path.parse(imgfolder).name, '.png');
              const fullpath = path.join(imgfolder, imgfile);
              const relativePath = path.posix.join(path.basename(imgfolder), imgfile);
              const upath = encodeURI(relativePath);

              saveBase64ToPNGFile(obj.data['image/png'], fullpath);
              outtxt = `\n![](${upath})\n{ class="lineimg w-100 h-50"}\n\n`;
            }
            out_images.push(outtxt);
          }
        });
      }

      // 只有在沒有 hideoutput 標籤時才輸出文字執行結果
      if (out_stata.length > 0 && !tags.includes('hideoutput')) {
        const outtxt = out_stata.join('');
        const isHideSource = tags.includes('hidesource');
        const codeBlock = '```' + (lang || '') + '\n' + outtxt + '\n' + '```\n';

        if (isHideSource) {
          parts.push(codeBlock);
        } else {
          parts.push('{{< expand title="執行結果" incode=false >}}\n' + codeBlock + '{{< /expand >}}');
        }
      }

      if (out_images.length > 0) {
        parts.push(out_images.join(''));
      }
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
  const md = nb2md(nb, path.parse(outputPath).name);
  fs.writeFileSync(outputPath, md, 'utf8');
}
