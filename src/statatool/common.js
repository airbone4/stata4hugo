import * as fs from 'fs'
import * as path from 'path'

function parseIO(apath)
{
  const workdir = path.dirname(apath)
  //const imgdir = path.replace(/(\.r?md$|\.r?markdown$)/i, '')+'.files'
  return {
    workdir:`${workdir}`,
    imgdir: `${path.join(path.parse(apath).dir, path.parse(apath).name + '.files')}`,
    docpath:apath
  }
}


function imageToDataUrl(filePath) {
  // Map common file extensions to MIME types
  const mimeTypes = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp'
  };

  const ext = path.extname(filePath).toLowerCase();
  const mimeType = mimeTypes[ext] || 'application/octet-stream';

  // Read file and encode as Base64
  const fileBuffer = fs.readFileSync(filePath);
  const base64String = fileBuffer.toString('base64');

  return `data:${mimeType};base64,${base64String}`;
}


function getUniqueFilenameSync(folderPath, prefix = '_', extension = '.png') {
  // 1. 確保資料夾存在，若不存在則建立,預設產生_xxxx.png, _xxxx1.png
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



export {parseIO, imageToDataUrl, getUniqueFilenameSync}