# Internal Contracts: Events & Interfaces

**Feature**: 拆螺丝益智游戏 (Unscrew Puzzle)

## 1. 核心控制器接口 (IUnscrewControl)

```typescript
interface IUnscrewControl {
    /** 初始化并加载关卡 */
    loadLevel(levelId: number): void;
    /** 尝试移除一个螺丝 */
    tryUnscrew(screw: PrefabGameScrew): boolean;
    /** 撤销一步 */
    undo(): void;
    /** 复活 (清理槽位或通过道具继续) */
    revive(): void;
}
```

## 2. 全局事件 (Event Bus)

| 事件名            | 触发时机                             | 携带参数                                 |
| :---------------- | :----------------------------------- | :--------------------------------------- |
| `UNSCREW_SUCCESS` | 螺丝成功移入槽位                     | `{ screwId: string, slotIndex: number }` |
| `PLATE_DROPPED`   | 一块金属板完全脱离螺丝并由于重力掉落 | `{ plateId: string }`                    |
| `SLOTS_FULL`      | 所有槽位占满，进入失败等待状态       | `{ score: number }`                      |
| `GAME_WIN`        | 屏幕所有目标板均已清除               | `{ score: number, timeSpent: number }`   |

## 3. 物理约束协议

- **命名**: 动态生成的 WeldJoint 必须以 `Joint_PlateID_ScrewID` 命名以便查询和清理。
- **层级**: `Screw` 节点不应直接作为 `Plate` 的子节点，两者应处于同一物理容器层，通过坐标对齐感知重叠。
