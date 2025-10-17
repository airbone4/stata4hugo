"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const converter_1 = require("../src/converter");
const assert_1 = require("assert");
describe('converter grouping', () => {
    it('groups consecutive markdown blocks into one markdown cell', () => {
        const md = '# Title\n\nFirst paragraph.\n\n- item 1\n- item 2\n\n```{r}\n1+1\n```\n\nSecond paragraph after code.';
        const nb = (0, converter_1.convertMarkdownToIpynb)(md);
        // expectation: markdown group before code -> 1 cell, then code -> 1, then markdown after ->1 => 3
        assert_1.strict.equal(nb.cells.length, 3);
        assert_1.strict.equal(nb.cells[0].cell_type, 'markdown');
        assert_1.strict.equal(nb.cells[1].cell_type, 'code');
        assert_1.strict.equal(nb.cells[2].cell_type, 'markdown');
    });
});
//# sourceMappingURL=converter.grouping.test.js.map