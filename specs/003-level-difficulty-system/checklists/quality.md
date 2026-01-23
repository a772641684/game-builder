# Checklist: 关卡与难度系统需求质量验证

**Purpose**: 本清单作为“需求的单元测试”，用于验证《特性说明书 [spec.md](../spec.md)》与《实施方案 [plan.md](../plan.md)》在描述关卡生成与难度梯度系统时的质量、完整性与严谨性。
**Created**: 2026-01-23

## 需求完整性 (Requirement Completeness)

- [x] CHK001 - 是否针对所有 11 款小游戏都明确定义了各自对应的“难度特征参数”（如速度、密度、障碍物数量等）？ [Completeness, Spec §FR-001]
- [x] CHK002 - 是否明确定义了“混合模式”下各游戏类型的归属分类（哪些是离散关卡制，哪些是无尽增量制）？ [Completeness, Spec §FR-004]
- [x] CHK003 - 是否定义了里程碑存档点在各游戏中的具体判定标准（如：高度、波数还是关卡数）？ [Gap, Spec §FR-005]
- [ ] CHK004 - 需求是否涵盖了玩家“重置进度”或“手动选择已解锁关卡”的相关说明？ [Gap]
- [x] CHK005 - 是否明确了难度加成对不同游戏结算指标（分数、金币、资源）的具体作用权重？ [Completeness, Spec §FR-006]

## 需求清晰度 (Requirement Clarity)

- [x] CHK006 - 需求中定义的“平滑函数曲线”是否包含具体的数学公式或可量化的斜率标准？ [Clarity, Spec §SC-002]
- [ ] CHK007 - 是否量化了各参数（如速度）在单次关卡提升时的“最大可接受跳跃幅度”？ [Clarity, Spec §SC-002]
- [x] CHK008 - “支持种子复现”是否有明确的数据结构要求（如种子长度、类型）以及存储时限？ [Clarity, Spec §边缘情况]
- [ ] CHK009 - 需求中提到的“可通关性 (SC-001)”是否针对不同类型的游戏定义了具体的判定基准（如：点线交织是否存在解，泡泡龙是否存在可消除路径）？ [Clarity, Spec §SC-001]

## 需求一致性 (Requirement Consistency)

- [ ] CHK010 - 不同游戏间的难度感官体验是否设定了对齐基准（例如：游戏 A 的 Level 10 与游戏 B 的 Level 10 难度感是否一致）？ [Consistency, Gap]
- [x] CHK011 - 里程碑存档逻辑与现有的 `StorageControl` 持久化策略是否保持一致，是否存在数据竞争？ [Consistency, Plan §技术背景]
- [x] CHK012 - 全局 HUD 显示的难度系数与各游戏内部 Control 脚本消费的参数是否引用同一套计算公式？ [Consistency, Plan §项目结构]

## 场景覆盖度 (Scenario Coverage)

- [ ] CHK013 - 是否针对“极高关卡 (Level 100+)”定义了行为预期，包括数值溢出预防或逻辑封顶机制？ [Coverage, Spec §边缘情况]
- [ ] CHK014 - 是否定义了在网络断开或异常退出时，当前关卡种子的保护与恢复策略？ [Gap, Exception Flow]
- [ ] CHK015 - 对于实时生成的动作类游戏，是否定义了在高性能消耗场景下的“降级生成策略”？ [Coverage, Spec §边缘情况]
- [ ] CHK016 - 需求是否规定了当 `DifficultyProfile` 发生配置变更时，对旧版本存量进度的处理方式？ [Gap, Assumption]

## 验收准则质量 (Acceptance Criteria Quality)

- [ ] CHK017 - “100% 确保可通关”这一准则是否提供了可用于自动测试的验证方法论？ [Measurability, Spec §SC-001]
- [ ] CHK018 - “耗时不得超过 200ms”是针对单次生成还是整个加载流程？测试环境基准是什么？ [Measurability, Spec §SC-003]
- [ ] CHK019 - “留存时长提升 30%”这一目标是否具备可追溯的埋点统计需求支持？ [Measurability, Spec §SC-004]

## 追踪性与冲突 (Traceability & Conflicts)

- [ ] CHK020 - 所有新引入的 `DifficultyProfile` 参数是否都在 `data-model.md` 中有对应的实体映射？ [Traceability, Plan §项目结构]
- [ ] CHK021 - 需求是否与现有的“复活”或“道具加成”逻辑存在潜在冲突（如：复活后难度是否应降低）？ [Conflict, Gap]
- [ ] CHK022 - 是否建立了需求 ID 与具体实现代码（或任务 ID）的双向追踪关系？ [Traceability]
