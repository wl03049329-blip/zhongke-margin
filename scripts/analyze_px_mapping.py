"""Inspect PX sales source rows against the site's product master.

Usage:
    python scripts/analyze_px_mapping.py <converted-xlsx>

The source workbook is read only. This audit intentionally reports identifier
conflicts instead of silently preferring a fuzzy name match.
"""

from __future__ import annotations

import difflib
import pathlib
import re
import sys
import unicodedata
import json

import pandas as pd


PRODUCT_RE = re.compile(
    r'\{name:"([^"]*)",code:"([^"]*)",barcode:"([^"]*)",cost:([0-9.]+)\}'
)

PERIODS = ["2024/12"] + [f"2025/{month:02d}" for month in range(1, 13)] + [
    f"2026/{month:02d}" for month in range(1, 9)
]

# Verified name-based mappings. Excel row numbers are one-based as displayed by Excel.
# Rows with a conflicting identifier are intentionally excluded and listed separately.
SAFE_MAPPINGS = {
    "OP安全無毒耐熱袋(小)PX(二)": 26,
    "OP安全無毒耐熱袋(中)PX(二)": 25,
    "OP生物抗菌密封袋M(PX)": 31,
    "OP生物抗菌密封袋L(PX)": 30,
    "OP生物分解抗菌密封袋XL": 32,
    "OP抗菌立體密封袋M+L": 28,
    "OP長效抗菌立體密封袋M": 27,
    "OP生物分解抗菌立體密封袋S": 29,
    "OP生物分解保鮮膜360尺(20入)": 33,
    "OP植材抗菌保鮮膜300尺": 34,
    "OP無雙酚A鋁箔800公分-12入": 23,
    "OP無雙酚A鋁箔1500公分-12入": 24,
    "OP無雙酚A料理紙32M(12入)": 21,
    "OP無漂白料理紙7M(加量)": 22,
    "OP環保舒適手套-綠茶香氛M(橘)": 45,
    "OP環保舒適手套-綠茶香氛L(橘)": 46,
    "OP超音波馬卡龍瞬吸布PX": 52,
    "OP檸檬清新抗菌瞬吸布": 53,
    "德適淨濕拖巾-薰衣草": 55,
    "德適淨濕拖巾-雪松清香": 57,
    "德適淨濕拖巾-海洋清新": 56,
    "OP柑橘抗菌EX菜瓜布(三)": 40,
    "OP抗菌木漿棉": 43,
    "檸檬馬鞭草菜瓜布-萬用速淨4入": 42,
    "OP生物分解濾水網80入": 36,
    "OP咖啡渣淨味濾水網80入(PX)": 37,
    "Amaze大地擴香-甜橘玫瑰果": 14,
    "AMAZE經典擴香-雪松中性淡香水": 16,
    "AMAZE經典擴香-白麝香琥珀淡香水": 15,
    "AMAZE 礦石香氛包-雪松中性淡香水": 10,
    "AMAZE 礦石香氛包-白麝香琥珀淡香水": 9,
    "Amaze礦石香氛-玫瑰淡香水": 11,
    "礦石香氛-沁藍海洋淡香水": 12,
    "礦石香氛-月光舒眠薰衣草": 13,
    "香氛豆補充包-玫瑰淡香水(二)": 19,
    "香氛豆補充包-海洋中性白麝香(二)": 20,
    "香氛豆-粉紅甜蜜果香淡香水": 17,
    "香氛豆-鳶尾粉邂逅淡香水": 18,
    "OP日本愛宕柿小蘇打(二)": 2,
    "OP愛岩柿消臭噴霧-抗病毒EX(黃)": 3,
    "OP抗菌消臭噴霧-清新海洋": 4,
    "茶酚淨洗潔精-清雅茶香(黃)": 5,
    "茶酚淨洗潔精-檸檬茶萃(黃)": 6,
    "茶酚淨洗潔精補充包-茶香(黃)": 7,
    "德適淨十抗菌酒精擦(PX)": 54,
    "凝膠型除濕袋-雪松清香": 8,
    "OP指尖強化手套-薰衣紫M": 47,
    "OP指尖強化手套-薰衣紫L": 48,
}

CONFLICT_MAPPINGS = {
    "OP專科防臭袋S": {"name_row": 39, "identifier_row": 24},
    "OP專科防臭袋M": {"name_row": 38, "identifier_row": 25},
    "OP加長保護手套耐用強化 M": {"name_row": 51, "identifier_row": 39},
    "OP環保舒適手套-綠茶香氛S": {"name_row": 44, "identifier_row": 45},
    "OP細柔無砂海綿菜瓜布": {"name_row": 41, "identifier_row": 35},
}


