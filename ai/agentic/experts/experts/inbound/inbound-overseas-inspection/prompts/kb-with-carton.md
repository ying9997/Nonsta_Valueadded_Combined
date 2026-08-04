# 海外验 - 有箱单模式（OW01031）

## 模式说明

- PSC：**OW01031**（海外验-有箱单）
- 客户提交完整装箱单（Packing List），仓库按箱单验货
- 验货由 Winit 全程执行，客户被动等待

## 状态机映射

| OMS 状态 | 海外验阶段 | 说明 |
|----------|-----------|------|
| TS | not_arrived | 头程在途，海外验尚未开始 |
| PEWC + Pending | awaiting_inspection | 已到仓，排队待验 |
| PEWC + InProgress | in_progress | 验货进行中（OMS 粗粒度）|
| EWC / dicDate 有值 | completed | 验货完成，入库确认 |

## 典型时效（工作日）

- 到仓（awhDate）→ 验货完成（dicDate）：约 **3-5 个工作日**
- 超 KB 参考时效 2 倍且仍为 awaiting/in_progress → 建议升级人工

## PEWC 等待常见原因

- 验货排队（高峰期）
- 箱单信息待核对
- 异常单阻塞（isAbnormal=true）

## 对客要点

- 有箱单模式进度以 OMS 状态 PEWC→EWC 为准
- WMS 开箱/点数细粒度进度当前不可查
- 不承诺验货完成时间
