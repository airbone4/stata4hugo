

const knit_engines = new Map();
const opts_chunk = new Map();
const knit_hooks = new Map();

function engine_output(options, code, out) {
    return { options, code, out };
}

// 2. 設定預設的 Chunks 參數 (opts_chunk)
opts_chunk.set('echo', true);    // 是否顯示原始程式碼
opts_chunk.set('eval', true);    // 是否執行程式碼
opts_chunk.set('results', 'show'); // 'show' 或 'hide'

knit_engines.set('stata', async (code) => {
  const rst = await doStata(codeSource, workdir, metadata);
  return code;
});

// compiler.worker.js 內完美適應所有情況的 JS 沙盒引擎
knit_engines.set('js', async (code) => {
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
        const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
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

        return textOutput || "[執行成功，無輸出]";
        
    } catch (err) {
        globalThis.console = backupGlobalConsole;
        return `JS (ESM Sandbox) Error:\n${err.message}`;
    }
});

// 模擬 Python 引擎
knit_engines.set('python', async (code) => {
    return `[Python 模擬輸出] 執行了：\n${code}`;
});

// ==========================================
// 🌟 需求 1 & 2：優化 Hooks 註冊（完全 Markdown 化）
// ==========================================

// 預設全域鉤子：自動帶入語言標籤 (options) 確保 Markdown 高亮
knit_hooks.set('source', (code, options ) => {
  let result=""
  const shook=`source:${options.get('engineName')}`
  if (knit_hooks.has(shook))
    result = knit_hooks.get(shook)(code,options)
  else
  result= `\`\`\`${options.get('engineName')}\n${code}\n\`\`\`\n\n`
  return result
});

knit_hooks.set('output', (result,options) => {
  let rst=""
  // 🌟 核心邏輯：優先找特定引擎的 Hook（如 output:js），找不到才用全域預設的 output
  const ohook=`output:${options.get('engineName')}`
  if (knit_hooks.has(ohook))
    rst = knit_hooks.get(ohook)(result,options)
  else
    rst= `\`\`\`${options.get('engineName')?options.get('engineName'):""}\n${result}\n\`\`\`\n\n`
   return rst
})

// 🚀 為不同的引擎註冊專屬的輸出格式 (客製化專屬的 Markdown 格式)
knit_hooks.set('output:js', (result,options) => {
  let rst=""
  rst = `{{< expand title="執行結果" incode=false class="" >}}\n\`\`\`${options.get('engineName')}\n${result}\n\`\`\`\n{{< /expand >}}\n\n`;
  return rst
})
knit_hooks.set('output:stata', (result,options) => {
  return `{{< expand title="執行結果" incode=false class="" >}}\n\`\`\`${options.get('engineName')}\n${result}\n\`\`\`\n{{< /expand >}}\n\n`
});
knit_hooks.set('output:python', (result,options) => {
 return `{{< expand title="執行結果" incode=false class="" >}}\n\`\`\`${options.get('engineName')}\n${result}\n\`\`\`\n{{< /expand >}}\n\n`
});


// 5. 核心 Knit 編譯器函數
async function knit(rawMarkdown) {
    //const chunkRegex = /```\(\{([^}]+)\}[\r]\)?\n([\s\(\S\)]*?)\([\r]\)?\n```/g;
    //chunkRegex 的作用是抽出下面的內容
    // ```{stata,echo=T,block.pre.class="ms-5.w-75"}
    // sysuse auto
    // scatter price weight
    // ```    
    //0 是全部,1 是 stata,echo=T,block.pre.class="ms-5.w-75" , 3 是程式碼
    const chunkRegex = /```\{([^}]+)\}[\r]?\n([\s\(\S\)]*?)[\r]?\n```/g
    let markdownOutput = rawMarkdown; // 重新命名變數以符合 Markdown 輸出語意
    let match;

    const chunksToProcess = [];
    while ((match = chunkRegex.exec(rawMarkdown)) !== null) {
    // 因為使用了 ‼️/g 全域匹配，chunkRegex.exec() 每次被呼叫時，
    // 都會從上一次找到的位置後面繼續往下找，直到找不到了返回 null。

        chunksToProcess.push({
            fullMatch: match[0],
            paramStr: match[1],
            code: match[2],
            index: match.index
        });
    }

    for (let i = chunksToProcess.length - 1; i >= 0; i--) {
        const chunk = chunksToProcess[i];
        
        // 使用 /[\s,]+/ 可以過濾掉逗號與空格產生的空字串
        const tokens = chunk.paramStr.trim().split(/[\s,]+/).filter(Boolean);
        const engineName = tokens[0]; 
        
        //chunk 參數處理
        const currentOpts = new Map(opts_chunk); 
        currentOpts.set('engineName',engineName)

        for (let j = 1; j < tokens.length; j++) {
            const [key, value] = tokens[j].split('=');
            if (key && value) {
                const parsedValue = ['true','t'].includes(value.toLowerCase()) ? true : value === 'false' ? false : value;
                currentOpts.set(key, parsedValue);
            }
        }

        let chunkMarkdown = ''; // 累積當前區塊轉換出來的 Markdown 文字

        // 🟢 處理 Hook 1: 原始碼顯示 (傳入語言名稱 engineName 以獲得高亮)
        if (currentOpts.get('echo') === true) {
            const sourceHook = knit_hooks.get('source');
            const xx= sourceHook(chunk.code, currentOpts)
            chunkMarkdown +=  sourceHook(chunk.code, currentOpts)
        }

        // 🟢 Engine 執行程式碼 與 Hook 2: 執行與專屬輸出格式
        if (currentOpts.get('eval') === true && knit_engines.has(engineName)) {
            const engine = knit_engines.get(engineName);
            //===========🟢🟢執行🟢🟢--------------
            const rawResult = await engine(chunk.code); 
            
            if (currentOpts.get('results') !== 'hide') {
                
                const outputHook =  knit_hooks.get('output');
                const xx=outputHook(rawResult,currentOpts)  
                chunkMarkdown +=   outputHook(rawResult,currentOpts)  
 
            }
        } else if (currentOpts.get('eval') === true && !knit_engines.has(engineName)) {
            chunkMarkdown = chunk.fullMatch + '\n\n'; // 沒對應引擎時保持原樣
        }

        // 將原區塊替換為編譯後的 Markdown 內容
        markdownOutput = markdownOutput.slice(0, chunk.index) + chunkMarkdown + markdownOutput.slice(chunk.index + chunk.fullMatch.length);
    }

    // 🌟 需求 2：不要再透過 marked.js 轉成 HTML，直接回傳純粹處理好的 Markdown 字串
    return markdownOutput;
}

export {
    knit_engines,
    opts_chunk,
    knit_hooks,
    knit
};

