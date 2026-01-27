# 数据模型: 羊了个羊类三消游戏 (Sheep Match)

## 核心接口

### 1. ITileData (方块数据)

定义单个消除方块的静态属性与运行时状态。

```typescript
interface ITileData {
    /** 唯一实例 ID */
    uid: string;
    /** 方块类型 ID (对应不同图标, 如 "carrot", "cabbage") */
    typeId: string;
    /** 逻辑层级 (层级索引, Layer) */
    layer: number;
    /** 逻辑坐标 (x, y) */
    pos: { x: number; y: number };
    /** 当前是否被遮挡 (运行时计算) */
    isBlocked: boolean;
}
```

### 2. ISheepMatchLevel (关卡数据)

描述关卡的初始化状态。

```typescript
interface ISheepMatchLevel {
    /** 关卡 ID */
    id: number;
    /** 槽位总数 (默认 7) */
    slotCount: number;
    /** 关卡包含的所有方块列表 */
    tiles: ITileData[];
    /** 要求的消除数量 (通常为 3) */
    matchCount: number;
}
```

### 3. ISlotItem (槽位项)

描述进入收集槽后的方块状态。

```typescript
interface ISlotItem {
    /** 对应的方块 UID */
    uid: string;
    /** 类型 ID */
    typeId: string;
    /** 在槽位中的当前索引 */
    index: number;
}
```

## 存储逻辑

- **进度保存**: 使用 `StorageControl` 记录当前关卡索引。
- **状态快照**: 用于撤销功能（可选），记录 `tiles` 剩余列表和 `slots` 数组。
