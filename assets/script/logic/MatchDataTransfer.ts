/**
 * 羊了个羊类三消游戏数据定义
 */

/**
 * 单张方块的基础数据
 */
export interface ITileData {
    /** 唯一实例 ID */
    uid: string;
    /** 方块类型 ID (对应图标) */
    typeId: string;
    /** 逻辑层级 (层级更高者遮挡下方) */
    layer: number;
    /** 初始物理坐标 */
    pos: { x: number; y: number };
    /** 当前运行时的遮挡状态 */
    isBlocked?: boolean;
}

/**
 * 解析后的关卡配置
 */
export interface ISheepMatchLevel {
    /** 关卡 ID */
    id: number;
    /** 槽位总数 (默认 7) */
    slotCount: number;
    /** 消除要求的数量 (默认 3) */
    matchCount: number;
    /** 场景内所有方块 */
    tiles: ITileData[];
}

/**
 * 槽位项数据结构
 */
export interface ISlotItem {
    /** 对应的方块唯一 ID */
    id: string;
    /** 方块类型 */
    type: number;
    /** Cocos 节点引用 */
    node: cc.Node;
}

/**
 * 撤销命令接口
 */
export interface IMatchCommand {
    /** 动作类型 (如 "move") */
    action: string;
    /** 操作的方块 UID */
    tileId: string;
    /** 执行的时间戳 */
    timestamp: number;
    /** 动作快照数据 */
    data: {
        /** 方块在场景中的原始坐标 */
        originalPos: cc.Vec2;
        /** 原始深度层级 */
        originalLayer: number;
    };
}
