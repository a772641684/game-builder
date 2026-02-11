import { UIThemeManager } from "../config/UITheme";
import { UIGraphicsHelper } from "../logic/UIGraphicsHelper";

const { ccclass, property } = cc._decorator;

/**
 * 地鼠洞预制体脚本
 * [Prefab 结构说明]
 * - PrefabGameMoleHole (挂载此脚本, size(150, 150))
 *   - HoleBg (cc.Sprite, size(130, 70), pos(0, -25), color(60, 40, 20))
 *   - MoleNode (cc.Node, size(100, 100), pos(0, -80), opacity(0))
 *     - MoleSprite (cc.Sprite, size(80, 80), color(180, 110, 55))
 *   - HitEffect (cc.Node, pos(0, 30), active=false)
 *     - StarLabel (cc.Label, text("+10"), fontSize(32), fontColor(255, 220, 50))
 */
@ccclass
export default class PrefabGameMoleHole extends cc.Component {
    /**
     * @description 地鼠容器节点
     * 节点路径: MoleNode
     */
    @property(cc.Node)
    moleNode: cc.Node = null;

    /**
     * @description 击中特效容器
     * 节点路径: HitEffect
     */
    @property(cc.Node)
    hitEffect: cc.Node = null;

    /**
     * @description 击中得分文本
     * 节点路径: StarLabel
     */
    @property(cc.Label)
    hitLabel: cc.Label = null;

    /** 洞口索引 */
    public holeIndex: number = 0;
    /** 是否正在动画中 */
    private _isAnimating: boolean = false;
    /** 地鼠展示计时器 */
    private _hideTimer: number = -1;

    /** 外部回调: 地鼠被点击 */
    public onWhack: (index: number) => void = null;
    /** 外部回调: 地鼠超时缩回 */
    public onTimeout: (index: number) => void = null;

    // ===== Graphics 节点 =====
    private _holeGfxNode: cc.Node = null;
    private _moleGfxNode: cc.Node = null;
    private _hitStarNode: cc.Node = null;
    private _isHit: boolean = false;
    /** 星星 Sprite 节点 (Kenney 资源) */
    private _starSpriteNode: cc.Node = null;

    onLoad() {
        // 初始隐藏地鼠和特效
        if (this.moleNode) {
            this.moleNode.y = -80;
            this.moleNode.opacity = 0;
        }
        if (this.hitEffect) {
            this.hitEffect.active = false;
        }

        // 用 Graphics 绘制洞口和地鼠
        this._buildGraphics();

        // 绑定点击事件到整个洞口
        this.node.on(cc.Node.EventType.TOUCH_END, this._onTap, this);
    }

    /** 构建矢量绘制元素 */
    private _buildGraphics(): void {
        const theme = UIThemeManager.current;

        // 洞口 (Graphics 椭圆)
        if (!this._holeGfxNode) {
            this._holeGfxNode = new cc.Node("HoleGfx");
            this._holeGfxNode.parent = this.node;
            this._holeGfxNode.y = -30;
            this._holeGfxNode.zIndex = 0;
        }
        this._drawHole(theme);

        // 地鼠 (Graphics 绘制)
        if (this.moleNode) {
            if (!this._moleGfxNode) {
                this._moleGfxNode = new cc.Node("MoleGfx");
                this._moleGfxNode.parent = this.moleNode;
                this._moleGfxNode.y = 40;
            }
            this._drawMole(theme, false);
        }

        // 击中星星特效
        if (this.hitEffect) {
            if (!this._hitStarNode) {
                this._hitStarNode = new cc.Node("StarGfx");
                this._hitStarNode.parent = this.hitEffect;
                this._hitStarNode.setPosition(30, 10);
            }
            this._drawStar(theme);
        }
    }

    private _drawHole(theme: typeof UIThemeManager.current): void {
        const g = UIGraphicsHelper.ensureGraphics(this._holeGfxNode);
        UIGraphicsHelper.drawHole(g, 60, 25, theme.gameArea.dark);
    }

    private _drawMole(theme: typeof UIThemeManager.current, isHit: boolean): void {
        if (!this._moleGfxNode) return;
        const g = UIGraphicsHelper.ensureGraphics(this._moleGfxNode);
        if (isHit) {
            UIGraphicsHelper.drawMoleHit(g, 70, 65, theme.gameArea.entityPrimary, theme.gameArea.entitySecondary);
        } else {
            UIGraphicsHelper.drawMole(g, 70, 65, theme.gameArea.entityPrimary, theme.gameArea.entitySecondary);
        }
    }

    private _drawStar(theme: typeof UIThemeManager.current): void {
        if (!this._hitStarNode) return;
        const g = UIGraphicsHelper.ensureGraphics(this._hitStarNode);
        UIGraphicsHelper.drawStar(g, 14, 6, 5, theme.fx.scorePopColor);
    }

