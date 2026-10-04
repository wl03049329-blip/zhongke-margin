# PX 實銷更新中心（銷售分析 2.4）

管理入口：銷售雷達底部 → 實銷資料更新。Excel 在本機解析，不上傳、不寫 repository、不取代目前實銷。正式資料目前仍為 2024/12～2026/08。

## 更新流程

1. 選擇 .xls / .xlsx，確認工作表與偵測月份。
2. 欄名支援商品名稱／品名、PX 品號／商品代號、條碼與 YYYY/MM（或 YYYY年MM月）。月份只有「1月」等標示時，必須有明確的年分錨點或人工指定最後月份，不依今天推定。
3. 新格式依有效品號、有效條碼、正規化完全相符品名對應；識別欄位指向不同商品時必須人工確認。舊 PX 原表 A/B 識別欄已有結構性錯位，不使用這些欄位自動配對；可沿用正式實銷已確認 sourceName。不是用列號，也不做模糊自動配對。
4. 無唯一對應時人工搜尋正式主檔指定，或明確排除此列（報告留紀錄）。人工指定只對本次檔案有效。真正新商品需另行建立主檔，本工具不建立商品；主檔既有但尚無實銷的商品需明確確認，歷史月份保留 null。
5. 來源缺少商品的新月份留 null；0 是真實銷量。負數、非數字、無快取公式、重複商品／月份、歷史衝突一律阻止生成。舊月份相同忽略，不同值不可在此覆寫。
6. Warnings 不阻止下載；較前一自然月增加超過 200% 或減少超過 70% 時提示，缺前月或前月為 0 不計百分比。只附加來源實際包含的新月份，不製造中間月份。
7. Errors=0 時下載 px-sales-data.next.js、sales-import-report.json、sales-validation-report.json。候選檔不能直接在網站套用。
8. 在 repository 驗證候選、核對 diff，經人工確認後才可替換正式資料並正常 commit／部署。管理入口不是身份驗證，也沒有修改正式資料權限。

## Node 同一套匯入核心

`node scripts/import-px-sales.cjs SOURCE.xlsx --output generated-sales/run-name [--sheet 工作表] [--end-period YYYY/MM] [--decisions decisions.json]`

decisions JSON：`{"rows":{"工作表:2":{"name":"完整正式商品名稱"},"工作表:3":{"exclude":true,"reason":"明確排除原因"}},"includeNewProducts":["尚無實銷的正式商品"]}`。

輸出目錄不得為 repository 根目錄。已存在報告或候選檔不覆寫。無效輸入只產生兩份失敗報告，退出碼 1，不產生 candidate。

`node scripts/validate-px-sales.cjs [px-sales-data.next.js]`

驗證月份格式、排序、重複、商品鍵、主檔連結、sales 陣列長度與非負有限數字／null。用 JSON literal 解析候選，不執行候選 JS。Pages build 執行相同 validator，CI 執行 importer 固定 fixture。候選生成另檢查完整歷史值與 metadata 均未改動。

舊 `scripts/analyze_px_mapping.py` 留作原始歷史轉檔證據，其固定月份／列號不適用新月份更新；今後走共享 JS importer，不重新以舊腳本覆寫資料。

## 解析器

SheetJS CE 0.20.3 full build，來源：https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz 。官方文件：https://docs.sheetjs.com/docs/getting-started/installation/standalone/ 。授權在 assets/vendor/SheetJS-LICENSE；vendored min.js SHA256：cc015130aa8521e7f088f88898eba949ccdcbfb38df0bd129b44b7273c3a6f41。

不使用執行時 CDN。解析器僅在開啟匯入檔時 lazy load；Service Worker 預先快取供離線使用。限 20 MB、50,000 列與 250 欄。只解析儲存值，不執行 Excel 巨集／公式、不傳送內容。測試新月份均為 fixture，不能當成正式實銷。
