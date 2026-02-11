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

/**
 * 涂鸦跳跃游戏配置接口
 */
export interface IDoodleConfig {
    /** 跳跃初速度 (像素/秒) */
    jumpSpeed: number;
    /** 重力加速度 (像素/秒²) */
    gravity: number;
    /** 左右移动速度 (像素/秒) */
    moveSpeed: number;
    /** 屏幕半宽 (角色穿越边界范围) */
    halfWidth: number;
    /** 平台宽度 */
    platformWidth: number;
    /** 平台高度 */
    platformHeight: number;
    /** 普通平台最小间距 */
    gapMin: number;
    /** 普通平台最大间距 */
    gapMax: number;
    /** 破碎平台概率 (0-1) */
    breakableChance: number;
    /** 弹簧平台概率 (0-1) */
    springChance: number;
    /** 弹簧跳跃速度倍率 */
    springMultiplier: number;
    /** 移动平台概率 (0-1) */
    movingChance: number;
    /** 移动平台速度 (像素/秒) */
    movingSpeed: number;
    /** 金币出现概率 (0-1) */
    coinChance: number;
    /** 金币分值 */
    coinScore: number;
    /** 视野上方预生成距离 */
    spawnAhead: number;
    /** 视野下方回收距离 */
    recycleBelow: number;
    /** 每批生成平台数量 */
    batchCount: number;
    /** 角色宽度 */
    playerWidth: number;
    /** 角色高度 */
    playerHeight: number;
    /** 摄像机跟随偏移 (角色在屏幕下方的位置，正数=画面偏下) */
    cameraOffset: number;
    /** 摄像机平滑跟随系数 (0~1, 越大越快) */
    cameraSmooth: number;
    /** 死亡判定: 角色低于摄像机多少即判定死亡 */
    deathThreshold: number;
    /** 推进线下降速度 (像素/秒, 0=不启用) */
    pushLineSpeed: number;
}

/**
 * 涂鸦跳跃默认配置
 */
export const DEFAULT_DOODLE_CONFIG: Readonly<IDoodleConfig> = {
    jumpSpeed: 1300,
    gravity: 2200,
    moveSpeed: 600,
    halfWidth: 420,
    platformWidth: 120,
    platformHeight: 24,
    gapMin: 80,
    gapMax: 180,
    breakableChance: 0.1,
    springChance: 0.08,
    springMultiplier: 1.6,
    movingChance: 0.12,
    movingSpeed: 80,
    coinChance: 0.25,
    coinScore: 30,
    spawnAhead: 1200,
    recycleBelow: 600,
    batchCount: 15,
    playerWidth: 50,
    playerHeight: 50,
    cameraOffset: 100,
    cameraSmooth: 0.18,
    deathThreshold: 650,
    pushLineSpeed: 6,
};

/**
 * 弹弹球(打砖块)游戏配置接口
 */
export interface IBouncyConfig {
    /** 球半径 */
    ballRadius: number;
    /** 球初始速度 (像素/秒) */
    ballSpeed: number;
    /** 球最大速度 (像素/秒) */
    ballMaxSpeed: number;
    /** 挡板宽度 */
    paddleWidth: number;
    /** 挡板高度 */
    paddleHeight: number;
    /** 挡板 Y 坐标 (距底部) */
    paddleY: number;
    /** 挡板移动速度 (像素/秒, 键盘模式) */
    paddleSpeed: number;
    /** 砖块宽度 */
    brickWidth: number;
    /** 砖块高度 */
    brickHeight: number;
    /** 砖块间距 */
    brickSpacing: number;
    /** 砖块矩阵列数 */
    brickCols: number;
    /** 砖块区域距顶部偏移 */
    brickTopOffset: number;
    /** 游戏区域半宽 */
    areaHalfWidth: number;
    /** 游戏区域半高 */
    areaHalfHeight: number;
    /** 生命数 */
    lives: number;
    /** 普通砖块基础分 */
    baseScore: number;
    /** 连击加分倍率 (每次连续消砖 +comboBonus 分) */
    comboBonus: number;
    /** 道具掉落概率 (0-1) */
    powerUpChance: number;
}

/**
 * 弹弹球默认配置
 */
