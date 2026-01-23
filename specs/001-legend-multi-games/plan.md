# Implementation Plan: 《叫我大掌柜》经典五合一小游戏集

**Branch**: `001-legend-multi-games` | **Date**: 2026-01-23 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification for a 5-in-1 mini-game collection.

## Summary

构建一个包含五个经典小游戏（一马当先、硕果累累、大开眼界、庄园拼图、水管接通）的集成化 Demo 平台。采用 Cocos Creator 2.3.x 引擎，基于“逻辑单例 (Logic Singleton)”和“标准化配置内容 (IGameConfig)”模式，实现游戏间的快速切换与状态持久化。

## Technical Context

**Language/Version**: TypeScript / Cocos Creator 2.3.x  
**Primary Dependencies**: `cc.tween`, `cc.graphics`, `cc.PhysicsManager`, `Loader` (Project Internal), `Logger` (Project Internal)  
**Storage**: `cc.sys.localStorage` (本地优先) + API 同步接口 (外部注入)  
**Testing**: Cocos Test Runner (逻辑层)  
**Target Platform**: 浏览器 (Web) / 微信小游戏  
**Project Type**: Mini Game - Rapid Prototyping  
**Performance Goals**: 60 fps, 初始包体 < 4MB (首包仅含主界面及核心框架)  
**Constraints**:

- **引擎限制**: 必须适配 Cocos Creator 2.3.x。
- **语法限制**: 严禁使用 `??` 语法，使用 `||` 代替。
- **资源限制**: 必须使用 23 位压缩 UUID。
- **组件限制**: 强制使用 `cc.tween` 代替 `cc.Action`。
- **解耦限制**: 严禁循环引用，使用 `EventBus` 或接口层。
  **Scale/Scope**: 1个主选择面板 + 5个独立游戏面板 + 1个全局进度管理器。

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

1. **命名规范**: 符合 PascalCase (类) / camelCase (函数/变量) / UPPER_CASE (常量)。 (Checked)
2. **语法兼容**: 严禁 `??`。 (Checked)
3. **资源管理**: 全部通过 `Loader` 接口。 (Checked)
4. **单例模式**: 逻辑层继承 `Singleton<T>`。 (Checked)
5. **日志规范**: 使用 `Logger` 且参数顺序正确 (Tag, Message)，日志内容中文。 (Checked)

## Project Structure

### Documentation (this feature)

```text
specs/001-legend-multi-games/
├── plan.md              # 本文件
├── research.md          # 核心玩法算法调研
├── data-model.md        # 游戏进度与配置实体定义
└── tasks.md             # 任务执行分解 (待生成)
```

### Source Code (Cocos Creator 2.3.x)

```text
assets/
├── resources/
│   └── ui/
│       ├── UIHome.prefab            # 主选择界面
│       ├── UIGameHorse.prefab       # 一马当先
│       ├── UIGameFruit.prefab      # 硕果累累
│       ├── UIGamePuzzle.prefab     # 庄园拼图
│       ├── UIGameDifferences.prefab # 大开眼界
│       └── UIGamePipe.prefab       # 水管接通
├── script/
│   ├── ui/
│   │   ├── UIHome.ts                # 主界面控制器
│   │   ├── UIGameHorse.ts           # 一马当先 UI 逻辑
│   │   ├── UIGameFruit.ts           # 硕果累累 UI 逻辑
│   │   ├── UIGamePuzzle.ts          # 庄园拼图 UI 逻辑
│   │   ├── UIGameDifferences.ts      # 大开眼界 UI 逻辑
│   │   └── UIGamePipe.ts            # 水管接通 UI 逻辑
│   ├── logic/
│   │   ├── GameCenter.ts            # 全局游戏状态管理 (Singleton)
│   │   └── StorageControl.ts        # 本地与远程数据存储同步 (Singleton)
│   ├── game/
│   │   ├── horse/                   # 一马当先核心逻辑
│   │   ├── fruit/                   # 硕果累累物理逻辑
│   │   └── ...                      # 其他游戏具体逻辑
│   ├── enums/
│   │   └── UIEnum.ts               # UI 路径映射
│   └── config/
│       └── GameConfig.ts           # IGameConfig 接口与 DEFAULT_GAME_CONFIG
```

**Structure Decision**: 采用“UI 控制器 (ui/) + 核心玩法引擎 (game/) + 全局单例 (logic/)”的三层架构，确保每个小游戏可以独立开发与测试，同时共享全局进度和资源加载器。

**Objective**: 快速交付五个核心玩法的 Demo 验证原型。
