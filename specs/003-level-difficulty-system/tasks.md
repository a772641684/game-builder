# Tasks: 关卡自动生成与难度梯度系统

**Input**: Design documents from `/specs/003-level-difficulty-system/`
**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [data-model.md](data-model.md), [research.md](research.md)

## 实施策略 (Implementation Strategy)

1. **MVP 优先**: 首先实现全局难度单例与底层随机数生成器。
2. **渐进式注入**: 优先在动作类游戏注入运动参数难度，随后实现逻辑类游戏的完整 PCG。
3. **独立验证**: 每个用户故事完成后，通过人工修改本地进度或种子进行封闭测试。

---

## 第一阶段：初始化 (项目初始化)

**目标**: 搭建系统骨架与持久化接口

- [x] T001 验证并引用现有的逻辑单例基类 `assets/ace/logic/Singleton.ts`
- [x] T002 创建难度管理单例 `assets/script/logic/DifficultyManager.ts`
- [x] T003 创建生成算法单例 `assets/script/logic/LevelGenerator.ts`
- [x] T004 在 `assets/script/logic/StorageControl.ts` 中添加 `LevelState` 持久化读写接口

---

## 第二阶段：基础逻辑 (核心逻辑)

**目标**: 实现所有用户故事共用的基础算法与配置

- [x] T005 实现 `DifficultyManager` 中的线性增长模型 (1 + LV\*Rate) [assets/script/logic/DifficultyManager.ts]
- [x] T006 [P] 在 `assets/script/logic/LevelGenerator.ts` 中实现幂等随机种子源 `RandomSource`
- [x] T007 [P] 定义 11 款游戏的 `DifficultyProfile` 静态难度特征表 [assets/script/logic/DifficultyManager.ts]

---

## 第三阶段：用户故事 1 - 渐进式难度体验 (P1)

**目标**: 游戏物理/逻辑参数随关卡提升动态增强 (Story Goal)
**独立验证**: 修改本地等级为 50，观察“下一百层”上升速度是否明显增快 (Independent Test)

- [x] T008 [US1] 修改 `assets/script/logic/GameCenter.ts` 支持跨游戏的等级状态同步与初始化
- [x] T009 [P] [US1] 改造 `assets/script/logic/FloorControl.ts` 将速度常数替换为难度计算值
- [x] T010 [P] [US1] 改造 `assets/script/logic/BouncyControl.ts` 实现弹球速度与挡板宽度的动态难度适配
- [x] T011 [US1] 在 `assets/script/ui/UIGameHUD.ts` 中动态显示当前等级与难度系数

---

## 第四阶段：用户故事 2 - 随机关卡自动生成 (P1)

**目标**: 实现 PCG 算法替代硬编码布局，确保关卡多样性 (Story Goal)
**独立验证**: 固化种子启动“点线交织”，确认生成的锚点位置在多次重进后完全一致 (Independent Test)

- [x] T012 [P] [US2] 为“层层叠”实现平台随机宽度与初始位移逻辑 [assets/script/logic/LevelGenerator.ts]
- [x] T013 [P] [US2] 为“点线交织”实现基于模板偏置的锚点生成算法 [assets/script/logic/LevelGenerator.ts]
- [x] T014 [P] [US2] 为“泡泡龙”实现洪水填充校验的随机色块矩阵算法 [assets/script/logic/LevelGenerator.ts]
- [x] T014.1 [P] [US2] 为“抓娃娃”实现物品间距缩小与概率偏移算法 [assets/script/logic/LevelGenerator.ts]
- [x] T014.2 [P] [US2] 为“合成大西瓜”实现随机位置权重投放逻辑 [assets/script/logic/LevelGenerator.ts]
- [x] T014.3 [P] [US2] 为“弹弹球”实现砖块矩阵密度自适应生成逻辑 [assets/script/logic/LevelGenerator.ts]
- [x] T015 [P] [US2] 为“涂鸦跳跃”实现基于垂直区间的平台分布生成器 [assets/script/logic/LevelGenerator.ts]
- [x] T016 [US2] 在各游戏的 Control 初始化流程中注入 `LevelGenerator` 调用逻辑

---

## 第五阶段：用户故事 3 - 进度、反馈与倍率 (P2)

**目标**: 实现里程碑解锁与难度感知结算 (Story Goal)
**独立验证**: 通过第 10 关后故意失败，确认重试点是否保留在第 10 关 (Independent Test)

- [x] T017 [US3] 实现 `DifficultyManager` 中的每 10 关里程碑自动存档逻辑
- [x] T018 [US3] 修改 `assets/script/ui/UISettlement.ts` 增加基于难度的 Bonus 积分倍率结算
- [x] T019 [US3] 实现挑战失败后的里程碑回退逻辑

---

## 最终阶段：润色与跨领域验证

- [x] T020 性能校验：确保 PCG 单次执行在低端设备耗时 < 200ms
- [x] T021 边界验证：模拟 Level 100+ 极端参数下的数值溢出与死局预防

---

## 依赖关系 (Dependencies)

1. **第一、二阶段** 必须先行完成。
2. **US1 (难度)** 与 **US2 (PCG)** 逻辑上相互独立，可同步实施，但均依赖 **第二阶段**。
3. **US3 (里程碑)** 依赖于 **US1** 的进度状态管理。

## 并行执行建议 (Parallel Execution)

- **核心层**: T006 (随机源) 与 T007 (特征配置) 可同时开发。
- **业务层 (US1)**: T009 (下百层) 与 T010 (弹弹球) 难度注入可分发并行。
- **算法层 (US2)**: T012 至 T015 (多个不同的 PCG 算法) 互不干扰，完全可并行。
