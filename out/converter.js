"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.convertMarkdownToIpynb = void 0;
const unified_1 = require("unified");
const remark_parse_1 = __importDefault(require("remark-parse"));
function nodeToMarkdown(node) {
    // Simple serializer for common block nodes to markdown source
    switch (node.type) {
        case 'paragraph':
            return node.children.map(c => c.value || '').join('') + '\n\n';
        case 'heading':
            const h = node;
            return '#'.repeat(h.depth) + ' ' + h.children.map(c => c.value || '').join('') + '\n\n';
        case 'list':
            // fallback: stringify children
            return node.children.map((item) => ' - ' + (item.children || []).map((c) => c.value || '').join('')).join('\n') + '\n\n';
        case 'code':
            const c = node;
            return '```' + (c.lang || '') + '\n' + (c.value || '') + '\n```\n\n';
        default:
            // try to stringify known literals
            if (node.value)
                return node.value + '\n\n';
            return '';
    }
}
function convertMarkdownToIpynb(text) {
    // Detect YAML front matter (--- ... --- at the top)
    let yamlFront = '';
    let restText = text;
    if (text.startsWith('---')) {
        const end = text.indexOf('---', 3);
        if (end !== -1) {
            yamlFront = text.slice(0, end + 3).trim();
            restText = text.slice(end + 3);
        }
    }
    const tree = (0, unified_1.unified)().use(remark_parse_1.default).parse(restText);
    const cells = [];
    // If YAML front matter found, treat as raw code cell at top
    if (yamlFront) {
        cells.push({
            cell_type: 'raw',
            execution_count: null,
            metadata: { language: 'yaml', raw: true },
            outputs: [],
            source: yamlFront + '\n'
        });
    }
    // We'll iterate and group consecutive non-code nodes into one markdown cell.
    let pendingMarkdown = [];
    function flushMarkdown() {
        if (pendingMarkdown.length === 0)
            return;
        cells.push({
            cell_type: 'markdown',
            metadata: {},
            source: pendingMarkdown.join('')
        });
        pendingMarkdown = [];
    }
    for (const node of tree.children) {
        if (node.type === 'code') {
            flushMarkdown();
            const c = node;
            // parse fenced code info by combining c.lang and c.meta into one info string
            const infoParts = [];
            if (c.lang)
                infoParts.push(String(c.lang));
            if (c.meta)
                infoParts.push(String(c.meta));
            let info = infoParts.join(' ').trim();
            let lang = '';
            let metadata = {};
            if (info.length > 0) {
                // remove surrounding braces if present
                if (info.startsWith('{') && info.endsWith('}')) {
                    info = info.slice(1, -1).trim();
                }
                // split by commas first
                const parts = info.split(',').map(p => p.trim()).filter(p => p.length > 0);
                if (parts.length > 0) {
                    // first part may contain language and possibly inline options separated by whitespace
                    let first = parts[0];
                    const firstTokens = first.split(/\s+/).filter(Boolean);
                    lang = firstTokens[0] || '';
                    const restParts = [];
                    if (firstTokens.length > 1) {
                        restParts.push(firstTokens.slice(1).join(' '));
                    }
                    if (parts.length > 1)
                        restParts.push(...parts.slice(1));
                    // parse each rest part as key[=value]
                    for (const p of restParts) {
                        const [kRaw, ...rest] = p.split('=');
                        const k = kRaw ? kRaw.trim() : '';
                        if (!k)
                            continue;
                        const v = rest.length > 0 ? rest.join('=').trim() : undefined;
                        metadata[k] = v === undefined ? true : parseOptionValue(v);
                    }
                }
            }
            let codeSource = (c.value || '') + '\n';
            if ((lang || '').toLowerCase() === 'stata') {
                // Prepend magic command for stata
                codeSource = '%%stata\n' + codeSource;
            }
            cells.push({
                cell_type: 'code',
                execution_count: null,
                metadata: Object.assign({ language: lang || '' }, metadata),
                outputs: [],
                source: codeSource
            });
        }
        else {
            const md = nodeToMarkdown(node);
            if (md.trim().length === 0)
                continue;
            pendingMarkdown.push(md);
        }
    }
    function parseOptionValue(v) {
        if (!v)
            return v;
        const low = v.toLowerCase();
        if (low === 'true')
            return true;
        if (low === 'false')
            return false;
        // number?
        const n = Number(v);
        if (!Number.isNaN(n))
            return n;
        // strip quotes if present
        const m = v.match(/^['"](.*)['"]$/);
        if (m)
            return m[1];
        return v;
    }
    flushMarkdown();
    return {
        nbformat: 4,
        nbformat_minor: 2,
        metadata: {},
        cells
    };
}
exports.convertMarkdownToIpynb = convertMarkdownToIpynb;
//# sourceMappingURL=converter.js.map