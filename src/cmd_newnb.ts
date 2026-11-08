import * as vscode from 'vscode';
import { rmd2nb } from './rmd2nb.js';
import { nb2md } from './nb2md.js';
import {newnb} from './newnb.js'
import * as path from 'path';
import * as fs from 'fs';


/**
 * 輔助函式：遞迴獲取目錄下的所有子資料夾（排除 node_modules 與 .git）
 */
function getAllFolders(dirPath: string, folderList: string[] = []): string[] {
    folderList.push(dirPath); // 加入當前資料夾
    
    const files = fs.readdirSync(dirPath);
    for (const file of files) {
        const fullPath = path.join(dirPath, file);
        
        // 排除常見的巨大或隱藏資料夾以提升效能
        if (file === 'node_modules' || file === '.git' || file === 'dist') {
            continue;
        }

        if (fs.statSync(fullPath).isDirectory()) {
            getAllFolders(fullPath, folderList);
        }
    }
    return folderList;
}
export async function cmd_newnb ()  {
        
        // 1. 檢查是否開啟工作區
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            vscode.window.showErrorMessage('請先在 VS Code 中開啟一個資料夾！');
            return;
        }
        const rootPath = workspaceFolders[0].uri.fsPath;

        // 2. 遞迴取得專案內所有子資料夾路徑
        let folders: string[] = [];
        try {
            folders = getAllFolders(rootPath);
        } catch (err) {
            vscode.window.showErrorMessage('讀取資料夾結構失敗。');
            return;
        }

        // 將絕對路徑轉為相對路徑，方便使用者閱讀
        const folderChoices = folders.map(f => {
            const relativePath = path.relative(rootPath, f);
            return relativePath === '' ? '/' : relativePath; // 根目錄顯示為 /
        });

        // 3. 讓使用者選擇子資料夾 (QuickPick)
        const selectedRelativeFolder = await vscode.window.showQuickPick(folderChoices, {
            placeHolder: '選擇要儲存檔案的資料夾',
            ignoreFocusOut: true // 防止使用者點擊別處時視窗直接消失
        });

        if (!selectedRelativeFolder) {
            vscode.window.showWarningMessage('已取消操作。');
            return;
        }

        // 還原為絕對路徑
        const targetTargetFolder = selectedRelativeFolder === '/' 
            ? rootPath 
            : path.join(rootPath, selectedRelativeFolder);

        // 1. 彈出輸入框讓使用者輸入檔名
        let fileName = await vscode.window.showInputBox({
            prompt: '請輸入要建立的檔案名稱 (不包含副檔名，例如: new.ipynb)',
            placeHolder: 'new.ipynb',
            validateInput: (text) => {
                // 基本驗證：防呆，檢查是否有輸入或是否包含不合法字元
                if (!text || text.trim() === '') {
                    return '檔名不能為空！';
                }
                if (/[\\/:*?"<>|]/.test(text)) {
                    return '檔名不能包含以下字元: \\ / : * ? " < > |';
                }
                return null; // 回傳 null 代表驗證通過
            }
        });

        // 如果使用者按下 Esc 或關閉輸入框，fileName 會是 undefined
        if (!fileName) {
            vscode.window.showWarningMessage('已取消建立檔案。');
            return;
        }
        if (path.extname(fileName).toLowerCase() !== '.ipynb') {
          fileName += '.ipynb';
        }        

        // 2. 取得目前 VS Code 開啟的工作區資料夾路徑
        //const workspaceFolders = vscode.workspace.workspaceFolders;
        // if (!workspaceFolders) {
        //     vscode.window.showErrorMessage('請先在 VS Code 中開啟一個資料夾！');
        //     return;
        // }
        
        //const rootPath = workspaceFolders[0].uri.fsPath;
        //const rootPath = targetTargetFolder
        const filePath = path.join(targetTargetFolder, fileName);

        try {
            // 3. 實際建立檔案並寫入預設內容
            //fs.writeFileSync(filePath, `<!-- Created via VS Code Extension -->\n`, 'utf8');
            newnb(targetTargetFolder,fileName)
            
            // 4. 成功提示，並自動在編輯器中開啟這個新檔案
            vscode.window.showInformationMessage(`檔案 ${fileName} 建立成功！`);
            const document = await vscode.workspace.openTextDocument(filePath);
            await vscode.window.showTextDocument(document);
            
        } catch (error: any) {
            vscode.window.showErrorMessage(`建立檔案失敗: ${error.message}`);
        }
    }