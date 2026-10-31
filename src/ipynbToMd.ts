import * as fs from 'fs';
import * as path from 'path';
function saveBase64ToPNGFile(base64String, outputPath) {
    // 1. 移除可能帶有的 Data URL 標頭前綴
    const base64Data = base64String.replace(/^data:image\/\w+;base64,/, "");
    
    // 2. 將 Base64 字串直接轉換為 Node.js Buffer
    const imageBuffer = Buffer.from(base64Data, 'base64');
    
    // 3. 寫入檔案到指定路徑
    fs.writeFileSync(outputPath,imageBuffer)
    // fs.writeFile(outputPath, imageBuffer, (err) => {
    //     /*if (err) {
    //         console.error('儲存圖片時發生錯誤:', err);
    //     } else {
    //         console.log(`圖片已成功儲存至: ${outputPath}`);
    //     }*/
    // });
}

function saveSvgToFile(svgString,outputPath) {

 
    // 參數：檔案路徑、寫入內容、編碼（SVG 是純文字，指定 utf8）
    fs.writeFileSync(outputPath, svgString, 'utf8');
   
}


function getUniqueFilenameSync(folderPath, prefix = 'xxxx', extension = '.png') {
    // 1. 確保資料夾存在，若不存在則建立
    if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true });
    }

    let counter = 1;
    // 預設第一個嘗試的檔名，例如：xxxx.png
    let filename = `${prefix}${extension}`;
    let fullPath = path.join(folderPath, filename);

    // 2. 如果檔案已存在，就加上數字序號重試 (例如：xxxx_1.png, xxxx_2.png)
    while (fs.existsSync(fullPath)) {
        filename = `${prefix}_${counter}${extension}`;
        fullPath = path.join(folderPath, filename);
        counter++;
    }

    return filename; // 回傳唯一的檔名（不含完整路徑）
}


export function convertIpynbToMarkdown(nb: any,imgfolder:string): string {
  const parts: string[] = [];
  const tofolder=imgfolder 
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
      if (cell.metadata && cell.metadata.tags && cell.metadata.tags.length > 0 && cell.metadata.tags.includes('hide')) {
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
      //輸入部分
      parts.push('```' + (lang || '') + '\n' + body.trim() + '\n```\n');

      let isContinuous = false;
      const out_stata = [];
      const out_images = [];
      if (cell.outputs) {
        cell.outputs.forEach(obj => {
          if (obj.output_type === "stream") {
            if (isContinuous) {
              // 連續狀態下，直接推入上一個子陣列中
              out_stata.push(...obj.text);
            } else {
              // 第一次遇到或中斷後重新遇到，建立新陣列
              out_stata.push(...obj.text);
              isContinuous = true;
            }
          } else {
            // 遇到非 stdout，將連續狀態重設為 false
            isContinuous = false;
          }
        });

        cell.outputs.forEach(obj => {
          
          fs.mkdirSync(imgfolder, { recursive: true })
          if (obj.output_type === "display_data") {
            let outtxt = 'unknown image type'
            //obj.data["image/svg+xml"]? outtxt=obj.data["image/svg+xml"].join(''):outtxt=outtxt
            //obj.data["image/png"]? outtxt= '\n<img class="w-75 h-75" src="data:image/png;base64,'+obj.data["image/png"] +'" alt="Folly Image">\n':outtxt=outtxt;
            if(obj.data["image/svg+xml"]){
              let imgfile=getUniqueFilenameSync(imgfolder,path.parse(imgfolder).name,".svg")
              
              saveSvgToFile(obj.data["image/svg+xml"].join("") ,imgfolder+'/'+imgfile)
              outtxt=`\n![](${path.basename(imgfolder)}/${imgfile})\n\n`
            }

            if(obj.data["image/png"]){
              let imgfile=getUniqueFilenameSync(imgfolder,path.parse(imgfolder).name,".png")
              
              saveBase64ToPNGFile(obj.data["image/png"] ,imgfolder+'/'+imgfile)
              outtxt=`\n![](${path.basename(imgfolder)}/${imgfile} )\n{ class="lineimg w-100 h-50"}\n`
            }
            out_images.push(outtxt);
          }
        });
      }
      if (out_stata.length > 0) {
        let outtxt = out_stata.join('');
        parts.push('{{< expand title="執行結果" incode=false >}}' + '\n' + '```' + (lang || '') + '\n' + outtxt + '\n' + '```\n' + '{{< /expand >}}');
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
  const md = convertIpynbToMarkdown(nb,path.parse(outputPath).name);
  fs.writeFileSync(outputPath, md, 'utf8');
}
