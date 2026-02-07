/**
 * 合成类方格游戏配置接口
 */
export interface IMergeGameConfig {
    /** 游戏网格行数 */
    rows: number;
    /** 游戏网格列数 */
    cols: number;
    /** 初始方格类型范围最大值 (1-N) */
    initTypeMax: number;
    /** 链式合成延迟时间 (ms) */
    chainDelay: number;
    /** 合成动画时长 (s) */
    mergeDuration: number;
    /** 下落动画速度 (像素/秒) */
    fallSpeed: number;
    /** 方格宽度 */
    squareWidth: number;
    /** 方格高度 */
    squareHeight: number;
    /** 方格间距 */
    spacing: number;
}

/**
 * 合成类方格游戏默认配置
 */
export const DEFAULT_MERGE_GAME_CONFIG: IMergeGameConfig = {
    rows: 6,
    cols: 6,
    initTypeMax: 5,
    chainDelay: 300,
    mergeDuration: 0.3,
    fallSpeed: 800,
    squareWidth: 100,
    squareHeight: 100,
    spacing: 5,
};

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