    /** 主题切换时重绘所有图形 */
    public repaint(): void {
        const theme = UIThemeManager.current;
        if (this._holeGfxNode) this._drawHole(theme);
        if (this._moleGfxNode) this._drawMole(theme, this._isHit);
        if (this._hitStarNode && this._hitStarNode.active) this._drawStar(theme);
        // 星星 Sprite 重新染色
        if (this._starSpriteNode && this._starSpriteNode.isValid) {
            this._starSpriteNode.color = UIThemeManager.toColor(theme.fx.scorePopColor);
        }
        // 更新得分文字颜色
        if (this.hitLabel) {
            this.hitLabel.node.color = UIThemeManager.toColor(theme.fx.scorePopColor);
        }
    }

    /**
     * 设置击中星星的 SpriteFrame (从外部传入 Kenney 星星图)
     * @param sf 星星图片
     */
    public setStarSpriteFrame(sf: cc.SpriteFrame): void {
        if (!this.hitEffect) return;

        // 创建或获取星星 Sprite 节点
        if (!this._starSpriteNode) {
            this._starSpriteNode = new cc.Node("StarSprite");
            this._starSpriteNode.parent = this.hitEffect;
            this._starSpriteNode.setPosition(30, 10);
            const sprite = this._starSpriteNode.addComponent(cc.Sprite);
            sprite.sizeMode = cc.Sprite.SizeMode.CUSTOM;
        }
        this._starSpriteNode.setContentSize(28, 26);
        const sprite = this._starSpriteNode.getComponent(cc.Sprite);
        if (sprite) {
            sprite.spriteFrame = sf;
        }
        // 主题色
        this._starSpriteNode.color = UIThemeManager.toColor(UIThemeManager.current.fx.scorePopColor);

        // 隐藏 Graphics 星星 (如果有的话)
        if (this._hitStarNode) {
            this._hitStarNode.active = false;
        }
    }

    /**
     * 初始化
     * @param index 洞口索引
     */
    public init(index: number): void {
        this.holeIndex = index;
    }

    /**
     * 弹出地鼠
     * @param stayDuration 停留时间 (秒)
     */
    public showMole(stayDuration: number): void {
        if (this._isAnimating) return;
        this._isAnimating = true;
        this._isHit = false;

        // 重绘正常表情
        this._drawMole(UIThemeManager.current, false);

        if (this.moleNode) {
            this.moleNode.stopAllActions();
            this.moleNode.opacity = 255;

            // 弹出动画
            cc.tween(this.moleNode).to(0.15, { y: 20 }, { easing: "backOut" }).start();
        }

        // 设置自动缩回计时器
        this._hideTimer = setTimeout(() => {
            this.hideMole(false);
        }, stayDuration * 1000) as any;
    }

    /**
     * 缩回地鼠
     * @param wasHit 是否被击中
     */
    public hideMole(wasHit: boolean): void {
        if (this._hideTimer >= 0) {
            clearTimeout(this._hideTimer);
            this._hideTimer = -1;
        }

        if (this.moleNode) {
            this.moleNode.stopAllActions();
            cc.tween(this.moleNode)
                .to(0.12, { y: -80, opacity: 0 }, { easing: "backIn" })
                .call(() => {
                    this._isAnimating = false;
                    if (!wasHit && this.onTimeout) {
                        this.onTimeout(this.holeIndex);
                    }
                })
                .start();
        } else {
            this._isAnimating = false;
            if (!wasHit && this.onTimeout) {
                this.onTimeout(this.holeIndex);
            }
        }
    }

    /**
     * 播放击中特效
     */
    public playHitEffect(points: number): void {
        if (this._hideTimer >= 0) {
            clearTimeout(this._hideTimer);
            this._hideTimer = -1;
        }

        this._isHit = true;
        // 切换为被击表情 (X_X)
        this._drawMole(UIThemeManager.current, true);

        // 击中震动
        if (this.moleNode) {
            this.moleNode.stopAllActions();
            cc.tween(this.moleNode)
                .to(0.05, { scaleX: 1.3, scaleY: 0.7 })
                .to(0.1, { scaleX: 1, scaleY: 1, y: -80, opacity: 0 })
                .call(() => {
                    this._isAnimating = false;
                })
                .start();
        }

        // 得分飘字
        if (this.hitEffect && this.hitLabel) {
            this.hitEffect.active = true;
            this.hitLabel.string = "+" + points;
            this.hitEffect.y = 30;
            this.hitEffect.opacity = 255;

            cc.tween(this.hitEffect)
                .to(0.6, { y: 100, opacity: 0 }, { easing: "sineOut" })
                .call(() => {
                    this.hitEffect.active = false;
                })
                .start();
        }
    }

    private _onTap(): void {
        if (this.onWhack) {
            this.onWhack(this.holeIndex);
        }
    }

    onDestroy() {
        if (this._hideTimer >= 0) {
            clearTimeout(this._hideTimer);
        }
    }
}
