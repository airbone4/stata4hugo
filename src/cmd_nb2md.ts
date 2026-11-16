import * as vscode from 'vscode';
import { nb2md } from './nb2md.js';
import * as path from 'path';
import * as fs from 'fs';
import { confirmOverwriteFile, confirmDeleteImages } from './promptHelper.js';

export async function cmd_nb2md(docInput?: string | vscode.Uri, context?: vscode.ExtensionContext) {
  // 1. 優先儲存當前作用中的檔案
  await vscode.commands.executeCommand('workbench.action.files.save');

  // 2. 相容 string 與 vscode.Uri 兩種參數型別
  let docPath: string | undefined;
  if (typeof docInput === 'string') {
    docPath = docInput;
  } else if (docInput && typeof docInput === 'object' && 'fsPath' in docInput) {
    docPath = docInput.fsPath;
  }

  if (!docPath) {
    docPath =
      vscode.window.activeNotebookEditor?.notebook.uri.fsPath ||
      vscode.window.activeTextEditor?.document.fileName;
  }

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

  // 4. 組合輸出的 Markdown 檔案路徑與資源資料夾路徑
  const outPath = path.format({
    dir: parsedPath.dir,
    name: parsedPath.name,
    ext: '.md'
  });

  const imgDir = path.join(parsedPath.dir, `${parsedPath.name}.files`);

  // 5. 檢查目標 Markdown 檔案是否已存在
  if (fs.existsSync(outPath)) {
    const shouldOverwrite = await confirmOverwriteFile(`${parsedPath.name}.md`);
    if (!shouldOverwrite) {
      vscode.window.showWarningMessage(`已取消覆蓋：${parsedPath.name}.md`);
      return;
    }
  }

  // 6. 檢查並詢問是否刪除舊的 _ 開頭圖片
  if (fs.existsSync(imgDir)) {
    const imgdirUri = vscode.Uri.file(imgDir);
    const pattern = new vscode.RelativePattern(
      imgdirUri,
      '_*.{png,jpg,jpeg,gif,webp,svg,bmp,avif,PNG,JPG,JPEG,GIF,WEBP,SVG}'
    );

    const imageUris = await vscode.workspace.findFiles(pattern);
    if (imageUris.length > 0) {
      const isDelete = await confirmDeleteImages(imageUris.length);
      if (isDelete) {
        for (const item of imageUris) {
          fs.unlinkSync(item.fsPath);
        }
      }
    }
  }

  try {
    // 7. 讀取與解析原始的 JSON 內容
    const text = fs.readFileSync(docPath, 'utf8');
    const nb = JSON.parse(text);

    // 8. 執行核心轉換函數
    const md = nb2md(nb, imgDir);

    // 9. 寫入硬碟並跳出提示
    fs.writeFileSync(outPath, md, 'utf8');
    vscode.window.showInformationMessage(`Markdown 已成功寫入：${outPath}`);
  } catch (err: any) {
    vscode.window.showErrorMessage(`轉換失敗：${err.message || String(err)}`);
  }
}
