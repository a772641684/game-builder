const { ccclass, property } = cc._decorator;

/**
 * 合成方格组件
 * [Prefab 结构说明]
 * - PrefabMergeSquare
 *   - Visual (cc.Sprite)
 *   - TypeLabel (cc.Label)
 */
@ccclass
export default class PrefabMergeSquare extends cc.Component {
    /**
     * @description 方格视觉背景
     * 节点路径: Visual
     */
    @property(cc.Sprite)
    protected visual: cc.Sprite = null;

    /**
     * @description 等级文本
     * 节点路径: TypeLabel
     */
    @property(cc.Label)
    protected typeLabel: cc.Label = null;

    /** 逻辑类型/等级 */
    public type: number = 0;
    /** 网格坐标 X */
    public gridX: number = 0;
    /** 网格坐标 Y */
    public gridY: number = 0;

    /**
     * 初始化方格
     * @param type 类型 (1-5+)
     * @param x 网格 X
     * @param y 网格 Y
     */
    public init(type: number, x: number, y: number): void {
        this.type = type;
        this.gridX = x;
        this.gridY = y;
        this.updateAppearance();
    }

    /**
     * 更新方格视觉表现
     */
    public updateAppearance(): void {
        if (this.typeLabel) {
            this.typeLabel.string = this.type.toString();
        }

        // 根据类型设置不同颜色 (1-5 为例)
        const colors = [
            cc.Color.WHITE, // 0 (unused)
            cc.color(255, 100, 100), // 1: Reddish
            cc.color(100, 255, 100), // 2: Greenish
            cc.color(100, 100, 255), // 3: Blueish
            cc.color(255, 255, 100), // 4: Yellowish
            cc.color(255, 100, 255), // 5: Purpleish
        ];

        if (this.visual) {
            // 对于 5 以上的等级，使用循环色或加深处理
            let colorIndex = this.type % colors.length;
            if (colorIndex === 0) colorIndex = 1;
            this.visual.node.color = colors[colorIndex];
        }
    }
}
