# 公開價格雷達

目前正式支援 29 支公開商品（保鮮膜 14、鋁箔 8、料理紙 7）。商品別名與規格搜尋設定詳見 PRICE_CATALOG.md。以下首批驗證記錄保留作來源背景。

## Source feasibility

正式通路為「萬家福線上購物」，官方入口 https://www.uni-prosperity.com.tw/ 與線上商店 https://online.uni-prosperity.com.tw/ 的通路及營運者資訊一致。不是名稱近似的其他商店。公開搜尋「保鮮膜」找到楓康與妙潔共 12 個商品頁；首批固定追蹤 4 個已驗證商品頁，並不宣稱已涵蓋所有競品。

本機及 GitHub Actions 皆成功讀取這 4 個公開頁面。雲端來源驗證：https://github.com/wl03049329-blip/zhongke-margin/actions/runs/36738758680 。使用商品 HTML 的 Product/Offer JSON-LD，交叉檢查 h1 名稱、畫面價格、TWD 幣別及實際包裝規格，原價來自頁面的 original-p；促銷原文與庫存另存。無登入、無 CAPTCHA、無私人 token、無內部 API。robots.txt 禁止內部及帳號等路徑，不禁止目前的公開商品路徑；每次先檢查 robots，失敗即不抓取。遇到限制、改版或不明規格保留最後正常價格，不绕過限制。來源未提供楓康 60M 的寬度，因此每㎡為 null。

## 更新與資料

`competitor-sources.json` 集中管理公開商品 URL。`competitor-category-map.json` 只映射已確認的 OP 保鮮膜品號 86210115、63012168。競品主檔、價格、歷史、PX 資料互相獨立。

- 每日台北 08:00 / 18:00（UTC 00:00 / 10:00）及 workflow_dispatch；GitHub 排程可能延遲，不保證整點。
- 來源逐頁 20 秒 timeout、間隔 1 秒；不得高頻抓取、不得自動繞過挑戰。
- 價格、促銷、規格、庫存等實質變動才 commit snapshots。每次檢查的新時間與失敗狀態寫入 `competitor-runtime.json`，隨 Pages artifact 部署，不為純時間建立 commit。下次執行從自己的公開站取回 runtime。
- 歷史只於首次取得或價格／促銷變動追加。只有庫存或規格改變不追加價格歷史。
- Pages 使用 Actions 靜態部署；runtime 與當次來源／驗證 audit 同時留作 Actions artifact。
- Frontend 只讀本網站 JS / JSON，不跨站 fetch 零售來源。<=24h 新鮮，24–72h 待更新，>72h 明示過期，失敗保留價格及最後成功時間。
- 單價依包裝總長、總面積計算，內部原精度；UI 最多兩位、去尾零。條件式滿額券不扣到單價；模糊促銷均價為 null。

## Manual fallback / importer

執行 `node scripts/competitor-price-import.cjs <file.json|file.csv>`。JSON 是商品陣列；CSV 第一列為欄名，支援引號與 BOM。

必要欄位：retailer、brand、productName、category（CLING_FILM、FOIL、BAKING_PAPER）、specText、currentPrice（正數）、sourceUrl（公開 HTTPS）、observedAt（實際查核 ISO 時間）。選填 retailerProductId、originalPrice、promotionText、availability、material。人工匯入標為 MANUAL。價格必須實際查核，沒有來源／未提供價格不得匯入。不要把範例價格當正式資料。一般單卷來源可用 `30cm×60m／1入`，三入必須明示 `30cm×30m／3入`；未知寬度或長度保留原文、換算為 null。禁止猜包裝數或材質。

`COMPETITOR_VALIDATION.json` 是本機驗證快照；每次自動工作的新 report 在 Actions artifact。單筆錯誤不讓整批崩潰，既有正常價格不清空。維護者應查閱失敗 artifact，若來源長期不支援則停用該 URL 的自動抓取，改人工查核。

## 驗證

`node tests/competitor-prices.cjs --unit`：規格、單價、價格分離、來源 parser、驗證、CSV、穩定 ID、時間隔離、history、失敗保留。

`node tests/competitor-prices.cjs`：另加搜尋／category association／排序／來源連結／手機／overflow／console／既有資料與 inline 計算完整性。Windows browser tests 使用此工作站的 bundled Playwright + Chrome。

既有 campaign、november、period-comparison、web-regression 測試均須通過。`PX_LIVE` 可指定正式站，在 fresh browser context 重跑正式驗收。
