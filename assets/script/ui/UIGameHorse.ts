import HorseLogic from "../game/horse/HorseLogic";
import LineDrawer from "../game/horse/LineDrawer";
import { GameCenter } from "../logic/GameCenter";
import { Logger } from "../logic/Logger";

const { ccclass, property } = cc._decorator;

/**
 * [Prefab 结构说明]
 * - UIGameHorse (Root 挂载此脚本)
 *   - Background (Sprite)
 *   - GameLayer (Node)
 *     - LineDrawer (Graphics 挂载 LineDrawer)
 *     - Horse (Node 挂载 HorseLogic)
 *     - FinishPoint (Node)
 *     - Obstacles (Node)
 *   - UI_Overlay (Node)
 *     - BtnBack (Button)
 *     - TipLabel (Label)
 */
@ccclass
export default class UIGameHorse extends cc.Component {
    /** 节点路径: UI_Overlay/BtnBack */
    @property(cc.Node)
    btnBack: cc.Node = null;

    /** 节点路径: GameLayer/LineDrawer */
    @property(LineDrawer)
    lineDrawer: LineDrawer = null;

    /** 节点路径: GameLayer/Horse */
    @property(HorseLogic)
    horseLogic: HorseLogic = null;

    /** 节点路径: GameLayer */
    @property(cc.Node)
    gameLayer: cc.Node = null;

    protected onLoad() {
        Logger.getInstance().info("HorseGame", "一马当先界面加载完成");
        this.btnBack.on("click", this.onBtnBackClick, this);

        // 绑定回调：画完线后马开始跑
        if (this.lineDrawer) {
            this.lineDrawer.node.on(
                "draw-complete",
                (points: cc.Vec2[]) => {
                    this.horseLogic.startMove(points);
                },
                this
            );
        }
    }

    private onBtnBackClick() {
        GameCenter.instance.returnToHome();
        Logger.getInstance().info("HorseGame", "返回主界面");
    }
}
