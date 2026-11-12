import * as fs from 'fs';
import * as path from 'path';
import { out_prefix_img,getUniqueFilenameSync } from './statatool/index.js';

function saveBase64ToPNGFile(base64String, outputPath) {
  // 1. 移除可能帶有的 Data URL 標頭前綴
  const base64Data = base64String.replace(/^data:image\/\w+;base64,/, "");

  // 2. 將 Base64 字串直接轉換為 Node.js Buffer
  const imageBuffer = Buffer.from(base64Data, 'base64');

  // 3. 寫入檔案到指定路徑
  fs.writeFileSync(outputPath, imageBuffer)

}

function saveSvgToFile(svgString, outputPath) {


  // 參數：檔案路徑、寫入內容、編碼（SVG 是純文字，指定 utf8）
  fs.writeFileSync(outputPath, svgString, 'utf8');

}




export function nb2md(nb: any, imgfolder: string): string {
  const parts: string[] = [];
  const tofolder = imgfolder
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
      if (cell.metadata && cell.metadata.tags && cell.metadata.tags.includes('hide')) {
        continue
      }
      const src = Array.isArray(cell.source) ? cell.source.join('') : cell.source;
      // try to preserve language from metadata
      let lang = (cell.metadata && cell.metadata.language) || '';
      // if raw stata magic present, remove it and mark language stata
      let body = src;
      if (body.startsWith('%%stata')) {
        body = body.replace(/^%%stata\s*\n/, '');
        lang = 'stata'
      }
      //包裝STATA source body
      if (!(cell.metadata && cell.metadata.tags && cell.metadata.tags.includes('hidesource'))) {
        parts.push('```' + (lang || '') + '\n' + body.trim() + '\n```\n');
      }


      let isContinuous = false;
      const out_stata = [];
      const out_images = [];
      if (cell.outputs) {
        cell.outputs.forEach(obj => {
          if (obj.output_type === "stream")
            out_stata.push(obj.text.join('\n'))

        });

        cell.outputs.forEach(obj => {

          fs.mkdirSync(imgfolder, { recursive: true })
          if (obj.output_type === "display_data") {
            let outtxt = 'unknown image type'
            //obj.data["image/svg+xml"]? outtxt=obj.data["image/svg+xml"].join(''):outtxt=outtxt
            //obj.data["image/png"]? outtxt= '\n<img class="w-75 h-75" src="data:image/png;base64,'+obj.data["image/png"] +'" alt="Folly Image">\n':outtxt=outtxt;
            if (obj.data["image/svg+xml"]) {
              let imgfile = getUniqueFilenameSync(imgfolder, out_prefix_img + path.parse(imgfolder).name, ".svg")
              const fullpath = path.posix.join(imgfolder, imgfile)
              const relativePath = path.posix.join(path.basename(imgfolder), imgfile)
              const upath = encodeURI(relativePath)
              saveSvgToFile(Array.isArray(obj.data["image/svg+xml"]) ? obj.data["image/svg+xml"].join('') : obj.data["image/svg+xml"], fullpath)
              outtxt = `\n![](${upath})\n{ class="lineimg w-100 h-50"}\n\n`
            }

            if (obj.data["image/png"]) {
              let imgfile = getUniqueFilenameSync(imgfolder, out_prefix_img + path.parse(imgfolder).name, ".png")
              const fullpath = path.posix.join(imgfolder, imgfile)
              const relativePath = path.posix.join(path.basename(imgfolder), imgfile)
              const upath = encodeURI(relativePath)

              saveBase64ToPNGFile(obj.data["image/png"], fullpath)
              outtxt = `\n![](${upath} )\n{ class="lineimg w-100 h-50"}\n\n`
            }
            out_images.push(outtxt);
          }
        });
      }
      if (out_stata.length > 0) {
        let outtxt = out_stata.join('');

        let isHideSource = false
        let codeBlock = '```' + (lang || '') + '\n' + outtxt + '\n' + '```\n';
        if (cell.metadata?.tags) {

          if (!cell.metadata.tags.includes('hideoutput')) {
            isHideSource = cell.metadata.tags.includes('hidesource');
          }
          if (isHideSource) {
            // 隱藏原始碼時：直接顯示輸出結果
            parts.push(codeBlock);
          } else {
            // 顯示原始碼時：將輸出結果放入「執行結果」的折疊選單中
            parts.push('{{< expand title="執行結果" incode=false >}}\n' + codeBlock + '{{< /expand >}}');
          }
        } else {
          parts.push('{{< expand title="執行結果" incode=false >}}\n' + codeBlock + '{{< /expand >}}');
        }


      }
      if (out_images.length > 0) {
        parts.push(out_images.join(''))
      }
      /*
            if (cell.outputs && cell.outputs.length>0) {
              for (const outblock of cell.outputs) {
                if (outblock.text && outblock.text.length>0){
                  let outtxt = outblock.text.join('')
                  //parts.push('```' + (lang || '') + '\n' + '{{< expand 輸出 >}}'+'\n'+ outtxt +'{{< /expand >}}'+'\n'+ '```\n');
                  parts.push( '{{< expand title="執行結果" incode=false >}}'+ '\n'+'```' + (lang || '')  +'\n'+ outtxt +'\n'+ '```\n'+'{{< /expand >}}');
                }
                if (outblock.data && outblock.data["image/svg+xml"]){
                  let outtxt = outblock.data["image/svg+xml"].join('')
                  parts.push(outtxt);
                }
              }
            }    
       */


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
