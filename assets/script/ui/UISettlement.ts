import { DifficultyManager } from "../logic/DifficultyManager";
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
        const gameId = GameCenter.instance.currentSubGameId;
        const level = DifficultyManager.instance.getCurrentLevel(gameId);

        // 计算倍率
        const params = DifficultyManager.instance.getParams(gameId);
        const finalScore = Math.floor(score * params.speed);

        this.titleLabel.string = isWin ? "游戏胜利！" : "游戏结束";
        this.scoreLabel.string = `关卡: ${level}\n得分: ${score} x ${params.speed.toFixed(1)} = ${finalScore}`;
        this._restartCallback = onRestart;

        // 提交结算数据
        if (gameId) {
            DifficultyManager.instance.settle({
                gameId: gameId,
                level: level,
                baseScore: score,
                isPass: isWin,
            });
        }

        Logger.getInstance().info("Settlement", `${gameId} 结算完成: ${isWin ? "胜利" : "失败"}`);
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
