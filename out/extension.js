"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
const vscode = __importStar(require("vscode"));
const converter_1 = require("./converter");
const ipynbToMd_1 = require("./ipynbToMd");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
function activate(context) {
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
            const nb = (0, converter_1.convertMarkdownToIpynb)(text);
            const outPath = doc.fileName.replace(/(\.r?md$|\.r?markdown$)/i, '') + '.ipynb';
            fs.writeFileSync(outPath, JSON.stringify(nb, null, 2), 'utf8');
            vscode.window.showInformationMessage(`Notebook written to ${outPath}`);
        }
        catch (err) {
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
            const md = (0, ipynbToMd_1.convertIpynbToMarkdown)(nb);
            const outPath = doc.fileName.replace(/\.ipynb$/i, '') + '.md';
            fs.writeFileSync(outPath, md, 'utf8');
            vscode.window.showInformationMessage(`Markdown written to ${outPath}`);
        }
        catch (err) {
            vscode.window.showErrorMessage('Conversion failed: ' + (err.message || String(err)));
        }
    });
    context.subscriptions.push(disposable2);
}
exports.activate = activate;
function deactivate() { }
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map