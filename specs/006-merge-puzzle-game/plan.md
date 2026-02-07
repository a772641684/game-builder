# Implementation Plan: Merge Puzzle Game (合成类方格游戏)

**Branch**: `006-merge-puzzle-game` | **Date**: 2026-02-07 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/006-merge-puzzle-game/spec.md`

## Summary

本功能旨在实现一个 M\*N 的合成类消除游戏。玩家点击方格时，所有相邻的同类型方格将合并到点击位置，并使该方格等级（type）加 1。游戏包含自动重力下落填充及新元素补充逻辑。根据用户确认，系统支持带有延迟的自动链式合成，以增强游戏打击感和视觉连贯性。

## Technical Context

**Language/Version**: TypeScript / Cocos Creator 2.3.x (遵循项目宪法)  
**Primary Dependencies**: `cc.tween` (动画), `Loader` (资源管理), `Logger` (日志), `UI` (面板管理)  
**Storage**: N/A (暂无持久化需求)  
**Testing**: MergeGameLogic.test.ts (核心算法单元测试)  
**Target Platform**: Web / WeChat Game
**Project Type**: Cocos Creator Mini Game  
**Performance Goals**: 60 fps, 合成延迟 < 300ms, 网格生成 < 100ms  
**Constraints**: 禁用 `??` 语法，必须使用 `Loader.instantiate`，严禁 `console.log`，必须补全中文 JSDoc。  
**Scale/Scope**: 包含主游戏面板 `UIPlayGroundMergeGame.ts` 及方格预制体 `PrefabMergeSquare.ts`。

## Constitution Check

| Principle     | Status | Requirement                                                    |
| ------------- | ------ | -------------------------------------------------------------- |
| I. 命名规范   | 🟢     | 类名 PascalCase, 接口 I 前缀, 脚本前缀 Prefab/UI               |
| II. 静态分析  | 🟢     | 禁用 `??`, 严禁 `var`, 使用箭头函数                            |
| IV. 框架防护  | 🟢     | 必须使用 `Loader.getInstance()` 加载资源和实例化               |
| V. 日志规范   | 🟢     | 禁用 `console.log`, 使用 `Logger.getInstance()` 且首参为 Tag   |
| VI. 注释规范  | 🟢     | 全程中文注释, JSDoc 覆盖公共 API                               |
| VIII. UI 架构 | 🟢     | UI 面板位于 `assets/script/ui/`, 资源在 `assets/resources/ui/` |

## Project Structure

### Documentation (this feature)

```text
specs/006-merge-puzzle-game/
├── plan.md              # 实施方案 (本文件)
├── research.md          # 技术调研与决策实现
├── data-model.md        # 实体与领域模型
├── quickstart.md        # 快速上手与验证指南
├── contracts/           # 接口契约
└── tasks.md             # 任务清单 (由 /speckit.tasks 生成)
```

### Source Code

```text
assets/
├── resources/
│   ├── prefabs/
│   │   └── MergeSquare.prefab    # 方格预制体
│   └── ui/
│       └── UIPlayGroundMergeGame.prefab # 主游戏面板
├── script/
│   ├── enums/
│   │   └── MergeGameEnum.ts      # 游戏相关常量与枚举
│   ├── game/
│   │   └── MergeGameLogic.ts     # 核心计算逻辑 (符合宪法 XI 指定路径)
│   ├── prefab/
│   │   └── PrefabMergeSquare.ts  # 方格表现脚本
│   └── ui/
│       └── UIPlayGroundMergeGame.ts # 面板控制脚本
```

**Structure Decision**: 遵循单项目标准 Cocos 结构，将逻辑运算与渲染表现分离。

**Objective**: 实现高性能、可扩展的合成类小游戏核心玩法。

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation                  | Why Needed         | Simpler Alternative Rejected Because |
| -------------------------- | ------------------ | ------------------------------------ |
| [e.g., 4th project]        | [current need]     | [why 3 projects insufficient]        |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient]  |
