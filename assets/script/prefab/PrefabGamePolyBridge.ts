const { ccclass, property } = cc._decorator;

/**
 * 桥梁线段组件
 * [Prefab 结构说明]
 * - Bridge (挂载此脚本, cc.Graphics)
 */
@ccclass
export default class PrefabGamePolyBridge extends cc.Component {
    @property(cc.Node)
    startPoint: cc.Node = null;

    @property(cc.Node)
    endPoint: cc.Node = null;

    private _line: cc.Graphics = null;

    onLoad() {
        this._line = this.getComponent(cc.Graphics);
    }

    update(dt: number) {
        if (!this.startPoint || !this.endPoint) return;

        this._line.clear();
        this._line.moveTo(this.startPoint.x, this.startPoint.y);
        this._line.lineTo(this.endPoint.x, this.endPoint.y);
        this._line.stroke();
    }
}
