# Data Model: 拆螺丝益智游戏

**Feature**: 拆螺丝益智游戏 (Unscrew Puzzle)

## 1. 关卡配置 (Level Configuration)

```typescript
interface IUnscrewLevel {
    /** 关卡 ID */
    id: number;
    /** 备用槽位数量 */
    slotCount: number;
    /** 金属板列表 */
    plates: IPlateData[];
    /** 场景内已放置的螺丝列表 */
    screws: IScrewData[];
}
```

## 2. 金属板数据 (Plate Data)

```typescript
interface IPlateData {
    /** 唯一标识 */
    id: string;
    /** 形状类型 (矩形, 圆形, 自定义多边形) */
    shape: "rect" | "circle" | "poly";
    /** 初始位置 */
    position: { x: number, y: number };
    /** 初始角度 */
    angle: number;
    /** 质量/密度 */
    density: number;
    /** 资源路径 (图片/预制体) */
    asset: string;
}
```

## 3. 螺丝数据 (Screw Data)

```typescript
interface IScrewData {
    /** 唯一标识 */
    id: string;
    /** 初始坐标 */
    position: { x: number, y: number };
    /** 所属的板 ID 列表 (一个螺丝可能穿过重叠的多块板) */
    boundPlateIds: string[];
    /** 颜色分类 (用于后续关卡扩展) */
    color?: string;
}
```

## 4. 运行时状态 (Runtime State)

```typescript
interface IUnscrewGameState {
    /** 当前分数 */
    score: number;
    /** 槽位占用情况 (Array of IScrewData or null) */
    slots: (IScrewData | null)[];
    /** 操作历史栈 (用于 Undo) */
    history: IUnscrewCommand[];
}
```
