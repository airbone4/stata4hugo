import * as vscode from 'vscode';
import { nb2md } from './nb2md.js';

import * as path from 'path';
import * as fs from 'fs';
import { out_prefix_img } from './statatool/index.js';
import { confirmOverwriteFile, confirmDeleteImages } from './promptHelper.js';


export async function cmd_nb2md(docPath,context:vscode.ExtensionContext)  {

  // 1. 優先儲存當前作用中的檔案
  await vscode.commands.executeCommand('workbench.action.files.save');

  // 2. 獲取目標檔案路徑 (依序嘗試：右鍵選單 URI -> 筆記本編輯器 -> 文字編輯器)
  //let docPath = uri?.fsPath;
  if (!docPath) {
    docPath = vscode.window.activeNotebookEditor?.notebook.uri.fsPath 
           || vscode.window.activeTextEditor?.document.fileName;
  }

  // 如果找不到任何有效的檔案路徑，直接結束
  if (!docPath) {
    vscode.window.showErrorMessage('無法取得有效的檔案路徑。');
    return;
  }

  // 3. 檢查副檔名 (不分大小寫)
  const parsedPath = path.parse(docPath);
  if (parsedPath.ext.toLowerCase() !== '.ipynb') {
    vscode.window.showErrorMessage('轉換失敗：所選檔案不是 .ipynb 檔案。');
    return;
  }

  // 4. 先行組出輸出的 Markdown 檔案路徑與資源資料夾路徑
  const outPath = path.format({
    dir: parsedPath.dir,
    name: parsedPath.name,
    ext: '.md'
  });

  const imgDir = path.join(parsedPath.dir, `${parsedPath.name}.files`);

  // 5. 檢查目標 Markdown 檔案是否已存在，並判斷使用者的全域設定


    

    const imgdirUri = vscode.Uri.file(imgDir);
    const pattern = new vscode.RelativePattern(
      imgdirUri,
      //'*/**/_*.{png,jpg,jpeg,gif,webp,svg,bmp,avif,PNG,JPG,JPEG,GIF,WEBP,SVG}'
      '_*.{png,jpg,jpeg,gif,webp,svg,bmp,avif,PNG,JPG,JPEG,GIF,WEBP,SVG}'
    );

    const imageUris = await vscode.workspace.findFiles(pattern);
    if (imageUris.length > 0) {
      const isdelete=await confirmDeleteImages(imageUris.length)
      if (isdelete) {
        for (const item of imageUris) {
          fs.unlinkSync(item.fsPath)
        }

      }
    }      
  /*
// dddd2  
  if (fs.existsSync(outPath)) {
    // 讀取全域狀態，預設值為 false（即：預設需要詢問）
    const skipPrompt =  context.globalState.get<boolean>('ipynb2md.skipOverwritePrompt', false);

    if (!skipPrompt) {
      const choice = await vscode.window.showWarningMessage(
        `檔案 ${parsedPath.name}.md 已經存在。您要覆蓋它嗎？`,
        { modal: true }, // 使用強制彈窗
        '覆蓋檔案',
        '總是覆蓋（不再詢問）',
        '取消'
      );

      // 如果點選「總是覆蓋」，將狀態改為 true，下次就不再跳出詢問
      if (choice === '總是覆蓋（不再詢問）') {
        await context.globalState.update('ipynb2md.skipOverwritePrompt', true);
      } 
      // 如果使用者點選取消，或是直接關閉彈窗，則停止執行
      else if (choice !== '覆蓋檔案') {
        return;
      }
    }
  }

  // 🔥 【新功能】檢查並刪除資源資料夾中以 `__` 開頭的舊檔案
  if (fs.existsSync(imgDir)) {
    try {
      const files = fs.readdirSync(imgDir);
      const prefixname=out_prefix_img+parsedPath.name
      files.forEach((file) => {
        // 判斷檔名是否以 __ 開頭
        if (file.startsWith(prefixname)) {
          const filePath = path.join(imgDir, file);
          // 確保只刪除檔案，避免誤刪子資料夾
          if (fs.statSync(filePath).isFile()) {
            fs.unlinkSync(filePath);
          }
        }
      });
    } catch (err: any) {
      // 讀取或刪除失敗時僅印出日誌，不阻斷主程式轉換
      console.error(`清理舊資源檔案失敗: ${err.message}`);
    }
  }
 */
  try {
    // 6. 讀取與解析原始的 JSON 內容
    const text = fs.readFileSync(docPath, 'utf8');
    const nb = JSON.parse(text);

    // 7. 執行核心轉換函數
    const md = nb2md(nb, imgDir);

    // 8. 寫入硬碟並跳出提示
    fs.writeFileSync(outPath, md, 'utf8');
    vscode.window.showInformationMessage(`Markdown 已成功寫入：${outPath}`);

  } catch (err: any) {
    vscode.window.showErrorMessage(`轉換失敗：${err.message || String(err)}`);
  }
};

 

/*
export async function cmd_nb2md(uri)  {
    
    const editor = vscode.window.activeTextEditor;
    const activeNotebookEditor = vscode.window.activeNotebookEditor;

    await vscode.commands.executeCommand('workbench.action.files.save')
    let doc: any = ''
    if (editor)
      doc = editor.document.fileName;
    else
      doc = uri ? uri.fsPath : activeNotebookEditor?.notebook.uri.fsPath;
    const ext = path.extname(doc).toLowerCase();
    if (ext !== '.ipynb') {
      vscode.window.showWarningMessage('File is not an .ipynb file.');
      return;
    }
    try {
      // Read raw file content from disk, not from the VS Code buffer
      //const text = fs.readFileSync(doc.fileName, 'utf8');
      const text = fs.readFileSync(doc, 'utf8');
      const nb = JSON.parse(text);
      

      const filesDir = path.join(path.parse(doc).dir, path.parse(doc).name + '.files');
      const md = nb2md(nb, filesDir);

      const outPath = doc.replace(/\.ipynb$/i, '') + '.md';
      fs.writeFileSync(outPath, md, 'utf8');
      vscode.window.showInformationMessage(`Markdown written to ${outPath}`);
    } catch (err: any) {
      vscode.window.showErrorMessage('Conversion failed: ' + (err.message || String(err)));
    }
  }

  */