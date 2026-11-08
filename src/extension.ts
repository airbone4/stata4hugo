import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

import { rmd2nb } from './rmd2nb.js';
import { nb2md } from './nb2md.js';
import { cmd_rmd2nb } from './cmd_rmd2nb.js'
import { cmd_newnb } from './cmd_newnb.js'
import { cmd_nb2md } from './cmd_nb2md.js'
import { cmd_cleanmarkup } from './cmd_cleanmarkup.js';



//import * as knitr from './statatool/knitr.js';
//import { find_stata } from './statatool/find_stata.js';
import { knitr, find_stata } from './statatool/index.js';



function removeExtension(filename: string) {
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

  // 指令1: 轉 md/rmd to ipynb
  let disposable = vscode.commands.registerCommand('extension.rmd2ipynb', async(uri)=>{
    const targetUri = uri || vscode.window.activeTextEditor?.document.uri;
    if (!targetUri) {
      vscode.window.showErrorMessage('找不到可轉換的檔案！');
      return;
    }    
    await cmd_rmd2nb(targetUri.fsPath)
  });
  context.subscriptions.push(disposable);

  // 指令2: 轉 ipynb to md
  disposable = vscode.commands.registerCommand('extension.ipynb2md', async (uri) => {
    const targetUri = uri || vscode.window.activeTextEditor?.document.uri;
    if (!targetUri) {
      vscode.window.showErrorMessage('找不到可轉換的檔案！');
      return;
    }
    await cmd_nb2md(targetUri.fsPath, context)
  });
  context.subscriptions.push(disposable);


  // 指令3: Rmarkdown -> notebook->markdown , ctrl M+O
  disposable = vscode.commands.registerCommand('extension.rmd2md', async (uri) => {
    const targetUri = uri || vscode.window.activeTextEditor?.document.uri;
    if (!targetUri) {
      vscode.window.showErrorMessage('找不到可轉換的檔案！');
      return;
    }
    //await cmd_rmd2nb(targetUri)
    const nbpath = targetUri.fsPath.replace(/(\.r?md$|\.r?markdown$)/i, '') + '.ipynb';
    await cmd_rmd2nb(targetUri.fsPath)
    await cmd_nb2md(nbpath, context)
  });
  context.subscriptions.push(disposable);  

/*  
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
      vscode.window.showWarningMessage('File does not have a .rmd extension, stop‼️');
      return;
    }

    let outPath = doc.fileName.replace(/(\.r?md$|\.r?markdown$)/i, '') + '.ipynb';
    const workdir = path.dirname(outPath);
    const profilepath= path.join(workdir,'profile.do')
    let originalProfile = ''
    try {
  
      // Find Stata executable
      const stataexe = await find_stata();
      if (stataexe === '') {
        vscode.window.showWarningMessage("can't find stata ‼️");
        return;
      }


      knitr.opts_chunk.set('engine_path', { stata: stataexe });
      knitr.opts_chunk.set('engine', "stata");
      knitr.opts_chunk.set('workdir', workdir);

      if (fs.existsSync(path.join(path.dirname(stataexe), 'sysprofile.do'))) {
        console.log("Found a 'sysprofile.do'");
      }
      if (fs.existsSync(path.join(path.dirname(path.dirname(stataexe)), 'profile.do'))) {

        const wmsg = "Found a 'profile.do' in the STATA executable directory.\n" +
          "  This prevents 'collectcode' from working properly.\n" +
          "  Please rename this 'sysprofile.do'."
        vscode.window.showWarningMessage(wmsg)
      }

   
      
      if (fs.existsSync(profilepath)) {
        originalProfile = fs.readFileSync(profilepath, 'utf8');
        vscode.window.showWarningMessage(`Found an existing 'profile.do'\n${originalProfile}`);

      }

      //轉Ipynb
      const nb = await rmd2nb(text, workdir);
      fs.writeFileSync(outPath, JSON.stringify(nb, null, 2), 'utf8');
      vscode.window.showInformationMessage(`Notebook written to ${outPath}`);
      //轉MD
      const filesDir = path.join(path.parse(outPath).dir, `${path.parse(outPath).name}.files`);
      const md = nb2md(nb, filesDir)//path.parse(doc).name);
      outPath = outPath.replace(/\.ipynb$/i, '') + '.md';
      fs.writeFileSync(outPath, md, 'utf8');
      vscode.window.showInformationMessage(`Markdown written to ${outPath}`);




    } catch (err: any) {
      vscode.window.showErrorMessage('Conversion failed: ' + (err.message || String(err)));
    } finally {


    
      if (fs.existsSync(profilepath)) {
        fs.unlinkSync(profilepath)
        if (originalProfile) {
          fs.writeFileSync(profilepath, originalProfile)
          
        }
      }
    }
  });

  context.subscriptions.push(disposable3);
*/

  // 註冊指令，名稱要與 package.json 一致
  disposable = vscode.commands.registerCommand('extension.newnb', cmd_newnb);
  context.subscriptions.push(disposable);

  // 清潔段落
  disposable = vscode.commands.registerCommand('extension.cleanmarkup', cmd_cleanmarkup);
  context.subscriptions.push(disposable);
  //command: 重設取消詢問
  disposable = vscode.commands.registerCommand('extension.resetIpynb2mdSettings', async () => {
    // 將 globalState 的儲存值改回 false（或者設定為 undefined 來徹底移除該鍵值）
    await context.globalState.update('ipynb2md.skipOverwritePrompt', false);

    // 跳出成功提示
    vscode.window.showInformationMessage('已成功重設！下次轉換遇到重複檔案時，將會重新彈窗詢問。');
  });

  context.subscriptions.push(disposable);


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

      vscode.commands.executeCommand('python.interpreterPath', { workspaceFolder: "${cwd}" })
        .then(interpreterPath => {
          if (interpreterPath) {
            //console.log('Selected Python interpreter path:', interpreterPath);
            // Further actions based on the interpreter path
            const noextname: string = path.basename(doc).replace(/\.ipynb$/i, "")
            terminal.sendText(`${interpreterPath} -m jupyter nbconvert ${path.basename(doc)} --to markdown --NbConvertApp.output_files_dir="${noextname}.files" --TagRemovePreprocessor.remove_cell_tags="{'hide'}`)
          } else {
            console.log('No Python interpreter selected.');
          }
        });
    })
  );


}

export function deactivate() { }
