# coding: utf-8
from pathlib import Path
import pandas as pd

xlsx = Path(r"D:\DA\Nonsta_Valueadded_Combined\workspace\data\raw\全量_增值单接口口径事实补齐.xlsx")
xl = pd.ExcelFile(xlsx)
print("SHEETS:", xl.sheet_names)
for name in xl.sheet_names:
    df = pd.read_excel(xlsx, sheet_name=name, dtype=object)
    print(f"\n=== SHEET: {name} | rows={len(df)} cols={len(df.columns)} ===")
    for c in df.columns:
        print(f"  - {c}")
    nn = df.notna().sum().sort_values(ascending=False)
    print("TOP filled:")
    for c, v in nn.head(25).items():
        print(f"  {c}: {int(v)}")
    print("BOTTOM filled:")
    for c, v in nn.tail(25).items():
        print(f"  {c}: {int(v)}")
    # sample one non-empty row keys of interest
    keys = [
        "orderNo", "sceneOverviewName", "serviceCode", "serviceName", "productName",
        "isAuditThrough", "status", "statusDesc", "sop", "requirementDescription",
        "vasDes", "auditTraceEventCode", "auditTraceSupplementDesc", "atoms",
        "atomAttributes", "attachments", "uploadedAttachments", "fileList",
    ]
    present = [k for k in keys if k in df.columns]
    print("KEY_PRESENT:", present)
    if len(df):
        row0 = df.iloc[0]
        for k in present:
            val = row0.get(k)
            s = "" if pd.isna(val) else str(val)
            print(f"  sample[{k}] len={len(s)} head={s[:120]!r}")
