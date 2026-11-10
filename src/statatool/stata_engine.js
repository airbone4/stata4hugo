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

  const aend = lines.findIndex(line => regex.test(line));
  lines = lines.slice(aend + 1)
  return lines.join('\n')
}

/**
 * Stata engine for processing code blocks
 * @param {Object} options - Configuration options (Plain Object)
 * @returns {Promise<Object>} - Engine output
 */
export async function stata_engine(options) {
  let imglist = []
  let doFile = options.savedo ?
    `${options.label}.do` :
    tempfile('stata', '.do');
  let logFile = doFile.replace(/\.do$/, '.log');

  let processedCode = options.code;
  const absoluteWorkDir = options.workdir;
  
  doFile = path.join(options.workdir, doFile);
  logFile = path.join(options.workdir, logFile);
  fs.writeFileSync(doFile, processedCode.join('\n'), { encoding: 'utf8' });

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

  const doFilePath = doFile;
  let command = `${cmdArgs} "${doFilePath}"`;

  if (options.engine_opts) {
    const engineOpts = typeof options.engine_opts === 'object' ?
      options.engine_opts[options.engine] :
      options.engine_opts;
    command = `${engineOpts} ${command} ${options.doargs || ''}`;
  }

  const enginePath = typeof options.engine_path === 'object' ?
    options.engine_path[options.engine] :
    options.engine_path;

  let output = '';

  if (options.eval !== false) {
    console.log(`running: ${enginePath} ${command}`);
    try {
      output = execSync(`"${enginePath}" ${command}`, {
        cwd: absoluteWorkDir,
        encoding: 'utf8'
      });
    } catch (error) {
      console.error('Stata 執行失敗:', error.message);
      throw error;
    }

    if (options.engine === 'stata' && fs.existsSync(logFile)) {
      let logContent = fs.readFileSync(logFile, 'utf8');
      logContent = logContent.replace(/\r\n|\r|\n/g, '\n')
      logContent = cutPre(logContent)
      
      let regex = /<<- post ->>/;
      let lines = logContent.split('\n')

      const aend = lines.findIndex(line => regex.test(line));
      let postrst = lines.slice(aend).join('\n')
      postrst = postrst.replace(/[\r]?\n>\s?/g, ''); 
      logContent = lines.slice(0, aend).join('\n')
      output = logContent + output;

      regex = /file\s+(.*?)\s+saved\s+as\s+SVG\s+format/gi;
      imglist = [...postrst.matchAll(regex)].map(match => match[1]);
    }
    
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

    return {
      code: options.code,
      imglist,
      output
    };
  }
}
