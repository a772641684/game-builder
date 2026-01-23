import { GameCenter } from "../logic/GameCenter";
import { Logger } from "../logic/Logger";

const { ccclass, property } = cc._decorator;

/**
 * 统一结算面板
 * [Prefab 结构说明]
 * - UISettlement
 *   - Background (cc.Node)
 *   - Content (cc.Node)
 *     - Title (cc.Label)
 *     - Score (cc.Label)
 *     - BtnRestart (cc.Button)
 *     - BtnBack (cc.Button)
 */
@ccclass
export default class UISettlement extends cc.Component {
    @property(cc.Label)
    titleLabel: cc.Label = null;

    @property(cc.Label)
    scoreLabel: cc.Label = null;

    private _restartCallback: Function = null;

    /**
     * 显示结算
     * @param isWin 是否胜利
     * @param score 分数
     * @param onRestart 重新开始回调
     */
    public show(isWin: boolean, score: number, onRestart: Function) {
        this.node.active = true;
        this.titleLabel.string = isWin ? "游戏胜利！" : "游戏结束";
        this.scoreLabel.string = `得分: ${score}`;
        this._restartCallback = onRestart;

        Logger.getInstance().info("Settlement", isWin ? "玩家胜利" : "玩家失败");
    }

    public onBtnRestartClicked() {
        this.node.active = false;
        if (this._restartCallback) {
            this._restartCallback();
        }
    }

    public onBtnBackClicked() {
        GameCenter.instance.returnToHome();
    }
}
