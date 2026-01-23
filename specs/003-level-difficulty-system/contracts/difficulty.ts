/**
 * 难度系统 API 契约
 */

/**
 * 游戏结束结算消息
 */
export interface IGameSettlement {
    gameId: string;
    level: number;
    baseScore: number;
    isPass: boolean;
}

/**
 * 难度权重调节因子
 */
export interface IDifficultyFactor {
    speed?: number;
    density?: number;
    timeLimit?: number;
    enemyCount?: number;
}

/**
 * 难度管理器单例接口
 */
export interface IDifficultyManager {
    /** 获取当前游戏的难度参数 */
    getParams(gameId: string): IDifficultyFactor;
    /** 提交结算信息并获取更新后的状态 */
    settle(report: IGameSettlement): void;
    /** 重置关卡到上一个存档点 */
    backToMilestone(gameId: string): number;
}
