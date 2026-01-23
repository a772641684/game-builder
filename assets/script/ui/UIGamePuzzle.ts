import { GameCenter } from "../logic/GameCenter";
import { Logger } from "../logic/Logger";

const { ccclass, property } = cc._decorator;

/**
 * [Prefab 结构说明]
 * - UIGamePuzzle (Root 挂载此脚本)
 *   - Background (Sprite)
 *   - GameLayer (Node)
 *     - SlotContainer (Node)
 *       - Slot_0 (Node)
 *       - Slot_1 (Node)
 *       - Slot_2 (Node)
 *     - PieceContainer (Node)
 *       - Piece_0 (Node 挂载 PuzzleLogic)
 *       - Piece_1 (Node 挂载 PuzzleLogic)
 *       - Piece_2 (Node 挂载 PuzzleLogic)
 *   - UI_Overlay (Node)
 *     - BtnBack (Button)
 *     - TipLabel (Label)
 */
@ccclass
export default class UIGamePuzzle extends cc.Component {
    /** 节点路径: UI_Overlay/BtnBack */
    @property(cc.Node)
    btnBack: cc.Node = null;

    /** 节点路径: GameLayer/SlotContainer */
    @property(cc.Node)
    slotContainer: cc.Node = null;

    protected onLoad() {
        Logger.getInstance().info("PuzzleGame", "庄园拼图界面加载完成");
        this.btnBack.on("click", this.onBtnBackClick, this);

        // 监听拼图完成事件
        this.node.on("piece-placed", this.checkWinCondition, this);
    }

    private checkWinCondition() {
        const pieces = this.node.getComponentsInChildren("PuzzleLogic");
        const allPlaced = pieces.every((p: any) => p.isPlaced);
        if (allPlaced) {
            Logger.getInstance().info("PuzzleGame", "恭喜！拼图完成");
        }
    }

    private onBtnBackClick() {
        GameCenter.instance.returnToHome();
        Logger.getInstance().info("PuzzleGame", "返回主界面");
    }
}
