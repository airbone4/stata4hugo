import * as vscode from 'vscode';
import { convertMarkdownToIpynb } from './converter.js';
import { convertIpynbToMarkdown } from './ipynbToMd.js';
import {newnb} from './newnb.js'
import * as path from 'path';
import * as fs from 'fs';



import * as knitr from './statatool/knitr.js';
import { find_stata } from './statatool/find_stata.js';

 

function removeExtension(filename:string) {
  return (
    filename.substring(0, filename.lastIndexOf('.')) || filename
  );
}

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

export async function activate(context: vscode.ExtensionContext) {
  // 指令1: 轉 md/rmd to ipynb, 同時必須在package.json 定義指令
  const disposable = vscode.commands.registerCommand('extension.rmd2ipynb', async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage('Open a Markdown or R Markdown file first.');
      return;
    }

    const doc = editor.document;
    const text = doc.getText();
    const ext = path.extname(doc.fileName).toLowerCase();
    if (!['.md', '.rmd', '.rmarkdown'].includes(ext)) {
      vscode.window.showWarningMessage('File does not have a .md or .rmd extension, attempting conversion anyway.');
    }

    let originalProfile = ''
    try {
      //
      const outPath = doc.fileName.replace(/(\.r?md$|\.r?markdown$)/i, '') + '.ipynb';
      const workdir = path.dirname(outPath);


      // Find Stata executable
      const stataexe = await find_stata();
      if (stataexe !== "") {
        knitr.opts_chunk.engine_path = { stata: stataexe };
        knitr.opts_chunk.engine = "stata";
        knitr.opts_chunk.workdir = workdir;

        if (fs.existsSync(path.join(path.dirname(stataexe), 'sysprofile.do'))) {
          //console.log("Found a 'sysprofile.do'");
          vscode.window.showWarningMessage("Found a 'sysprofile.do', will be executed first");
        }
        if (fs.existsSync(path.join(path.dirname(path.dirname(stataexe)), 'profile.do'))) {

          const wmsg = "Found a 'profile.do' in the STATA executable directory.\n" +
            "  This prevents 'collectcode' from working properly.\n" +
            "  Please rename this 'sysprofile.do'."
          vscode.window.showWarningMessage(wmsg)
        }
      } else {
        vscode.window.showWarningMessage("No Stata executable found.");
      }
      //note3+1
      process.chdir(workdir)
      //note5

      if (fs.existsSync('profile.do')) {
        originalProfile = fs.readFileSync('profile.do', 'utf8');
        vscode.window.showWarningMessage(`Found an existing 'profile.do'\n${originalProfile}`);

      }


      const nb = await convertMarkdownToIpynb(text, workdir);



      fs.writeFileSync(outPath, JSON.stringify(nb, null, 2), 'utf8');
      vscode.window.showInformationMessage(`Notebook written to ${outPath}`);

    } catch (err: any) {
      vscode.window.showErrorMessage('Conversion failed: ' + (err.message || String(err)));
    } finally {

      //await unlink('profile.do')
      fs.unlinkSync('profile.do')
      if (originalProfile) {
        fs.writeFileSync('profile.do',originalProfile)
        //await writeFile('profile.do');
      }
    }
  });

  context.subscriptions.push(disposable);

  // 指令2: 轉 ipynb to md, 同時必須在package.json 定義指令
  const disposable2 = vscode.commands.registerCommand('extension.ipynb2md', async (uri) => {
    const editor = vscode.window.activeTextEditor;
    const activeNotebookEditor = vscode.window.activeNotebookEditor;

    let doc: any = ''
    if (editor)
      doc = editor.document.fileName;
    else
      doc = uri ? uri.fsPath : activeNotebookEditor?.notebook.uri.fsPath;
    const ext = path.extname(doc).toLowerCase();
    if (ext !== '.ipynb') {
      vscode.window.showWarningMessage('File is not an .ipynb file, attempting conversion anyway.');
      return;
    }
    try {
      // Read raw file content from disk, not from the VS Code buffer
      //const text = fs.readFileSync(doc.fileName, 'utf8');
      const text = fs.readFileSync(doc, 'utf8');
      const nb = JSON.parse(text);
      const md = convertIpynbToMarkdown(nb,path.parse(doc).dir+'\\'+path.parse(doc).name+'.files');
      const outPath = doc.replace(/\.ipynb$/i, '') + '.md';
      fs.writeFileSync(outPath, md, 'utf8');
      vscode.window.showInformationMessage(`Markdown written to ${outPath}`);
    } catch (err: any) {
      vscode.window.showErrorMessage('Conversion failed: ' + (err.message || String(err)));
    }
  });
  context.subscriptions.push(disposable2);


  // 指令3: 測試用的指令
  const disposable3 = vscode.commands.registerCommand('extension.rmd2md', async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage('Open a Markdown or R Markdown file first.');
      return;
    }

    const doc = editor.document;
    const text = doc.getText();
    const ext = path.extname(doc.fileName).toLowerCase();
    if (!['.rmd', '.rmarkdown'].includes(ext)) {
      vscode.window.showWarningMessage('File does not have a .rmd extension, attempting conversion anyway.');
    }

    let originalProfile = ''
    try {
      //
      let outPath = doc.fileName.replace(/(\.r?md$|\.r?markdown$)/i, '') + '.ipynb';
      const workdir = path.dirname(outPath);


      // Find Stata executable
      const stataexe = await find_stata();
      if (stataexe !== "") {
        knitr.opts_chunk.engine_path = { stata: stataexe };
        knitr.opts_chunk.engine = "stata";
        knitr.opts_chunk.workdir = workdir;

        if (fs.existsSync(path.join(path.dirname(stataexe), 'sysprofile.do'))) {
          console.log("Found a 'sysprofile.do'");
        }
        if (fs.existsSync(path.join(path.dirname(path.dirname(stataexe)), 'profile.do'))) {

          const wmsg = "Found a 'profile.do' in the STATA executable directory.\n" +
            "  This prevents 'collectcode' from working properly.\n" +
            "  Please rename this 'sysprofile.do'."
          vscode.window.showWarningMessage(wmsg)
        }
      } else {
        console.log("No Stata executable found.");
      }
      //note3+1
      process.chdir(workdir)
      //note5

      if (fs.existsSync('profile.do')) {
        originalProfile = fs.readFileSync('profile.do', 'utf8');
        vscode.window.showWarningMessage(`Found an existing 'profile.do'\n${originalProfile}`);

      }

      //轉Ipynb
      const nb = await convertMarkdownToIpynb(text, workdir);      
      fs.writeFileSync(outPath, JSON.stringify(nb, null, 2), 'utf8');
      vscode.window.showInformationMessage(`Notebook written to ${outPath}`);      
      //轉MD
      const md = convertIpynbToMarkdown(nb,'xx')//path.parse(doc).name);
      outPath = outPath.replace(/\.ipynb$/i, '') + '.md';
      fs.writeFileSync(outPath, md, 'utf8');
      vscode.window.showInformationMessage(`Markdown written to ${outPath}`);




    } catch (err: any) {
      vscode.window.showErrorMessage('Conversion failed: ' + (err.message || String(err)));
    } finally {


      //await unlink('profile.do')
      fs.unlinkSync('profile.do')
      if (originalProfile) {
        fs.writeFileSync('profile.do',originalProfile)
        //await writeFile('profile.do');
      }
    }
  });

  context.subscriptions.push(disposable3);


    // 註冊指令，名稱要與 package.json 一致
    let disposable4 = vscode.commands.registerCommand('extension.newnb', async () => {
        
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
    });
    context.subscriptions.push(disposable4);

  let previousTerminal: vscode.Terminal | null = null;
	context.subscriptions.push(
		vscode.commands.registerCommand('extension.ipynb2md_shell', (uri) => {
   const editor = vscode.window.activeTextEditor;
    const activeNotebookEditor = vscode.window.activeNotebookEditor;

    let doc: any = ''
    if (editor)
      doc = editor.document.fileName;
    else
      doc = uri ? uri.fsPath : activeNotebookEditor?.notebook.uri.fsPath;


			let cwd = path.dirname(doc);

			let fileName = path.basename(doc);
			const terminal = vscode.window.createTerminal({ cwd: cwd });
			terminal.show();

			if (previousTerminal) {
				previousTerminal.dispose();
				previousTerminal = null;
			}
			previousTerminal = terminal;    
      
      vscode.commands.executeCommand('python.interpreterPath', { workspaceFolder: "${cwd}"	 })
    .then(interpreterPath => {
        if (interpreterPath) {
            //console.log('Selected Python interpreter path:', interpreterPath);
            // Further actions based on the interpreter path
            const noextname:string = path.basename(doc).replace(/\.ipynb$/i,"")
            terminal.sendText(`${interpreterPath} -m jupyter nbconvert ${path.basename(doc)} --to markdown --NbConvertApp.output_files_dir="${noextname}.files" --TagRemovePreprocessor.remove_cell_tags="{'hide'}`)
        } else {
            console.log('No Python interpreter selected.');
        }
    });
		})
	);


}

export function deactivate() { }
