# Copilot 项目宪法 — miniGameBuilder

## 项目概述

- **引擎**: Cocos Creator 2.3.3（基于 cc.\* API）
- **语言**: TypeScript → 编译目标 **ES5**
- **内置 TS 版本**: ~3.1（编辑器内置编译器）
- **设计分辨率**: 960×640，fitHeight

---

## 🚫 禁止使用的语法（ES5 / TS 3.1 限制）

### 绝对禁止

| 语法                           | 示例                  | 替代写法                      |
| ------------------------------ | --------------------- | ----------------------------- |
| `??` 空值合并                  | `a ?? b`              | `a != null ? a : b`           |
| `?.` 可选链                    | `obj?.prop`           | `obj && obj.prop`             |
| `??=` 空值合并赋值             | `a ??= b`             | `if (a == null) a = b;`       |
| `\|\|=` 逻辑或赋值             | `a \|\|= b`           | `a = a \|\| b;`               |
| `&&=` 逻辑与赋值               | `a &&= b`             | `a = a && b;`                 |
| `as const` 常量断言            | `{} as const`         | 去掉 `as const`，或用显式类型 |
| `#field` 私有字段              | `#count`              | 用 `private _count`           |
| `override` 关键字              | `override onLoad()`   | 直接覆写，不加 `override`     |
| `satisfies` 关键字             | `x satisfies T`       | 用 `x as T` 或类型标注        |
| 模板字面量类型                 | `` type T = `${A}` `` | 用 `string` 或联合类型        |
| `Promise.allSettled`           | —                     | 自行实现或不使用              |
| `Array.prototype.flat/flatMap` | —                     | 用 `reduce` + `concat`        |
| `Object.fromEntries`           | —                     | 用 `reduce` 构建对象          |
| `globalThis`                   | —                     | 用 `window` 或 `cc.game`      |
| `BigInt`                       | `123n`                | 用 `number`                   |
| `for await...of`               | —                     | 不使用异步迭代                |

### 可以使用（tsconfig 已配置 downlevelIteration + lib es2015/es2017）

- `let` / `const`
- 箭头函数 `=>`
- 模板字符串 `` `hello ${name}` ``
- 解构赋值 `const { a, b } = obj`
- 展开运算符 `...arr`
- `class` / `extends`
- `Promise` / `async` / `await`
- `for...of`
- `Map` / `Set`
- `Symbol`
- `Array.from` / `Array.of` / `Array.find` / `Array.includes`
- `Object.assign` / `Object.keys` / `Object.values`
- `String.includes` / `String.startsWith` / `String.endsWith`

---

## 📁 项目结构规范

```
assets/script/
├── config/      # 配置（GameConfig, UITheme）
├── enums/       # 枚举（UIEnum, MergeGameEnum）
├── game/        # 纯逻辑层（不依赖 cc 节点）
│   └── whack/   # 各游戏子目录
├── logic/       # 框架层（GameCenter, UIManager, Loader, Logger...）
├── prefab/      # 预制体组件（PrefabGameXxx）
└── ui/          # UI 控制器（UIPlayGroundGameXxx, UIHome, UISettlement）
```

### 目录合规性

- 所有游戏逻辑代码必须位于 `assets/script/game/`
- UI 面板控制器必须位于 `assets/script/ui/`
- Prefab 专用脚本必须位于 `assets/script/prefab/`
- 框架/基础设施类必须位于 `assets/script/logic/`
- 配置与枚举分别位于 `assets/script/config/` 和 `assets/script/enums/`
- 小游戏主预制体（Panel）必须放在 `assets/resources/ui/`，并在 `UIEnum.ts` 的 `UI_ENUM` 中同步注册

---

## 🎮 Cocos Creator 2.x API 规范

### 装饰器

```typescript
const { ccclass, property } = cc._decorator;

@ccclass
export default class MyComp extends cc.Component {
    @property(cc.Node)
    myNode: cc.Node = null;

    @property(cc.Label)
    myLabel: cc.Label = null;

    @property(cc.Prefab)
    myPrefab: cc.Prefab = null;
}
```

### 生命周期（只使用以下方法名）

- `onLoad()` — 初始化
- `onEnable()` / `onDisable()`
- `start()` — 首帧
- `update(dt: number)` — 每帧
- `lateUpdate(dt: number)`
- `onDestroy()` — 清理

### 常用 API

- 节点: `cc.Node`, `node.getChildByName()`, `node.addChild()`, `node.parent`
- 组件: `node.getComponent(Type)`, `node.addComponent(Type)`
- 实例化预制体: `cc.instantiate(prefab)`
- 颜色: `cc.color(r, g, b, a)` 或 `new cc.Color(r, g, b, a)`
- 向量: `cc.v2(x, y)`, `cc.v3(x, y, z)`
- 尺寸: `new cc.Size(w, h)`
- 定时器: `this.scheduleOnce(cb, delay)`, `this.schedule(cb, interval)`
- 缓动: `cc.tween(node).to(duration, props).start()`
- Graphics 绘制: `cc.Graphics` — `moveTo/lineTo/arc/ellipse/circle/fill/stroke/clear`
- 事件: `node.on('click', cb)`, `node.emit('custom-event')`
- 触摸: `cc.Node.EventType.TOUCH_START / TOUCH_END`

### 注意事项

- **不要**使用 `cc.Component.EventHandler` 以外的方式在编辑器中绑定事件
- **不要**使用 `require()` 在 TS 文件中导入模块，用 `import`
- `@property` 的类型必须是 Cocos 可序列化类型（cc.Node, cc.Label, cc.Prefab, number, string, boolean 等）
- 预制体中的脚本 UUID 使用 `.meta` 文件中的 uuid

