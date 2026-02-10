/**
 * 合成小游戏状态枚举
 */
export enum MergeGameState {
    /** 空闲等待交互 */
    IDLE = "IDLE",
    /** 正在执行合并动画 */
    MERGING = "MERGING",
    /** 正在下落填充 */
    FALLING = "FALLING",
    /** 游戏结束 */
    GAME_OVER = "GAME_OVER",
}
