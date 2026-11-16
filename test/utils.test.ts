/*
node --test src/test/utils.test.js
或
npm run test:utils 但是先更改 packages.json
{
  "type": "module",
  "scripts": {
    "test": "node --test src/test/*.test.js"
  }
}

*/


import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

// 從 ../statatool/ 匯入重構後的共用副函數
import {
  processImagesToMarkdown,
  parseChunkHeader,
  formatExpandOutput,
  parseStataLog
} from '../src/statatool/common.js';
//import { upsertEditorContent } from '../src/vscodehelper.js';


// ==========================================
// 1. 測試 processImagesToMarkdown (含真實暫存檔 I/O)
// ==========================================
describe('processImagesToMarkdown()', () => {
  let tempRoot;
  let workDir;
  let imgDir;

  beforeEach(() => {
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'stata-test-'));
    workDir = path.join(tempRoot, 'docs');
    imgDir = path.join(workDir, 'post.files');
    fs.mkdirSync(workDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  });

  it('應能複製 SVG 圖片、自動建立目錄並回傳正確的相對路徑 Markdown', () => {
    const mockSvg1 = path.join(tempRoot, 'temp1.svg');
    const mockSvg2 = path.join(tempRoot, 'temp2.svg');
    fs.writeFileSync(mockSvg1, '<svg>chart1</svg>');
    fs.writeFileSync(mockSvg2, '<svg>chart2</svg>');

    const result = processImagesToMarkdown([mockSvg1, mockSvg2], {imgDir, workDir}, '_');

    assert.equal(fs.existsSync(imgDir), true);

    assert.equal(result, '![](post.files/_post.svg)![](post.files/_post_1.svg)');
    assert.equal(fs.readFileSync(path.join(imgDir, '_post.svg'), 'utf8'), '<svg>chart1</svg>');


  });

  it('當圖片列表為空或包含無效值時應安全回傳空字串', () => {
    assert.equal(processImagesToMarkdown([], {imgDir, workDir}), '');
    assert.equal(processImagesToMarkdown([null, undefined, ''], {imgDir, workDir}), '');
    assert.equal(fs.existsSync(imgDir), false);
  });
});

// ==========================================
// 2. 測試 parseChunkHeader
// ==========================================
describe('parseChunkHeader()', () => {
  it('應正確解析基本語言標籤', () => {
    const res = parseChunkHeader('{stata}');
    assert.equal(res.engineName, 'stata');
    assert.deepEqual(res.options, { engineName: 'stata' });
  });

  it('應正確解析帶有 label 與布林/數值/字串參數的標頭', () => {
    const res = parseChunkHeader('{stata fig1, echo=false, eval=T, fig.width=8, title="圖表"}');
    assert.equal(res.engineName, 'stata');
    assert.equal(res.options.label, 'fig1');
    assert.equal(res.options.echo, false);
    assert.equal(res.options.eval, true);
    assert.equal(res.options['fig.width'], 8);
    assert.equal(res.options.title, '圖表');
  });

  it('即使傳入沒有大括號的字串也能正常解析', () => {
    const res = parseChunkHeader('js echo=true');
    assert.equal(res.engineName, 'js');
    assert.equal(res.options.echo, true);
  });
});

// ==========================================
// 3. 測試 formatExpandOutput
// ==========================================
describe('formatExpandOutput()', () => {
  it('預設應包裝為 Hugo expand 短代碼區塊', () => {
    const output = formatExpandOutput('hello world', 'stata');
    const expected = `{{< expand title="執行結果" incode=false class="" >}}\n\`\`\`stata\nhello world\n\`\`\`\n{{< /expand >}}\n\n`;
    assert.equal(output, expected);
  });

  it('當 useExpand 為 false 時應輸出一般 Markdown 程式碼區塊', () => {
    const output = formatExpandOutput('123', 'js', false);
    assert.equal(output, `\n\`\`\`js\n123\n\`\`\`\n`);
  });

  it('應支援自訂標題', () => {
    const output = formatExpandOutput('data', 'python', true, '查看資料');
    assert.match(output, /title="查看資料"/);
  });
});

