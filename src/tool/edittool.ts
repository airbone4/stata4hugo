import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

/**
 * 在指定行號下方插入內容，若已存在指定範圍則直接覆蓋
 */
/**
 * 在指定行號下方插入內容；若已存在舊結果範圍，則直接覆蓋
 * @param document 目前開啟的 VS Code 文件
 * @param targetLine 程式碼區塊結束的行號 (endLine)
 * @param existingRange 既有的輸出範圍 (由 findExistingOutputRange 取得，若無則為 null)
 * @param content 要寫入的完整格式化字串
 */
export async function updateInsertContent(
  document: vscode.TextDocument,
  targetLine: number,
  existingRange: vscode.Range | null,
  content: string
): Promise<boolean> {
  const edit = new vscode.WorkspaceEdit();
  if (content !== '') {
    if (existingRange) {
      edit.replace(document.uri, existingRange, content);
    } else {
      const lineText = document.lineAt(targetLine).text;
      const insertPosition = new vscode.Position(targetLine, lineText.length);
      edit.insert(document.uri, insertPosition, `\n${content}`);
    }

    return await vscode.workspace.applyEdit(edit);
  }
}
