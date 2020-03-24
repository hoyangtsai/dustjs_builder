# Dustjs Builder

命令行式 dustjs 構建工具

## 用法

確認已經安裝 Nodejs

執行 `npm install` 安裝依賴

修改 config.json 為當前機器對應位置
- localdevpath, localsrcpath - UI 模塊路徑
- localtrunkpath - 線上 UI 模塊路徑
- cdndevpath, svnsourcepath - CDN 模塊路徑
- cdnpubpath - 線上 CDN 模塊路徑
- jslocalbase - CDN 模塊 res 路徑
- jspubbase - 線上 CDN 模塊 res 路徑
- selectfiles - 線上 UI 模塊 shtml 文件路徑

如果 cdn 位址有改，以下參數也要跟著修改
- urlbase
- compressApi
- cdnroot

```json
{
	"htmlversion": "",
	"cdnversion": "",
	"debug": false,
	"compressFlag": true,
	"cacheFlag": true,
	"splitFlag": true,
	"urlbase": "https://aics-img.tenpay.com/res/",
	"compressApi": "https://aics-img.tenpay.com/c/=",
	"cdnroot": "https://aics-img.tenpay.com/",
	"localdevpath": "/Users/Keithytsai/FiT/fid-fortune/fortune-ui/htdocs/",
	"localsrcpath": "/Users/Keithytsai/FiT/fid-fortune/fortune-ui/htdocs/",
	"localtrunkpath": "/Users/Keithytsai/FiT/fid-fortune/fortune-ui-release/htdocs/",
	"platformkey": "web",
	"projectkey": "fortune",
	"comparePath": "",
	"cdndevpath": "/Users/Keithytsai/FiT/fid-fortune/fortune-cdn-ui/",
	"cdnpubpath": "/Users/Keithytsai/FiT/fid-fortune/fortune-cdn-release/",
	"svnsourcepath": "/Users/Keithytsai/FiT/fid-fortune/fortune-cdn-ui/",
	"zippath": "/Users/Keithytsai/FiT/zipped/",
	"svnpath": "",
	"jslocalbase": "/Users/Keithytsai/FiT/fid-fortune/fortune-cdn-ui/htdocs/res",
	"jspubbase": "/Users/Keithytsai/FiT/fid-fortune/fortune-cdn-release/htdocs/res",
	"buildtype": "PUB",
	"includevirtualpath": "/caifu",
	"srcmd5": false,
	"repoType": "",
	"versionPath": "",
	"selectfiles": ["/Users/Keithytsai/FiT/fid-fortune/fortune-ui-release/htdocs/index.shtml"]
}
```

修改完成後執行 `node index.js` 開始構建
