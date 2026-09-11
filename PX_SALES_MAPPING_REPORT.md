# PX DATA MAPPING CLEANUP

來源：`@PX實銷_0902(1).xls`，工作表 `PX實銷 `，資料期間 2024/12～2026/08。

完整逐筆 Audit：`PX_SALES_MAPPING_AUDIT.csv`。Website Product Key / ID 使用網站商品主檔的 `code`；網站目前沒有另一組獨立內部 key。

## MAPPING AUDIT

### 初始稽核（人工 Mapping 前）

- TOTAL EXCEL PRODUCTS：58
- MATCHED：48
- UNMATCHED：5
- CONFLICT：5
- 核對式：48 + 5 + 5 = 58

### 最終稽核（套用人工 Mapping 後）

- TOTAL EXCEL PRODUCTS：58
- MATCHED：53
- UNMATCHED：5
- CONFLICT：0

### Match Method

- Valid Barcode：0
- Valid Product ID：0
- Manual Mapping：5
- Normalized Name：48

來源 Excel 的商品代號／條碼欄存在結構性錯位。相同數字必須同時指向已由名稱與規格獨立確認的來源列，才算 Valid Barcode / Valid Product ID。本次所有直接識別碼候選都未通過此 validation，因此不採用任何偶然相同的數字。

## A. 初始 48 支 MATCHED

