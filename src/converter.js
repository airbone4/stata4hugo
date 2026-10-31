"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.convertMarkdownToIpynb = convertMarkdownToIpynb;
var unified_1 = require("unified");
var remark_parse_1 = require("remark-parse");
var dostata_js_1 = require("./statatool/dostata.js");
function nodeToMarkdown(node, depth, opts) {
    var _a;
    if (depth === void 0) { depth = 0; }
    // Simple serializer for common block nodes to markdown source
    switch (node.type) {
        case 'paragraph':
            return node.children.map(function (c) { return nodeToMarkdown(c, depth, opts); }).join('') + '\n\n';
        case 'heading':
            var h = node;
            return '#'.repeat(h.depth) + ' ' + h.children.map(function (c) { return c.value || ''; }).join('') + '\n\n';
        case 'list':
            // Render list items by converting their child nodes instead of naively stringifying values.
            var listNode = node;
            var ordered_1 = !!listNode.ordered;
            var startIndex_1 = Number(listNode.start) || 1;
            var maxIndex = startIndex_1 + (listNode.children ? listNode.children.length - 1 : 0);
            var style_1 = (opts && opts.listStyle) || 'gfm';
            // If pandoc style and source text provided, attempt to parse explicit numbers in the source to compute padding
            var explicitNumbers_1;
            if (style_1 === 'pandoc' && opts && opts.sourceText) {
                try {
                    var src = opts.sourceText || '';
                    // find lines with optional indentation followed by digits and a dot, capture digits in order
                    var lines = src.split(/\r?\n/);
                    var found = [];
                    for (var _i = 0, lines_1 = lines; _i < lines_1.length; _i++) {
                        var ln = lines_1[_i];
                        var m = ln.match(/^\s*(\d+)\./);
                        if (m) {
                            var n = Number(m[1]);
                            if (!Number.isNaN(n))
                                found.push(n);
                        }
                    }
                    if (found.length > 0)
                        explicitNumbers_1 = found;
                    if (explicitNumbers_1 && explicitNumbers_1.length > 0) {
                        var maxFound = Math.max.apply(Math, __spreadArray(__spreadArray([], explicitNumbers_1, false), [maxIndex], false));
                        maxIndex = maxFound;
                    }
                }
                catch (e) {
                    // ignore and fall back
                }
            }
            var numWidth_1 = ordered_1 ? String(maxIndex).length : 0;
            var indent_1 = '   '.repeat(depth);
            return (listNode.children || []).map(function (item, idx) {
                var children = item.children || [];
                var seqNum = startIndex_1 + idx;
                var itemNum = (explicitNumbers_1 && explicitNumbers_1[idx] !== undefined) ? explicitNumbers_1[idx] : seqNum;
                var prefix = ordered_1
                    ? (style_1 === 'pandoc' ? itemNum.toString().padStart(numWidth_1, ' ') + '. ' : itemNum.toString() + '. ')
                    : '- ';
                if (children.length === 0)
                    return indent_1 + prefix.trim();
                // Render first child inline when possible (e.g., paragraph)
                var first = children[0];
                var firstText = '';
                if (first.type === 'paragraph') {
                    firstText = (first.children || []).map(function (c) { return (c.value || ''); }).join('');
                }
                else {
                    firstText = nodeToMarkdown(first, depth + 1).replace(/\n+/g, ' ').trim();
                }
                // Render remaining block children as indented blocks (preserve multi-line output)
                var rest = (children.slice(1) || []).map(function (c) { return nodeToMarkdown(c, depth + 1, opts); }).join('');
                var spacer = ordered_1 ? (style_1 === 'pandoc' ? ' '.repeat(numWidth_1 + 2) : '  ') : '   ';
                var indentedRest = rest
                    ? rest.split('\n').map(function (l) { return (l ? indent_1 + spacer + l : l); }).join('\n')
                    : '';
                return indent_1 + prefix + firstText + (indentedRest ? '\n' + indentedRest : '');
            }).join('\n') + '\n\n';
        case 'code':
            var c = node;
            return '```' + (c.lang || '') + '\n' + (c.value || '') + '\n```\n\n';
        case 'link':
            var link = node;
            var linkText = ((_a = link.children) === null || _a === void 0 ? void 0 : _a.map(function (c) { return nodeToMarkdown(c, depth, opts); }).join(' ').replace(/\s+/g, ' ').trim()) || link.title || '';
            return "[".concat(linkText, "](").concat(link.url, ")");
        case 'image':
            var img = node;
            var alt = img.alt || img.title || '';
            return "![".concat(alt, "](").concat(img.url, ")");
        case 'text':
            return node.value || '';
        case 'emphasis':
            return '*' + (node.children || []).map(function (c) { return nodeToMarkdown(c, depth, opts); }).join('') + '*';
        case 'strong':
            return '**' + (node.children || []).map(function (c) { return nodeToMarkdown(c, depth, opts); }).join('') + '**';
        default:
            // try to stringify known literals
            if (node.value)
                return node.value + '\n\n';
            return '';
    }
}
function convertMarkdownToIpynb(text, workdir, opts) {
    return __awaiter(this, void 0, void 0, function () {
        function flushMarkdown() {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    if (pendingMarkdown.length === 0)
                        return [2 /*return*/];
                    cells.push({
                        cell_type: 'markdown',
                        metadata: {},
                        source: pendingMarkdown.join('')
                    });
                    pendingMarkdown = [];
                    return [2 /*return*/];
                });
            });
        }
        function parseOptionValue(v) {
            if (!v)
                return v;
            var low = v.toLowerCase();
            if (low === 'true')
                return true;
            if (low === 'false')
                return false;
            // number?
            var n = Number(v);
            if (!Number.isNaN(n))
                return n;
            // strip quotes if present
            var m = v.match(/^['"](.*)['"]$/);
            if (m)
                return m[1];
            return v;
        }
        var yamlFront, restText, end, tree, cells, pendingMarkdown, _i, _a, node, c, infoParts, rawInfo, isCurly, info, lang, metadata, parts, first, firstTokens, restParts, _b, restParts_1, p, _c, kRaw, rest, k, v, codeSource, rst, rstnode, md;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    yamlFront = '';
                    restText = text;
                    if (text.startsWith('---')) {
                        end = text.indexOf('---', 3);
                        if (end !== -1) {
                            yamlFront = text.slice(0, end + 3).trim();
                            restText = text.slice(end + 3);
                        }
                    }
                    tree = (0, unified_1.unified)().use(remark_parse_1.default).parse(restText);
                    cells = [];
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
                    pendingMarkdown = [];
                    _i = 0, _a = tree.children;
                    _d.label = 1;
                case 1:
                    if (!(_i < _a.length)) return [3 /*break*/, 7];
                    node = _a[_i];
                    if (!(node.type === 'code')) return [3 /*break*/, 5];
                    c = node;
                    infoParts = [];
                    if (c.lang)
                        infoParts.push(String(c.lang));
                    if (c.meta)
                        infoParts.push(String(c.meta));
                    rawInfo = infoParts.join(' ').trim();
                    isCurly = rawInfo.startsWith('{') && rawInfo.endsWith('}');
                    if (!isCurly) {
                        // treat as markdown fenced code (do not flush pending markdown yet — group naturally)
                        pendingMarkdown.push(nodeToMarkdown(node));
                        return [3 /*break*/, 6];
                    }
                    // For curly-braced chunks, convert to a code cell
                    flushMarkdown();
                    info = rawInfo;
                    lang = '';
                    metadata = {};
                    if (info.length > 0) {
                        // remove surrounding braces
                        info = info.slice(1, -1).trim();
                        parts = info.split(',').map(function (p) { return p.trim(); }).filter(function (p) { return p.length > 0; });
                        if (parts.length > 0) {
                            first = parts[0];
                            firstTokens = first.split(/\s+/).filter(Boolean);
                            lang = firstTokens[0] || '';
                            restParts = [];
                            if (firstTokens.length > 1) {
                                restParts.push(firstTokens.slice(1).join(' '));
                            }
                            if (parts.length > 1)
                                restParts.push.apply(restParts, parts.slice(1));
                            // parse each rest part as key[=value]
                            for (_b = 0, restParts_1 = restParts; _b < restParts_1.length; _b++) {
                                p = restParts_1[_b];
                                _c = p.split('='), kRaw = _c[0], rest = _c.slice(1);
                                k = kRaw ? kRaw.trim() : '';
                                if (!k)
                                    continue;
                                v = rest.length > 0 ? rest.join('=').trim() : undefined;
                                metadata[k] = v === undefined ? true : parseOptionValue(v);
                            }
                        }
                    }
                    codeSource = (c.value || '') + '\n';
                    if (!((lang || '').toLowerCase() === 'stata')) return [3 /*break*/, 3];
                    return [4 /*yield*/, (0, dostata_js_1.doStata)(codeSource, workdir, metadata)];
                case 2:
                    rst = _d.sent();
                    rstnode = {};
                    if (metadata.echo !== false) {
                        rstnode = { lang: info, type: 'code', value: codeSource };
                        pendingMarkdown.push(nodeToMarkdown(rstnode));
                    }
                    //執行結果程式碼
                    if (metadata.results !== 'hide') {
                        rstnode = { lang: 'stata', type: 'code', value: rst };
                        pendingMarkdown.push(nodeToMarkdown(rstnode));
                    }
                    return [3 /*break*/, 4];
                case 3:
                    cells.push({
                        cell_type: 'code',
                        execution_count: null,
                        metadata: Object.assign({ language: lang || '' }, metadata),
                        outputs: [],
                        source: codeSource
                    });
                    _d.label = 4;
                case 4: return [3 /*break*/, 6];
                case 5:
                    md = nodeToMarkdown(node, 0, Object.assign({}, opts, { sourceText: restText }));
                    if (md.trim().length === 0)
                        return [3 /*break*/, 6];
                    pendingMarkdown.push(md);
                    _d.label = 6;
                case 6:
                    _i++;
                    return [3 /*break*/, 1];
                case 7:
                    flushMarkdown();
                    return [2 /*return*/, {
                            nbformat: 4,
                            nbformat_minor: 2,
                            metadata: {},
                            cells: cells
                        }];
            }
        });
    });
}
