import * as fs from 'fs'
import * as path from 'path'

export function parseIO(apath)
{
  const workdir = path.dirname(apath)
  //const imgdir = path.replace(/(\.r?md$|\.r?markdown$)/i, '')+'.files'
  return {
    workdir:`${workdir}`,
    imgdir: `${path.join(path.parse(apath).dir, path.parse(apath).name + '.files')}`,
    docpath:apath
  }
}


export function imageToDataUrl(filePath) {
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


export function getUniqueFilenameSync(folderPath, prefix = '_', extension = '.png') {
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


export function parseOptionValue(v) {
  if (!v) return v;
  const low = v.toLowerCase();
  if (low === 'true' || low === 't') return true;
  if (low === 'false' || low === 'f') return false;
  // number?
  const n = Number(v);
  if (!Number.isNaN(n)) return n;
  // strip quotes if present
  const m = v.match(/^['"](.*)['"]$/);
  if (m) return m[1];
  return v;
}


/**
 * 將暫存圖片列表複製到目標資料夾，並生成對應的 Markdown 圖片語法
 * @param {string[]} imgList - 暫存圖檔路徑陣列
 * @param {string} imgDir - 目標圖片資料夾 (如 doc.files)
 * @param {string} workDir - 文件所在工作目錄
 * @param {string} prefix - 檔名前綴 (預設 '_')
 * @returns {string} 組合好的 Markdown 圖片字串
 */
export function processImagesToMarkdown(imgList, options, prefix = '_') {
  const validImages = imgList?.filter(Boolean) || [];
  if (validImages.length === 0) return '';

  if (!fs.existsSync(options.imgdir)) {
    fs.mkdirSync(options.imgdir, { recursive: true });
  }

  let mdResult = '';
  const folderBaseName = path.parse(options.imgdir).name;

  for (const item of validImages) {
    // ✅ 直接傳入 '.svg' 讓 getUniqueFilenameSync 正確檢查重複檔名
    const uniqueFilename = getUniqueFilenameSync(options.imgdir, `${prefix}${folderBaseName}`, '.svg');
    const topath = path.join(options.imgdir, uniqueFilename);
    fs.copyFileSync(item, topath);

    const rpath = encodeURI(path.relative(options.workdir, topath).replaceAll('\\', '/'));
    //{stata,echo=F}?class=.d-none?imgclass=.lineimg.w50 => 點開頭不能空白
    const imgclass=options.imgclass?options['imgclass'].split('.').join(' '):'lineimg w-100 h-50'
    mdResult += `\n![](${rpath})\n{class="${imgclass}"}\n`;
  }

  return mdResult;
}
/**
 * 解析 Markdown code block 的參數標頭 (例如: "{stata fig1, echo=false}")
 * @param {string} paramStr - 大括號內的字串 (或包含大括號)
 * @returns {{ engineName: string, options: Object }}
 */
// 原先的方法
   // remove surrounding braces
  //   info = info.slice(1, -1).trim();

  //   // 先處理逗點
  //   const commaParts = info.split(/[?, ]+/).map(p => p.trim()).filter(p => p.length > 0);
  //   if (commaParts.length > 0) {
  //     // first part may contain language and possibly inline options separated by whitespace
  //     let first = commaParts[0].replace(/^\{|\}$/g, ""); //就是code fence 三個反頓號後面的字串
  //     //再處理空白
  //     const firstTokens = first.split(/\s+/).filter(Boolean);
  //     lang = firstTokens[0] || '';
  //     const restParts: string[] = [];
  //     if (firstTokens.length > 1) {
  //       restParts.push(firstTokens.slice(1).join(' '));
  //     }
  //     // 例如, stata kk, echo=T firstTokens 就是 stata kk, commaParts 就是 1. stata kk 2. echo=T
  //     if (commaParts.length > 1) restParts.push(...commaParts.slice(1));

  //     // parse each rest part as key[=value]
  //     for (const p of restParts) {
  //       const [kRaw, ...rest] = p.split('=');
  //       const k = kRaw ? kRaw.trim() : '';
  //       if (!k) continue;
  //       const v = rest.length > 0 ? rest.join('=').trim() : undefined;
  //       metadata[k] = v === undefined ? true : parseOptionValue(v);
  //     }
  //   }
  // }
export function parseChunkHeader(paramStr) {
  //去掉
  //const cleanStr = paramStr.replace(/^\{|\}$/g, '').trim();
  const cleanStr = paramStr.replace(/\{|\}/g, '').trim();
  //不分割空白
  const tokens = cleanStr.split(/[,\?]+/).filter(Boolean);
  
  const engineName = tokens[0] || '';
  const options = { engineName };

  for (let i = 1; i < tokens.length; i++) {
    const token = tokens[i];
    const eqIndex = token.indexOf('=');
    
    if (eqIndex !== -1) {
      const key = token.slice(0, eqIndex).trim();
      const val = token.slice(eqIndex + 1).trim();
      if (key) {
        options[key] = parseOptionValue(val); // 直接複用 common.js 的函數
      }
    } else {
      // 處理沒有等號的選項，如 label 或布林簡寫
      if (!options.label && i === 1) {
        options.label = token;
      } else {
        options[token] = true;
      }
    }
  }

  return { engineName, options };
}

/**
 * 將執行結果包裝為 Hugo expand 短代碼或一般程式碼區塊
 * @param {string} text - 輸出文字
 * @param {string} lang - 語言標籤 (如 'stata', 'js')
 * @param {boolean} useExpand - 是否使用 expand 折疊區塊 (預設 true)
 * @param {string} title - 折疊區塊標題
 * @returns {string}
 */
export function formatExpandOutput(text, lang = '', useExpand = true, title = '執行結果') {
  if (!useExpand) {
    return `\n\`\`\`${lang}\n${text}\n\`\`\`\n`;
  }
  return `{{< expand title="${title}" incode=false class="" >}}\n\`\`\`${lang}\n${text}\n\`\`\`\n{{< /expand >}}\n\n`;
}

/**
 * 解析 Stata 執行後的 Log 內容，分離正式輸出與生成的 SVG 圖檔列表
 * @param {string} rawLog - 原始 log 檔案內容
 * @returns {{ cleanLog: string, imgList: string[] }}
 */
export function parseStataLog(rawLog) {
  let normalized = rawLog.replace(/\r\n|\r|\n/g, '\n');
  let lines = normalized.split('\n');

  // 1. 切除 <<- pre ->> 之前的內容
  const preIdx = lines.findIndex(line => /<<- pre ->>/.test(line));
  if (preIdx !== -1) {
    lines = lines.slice(preIdx + 1);
  }

  // 2. 分離 <<- post ->> 之後的內容
  const postIdx = lines.findIndex(line => /<<- post ->>/.test(line));
  let cleanLog = '';
  let imgList = [];

  if (postIdx !== -1) {
    cleanLog = lines.slice(0, postIdx).join('\n');
    let postSection = lines.slice(postIdx).join('\n');
    // 處理 Stata log 自動斷行產生的 "> " 符號
    postSection = postSection.replace(/[\r]?\n>\s?/g, '');

    const svgRegex = /file\s+(.*?)\s+saved\s+as\s+SVG\s+format/gi;
    imgList = [...postSection.matchAll(svgRegex)].map(match => match[1]);
  } else {
    cleanLog = lines.join('\n');
  }

  return { cleanLog, imgList };
}
