import * as vscode from 'vscode';
/**
 * 在指定行號下方插入內容，若已存在指定範圍則直接覆蓋
 */
export async function upsertEditorContent(
  document: vscode.TextDocument,
  targetLine: number,
  existingRange: vscode.Range | null,
  content: string
): Promise<boolean> {
  const edit = new vscode.WorkspaceEdit();

  if (existingRange) {
    edit.replace(document.uri, existingRange, content);
  } else {
    const lineText = document.lineAt(targetLine).text;
    const insertPosition = new vscode.Position(targetLine, lineText.length);
    edit.insert(document.uri, insertPosition, `\n${content}`);
  }

  return await vscode.workspace.applyEdit(edit);
}
