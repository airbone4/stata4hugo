import * as vscode from 'vscode';
import * as path from 'path'
import * as fs from 'fs'
import { doStata } from './statatool/dostata.js'
import { parseOptionValue } from './statatool/common.js';
import { parseIO, parseChunkHeader, getUniqueFilenameSync } from './statatool/common.js';
import { out_prefix_img } from './statatool/config.js';
import * as knitr from './statatool/knitr.js'
import { updateInsertContent } from './tool/edittool.js';


// const OUTPUT_START_MARKER = '{{< expand title="執行結果" incode=false >}}'
// const OUTPUT_END_MARKER = '{{< /expand >}}';
const OUTPUT_START_MARKER = '<!-- stata-output-start -->';
const OUTPUT_END_MARKER = '<!-- stata-output-end -->';


/**
 * 掃描 Markdown 並產生完整按鈕列：
 * ▶ 執行 STTA | 🗑 清除結果 | 🧹 清除所有輸出 | 🖼 清除圖形檔案
 */

export class stataCodeLensProvider implements vscode.CodeLensProvider {
  public provideCodeLenses(document: vscode.TextDocument): vscode.CodeLens[] {
    const codeLenses: vscode.CodeLens[] = [];
    const text = document.getText();
    const hasAnyOutput = text.includes(OUTPUT_START_MARKER);

    //const regex = /^```\{stta\}\s*\(\r\)?\n([\s\(\S\)]*?)^```\s*$/gm;
    //chunkRegex
    const regex = /```(\{stata[^\r\n]*)\r?\n([\s\S]*?)\r?\n?```/gm
    let match;

    while ((match = regex.exec(text)) !== null) {
      const rawinfo = match[1]
      const codeContent = match[2];
      const startPos = document.positionAt(match.index);
      const endPos = document.positionAt(match.index + match[0].length);
      const range = new vscode.Range(startPos.line, 0, startPos.line, 0);

      // 1. 執行按鈕
      codeLenses.push(
        new vscode.CodeLens(range, {
          title: '▶ 執行 STATA',
          tooltip: '點擊執行此區塊並將結果輸出於下方',
          command: 'hugoHelper.runCodeBlock',
          arguments: [document, rawinfo, codeContent, startPos.line,endPos.line]
          //arguments: [document, codeContent, endPos.line]
        })
      );

      // 2. 清除單一結果按鈕
      const existingRange = findExistingOutputRange(document, endPos.line);
      if (existingRange) {
        codeLenses.push(
          new vscode.CodeLens(range, {
            title: '🗑 清除結果',
            tooltip: '移除此區塊下方的執行結果',
            command: 'hugoHelper.clearOutput',
            arguments: [document, endPos.line]
          })
        );
      }

      // 3. 清除所有輸出按鈕
      if (hasAnyOutput) {
        codeLenses.push(
          new vscode.CodeLens(range, {
            title: '🧹 清除所有輸出',
            tooltip: '移除整份文件中所有的 STTA 執行結果',
            command: 'hugoHelper.clearAllOutputs'
          })
        );
      }

  
    }

    return codeLenses;
  }
}

/**
 * 掃描輸出區塊中引用的圖片並從硬碟刪除
 * 主要尋找 ![]()
 */
async function clearImageFromText(text, imgRoot) {
  //const text = document.getText();
  //const docDir = path.dirname(document.uri.fsPath);
  const docDir = imgRoot;

  // 找出所有 stata 輸出區塊
  const outputBlockRegex = /<!-- stata-output-start -->([\s\S]*?)<!-- stata-output-end -->/g;
  // 匹配 Markdown 圖片語法 ![alt](path)
  const imageLinkRegex = /!\[.*?\]\((.*?)\)/g;

  const imagePaths = new Set<string>();
  let blockMatch;

  while ((blockMatch = outputBlockRegex.exec(text)) !== null) {
    const blockContent = blockMatch[1];
    let imgMatch;
    while ((imgMatch = imageLinkRegex.exec(blockContent)) !== null) {
      const rawPath = imgMatch[1].trim();
      // 排除網路圖片，只處理本地相對路徑
      if (!rawPath.startsWith('http://') && !rawPath.startsWith('https://')) {
        imagePaths.add(path.resolve(docDir, rawPath));
      }
    }
  }

  if (imagePaths.size === 0) {
    vscode.window.setStatusBarMessage('找不到可清除的 STTA 圖形檔案。', 2500);
    return;
  }

  let deletedCount = 0;
  for (const fullPath of imagePaths) {
    try {
      const apath = decodeURIComponent(fullPath)
      const fileUri = vscode.Uri.file(apath);

      // useTrash: true 會將檔案移至資源回收筒，避免誤刪無法救回
      await vscode.workspace.fs.delete(fileUri, { useTrash: true });
      deletedCount++;
    } catch {
      // 若檔案已不存在則略過
    }
  }

  vscode.window.setStatusBarMessage(`已將 ${deletedCount} 個圖形檔案移至回收筒。`, 3000);
}
async function clearGeneratedImages(document: vscode.TextDocument) {
  const text = document.getText();
  const docDir = path.dirname(document.uri.fsPath);
  await clearImageFromText(text, docDir)
  
}
function cleanContinue(atxt){
    //let cleanoutput= output.split('\n')
    const beginidx=atxt.findIndex(line => /<---continueCutBegin--->/.test(line));
    const lastidx = atxt.findIndex(line => /<---continueCutEnd--->/.test(line));
    atxt.splice(beginidx,lastidx-beginidx+1)
    return atxt;
}
/**
 * 執行程式碼並覆蓋或插入結果
 * hugoHelper.runCodeBlock 調用
 */
