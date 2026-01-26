/**
 * 泡泡龙核心逻辑接口
 */
export interface IBubbleLogic {
    /**
     * 开始游戏，初始化矩阵
     */
    startGame(): void;

    /**
     * 寻找同色连通块
     * @param row 起始行
     * @param col 起始列
     * @returns 匹配的坐标列表
     */
    findMatches(row: number, col: number): {r: number, c: number}[];

    /**
     * 检查并处理悬空泡泡
     * @returns 掉落的泡泡数量
     */
    checkIslands(): number;

    /**
     * 坐标转换：网格索引转世界坐标
     */
    gridToWorld(row: number, col: number): cc.Vec2;

    /**
     * 坐标转换：世界坐标转最近网格索引
     */
    worldToGrid(pos: cc.Vec2): {r: number, c: number};
}
