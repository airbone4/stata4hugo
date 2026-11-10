import fs from 'fs';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';


function tempfile(pattern, fileext) {
  return path.join(
    '.',
    `${pattern}_${Math.random().toString(36).substring(2)}${fileext}`
  );
}
function cutPre(atxt) {
  let lines = atxt.split('\n')
  const regex = /<<- pre ->>/;

  // 尋找第一個符合正規表達式的「行索引」
  const aend = lines.findIndex(line => regex.test(line));
  lines = lines.slice(aend + 1)
  return lines.join('\n')
}

/**
 * Stata engine for processing code blocks
 * @param {Object} options - Configuration options
 * @returns {Promise<Object>} - Engine output
 */
export async function stata_engine(options) {
  // Handle file paths
  let imglist = []
  let doFile = options.savedo ?
    `${options.label}.do` :
    tempfile('stata', '.do');
  let logFile = doFile.replace(/\.do$/, '.log');

  // Process code based on eval options

  let processedCode = options.code;
  const absoluteWorkDir = options.workdir;
  // Write code to file
  doFile = path.join(options.workdir, doFile);
  logFile = path.join(options.workdir, logFile);
  fs.writeFileSync(doFile, processedCode.join('\n'), { encoding: 'utf8' });

  // Build command based on OS
  const platform = process.platform;
  let cmdArgs;
  switch (platform) {
    case 'win32':
      cmdArgs = '/q /e do';
      break;
    case 'darwin':
      cmdArgs = '-q -e do';
      break;
    default:
      cmdArgs = '-q -b do';
  }

  //note1: -1, +1
  //const doFilePath = path.normalize(doFile);
  const doFilePath = doFile;

  let command = `${cmdArgs} "${doFilePath}"`;

  //todo: 這都不要
  // Add engine options if present
  if (options.engine_opts) {
    const engineOpts = typeof options.engine_opts === 'object' ?
      options.engine_opts[options.engine] :
      options.engine_opts;
    command = `${engineOpts} ${command} ${options.doargs || ''}`;
  }

  // Get engine path
  const enginePath = typeof options.engine_path === 'object' ?
    options.engine_path[options.engine] :
    options.engine_path;

  let output = '';

  // Execute command if eval is not false 不要執行的話就是eval=F
  //如果options.eval不確定是陣列
  // const shouldEval = Array.isArray(options.eval) 
  // ? !options.eval.every(e => e === false) 
  // : options.eval !== false; // 如果是 true 或 undefined(預設) 都算 true

  //if (!options.eval?.every(e => e === false)) {
  if (options.eval !== false) {
    console.log(`running: ${enginePath} ${command}`);
    try {
      // 執行你的 execSync 邏輯...
      output = execSync(`"${enginePath}" ${command}`, {
        cwd: absoluteWorkDir,
        encoding: 'utf8'
      });
    } catch (error) {
      console.error('Stata 執行失敗:', error.message);
      throw error;
    }


    // Read log file if it exists
    if (options.engine === 'stata' && fs.existsSync(logFile)) {
      let logContent = fs.readFileSync(logFile, 'utf8');
      logContent = logContent.replace(/\r\n|\r|\n/g, '\n')
      //修剪predo
      //let aend = logContent.indexOf('//<<- pre ->>')
      //logContent = logContent.slice(aend+1)
      logContent = cutPre(logContent)
      //修剪postdo
      let regex = /<<- post ->>/;
      let lines = logContent.split('\n')

      const aend = lines.findIndex(line => regex.test(line));
      //aend = logContent.indexOf('//<<- post ->>')
      let postrst = lines.slice(aend).join('\n')
      postrst = postrst.replace(/[\r]?\n>\s?/g, ''); //把STATA的段行,取代成為一行,就是太長,第二行有>開頭
      logContent = lines.slice(0, aend).join('\n')
      output = logContent + output;


      regex = /file\s+(.*?)\s+saved\s+as\s+SVG\s+format/gi;

      // 使用 matchAll 提取捕獲群組內的內容 (match[1])
      imglist = [...postrst.matchAll(regex)].map(match => match[1]);
      // if (imglist.length >= 2) {
      //   imglist = imglist.slice(0)
      // }
      // else {
      //   imglist = []

      // }
    }
    // Cleanup temporary files
    if (!options.savedo) {
      try {
        fs.unlinkSync(doFile);
        if (fs.existsSync(logFile)) {
          fs.unlinkSync(logFile);
        }
      } catch (error) {
        console.error('Error cleaning up temporary files:', error);
      }
    }

    // Return engine output
    return {
      code: options.code,
      imglist,
      output
    };
  }
}