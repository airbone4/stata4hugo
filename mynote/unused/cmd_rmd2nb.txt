import * as vscode from 'vscode';
import { rmd2nb } from './rmd2nb.js';
import * as path from 'path';
import * as fs from 'fs';
import { confirmOverwriteFile, confirmDeleteImages } from './promptHelper.js';

import { getStataPath, parseIO } from './statatool/index.js'


type OverwriteBehavior = 'ask' | 'always' | 'never';


export async function cmd_rmd2nb(aPath: string):Promise<boolean> {

  const text = fs.readFileSync(aPath, 'utf8')
  const ext = path.extname(aPath).toLowerCase();
  if (!['.md', '.rmd', '.rmarkdown'].includes(ext)) {
    vscode.window.showWarningMessage('File does not have a .md or .rmd extension, stop.');
    return false
  }

  let originalProfile = ''
  const outPath = aPath.replace(/(\.r?md$|\.r?markdown$)/i, '') + '.ipynb';
  const workdir = path.dirname(outPath);
  const profilepath = path.join(workdir, 'profile.do')


  const ioenv = parseIO(aPath)


  try {
    //  // Find Stata executable

    const stataexe = getStataPath()
    if (stataexe !== "") {
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
    //如果ipynb已經存在
    if (fs.existsSync(outPath)) {
      const shouldOverwrite = await confirmOverwriteFile(outPath+' or .md');
      if (!shouldOverwrite) {
        vscode.window.showWarningMessage(`delete existing file ${outPath} first, and then do it again.`)
        return false;
      }
    }

    //這是rmarkdown 中所在的目錄


    if (fs.existsSync(profilepath)) {
      originalProfile = fs.readFileSync(profilepath, 'utf8');
      vscode.window.showWarningMessage(`Found an existing '${profilepath}'.\n${originalProfile || "empty content"}`);

    }

    const nb = await rmd2nb(text, ioenv);



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
  return true
}