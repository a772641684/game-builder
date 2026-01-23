import { DEFAULT_GAME_CONFIG } from "../../config/GameConfig";
import { Logger } from "../../logic/Logger";

const { ccclass, property } = cc._decorator;

/**
 * 拼图块逻辑
 * 处理拖拽与吸附
 */
@ccclass
export default class PuzzleLogic extends cc.Component {
    @property({ type: cc.Node, tooltip: "对应的插槽节点" })
    targetSlot: cc.Node = null;

    public isPlaced: boolean = false;
    private _startPos: cc.Vec2 = null;

    onLoad() {
        this.node.on(cc.Node.EventType.TOUCH_START, this.onTouchStart, this);
        this.node.on(cc.Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
        this.node.on(cc.Node.EventType.TOUCH_END, this.onTouchEnd, this);
        this.node.on(cc.Node.EventType.TOUCH_CANCEL, this.onTouchEnd, this);

        this._startPos = this.node.getPosition();
    }

    private onTouchStart() {
        if (this.isPlaced) return;
        this.node.setSiblingIndex(this.node.parent.childrenCount - 1);
    }

    private onTouchMove(event: cc.Event.EventTouch) {
        if (this.isPlaced) return;
        const delta = event.getDelta();
        this.node.x += delta.x;
        this.node.y += delta.y;
    }

    private onTouchEnd() {
        if (this.isPlaced) return;

        if (!this.targetSlot) {
            this.resetPosition();
            return;
        }

        // 检查吸附距离
        const slotWorldPos = this.targetSlot.convertToWorldSpaceAR(cc.Vec2.ZERO);
        const myWorldPos = this.node.convertToWorldSpaceAR(cc.Vec2.ZERO);
        const dist = slotWorldPos.sub(myWorldPos).mag();

        if (dist < DEFAULT_GAME_CONFIG.snapDistance) {
            // 吸附成功
            const localPos = this.node.parent.convertToNodeSpaceAR(slotWorldPos);
            this.node.setPosition(localPos);
            this.isPlaced = true;
            this.node.emit("piece-placed");
            // 向上冒泡通知 UI
            this.node.parent.parent.emit("piece-placed");
            Logger.getInstance().info("PuzzleGame", `拼图块 ${this.node.name} 已就位`);
        } else {
            this.resetPosition();
        }
    }

    private resetPosition() {
        cc.tween(this.node)
            .to(0.2, { position: cc.v3(this._startPos.x, this._startPos.y, 0) })
            .start();
    }
}
