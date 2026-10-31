# 目的
寫一個vscode extension 用途是 轉 rmarkdown/makdown to Jupyter Notebook (.ipynb).


## history

- git log: 更改tsconfig
   之後要把js 都放進來

## todo

- [參考一下這個](https://github.com/jithurjacob/vscode-nbpreviewer/blob/master/src/extension.js)
- [when 副檔名才啟動](https://github.com/Leytton/vsc-jupyter-to-markdown/blob/main/package.json)
數學公式
- inline `$\frac{1}{2^}$`
- line  `$$ \frac{1}{2^} $$` 

快速鍵: 
- ipynb to markdown
  - windows: `ctrl+m` 
  - mac: `cmd+m`

## debug
在debug terminal中,敲入
```
npm run test1
```