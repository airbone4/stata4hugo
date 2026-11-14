import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';


import { cmd_rmd2nb } from './cmd_rmd2nb.js'
import { cmd_newnb } from './cmd_newnb.js'
import { cmd_nb2md } from './cmd_nb2md.js'
import { cmd_cleanmarkup } from './cmd_cleanmarkup.js';
import { knitr, parseIO } from './statatool/index.js';
import { confirmOverwriteFile, confirmDeleteImages } from './promptHelper.js';





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
  let disposable = vscode.commands.registerCommand('hugoHelper.rmd2ipynb', async (uri) => {
    const targetUri = uri || vscode.window.activeTextEditor?.document.uri;
    if (!targetUri) {
      vscode.window.showErrorMessage('找不到可轉換的檔案！');
      return;
    }

    await cmd_rmd2nb(targetUri.fsPath)
  });
  context.subscriptions.push(disposable);

  // ==========  指令2: 轉 ipynb to md
  disposable = vscode.commands.registerCommand('hugoHelper.ipynb2md', async (uri) => {


    const targetUri =
      uri ||
      vscode.window.activeNotebookEditor?.notebook.uri ||
      vscode.window.activeTextEditor?.document.uri;
    if (!targetUri) {
      vscode.window.showErrorMessage('找不到可轉換的檔案！');
      return;
    }

    await cmd_nb2md(targetUri.fsPath, context)
  });
  context.subscriptions.push(disposable);


  //============= 指令3: Rmarkdown -> notebook->markdown , ctrl M+O==================
  disposable = vscode.commands.registerCommand('hugoHelper.rmd2md', async (uri) => {
    const targetUri = uri || vscode.window.activeTextEditor?.document.uri;
    if (!targetUri) {
      vscode.window.showErrorMessage('找不到可轉換的檔案！');
      return;
    }
    const ext = path.parse(targetUri.fsPath).ext.toLowerCase();
    if (!["rmarkdown", "rmd"].includes(ext)) {
      vscode.window.showErrorMessage(`not a Rmarkdown file:${targetUri.fsPath}`)
      return;
    }

    const nbpath = targetUri.fsPath.replace(/(\.r?md$|\.r?markdown$)/i, '') + '.ipynb';
    const ok = await cmd_rmd2nb(targetUri.fsPath)
    if (ok)
      await cmd_nb2md(nbpath, context)
    else
      vscode.window.showWarningMessage('to nodebook stop,no markdown generated')
  });
  context.subscriptions.push(disposable);

  //========== test ===========
  disposable = vscode.commands.registerCommand('hugoHelper.toMdbyKnit', async (uri) => {
    const targetUri = uri || vscode.window.activeTextEditor?.document.uri;
    if (!targetUri) {
      vscode.window.showErrorMessage('找不到可轉換的檔案！');
      return;
    }    

    const ext = path.parse(targetUri.fsPath).ext.toLowerCase();
    const outpath = path.posix.join(path.parse(targetUri.fsPath).dir, path.parse(targetUri.fsPath).name) + ".md"
    if (!["rmarkdown", "rmd"].includes(ext)) {
      vscode.window.showErrorMessage(`not a Rmarkdown file:${outpath}`)
      return;
    }

    if (fs.existsSync(outpath)) {
      const shouldOverwrite = await confirmOverwriteFile(outpath);
      if (!shouldOverwrite) {
        vscode.window.showWarningMessage(`delete existing file ${outpath} first, and then do it again.`)
        return false;
      }
    }
    const ioenv = parseIO(outpath)

    const imgdirUri = vscode.Uri.file(ioenv.imgdir);
    const pattern = new vscode.RelativePattern(
      imgdirUri,
      //'*/**/_*.{png,jpg,jpeg,gif,webp,svg,bmp,avif,PNG,JPG,JPEG,GIF,WEBP,SVG}'
      '_*.{png,jpg,jpeg,gif,webp,svg,bmp,avif,PNG,JPG,JPEG,GIF,WEBP,SVG}'
    );

    const imageUris = await vscode.workspace.findFiles(pattern);
    if (imageUris.length > 0) {
      const isdelete = await confirmDeleteImages(imageUris.length)
      if (isdelete) {
        for (const item of imageUris) {
          fs.unlinkSync(item.fsPath)
        }

      }
    }


    const resultMd = await knitr.knit(targetUri.fsPath);
    fs.writeFileSync(outpath, resultMd, 'utf8')
    //const ext = path.extname(aPath).toLowerCase();    
  });
  context.subscriptions.push(disposable);

  //=========== 建立新的notebook ===========
  disposable = vscode.commands.registerCommand('hugoHelper.newnb', cmd_newnb);
  context.subscriptions.push(disposable);
  //========== 重設取消詢問 ===========
  disposable = vscode.commands.registerCommand('hugoHelper.showSetting', async () => {
    await vscode.commands.executeCommand(
      'workbench.action.openSettings',
      '@ext:linchao.hugo-helper' // 格式為 @ext:<publisher>.<name>
    );

  });

  context.subscriptions.push(disposable);

  // ========== 清潔段落 ===========
  disposable = vscode.commands.registerCommand('hugoHelper.cleanmarkup', cmd_cleanmarkup);
  context.subscriptions.push(disposable);



  let previousTerminal: vscode.Terminal | null = null;
  context.subscriptions.push(
    vscode.commands.registerCommand('hugoHelper.ipynb2md_shell', (uri) => {
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
