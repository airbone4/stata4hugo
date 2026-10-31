"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.convertIpynbToMarkdown = convertIpynbToMarkdown;
exports.convertIpynbFileToMd = convertIpynbFileToMd;
var fs = require("fs");
var path = require("path");
function saveBase64ToPNGFile(base64String, outputPath) {
    // 1. 移除可能帶有的 Data URL 標頭前綴
    var base64Data = base64String.replace(/^data:image\/\w+;base64,/, "");
    // 2. 將 Base64 字串直接轉換為 Node.js Buffer
    var imageBuffer = Buffer.from(base64Data, 'base64');
    // 3. 寫入檔案到指定路徑
    fs.writeFileSync(outputPath, imageBuffer);
    // fs.writeFile(outputPath, imageBuffer, (err) => {
    //     /*if (err) {
    //         console.error('儲存圖片時發生錯誤:', err);
    //     } else {
    //         console.log(`圖片已成功儲存至: ${outputPath}`);
    //     }*/
    // });
}
function saveSvgToFile(svgString, outputPath) {
    // 參數：檔案路徑、寫入內容、編碼（SVG 是純文字，指定 utf8）
    fs.writeFileSync(outputPath, svgString, 'utf8');
}
function getUniqueFilenameSync(folderPath, prefix, extension) {
    if (prefix === void 0) { prefix = 'xxxx'; }
    if (extension === void 0) { extension = '.png'; }
    // 1. 確保資料夾存在，若不存在則建立
    if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true });
    }
    var counter = 1;
    // 預設第一個嘗試的檔名，例如：xxxx.png
    var filename = "".concat(prefix).concat(extension);
    var fullPath = path.join(folderPath, filename);
    // 2. 如果檔案已存在，就加上數字序號重試 (例如：xxxx_1.png, xxxx_2.png)
    while (fs.existsSync(fullPath)) {
        filename = "".concat(prefix, "_").concat(counter).concat(extension);
        fullPath = path.join(folderPath, filename);
        counter++;
    }
    return filename; // 回傳唯一的檔名（不含完整路徑）
}
function convertIpynbToMarkdown(nb, imgfolder) {
    var parts = [];
    var tofolder = imgfolder;
    if (nb.metadata && nb.metadata.title) {
        parts.push('---');
        for (var _i = 0, _a = Object.keys(nb.metadata); _i < _a.length; _i++) {
            var k = _a[_i];
            parts.push("".concat(k, ": ").concat(nb.metadata[k]));
        }
        parts.push('---\n');
    }
    var _loop_1 = function (cell) {
        if (cell.cell_type === 'markdown') {
            // markdown cells have source as string or array
            var src = Array.isArray(cell.source) ? cell.source.join('') : cell.source;
            parts.push(src.trim() + '\n');
        }
        else if (cell.cell_type === 'code') {
            if (cell.metadata && cell.metadata.tags && cell.metadata.tags.length > 0 && cell.metadata.tags.includes('hide')) {
                return "continue";
            }
            var src = Array.isArray(cell.source) ? cell.source.join('') : cell.source;
            // try to preserve language from metadata
            var lang = (cell.metadata && cell.metadata.language) || '';
            // if raw stata magic present, remove it and mark language stata
            var body = src;
            if (body.startsWith('%%stata')) {
                body = body.replace(/^%%stata\s*\n/, '');
                lang = 'stata';
            }
            //輸入部分
            parts.push('```' + (lang || '') + '\n' + body.trim() + '\n```\n');
            var isContinuous_1 = false;
            var out_stata_1 = [];
            var out_images_1 = [];
            if (cell.outputs) {
                cell.outputs.forEach(function (obj) {
                    if (obj.output_type === "stream") {
                        if (isContinuous_1) {
                            // 連續狀態下，直接推入上一個子陣列中
                            out_stata_1.push.apply(out_stata_1, obj.text);
                        }
                        else {
                            // 第一次遇到或中斷後重新遇到，建立新陣列
                            out_stata_1.push.apply(out_stata_1, obj.text);
                            isContinuous_1 = true;
                        }
                    }
                    else {
                        // 遇到非 stdout，將連續狀態重設為 false
                        isContinuous_1 = false;
                    }
                });
                cell.outputs.forEach(function (obj) {
                    fs.mkdirSync(imgfolder, { recursive: true });
                    if (obj.output_type === "display_data") {
                        var outtxt = 'unknown image type';
                        //obj.data["image/svg+xml"]? outtxt=obj.data["image/svg+xml"].join(''):outtxt=outtxt
                        //obj.data["image/png"]? outtxt= '\n<img class="w-75 h-75" src="data:image/png;base64,'+obj.data["image/png"] +'" alt="Folly Image">\n':outtxt=outtxt;
                        if (obj.data["image/svg+xml"]) {
                            var imgfile = getUniqueFilenameSync(imgfolder, path.parse(imgfolder).name, ".svg");
                            saveSvgToFile(obj.data["image/svg+xml"].join(""), imgfolder + '/' + imgfile);
                            outtxt = "\n![](".concat(path.basename(imgfolder), "/").concat(imgfile, ")\n\n");
                        }
                        if (obj.data["image/png"]) {
                            var imgfile = getUniqueFilenameSync(imgfolder, path.parse(imgfolder).name, ".png");
                            saveBase64ToPNGFile(obj.data["image/png"], imgfolder + '/' + imgfile);
                            outtxt = "\n![](".concat(path.basename(imgfolder), "/").concat(imgfile, " )\n{ class=\"lineimg w-100 h-50\"}\n");
                        }
                        out_images_1.push(outtxt);
                    }
                });
            }
            if (out_stata_1.length > 0) {
                var outtxt = out_stata_1.join('');
                parts.push('{{< expand title="執行結果" incode=false >}}' + '\n' + '```' + (lang || '') + '\n' + outtxt + '\n' + '```\n' + '{{< /expand >}}');
            }
            if (out_images_1.length > 0) {
                parts.push(out_images_1.join(''));
            }
            /*
                  if (cell.outputs && cell.outputs.length>0) {
                    for (const outblock of cell.outputs) {
                      if (outblock.text && outblock.text.length>0){
                        let outtxt = outblock.text.join('')
                        //parts.push('```' + (lang || '') + '\n' + '{{< expand 輸出 >}}'+'\n'+ outtxt +'{{< /expand >}}'+'\n'+ '```\n');
                        parts.push( '{{< expand title="執行結果" incode=false >}}'+ '\n'+'```' + (lang || '')  +'\n'+ outtxt +'\n'+ '```\n'+'{{< /expand >}}');
                      }
                      if (outblock.data && outblock.data["image/svg+xml"]){
                        let outtxt = outblock.data["image/svg+xml"].join('')
                        parts.push(outtxt);
                      }
                    }
                  }
             */
        }
        else if (cell.cell_type === 'raw') {
            var src = Array.isArray(cell.source) ? cell.source.join('') : cell.source;
            parts.push(src.trim() + '\n');
        }
    };
    for (var _b = 0, _c = nb.cells || []; _b < _c.length; _b++) {
        var cell = _c[_b];
        _loop_1(cell);
    }
    return parts.join('\n');
}
function convertIpynbFileToMd(inputPath, outputPath) {
    var data = fs.readFileSync(inputPath, 'utf8');
    var nb = JSON.parse(data);
    var md = convertIpynbToMarkdown(nb, path.parse(outputPath).name);
    fs.writeFileSync(outputPath, md, 'utf8');
}
