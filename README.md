# 🎮 miniGameBuilder — AI 驱动的小游戏合集原型工厂

> 基于 **Cocos Creator 2.3.3** 的多合一小游戏框架，利用 AI 助手快速生成游戏 Demo 和原型。
> 全代码构建 UI，配置驱动玩法，Code-First Prefab 工作流。

---

## 📑 目录

- [🎮 miniGameBuilder — AI 驱动的小游戏合集原型工厂](#-minigamebuilder--ai-驱动的小游戏合集原型工厂)
    - [📑 目录](#-目录)
    - [项目概览](#项目概览)
    - [技术栈](#技术栈)
    - [已收录游戏](#已收录游戏)
    - [项目结构](#项目结构)
    - [架构设计](#架构设计)
        - [Singleton 基础设施](#singleton-基础设施)
        - [游戏生命周期](#游戏生命周期)
        - [配置驱动模式](#配置驱动模式)
    - [主题系统](#主题系统)
    - [工具链](#工具链)
        - [PrefabBuilder](#prefabbuilder)
        - [genMeta](#genmeta)
    - [快速开始](#快速开始)
        - [环境要求](#环境要求)
        - [运行](#运行)
        - [编译检查](#编译检查)
        - [刷新资源数据库](#刷新资源数据库)
    - [开发规范](#开发规范)
    - [设计文档](#设计文档)
    - [许可证](#许可证)

---

## 项目概览

miniGameBuilder 是一个以 **快速原型** 为核心目标的小游戏合集项目。每个小游戏都遵循统一的框架规范，实现了：

- **配置驱动** — 接口定义 + 默认值 + 运行时合并，玩法参数集中管控
- **纯代码 UI** — 通过 `cc.Graphics` + `UIGraphicsHelper` 矢量绘制，无需图片资源
- **手动物理** — 速度驱动 + AABB/距离碰撞检测，不依赖 Box2D 物理引擎
- **主题换肤** — 4 套预设主题，一键切换全局配色方案
- **难度递进** — 关卡制与无尽增量制两种模式，12 款游戏均已接入

---

## 技术栈

| 项         | 值                               |
| ---------- | -------------------------------- |
| 引擎       | Cocos Creator 2.3.3 (`cc.*` API) |
| 语言       | TypeScript → 编译目标 **ES5**    |
| 设计分辨率 | 960×640，fitHeight               |
| 预览       | `http://localhost:7456`          |
| 构建工具   | PrefabBuilder (Node.js)、genMeta |

---

## 已收录游戏

| #   | 游戏          | 类型     | gameId        |
| --- | ------------- | -------- | ------------- |
| 1   | 🐴 一马当先   | 策略     | `HORSE`       |
| 2   | 🍎 硕果累累   | 物理     | `FRUIT`       |
| 3   | 🧩 庄园拼图   | 拼图     | `PUZZLE`      |
| 4   | 👁️ 大开眼界   | 找不同   | `DIFFERENCES` |
| 5   | 🔧 水管接通   | 逻辑     | `PIPE`        |
| 6   | 🧸 抓娃娃     | 抓取     | `CLAW`        |
| 7   | 🔲 合成消消乐 | 合成消除 | `MERGE`       |
| 8   | 🏢 下一百层   | 动作     | `FLOOR`       |
| 9   | 🦘 涂鸦跳跃   | 平台跳跃 | `DOODLE`      |
| 10  | 📐 点线交织   | 几何     | `POLY`        |
| 11  | 🏓 弹弹球     | 打砖块   | `BOUNCY`      |
| 12  | 🫧 泡泡龙     | 射击消除 | `BUBBLE`      |
| 13  | 🔩 拆螺丝     | 益智     | `UNSCREW`     |
| 14  | 🐑 羊了个羊   | 三消     | `SHEEP_MATCH` |
| 15  | 🔨 打地鼠     | 反应     | `WHACK_MOLE`  |

---

## 项目结构

```
assets/script/
├── config/          # 配置接口与默认值
│   ├── GameConfig.ts    # IGameConfig / IMergeGameConfig / IBubbleConfig
│   │                    # IDoodleConfig / IBouncyConfig / IWhackMoleConfig
│   └── UITheme.ts       # IUITheme / UIThemeManager (4 套主题)
│
├── enums/           # 枚举定义
│   ├── UIEnum.ts        # UI_ENUM (面板注册表)
│   └── MergeGameEnum.ts # 合成游戏枚举
│
├── game/            # 纯逻辑层 (不依赖 cc 节点)
│   ├── horse/           # 一马当先
│   ├── fruit/           # 硕果累累
│   ├── puzzle/          # 庄园拼图
│   ├── diff/            # 大开眼界
│   ├── pipe/            # 水管接通
│   ├── whack/           # 打地鼠
│   └── MergeGameLogic.ts
│
├── logic/           # 框架层
│   ├── GameCenter.ts        # 游戏中心 (Singleton, 子游戏注册/切换)
│   ├── UIManager.ts         # UI 管理器 (Base/Popup/Top 三层)
│   ├── Loader.ts            # 资源加载与实例化
│   ├── Logger.ts            # 结构化日志 (tag + msg)
│   ├── DifficultyManager.ts # 难度系统 (关卡/无尽双模式)
│   ├── LevelGenerator.ts    # PCG 关卡生成 (LCG 种子复现)
│   ├── StorageControl.ts    # 本地存储 + 云端同步存根
│   ├── UIGraphicsHelper.ts  # 矢量绘制工具集
│   ├── BouncyControl.ts     # 弹弹球核心逻辑
│   ├── BubbleControl.ts     # 泡泡龙核心逻辑
│   ├── DoodleControl.ts     # 涂鸦跳跃核心逻辑
│   └── ...                  # 各游戏控制器
│
├── prefab/          # 预制体挂载组件
│   ├── PrefabGameBubble.ts
│   ├── PrefabGameDoodlePlayer.ts
│   ├── PrefabMergeSquare.ts
│   └── ...
│
└── ui/              # UI 面板控制器
    ├── UIHome.ts                    # 主选择界面
    ├── UISettlement.ts              # 结算面板
    ├── UIPlayGroundGameBouncy.ts    # 弹弹球
    ├── UIPlayGroundGameBubble.ts    # 泡泡龙
    ├── UIPlayGroundGameDoodle.ts    # 涂鸦跳跃
    └── ...

tools/
├── prefabBuilder/   # JSDoc → .prefab JSON 自动生成器
├── genMeta.js       # 资源 .meta 文件生成
└── genTextureMeta.js

specs/               # 设计文档
├── 001-legend-multi-games/
├── 002-extra-mini-games/
├── 003-level-difficulty-system/
└── ...
```

---

## 架构设计

### Singleton 基础设施

```
GameCenter ─── 游戏注册 / 状态切换 / enterGame() / returnToHome()
UIManager  ─── 三层 UI 管理 (Base → Popup → Top)
Loader     ─── 资源缓存 / cc.instantiate 封装
Logger     ─── info/warn/error(tag, msg) 结构化日志
DifficultyManager ── 12 款游戏难度因子计算
StorageControl ───── localStorage + 云端存根
```

### 游戏生命周期

```
UIHome 选择游戏
  → GameCenter.enterGame(gameId)
    → UIManager.open(UI_ENUM.GAME_XXX)
      → UIPlayGroundGameXxx.onLoad()
        → XxxControl.instance.startGame(config?)
        → 构建 UI / 绑定输入 / 主循环 update()
        → 游戏结束 → UISettlement.show(isWin, score, onRestart)
```

### 配置驱动模式

每个小游戏遵循三步范式：

1. **接口定义** — `IXxxConfig` 穷举全部玩法参数
2. **默认常量** — `DEFAULT_XXX_CONFIG` 提供基准值
3. **运行时合并** — `{ ...DEFAULT_CONFIG, ...partialConfig }`

---

## 主题系统

4 套预设主题，覆盖背景 / HUD / 按钮 / 游戏区域 / 特效 5 大模块：

| 主题        | 风格         |
| ----------- | ------------ |
| 🌿 卡通田园 | 绿色系田园风 |
| 🌊 清新海洋 | 蓝色系海洋风 |
| 🌙 暗夜霓虹 | 暗紫色赛博风 |
| 🍬 糖果甜心 | 粉色系甜美风 |

通过 `UIThemeManager` 管理，支持 `init()` 恢复上次选择、`nextTheme()` 循环切换。
每个游戏面板在 `_applyTheme(theme)` 中统一应用配色。

---

## 工具链

### PrefabBuilder

从 TypeScript JSDoc 的 `[Prefab 结构说明]` 注释自动生成 `.prefab` JSON 文件：

```typescript
/**
 * [Prefab 结构说明]
 * - MyNode (Root 挂载此脚本, size(200, 200))
 *   - Background (Sprite, color(255,255,255))
 *   - Label (Label, text("标题"), fontSize(28))
 */
```

→ 运行 PrefabBuilder → 生成完整的 Prefab JSON，含节点树 + 组件绑定 + UUID 关联

### genMeta

```bash
node tools/genMeta.js <资源路径>
```

为新增资源文件生成 Cocos Creator 所需的 `.meta` 文件。

---

## 快速开始

### 环境要求

- [Cocos Creator 2.3.3](https://www.cocos.com/creator)
- Node.js ≥ 12

### 运行

1. 用 Cocos Creator 2.3.3 打开项目根目录
2. 编辑器自动启动预览服务器 → `http://localhost:7456`
3. 点击编辑器顶部 ▶️ 运行即可预览

### 编译检查

```bash
npx tsc --noEmit
```

### 刷新资源数据库

```bash
curl http://localhost:7456/update-db
```

---

## 开发规范

详见 [.github/copilot-instructions.md](.github/copilot-instructions.md)，核心要点：

- **禁止** `??` / `?.` / `as const` / `override` 等 ES5 不支持语法
- **禁止** `any` 类型、`var` 声明、`console.log`
- **日志** 使用 `Logger.getInstance().info(tag, msg)`，消息用中文
- **命名** 类 PascalCase / 变量 camelCase / 常量 UPPER*CASE / 私有 `*` 前缀
- **注释** 全部中文，所有公共方法必须有 JSDoc
- **事件** 所有 `on` 监听必须在 `onDestroy` 中对应 `off`
- **动画** 使用 `cc.tween`，禁止旧版 `cc.Action` API
- **质量** 任务完成前执行 `tsc --noEmit` 确保零编译错误

---

## 设计文档

| 阶段 | 文档                                                                      | 内容                                          |
| ---- | ------------------------------------------------------------------------- | --------------------------------------------- |
| 001  | [传说多合一](specs/001-legend-multi-games/)                               | 基础框架、5 款经典小游戏                      |
| 002  | [额外迷你游戏](specs/002-extra-mini-games/)                               | 抓娃娃/下百层/涂鸦跳跃/点线交织/弹弹球/泡泡龙 |
| 003  | [难度系统](specs/003-level-difficulty-system/)                            | 关卡制 + 无尽增量制难度递进                   |
| 004  | [泡泡龙](specs/004-bubble-shooter/) / [拆螺丝](specs/004-unscrew-puzzle/) | 独立游戏详细设计                              |
| 005  | [羊了个羊](specs/005-sheep-match/)                                        | 三消类游戏设计                                |
| 006  | [合成消消乐](specs/006-merge-puzzle-game/)                                | 合成类方格游戏设计                            |

---

## 许可证

私有项目，未开源。

---

<p align="center">
  <sub>Built with 🤖 AI + ☕ Cocos Creator</sub>
</p>
