# Checklist: UX/UI 需求质量验证

**Purpose**: 本清单作为“需求的单元测试”，重点验证《特性说明书 [spec.md](../spec.md)》在玩家体验、反馈机制与视觉表现层面的需求定义质量。
**Target Audience**: 特性作者/产品评审 (Author/PO)
**Focus Areas**: 难度反馈、UI 数据对齐、进度感

## 难度视觉反馈 (Visual Feedback)

- [ ] CHK001 - 是否明确定义了“难度等级提升”时在 UI 上的动效或提示需求（如：文字弹出、屏幕特效）？ [Gap, Spec §用户故事 3]
- [ ] CHK002 - 对于不同难度阶梯，需求是否涵盖了环境视觉的变化说明（如：Level 50 后背景颜色或光效的改变）？ [Gap, Completeness]
- [ ] CHK003 - HUD 显示的“难度倍率”是否要求实时动态跳变，还是仅在关卡开始/结束时刷新？ [Clarity, Spec §FR-006]
- [ ] CHK004 - 需求中是否规定了如何向玩家解释当前的“难度加成”逻辑（如：是否有 Tips 说明速度提高带来的奖励比例）？ [User Guidance, Gap]

## 结算与收益逻辑 (Settlement & Rewards)

- [ ] CHK005 - 结算统计需求中是否明确了“基础分”与“难度奖金”的拆解显示格式？ [Clarity, Plan §Phase 5]
- [ ] CHK006 - 是否准确定义了“离线资源”在不同难度等级下的加成计算公式及其显示方式？ [Consistency, Spec §FR-006]
- [ ] CHK007 - 需求中是否定义了“里程碑达到”时的特殊奖励反馈（如：达到 10 层时的勋章或音效需求）？ [Gap, Spec §FR-005]

## 进度感知与里程碑 (Progression & Milestones)

- [ ] CHK008 - 是否明确规定了“关卡进度条”的填充逻辑（是基于当前 Level 的百分比，还是基于离下一个里程碑的距离）？ [Clarity, Spec §用户故事 1]
- [ ] CHK009 - 需求是否涵盖了“失败回退”后的 UX 引导（如何告知玩家当前进度已回退至最近的里程碑）？ [Exception Flow, Spec §边缘情况]
- [ ] CHK010 - 是否定义了玩家在“高难度关卡”中连续失败时的降级机制或疲劳控制需求？ [Gap, UX Balance]

## 交互一致性 (Interaction Consistency)

- [ ] CHK011 - 11 款游戏的难度 HUD 组件是否要求统一的布局定位，以减少玩家的认知负担？ [Consistency, Plan §结构结构]
- [ ] CHK012 - 需求是否明确了在“暂停界面”或“设置界面”中是否允许查看当前的种子 ID 或难度详情？ [Gap, Coverage]
- [ ] CHK013 - 对于响应式布局，需求是否定义了在小屏设备上避免“难度信息 HUD”遮挡游戏核心操作区的规则？ [Edge Case, Gap]
