# 实施方案: 关卡自动生成与难度梯度系统

**分支**: `003-level-difficulty-system` | **日期**: 2026-01-23 | **说明书**: [spec.md](spec.md)
**输入**: 选自 `/specs/003-level-difficulty-system/spec.md` 的功能规格。

## 概述

本项目旨在为现有 11 款小游戏构建自动关卡生成与难度梯度系统。核心方案包括：

1. **DifficultyManager**: 全局单例，管理各游戏的难度配置（DifficultyProfile）。
2. **Procedural Generators**: 将现有的硬编码布局（如点线交织的锚点、泡泡龙的初始色块）改为基于随机种子的生成算法。
3. **Milestone System**: 实现存档点机制，支持高难度倍率奖励产出。

## 技术背景

**语言/版本**: TypeScript / Cocos Creator 2.3.x  
**主要依赖**: `cc.tween`, `Loader`, `Singleton`, `GameCenter`, `StorageControl`  
**存储**: `cc.sys.localStorage` (通过 `StorageControl` 封装)  
**性能目标**: 关卡生成计算耗时 < 100ms，帧率稳定 60 FPS  
**约束**: 严禁使用 `??` 语法，日志必须中文并带 Tag，使用 `cc.tween` 代替 `cc.Action`

## 宪法检查

_门禁：在第 0 阶段研究前必须通过。第 1 阶段设计后重新检查。_

- [x] **文档语言**: 全程使用中文 (宪法 VI)
- [x] **日志规范**: 日志包含 Tag 且消息为中文 (宪法 V)
- [x] **实例化方案**: 必须使用 `Loader.instance.instantiate` (宪法 IV)
- [x] **语法限制**: 严禁使用 `??` (宪法 II)
- [x] **动画方案**: 统一使用 `cc.tween` (宪法 VII)

## 项目结构

### 文档结构 (当前特性)

```text
specs/003-level-difficulty-system/
├── plan.md              # 实施方案
├── research.md          # 第 0 阶段：研究与算法决策
├── data-model.md        # 第 1 阶段：难度配置实体定义
├── quickstart.md        # 第 1 阶段：快速上手
├── contracts/           # 第 1 阶段：消息与接口契约
└── tasks.md             # 第 2 阶段：任务拆解
```

### 源码结构

```text
assets/script/
├── logic/
│   ├── DifficultyManager.ts    # 核心：难度平衡与等级计算
│   ├── LevelGenerator.ts      # 算法：基于种子的关卡生成工具
│   └── StorageControl.ts       # 持久化：关卡进度与里程碑存储
├── ui/
│   └── Common/
│       └── UIGameHUD.ts        # 更新：全局 HUD 显示难度与关卡
└── prefab/
    └── [Existing Game Prefabs] # 更新：根据难度调整物体参数（如速度、密度）
```

**结构决策**: 采用中心化的难度管理逻辑，并将其注入现有的游戏单例（Control）中。

## 复杂度跟踪

- **核心挑战**: 11 款游戏的难度参数统一化（速度 vs 数量 vs 时间）。
- **算法重点**: “点线交织”的随机布局算法与“泡泡龙”的棋盘生成。
