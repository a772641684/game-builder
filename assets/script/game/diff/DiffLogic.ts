import { DEFAULT_GAME_CONFIG } from "../../config/GameConfig";
import { DifficultyManager } from "../../logic/DifficultyManager";
import { LevelGenerator } from "../../logic/LevelGenerator";
import { Logger } from "../../logic/Logger";

const { ccclass, property } = cc._decorator;

/**
 * 差异点点击逻辑
 */
@ccclass
export default class DiffLogic extends cc.Component {
    private _isFound: boolean = false;
    private _radius: number = DEFAULT_GAME_CONFIG.toleranceRadius;

    onLoad() {
        this.node.on(cc.Node.EventType.TOUCH_START, this.onTouchStart, this);

        const level = DifficultyManager.instance.getCurrentLevel("DIFFERENCES");
        const difficulty = DifficultyManager.instance.getParams("DIFFERENCES");
        const config = LevelGenerator.instance.generateDiffConfig(level, difficulty);
        this._radius = config.radius;

        // 差异点通常是透明的或有标记的
        // 在 Demo 中我们用一个小圆点表示
        const graphics = this.getComponent(cc.Graphics) || this.addComponent(cc.Graphics);
        graphics.fillColor = cc.color(255, 0, 0, 0); // 初始透明
        graphics.circle(0, 0, this._radius);
        graphics.fill();
    }

    private onTouchStart() {
        if (this._isFound) return;

        this._isFound = true;
        Logger.getInstance().info("DiffGame", `找到差异点: ${this.node.name}`);

        // 显示红圈标记
        const graphics = this.getComponent(cc.Graphics);
        graphics.fillColor = cc.color(255, 0, 0, 100);
        graphics.clear();
        graphics.strokeColor = cc.Color.RED;
        graphics.lineWidth = 5;
        graphics.circle(0, 0, this._radius);
        graphics.stroke();

        // 冒泡通知 UI
        this.node.parent.parent.parent.emit("diff-found");
    }
}