export async function executeAndInsertResult(
  document: vscode.TextDocument,
  rawinfo: string,
  code: string,
  startline:number,
  endLine: number
) {
  vscode.window.setStatusBarMessage('正在執行 stata...', 2000);

  try {
    
    

    const edit = new vscode.WorkspaceEdit();
    const existingRange = findExistingOutputRange(document, endLine);

    //清除區域中的圖檔dddd3
    if (existingRange){
      await clearImageFromText(document.getText(existingRange), path.dirname(document.uri.fsPath))
    }
        // 向上檢查並合併前置區塊程式碼
    const executableCode = collectChainedCode(document, startline, rawinfo, code);

    let output = await mockRunstata(document.fileName, rawinfo, executableCode);
    //cleanContinue(output.split('\n'))
     let cleanoutput= output.split('\n')
     const beginidx=cleanoutput.findIndex(line => /<---continueCutBegin--->/.test(line));
     const lastidx = cleanoutput.findIndex(line => /<---continueCutEnd--->/.test(line));
     cleanoutput.splice(beginidx,lastidx-beginidx+1)
    output = cleanoutput.join('\n')
    //output 如果是空字串,表示選項有result="hide"
    const formattedOutput = output?  [
      OUTPUT_START_MARKER,
      //      '```stata?class=.output?preclass=ms-2',
      output?.trim(),
      //      '```',
      OUTPUT_END_MARKER
    ].join('\n')
    :''; 


    await updateInsertContent(document, endLine, existingRange, formattedOutput);

    // await vscode.workspace.applyEdit(edit);
  } catch (error: any) {
    vscode.window.showErrorMessage(`stata 執行失敗: ${error.message}`);
  }
}

/**
 * 清除 Code Fence 下方的輸出結果（包含前置換行）
 */
export async function clearOutputResult(
  document: vscode.TextDocument,
  endLine: number
) {
  const existingRange = findExistingOutputRange(document, endLine);
  if (!existingRange) {
    return;
  }

  const edit = new vscode.WorkspaceEdit();

  // 將刪除範圍的起點往前推到 endLine 的行尾，這樣連同前面的換行符號也會一併清乾淨，不會留下多餘空行
  const endLineLength = document.lineAt(endLine).text.length;
  const deleteStart = new vscode.Position(endLine, endLineLength);
  const fullDeleteRange = new vscode.Range(deleteStart, existingRange.end);
  let txt = document.getText(fullDeleteRange)
  //清除區段中的圖形檔案
  clearImageFromText(txt, path.dirname(document.uri.fsPath))
  edit.delete(document.uri, fullDeleteRange);
  await vscode.workspace.applyEdit(edit);
}

/**
 * 尋找緊接在 Code Fence 下方的舊輸出區塊範圍
 */
function findExistingOutputRange(
  document: vscode.TextDocument,
  codeEndLine: number
): vscode.Range | null {
  const totalLines = document.lineCount;
  let currentLine = codeEndLine + 1;

  while (currentLine < totalLines && document.lineAt(currentLine).text.trim() === '') {
    currentLine++;
  }

  if (currentLine >= totalLines || document.lineAt(currentLine).text.trim() !== OUTPUT_START_MARKER) {
    return null;
  }

  const startLine = currentLine;

  while (currentLine < totalLines) {
    if (document.lineAt(currentLine).text.trim() === OUTPUT_END_MARKER) {
      const endLineLength = document.lineAt(currentLine).text.length;
      return new vscode.Range(startLine, 0, currentLine, endLineLength);
    }
    currentLine++;
  }

  return null;
}



