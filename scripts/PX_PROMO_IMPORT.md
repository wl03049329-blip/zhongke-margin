# 檔期售價匯入

執行 `node scripts/import_px_promos.cjs "來源.xlsx" --python "python.exe"`（需 openpyxl）。
從工作表標題／表頭辨識年度、商品欄及 `11-1檔 11/1-11/15` 等檔期；年度可用 `--year 2027` 明確指定。只讀 Excel，不改原檔。

輸出 `px-promo-prices.json`、同內容的瀏覽器載入檔 `px-promo-prices.js`、完整 `PX_PROMO_VALIDATION.json`。既有其他月份保留；同商品同檔期不同價格／活動不覆蓋，記錄衝突，需人工核對來源後才發布。請檢查報告的 warning/error，執行查價及既有回歸測試，再更新快取版本、提交部署。

主檔對應優先：品號、條碼、正規化名稱。識別碼矛盾不猜測。名稱 fallback 有 warning。報告保留原欄位、原活動文字、來源列與 SHA256。售價查詢資料不會更動任何試算輸入或商品成本。

均價為促銷總付額／實得件數；第二件半價的總付額為單價 × 1.5，實得兩件。內部不四捨五入；顯示至多兩位並去尾零。不明活動保留原文及 null 均價。
