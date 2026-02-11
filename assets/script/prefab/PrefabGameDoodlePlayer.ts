import { DoodleControl } from "../logic/DoodleControl";
import { Logger } from "../logic/Logger";

const { ccclass, property } = cc._decorator;

/**
 * 涂鸦跳跃角色组件
 * 不依赖物理引擎，由 UIPlayGroundGameDoodle 驱动运动
 *
 * [Prefab 结构说明]
 * - Player (挂载此脚本, size(50, 50))
 *   - BodyGfx (cc.Graphics, 绘制角色身体)
 */
@ccclass
export default class PrefabGameDoodlePlayer extends cc.Component {
    /** 角色朝向 (1=右, -1=左) */
    private _facing: number = 1;
    /** 身体 Graphics */
    private _bodyGfx: cc.Graphics = null;

    onLoad(): void {
        this._bodyGfx = this._ensureBodyGfx();
        Logger.getInstance().info("Doodle", "角色组件加载完成");
    }

    /**
     * 设置角色朝向并翻转
     * @param dir 1=右 -1=左
     */
    public setFacing(dir: number): void {
        if (dir === 0) return;
        this._facing = dir > 0 ? 1 : -1;
        this.node.scaleX = this._facing;
    }

    /**
     * 获取当前朝向
     */
    public get facing(): number {
        return this._facing;
    }

    /**
     * 用主题色重新绘制角色
     * @param primaryColor 主体色 [r,g,b]
     * @param secondaryColor 辅助色 [r,g,b]
     */
    public redraw(primaryColor: number[], secondaryColor: number[]): void {
        if (!this._bodyGfx) return;
        var g = this._bodyGfx;
        g.clear();

        var pw = DoodleControl.instance.config.playerWidth;
        var ph = DoodleControl.instance.config.playerHeight;
        var halfW = pw / 2;
        var halfH = ph / 2;

        // ---- 身体 (圆角矩形) ----
        g.fillColor = cc.color(primaryColor[0], primaryColor[1], primaryColor[2]);
        this._roundRect(g, -halfW, -halfH, pw, ph, 10);
        g.fill();

        // ---- 肚子 (浅色椭圆) ----
        var lighter = [
            Math.min(255, primaryColor[0] + 50),
            Math.min(255, primaryColor[1] + 50),
            Math.min(255, primaryColor[2] + 50),
        ];
        g.fillColor = cc.color(lighter[0], lighter[1], lighter[2]);
        g.ellipse(0, -halfH * 0.2, halfW * 0.6, halfH * 0.5);
        g.fill();

        // ---- 眼睛 ----
        var eyeY = halfH * 0.25;
        var eyeSpacing = halfW * 0.3;
        // 眼白
        g.fillColor = cc.Color.WHITE;
        g.circle(-eyeSpacing, eyeY, halfW * 0.2);
        g.fill();
        g.circle(eyeSpacing, eyeY, halfW * 0.2);
        g.fill();
        // 瞳孔
        g.fillColor = cc.color(30, 30, 30);
        g.circle(-eyeSpacing + 2, eyeY, halfW * 0.1);
        g.fill();
        g.circle(eyeSpacing + 2, eyeY, halfW * 0.1);
        g.fill();

        // ---- 嘴巴 (微笑弧线) ----
        g.strokeColor = cc.color(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
        g.lineWidth = 2;
        g.arc(0, eyeY - halfH * 0.35, halfW * 0.25, Math.PI * 0.15, Math.PI * 0.85, false);
        g.stroke();

        // ---- 脚 (两个小椭圆) ----
        g.fillColor = cc.color(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
        g.ellipse(-halfW * 0.35, -halfH - 4, halfW * 0.25, 5);
        g.fill();
        g.ellipse(halfW * 0.35, -halfH - 4, halfW * 0.25, 5);
        g.fill();
    }

    /**
     * 播放跳跃挤压动效
     */
    public playJumpAnim(): void {
        cc.tween(this.node).to(0.06, { scaleY: 0.75 }).to(0.15, { scaleY: 1.0 }, { easing: "backOut" }).start();
    }

    /**
     * 创建或获取身体 Graphics 节点
     */
    private _ensureBodyGfx(): cc.Graphics {
        var child = this.node.getChildByName("BodyGfx");
        if (!child) {
            child = new cc.Node("BodyGfx");
            child.parent = this.node;
            child.setPosition(0, 0);
        }
        var g = child.getComponent(cc.Graphics);
        if (!g) {
            g = child.addComponent(cc.Graphics);
        }
        return g;
    }

    /**
     * 绘制圆角矩形路径
     */
    private _roundRect(g: cc.Graphics, x: number, y: number, w: number, h: number, r: number): void {
        r = Math.min(r, w / 2, h / 2);
        g.moveTo(x + r, y);
        g.lineTo(x + w - r, y);
        g.arc(x + w - r, y + r, r, -Math.PI / 2, 0, false);
        g.lineTo(x + w, y + h - r);
        g.arc(x + w - r, y + h - r, r, 0, Math.PI / 2, false);
        g.lineTo(x + r, y + h);
        g.arc(x + r, y + h - r, r, Math.PI / 2, Math.PI, false);
        g.lineTo(x, y + r);
        g.arc(x + r, y + r, r, Math.PI, (Math.PI * 3) / 2, false);
        g.close();
    }
}
