import * as assert from 'assert';
import * as path from 'path'
// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
import {testmd2nb} from './rmd2md.js'
// import * as myExtension from '../../extension';
import { fileURLToPath } from 'url';



suite('Extension Test Suite',  () => {

// 建立相容 ESM/CJS 的 __dirname 獲取方式
const currentFile = typeof __filename !== 'undefined' ? __filename : fileURLToPath(import.meta.url);
const currentDir = path.dirname(currentFile);
    
let workdir: string;

if (currentFile.endsWith('.ts')) {
  // 代表是用 npx tsx 執行 (傳回ts 所在目錄)，目前在 /test，要把路徑修正到 /out/test
  // 先回到根目錄，再進入 out/test
  workdir = path.resolve(currentDir, '../examples');
  
} else {
  // 代表是直接執行編譯後的 .js 檔案，目前本來就在 /out/test ,這是利用npm run test 的時候,會執行的部分
  workdir =  path.resolve(currentDir, '../../examples');;
  
}    
  
	  test('測試:RMD轉NB', async () => {
      
      //await testmd2nb(workdir,"逐步幫手文件.Rmarkdown")  //❌會超時,而且會執行主程式碼 利用npm run test1 代替
    

	  });
});
