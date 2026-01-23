import { Singleton } from "../../ace/logic/Singleton";
import { UI_ENUM } from "../enums/UIEnum";
import { Loader } from "./Loader";
import { Logger } from "./Logger";

/**
 * 全局游戏中心管理类
 * 负责各子游戏的状态维护与面板切换
 */
export class GameCenter extends Singleton<GameCenter> {
    private _currentSubGameId: string | null = null;
    private _currentUI: cc.Node = null;
    private _rootNode: cc.Node = null;

    /**
     * 获取单例实例 (遵循 Singleton 模式)
     */
    public static get instance(): GameCenter {
        return super.instance as GameCenter;
    }

    protected init(): void {
        super.init();
        Logger.getInstance().info("GameCenter", "游戏中心数据层就绪");
    }

    /**
     * 设置 UI 根节点 (通常是 Canvas)
     */
    public setRootNode(node: cc.Node): void {
        this._rootNode = node;
        Logger.getInstance().info("GameCenter", "注册 UI 根节点成功");
    }

    /**
     * 进入特定子游戏
     * @param gameId 游戏唯一标识
     */
    public enterGame(gameId: string): void {
        this._currentSubGameId = gameId;
        Logger.getInstance().info("GameCenter", `尝试进入游戏: ${gameId}`);

        const path = this._getUIPathByGameId(gameId);
        if (!path) {
            Logger.getInstance().error("GameCenter", `未找到游戏资源路径: ${gameId}`);
            return;
        }

        this._loadAndShowUI(path);
    }

    /**
     * 返回主菜单
     */
    public returnToHome(): void {
        Logger.getInstance().info("GameCenter", `退出游戏: ${this._currentSubGameId}, 返回主页`);
        this._currentSubGameId = null;
        this._loadAndShowUI(UI_ENUM.HOME);
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
            default:
                return null;
        }
    }

    private _loadAndShowUI(path: string): void {
        if (!this._rootNode) {
            this._rootNode = cc.find("Canvas");
            if (!this._rootNode) {
                Logger.getInstance().error("GameCenter", "未在场景中找到 Canvas, 无法加载 UI");
                return;
            }
        }

        Loader.instance.load(path, cc.Prefab, (err, prefab: cc.Prefab) => {
            if (err) {
                Logger.getInstance().error("GameCenter", `资源加载失败: ${path}, 错误: ${err.message}`);
                return;
            }

            // 清理旧 UI
            if (this._currentUI && this._currentUI.isValid) {
                this._currentUI.destroy();
            }

            // 实例化新 UI [宪法 IV 合规]
            this._currentUI = Loader.instance.instantiate(prefab);
            this._currentUI.parent = this._rootNode;
            this._currentUI.setPosition(0, 0);

            Logger.getInstance().info("GameCenter", `界面挂载成功: ${path}`);
        });
    }

    public destroy(): void {
        Logger.getInstance().info("GameCenter", "正在释放游戏中心");
        GameCenter._instance = null;
    }
}
