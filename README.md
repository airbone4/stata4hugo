# 目的
寫一個vscode extension 用途是 轉 rmarkdown/makdown to Jupyter Notebook (.ipynb).


## history

- git log: 更改tsconfig
   之後要把js 都放進來

## todo

- [參考一下這個](https://github.com/jithurjacob/vscode-nbpreviewer/blob/master/src/extension.js)
- [when 副檔名才啟動](https://github.com/Leytton/vsc-jupyter-to-markdown/blob/main/package.json)
數學公式

應該是
```
- pdf	
  - \\( \frac{1}{2^\frac{k}{2}\mathrm{\Gamma}(\frac{k}{2})} x^{\frac{k}{2}-1}e^{-\frac{x}{2}}	\\)
- cdf	
  - \\( \frac{1}{\mathrm{\Gamma}(\frac{k}{2})}\gamma(\frac{k}{2},\frac{x}{2})	\\)
```
結果是
```
- pdf
      - \( \frac{1}{2^\frac{k}{2}\mathrm{\Gamma}(\frac{k}{2})} x^{\frac{k}{2}-1}e^{-\frac{x}{2}}	\)


- cdf
      - \( \frac{1}{\mathrm{\Gamma}(\frac{k}{2})}\gamma(\frac{k}{2},\frac{x}{2})	\)
```

