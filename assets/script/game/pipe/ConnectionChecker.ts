const { ccclass, property } = cc._decorator;

/**
 * 水管块逻辑
 * 处理旋转与方向状态
 */
@ccclass
export default class ConnectionChecker extends cc.Component {
    @property({ type: cc.Integer, tooltip: "初始旋转次数 (0-3)" })
    initRotation: number = 0;

    /**
     * 方向掩码: 上=1, 右=2, 下=4, 左=8
     * 例如: 直管 (上下) = 1 | 4 = 5
     */
    @property({ type: cc.Integer, tooltip: "方向掩码" })
    dirMask: number = 5;

    private _currentRotationCount: number = 0;

    onLoad() {
        this._currentRotationCount = this.initRotation;
        this.node.angle = -this._currentRotationCount * 90;

        this.node.on(cc.Node.EventType.TOUCH_START, this.rotate, this);
    }

    public rotate() {
        this._currentRotationCount = (this._currentRotationCount + 1) % 4;

        cc.tween(this.node)
            .to(0.2, { angle: -this._currentRotationCount * 90 })
            .call(() => {
                this.node.parent.parent.emit("pipe-rotated");
            })
            .start();
    }

    /**
     * 获取当前实际的连接方向
     */
    public getActualDirections(): number {
        let mask = this.dirMask;
        for (let i = 0; i < this._currentRotationCount; i++) {
            // 位移旋转掩码: (mask << 1 | mask >> 3) & 0xF
            mask = ((mask << 1) | (mask >> 3)) & 0xf;
        }
        return mask;
    }
}
