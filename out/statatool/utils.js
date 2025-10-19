"use strict";
/**
 * Utility functions for Statamarkdown
 */
/**
 * Split a string into lines, preserving empty lines
 * @param {string} text - Text to split
 * @returns {string[]} - Array of lines
 */
function split_lines(text) {
    if (!text.includes('\n'))
        return [text];
    text = text.replace(/\n$/, '\n\n');
    return text.split('\n').map(line => line === '' ? '\n' : line);
}
/**
 * Remove whitespace from beginning and end of array
 * @param {string[]} lines - Array of strings to strip
 * @param {Function} test_strip - Function to test if line should be stripped
 * @returns {string[]} - Array with whitespace stripped
 */
function strip_white(lines, test_strip = is_blank) {
    if (!lines || !lines.length)
        return lines;
    // Strip from start
    while (lines.length && test_strip(lines[0])) {
        lines = lines.slice(1);
    }
    // Strip from end
    while (lines.length && test_strip(lines[lines.length - 1])) {
        lines = lines.slice(0, -1);
    }
    return lines;
}
/**
 * Test if a string or array of strings is blank
 * @param {string|string[]} text - Text to test
 * @returns {boolean} - Whether text is blank
 */
function is_blank(text) {
    if (!text || !text.length)
        return true;
    const blankRegex = /^\s*$/;
    return Array.isArray(text) ?
        text.every(line => blankRegex.test(line)) :
        blankRegex.test(text);
}
/**
 * Get or test output format
 * @param {string|string[]} [format] - Format(s) to test against
 * @returns {string|boolean} - Current format or test result
 */
function out_format(format) {
    var _a, _b;
    const currentFormat = (_b = (_a = global.knitr) === null || _a === void 0 ? void 0 : _a.opts_knit) === null || _b === void 0 ? void 0 : _b.get('out.format');
    if (format === undefined)
        return currentFormat;
    return currentFormat && (Array.isArray(format) ?
        format.includes(currentFormat) :
        format === currentFormat);
}
/**
 * Null coalescing operator equivalent
 * @param {*} x - Primary value
 * @param {*} y - Fallback value
 * @returns {*} - x if not null, otherwise y
 */
function nullCoalesce(x, y) {
    return x === null || x === undefined ? y : x;
}
/**
 * Create a string of repeated characters
 * @param {number} n - Number of repetitions
 * @param {string} char - Character to repeat
 * @returns {string} - Repeated string
 */
function spaces(n = 1, char = " ") {
    if (n <= 0)
        return "";
    if (n === 1)
        return char;
    return char.repeat(n);
}
module.exports = {
    split_lines,
    strip_white,
    is_blank,
    out_format,
    nullCoalesce,
    spaces
};
//# sourceMappingURL=utils.js.map