/**
 * 掃描並清除整份文件中所有的 stata 輸出區塊
 */
export async function clearAllOutputsInDocument(document: vscode.TextDocument) {
  const text = document.getText();
  // 匹配包含前置換行符號的完整輸出區塊，確保刪除後不留多餘空行
  const outputRegex = /\r?\n?<!-- stata-output-start -->[\s\S]*?<!-- stata-output-end -->/g;

  const edit = new vscode.WorkspaceEdit();
  let match;
  let count = 0;

  while ((match = outputRegex.exec(text)) !== null) {
    const startPos = document.positionAt(match.index);
    const endPos = document.positionAt(match.index + match[0].length);
    edit.delete(document.uri, new vscode.Range(startPos, endPos));
    count++;
  }

  if (count === 0) {
    vscode.window.setStatusBarMessage('目前沒有可清除的 stata 執行結果。', 2000);
    return;
  }
  await clearGeneratedImages(document)
  await vscode.workspace.applyEdit(edit);
  vscode.window.setStatusBarMessage(`已清除 ${count} 個 stata 執行結果。`, 2000);
}


/**
 * 向上檢查並收集需要延續執行的前置程式碼
 * @param document 當前文件
 * @param currentStartLine 目前執行區塊的起始行號
 * @param currentRawInfo 目前區塊的標頭字串（例如 "{stata, continue=true}"）
 * @param currentCode 目前區塊的程式碼內容
 */
function collectChainedCode(
  document: vscode.TextDocument,
  currentStartLine: number,
  currentRawInfo: string,
  currentCode: string
): string {
  const { options: currentOptions } = parseChunkHeader(currentRawInfo);

  // 檢查目前區塊是否需要接續上一個區塊（支援 continue=true 或 prev=true）
  const shouldContinue =
    currentOptions?.continue === true ||
    String(currentOptions?.continue).toLowerCase() === 'true' ||
    currentOptions?.prev === true ||
    String(currentOptions?.prev).toLowerCase() === 'true';

  if (!shouldContinue) {
    return currentCode;
  }

  // 取得目前區塊之前的所有文字
  const textBefore = document.getText(new vscode.Range(0, 0, currentStartLine, 0));
  //chunkRegex
  
  const regex = /```(\{stata[^\r\n]*)\r?\n([\s\S]*?)\r?\n?```/gm
  const previousBlocks: Array<{ rawInfo: string; code: string }> = [];
  let match;

  while ((match = regex.exec(textBefore)) !== null) {
    previousBlocks.push({
      rawInfo: match[1],
      code: match[2]
    });
  }

  // 從最接近的前一個區塊開始往回追溯
  const codeChain: string[] =[];// = [currentCode];
  
  for (let i = previousBlocks.length - 1; i >= 0; i--) {
    const prev = previousBlocks[i];
    const { options: prevOptions } = parseChunkHeader(prev.rawInfo);

    // 若前置區塊標記了 eval=false，則跳過該區塊
    if (prevOptions?.eval === false || String(prevOptions?.eval).toLowerCase() === 'false') {
      continue;
    }

    // 將前置程式碼加到最前面
    //codeChain.unshift(`//<---continueCutBegin--->\n${prev.code}\n//<---continueCutEnd--->\n`);
    codeChain.unshift(`${prev.code}`);

    // 檢查這個前置區塊本身是否也接續更上一個區塊；若沒有，代表連鎖到此為止
    const prevContinues =
      prevOptions?.continue === true ||
      String(prevOptions?.continue).toLowerCase() === 'true' ||
      prevOptions?.prev === true ||
      String(prevOptions?.prev).toLowerCase() === 'true';

    if (!prevContinues) {
      break;
    }
  }
  codeChain.unshift(`//<---continueCutBegin--->\n`)
  codeChain.push(`graph drop _all \n//<---continueCutEnd--->\n${currentCode}`);
  return codeChain.join('\n');
}

//output 如果是空字串,表示選項有result="hide"
export async function mockRunstata(docpath: string, rawinfo: string, code: string): Promise<any> {


  const { engineName, options } = parseChunkHeader(rawinfo);
  const ioenv = parseIO(docpath);
  const metadata: any = {
    ...options,
    ...ioenv
  };
  //---👉 進入執行stata
  let rst: any;
  if ((engineName || '').toLowerCase() === 'stata') {
    rst = await doStata(code, metadata);
  }
  //let result = getoutput(rst,metadata)

  //輸出圖形處理
  let ohook = knitr.knit_hooks['output:stata']
  let result = ohook ? ohook(rst, metadata) : ''



  return result
}