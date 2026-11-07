
import { rmd2md } from '../src/rmd2md.js';
import { nb2md } from '../src/nb2md.js';
import * as path from 'path';
import * as fs from 'fs';


import * as knitr from '../src/statatool/knitr.js'
import {find_stata } from '../src/statatool/find_stata.js'


export async function testmd2nb(workdir,doc){
    

  

    //const doc = "逐步幫手文件.Rmarkdown"
    const text = fs.readFileSync(path.join(workdir,doc),'utf8')
 
    const ext = path.extname(doc).toLowerCase();
    // if (!['.md', '.rmd', '.rmarkdown'].includes(ext)) {
      
    // }

    let originalProfile = ''
    try {
      //
      const outPath = doc.replace(/(\.r?md$|\.r?markdown$)/i, '') + '.ipynb';
      //const workdir = path.dirname(outPath);


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
          console.log(wmsg)
        }
      } else {
        console.log("No Stata executable found.");
      }
      //note3+1
      process.chdir(workdir)
      console.log('切換'+workdir)
      //note5

      if (fs.existsSync('profile.do')) {
        originalProfile = fs.readFileSync('profile.do', 'utf8');
        console.log(`Found an existing 'profile.do'\n${originalProfile}`);

      }


      const nb = await rmd2md(text, workdir);
      

 

      fs.writeFileSync(outPath, JSON.stringify(nb, null, 2), 'utf8');
      console.log(`Notebook written to ${outPath}`);

    } catch (err: any) {
      console.log('Conversion failed: ' + (err.message || String(err)));
    } finally {

      fs.unlinkSync('profile.do')
      if (originalProfile) {
        fs.writeFileSync('profile.do',originalProfile);
      }
    }
  
  } 
// 讀入逐步幫手文件.Rmarkdown -> ipynb
    const __dirname = import.meta.dirname;  //本程式所在位置
    let workdir=path.resolve(__dirname,'../examples')   
  //testmd2nb(workdir,"逐步幫手文件.Rmarkdown")
  //testmd2nb(workdir,"example1.Rmd")
  //testmd2nb(workdir,"test-all-features.Rmd")
  testmd2nb(workdir,"nestcode.rmd")
 