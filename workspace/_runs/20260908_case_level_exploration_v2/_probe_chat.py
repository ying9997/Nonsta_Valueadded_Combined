# coding: utf-8
from pathlib import Path
import pandas as pd
chat = Path(r"D:\DA\待整理\value_added_realted\两个群_20260421-20260801_非标增值讨论_任一艾特命中.xlsx")
xl = pd.ExcelFile(chat)
print("SHEETS", xl.sheet_names)
for n in xl.sheet_names:
    df = pd.read_excel(chat, sheet_name=n, nrows=2, dtype=object)
    print("\n==", n, "cols", list(df.columns))
    print(df.head(1).to_dict(orient="records")[:1])
# also OMS excel mapping sheet cols already known
omsx = Path(r"D:\DA\Nonsta_Valueadded_Combined\workspace\data\raw\全量_增值单接口口径事实补齐.xlsx")
m = pd.read_excel(omsx, sheet_name="讨论-增值单映射", nrows=3, dtype=object)
print("\nMAP cols", list(m.columns))
print(m.head(2).to_dict(orient="records"))
