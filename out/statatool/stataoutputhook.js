"use strict";
/**
 * Hook function for processing Stata output
 * @param {string[]} output - The output lines to process
 * @param {Object} options - Configuration options
 * @returns {string[]} - Processed output
 */
function stataoutput(output, options) {
    console.log(`\n${options.engine} output from chunk ${options.label}`);
    if (options.engine === 'stata') {
        let lines = Array.isArray(output) ? output : output.split('\n');
        // Remove "running profile.do"
        lines = lines.map(line => {
            return line.replace(/^\.?\s*[Rr]unning\s.*profile\.do/, '');
        });
        // Process command echo in Stata log if cleanlog is not explicitly false
        if (!options.cleanlog === false) {
            // Remove command lines starting with dot
            lines = lines.filter(line => {
                var _a;
                const isCommand = /^\s*\.\s/.test(line);
                const isLoopCommand = /^\s+\d+\.\s+[^|]/.test(line);
                const isContinuation = /^>\s/.test(line);
                // Keep lines that aren't commands
                return !(isCommand || isLoopCommand ||
                    (isContinuation && ((_a = lines[lines.indexOf(line) - 1]) === null || _a === void 0 ? void 0 : _a.match(/^\s*\.\s/))));
            });
        }
        // Ensure trailing blank line
        if (lines.length > 0 && lines[lines.length - 1] !== '') {
            lines.push('');
        }
        // Remove blank lines at the top
        let firstTextLine = lines.findIndex(line => /[a-zA-Z0-9]/.test(line));
        if (firstTextLine > 0) {
            lines = lines.slice(firstTextLine);
        }
        return lines;
    }
    // For non-Stata output, return as is
    return Array.isArray(output) ? output : output.split('\n');
}
// Export the hook function
module.exports = { stataoutput };
//# sourceMappingURL=stataoutputhook.js.map