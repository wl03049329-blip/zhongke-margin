"""Inspect PX sales source rows against the site's product master.

Usage:
    python scripts/analyze_px_mapping.py <converted-xlsx>

The source workbook is read only. Identifier matches must pass a product-name
validation gate before they are accepted. Explicit manual mappings are kept in
their own table so the original Excel rows and website product master remain
unchanged.
"""

from __future__ import annotations

import csv
import difflib
import io
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

# Verified normalized-name mappings. Excel row numbers are one-based as displayed
# by Excel. These 48 rows formed the original MATCHED set in the Version 3.5 audit.
NORMALIZED_NAME_MAPPINGS = {
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

# Explicit, reusable mappings for source rows whose names/specifications uniquely
# identify the website product while the source identifier columns are misaligned.
PX_MANUAL_PRODUCT_MAPPING = {
    "OP專科防臭袋S": {
        "source_name": "OP 專科防臭袋Ｓ－１００張",
        "reason": "高 — 商品類型與 S 尺寸唯一對應；來源識別碼卻指向無關的 1500cm 鋁箔列。",
    },
    "OP專科防臭袋M": {
        "source_name": "OP 專科防臭袋Ｍ－７０張",
        "reason": "高 — 商品類型與 M 尺寸唯一對應；來源識別碼卻指向無關的中型耐熱袋列。",
    },
    "OP加長保護手套耐用強化 M": {
        "source_name": "OP環保舒適手套-加長耐用強化M1雙",
        "reason": "高 — 手套類型、加長耐用描述與 M 尺寸唯一對應；來源識別碼卻指向防臭袋 S 列。",
    },
    "OP環保舒適手套-綠茶香氛S": {
        "source_name": "OP綠茶香氛手套S",
        "reason": "高 — 綠茶香氛與 S 尺寸唯一對應；來源 S 列識別碼空白，網站識別碼卻出現在來源 M 列。",
    },
    "OP細柔無砂海綿菜瓜布": {
        "source_name": "OP細柔無砂海棉菜瓜布４入",
        "reason": "高 — 細柔、無砂、海綿菜瓜布語意與規格唯一對應；來源識別碼卻指向無關的保鮮膜列。",
    },
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


def read_source_rows(frame: pd.DataFrame) -> list[dict[str, object]]:
    rows = []
    for index in range(1, len(frame)):
        name = frame.iat[index, 2]
        if pd.isna(name) or str(name).strip() == "PX 實銷 x上架率 x前毛%":
            continue
        if not frame.iloc[index, 7:28].notna().any():
            continue
        rows.append(
            {
                "row": index + 1,
                "code": scalar_id(frame.iat[index, 0]),
                "barcode": scalar_id(frame.iat[index, 1]),
                "name": str(name).strip(),
            }
        )
    return rows


def mapping_specs(
    source_rows: list[dict[str, object]],
) -> dict[str, dict[str, object]]:
    specs = {
        name: {"excel_row": excel_row, "method": "normalized_name"}
        for name, excel_row in NORMALIZED_NAME_MAPPINGS.items()
    }
    for name, details in PX_MANUAL_PRODUCT_MAPPING.items():
        candidates = [
            row
            for row in source_rows
            if normalize_name(str(row["name"]))
            == normalize_name(str(details["source_name"]))
        ]
        if len(candidates) != 1:
            raise ValueError(
                f"Manual mapping source must be unique for {name}: {len(candidates)} matches"
            )
        specs[name] = {
            "excel_row": candidates[0]["row"],
            "method": "manual_mapping",
            "reason": details["reason"],
        }
    return specs


def validate_identifier_candidate(
    product: dict[str, object], source: dict[str, object]
) -> bool:
    """Reject accidental identifier equality caused by shifted source columns.

    An identifier is usable only when the source and website product names remain
    semantically compatible. The current workbook has no identifier candidate
    that passes this validation gate.
    """
    same_identifier = bool(
        (product["barcode"] and source["barcode"] == product["barcode"])
        or (product["code"] and source["code"] == product["code"])
    )
    if not same_identifier:
        return False
    score = difflib.SequenceMatcher(
        None, normalize_name(str(product["name"])), normalize_name(str(source["name"]))
    ).ratio()
    return score >= 0.72


def resolve_mapping_specs(
    products: list[dict[str, object]], source_rows: list[dict[str, object]]
) -> dict[str, dict[str, object]]:
    """Resolve mappings in the documented identifier/manual/name priority."""
    curated = mapping_specs(source_rows)
    resolved = {}
    for product in products:
        site_name = str(product["name"])
        expected = curated.get(site_name)
        if expected is None:
            continue
        valid_barcodes = [
            row
            for row in source_rows
            if product["barcode"]
            and row["barcode"] == product["barcode"]
            and validate_identifier_candidate(product, row)
        ]
        valid_product_ids = [
            row
            for row in source_rows
            if product["code"]
            and row["code"] == product["code"]
            and validate_identifier_candidate(product, row)
        ]
        if len(valid_barcodes) == 1:
            resolved[site_name] = {
                "excel_row": valid_barcodes[0]["row"],
                "method": "valid_barcode",
            }
        elif len(valid_product_ids) == 1:
            resolved[site_name] = {
                "excel_row": valid_product_ids[0]["row"],
                "method": "valid_product_id",
            }
        elif site_name in PX_MANUAL_PRODUCT_MAPPING:
            resolved[site_name] = expected
        else:
            resolved[site_name] = expected
    return resolved


def build_data(frame: pd.DataFrame, products: list[dict[str, object]]) -> dict[str, object]:
    product_names = {str(product["name"]) for product in products}
    specs = resolve_mapping_specs(products, read_source_rows(frame))
    missing = set(specs) - product_names
    if missing:
        raise ValueError(f"Mappings reference unknown site products: {sorted(missing)}")
    records = {}
    for product in products:
        site_name = str(product["name"])
        if site_name not in specs:
            continue
        spec = specs[site_name]
        excel_row = int(spec["excel_row"])
        row = frame.iloc[excel_row - 1]
        sales = [None if pd.isna(value) else float(value) for value in row.iloc[7:28]]
        sales = [int(value) if value is not None and value.is_integer() else value for value in sales]
        records[site_name] = {
            "sourceRow": excel_row,
            "sourceName": str(row.iloc[2]).strip(),
            "matchMethod": str(spec["method"]),
            "pxMargin": None if pd.isna(row.iloc[3]) else float(row.iloc[3]),
            "warehouse": None if pd.isna(row.iloc[4]) else str(row.iloc[4]).strip(),
            "listingRate": None if pd.isna(row.iloc[5]) else float(row.iloc[5]),
            "stores": None if pd.isna(row.iloc[6]) else int(row.iloc[6]),
            "sales": sales,
        }
    return records


def build_audit_rows(
    source_rows: list[dict[str, object]], products: list[dict[str, object]]
) -> list[dict[str, object]]:
    product_by_name = {str(product["name"]): product for product in products}
    specs = resolve_mapping_specs(products, source_rows)
    final_by_row = {int(spec["excel_row"]): name for name, spec in specs.items()}
    normalized_rows = set(NORMALIZED_NAME_MAPPINGS.values())
    manual_rows = {
        int(specs[name]["excel_row"]) for name in PX_MANUAL_PRODUCT_MAPPING
    }
    audit = []
    for source in source_rows:
        excel_row = int(source["row"])
        site_name = final_by_row.get(excel_row, "")
        product = product_by_name.get(site_name)
        resolved_method = "" if not site_name else str(specs[site_name]["method"])
        if resolved_method == "valid_barcode":
            initial_status = "MATCHED"
            final_status = "MATCHED"
            method = "Valid Barcode"
            reason = "高 — 條碼相同，且名稱與規格 validation 通過。"
        elif resolved_method == "valid_product_id":
            initial_status = "MATCHED"
            final_status = "MATCHED"
            method = "Valid Product ID"
            reason = "高 — 商品編號相同，且名稱與規格 validation 通過。"
        elif excel_row in normalized_rows:
            initial_status = "MATCHED"
            final_status = "MATCHED"
            method = "Normalized Name"
            reason = "高 — 正規化後的商品名稱與規格可唯一對應。"
        elif excel_row in manual_rows:
            initial_status = "CONFLICT"
            final_status = "MATCHED"
            method = "Manual Mapping"
            reason = str(PX_MANUAL_PRODUCT_MAPPING[site_name]["reason"])
        else:
            initial_status = "UNMATCHED"
            final_status = "UNMATCHED"
            method = "None"
            reason = "目前網站 54 支商品中，沒有相同商品類型與規格的品項。"
        audit.append(
            {
                "Excel Row": excel_row,
                "Excel Original Product Name": source["name"],
                "Excel Product ID": source["code"],
                "Excel Barcode": source["barcode"],
                "Website Product Name": site_name,
                "Website Product Key / ID": "" if product is None else product["code"],
                "Website Barcode": "" if product is None else product["barcode"],
                "Match Method": method,
                "Initial Match Status": initial_status,
                "Match Status": final_status,
                "Match Confidence / Reason": reason,
            }
        )
    return audit


def emit_audit_csv(audit_rows: list[dict[str, object]]) -> None:
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=list(audit_rows[0]), lineterminator="\n")
    writer.writeheader()
    writer.writerows(audit_rows)
    print(output.getvalue(), end="")


def main() -> None:
    if len(sys.argv) not in {2, 3}:
        raise SystemExit(
            "Expected the converted PX source workbook path and optional --emit-data or --emit-audit."
        )

    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")

    site_html = pathlib.Path("index.html").read_text(encoding="utf-8")
    products = [
        {"name": name, "code": code, "barcode": barcode, "cost": float(cost)}
        for name, code, barcode, cost in PRODUCT_RE.findall(site_html)
    ]
    frame = pd.read_excel(sys.argv[1], sheet_name="PX實銷 ", header=None, dtype=object)
    source_rows = read_source_rows(frame)
    if sys.argv[-1] == "--emit-data":
        records = build_data(frame, products)
        rows = [
            [
                site_name,
                record["sourceRow"],
                record["sourceName"],
                record["matchMethod"],
                record["pxMargin"],
                record["warehouse"],
                record["listingRate"],
                record["stores"],
                record["sales"],
            ]
            for site_name, record in records.items()
        ]
        print("// PX sales supplemental data")
        print("// Source: @PX實銷_0902(1).xls / sheet: PX實銷")
        print("// Generated from validated mappings; null preserves source blanks.")
        print(f"window.PX_SALES_PERIODS=Object.freeze({json.dumps(PERIODS, ensure_ascii=False, separators=(',', ':'))});")
        print(f"const PX_SALES_ROWS={json.dumps(rows, ensure_ascii=False, separators=(',', ':'))};")
        print("window.PX_SALES_DATA=Object.freeze(Object.fromEntries(PX_SALES_ROWS.map(([name,sourceRow,sourceName,matchMethod,pxMargin,warehouse,listingRate,stores,sales])=>[name,Object.freeze({sourceRow,sourceName,matchMethod,pxMargin,warehouse,listingRate,stores,sales:Object.freeze(sales)})])));")
        return
    audit_rows = build_audit_rows(source_rows, products)
    if sys.argv[-1] == "--emit-audit":
        emit_audit_csv(audit_rows)
        return

    print(
        f"site_products={len(products)} source_products={len(source_rows)} "
        f"initial_matched={sum(row['Initial Match Status'] == 'MATCHED' for row in audit_rows)} "
        f"initial_unmatched={sum(row['Initial Match Status'] == 'UNMATCHED' for row in audit_rows)} "
        f"initial_conflict={sum(row['Initial Match Status'] == 'CONFLICT' for row in audit_rows)} "
        f"final_matched={sum(row['Match Status'] == 'MATCHED' for row in audit_rows)} "
        f"final_unmatched={sum(row['Match Status'] == 'UNMATCHED' for row in audit_rows)} "
        f"final_conflict={sum(row['Match Status'] == 'CONFLICT' for row in audit_rows)}"
    )
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
                f"R{row['row']} valid={validate_identifier_candidate(product, row)} "
                f"{row['code']} {row['barcode']} {row['name']}" for row in direct
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
