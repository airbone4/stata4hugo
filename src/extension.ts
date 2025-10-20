import * as vscode from 'vscode';
import { convertMarkdownToIpynb } from './converter';
import { convertIpynbToMarkdown } from './ipynbToMd';
import * as path from 'path';
import * as fs from 'fs';
//const knitr = require('./statatool/knitr');
// const { find_stata } = require('./statatool/find_stata');
// const { StataMarkdown } = require('./statatool/misc');

// const { stata_engine } = require('./statatool/stata_engine');
// const { stataoutput } = require('./statatool/stataoutputhook');
const {doStata} = require('./statatool/dostata');

export async function activate(context: vscode.ExtensionContext) {
  // 指令1: 轉 md/rmd to ipynb, 同時必須在package.json 定義指令
  const disposable = vscode.commands.registerCommand('extension.convertToIpynb', async () => {
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

    try { 
      const nb = await convertMarkdownToIpynb(text);
      
      const outPath = doc.fileName.replace(/(\.r?md$|\.r?markdown$)/i, '') + '.ipynb';
      fs.writeFileSync(outPath, JSON.stringify(nb, null, 2), 'utf8');
      vscode.window.showInformationMessage(`Notebook written to ${outPath}`);
    } catch (err: any) {
      vscode.window.showErrorMessage('Conversion failed: ' + (err.message || String(err)));
    }
  });

  context.subscriptions.push(disposable);

  // 指令2: 轉 ipynb to md, 同時必須在package.json 定義指令
  const disposable2 = vscode.commands.registerCommand('extension.convertIpynbToMd', async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage('Open a .ipynb file first.');
      return;
    }
    const doc = editor.document;
    const ext = path.extname(doc.fileName).toLowerCase();
    if (ext !== '.ipynb') {
      vscode.window.showWarningMessage('File is not an .ipynb file, attempting conversion anyway.');
    }
    try {
      // Read raw file content from disk, not from the VS Code buffer
      const text = fs.readFileSync(doc.fileName, 'utf8');
      const nb = JSON.parse(text);
      const md = convertIpynbToMarkdown(nb);
      const outPath = doc.fileName.replace(/\.ipynb$/i, '') + '.md';
      fs.writeFileSync(outPath, md, 'utf8');
      vscode.window.showInformationMessage(`Markdown written to ${outPath}`);
    } catch (err: any) {
      vscode.window.showErrorMessage('Conversion failed: ' + (err.message || String(err)));
    }
  });
  context.subscriptions.push(disposable2);


// 指令3: 測試用的指令
  const disposable3 = vscode.commands.registerCommand('extension.hugotest', async () => {
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

    try { 
        
        const outPath = doc.fileName.replace(/(\.r?md$|\.r?markdown$)/i, '') + '.ipynb';
        const workdir=path.dirname(outPath);
        
        //note3+1
        process.chdir(workdir)
        const nb = await convertMarkdownToIpynb(text,workdir);
       fs.writeFileSync(outPath, JSON.stringify(nb, null, 2), 'utf8');
       vscode.window.showInformationMessage(`Notebook written to ${outPath}`);
    } catch (err: any) {
      vscode.window.showErrorMessage('Conversion failed: ' + (err.message || String(err)));
    }
  });

  context.subscriptions.push(disposable3);

}

export function deactivate() {}
