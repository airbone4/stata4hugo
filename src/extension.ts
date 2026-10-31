import * as vscode from 'vscode';
import { convertMarkdownToIpynb } from './converter.js';
import { convertIpynbToMarkdown } from './ipynbToMd.js';
import * as path from 'path';
import * as fs from 'fs';



import * as knitr from './statatool/knitr.js';
import { find_stata } from './statatool/find_stata.js';

 

function removeExtension(filename:string) {
  return (
    filename.substring(0, filename.lastIndexOf('.')) || filename
  );
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
