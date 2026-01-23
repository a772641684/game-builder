import { DifficultyManager } from "../logic/DifficultyManager";
import { GameCenter } from "../logic/GameCenter";

const { ccclass, property } = cc._decorator;

/**
 * 实时关卡信息显示
 * [Prefab 结构说明]
 * - HUD (挂载此脚本)
 *   - LevelLabel (cc.Label)
 */
@ccclass
export default class UIGameHUD extends cc.Component {
    @property(cc.Label)
    levelLabel: cc.Label = null;

    protected onEnable(): void {
        this.refresh();
    }

    /**
     * 刷新关卡显示
     */
    public refresh(): void {
        const gameId = GameCenter.instance.currentSubGameId;
        if (gameId && this.levelLabel) {
            const level = DifficultyManager.instance.getCurrentLevel(gameId);
            const params = DifficultyManager.instance.getParams(gameId);
            this.levelLabel.string = `Level: ${level} (x${params.speed.toFixed(1)})`;
        }
    }
}
