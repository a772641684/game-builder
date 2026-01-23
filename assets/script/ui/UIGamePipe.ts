import ConnectionChecker from "../game/pipe/ConnectionChecker";
import { DifficultyManager } from "../logic/DifficultyManager";
import { GameCenter } from "../logic/GameCenter";
import { LevelGenerator } from "../logic/LevelGenerator";
import { Logger } from "../logic/Logger";

const { ccclass, property } = cc._decorator;

/**
 * [Prefab 结构说明]
 * - UIGamePipe (Root 挂载此脚本)
 *   - Background (Sprite)
 *   - GameLayer (Node)
 *     - Grid (Layout)
 *       - Pipe_0_0 (Node 挂载 ConnectionChecker)
 *       ...
 */
@ccclass
export default class UIGamePipe extends cc.Component {
    /** 节点路径: UI_Overlay/BtnBack */
    @property(cc.Node)
    btnBack: cc.Node = null;

    /** 节点路径: GameLayer/Grid */
    @property(cc.Node)
    grid: cc.Node = null;

    protected onLoad() {
        Logger.getInstance().info("PipeGame", "水管接通界面加载完成");
        this.btnBack.on("click", this.onBtnBackClick, this);

        this.node.on("pipe-rotated", this.checkConnectivity, this);

        this.initLevel();
    }

    private initLevel() {
        const level = DifficultyManager.instance.getCurrentLevel("PIPE");
        const difficulty = DifficultyManager.instance.getParams("PIPE");
        const layout = LevelGenerator.instance.generatePipeLayout(level, difficulty);

        const checkers = this.grid.getComponentsInChildren(ConnectionChecker);
        for (let i = 0; i < checkers.length && i < layout.length; i++) {
            const angle = layout[i];
            // 把随机的角度转化为旋转次数
            const count = Math.floor(angle / 90) % 4;
            // 直接设置组件内部变量和节点旋转
            const checker = checkers[i] as any;
            checker._currentRotationCount = count;
            checker.node.angle = -count * 90;
        }
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
