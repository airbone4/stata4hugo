"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.convertIpynbFileToMd = exports.convertIpynbToMarkdown = void 0;
const fs = __importStar(require("fs"));
function convertIpynbToMarkdown(nb) {
    const parts = [];
    if (nb.metadata && nb.metadata.title) {
        parts.push('---');
        for (const k of Object.keys(nb.metadata)) {
            parts.push(`${k}: ${nb.metadata[k]}`);
        }
        parts.push('---\n');
    }
    for (const cell of nb.cells || []) {
        if (cell.cell_type === 'markdown') {
            // markdown cells have source as string or array
            const src = Array.isArray(cell.source) ? cell.source.join('') : cell.source;
            parts.push(src.trim() + '\n');
        }
        else if (cell.cell_type === 'code') {
            const src = Array.isArray(cell.source) ? cell.source.join('') : cell.source;
            // try to preserve language from metadata
            const lang = (cell.metadata && cell.metadata.language) || '';
            // if raw stata magic present, remove it and mark language stata
            let body = src;
            if (body.startsWith('%%stata')) {
                body = body.replace(/^%%stata\n/, '');
            }
            parts.push('```' + (lang || '') + '\n' + body.trim() + '\n```\n');
        }
        else if (cell.cell_type === 'raw') {
            const src = Array.isArray(cell.source) ? cell.source.join('') : cell.source;
            parts.push(src.trim() + '\n');
        }
    }
    return parts.join('\n');
}
exports.convertIpynbToMarkdown = convertIpynbToMarkdown;
function convertIpynbFileToMd(inputPath, outputPath) {
    const data = fs.readFileSync(inputPath, 'utf8');
    const nb = JSON.parse(data);
    const md = convertIpynbToMarkdown(nb);
    fs.writeFileSync(outputPath, md, 'utf8');
}
exports.convertIpynbFileToMd = convertIpynbFileToMd;
//# sourceMappingURL=ipynbToMd.js.map