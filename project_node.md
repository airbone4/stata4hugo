
## 參考

這樣也可以拿到工作目錄
```js
      const workspaceFolders = vscode.workspace.workspaceFolders;
      const workspaceFolderPath = workspaceFolders && workspaceFolders.length > 0 ? workspaceFolders[0].uri.fsPath : undefined;

```