---

## 🏷️ 命名规范

- **类/接口**: 大驼峰 PascalCase，接口以 `I` 开头（如 `IWhackMoleConfig`）
- **函数/变量**: 小驼峰 camelCase
- **常量/枚举值**: 全大写下划线 UPPER_CASE（如 `DEFAULT_WHACK_MOLE_CONFIG`）
- **私有成员**: 用 `_` 前缀（如 `private _score: number = 0;`）
- **组件类名与文件名一致**
- **脚本前缀规范**:
    - UI 面板控制器: `UIPlayGroundGameXxx`（挂载到根节点）
    - 预制体组件: `PrefabGameXxx`
    - 纯逻辑类放 `game/` 目录，不继承 `cc.Component`

---

## 📝 类型安全

- **禁止使用 `any`**: 除非确实无法避免，否则严禁使用 `any` 类型
- **禁止使用 `var`**: 必须使用 `const` 或 `let`
- **显式类型**: 函数参数与返回值应有显式类型标注
- **不变性**: 初始化后不应更改的属性使用 `readonly`

---

## 🔧 框架防护

- **实例化**: 使用 `Loader.getInstance().instantiate` 代替 `cc.instantiate`（有 Loader 时）
- **日志统一**: 禁用 `console.log`，必须用 `Logger.getInstance().info/warn/error(tag, msg)`
    - 第一个参数为**标签(Tag)**，第二个参数为**消息内容**
    - 日志消息使用**中文**
- **事件订阅生命周期**: 所有 `on` 监听必须在 `onDestroy` 中对应 `off`

---

## 📐 UI 与组件架构

- **解耦通讯**: 主控类使用 `public static instance` 模式，在 `onLoad` 初始化，在 `onDestroy` 置空
- **循环依赖限制**: Prefab 脚本组件之间严禁循环引用，通过事件总线或接口层解耦
- **Prefab 结构文档化**: 继承 `cc.Component` 的类，必须在 JSDoc 中包含 `[Prefab 结构说明]`：

```typescript
/**
 * [Prefab 结构说明]
 * - MyPrefab (Root 挂载此脚本, size(200, 200))
 *   - Background (Sprite, color(255,255,255))
 *   - Label (Label, text("标题"), fontSize(28))
 */
```

- **@property JSDoc**: 包含 `@property` 装饰的成员须描述对应节点路径及组件类型

---

## 🎯 配置驱动

每个小游戏必须遵守数据与逻辑分离：

- **接口定义**: 必须定义 `IXxxConfig` 接口，穷举所有玩法及表现参数
- **默认值**: 必须定义 `DEFAULT_XXX_CONFIG` 静态常量，提供基准值
- **合并逻辑**: 使用展开运算符合并外部配置 `{ ...DEFAULT_CONFIG, ...partial }`
- **禁止项**: 禁止在业务逻辑中直接修改默认配置常量；禁止将关键玩法参数硬编码

---

## 🔄 动画与坐标

- **Tween 优先**: 使用 `cc.tween` 进行动画，严禁使用旧版 `cc.Action` API
- **跨空间坐标转换**: 节点跨父级移动时，必须用 `convertToWorldSpaceAR` + `convertToNodeSpaceAR`

---

## 🛠 工具链

- **PrefabBuilder**: `tools/prefabBuilder/` — 从 TS JSDoc 注解生成 `.prefab` JSON
- **genMeta**: `tools/genMeta.js` — 生成资源 `.meta` 文件
- **预览服务器**: `http://localhost:7456`（编辑器自动启动）
- **工具语言**: 所有内部工具优先使用 Node.js (JS/TS) 编写，非必要不用 Python
- **使用授权**: 使用 `prefabBuilder` 修改预制体前，**必须先征得用户同意**

---

## 📋 预制体自动化

- **脚手架生成**: 根据脚本 JSDoc 的 `[Prefab 结构说明]` 生成/补全节点树
- **组件自动绑定**: `@property` 在 Prefab JSON 中自动绑定，资源引用通过 `.meta` 的 `uuid` 关联
- **UUID 规范**: 手动编辑 Prefab 时，`__type__` 必须使用 **23 位压缩 UUID**
- **Code-First**: 脚本 JSDoc 结构确定后，应立即生成对应 `.prefab` 基准文件

---

## 🧪 质量与自检

- **编译检测**: 任务完成前必须执行 `tsc --noEmit` 确保零编译错误
- **自检范围**: 核心业务路径覆盖、边界条件、UI 布局校验、内存泄漏风险（未销毁的监听）
- **闭环要求**: 禁止将带有 TODO 且无后续追踪计划的代码视为完成

---

## 🌐 语言与文档

- **代码注释**: 全部使用中文（关键技术术语除外）
- **JSDoc**: 所有公共/私有方法必须补全 JSDoc 注释，说明功能、参数、返回值
- **Git 提交信息**: 使用中文（如 `feat: 新增打地鼠游戏`）

---

## ⚡ 快速原型导向

本项目核心目标是利用 AI 助手快速生成游戏 Demo 和原型：

- **速度优先**: 在核心逻辑正确且符合宪法基本原则的前提下，优先采用能快速验证玩法的方式
- **模块重用**: 建立和使用可重用的 UI 组件、通用控制器和逻辑模块，缩短从构思到可运行 Demo 的时间
- **逻辑网格管理**: 具备矩阵结构的游戏须维护逻辑二维数组管理状态，而非仅依赖物理位置
