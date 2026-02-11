/**
 * UI 资源枚举定义
 * 对应 assets/resources/ui/ 目录下的预制体路径
 */
export const UI_ENUM = {
    /** 主选择界面 */
    HOME: "ui/UIHome",
    /** 一马当先 */
    GAME_HORSE: "ui/UIGameHorse",
    /** 硕果累累 */
    GAME_FRUIT: "ui/UIGameFruit",
    /** 庄园拼图 */
    GAME_PUZZLE: "ui/UIGamePuzzle",
    /** 大开眼界 */
    GAME_DIFFERENCES: "ui/UIGameDifferences",
    /** 水管接通 */
    GAME_PIPE: "ui/UIGamePipe",
    /** 抓娃娃 */
    GAME_CLAW: "ui/UIPlayGroundGameClaw",
    /** 合成消消乐 */
    MERGE_GAME: "ui/UIPlayGroundGameMerge",
    /** 下一百层 */
    GAME_FLOOR: "ui/UIPlayGroundGameFloor",
    /** 涂鸦跳跃 */
    GAME_DOODLE: "ui/UIPlayGroundGameDoodle",
    /** 点线交织 */
    GAME_POLY: "ui/UIPlayGroundGamePoly",
    /** 弹弹球 */
    GAME_BOUNCY: "ui/UIPlayGroundGameBouncy",
    /** 泡泡龙 */
    GAME_BUBBLE: "ui/UIPlayGroundGameBubble",
    /** 拆螺丝益智游戏 */
    UNSCREW_PUZZLE: "ui/UIPlayGroundGameUnscrew",
    /** 羊了个羊类三消游戏 */
    SHEEP_MATCH: "ui/UIPlayGroundGameSheepMatch",
    /** 打地鼠 */
    WHACK_MOLE: "ui/UIPlayGroundGameWhackMole",
    /** 结算面板 */
    SETTLEMENT: "ui/UISettlement",
    /** 通用确认弹窗 */
    COMMON_DIALOG: "ui/CommonDialog",
};

export type UI_NAME = keyof typeof UI_ENUM;
