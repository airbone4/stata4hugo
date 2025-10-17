"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const converter_1 = require("../converter");
const assert_1 = require("assert");
describe('converter options', () => {
    it('parses R chunk options into metadata', () => {
        const md = "```{r, echo=FALSE, fig.height=4, label='plot1'}\n1+1\n```\n";
        const nb = (0, converter_1.convertMarkdownToIpynb)(md);
        assert_1.strict.equal(nb.cells.length, 1);
        const cell = nb.cells[0];
        assert_1.strict.equal(cell.cell_type, 'code');
        // metadata should include parsed options and language
        assert_1.strict.equal(cell.metadata.language, 'r');
        assert_1.strict.equal(cell.metadata.echo, false);
        assert_1.strict.equal(cell.metadata['fig.height'], 4);
        assert_1.strict.equal(cell.metadata.label, 'plot1');
    });
});
//# sourceMappingURL=converter.options.test.js.map