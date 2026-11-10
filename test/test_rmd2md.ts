
import { rmd2nb } from '../src/rmd2nb.js';
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

       knitr.opts_chunk.set('engine_path', { stata: stataexe });
        knitr.opts_chunk.set('engine', "stata");
        knitr.opts_chunk.set('workdir', workdir);        

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
        console.log("No Stata executable found.xxx");
      }
       
      const profilepath= path.join(workdir,'profile.do')
      if (fs.existsSync(profilepath)) {
        originalProfile = fs.readFileSync(profilepath, 'utf8');
        console.log(`Found an existing 'profile.do'\n${originalProfile}`);

      }   


      const nb = await rmd2nb(text, workdir);
      

 

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
 