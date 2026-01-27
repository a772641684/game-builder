const { ccclass, property } = cc._decorator;
import { Logger } from "../logic/Logger";
import { SheepMatchControl } from "../logic/SheepMatchControl";

/**
 * 消除方块脚本
 * [Prefab 结构说明]:
 * - PrefabGameTile (Root): 包含此脚本。
 *   - Icon: 显示物体图像。
 *   - BlockMask: 遮挡状态下显示的半透明蒙版节点。
 */
@ccclass
export default class PrefabGameTile extends cc.Component {
    /** 方块唯一 ID */
    public uid: string = "";
    /** 类型 ID (用于消除判定) */
    public typeId: string = "";
    /** 层级编号 */
    public layer: number = 0;

    /** 遮挡状态 */
    public isBlocked: boolean = false;

    @property(cc.Node)
    protected iconNode: cc.Node = null;

    @property(cc.Node)
    protected blockMask: cc.Node = null;

    /**
     * 初始化方块数据与表现 (T007)
     */
    public init(uid: string, typeId: string, layer: number): void {
        this.uid = uid;
        this.typeId = typeId;
        this.layer = layer;

        this.updateIcon();
    }

    /**
     * 根据 typeId 更新图标显示 (此处逻辑应结合资源管理)
     */
    private updateIcon(): void {
        if (!this.iconNode) return;

        // 实际项目中应从 cc.resources 加载或使用 SpriteAtlas
        // 此处打印日志模拟逻辑
        Logger.getInstance().info("Match", `方块图标已初始化: 类型 ${this.typeId}`);

        // 示例代码：
        // const sprite = this.iconNode.getComponent(cc.Sprite);
        // if (sprite) {
        //     cc.resources.load(`textures/icons/${this.typeId}`, cc.SpriteFrame, (err, sf) => {
        //         if (!err) sprite.spriteFrame = sf;
        //     });
        // }
    }

    protected onLoad(): void {
        this.node.on(cc.Node.EventType.TOUCH_END, this.onClick, this);
    }

    /**
     * 更新遮挡渲染效果
     */
    public setBlockedState(isBlocked: boolean): void {
        this.isBlocked = isBlocked;
        if (this.blockMask) {
            this.blockMask.active = isBlocked;
        }
        // 被遮挡时降低整体亮度或修改色偏
        this.node.opacity = isBlocked ? 180 : 255;
    }

    private onClick(): void {
        Logger.getInstance().info("Match", `方块被点击: UID=${this.uid}, Type=${this.typeId}`);
        SheepMatchControl.getInstance().handleTileClick(this);
    }
}
