import * as vscode from 'vscode';
import { convertMarkdownToIpynb } from './converter.js';
import { convertIpynbToMarkdown } from './ipynbToMd.js';
import * as path from 'path';
import * as fs from 'fs';

import * as knitr from './statatool/knitr.js';
import { find_stata } from './statatool/find_stata.js';


export async function cmd_rmd2ipynb ()  {
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
      //這是rmarkdown 中所在的目錄
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

       
      fs.unlinkSync('profile.do')
      if (originalProfile) {
        fs.writeFileSync('profile.do',originalProfile)
        
      }
    }
  }