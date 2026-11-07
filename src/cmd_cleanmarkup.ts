import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export function cmd_cleanmarkup()  {
        // 1. 取得目前作用中的編輯器
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return;
        }

        const document = editor.document;
        
        // 2. 取得使用者所有的選取範圍 (VS Code 支援多游標同時選取)
        const selections = editor.selections;

        // 3. 利用 editor.edit 同步執行所有的替換動作
        editor.edit(editBuilder => {
            selections.forEach(selection => {
                // 如果該選取範圍是空的（單純只是游標，沒有反白選取文字），就跳過
                if (selection.isEmpty) {
                    return;
                }

                // 取得該選取範圍內的文字
                const selectedText = document.getText(selection);
                
                // 將 xx 替換為 aa (g 代表全域替換該範圍內的所有 xx)
                let updatedText = selectedText.replace(/\\\(/g, '$');
                updatedText = updatedText.replace(/\\\(/g, '$');
                updatedText = updatedText.replace(/\\\)/g, '$');
                updatedText = updatedText.replace(/• /g, '- ');
                updatedText = updatedText.replace(/\\\^/g, '\\hat');
                updatedText = updatedText.replace(/我們/g, '');

                const regex = /(python|R|stata|text)[\r]?[\n]([\s\S]*?[\r]?[\n])請謹慎使用程式碼。/g;

                // 使用 replaceAll 進行代換
                // p0 是完整匹配的字串，p1 是第一個捕獲組 (Group 1)
                updatedText = updatedText.replaceAll(regex, (p0, p1,p2) => {
                  return `\`\`\`${p1.trim()}\n${p2.trim()}\n\`\`\``;
                });                
                
                // 執行替換
                editBuilder.replace(selection, updatedText);
            });
        }).then(success => {
            if (success) {
                // 替換成功後的提示（選填）
                vscode.window.showInformationMessage('選取範圍轉換完畢！');
            }
        });
    }