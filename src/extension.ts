import * as vscode from 'vscode';
import { convertMarkdownToIpynb } from './converter';
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
      const outPath = doc.fileName.replace(/\.r?md$/i, '') + '.ipynb';
      fs.writeFileSync(outPath, JSON.stringify(nb, null, 2), 'utf8');
      vscode.window.showInformationMessage(`Notebook written to ${outPath}`);
    } catch (err: any) {
      vscode.window.showErrorMessage('Conversion failed: ' + (err.message || String(err)));
    }
  });

  context.subscriptions.push(disposable);
}

export function deactivate() {}
