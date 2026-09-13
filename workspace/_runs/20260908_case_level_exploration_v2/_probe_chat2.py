# coding: utf-8
from pathlib import Path
import pandas as pd
import json

OUT = Path(r"D:\DA\Nonsta_Valueadded_Combined\workspace\_runs\20260908_case_level_exploration_v2")
chat = Path(r"D:\DA\待整理\value_added_realted\两个群_20260421-20260801_非标增值讨论_任一艾特命中.xlsx")
xl = pd.ExcelFile(chat)
info = {"sheets": xl.sheet_names, "detail_cols": None, "nrows": None, "sample": None}
# find detail sheet
detail_name = None
for n in xl.sheet_names:
    cols = list(pd.read_excel(chat, sheet_name=n, nrows=0).columns)
    if "对话详情" in cols or any("对话" in str(c) for c in cols):
        detail_name = n
        info["detail_cols"] = cols
        break
if detail_name is None:
    detail_name = xl.sheet_names[-1]
    info["detail_cols"] = list(pd.read_excel(chat, sheet_name=detail_name, nrows=0).columns)

df = pd.read_excel(chat, sheet_name=detail_name, dtype=object)
info["detail_sheet"] = detail_name
info["nrows"] = len(df)
# rename map candidate
sample = {}
for c in df.columns:
    v = df.iloc[0][c]
    s = "" if pd.isna(v) else str(v)
    sample[c] = {"len": len(s), "head": s[:200]}
info["sample_row0"] = sample
# count non-empty conversation
conv_col = [c for c in df.columns if "对话" in str(c)][0]
info["conversation_col"] = conv_col
info["conversation_nonempty"] = int(df[conv_col].notna().sum())
# thread id col
tid_col = [c for c in df.columns if "讨论ID" in str(c) or str(c).lower()=="threadid"][0]
info["thread_col"] = tid_col
info["unique_threads"] = int(df[tid_col].nunique())
(OUT / "_chat_probe.json").write_text(json.dumps(info, ensure_ascii=False, indent=2), encoding="utf-8")
print("wrote", OUT / "_chat_probe.json")
print("detail", detail_name, "rows", len(df), "cols", info["detail_cols"])
