import { doStata, find_stata, getUniqueFilenameSync, parseIO, out_prefix_img } from "./index.js";
import * as fs from 'fs';
import * as path from 'path';
import { parseChunkHeader,processImagesToMarkdown } from "./common.js"


// 將 Map 全部改為一般物件
const knit_engines = {};
const knit_hooks = {};
const opts_chunk = {
  echo: true,
  eval: true,
  results: 'show'
};
const lang_chunk = {}



function engine_output(options, code, out) {
  return { options, code, out };
}

function isObjectAndNotMap(value) {
  return (
    Object.prototype.toString.call(value) === '[object Object]' &&
    !(value instanceof Map)
  );
}

// 2. 設定預設的 Chunks 參數 (opts_chunk 物件操作)

knit_engines['stata'] = async (code, chunkParam = {}) => {
  const rst = await doStata(code, chunkParam);
  return rst;
};

// compiler.worker.js 內完美適應所有情況的 JS 沙盒引擎
knit_engines['js'] = async (code, chunkParam = {}) => {
  let backupGlobalConsole = globalThis.console; // 備份全域 console
  try {
    let logs = [];

    // 1. 定義虛擬 console 攔截器
    const virtualConsole = {
      log: (...args) => {
        logs.push(args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' '));
      },
      error: (...args) => logs.push(`[Error] ` + args.join(' ')),
      warn: (...args) => logs.push(`[Warn] ` + args.join(' '))
    };

    // 雙重保險：同時改寫全域的 console
    globalThis.console = virtualConsole;

    // 2. 智慧分析程式碼行並注入 return
    let lines = code.split('\n').map(line => line.trimEnd());
    let lastNonEmptyIndex = -1;
    for (let i = lines.length - 1; i >= 0; i--) {
      if (lines[i].trim() !== '') { lastNonEmptyIndex = i; break; }
    }

    if (lastNonEmptyIndex !== -1) {
      let lastLine = lines[lastNonEmptyIndex].trim();
      const skipKeywords = /^(return|const|let|var|function|if|for|while|switch|import|export|try|console\.)|^\/\/|^\/\*/;
      if (!skipKeywords.test(lastLine)) {
        if (lastLine.endsWith(';')) lastLine = lastLine.slice(0, -1);
        lines[lastNonEmptyIndex] = `return (${lastLine});`;
      }
    }
    const patchedCode = lines.join('\n');

    // 3. 建立並執行非同步沙盒（同時傳入 console 參數）
    const AsyncFunction = Object.getPrototypeOf(async function () { }).constructor;
    const sandboxFn = new AsyncFunction('console', `
            with (globalThis) {
                ${patchedCode}
            }
        `);

    // 執行沙盒
    const result = await sandboxFn(virtualConsole);

    // 4. 🚀 恢復全域環境
    globalThis.console = backupGlobalConsole;

    // 5. 輸出邏輯判斷
    let textOutput = logs.join('\n');

    if (textOutput !== "" && result !== undefined) {
      textOutput += `\n${typeof result === 'object' ? JSON.stringify(result) : String(result)}`;
    } else if (textOutput === "" && result !== undefined) {
      textOutput = typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result);
    }

    return { txt: textOutput || "[執行成功，無輸出]" };

  } catch (err) {
    globalThis.console = backupGlobalConsole;
    return `JS (ESM Sandbox) Error:\n${err.message}`;
  }
};

// 模擬 Python 引擎
knit_engines['python'] = async (code) => {
  return `[Python 模擬輸出] 執行了：\n${code}`;
};

// ==========================================
// 🌟 需求 1 & 2：優化 Hooks 註冊（完全 Markdown 化）
// ==========================================

// 預設全域鉤子：自動帶入語言標籤 (options) 確保 Markdown 高亮
knit_hooks['source'] = (code, options) => {
  let result = "";
  const shook = `source:${options['engineName']}`;
  if (shook in knit_hooks)
    result = knit_hooks[shook](code, options);
  else
    result = `\`\`\`${options['engineName']}\n${code}\n\`\`\`\n\n`;
  return result;
};

knit_hooks['output'] = (result, options) => {
  let rst = "";
  // 🌟 核心邏輯：優先找特定引擎的 Hook（如 output:js），找不到才用全域預設的 output
  const ohook = `output:${options['engineName']}`;
  if (ohook in knit_hooks)
    rst = knit_hooks[ohook](result, options);
  else
    rst = `\`\`\`${options['engineName'] ? options['engineName'] : ""}\n${result}\n\`\`\`\n\n`;
  return rst;
};

