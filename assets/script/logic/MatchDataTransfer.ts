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
    uid: string;
    /** 方块类型 */
    typeId: string;
    /** 脚本控制器的引用 (用于回退动画等) */
    tileScript?: any;
}

/**
 * 撤销命令接口
 */
export interface IMatchCommand {
    /** 操作的方块 UID */
    uid: string;
    /** 方块从哪个槽位索引被移出 */
    slotIndex: number;
    /** 方块在场景中的原始坐标 */
    originPos: cc.Vec2;
    /** 执行的时间戳 */
    timestamp: number;
}
