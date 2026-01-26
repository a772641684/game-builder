# Data Model - 泡泡龙 (Bubble Shooter)

## Entities

### Bubble (泡泡单元)
- **id**: string - 唯一标识
- **color**: 
umber - 颜色索引 (1-6, 0 为空)
- **row**: 
umber - 网格行索引
- **col**: 
umber - 网格列索引
- **state**: BubbleState - 状态枚举 (Idle, Snapping, Popping, Dropping)

### GameState (游戏状态)
- **matrix**: 
umber[][] - 10x8 的颜色矩阵
- **score**: 
umber - 当前积分
- **difficulty**: 
umber - 难度倍数
- **isGameOver**: oolean

## Validation Rules
- **消除逻辑**: 连通块大小必须 >= 3 才会触发消除。
- **死亡判定**: 如果 ow >= 10 的位置存在非空泡泡，游戏结束。
- **颜色限制**: 仅允许 [1, 6] 之间的整数，0 表示占位符或空白。