def normalize_name(value: str) -> str:
    normalized = unicodedata.normalize("NFKC", value).lower()
    normalized = normalized.replace("公克", "g").replace("公分", "cm").replace("毫升", "ml")
    return re.sub(r"[\s\-_－—–/／()（）\[\]【】,.，。:：;；+＋*＊xX×]+", "", normalized)


def scalar_id(value: object) -> str:
    if pd.isna(value):
        return ""
    text = str(value).strip()
    return text[:-2] if text.endswith(".0") else text


def build_data(frame: pd.DataFrame, products: list[dict[str, object]]) -> dict[str, object]:
    product_names = {str(product["name"]) for product in products}
    missing = set(SAFE_MAPPINGS) - product_names
    if missing:
        raise ValueError(f"Mappings reference unknown site products: {sorted(missing)}")
    records = {}
    for site_name, excel_row in SAFE_MAPPINGS.items():
        row = frame.iloc[excel_row - 1]
        sales = [None if pd.isna(value) else float(value) for value in row.iloc[7:28]]
        sales = [int(value) if value is not None and value.is_integer() else value for value in sales]
        records[site_name] = {
            "sourceRow": excel_row,
            "sourceName": str(row.iloc[2]).strip(),
            "matchMethod": "normalized_name",
            "pxMargin": None if pd.isna(row.iloc[3]) else float(row.iloc[3]),
            "warehouse": None if pd.isna(row.iloc[4]) else str(row.iloc[4]).strip(),
            "listingRate": None if pd.isna(row.iloc[5]) else float(row.iloc[5]),
            "stores": None if pd.isna(row.iloc[6]) else int(row.iloc[6]),
            "sales": sales,
        }
    return records


def main() -> None:
    if len(sys.argv) not in {2, 3}:
        raise SystemExit("Expected the converted PX source workbook path and optional --emit-data.")

    site_html = pathlib.Path("index.html").read_text(encoding="utf-8")
    products = [
        {"name": name, "code": code, "barcode": barcode, "cost": float(cost)}
        for name, code, barcode, cost in PRODUCT_RE.findall(site_html)
    ]
    frame = pd.read_excel(sys.argv[1], sheet_name="PX實銷 ", header=None, dtype=object)
    if sys.argv[-1] == "--emit-data":
        records = build_data(frame, products)
        rows = [
            [
                site_name,
                record["sourceRow"],
                record["sourceName"],
                record["pxMargin"],
                record["warehouse"],
                record["listingRate"],
                record["stores"],
                record["sales"],
            ]
            for site_name, record in records.items()
        ]
        print("// PX sales supplemental data")
        print("// Source: @PX實銷_0902.xls / sheet: PX實銷")
        print("// Generated from verified mappings; null preserves source blanks.")
        print(f"window.PX_SALES_PERIODS=Object.freeze({json.dumps(PERIODS, ensure_ascii=False, separators=(',', ':'))});")
        print(f"const PX_SALES_ROWS={json.dumps(rows, ensure_ascii=False, separators=(',', ':'))};")
        print("window.PX_SALES_DATA=Object.freeze(Object.fromEntries(PX_SALES_ROWS.map(([name,sourceRow,sourceName,pxMargin,warehouse,listingRate,stores,sales])=>[name,Object.freeze({sourceRow,sourceName,matchMethod:'normalized_name',pxMargin,warehouse,listingRate,stores,sales:Object.freeze(sales)})])));")
        return
    source_rows = []
    for index in range(1, len(frame)):
        name = frame.iat[index, 2]
        if pd.isna(name) or str(name).strip() == "PX 實銷 x上架率 x前毛%":
            continue
        if not frame.iloc[index, 7:28].notna().any():
            continue
        source_rows.append(
            {
                "row": index + 1,
                "code": scalar_id(frame.iat[index, 0]),
                "barcode": scalar_id(frame.iat[index, 1]),
                "name": str(name).strip(),
            }
        )

    print(f"site_products={len(products)} source_products={len(source_rows)}")
    for product in products:
        direct = [
            row
            for row in source_rows
            if (product["barcode"] and row["barcode"] == product["barcode"])
            or (product["code"] and row["code"] == product["code"])
        ]
        ranked = sorted(
            (
                (
                    difflib.SequenceMatcher(
                        None, normalize_name(product["name"]), normalize_name(row["name"])
                    ).ratio(),
                    row,
                )
                for row in source_rows
            ),
            key=lambda candidate: candidate[0],
            reverse=True,
        )
        print(f"\nSITE\t{product['code']}\t{product['barcode']}\t{product['name']}")
        print(
            "DIRECT\t"
            + " | ".join(
                f"R{row['row']} {row['code']} {row['barcode']} {row['name']}" for row in direct
            )
        )
        print(
            "TOP\t"
            + " | ".join(
                f"{score:.3f} R{row['row']} {row['name']}" for score, row in ranked[:3]
            )
        )


if __name__ == "__main__":
    main()
