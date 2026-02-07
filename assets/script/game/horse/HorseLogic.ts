import { Logger } from "../../logic/Logger";

const { ccclass, property } = cc._decorator;

/**
 * 马儿移动逻辑
 */
@ccclass
export default class HorseLogic extends cc.Component {
    @property(cc.Node)
    lineDrawer: cc.Node = null;

    private _path: cc.Vec2[] = [];
    private _isMoving: boolean = false;

    /** 移动速度 (像素/秒) */
    public moveSpeed: number = 300;

    onLoad() {
        if (this.lineDrawer) {
            this.lineDrawer.on("line-finished", this.startMove, this);
        }
    }

    /**
     * 开始沿路径移动 (US1/T005)
     */
    public startMove(points: cc.Vec2[]) {
        if (this._isMoving || points.length < 2) return;
        this._path = points;
        this._isMoving = true;
        this.moveNext();
    }

    private moveNext() {
        if (this._path.length < 2) {
            this._isMoving = false;
            Logger.getInstance().info("HorseGame", "到达路径终点");
            return;
        }

        const startPos = this._path.shift();
        const endPos = this._path[0];
        const distance = endPos.sub(startPos).mag();
        const duration = distance / this.moveSpeed;

        cc.tween(this.node)
            .to(duration, { position: cc.v3(endPos.x, endPos.y, 0) })
            .call(() => {
                this.moveNext();
            })
            .start();
    }

    /**
     * 重置位置
     */
    public reset(startPos: cc.Vec2) {
        this.node.stopAllActions();
        this.node.setPosition(startPos.x, startPos.y);
        this._isMoving = false;
    }
}
