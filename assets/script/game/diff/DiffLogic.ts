import { DEFAULT_GAME_CONFIG } from "../../config/GameConfig";
import { Logger } from "../../logic/Logger";

const { ccclass, property } = cc._decorator;

/**
 * 差异点点击逻辑
 */
@ccclass
export default class DiffLogic extends cc.Component {
    private _isFound: boolean = false;

    onLoad() {
        this.node.on(cc.Node.EventType.TOUCH_START, this.onTouchStart, this);

        // 差异点通常是透明的或有标记的
        // 在 Demo 中我们用一个小圆点表示
        const graphics = this.getComponent(cc.Graphics) || this.addComponent(cc.Graphics);
        graphics.fillColor = cc.color(255, 0, 0, 0); // 初始透明
        graphics.circle(0, 0, DEFAULT_GAME_CONFIG.toleranceRadius);
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
        graphics.circle(0, 0, DEFAULT_GAME_CONFIG.toleranceRadius);
        graphics.stroke();

        // 冒泡通知 UI
        this.node.parent.parent.parent.emit("diff-found");
    }
}
