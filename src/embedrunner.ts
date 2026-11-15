import * as vscode from 'vscode';
import * as path from 'path'
import * as fs from 'fs'
import { doStata } from './statatool/dostata.js'
import { parseOptionValue } from './statatool/common.js';
import { parseIO, getUniqueFilenameSync } from './statatool/common.js';
import { out_prefix_img } from './statatool/config.js';


// const OUTPUT_START_MARKER = '{{< expand title="執行結果" incode=false >}}'
// const OUTPUT_END_MARKER = '{{< /expand >}}';
const OUTPUT_START_MARKER = '<!-- stata-output-start -->';
const OUTPUT_END_MARKER = '<!-- stata-output-end -->';

/**
 * 掃描 Markdown 並產生「執行」與「清除」按鈕
 */
export class stataCodeLensProvider implements vscode.CodeLensProvider {
  public provideCodeLenses(document: vscode.TextDocument): vscode.CodeLens[] {
    const codeLenses: vscode.CodeLens[] = [];
    const text = document.getText();

    // 匹配 ```{stata} 開頭到 ``` 結尾的區塊
    //const regex = /```\{stata\}\s*\r?\n([\s\S]*?)^```\s*\$/gm;
    //const regex = /```(\{stata[\s\S]*?\})([\s\S]*?)```/gm;
    const regex = /```(\{stata[^\r\n]*)\r?\n([\s\S]*?)\r?\n?```/gm
    let match;

    while ((match = regex.exec(text)) !== null) {
      const rawinfo = match[1]
      const codeContent = match[2];
      const startPos = document.positionAt(match.index);
      const endPos = document.positionAt(match.index + match[0].length);
      const range = new vscode.Range(startPos.line, 0, startPos.line, 0);

      // 加入「▶ 執行 stata」按鈕
      codeLenses.push(
        new vscode.CodeLens(range, {
          title: '▶ 執行 stata',
          tooltip: '點擊執行此區塊並將結果輸出於下方',
          command: 'hugoHelper.runCodeBlock',
          arguments: [document, rawinfo, codeContent, endPos.line]
        })
      );

      // 檢查下方是否已有舊結果，若有才顯示「🗑 清除結果」按鈕
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
    }

    return codeLenses;
  }
}

/**
 * 執行程式碼並覆蓋或插入結果
 */
export async function executeAndInsertResult(
  document: vscode.TextDocument,
  rawinfo: string,
  code: string,
  endLine: number
) {
  vscode.window.setStatusBarMessage('正在執行 stata...', 2000);

  try {
    // TODO: 替換為實際的 stata 執行邏輯
    const output = await mockRunstata(document.fileName, rawinfo, code);

    const formattedOutput = [
      OUTPUT_START_MARKER,
//      '```stata?class=.output?preclass=ms-2',
      output.trim(),
//      '```',
      OUTPUT_END_MARKER
    ].join('\n');

    const edit = new vscode.WorkspaceEdit();
    const existingRange = findExistingOutputRange(document, endLine);

    if (existingRange) {
      // 覆蓋舊結果
      edit.replace(document.uri, existingRange, formattedOutput);
    } else {
      // 插入新結果
      const endLineText = document.lineAt(endLine).text;
      const insertPosition = new vscode.Position(endLine, endLineText.length);
      edit.insert(document.uri, insertPosition, `\n${formattedOutput}`);
    }

    await vscode.workspace.applyEdit(edit);
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
 * 模擬執行函式
 */

// async function mockRunstata(code: string): Promise<string> {
//     return new Promise((resolve) => {
//         setTimeout(() => {
//             resolve(`成功處理了 ${code.trim().split('\n').length} 行指令！`);
//         }, 500);
//     });
// }


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

  await vscode.workspace.applyEdit(edit);
  vscode.window.setStatusBarMessage(`已清除 ${count} 個 stata 執行結果。`, 2000);
}

function getoutput(result, options)  {

  let outtxt=result.txt
  let rst =options['echo']? `{{< expand title="執行結果" incode=false class="" >}}\n\`\`\`${options['engineName']}\n${outtxt}\n\`\`\`\n{{< /expand >}}\n\n`
                          :`\n\`\`\`${options['engineName']}\n${outtxt}\n\`\`\`\n`
  //dddd1 knitr 輸出圖形
  
  if (result?.imglist?.length>0 && !fs.existsSync(options.imgdir))
       fs.mkdirSync(options.imgdir)

 for (const item of result?.imglist?.filter(Boolean) || []) {
    let topath= getUniqueFilenameSync(options.imgdir,`${out_prefix_img}`+path.parse(options.imgdir).name,'')
    topath = path.join(options.imgdir,topath)+'.svg'
    fs.copyFileSync(item,topath)
    const rpath = encodeURI(path.relative(options.workdir, topath).replaceAll("\\", "/"))

    rst += `![](${rpath})`
  }  
 
  return rst

};

export async function mockRunstata(docpath: string, rawinfo: string, code: string) {

  let info = rawinfo;
  let lang = '';
  let metadata: any = {engineName:'stata'};



  if (info.length > 0) {
    // remove surrounding braces
    info = info.slice(1, -1).trim();

    // 先處理逗點
    const commaParts = info.split(/[?, ]+/).map(p => p.trim()).filter(p => p.length > 0);
    if (commaParts.length > 0) {
      // first part may contain language and possibly inline options separated by whitespace
      let first = commaParts[0].replace(/^\{|\}$/g, ""); //就是code fence 三個反頓號後面的字串
      //再處理空白
      const firstTokens = first.split(/\s+/).filter(Boolean);
      lang = firstTokens[0] || '';
      const restParts: string[] = [];
      if (firstTokens.length > 1) {
        restParts.push(firstTokens.slice(1).join(' '));
      }
      // 例如, stata kk, echo=T firstTokens 就是 stata kk, commaParts 就是 1. stata kk 2. echo=T
      if (commaParts.length > 1) restParts.push(...commaParts.slice(1));

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

  let ioenv = parseIO(docpath)
  //dddd1
  metadata = { ...metadata, ...ioenv }
  //---👉 進入執行stata
  let rst: any;
  if ((lang || '').toLowerCase() === 'stata') {
    rst = await doStata(code, metadata);
  }
  let result = getoutput(rst,metadata)
 

  // for (const item of rst?.imglist?.filter(Boolean) || []) {
  //   let topath = getUniqueFilenameSync(metadata.imgdir, `${out_prefix_img}` + path.parse(metadata.imgdir).name, '')
  //   topath = path.join(metadata.imgdir, topath) + '.svg'
  //   fs.copyFileSync(item, topath)
  //   const rpath = encodeURI(path.relative(metadata.workdir, topath).replaceAll("\\", "/"))

  //   result += `![](${rpath})`
  // }

  return result
}