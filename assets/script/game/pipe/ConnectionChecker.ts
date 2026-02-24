const { ccclass, property } = cc._decorator;

/**
 * 水管块逻辑（旧版组件，保留向后兼容）
 *
 * 新的管道游戏逻辑已迁移到 PipeControl 单例控制器中。
 * 此组件仅在已有预制体中仍然被引用时保留，
 * 新的 UIGamePipe 不再依赖此组件。
 *
 * 方向掩码定义: 上=1, 右=2, 下=4, 左=8
 */
@ccclass
export default class ConnectionChecker extends cc.Component {
    /** 初始旋转次数 (0-3) */
    @property({ type: cc.Integer, tooltip: "初始旋转次数 (0-3)" })
    initRotation: number = 0;

    /**
     * 方向掩码: 上=1, 右=2, 下=4, 左=8
     * 例如: 直管 (上下) = 1 | 4 = 5
     */
    @property({ type: cc.Integer, tooltip: "方向掩码" })
    dirMask: number = 5;

    /** 当前旋转次数 */
    private _currentRotationCount: number = 0;

    onLoad(): void {
        this._currentRotationCount = this.initRotation;
        this.node.angle = -this._currentRotationCount * 90;

        this.node.on(cc.Node.EventType.TOUCH_START, this._rotate, this);
    }

    onDestroy(): void {
        this.node.off(cc.Node.EventType.TOUCH_START, this._rotate, this);
    }

    /**
     * 旋转管道（每次顺时针 90°）
     */
    private _rotate(): void {
        this._currentRotationCount = (this._currentRotationCount + 1) % 4;

        cc.tween(this.node)
            .to(0.2, { angle: -this._currentRotationCount * 90 })
            .call(() => {
                if (this.node && this.node.parent && this.node.parent.parent) {
                    this.node.parent.parent.emit("pipe-rotated");
                }
            })
            .start();
    }

    /**
     * 获取当前实际的连接方向
     * @returns 旋转后的方向掩码
     */
    public getActualDirections(): number {
        let mask = this.dirMask;
        for (let i = 0; i < this._currentRotationCount; i++) {
            mask = ((mask << 1) | (mask >> 3)) & 0xf;
        }
        return mask;
    }

    /**
     * 获取当前旋转次数
     */
    public get currentRotationCount(): number {
        return this._currentRotationCount;
    }
}