// 🚀 為不同的引擎註冊專屬的輸出格式 (客製化專屬的 Markdown 格式)
knit_hooks['output:js'] = (result, options) => {
  const outtxt = isObjectAndNotMap(result) ? result.txt : result;
  let rst = "";
  rst = `{{< expand title="執行結果" incode=false class="" >}}\n\`\`\`${options['engineName']}\n${outtxt}\n\`\`\`\n{{< /expand >}}\n\n`;
  return rst;
};

knit_hooks['output:stata'] = (result, options) => {
  const outtxt = isObjectAndNotMap(result) ? result.txt : "";
  //if (outtxt === "") return ""
  const ishidden = options?.result?options['result']=='hide':false;
  if (ishidden) return ""

  const classlist = options.class?.split('.').filter(Boolean) || []
  let rst;
  if (classlist.includes('d-none')){
    rst = `\n\`\`\`${options['engineName']}\n${outtxt}\n\`\`\`\n\n`;
  }
  else {
    rst = `{{< expand title="執行結果" incode=false class="" >}}\n\`\`\`${options['engineName']}\n${outtxt}\n\`\`\`\n{{< /expand >}}\n\n`;
  }
  
  //dddd1 knitr 輸出圖形

  if (result?.imglist?.length > 0 && !fs.existsSync(options.imgdir))
    fs.mkdirSync(options.imgdir)

  rst = rst + processImagesToMarkdown(result?.imglist, options)
  //dddd2 好像可以不用調用processImagesToMarkdown
  //  for (const item of result?.imglist?.filter(Boolean) || []) {
  //     let topath= getUniqueFilenameSync(options.imgdir,`${out_prefix_img}`+path.parse(options.imgdir).name,'')
  //     topath = path.join(options.imgdir,topath)+'.svg'
  //     fs.copyFileSync(item,topath)
  //     const rpath = encodeURI(path.relative(options.workdir, topath).replaceAll("\\", "/"))

  //     rst += `![](${rpath})`
  //   }  

  return rst

};

knit_hooks['output:python'] = (result, options) => {
  const outtxt = isObjectAndNotMap(result) ? result.txt : result;
  return `{{< expand title="執行結果" incode=false class="" >}}\n\`\`\`${options['engineName']}\n${outtxt}\n\`\`\`\n{{< /expand >}}\n\n`;
};


// 5. 核心 Knit 編譯器函數 讀取整個Rmarkdown 然後一個一個chunk執行, 應該名子是rmdRender
async function knit(docpath) {
  const rawMarkdown = fs.readFileSync(docpath, 'utf8')

  const chunkRegex = /```\{([^}]+)\}[\r]?\n([\s\(\S\)]*?)[\r]?\n```/g
  let markdownOutput = rawMarkdown;
  let match;

  const chunksToProcess = [];
  while ((match = chunkRegex.exec(rawMarkdown)) !== null) {
    chunksToProcess.push({
      fullMatch: match[0],
      paramStr: match[1],
      code: match[2],
      index: match.index
    });
  }


  for (let i = chunksToProcess.length - 1; i >= 0; i--) {

    let currentOpts = { };
    const chunk = chunksToProcess[i];

    // 1. 直接解析標頭取得 engineName 與轉換好型別的 options
    //從回傳的物件中取出名為 options 的屬性，並重新命名為新的常數 parsedOpts
    const { engineName, options: parsedOpts } = parseChunkHeader(chunk.paramStr);

    const ioenv = parseIO(docpath)
    // 依優先順序合併：預設參數 < 文件路徑環境 < 區塊內設定的參數
    currentOpts = { ...opts_chunk ,...ioenv, ...parsedOpts }
    let chunkMarkdown = '';

    // 🟢 處理 Hook 1: 原始碼顯示
    if (currentOpts['echo'] === true) {
      const sourceHook = knit_hooks['source'];
      chunkMarkdown += sourceHook(chunk.code, currentOpts);
    }

    // 🟢 Engine 執行程式碼 與 Hook 2: 執行與專屬輸出格式
    if (currentOpts['eval'] === true && engineName in knit_engines) {
      const engine = knit_engines[engineName];
      // ===========🟢🟢執行🟢🟢--------------
      const rawResult = await engine(chunk.code, currentOpts);

      if (currentOpts['results'] !== 'hide') {
        const outputHook = knit_hooks['output'];
        chunkMarkdown += outputHook(rawResult, currentOpts);
      }
    } else if (currentOpts['eval'] === true && !(engineName in knit_engines)) {
      chunkMarkdown = chunk.fullMatch + '\n\n';
    }

    // 將原區塊替換為編譯後的 Markdown 內容
    markdownOutput = markdownOutput.slice(0, chunk.index) + chunkMarkdown + markdownOutput.slice(chunk.index + chunk.fullMatch.length);
  }

  return markdownOutput;
}

export {
  knit_engines,
  opts_chunk,
  knit_hooks,
  lang_chunk,
  knit
};
