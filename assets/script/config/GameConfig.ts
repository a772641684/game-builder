/**
 * 标准化游戏配置接口
 * 遵循项目宪法 XIV 规范
 */
export interface IGameConfig {
    /** 游戏模式名称 */
    gameMode: string;
    /** 基础难度等级 (1-10) */
    difficulty: number;
    /** 重力缩放 (由于物理引擎游戏如硕果累累) */
    gravityScale: number;
    /** 最大划线长度 (一马当先专用) */
    maxLineLength: number;
    /** 自动吸附距离 (单位: 像素, 拼图专用) */
    snapDistance: number;
    /** 容错半径 (找不同专用) */
    toleranceRadius: number;
}

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
 * 泡泡龙标准化配置接口
 */
export interface IBubbleConfig {
    /** 发射速度 */
    shootSpeed: number;
    /** 最小消除数量 */
    popMinCount: number;
    /** 射击冷却时间 (ms) */
    cooldown: number;
    /** 网格行数 */
    rows: number;
    /** 网格列数 */
    cols: number;
    /** 泡泡直径/间距 */
    bubbleSize: number;
}

/**
 * 默认配置基准值
 */
export const DEFAULT_GAME_CONFIG: Readonly<IGameConfig> = {
    gameMode: "default",
    difficulty: 1,
    gravityScale: 1.0,
    maxLineLength: 500,
    snapDistance: 50,
    toleranceRadius: 30,
};

/**
 * 合成类方格游戏默认配置
 */
export const DEFAULT_MERGE_GAME_CONFIG: IMergeGameConfig = {
    rows: 6,
    cols: 6,
    initTypeMax: 5,
    chainDelay: 200,
    mergeDuration: 0.15,
    fallSpeed: 1200,
    squareWidth: 100,
    squareHeight: 100,
    spacing: 5,
};

/**
 * 泡泡龙默认配置
 */
export const DEFAULT_BUBBLE_CONFIG: Readonly<IBubbleConfig> = {
    shootSpeed: 1500,
    popMinCount: 3,
    cooldown: 400,
    rows: 10,
    cols: 8,
    bubbleSize: 60,
};
