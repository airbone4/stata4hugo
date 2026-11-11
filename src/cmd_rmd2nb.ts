import * as vscode from 'vscode';
import { rmd2nb } from './rmd2nb.js';
import * as path from 'path';
import * as fs from 'fs';


import {getStataPath } from './statatool/index.js'
import { profile } from 'console';


export async function cmd_rmd2nb (aPath:string)  {
    // const editor = vscode.window.activeTextEditor;
    // if (!editor) {
    //   vscode.window.showErrorMessage('Open a Markdown or R Markdown file first.');
    //   return;
    // }

    // const doc = editor.document;
    // const text = doc.getText();
    //const ext = path.extname(doc.fileName).toLowerCase();
    const text=fs.readFileSync(aPath,'utf8')
    const ext = path.extname(aPath).toLowerCase();
    if (!['.md', '.rmd', '.rmarkdown'].includes(ext)) {
      vscode.window.showWarningMessage('File does not have a .md or .rmd extension, stop.');
      return
    }

    let originalProfile = ''
      const outPath = aPath.replace(/(\.r?md$|\.r?markdown$)/i, '') + '.ipynb';
      const workdir = path.dirname(outPath);
      const profilepath= path.join(workdir,'profile.do')
    try {
      //  // Find Stata executable
      // const stataexe = await find_stata();
      // if (stataexe !== "") {
     
      //   knitr.opts_chunk.set('engine_path' , { stata: stataexe });
      //   knitr.opts_chunk.set('engine' , "stata");
      //   knitr.opts_chunk.set('workdir' , workdir);

      //   if (fs.existsSync(path.join(path.dirname(stataexe), 'sysprofile.do'))) {
      //     //console.log("Found a 'sysprofile.do'");
      //     vscode.window.showWarningMessage("Found a 'sysprofile.do', will be executed first");
      //   }
      //   if (fs.existsSync(path.join(path.dirname(path.dirname(stataexe)), 'profile.do'))) {

      //     const wmsg = "Found a 'profile.do' in the STATA executable directory.\n" +
      //       "  This prevents 'collectcode' from working properly.\n" +
      //       "  Please rename this 'sysprofile.do'."
      //     vscode.window.showWarningMessage(wmsg)
      //   }
      // } else {
      //   vscode.window.showWarningMessage("No Stata executable found.");
      // }
        const stataexe=getStataPath()
      if(stataexe!=="")  {
        if (fs.existsSync(path.join(path.dirname(stataexe), 'sysprofile.do'))) {
          
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



      //這是rmarkdown 中所在的目錄

      
      if (fs.existsSync(profilepath)) {
        originalProfile = fs.readFileSync(profilepath, 'utf8');
        vscode.window.showWarningMessage(`Found an existing '${profilepath}'.\n${originalProfile||"empty content"}`);

      }      
//dddd1
let p={workdir:`${workdir}`, 
       imgdir:`${path.join(path.parse(outPath).dir,path.parse(outPath).name+'.files')}`};
      const nb = await rmd2nb(text,  p);



      fs.writeFileSync(outPath, JSON.stringify(nb, null, 2), 'utf8');
      vscode.window.showInformationMessage(`Notebook written to ${outPath}`);

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
  }