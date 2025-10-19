import * as vscode from 'vscode';
import { convertMarkdownToIpynb } from './converter';
import { convertIpynbToMarkdown } from './ipynbToMd';
import * as path from 'path';
import * as fs from 'fs';

export function activate(context: vscode.ExtensionContext) {
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
      const nb = convertMarkdownToIpynb(text);
      
      const outPath = doc.fileName.replace(/(\.r?md$|\.r?markdown$)/i, '') + '.ipynb';
      fs.writeFileSync(outPath, JSON.stringify(nb, null, 2), 'utf8');
      vscode.window.showInformationMessage(`Notebook written to ${outPath}`);
    } catch (err: any) {
      vscode.window.showErrorMessage('Conversion failed: ' + (err.message || String(err)));
    }
  });

  context.subscriptions.push(disposable);

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
}

export function deactivate() {}
