import { DifficultyManager } from "../logic/DifficultyManager";
import { GameCenter } from "../logic/GameCenter";
import { LevelGenerator } from "../logic/LevelGenerator";
import { Logger } from "../logic/Logger";

const { ccclass, property } = cc._decorator;

/**
 * [Prefab 结构说明]
 * - UIGameDifferences (Root 挂载此脚本)
...
 */
@ccclass
export default class UIGameDifferences extends cc.Component {
    /** 节点路径: UI_Overlay/BtnBack */
    @property(cc.Node)
    btnBack: cc.Node = null;

    /** 节点路径: UI_Overlay/FoundCountLabel */
    @property(cc.Label)
    foundCountLabel: cc.Label = null;

    private _foundCount: number = 0;
    private _totalCount: number = 3;

    protected onLoad() {
        Logger.getInstance().info("DiffGame", "大开眼界界面加载完成");
        this.btnBack.on("click", this.onBtnBackClick, this);

        this.node.on("diff-found", this.onDiffFound, this);

        const level = DifficultyManager.instance.getCurrentLevel("DIFFERENCES");
        const difficulty = DifficultyManager.instance.getParams("DIFFERENCES");
        const config = LevelGenerator.instance.generateDiffConfig(level, difficulty);
        this._totalCount = config.count;
        this.foundCountLabel.string = `已找到: ${this._foundCount}/${this._totalCount}`;
    }

    private onDiffFound() {
        this._foundCount++;
        this.foundCountLabel.string = `已找到: ${this._foundCount}/${this._totalCount}`;
        if (this._foundCount >= this._totalCount) {
            Logger.getInstance().info("DiffGame", "恭喜！所有差异已找到");
        }
    }

    private onBtnBackClick() {
        GameCenter.instance.returnToHome();
        Logger.getInstance().info("DiffGame", "返回主界面");
    }
}
