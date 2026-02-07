import { GameCenter } from "../logic/GameCenter";
import { Logger } from "../logic/Logger";

const { ccclass, property } = cc._decorator;

/**
 * [Prefab 结构说明]
 * - UIHome (Root 挂载此脚本)
 *   - Background (Sprite)
 *   - Title (Label)
 *   - GameList (Layout) -> 对应 gameListContainer 属性
 *     - (动态生成的按钮，对应 gameBtnPrefab)
 */
@ccclass
export default class UIHome extends cc.Component {
    @property(cc.Node)
    gameListContainer: cc.Node = null;

    @property(cc.Node)
    gameBtnPrefab: cc.Node = null;

    /** 游戏列表定义 */
    private readonly GAMES = [
        { id: "HORSE", title: "一马当先" },
        { id: "FRUIT", title: "硕果累累" },
        { id: "PUZZLE", title: "庄园拼图" },
        { id: "DIFFERENCES", title: "大开眼界" },
        { id: "PIPE", title: "水管接通" },
        { id: "CLAW", title: "抓娃娃" },
        { id: "FLOOR", title: "下一百层" },
        { id: "DOODLE", title: "涂鸦跳跃" },
        { id: "POLY", title: "点线交织" },
        { id: "BOUNCY", title: "弹弹球" },
        { id: "BUBBLE", title: "泡泡龙" },
        { id: "UNSCREW", title: "拆螺丝" },
        { id: "MERGE", title: "合成消消乐" },
    ];

    protected onLoad() {
        Logger.getInstance().info("UI", "主界面加载完成");
        this.initGameList();
    }

    /**
     * 动态初始化游戏列表
     */
    private initGameList() {
        if (!this.gameListContainer) {
            Logger.getInstance().error("UIHome", "未绑定 gameListContainer");
            return;
        }

        if (!this.gameBtnPrefab) {
            Logger.getInstance().warn("UIHome", "未绑定 gameBtnPrefab，请在编辑器中设置以支持动态生成");
            return;
        }

        // 清空旧节点
        this.gameListContainer.removeAllChildren();

        // 动态生成按钮
        this.GAMES.forEach((game) => {
            const btnNode = cc.instantiate(this.gameBtnPrefab);
            btnNode.parent = this.gameListContainer;

            // 设置按钮显示文字
            const label = btnNode.getComponentInChildren(cc.Label);
            if (label) {
                label.string = game.title;
            }

            // 绑定点击事件
            btnNode.on(
                "click",
                () => {
                    Logger.getInstance().info("UIHome", `点击进入游戏: ${game.title}`);
                    GameCenter.instance.enterGame(game.id);
                },
                this
            );
        });

        Logger.getInstance().info("UIHome", `成功动态生成 ${this.GAMES.length} 个游戏按钮`);
    }
}
