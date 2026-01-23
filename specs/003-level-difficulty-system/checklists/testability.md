# Checklist: 可测试性与调试需求质量验证

**Purpose**: 本清单作为“需求的单元测试”，重点验证《特性说明书 [spec.md](../spec.md)》中针对算法验证、自动化测试逻辑以及生产环境调试的需求定义。
**Target Audience**: 测试工程师 (TE) / 自动化测试开发者
**Focus Areas**: 验证钩子、模拟器需求、可追溯性

## 验证钩子与状态暴露 (Validation Hooks)

- [ ] CHK001 - 是否明确定义了在“开发/测试模式”下暴露当前随机种子 (Seed) 的需求？ [Clarity, Spec §边缘情况]
- [ ] CHK002 - 需求是否涵盖了“难度参数强制覆盖”的接口说明，以便测试人员直接跳转到 Level 50/100 进行极限测试？ [Completeness, Gap]
- [ ] CHK003 - 是否规定了系统日志中对 PCG 生成过程的关键路径记录需求（如：生成步长、重试次数、节点分布摘要）？ [Traceability, Gap]
- [ ] CHK004 - 需求是否支持“游戏快照”功能，即在出现异常关卡布局时，能通过一键保存当前系统状态以供后续分析？ [Gap, User Story 2]

## 自动化测试支持 (Automated Testing)

- [ ] CHK005 - “100% 确保可通关 (SC-001)”是否配套了“无感自动模拟跑通”的需求逻辑？ [Measurability, Spec §SC-001]
- [ ] CHK006 - 需求中是否定义了用于性能压测的“空跑模式”（即不渲染 UI，仅在逻辑层快速运行生成算法）？ [Performance, Gap]
- [ ] CHK007 - 是否规定了对 11 款游戏生成结果的“静态扫描器”需求，用于离线校验海量种子下的布局合法性？ [Coverage, Gap]

## 调试工具与环境 (Debugging & Environment)

- [ ] CHK008 - 是否要求开发一套“难度可视化调试面板”，用于实时观察 DifficultyManager 的内部参数变化？ [UX for Devs, Gap]
- [ ] CHK009 - 需求是否明确了在测试环境中模拟“存储损坏”或“版本降级移交”的逻辑，以验证 StorageControl 的健壮性？ [Edge Case, Gap]
- [ ] CHK010 - 是否定义了对“随机性偏差”的统计需求（如：连续 100 局内，某些障碍物出现的概率是否符合正态分布）？ [Quality Control, Gap]

## 验收过程支撑 (Acceptance Support)

- [ ] CHK011 - 所有的 Success Criteria (SC) 是否都关联了明确的“验证脚本”或“计算公式说明”？ [Traceability, Spec §Success Criteria]
- [ ] CHK012 - 需求是否定义了“黄金集 (Golden Set)”，即一组已知结果的种子，用于回归测试生成算法的稳定性？ [Gap, Regression]
