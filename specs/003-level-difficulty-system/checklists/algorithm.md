# 规格质量自检清单: 关卡算法与一致性 (Level & Difficulty)

**目的**: 验证“关卡与难度系统”需求的质量，确保算法定义的一致性与可测试性。
**创建时间**: 2026-01-23
**审查对象**: [spec.md](../spec.md)

## 需求完整性 (Requirement Completeness)

- [ ] CHK001 - 是否针对全部 11 款小游戏明确定义了各自特有的难度参数（如速度、密度、重力等）? [Gap, FR-001]
- [ ] CHK002 - 是否定义了“存档点”（Milestone）的触发频率（例如每 10 关一个存档）? [Completeness, FR-005]
- [ ] CHK003 - 对于 FR-004 的“混合模式”，是否明确区分了哪些游戏属于“离散关卡制”，哪些属于“无尽模式”? [Completeness, FR-004]
- [ ] CHK004 - 奖励倍率（FR-006）的计算公式或阶梯规则是否已文档化? [Gap, FR-006]
- [ ] CHK005 - 是否明确规定了随机种子（Seed）的生成来源（如系统时间、用户 ID）以确保可复现性? [Gap, FR-002]

## 需求清晰度 (Requirement Clarity)

- [ ] CHK006 - 成功准则 SC-002 中的“平滑函数曲线”是否有更具体的数学模型描述（如线性、指数）? [Ambiguity, SC-002]
- [ ] CHK007 - “无死局”（SC-001）的判定标准是否针对每种游戏类型进行了具体化规定? [Clarity, SC-001]
- [ ] CHK008 - 边缘情况中的“极端难度上限”是否量化了具体级别的数值边界? [Ambiguity, 边缘情况]
- [ ] CHK009 - “低端设备适配”的要求是否有具体的 FPS 目标值（如不低于 30FPS）? [Clarity, 边缘情况]

## 需求一致性 (Requirement Consistency)

- [ ] CHK010 - FR-004 的混合模式与 FR-005 的存档点机制在“无尽模式”下是否冲突? [Consistency, Gap]
- [ ] CHK011 - 关键实体中的 `PlayerSkillScore` 与 `DifficultyProfile` 之间的交互逻辑是否清晰? [Consistency]

## 场景覆盖 (Scenario Coverage)

- [ ] CHK012 - 是否定义了从“存档点”恢复时的初始化状态要求? [Coverage, FR-005]
- [ ] CHK013 - 针对“失败后放弃重试”的进度保存逻辑是否已规定? [Coverage, Gap]
- [ ] CHK014 - 是否规定了网络异常或非正常退出时的随机种子保护机制? [Coverage, Edge Case]

## 可衡量性 (Measurability)

- [ ] CHK015 - SC-003 中的“加载时间影响”是否有明确的测试基准环境? [Measurability, SC-003]
- [ ] CHK016 - SC-004 中的“留存提升 30%”是否建立了对比基线与观测周期? [Measurability, SC-004]
- [ ] CHK017 - “单次难度跳跃不超过 15%”的具体计算指标是否定义（如速度增量百分比）? [Measurability, SC-002]
