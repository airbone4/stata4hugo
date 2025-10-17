"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.convertMarkdownToIpynb = void 0;
function convertMarkdownToIpynb(text) {
    // Very small converter: split by lines, detect code fences and create cells
    const lines = text.split(/\r?\n/);
    const cells = [];
    let inCode = false;
    let codeLang = '';
    let buffer = [];
    function pushMarkdownCell() {
        if (buffer.length === 0)
            return;
        cells.push({
            cell_type: 'markdown',
            metadata: {},
            source: buffer.join('\n') + '\n'
        });
        buffer = [];
    }
    function pushCodeCell() {
        if (buffer.length === 0)
            return;
        cells.push({
            cell_type: 'code',
            execution_count: null,
            metadata: { language: codeLang },
            outputs: [],
            source: buffer.join('\n') + '\n'
        });
        buffer = [];
    }
    for (const line of lines) {
        const fence = line.match(/^```(?:\{?([a-zA-Z0-9_+-]*)[^`]*\}?)/);
        if (fence) {
            if (!inCode) {
                // starting fence
                pushMarkdownCell();
                inCode = true;
                codeLang = fence[1] || '';
                buffer = [];
            }
            else {
                // closing fence
                pushCodeCell();
                inCode = false;
                codeLang = '';
                buffer = [];
            }
            continue;
        }
        buffer.push(line);
    }
    // flush remaining
    if (inCode)
        pushCodeCell();
    else
        pushMarkdownCell();
    const nb = {
        nbformat: 4,
        nbformat_minor: 2,
        metadata: {},
        cells
    };
    return nb;
}
exports.convertMarkdownToIpynb = convertMarkdownToIpynb;
//# sourceMappingURL=converter.js.map