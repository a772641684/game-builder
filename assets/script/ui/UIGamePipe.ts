import { GameCenter } from "../logic/GameCenter";
import { Logger } from "../logic/Logger";

const { ccclass, property } = cc._decorator;

/**
 * [Prefab 结构说明]
 * - UIGamePipe (Root 挂载此脚本)
 *   - Background (Sprite)
 *   - GameLayer (Node)
 *     - Grid (Layout)
 *       - Pipe_0_0 (Node 挂载 ConnectionChecker)
 *       - Pipe_0_1 (Node 挂载 ConnectionChecker)
 *       - Pipe_0_2 (Node 挂载 ConnectionChecker)
 *       - Pipe_1_0 (Node 挂载 ConnectionChecker)
 *       - Pipe_1_1 (Node 挂载 ConnectionChecker)
 *       - Pipe_1_2 (Node 挂载 ConnectionChecker)
 *       - Pipe_2_0 (Node 挂载 ConnectionChecker)
 *       - Pipe_2_1 (Node 挂载 ConnectionChecker)
 *       - Pipe_2_2 (Node 挂载 ConnectionChecker)
 *   - UI_Overlay (Node)
 *     - BtnBack (Button)
 *     - TipLabel (Label)
 */
@ccclass
export default class UIGamePipe extends cc.Component {
    /** 节点路径: UI_Overlay/BtnBack */
    @property(cc.Node)
    btnBack: cc.Node = null;

    protected onLoad() {
        Logger.getInstance().info("PipeGame", "水管接通界面加载完成");
        this.btnBack.on("click", this.onBtnBackClick, this);

        this.node.on("pipe-rotated", this.checkConnectivity, this);
    }

    private checkConnectivity() {
        // TODO: 实现 BFS 扫描算法检查连通性
        Logger.getInstance().info("PipeGame", "正在检查连通性...");
    }

    private onBtnBackClick() {
        GameCenter.instance.returnToHome();
        Logger.getInstance().info("PipeGame", "返回主界面");
    }
}
