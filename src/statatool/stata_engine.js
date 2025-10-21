const fs = require('fs');
const path = require('path');
const os = require('os');
const { exec } = require('child_process');
const { promisify } = require('util');
const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);
const unlink = promisify(fs.unlink);

/**
 * Generate temporary file path
 * @param {string} pattern - Pattern for the temp file
 * @param {string} fileext - File extension
 * @returns {string} - Generated file path
 */
function tempfile(pattern, fileext) {
    return path.join(
        '.',
        `${pattern}_${Math.random().toString(36).substring(2)}${fileext}`
    );
}

/**
 * Stata engine for processing code blocks
 * @param {Object} options - Configuration options
 * @returns {Promise<Object>} - Engine output
 */
async function stata_engine(options) {
    // Handle file paths
    let doFile = options.savedo ? 
        `${options.label}.do` : 
        tempfile('stata', '.do');
    let logFile = doFile.replace(/\.do$/, '.log');
    
    // Process code based on eval options
    
    let processedCode = options.code;

    // Write code to file
    doFile=path.join(options.workdir, doFile);
    logFile=path.join(options.workdir, logFile);
    await writeFile(doFile, processedCode.join('\n'), { encoding: 'utf8' });

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
    const doFilePath = doFile
    
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
    if (!options.eval?.every(e => e === false)) {
        console.log(`running: ${enginePath} ${command}`);
        
        try {
            //not1: -1b +1
            const { stdout, stderr } = await promisify(exec)(
                `"${enginePath}" ${command}`,
                { env: options.engine_env }
            );
            // const { stdout, stderr } = await promisify(exec)(
            //     `"${enginePath}" ${command}` 
            // );            
            output = stdout + (stderr ? `\n${stderr}` : '');
        } catch (error) {
            if (!options.error) {
                throw error;
            }
            output = `Error in running command ${enginePath}`;
        }

        // Read log file if it exists
        if (options.engine === 'stata' && fs.existsSync(logFile)) {
            const logContent = await readFile(logFile, 'utf8');
            output = logContent + output;
        }
    }

    // Cleanup temporary files
    if (!options.savedo) {
        try {
            await unlink(doFile);
            if (fs.existsSync(logFile)) {
                await unlink(logFile);
            }
        } catch (error) {
            console.error('Error cleaning up temporary files:', error);
        }
    }

    // Return engine output
    return {
        code: options.code,
        output
    };
}

module.exports = { stata_engine };