# Data Model: Merge Puzzle Game

## 1. 核心实体 (Entities)

### SquareData (方格数据)

代表网格中单个方格的逻辑状态。

- `id`: number (唯一标识符)
- `type`: number (等级/类型，1-5 为初始生成，合成后可递增)
- `x`: number (网格 X 坐标)
- `y`: number (网格 Y 坐标)

### GridModel (网格模型)

管理 M\*N 的 `SquareData` 集合。

- `matrix`: (SquareData | null)[][] (二维数组存储方格)
- `config`: { rows: number, cols: number } (网格尺寸)

## 2. 状态枚举 (Enums)

### GameState

- `IDLE`: 等待玩家点击
- `MERGING`: 正在执行合并动画
- `FALLING`: 正在执行重力下落和补充
- `GAMEOVER`: 游戏结束（无匹配项）

## 3. 验证规则 (Validation Rules)

- **类型范围**: 初始生成必须在 1-5 之间。
- **坐标有效性**: x 必须在 [0, cols-1]，y 必须在 [0, rows-1]。
- **合并触发**: 只有当点击位置的同类连通块数量 > 1 时才触发合并（可选，或根据用户需求）。
    - _注_: 用户原话是“点击方格后相邻同类的方格合成到点击的位置”，通常意味着至少要有 1 个相邻同类。

## 4. 状态流转 (State Transitions)

1. **INITIALIZE**: 随机生成矩阵 -> 进入 `IDLE`。
2. **CLICKED**: `IDLE` -> `MERGING` (计算连通块并移动)。
3. **GRAVITY**: `MERGING` -> `FALLING` (方格下落并生成新块)。
4. **CHECK**: `FALLING` -> 检测是否有新合成 -> (如果有则循环回 `MERGING`，无则回 `IDLE`)。
5. **FAIL**: 检测无匹配项 -> `GAMEOVER`。
