"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const converter_1 = require("../src/converter");
const assert_1 = require("assert");
describe('converter', () => {
    it('converts simple markdown and code fences', () => {
        const md = '# Title\n\nSome text.\n\n```{r}\n1+1\n```\n';
        const nb = (0, converter_1.convertMarkdownToIpynb)(md);
        assert_1.strict.equal(nb.cells.length, 2);
        assert_1.strict.equal(nb.cells[0].cell_type, 'markdown');
        assert_1.strict.equal(nb.cells[1].cell_type, 'code');
    });
});
//# sourceMappingURL=converter.test.js.map