// ==========================================
// 4. 測試 parseStataLog
// ==========================================
describe('parseStataLog()', () => {
  it('應正確切除 pre/post 標記並抽取出 SVG 檔案路徑', () => {
    const mockRawLog = [
      'adopath + "C:/tools"',
      'set linesize 255',
      '//<<- pre ->>',
      '. sysuse auto',
      '(1978 automobile data)',
      '. summarize price',
      '    Variable |        Obs        Mean',
      '//<<- post ->>',
      '. graph export "C:/temp/img1.svg", replace',
      'file C:/temp/img1.svg saved as SVG format',
      'file C:/temp/img2.svg saved as SVG format'
    ].join('\n');

    const { cleanLog, imgList } = parseStataLog(mockRawLog);

    assert.equal(
      cleanLog,
      '. sysuse auto\n(1978 automobile data)\n. summarize price\n    Variable |        Obs        Mean'
    );
    assert.deepEqual(imgList, ['C:/temp/img1.svg', 'C:/temp/img2.svg']);
  });

  it('應能處理 Stata Log 自動斷行產生的 "> " 續行符號與 CRLF', () => {
    const wrappedLog = [
      '//<<- pre ->>',
      '結果輸出',
      '//<<- post ->>',
      'file C:/very/long/path/to/my_',
      '> chart_output.svg saved as SVG format'
    ].join('\r\n');

    const { cleanLog, imgList } = parseStataLog(wrappedLog);

    assert.equal(cleanLog, '結果輸出');
    assert.deepEqual(imgList, ['C:/very/long/path/to/my_chart_output.svg']);
  });
});

// ==========================================
// 5. 測試 upsertEditorContent (使用依賴注入 Mock VS Code API)
// ==========================================
describe('upsertEditorContent()', () => {
  function createMockVscode() {
    const operations = [];
    class Position {
      line;
      character;
      constructor(line, character) {
        this.line = line;
        this.character = character;
      }
    }


    class Range {
      start;
      end;
      constructor(start, end) {
        this.start = start;
        this.end = end;
      }
    }
    class WorkspaceEdit {
      replace(uri, range, text) {
        operations.push({ type: 'replace', uri, range, text });
      }
      insert(uri, pos, text) {
        operations.push({ type: 'insert', uri, pos, text });
      }
    }
    const workspace = {
      applyEdit: async () => true
    };
    return { Position, Range, WorkspaceEdit, workspace, operations };
  }

  // 待測邏輯包裝（若已抽離至獨立模組可直接 import）
  // ==========================================
  // 5. 測試 upsertEditorContent (完整 TypeScript 版本)
  // ==========================================
  describe('upsertEditorContent()', () => {
    function createMockVscode() {
      const operations: any[] = [];

      class Position {
        line: number;
        character: number;
        constructor(line: number, character: number) {
          this.line = line;
          this.character = character;
        }
      }

      class Range {
        start: Position;
        end: Position;
        constructor(start: Position, end: Position) {
          this.start = start;
          this.end = end;
        }
      }

      class WorkspaceEdit {
        replace(uri: any, range: Range, text: string) {
          operations.push({ type: 'replace', uri, range, text });
        }
        insert(uri: any, pos: Position, text: string) {
          operations.push({ type: 'insert', uri, pos, text });
        }
      }

      const workspace = {
        applyEdit: async () => true
      };

      return { Position, Range, WorkspaceEdit, workspace, operations };
    }

    async function upsertEditorContent(
      vscodeApi: any,
      document: any,
      targetLine: number,
      existingRange: any,
      content: string
    ) {
      const edit = new vscodeApi.WorkspaceEdit();
      if (existingRange) {
        edit.replace(document.uri, existingRange, content);
      } else {
        const lineText = document.lineAt(targetLine).text;
        const insertPosition = new vscodeApi.Position(targetLine, lineText.length);
        edit.insert(document.uri, insertPosition, `\n${content}`);
      }
      return await vscodeApi.workspace.applyEdit(edit);
    }

    it('當 existingRange 為 null 時，應在目標行尾端執行 insert', async () => {
      const mockVs = createMockVscode();
      const mockDoc = {
        uri: 'file:///test.md',
        lineAt: () => ({ text: '```' })
      };

      await upsertEditorContent(mockVs, mockDoc, 5, null, '新輸出結果');

      assert.equal(mockVs.operations.length, 1);
      assert.equal(mockVs.operations[0].type, 'insert');
      assert.deepEqual(mockVs.operations[0].pos, new mockVs.Position(5, 3));
      assert.equal(mockVs.operations[0].text, '\n新輸出結果');
    });

    it('當 existingRange 存在時，應直接執行 replace 覆蓋舊範圍', async () => {
      const mockVs = createMockVscode();
      const mockDoc = { uri: 'file:///test.md' };
      const existingRange = new mockVs.Range(
        new mockVs.Position(6, 0),
        new mockVs.Position(10, 25)
      );

      await upsertEditorContent(mockVs, mockDoc, 5, existingRange, '覆蓋後的結果');

      assert.equal(mockVs.operations.length, 1);
      assert.equal(mockVs.operations[0].type, 'replace');
      assert.equal(mockVs.operations[0].range, existingRange);
      assert.equal(mockVs.operations[0].text, '覆蓋後的結果');
    });
  });

});
