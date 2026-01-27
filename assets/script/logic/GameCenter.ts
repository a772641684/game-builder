import { Singleton } from "../../ace/logic/Singleton";
import { UI_ENUM } from "../enums/UIEnum";
import { DifficultyManager } from "./DifficultyManager";
import { Logger } from "./Logger";
import { UILayer, UIManager } from "./UIManager";

/**
 * 全局游戏中心管理类
 * 负责各子游戏的状态维护与面板切换
 */
export class GameCenter extends Singleton<GameCenter> {
    private _currentSubGameId: string | null = null;

    public get currentSubGameId(): string | null {
        return this._currentSubGameId;
    }

    /**
     * 获取单例实例 (遵循 Singleton 模式)
     */
    public static get instance(): GameCenter {
        if (!this._instance) {
            this._instance = new GameCenter();
            this._instance.init();
        }
        return this._instance;
    }

    public static getInstance(): GameCenter {
        return this.instance;
    }

    protected init(): void {
        super.init();
        Logger.getInstance().info("GameCenter", "游戏中心数据层就绪");
    }

    /**
     * 设置 UI 根节点 (通常是 Canvas)
     */
    public setRootNode(node: cc.Node): void {
        UIManager.instance.setRoot(node);
        Logger.getInstance().info("GameCenter", "注册 UI 根节点并同步给 UIManager");
    }

    /**
     * 进入特定子游戏
     * @param gameId 游戏唯一标识
     */
    public enterGame(gameId: string): void {
        this._currentSubGameId = gameId;
        Logger.getInstance().info("GameCenter", `尝试进入游戏: ${gameId}`);

        // 初始化难度进度
        DifficultyManager.instance.getCurrentLevel(gameId);

        const path = this._getUIPathByGameId(gameId);
        if (!path) {
            Logger.getInstance().error("GameCenter", `未找到游戏资源路径: ${gameId}`);
            return;
        }

        UIManager.instance.openUI(path, UILayer.Base);
    }

    /**
     * 返回主菜单
     */
    public returnToHome(): void {
        Logger.getInstance().info("GameCenter", `退出游戏: ${this._currentSubGameId}, 返回主页`);

        // 游戏中断或完成时的自动保存 (可选逻辑由 DifficultyManager 最终决定)
        if (this._currentSubGameId) {
            const lv = DifficultyManager.instance.getCurrentLevel(this._currentSubGameId);
            Logger.getInstance().info("GameCenter", `退出前备份 ${this._currentSubGameId} 进度: LV ${lv}`);
        }

        this._currentSubGameId = null;
        UIManager.instance.openUI(UI_ENUM.HOME, UILayer.Base);
    }

    private _getUIPathByGameId(gameId: string): string | null {
        switch (gameId) {
            case "HORSE":
                return UI_ENUM.GAME_HORSE;
            case "FRUIT":
                return UI_ENUM.GAME_FRUIT;
            case "PUZZLE":
                return UI_ENUM.GAME_PUZZLE;
            case "DIFFERENCES":
                return UI_ENUM.GAME_DIFFERENCES;
            case "PIPE":
                return UI_ENUM.GAME_PIPE;
            case "CLAW":
                return UI_ENUM.GAME_CLAW;
            case "FLOOR":
                return UI_ENUM.GAME_FLOOR;
            case "DOODLE":
                return UI_ENUM.GAME_DOODLE;
            case "POLY":
                return UI_ENUM.GAME_POLY;
            case "BOUNCY":
                return UI_ENUM.GAME_BOUNCY;
            case "BUBBLE":
                return UI_ENUM.GAME_BUBBLE;
            case "UNSCREW":
                return UI_ENUM.UNSCREW_PUZZLE;
            case "SHEEP_MATCH":
                return UI_ENUM.SHEEP_MATCH;
            default:
                return null;
        }
    }

    public destroy(): void {
        Logger.getInstance().info("GameCenter", "正在释放游戏中心");
        GameCenter._instance = null;
    }
}
