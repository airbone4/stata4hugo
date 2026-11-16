import * as vscode from 'vscode';
import { rmd2nb } from './rmd2nb.js';
import * as path from 'path';
import * as fs from 'fs';
import { confirmOverwriteFile } from './promptHelper.js';
import { getStataPath, parseIO } from './statatool/index.js';

export async function cmd_rmd2nb(docInput?: string | vscode.Uri): Promise<boolean> {
  // 1. 相容 string 與 vscode.Uri，若無參數則抓當前開啟的檔案
  let aPath: string | undefined;
  if (typeof docInput === 'string') {
    aPath = docInput;
  } else if (docInput && typeof docInput === 'object' && 'fsPath' in docInput) {
    aPath = docInput.fsPath;
  } else {
    aPath = vscode.window.activeTextEditor?.document.fileName;
  }

  if (!aPath || !fs.existsSync(aPath)) {
    vscode.window.showErrorMessage('找不到有效的來源檔案路徑。');
    return false;
  }

  // 2. 先檢查副檔名，再讀取檔案內容
  const ext = path.extname(aPath).toLowerCase();
  if (!['.md', '.rmd', '.rmarkdown'].includes(ext)) {
    vscode.window.showWarningMessage('File does not have a .md or .rmd extension, stop.');
    return false;
  }

  const text = fs.readFileSync(aPath, 'utf8');
  const outPath = aPath.replace(/(\.r?md$|\.r?markdown$)/i, '') + '.ipynb';
  const workdir = path.dirname(outPath);
  const profilepath = path.join(workdir, 'profile.do');
  const ioenv = parseIO(aPath);

  let originalProfile = '';
  let profileBackedUp = false;

  try {
    // 3. 檢查 Stata 執行檔與環境
    const stataexe = getStataPath();
    if (stataexe !== '') {
      if (fs.existsSync(path.join(path.dirname(stataexe), 'sysprofile.do'))) {
        vscode.window.showWarningMessage("Found a 'sysprofile.do', will be executed first");
      }
      if (fs.existsSync(path.join(path.dirname(path.dirname(stataexe)), 'profile.do'))) {
        const wmsg =
          "Found a 'profile.do' in the STATA executable directory.\n" +
          "  This prevents 'collectcode' from working properly.\n" +
          "  Please rename this 'sysprofile.do'.";
        vscode.window.showWarningMessage(wmsg);
      }
    } else {
      vscode.window.showWarningMessage('No Stata executable found.');
    }

    // 4. 檢查目標 .ipynb 是否已存在
    if (fs.existsSync(outPath)) {
      const shouldOverwrite = await confirmOverwriteFile(path.basename(outPath));
      if (!shouldOverwrite) {
        vscode.window.showWarningMessage(`已取消覆蓋現有檔案：${outPath}`);
        return false;
      }
    }

    // 5. 備份工作目錄下既有的 profile.do（先備份再標記，確保 finally 安全）
    if (fs.existsSync(profilepath)) {
      originalProfile = fs.readFileSync(profilepath, 'utf8');
      vscode.window.showWarningMessage(
        `Found an existing '${profilepath}'.\n${originalProfile || 'empty content'}`
      );
    }
    profileBackedUp = true;

    // 6. 執行轉換並寫入檔案
    const nb = await rmd2nb(text, ioenv);
    fs.writeFileSync(outPath, JSON.stringify(nb, null, 2), 'utf8');
    vscode.window.showInformationMessage(`Notebook written to ${outPath}`);
    return true;
  } catch (err: any) {
    vscode.window.showErrorMessage('Conversion failed: ' + (err.message || String(err)));
    return false;
  } finally {
    // 只有在確定完成備份步驟後，才清理暫存並還原原有的 profile.do
    if (profileBackedUp && fs.existsSync(profilepath)) {
      fs.unlinkSync(profilepath);
      if (originalProfile) {
        fs.writeFileSync(profilepath, originalProfile, 'utf8');
      }
    }
  }
}
