const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const { split_lines } = require('./utils');

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const unlink = promisify(fs.unlink);

/**
 * Process Stata code with embedded markdown
 * @param {string} statafile - Path to Stata file
 * @param {string} [text] - Text content (alternative to file)
 * @param {boolean} [keep=false] - Whether to keep intermediate files
 * @param {Object} options - Additional options
 * @returns {Promise<string|void>} - Processed content or undefined
 */
async function spinstata(statafile, text = null, keep = false, options = {}) {
    let lines;
    
    if (!text) {
        const content = await readFile(statafile, 'utf8');
        lines = content.split('\n');
    } else {
        lines = text.split('\n');
    }

    // Initialize state arrays
    const length = lines.length;
    const states = {
        md_block: new Array(length).fill(0),
        chunk_head: new Array(length).fill(0),
        R_code: new Array(length).fill(0)
    };

    // Regular expressions for different markers
    const markers = {
        md_start: /^\s*\/\*'\s*/,
        md_end: /'\*\/\s*$/,
        chunk_start: /^\s*\/\*\+\s*/,
        chunk_end: /\+\*\/\s*$/,
        R_start: /^\s*\/\*R\s*/,
        R_end: /R\*\/\s*$/
    };

    // Process first line
    states.md_block[0] = markers.md_start.test(lines[0]) ? 1 : 0;
    states.chunk_head[0] = markers.chunk_start.test(lines[0]) ? 1 : 0;
    states.R_code[0] = markers.R_start.test(lines[0]) ? 1 : 0;

    // Process remaining lines
    for (let i = 1; i < length; i++) {
        states.md_block[i] = states.md_block[i-1] + 
            (markers.md_start.test(lines[i]) ? 1 : 0) - 
            (markers.md_end.test(lines[i-1]) ? 1 : 0);
            
        states.chunk_head[i] = states.chunk_head[i-1] + 
            (markers.chunk_start.test(lines[i]) ? 1 : 0) - 
            (markers.chunk_end.test(lines[i-1]) ? 1 : 0);
            
        states.R_code[i] = states.R_code[i-1] + 
            (markers.R_start.test(lines[i]) ? 1 : 0) - 
            (markers.R_end.test(lines[i-1]) ? 1 : 0);
    }

    // Process each line based on its state
    lines = lines.map((line, i) => {
        // Markdown processing
        if (markers.md_start.test(line)) {
            line = line.replace(markers.md_start, '');
        }
        if (states.md_block[i]) {
            line = `#' ${line}`;
        }
        if (markers.md_end.test(line)) {
            line = line.replace(markers.md_end, '');
        }

        // Chunk header processing
        if (markers.chunk_start.test(line)) {
            line = line.replace(markers.chunk_start, '#+ ');
        }
        if (markers.chunk_end.test(line)) {
            line = line.replace(markers.chunk_end, '');
        }

        // R code processing
        if (markers.R_start.test(line)) {
            line = line.replace(markers.R_start, '');
        }
        if (markers.R_end.test(line)) {
            line = line.replace(markers.R_end, '');
        }

        return line;
    });

    // Handle file output or return processed text
    if (!text) {
        const rfile = statafile.replace(/\.do$/, '.r');
        await writeFile(rfile, lines.join('\n'), 'utf8');
        
        if (!keep) {
            process.on('exit', () => {
                fs.unlink(rfile, err => {
                    if (err) console.error(`Error deleting ${rfile}:`, err);
                });
            });
        }
        
        return spin_lang(rfile, {
            precious: keep,
            comment: ['^/[*][*]', '^.*[*]/[*] *$'],
            language: 'stata',
            ...options
        });
    } else {
        return spin_lang(lines, {
            precious: keep,
            comment: ['^/[*][*]', '^.*[*]/[*] *$'],
            language: 'stata',
            text: true,
            ...options
        });
    }
}

/**
 * Process source files with embedded documentation
 * @param {string|string[]} source - Source file path or content
 * @param {Object} options - Processing options
 * @returns {Promise<string>} - Processed content
 */
async function spin_lang(source, options = {}) {
    const {
        knit = true,
        report = true,
        text = null,
        format = 'Rmd',
        doc = '^#+\'[ ]?',
        inline = '^[{][{](.+)[}][}][ ]*$',
        comment = ['^[# ]*/[*]', '^.*[*]/ *$'],
        precious = !knit && !text,
        language = 'R'
    } = options;

    let lines;
    if (!text) {
        const content = await readFile(source, 'utf8');
        lines = content.split('\n');
    } else {
        lines = Array.isArray(source) ? source : source.split('\n');
    }

    // Process comments
    const commentStart = new RegExp(comment[0]);
    const commentEnd = new RegExp(comment[1]);
    const c1 = lines.map((line, i) => commentStart.test(line) ? i : -1).filter(i => i !== -1);
    const c2 = lines.map((line, i) => commentEnd.test(line) ? i : -1).filter(i => i !== -1);

    if (c1.length !== c2.length) {
        throw new Error('Comments must be put in pairs of start and end delimiters');
    }

    // Additional processing would go here...
    
    return lines.join('\n');
}

module.exports = {
    spinstata,
    spin_lang
};