const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const { find_stata } = require('./find_stata');

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const appendFile = promisify(fs.appendFile);
const unlink = promisify(fs.unlink);
const access = promisify(fs.access);

/**
 * Check if a file exists
 * @param {string} filePath - Path to the file
 * @returns {Promise<boolean>} - Whether the file exists
 */


async function fileExists(filePath) {
    try {
        await access(filePath);
        return true;
    } catch {
        return false;
    }
}

/**
 * Set up code collection functionality
 * @returns {Promise<void>}
 */
async function stata_collectcode() {
    const stataPath = await find_stata(false);
    const stataDir = path.dirname(stataPath);
    
    // Check for profile files
    if (await fileExists(path.join(stataDir, 'sysprofile.do'))) {
        console.log("Found a 'sysprofile.do'");
    }

    if (await fileExists(path.join(stataDir, 'profile.do'))) {
        console.log("Found a 'profile.do' in the STATA executable directory.");
        console.log("  This prevents 'collectcode' from working.");
        console.log("  Please rename this 'sysprofile.do'.");
    }

    // Store original profile if it exists
    let originalProfile = null;
    
    if (await fileExists('profile.do')) {
        originalProfile = await readFile('profile.do', 'utf8');
        console.log("Found an existing 'profile.do'");
        console.log("  ", originalProfile);
    }

    /**
     * Hook function for collecting code
     * @param {boolean} before - Whether this is called before or after code execution
     * @param {Object} options - Configuration options
     * @param {Object} envir - Environment context
     */
    return function collectcodeHook(before, options, envir) {
        if (!before) {
            
            if (options.engine === 'stata') {
            
                // Check for profile.do in Stata directory                
                if (fs.existsSync(path.join(path.dirname(options.engine_path.stata), 'profile.do'))) {
                
                    console.log("Found a 'profile.do' in the STATA executable directory.");
                    console.log("  This prevents 'collectcode' from working properly.");
                    console.log("  Please rename this 'sysprofile.do'.");
                }

                // Append code to profile.do

                return appendFile(path.join(options.workdir, 'profile.do'), (options.collectcode)? options.code.join('\n') + '\n':'\n')
                    .then(() => {
                        // Set up cleanup handlers 
                        process.on('exit', async () => {
                            //程式結束才執行,而不是函數結束
                            try {
                                //console.log("Cleaned up 'profile.do' on exit.");
                                //todo: 這裡要檢查是否矬在profile.do
                                await unlink('profile.do');
                                if (originalProfile) {
                                    await writeFile('profile.do', originalProfile);
                                }
                                
                            } catch (error) {
                                console.error('Error during cleanup:', error);
                            }
                        });
                    })
                    .catch(error => {
                        console.error('Error writing to profile.do:', error);
                    });
            }
        }
    };
}

module.exports = { stata_collectcode };