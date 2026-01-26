# Implementation Plan: 拆螺丝益智游戏 (Unscrew Puzzle)

**Branch**: `004-unscrew-puzzle` | **Date**: 2026-01-26 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/004-unscrew-puzzle/spec.md`

## Summary

实现一款基于 2D 物理引擎的拆螺丝解谜游戏。核心玩法包括点击拆卸螺丝、限位槽位管理以及由于失去螺丝支撑导致的金属板重力掉落。技术挑战在于物理节点约束的动态管理、槽位逻辑判定以及高效的物理模拟。

## Technical Context

**Language/Version**: TypeScript / Cocos Creator 2.4.x  
**Primary Dependencies**: `cc.PhysicsManager`, `cc.tween`, `Loader`, `Singleton`, `Logger`  
**Storage**: `LocalStorage` (关卡进度与最高分)  
**Testing**: 物理模拟压力测试 (SC-002)，逻辑闭环覆盖测试  
**Target Platform**: 微信小游戏 / H5
**Project Type**: 休闲益智小游戏  
**Performance Goals**: 60 FPS 稳定运行，物理节点数支持 50+  
**Constraints**: 禁用 `??` 语法，必须使用中文日志与注释，严格遵守 Prefab 命名规范  
**Scale/Scope**: 单个游戏主面板，支持多关卡数据加载

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

1. **V. 日志规范**: 核心逻辑必须使用 `Logger.getInstance().info("Unscrew", "...")`，且内容为中文。
2. **VI. 语言规范**: 所有脚本、文档、Git 提交信息必须使用中文。
3. **VIII. 命名规范**:
    - 挂载在预制体上的脚本必须以 `Prefab` 开头（如 `PrefabGameScrew.ts`）。
    - 主界面脚本以 `UIPlayGroundGameUnscrew.ts` 命名。
4. **XII. 单例规范**: 逻辑控制器 `UnscrewControl` 必须通过 `Singleton` 继承实现。
5. **XVIII. 快速原型**: 优先实现 P1 核心拆卸掉落链路。

## Project Structure

### Documentation (this feature)

```text
specs/004-unscrew-puzzle/
├── plan.md              # 本文件
├── research.md          # 物理约束与槽位逻辑研究
├── data-model.md        # 关卡数据模型
├── quickstart.md        # 快速上手指南
├── contracts/           # API 或内部事件协议
└── tasks.md             # 任务列表
```

### Source Code (repository root)

```text
assets/
├── script/
│   ├── logic/
│   │   └── UnscrewControl.ts      # 核心逻辑控制器，维护槽位状态与孔位逻辑
│   ├── prefab/
│   │   ├── PrefabGameScrew.ts    # 螺丝组件
│   │   └── PrefabGamePlate.ts    # 金属板组件
│   └── ui/
│       └── UIPlayGroundGameUnscrew.ts # 游戏主面板
└── resources/
    └── prefabs/
        └── game/
            └── UIPlayGroundGameUnscrew.prefab # 预制体资源
```

**Note on Entities**:

- “孔位 (Hole)” 在实现层面上仅作为 `data-model.md` 中的逻辑坐标点存在，不创建独立的脚本组件。
- `UnscrewControl` 负责管理槽位 (Slots) 与场景孔位 (Holes) 之间的螺丝迁移逻辑。

**Structure Decision**: 采用单项目结构，利用 `Singleton` 进行逻辑与 UI 解耦。

**Objective**: 快速验证“物理约束拆除”的核心爽感，建立通用的关卡加载机制。

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
| --------- | ---------- | ------------------------------------ |
| 无        | -          | -                                    |