- OP 日本愛宕柿小蘇打1kg → OP日本愛宕柿小蘇打(二)
- OP 愛岩柿除菌消臭噴霧-抗病毒EX/400ml → OP愛岩柿消臭噴霧-抗病毒EX(黃)
- OP 抗菌消臭防螨噴霧-清新海洋400ml → OP抗菌消臭噴霧-清新海洋
- OP 茶酚淨洗潔精-清雅茶香1000公克 → 茶酚淨洗潔精-清雅茶香(黃)
- OP 茶酚淨洗潔精-檸檬茶萃1000公克 → 茶酚淨洗潔精-檸檬茶萃(黃)
- OP 茶酚淨洗潔精補充包-清雅茶香800g → 茶酚淨洗潔精補充包-茶香(黃)
- ＯＰ凝膠型吊掛除濕袋雪松清香120g＊2入 → 凝膠型除濕袋-雪松清香
- AMAZE礦石香氛包－白麝香琥珀淡香水20g＊3包 → AMAZE 礦石香氛包-白麝香琥珀淡香水
- AMAZE礦石香氛包－雪松中性淡香水20g＊3包 → AMAZE 礦石香氛包-雪松中性淡香水
- AMAZE礦石香氛包－玫瑰淡香水20公克x3入 → Amaze礦石香氛-玫瑰淡香水
- AMAZE礦石香氛包－沁藍海洋淡香水20g*3包 → 礦石香氛-沁藍海洋淡香水
- AMAZE礦石香氛包－月光舒眠薰衣草20g＊3包 → 礦石香氛-月光舒眠薰衣草
- AMAZE大地擴香－甜橘玫瑰果90ｍl → Amaze大地擴香-甜橘玫瑰果
- AMAZE經典擴香－白麝香琥珀淡香水100ml → AMAZE經典擴香-白麝香琥珀淡香水
- AMAZE經典擴香－雪松中性淡香水 → AMAZE經典擴香-雪松中性淡香水
- AMAZE香氛豆補充包－粉紅甜蜜果香淡香水280ml → 香氛豆-粉紅甜蜜果香淡香水
- AMAZE香氛豆補充包－鳶尾粉邂逅淡香水280ml → 香氛豆-鳶尾粉邂逅淡香水
- AMAZE香氛豆補充包－玫瑰淡香350ml → 香氛豆補充包-玫瑰淡香水(二)
- AMAZE香氛豆補充包－海洋白麝香350ml → 香氛豆補充包-海洋中性白麝香(二)
- OP 無雙酚Ａ料理紙30cm*32m → OP無雙酚A料理紙32M(12入)
- OP 無漂白原色料理紙３０ｘ７００公分 → OP無漂白料理紙7M(加量)
- OP 無雙酚A鋁箔30cm*800cm → OP無雙酚A鋁箔800公分-12入
- OP 無雙酚A鋁箔1500cm → OP無雙酚A鋁箔1500公分-12入
- OP 生物分解耐熱袋－中160入 → OP安全無毒耐熱袋(中)PX(二)
- OP 生物分解耐熱袋－小200入 → OP安全無毒耐熱袋(小)PX(二)
- OP 抗菌立體密封袋－M 19*17*7cm → OP長效抗菌立體密封袋M
- OP 生物分解抗菌立體密封袋－M+L20入 → OP抗菌立體密封袋M+L
- OP 生物分解抗菌立體密封袋－S (16*15*6cm)38入 → OP生物分解抗菌立體密封袋S
- OP 生物分解抗菌密封袋－Ｌ( 28*28公分） 17入 → OP生物抗菌密封袋L(PX)
- OP生物分解抗菌密封袋－Ｍ ( 19*20.5公分 ) 29入 → OP生物抗菌密封袋M(PX)
- OP 生物分解抗菌密封袋－XL (30*40公分) 11入 → OP生物分解抗菌密封袋XL
- OP 生物分解保鮮膜360尺*30公分 → OP生物分解保鮮膜360尺(20入)
- OP 植材來源無氯抗菌保鮮膜30公分*300尺1支 → OP植材抗菌保鮮膜300尺
- OP 生物分解濾水網80入 → OP生物分解濾水網80入
- OP 咖啡渣淨味濾水網80入 → OP咖啡渣淨味濾水網80入(PX)
- OP柑橘抗菌菜瓜布(4入) → OP柑橘抗菌EX菜瓜布(三)
- OP檸檬馬鞭草海綿菜瓜布4入 → 檸檬馬鞭草菜瓜布-萬用速淨4入
- OP抗菌木漿棉2入 → OP抗菌木漿棉
- OP綠茶香氛手套M → OP環保舒適手套-綠茶香氛M(橘)
- OP綠茶香氛手套L → OP環保舒適手套-綠茶香氛L(橘)
- OP指尖強化手套-薰衣紫 M → OP指尖強化手套-薰衣紫M
- OP指尖強化手套-薰衣紫 L → OP指尖強化手套-薰衣紫L
- OP超音波馬卡龍瞬吸布－４入（30公分＊30公分） → OP超音波馬卡龍瞬吸布PX
- OP檸檬清新抗菌瞬吸布 → OP檸檬清新抗菌瞬吸布
- 德適淨十抗菌酒精擦90抽 → 德適淨十抗菌酒精擦(PX)
- 德適淨十抗病毒濕拖巾-薰衣草 → 德適淨濕拖巾-薰衣草
- 德適淨十抗病毒濕拖巾-海洋清新 → 德適淨濕拖巾-海洋清新
- 德適淨十抗病毒濕拖巾-雪松清香 → 德適淨濕拖巾-雪松清香

## B. 初始 5 支 UNMATCHED

- OP 專科抗菌保鮮膜30公分*420尺（來源列 35）
- OP檸檬細絨香氛手套M（來源列 49）
- OP檸檬香氛細絨手套Ｌ（來源列 50）
- OP 無雙酚Ａ摺疊保鮮盒－８００ｍｌ（來源列 61）
- OP 無雙酚Ａ摺疊保鮮盒－１２００ｍｌ（來源列 62）

這 5 筆在先前 repo 報告的「Excel 未對應網站商品」章節已存在，但先前聊天回報的 `UNRESOLVED PRODUCT MAPPING` 只摘要了識別碼衝突與網站缺來源商品，沒有把 Excel-only 的 UNMATCHED 另外列出。此次已將三種狀態拆開並逐筆輸出。

## C. 初始 5 支 CONFLICT 與人工比對

### 1. OP專科防臭袋S

- Excel 名稱：OP 專科防臭袋Ｓ－１００張
- Website 名稱：OP專科防臭袋S
- Excel 條碼：4710660882378
- Website 條碼：4710660886819
- Excel 商品編號：86080018
- Website 商品編號：59060175
- 名稱差異：空白／全形字元與 Excel 多出 100 張包裝規格；商品類型及 S 尺寸一致。
- 衝突原因：Website 編號／條碼出現在 Excel 第 24 列「OP 無雙酚A鋁箔1500cm」，不是防臭袋。
- Recommended Mapping：Excel 第 39 列 → OP專科防臭袋S（唯一、高度確定）。

### 2. OP專科防臭袋M

- Excel 名稱：OP 專科防臭袋Ｍ－７０張
- Website 名稱：OP專科防臭袋M
- Excel 條碼：4710660884808
- Website 條碼：4710660886802
- Excel 商品編號：65051089
- Website 商品編號：59060174
- 名稱差異：空白／全形字元與 Excel 多出 70 張包裝規格；商品類型及 M 尺寸一致。
- 衝突原因：Website 編號／條碼出現在 Excel 第 25 列「OP 生物分解耐熱袋－中160入」，不是防臭袋。
- Recommended Mapping：Excel 第 38 列 → OP專科防臭袋M（唯一、高度確定）。

### 3. OP加長保護手套耐用強化 M

- Excel 名稱：OP環保舒適手套-加長耐用強化M1雙
- Website 名稱：OP加長保護手套耐用強化 M
- Excel 條碼：4710660883801
- Website 條碼：4710660882378
- Excel 商品編號：65013460
- Website 商品編號：86080018
- 名稱差異：Excel 有「環保舒適」與 1 雙；Website 使用「加長保護」，兩者都有加長、耐用強化、M。
- 衝突原因：Website 編號／條碼出現在 Excel 第 39 列「OP 專科防臭袋Ｓ－１００張」，不是手套。
- Recommended Mapping：Excel 第 51 列 → OP加長保護手套耐用強化 M（唯一、高度確定）。

### 4. OP環保舒適手套-綠茶香氛S

- Excel 名稱：OP綠茶香氛手套S
- Website 名稱：OP環保舒適手套-綠茶香氛S
- Excel 條碼：空白
- Website 條碼：4710660888066
- Excel 商品編號：空白
- Website 商品編號：65051312
- 名稱差異：Website 多出「環保舒適」；香味與 S 尺寸完全一致。
- 衝突原因：Excel S 列識別碼空白；Website 編號／條碼出現在 Excel 第 45 列的綠茶香氛手套 M，尺寸不符。
- Recommended Mapping：Excel 第 44 列 → OP環保舒適手套-綠茶香氛S（S/M/L 可唯一區分，高度確定）。

### 5. OP細柔無砂海綿菜瓜布

- Excel 名稱：OP細柔無砂海棉菜瓜布４入
- Website 名稱：OP細柔無砂海綿菜瓜布
- Excel 條碼：4710660882590
- Website 條碼：4710660887076
- Excel 商品編號：65051094
- Website 商品編號：65020125
- 名稱差異：「海棉／海綿」字形差異，Excel 多出 4 入規格。
- 衝突原因：Website 編號／條碼出現在 Excel 第 35 列「OP 專科抗菌保鮮膜30公分*420尺」，不是菜瓜布。
- Recommended Mapping：Excel 第 41 列 → OP細柔無砂海綿菜瓜布（唯一、高度確定）。

## Manual Mapping Added

獨立 mapping table：`PX_MANUAL_PRODUCT_MAPPING`，位於 `scripts/analyze_px_mapping.py`。

- Excel 第 39 列 → OP專科防臭袋S
- Excel 第 38 列 → OP專科防臭袋M
- Excel 第 51 列 → OP加長保護手套耐用強化 M
- Excel 第 44 列 → OP環保舒適手套-綠茶香氛S
- Excel 第 41 列 → OP細柔無砂海綿菜瓜布

實際優先順序為：Valid Barcode → Valid Product ID → Explicit Manual Mapping → Normalized Name。Barcode / Product ID 必須先通過名稱與規格相容性 validation。

## Still Unmatched

- OP 專科抗菌保鮮膜30公分*420尺
- OP檸檬細絨香氛手套M
- OP檸檬香氛細絨手套Ｌ
- OP 無雙酚Ａ摺疊保鮮盒－８００ｍｌ
- OP 無雙酚Ａ摺疊保鮮盒－１２００ｍｌ

## Still Conflict

- 無。原 5 支衝突均已用唯一且高度確定的人工 Mapping 解決。

## Website Products Without PX Source

- OP天然棉紗布(3片入)

確認結果：網站商品主檔存在此商品，但 `@PX實銷_0902(1).xls` 的 58 支有月份實銷商品中完全沒有這支商品。網站保留原成本主檔；PX DATA 與全聯毛利率（前毛）顯示「—」，不建立或推算假資料。

## Data Integrity

- Existing cost data unchanged：PASS
- Existing margin formulas unchanged：PASS
- PX sales raw data unchanged：PASS
- Pre-launch null unchanged：PASS
- Existing product count unchanged：PASS（54）

## 資料處理規則

- 不修改 Excel 原始資料、網站商品名稱、商品代號、條碼或成本主檔。
- 月份空白保留為 `null`，不轉為 0。
- 上市月份取第一個有效 numeric value（包含真正的 0）。
- 上市後的 0 納入平均、YoY 防護與趨勢圖。
- 找不到安全 Mapping 時，不影響原商品搜尋、成本帶入與毛利試算。
