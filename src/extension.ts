import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';


import { cmd_rmd2nb } from './cmd_rmd2nb.js'
import { cmd_newnb } from './cmd_newnb.js'
import { cmd_nb2md } from './cmd_nb2md.js'
import { cmd_cleanmarkup } from './cmd_cleanmarkup.js';
import { knitr, parseIO } from './statatool/index.js';
import { confirmOverwriteFile, confirmDeleteImages } from './promptHelper.js';
import * as runner from './embedrunner.js'


 

 const BORDER_COLOR = 'rgba(35, 114, 251, 0.5)'; // 框線顏色，可依喜好調整
// const BG_COLOR = 'hsla(0, 28%, 80%, 0.03)';     // 背景底色

//const BORDER_COLOR = new vscode.ThemeColor('editorWidget.border');
const BG_COLOR = new vscode.ThemeColor('textCodeBlock.background');
// 利用 textDecoration 注入 CSS 寬度，讓右側留出 20px 空間避開捲軸
const BOX_WIDTH_CSS = 'none; width: calc(100% - 20px); box-sizing: border-box;';


// 1. 頂部行樣式（上、左、右有框線）
const topDecorationType = vscode.window.createTextEditorDecorationType({
    isWholeLine: true,
    borderStyle: 'solid',
    borderWidth: '2px 2px 0px 2px',
    borderColor: BORDER_COLOR,
    backgroundColor: BG_COLOR,
    borderRadius: '4px 4px 0 0',
    //textDecoration: BOX_WIDTH_CSS
});

// 2. 中間行樣式（僅左、右有框線）
const middleDecorationType = vscode.window.createTextEditorDecorationType({
    isWholeLine: true,
    borderStyle: 'solid',
    borderWidth: '0 2px 0 2px',
    borderColor: BORDER_COLOR,
    backgroundColor: BG_COLOR,
    //textDecoration: BOX_WIDTH_CSS
});

// 3. 底部行樣式（下、左、右有框線）
const bottomDecorationType = vscode.window.createTextEditorDecorationType({
    isWholeLine: true,
    borderStyle: 'solid',
    borderWidth: '0 2px 2px 2px',
    borderColor: BORDER_COLOR,
    backgroundColor: BG_COLOR,
    borderRadius: '0 0 4px 4px',
    //textDecoration: BOX_WIDTH_CSS
    
});

// 4. 單行區塊備用樣式（若區塊只有一行的情況）
const singleLineDecorationType = vscode.window.createTextEditorDecorationType({
    isWholeLine: true,
    borderStyle: 'solid',
    borderWidth: '1px',
    borderColor: BORDER_COLOR,
    backgroundColor: BG_COLOR,
    borderRadius: '4px',
    //textDecoration: BOX_WIDTH_CSS
});


export async function activate(context: vscode.ExtensionContext) {

    // 註冊四組樣式資源以便停用時釋放
    context.subscriptions.push(
        topDecorationType,
        middleDecorationType,
        bottomDecorationType,
        singleLineDecorationType
    );

    function updateDecorations(editor: vscode.TextEditor | undefined) {
        if (!editor || !['markdown', 'rmarkdown'].includes(editor.document.languageId)) {
            return;
        }

        const text = editor.document.getText();
        const topRanges: vscode.Range[] = [];
        const middleRanges: vscode.Range[] = [];
        const bottomRanges: vscode.Range[] = [];
        const singleRanges: vscode.Range[] = [];

        //const regex = /```(\{stata\([^\r\n]*\))\(\r?\n([\s\S]*?)\r\)?\n?```/gm;
        const regex = /```(\{stata[^\r\n]*)\r?\n([\s\S]*?)\r?\n?```/gm
        let match;

        while ((match = regex.exec(text)) !== null) {
            const startLine = editor.document.positionAt(match.index).line;
            const endLine = editor.document.positionAt(match.index + match[0].length).line;

            if (startLine === endLine) {
                singleRanges.push(new vscode.Range(startLine, 0, startLine, 0));
                
            } else {
                // 頂部行
                topRanges.push(new vscode.Range(startLine, 0, startLine, 0));
                // 底部行
                bottomRanges.push(new vscode.Range(endLine, 0, endLine, 0));
                // 中間所有行（若有內容行）
                if (endLine - startLine > 1) {
                    middleRanges.push(new vscode.Range(startLine + 1, 0, endLine - 1, 0));
                }
            }
        }

        // 分別套用四組裝飾
        editor.setDecorations(topDecorationType, topRanges);
        editor.setDecorations(middleDecorationType, middleRanges);
        editor.setDecorations(bottomDecorationType, bottomRanges);
        editor.setDecorations(singleLineDecorationType, singleRanges);
    }

    // 註冊監聽器（維持原本寫法）
    if (vscode.window.activeTextEditor) {
        updateDecorations(vscode.window.activeTextEditor);
    }

    context.subscriptions.push(
        vscode.window.onDidChangeActiveTextEditor((editor) => {
            updateDecorations(editor);
        }),
        vscode.workspace.onDidChangeTextDocument((event) => {
            const activeEditor = vscode.window.activeTextEditor;
            if (activeEditor && event.document === activeEditor.document) {
                updateDecorations(activeEditor);
            }
        })
    );

//===================================================================
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
    if (![".rmarkdown", ".rmd"].includes(ext.toLowerCase())) {
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

  //========== Rmarkdown -> md by knit ===========
  disposable = vscode.commands.registerCommand('hugoHelper.toMdbyKnit', async (uri) => {
    const targetUri = uri || vscode.window.activeTextEditor?.document.uri;
    if (!targetUri) {
      vscode.window.showErrorMessage('找不到可轉換的檔案！');
      return;
    }    

    const ext = path.parse(targetUri.fsPath).ext.toLowerCase();
    const outpath = path.posix.join(path.parse(targetUri.fsPath).dir, path.parse(targetUri.fsPath).name) + ".md"
    if (![".rmarkdown", ".rmd"].includes(ext.toLowerCase())) {
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


  //======== by jupyter
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
//=========== stata runner in markdown ==================
    // 1. 註冊 CodeLens 提供者
    const codeLensProvider = new runner.stataCodeLensProvider();

    context.subscriptions.push(
        vscode.languages.registerCodeLensProvider({ language: 'markdown' }, codeLensProvider)
    );

    // 2. 註冊「執行」指令
    const runCommand = vscode.commands.registerCommand(
        'hugoHelper.runCodeBlock',
        async (document: vscode.TextDocument, rawinfo:string, codeContent: string, endLine: number) => {
            await runner.executeAndInsertResult(document, rawinfo,codeContent, endLine);
        }
    );

    // 3. 註冊「清除結果」指令
    const clearCommand = vscode.commands.registerCommand(
        'hugoHelper.clearOutput',
        async (document: vscode.TextDocument, endLine: number) => {
            await runner.clearOutputResult(document, endLine);
        }
    );
    // 4. 註冊「清除所有執行結果」指令
    const clearAllCommand = vscode.commands.registerCommand(
        'hugoHelper.clearAllOutputs',
        async () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor || editor.document.languageId !== 'markdown') {
                vscode.window.showWarningMessage('請先開啟一個 Markdown 檔案。');
                return;
            }
            await runner.clearAllOutputsInDocument(editor.document);
        }
    );
    context.subscriptions.push(runCommand, clearCommand);  


}

export function deactivate() { }
