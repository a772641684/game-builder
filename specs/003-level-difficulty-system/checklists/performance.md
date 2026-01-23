# Checklist: 性能与稳定性需求质量验证

**Purpose**: 本清单作为“需求的单元测试”，重点验证《特性说明书 [spec.md](../spec.md)》中关于算法性能、内存占用以及系统稳定性的需求定义。
**Target Audience**: 性能架构师 / QA
**Focus Areas**: 计算耗时、内存阈值、低端设备适配

## 算法性能与响应速度 (Algorithm Performance)

- [ ] CHK001 - 是否明确了“200ms 生成时长”是在何种硬件基准（如：移动端低配 vs 桌面端）下测得？ [Clarity, Spec §SC-003]
- [ ] CHK002 - 需求是否规定了 PCG 算法在每一帧内分配的最大 CPU 时间片，以防止生成过程中出现明显的掉帧（Jank）？ [Gap, Consistency]
- [ ] CHK003 - 对于无限生成类游戏（如涂鸦跳跃），是否定义了“预生成”与“回收”逻辑的性能红线？ [Coverage, Spec §用户故事 2]
- [ ] CHK004 - 需求是否量化了在“极高难度”下，由于障碍物密度增加导致的物理引擎运算增量限额？ [Clarity, Spec §FR-003]

## 资源与内存管理 (Resource & Memory)

- [ ] CHK005 - 自动生成的大量动态节点是否关联了特定的“对象池 (Object Pool)”管理需求，以避免频繁 GC 导致的卡顿？ [Gap, Plan §技术背景]
- [ ] CHK006 - 需求中是否规定了单局关卡生成的内存峰值增量上限？ [Measurability, Gap]
- [ ] CHK007 - 是否定义了当内存占用达到警戒线时的“场景元素简化策略”？ [Edge Case, Gap]

## 设备适配与降级 (Adaptation & Degradation)

- [ ] CHK008 - 针对“低端设备适配”，需求是否定义了具体的功耗/发热平衡策略（如：降低复杂度或减少粒子特效）？ [Completeness, Spec §边缘情况]
- [ ] CHK009 - 需求是否涵盖了在不同分辨率或屏幕比例下，PCG 算法对“有效游戏区域”的适配规则？ [Consistency, Gap]
- [ ] CHK010 - 是否定义了平台兼容性测试要求（特别是针对 Cocos Creator 2.3.x 在旧版 iOS/Android 上的 JS 引擎性能差异）？ [Assumption, Plan §技术背景]

## 系统鲁棒性 (Robustness)

- [ ] CHK011 - 需求是否规定了生成器抛出异常时的“安全自愈”逻辑（如：重试次数或加载基准布局文件）？ [Exception Flow, Gap]
- [ ] CHK012 - 算法是否定义了“死循环风险”的动态监测与截断机制（防止因随机种子极端导致的生成超时）？ [Edge Case, Gap]
- [ ] CHK013 - 需求是否量化了在高并发（如果有关卡同步）下的网络请求频率限制需求？ [Gap, Spec §FR-004]
