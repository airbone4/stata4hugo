
import { convertMarkdownToIpynb } from '../src/converter';
import { convertIpynbToMarkdown } from '../src/ipynbToMd';
import * as path from 'path';
import * as fs from 'fs';
const { promisify } = require('util');
const knitr = require('../src/statatool/knitr');
const { find_stata } = require('../src/statatool/find_stata');

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const appendFile = promisify(fs.appendFile);
const unlink = promisify(fs.unlink);
const access = promisify(fs.access);

async function xx(){
    const doc = "./逐步幫手文件.Rmarkdown";
    const text = await readFile(doc,'utf8')
    console.log(text)
    const ext = path.extname(doc).toLowerCase();
    // if (!['.md', '.rmd', '.rmarkdown'].includes(ext)) {
      
    // }

    let originalProfile = ''
    try {
      //
      const outPath = doc.replace(/(\.r?md$|\.r?markdown$)/i, '') + '.ipynb';
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
          console.log(wmsg)
        }
      } else {
        console.log("No Stata executable found.");
      }
      //note3+1
      process.chdir(workdir)
      console.log(workdir)
      //note5

      if (fs.existsSync('profile.do')) {
        originalProfile = fs.readFileSync('profile.do', 'utf8');
        console.log(`Found an existing 'profile.do'\n${originalProfile}`);

      }


      const nb = await convertMarkdownToIpynb(text, workdir);



      fs.writeFileSync(outPath, JSON.stringify(nb, null, 2), 'utf8');
      console.log(`Notebook written to ${outPath}`);

    } catch (err: any) {
      console.log('Conversion failed: ' + (err.message || String(err)));
    } finally {

       await unlink('profile.do')
      if (originalProfile) {
        await writeFile('profile.do');
      }
    }
  
  } 

  xx()