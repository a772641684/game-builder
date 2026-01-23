# PrefabBuilder

Cocos Creator 2.3.x 预制体自动化构建与修复工具。

## 功能

1.  **代码驱动结构 (Code-Driven Structure)**: 根据 TS 脚本中的 JSDoc `[Prefab 结构说明]` 自动生成或对齐预制体的节点树。
2.  **组件自动绑定**: 自动根据 `@property` 注释中的“节点路径”信息，将节点或组件引用绑定到脚本插件。
3.  **UUID 自动转换**: 自动计算 36 位标准 UUID 与 Cocos 2.3.x 所需的 23 位压缩 UUID 之间的映射。

## 使用方法

### 1. 安装依赖

```bash
npm install
```

### 2. 编译

```bash
npm run tsc
```

### 3. 执行

```bash
node compiled/index.js <脚本路径> <预制体路径>
```

## 脚本注释规范

### 节点结构说明

在类的 JSDoc 中使用 `[Prefab 结构说明]` 标签：

```typescript
/**
 * [Prefab 结构说明]
 * - Root
 *   - Background
 *   - Content
 *     - Label
 */
export class PrefabMyComponent extends cc.Component { ... }
```

### 属性绑定说明

在属性的 JSDoc 中指定 `节点路径`：

```typescript
/**
 * @description 背景图
 * 节点路径: Background
 */
@property(cc.Node)
background: cc.Node = null;
```
