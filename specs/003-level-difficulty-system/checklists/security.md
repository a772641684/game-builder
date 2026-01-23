# Checklist: 数据安全与数值诚信需求质量验证

**Purpose**: 本清单作为“需求的单元测试”，专门验证《特性说明书 [spec.md](../spec.md)》中关于存储安全、防止作弊以及数值产出诚信的需求定义。
**Target Audience**: 安全审计员 / 后端开发 (如涉及同步)
**Focus Areas**: 数值防篡改、奖励逻辑安全、存档一致性

## 数值产出安全性 (Reward Security)

- [x] CHK001 - 是否明确定义了“倍率加成”的最大硬性上限，以防止因配置错误导致的数值通胀？ [Clarity, Spec §FR-006]
- [ ] CHK002 - 需求是否规定了对“非法跳关”判定的逻辑（例如：玩家从未通过 Level 10 却直接在存中标记为 Level 50）？ [Coverage, Gap]
- [ ] CHK003 - 针对 `RewardState` 实体，是否定义了在单局内的“产出审计”逻辑，确保获得的分数与当前难度等级是匹配的？ [Completeness, Spec §关键实体]
- [ ] CHK004 - 需求是否描述了如何处理“本地时间篡改”对离线资源产出/难度恢复周期的影响？ [Edge Case, Gap]

## 存储与存档完整性 (Persistence Integrity)

- [ ] CHK005 - 是否定义了存档数据的“校验和 (Checksum)”或简单的加密需求，以防止玩家通过直接编辑 `localStorage` 修改难度进度？ [Gap, Plan §技术背景]
- [ ] CHK006 - 需求中是否涵盖了“存档冲突”时的解决策略（如：本地 Level 50 与设备 B 上云端的 Level 30 发生冲突时，以哪个为准）？ [Gap, Consistency]
- [ ] CHK007 - 是否明确了难度里程碑解锁的“不可逆性”需求，或者是否允许因作弊嫌疑而重置进度？ [Clarity, Spec §FR-005]

## 算法逻辑安全 (Algorithm Integrity)

- [ ] CHK008 - 是否要求对随机生成算法使用的“系统时间种子”进行混淆或偏移，防止玩家提前预测关卡布局？ [Security, Spec §FR-002]
- [ ] CHK009 - 需求是否规定了在“高倍率结算”时必须进行二次服务器校验（如果具备联网能力）？ [Gap, Limitation]
- [ ] CHK010 - 是否定义了对“作弊器/变速工具”的被动检测需求（如：单位时间内的操作频次是否超过了难度限制下的物理极值）？ [Gap, Exception Flow]