export const DEFAULT_BOUNCY_CONFIG: Readonly<IBouncyConfig> = {
    ballRadius: 10,
    ballSpeed: 500,
    ballMaxSpeed: 900,
    paddleWidth: 140,
    paddleHeight: 18,
    paddleY: -280,
    paddleSpeed: 800,
    brickWidth: 80,
    brickHeight: 28,
    brickSpacing: 4,
    brickCols: 8,
    brickTopOffset: 120,
    areaHalfWidth: 370,
    areaHalfHeight: 310,
    lives: 3,
    baseScore: 10,
    comboBonus: 5,
    powerUpChance: 0.08,
};

/**
 * 下一百层游戏配置接口
 */
export interface IFloorConfig {
    /** 游戏区域半宽 */
    areaHalfWidth: number;
    /** 游戏区域半高 */
    areaHalfHeight: number;
    /** 角色宽度 */
    playerWidth: number;
    /** 角色高度 */
    playerHeight: number;
    /** 角色左右移动速度 (像素/秒) */
    playerMoveSpeed: number;
    /** 重力加速度 (像素/秒², 正值向下) */
    gravity: number;
    /** 角色最大下落速度 (像素/秒) */
    maxFallSpeed: number;
    /** 平台宽度 */
    platformWidth: number;
    /** 平台高度 */
    platformHeight: number;
    /** 平台上升速度 (像素/秒, 正值=向上移动) */
    platformRiseSpeed: number;
    /** 平台垂直间距 (两平台之间) */
    platformGapY: number;
    /** 平台最大水平偏移 (相对于区域中心) */
    platformMaxOffsetX: number;
    /** 尖刺平台概率 (0-1) */
    spikeChance: number;
    /** 易碎平台概率 (0-1) */
    breakableChance: number;
    /** 传送带平台概率 (0-1) */
    conveyorChance: number;
    /** 传送带水平推力速度 (像素/秒) */
    conveyorSpeed: number;
    /** 天花板伤害 — 角色被挤到顶部时直接死亡 */
    ceilingKills: boolean;
    /** 初始生命数 */
    lives: number;
    /** 每安全通过一层的基础得分 */
    baseScore: number;
    /** 连续安全通过奖励分 (每层递增) */
    comboBonus: number;
    /** 初始生成平台数量 */
    initialPlatformCount: number;
    /** 角色踩到尖刺后的无敌时间 (秒) */
    invincibleDuration: number;
}

/**
 * 下一百层默认配置
 */
export const DEFAULT_FLOOR_CONFIG: Readonly<IFloorConfig> = {
    areaHalfWidth: 370,
    areaHalfHeight: 310,
    playerWidth: 40,
    playerHeight: 40,
    playerMoveSpeed: 450,
    gravity: 600,
    maxFallSpeed: 500,
    platformWidth: 140,
    platformHeight: 18,
    platformRiseSpeed: 80,
    platformGapY: 100,
    platformMaxOffsetX: 280,
    spikeChance: 0.12,
    breakableChance: 0.1,
    conveyorChance: 0.08,
    conveyorSpeed: 100,
    ceilingKills: true,
    lives: 3,
    baseScore: 5,
    comboBonus: 2,
    initialPlatformCount: 7,
    invincibleDuration: 1.5,
};

/**
 * 打地鼠游戏配置接口
 */
export interface IWhackMoleConfig {
    /** 网格行数 */
    rows: number;
    /** 网格列数 */
    cols: number;
    /** 游戏时长 (秒) */
    timeLimit: number;
    /** 地鼠生成间隔 (秒) */
    spawnInterval: number;
    /** 地鼠停留时间 (秒) */
    moleStayTime: number;
    /** 同时最多出现的地鼠数 */
    maxActiveMoles: number;
    /** 每次击中基础分 */
    baseScore: number;
}

/**
 * 打地鼠默认配置
 */
export const DEFAULT_WHACK_MOLE_CONFIG: Readonly<IWhackMoleConfig> = {
    rows: 3,
    cols: 3,
    timeLimit: 30,
    spawnInterval: 0.8,
    moleStayTime: 1.5,
    maxActiveMoles: 3,
    baseScore: 10,
};
