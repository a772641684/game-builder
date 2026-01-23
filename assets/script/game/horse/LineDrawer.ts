import { Logger } from "../../logic/Logger";

const { ccclass, property } = cc._decorator;

/**
 * 划线组件
 * 负责手势采样与 Graphics 绘图
 */
@ccclass
export default class LineDrawer extends cc.Component {
    private _graphics: cc.Graphics = null;
    private _points: cc.Vec2[] = [];
    private _isDrawing: boolean = false;

    onLoad() {
        this._graphics = this.getComponent(cc.Graphics);
        if (!this._graphics) {
            this._graphics = this.addComponent(cc.Graphics);
        }

        this.node.on(cc.Node.EventType.TOUCH_START, this.onTouchStart, this);
        this.node.on(cc.Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
        this.node.on(cc.Node.EventType.TOUCH_END, this.onTouchEnd, this);
        this.node.on(cc.Node.EventType.TOUCH_CANCEL, this.onTouchEnd, this);
    }

    private onTouchStart(event: cc.Event.EventTouch) {
        this._isDrawing = true;
        this._graphics.clear();
        this._points = [];
        const pos = this.node.convertToNodeSpaceAR(event.getLocation());
        this._points.push(pos);
        this._graphics.moveTo(pos.x, pos.y);
    }

    private onTouchMove(event: cc.Event.EventTouch) {
        if (!this._isDrawing) return;
        const pos = this.node.convertToNodeSpaceAR(event.getLocation());

        // 简单的距离采样优化
        const lastPos = this._points[this._points.length - 1];
        if (pos.sub(lastPos).mag() > 5) {
            this._points.push(pos);
            this._graphics.lineTo(pos.x, pos.y);
            this._graphics.stroke();
        }
    }

    private onTouchEnd() {
        this._isDrawing = false;
        Logger.getInstance().info("HorseGame", `划线完成，共采样 ${this._points.length} 个点`);
        // 发送事件通知马儿移动
        this.node.emit("draw-complete", this._points);
    }

    /**
     * 清除画线
     */
    public clear() {
        this._graphics.clear();
        this._points = [];
    }
}
