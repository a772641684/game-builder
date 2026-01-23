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
