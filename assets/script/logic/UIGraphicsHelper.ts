/**
 * UI Graphics 绘制工具
 * 提供基于 cc.Graphics 的矢量绘制方法，替代纯色 Sprite
 * 支持圆角矩形、椭圆、渐变、星星、地鼠等复杂形状
 */

import { RGBA, UIThemeManager } from "../config/UITheme";

export class UIGraphicsHelper {
    // ===================== 基础形状 =====================

    /**
     * 绘制圆角矩形
     */
    static roundRect(g: cc.Graphics, x: number, y: number, w: number, h: number, r: number): void {
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

    /**
     * 绘制并填充圆角矩形 (居中)
     */
    static fillRoundRect(
        g: cc.Graphics,
        w: number,
        h: number,
        r: number,
        fillColor: RGBA,
        strokeColor?: RGBA,
        lineWidth: number = 0
    ): void {
        g.clear();
        if (strokeColor && lineWidth > 0) {
            g.lineWidth = lineWidth;
            g.strokeColor = UIThemeManager.toColor(strokeColor);
        }
        g.fillColor = UIThemeManager.toColor(fillColor);
        this.roundRect(g, -w / 2, -h / 2, w, h, r);
        g.fill();
        if (strokeColor && lineWidth > 0) {
            g.stroke();
        }
    }

    /**
     * 绘制椭圆 (居中)
     */
    static fillEllipse(g: cc.Graphics, rx: number, ry: number, fillColor: RGBA): void {
        g.fillColor = UIThemeManager.toColor(fillColor);
        g.ellipse(0, 0, rx, ry);
        g.fill();
    }

    /**
     * 绘制圆形 (居中)
     */
    static fillCircle(
        g: cc.Graphics,
        radius: number,
        fillColor: RGBA,
        strokeColor?: RGBA,
        lineWidth: number = 0
    ): void {
        g.fillColor = UIThemeManager.toColor(fillColor);
        if (strokeColor && lineWidth > 0) {
            g.lineWidth = lineWidth;
            g.strokeColor = UIThemeManager.toColor(strokeColor);
        }
        g.circle(0, 0, radius);
        g.fill();
        if (strokeColor && lineWidth > 0) {
            g.stroke();
        }
    }

    // ===================== 复合图形 =====================

    /**
     * 绘制渐变矩形背景 (上下两色, 用多条横线模拟)
     * @deprecated 请使用 UITextureHelper.createGradientBg 替代
     */
    static fillGradientRect(
        g: cc.Graphics,
        w: number,
        h: number,
        topColor: RGBA,
        bottomColor: RGBA,
        steps: number = 32
    ): void {
        g.clear();
        const stripH = h / steps;
        for (let i = 0; i < steps; i++) {
            const t = i / (steps - 1);
            const r = Math.round(topColor[0] + (bottomColor[0] - topColor[0]) * t);
            const gr = Math.round(topColor[1] + (bottomColor[1] - topColor[1]) * t);
            const b = Math.round(topColor[2] + (bottomColor[2] - topColor[2]) * t);
            g.fillColor = cc.color(r, gr, b);
            g.rect(-w / 2, h / 2 - (i + 1) * stripH, w, stripH + 0.5);
            g.fill();
        }
    }

    /**
     * 绘制 HUD 面板 (圆角 + 半透明底色 + 可选描边)
     * @deprecated 请使用 UITextureHelper.createPanel 替代
     */
    static drawHudPanel(g: cc.Graphics, w: number, h: number, bgColor: RGBA, radius: number, borderColor?: RGBA): void {
        g.clear();
        g.fillColor = UIThemeManager.toColor(bgColor);
        if (borderColor) {
            g.lineWidth = 2;
            g.strokeColor = UIThemeManager.toColor(borderColor);
        }
        this.roundRect(g, -w / 2, -h / 2, w, h, radius);
        g.fill();
        if (borderColor) g.stroke();
    }

    /**
     * 绘制按钮 (圆角矩形 + 底部阴影)
     * @deprecated 请使用 UITextureHelper.createButton 替代
     */
    static drawButton(
        g: cc.Graphics,
        w: number,
        h: number,
        bgColor: RGBA,
        radius: number,
        shadowDepth: number = 4
    ): void {
        g.clear();
        // 阴影层
        if (shadowDepth > 0) {
            const shadowColor = UIThemeManager.darken(bgColor, 60);
            g.fillColor = UIThemeManager.toColor(shadowColor);
            this.roundRect(g, -w / 2, -h / 2 - shadowDepth, w, h, radius);
            g.fill();
        }
        // 主体
        g.fillColor = UIThemeManager.toColor(bgColor);
        this.roundRect(g, -w / 2, -h / 2, w, h, radius);
        g.fill();
        // 高光线 (顶部一条亮边)
        const highlightColor = UIThemeManager.lighten(bgColor, 40);
        g.strokeColor = UIThemeManager.toColor(highlightColor);
        g.lineWidth = 2;
        g.moveTo(-w / 2 + radius, h / 2);
        g.lineTo(w / 2 - radius, h / 2);
        g.stroke();
    }

    // ===================== 游戏元素 =====================

    /**
     * 绘制洞口 (椭圆 + 内阴影效果)
     */
    static drawHole(g: cc.Graphics, rx: number, ry: number, darkColor: RGBA): void {
        g.clear();
        // 外层暗环
        g.fillColor = UIThemeManager.toColor(darkColor);
        g.ellipse(0, 0, rx + 4, ry + 3);
        g.fill();
        // 内层更深
        const innerColor = UIThemeManager.darken(darkColor, 25);
        g.fillColor = UIThemeManager.toColor(innerColor);
        g.ellipse(0, 0, rx, ry);
        g.fill();
        // 高光弧 (顶部弧线模拟光照)
        const hlColor = UIThemeManager.lighten(darkColor, 30);
        g.strokeColor = UIThemeManager.toColor(hlColor);
        g.lineWidth = 2;
        g.arc(0, 0, rx - 2, Math.PI * 0.8, Math.PI * 0.2, false);
        g.stroke();
    }

    /**
     * 绘制地鼠身体
     * 组合: 身体椭圆 + 脸颊 + 眼睛 + 鼻子 + 嘴
     */
    static drawMole(g: cc.Graphics, bodyW: number, bodyH: number, primaryColor: RGBA, secondaryColor: RGBA): void {
        g.clear();
        const lighter = UIThemeManager.lighten(primaryColor, 40);

        // ---- 身体 (椭圆) ----
        g.fillColor = UIThemeManager.toColor(primaryColor);
        g.ellipse(0, 0, bodyW / 2, bodyH / 2);
        g.fill();

        // ---- 肚皮 (浅色椭圆) ----
        g.fillColor = UIThemeManager.toColor(lighter);
        g.ellipse(0, -bodyH * 0.1, bodyW * 0.35, bodyH * 0.3);
        g.fill();

        // ---- 脸颊腮红 ----
        const cheekColor: RGBA = [255, 160, 140, 100];
        g.fillColor = UIThemeManager.toColor(cheekColor);
        g.circle(-bodyW * 0.22, bodyH * 0.05, bodyW * 0.1);
        g.fill();
        g.circle(bodyW * 0.22, bodyH * 0.05, bodyW * 0.1);
        g.fill();

        // ---- 眼睛 ----
        const eyeY = bodyH * 0.18;
        const eyeSpacing = bodyW * 0.15;
        // 眼白
        g.fillColor = cc.Color.WHITE;
        g.ellipse(-eyeSpacing, eyeY, bodyW * 0.09, bodyH * 0.1);
        g.fill();
        g.ellipse(eyeSpacing, eyeY, bodyW * 0.09, bodyH * 0.1);
        g.fill();
        // 瞳孔
        g.fillColor = cc.color(30, 30, 30);
        g.circle(-eyeSpacing + 1, eyeY, bodyW * 0.045);
        g.fill();
        g.circle(eyeSpacing + 1, eyeY, bodyW * 0.045);
        g.fill();
        // 高光点
        g.fillColor = cc.color(255, 255, 255, 200);
        g.circle(-eyeSpacing + 3, eyeY + 2, bodyW * 0.02);
        g.fill();
        g.circle(eyeSpacing + 3, eyeY + 2, bodyW * 0.02);
        g.fill();

        // ---- 鼻子 ----
        g.fillColor = UIThemeManager.toColor(secondaryColor);
        g.ellipse(0, eyeY - bodyH * 0.08, bodyW * 0.06, bodyH * 0.04);
        g.fill();

        // ---- 嘴巴 (微笑弧线) ----
        g.strokeColor = UIThemeManager.toColor(secondaryColor);
        g.lineWidth = 2;
        g.arc(0, eyeY - bodyH * 0.16, bodyW * 0.1, Math.PI * 0.15, Math.PI * 0.85, false);
        g.stroke();

        // ---- 耳朵 ----
        g.fillColor = UIThemeManager.toColor(primaryColor);
        g.circle(-bodyW * 0.35, bodyH * 0.3, bodyW * 0.1);
        g.fill();
        g.circle(bodyW * 0.35, bodyH * 0.3, bodyW * 0.1);
        g.fill();
        // 耳朵内圈
        g.fillColor = UIThemeManager.toColor(lighter);
        g.circle(-bodyW * 0.35, bodyH * 0.3, bodyW * 0.055);
        g.fill();
        g.circle(bodyW * 0.35, bodyH * 0.3, bodyW * 0.055);
        g.fill();
    }

    /**
     * 绘制被锤击的地鼠 (眼睛变 X, 冒星星)
     */
    static drawMoleHit(g: cc.Graphics, bodyW: number, bodyH: number, primaryColor: RGBA, secondaryColor: RGBA): void {
        g.clear();
        const lighter = UIThemeManager.lighten(primaryColor, 40);

        // 身体
        g.fillColor = UIThemeManager.toColor(primaryColor);
        g.ellipse(0, 0, bodyW / 2, bodyH / 2);
        g.fill();

        // 肚皮
        g.fillColor = UIThemeManager.toColor(lighter);
        g.ellipse(0, -bodyH * 0.1, bodyW * 0.35, bodyH * 0.3);
        g.fill();

        // 眼睛 X_X
        const eyeY = bodyH * 0.18;
        const eyeSpacing = bodyW * 0.15;
        g.strokeColor = cc.color(30, 30, 30);
        g.lineWidth = 3;
        const s = bodyW * 0.06;
        // 左眼 X
        g.moveTo(-eyeSpacing - s, eyeY - s);
        g.lineTo(-eyeSpacing + s, eyeY + s);
        g.stroke();
        g.moveTo(-eyeSpacing + s, eyeY - s);
        g.lineTo(-eyeSpacing - s, eyeY + s);
        g.stroke();
        // 右眼 X
        g.moveTo(eyeSpacing - s, eyeY - s);
        g.lineTo(eyeSpacing + s, eyeY + s);
        g.stroke();
        g.moveTo(eyeSpacing + s, eyeY - s);
        g.lineTo(eyeSpacing - s, eyeY + s);
        g.stroke();

        // 嘴巴 (波浪)
        g.strokeColor = UIThemeManager.toColor(secondaryColor);
        g.lineWidth = 2;
        g.moveTo(-bodyW * 0.1, eyeY - bodyH * 0.15);
        g.bezierCurveTo(
            -bodyW * 0.05,
            eyeY - bodyH * 0.1,
            bodyW * 0.05,
            eyeY - bodyH * 0.2,
            bodyW * 0.1,
            eyeY - bodyH * 0.15
        );
        g.stroke();

        // 耳朵
        g.fillColor = UIThemeManager.toColor(primaryColor);
        g.circle(-bodyW * 0.35, bodyH * 0.3, bodyW * 0.1);
        g.fill();
        g.circle(bodyW * 0.35, bodyH * 0.3, bodyW * 0.1);
        g.fill();
    }

    /**
     * 绘制星星 (得分特效用)
     */
    static drawStar(g: cc.Graphics, outerR: number, innerR: number, points: number, fillColor: RGBA): void {
        g.fillColor = UIThemeManager.toColor(fillColor);
        const step = Math.PI / points;
        g.moveTo(0, outerR);
        for (let i = 1; i <= 2 * points; i++) {
            const r = i % 2 === 0 ? outerR : innerR;
            const angle = i * step + Math.PI / 2;
            g.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
        }
        g.close();
        g.fill();
    }

    /**
     * 绘制草地装饰 (随机小草, 用在背景上)
     */
    static drawGrassRow(g: cc.Graphics, w: number, y: number, color: RGBA, count: number = 12): void {
        g.strokeColor = UIThemeManager.toColor(color);
        g.lineWidth = 3;
        const spacing = w / count;
        for (let i = 0; i < count; i++) {
            const x = -w / 2 + i * spacing + Math.random() * spacing * 0.5;
            const h = 8 + Math.random() * 14;
            const lean = (Math.random() - 0.5) * 8;
            g.moveTo(x, y);
            g.bezierCurveTo(x + lean * 0.5, y + h * 0.5, x + lean, y + h * 0.8, x + lean * 0.7, y + h);
            g.stroke();
        }
    }

    /**
     * 在目标节点上创建/获取 Graphics 组件
     */
    static ensureGraphics(node: cc.Node): cc.Graphics {
        let g = node.getComponent(cc.Graphics);
        if (!g) {
            g = node.addComponent(cc.Graphics);
        }
        return g;
    }
}
