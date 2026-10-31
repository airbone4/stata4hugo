
## graph
- `graph dir`
  列出記憶體中的圖形(如果名子是`Graph` ,就是使用者未給定名稱 ,例如 `scatter mpg price`。
- `graph drop _all`: 殺掉記憶體中的圖形。 此時,`graph dir` 不給任何名稱。
- `graph display` or `graph display plot1` 前面重繪`Graph` 後者重新繪出 `plot1`
[參考](https://stackoverflow.com/questions/78799717/is-there-a-way-to-convert-an-online-svg-to-a-png-using-javascript-only)
```js
// Source - https://stackoverflow.com/a/78799748
// Posted by Lasha, modified by community. See post 'Timeline' for change history
// Retrieved 2026-10-27, License - CC BY-SA 4.0

function convertSVGtoPNG() {
    var svgElement = document.getElementById('svgElement');
    var svgData = new XMLSerializer().serializeToString(svgElement);
    var svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    var url = URL.createObjectURL(svgBlob);

    var img = new Image();
    img.onload = function () {
        var canvas = document.getElementById('canvasElement');
        var context = canvas.getContext('2d');
        context.drawImage(img, 0, 0);
        var pngData = canvas.toDataURL('image/png');
        var pngImage = document.getElementById('pngImage');
        pngImage.src = pngData;
        URL.revokeObjectURL(url);
    };
    img.src = url;
}
```
## hugo 展開
{{< expand "主程式執行過程" >}} 
{{< /expand >}}