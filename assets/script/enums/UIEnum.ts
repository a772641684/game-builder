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
    /** 通用确认弹窗 */
    COMMON_DIALOG: "ui/CommonDialog",
} as const;

export type UI_NAME = keyof typeof UI_ENUM;
