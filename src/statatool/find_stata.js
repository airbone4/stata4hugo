const fs = require('fs');

const path = require('path');
const { exec } = require('child_process');
const os = require('os');
//const knitr = require('./knitr');

/**
 * Finds the Stata executable on the system
 * @param {boolean} [showMessage=true] - Whether to show status messages
 * @returns {Promise<string>} Path to Stata executable or empty string if not found
 */
async function find_stata(showMessage = true) {
    let stataexe = "";
    const platform = process.platform;

    // Windows
    if (platform === 'win32') {
        const programDirs = [
            'C:/Program Files',
            'C:/Program Files (x86)'
        ];

        for (const d of programDirs) {
            if (stataexe === '' && fs.existsSync(d)) {
                // Check Stata versions from 19 down to 11
                for (let v = 19; v >= 11; v--) {
                    const dv = path.join(d, `Stata${v}`);
                    if (fs.existsSync(dv)) {
                        const executables = [
                            'Stata',
                            'StataIC',
                            'StataSE',
                            'StataMP',
                            'Stata-64',
                            'StataIC-64',
                            'StataSE-64',
                            'StataMP-64'
                        ];

                        for (const f of executables) {
                            const dvf = path.join(dv, f + '.exe');
                            if (fs.existsSync(dvf)) {
                                stataexe = dvf;
                                if (showMessage) console.log('Stata found at', stataexe);
                                break;
                            }
                        }
                        if (stataexe !== '') break;
                    }
                }
            }
            if (stataexe !== '') break;
        }
    }
    // macOS
    else if (platform === 'darwin') {
        const dv = '/Applications/Stata/';
        if (fs.existsSync(dv)) {
            const executables = ['Stata', 'StataSE', 'StataMP'];
            
            for (const f of executables) {
                const dvf = path.join(dv, `${f}.app`, 'Contents', 'MacOS', f);
                if (fs.existsSync(dvf)) {
                    stataexe = dvf;
                    if (showMessage) console.log('Stata found at', stataexe);
                    break;
                }
            }
        }
    }
    // Linux/Unix
    else if (platform === 'linux' || platform === 'freebsd') {
        try {
            stataexe = await new Promise((resolve, reject) => {
                exec('which stata', (error, stdout, stderr) => {
                    if (error) {
                        resolve('');
                    } else {
                        resolve(stdout.trim());
                    }
                });
            });
            
            if (showMessage && stataexe) {
                console.log('Stata found at', stataexe);
            }
        } catch (error) {
            stataexe = '';
        }
    }
    else {
        console.log('Unrecognized operating system.');
    }

    // Set engine path if Stata was found
    if (stataexe !== '') {
        //knitr.opts_chunk.set('engine.path', { stata: stataexe });
        console.log(stataexe)
    } else {
        console.log('No Stata executable found.');
    }

    return stataexe;
}

module.exports = { find_stata };