/**
 * UI 纹理辅助工具
 * 提供基于动态加载纹理(Sprite)的 UI 构建方法，替代 cc.Graphics 绘制
 * 通过 node.color 实现主题染色，使用九宫格拉伸适配任意尺寸
 */

import { ITexturePackConfig, IUITheme, RGBA, UIThemeManager } from "../config/UITheme";
import { Loader } from "./Loader";
import { Logger } from "./Logger";

/** 纹理缓存 key → SpriteFrame */
type SFCache = Map<string, cc.SpriteFrame>;

/**
 * UI 纹理辅助工具类
 * 用于替代 UIGraphicsHelper 中的 UI 绘制方法，
 * 通过动态加载 texture 图片 + Sprite 组件来构建 UI 元素
 */
export class UITextureHelper {
    // ===================== 纹理缓存管理 =====================

    /** 全局 SpriteFrame 缓存 */
    private static _cache: SFCache = new Map();

    /**
     * 预加载指定主题的全部纹理资源
     * @param theme 主题对象（使用其 texturePack 字段）
     * @param onDone 全部加载完成回调
     */
    static preloadThemePack(theme: IUITheme, onDone: () => void): void {
        const pack = theme.texturePack;
        if (!pack) {
            Logger.getInstance().warn("UITextureHelper", "主题缺少 texturePack 配置");
            onDone();
            return;
        }

        const paths = UITextureHelper._collectPaths(pack);
        UITextureHelper.preloadPaths(paths, onDone);
    }

    /**
     * 预加载多套主题的全部纹理资源（去重后批量加载）
     * @param themes 主题数组
     * @param onDone 全部加载完成回调
     */
    static preloadAllThemePacks(themes: IUITheme[], onDone: () => void): void {
        const allPaths: Set<string> = new Set();
        for (let i = 0; i < themes.length; i++) {
            const pack = themes[i].texturePack;
            if (pack) {
                const paths = UITextureHelper._collectPaths(pack);
                for (let j = 0; j < paths.length; j++) {
                    allPaths.add(paths[j]);
                }
            }
        }
        const uniquePaths: string[] = [];
        allPaths.forEach((p) => uniquePaths.push(p));
        UITextureHelper.preloadPaths(uniquePaths, onDone);
    }

    /**
     * 批量预加载资源路径
     * @param paths resources 下的路径数组（不含扩展名）
     * @param onDone 完成回调
     */
    static preloadPaths(paths: string[], onDone: () => void): void {
        if (!paths || paths.length === 0) {
            onDone();
            return;
        }

        // 过滤已缓存的
        const toLoad: string[] = [];
        for (let i = 0; i < paths.length; i++) {
            if (!UITextureHelper._cache.has(paths[i])) {
                toLoad.push(paths[i]);
            }
        }
        if (toLoad.length === 0) {
            onDone();
            return;
        }

        let loaded = 0;
        const total = toLoad.length;
        for (let i = 0; i < total; i++) {
            const resPath = toLoad[i];
            Loader.instance.load(resPath, cc.SpriteFrame, (err: Error, sf: cc.SpriteFrame) => {
                if (!err && sf) {
                    UITextureHelper._cache.set(resPath, sf);
                } else {
                    Logger.getInstance().warn("UITextureHelper", "纹理加载失败: " + resPath);
                }
                loaded++;
                if (loaded >= total) {
                    Logger.getInstance().info(
                        "UITextureHelper",
                        "纹理预加载完成 (" + UITextureHelper._cache.size + " 张)"
                    );
                    onDone();
                }
            });
        }
    }

    /**
     * 获取已缓存的 SpriteFrame
     * @param path 资源路径
     * @returns SpriteFrame 或 null
     */
    static getSpriteFrame(path: string): cc.SpriteFrame {
        return UITextureHelper._cache.get(path) || null;
    }

    /**
     * 清理全部缓存（场景切换时调用）
     */
    static clearCache(): void {
        UITextureHelper._cache.clear();
    }

    /** 从 ITexturePackConfig 中收集所有资源路径（去重） */
    private static _collectPaths(pack: ITexturePackConfig): string[] {
        const set: Set<string> = new Set();
        const keys = Object.keys(pack);
        for (let i = 0; i < keys.length; i++) {
            const val = (pack as any)[keys[i]] as string;
            if (val) {
                set.add(val);
            }
        }
        const arr: string[] = [];
        set.forEach((v) => arr.push(v));
        return arr;
    }

    // ===================== UI 元素创建 =====================

    /**
     * 创建/获取带 Sprite 的子节点（九宫格拉伸模式）
     * @param name 节点名
     * @param parent 父节点
     * @param sf SpriteFrame（可为 null，后续通过 setSpriteFrame 设置）
     * @param w 宽度
     * @param h 高度
     * @returns 创建的节点
     */
    static createSpriteNode(name: string, parent: cc.Node, sf: cc.SpriteFrame, w: number, h: number): cc.Node {
        let node = parent.getChildByName(name);
        if (!node) {
            node = new cc.Node(name);
            node.parent = parent;
        }
        node.setContentSize(w, h);

        let sprite = node.getComponent(cc.Sprite);
        if (!sprite) {
            sprite = node.addComponent(cc.Sprite);
        }
        sprite.type = cc.Sprite.Type.SLICED;
        sprite.sizeMode = cc.Sprite.SizeMode.CUSTOM;
        if (sf) {
            sprite.spriteFrame = sf;
        }
        return node;
    }

    /**
     * 使用纹理创建按钮节点
     * 包含: Sprite 底图 + Label 文字
     * @param name 节点名
     * @param parent 父节点
     * @param pack 纹理包配置
     * @param w 宽度
     * @param h 高度
     * @param text 按钮文字
     * @param fontSize 字号
     * @param textColor 文字颜色
     * @param btnColor 按钮染色（可选，用于 node.color）
     * @returns 按钮节点
     */
    static createButton(
        name: string,
        parent: cc.Node,
        pack: ITexturePackConfig,
        w: number,
        h: number,
        text: string,
        fontSize: number,
        textColor: RGBA,
        btnColor?: RGBA
    ): cc.Node {
        const sf = UITextureHelper.getSpriteFrame(pack.btnRect);
        const node = UITextureHelper.createSpriteNode(name, parent, sf, w, h);

        if (btnColor) {
            UITextureHelper.applyColor(node, btnColor);
        }

        // 文字标签
        UITextureHelper.ensureLabel(node, text, fontSize, textColor);

        return node;
    }

    /**
     * 使用纹理创建圆角按钮节点
     * @param name 节点名
     * @param parent 父节点
     * @param pack 纹理包配置
     * @param w 宽度
     * @param h 高度
     * @param text 按钮文字
     * @param fontSize 字号
     * @param textColor 文字颜色
     * @param btnColor 按钮染色
     * @returns 按钮节点
     */
    static createRoundButton(
        name: string,
        parent: cc.Node,
        pack: ITexturePackConfig,
        w: number,
        h: number,
        text: string,
        fontSize: number,
        textColor: RGBA,
        btnColor?: RGBA
    ): cc.Node {
        const sf = UITextureHelper.getSpriteFrame(pack.btnRound);
        const node = UITextureHelper.createSpriteNode(name, parent, sf, w, h);

        if (btnColor) {
            UITextureHelper.applyColor(node, btnColor);
        }

        UITextureHelper.ensureLabel(node, text, fontSize, textColor);
        return node;
    }

    /**
     * 使用纹理创建面板节点
     * @param name 节点名
     * @param parent 父节点
     * @param pack 纹理包配置
     * @param w 宽度
     * @param h 高度
     * @param panelColor 面板染色
     * @returns 面板节点
     */
    static createPanel(
        name: string,
        parent: cc.Node,
        pack: ITexturePackConfig,
        w: number,
        h: number,
        panelColor?: RGBA
    ): cc.Node {
        const sf = UITextureHelper.getSpriteFrame(pack.panel);
        const node = UITextureHelper.createSpriteNode(name, parent, sf, w, h);

        if (panelColor) {
            UITextureHelper.applyPanelColor(node, panelColor);
        }
        return node;
    }

    /**
     * 使用纹理创建分割线节点
     * @param name 节点名
     * @param parent 父节点
     * @param pack 纹理包配置
     * @param w 宽度
     * @param h 高度
     * @param color 染色
     * @returns 分割线节点
     */
    static createDivider(
        name: string,
        parent: cc.Node,
        pack: ITexturePackConfig,
        w: number,
        h: number,
        color?: RGBA
    ): cc.Node {
        const sf = UITextureHelper.getSpriteFrame(pack.divider);
        const node = UITextureHelper.createSpriteNode(name, parent, sf, w, h);
        if (color) {
            node.color = UIThemeManager.toColor(color);
            node.opacity = 120;
        }
        return node;
    }

    /**
     * 使用纹理创建星星节点
     * @param name 节点名
     * @param parent 父节点
     * @param pack 纹理包配置
     * @param size 尺寸
     * @param outline 是否使用描边版
     * @returns 星星节点
     */
    static createStar(
        name: string,
        parent: cc.Node,
        pack: ITexturePackConfig,
        size: number,
        outline: boolean = false
    ): cc.Node {
        const path = outline ? pack.starOutline : pack.star;
        const sf = UITextureHelper.getSpriteFrame(path);
        const node = UITextureHelper.createSpriteNode(name, parent, sf, size, size);
        return node;
    }

    /**
     * 创建纯色背景节点（使用 Sprite + 单像素白色纹理 + node.color 实现纯色）
     * 这是替代 UIGraphicsHelper.fillGradientRect 的简化版本
     * @param name 节点名
     * @param parent 父节点
     * @param w 宽度
     * @param h 高度
     * @param color 背景色
     * @returns 背景节点
     */
    static createColorBg(name: string, parent: cc.Node, w: number, h: number, color: RGBA): cc.Node {
        let node = parent.getChildByName(name);
        if (!node) {
            node = new cc.Node(name);
            node.parent = parent;
        }
        node.setContentSize(w, h);
        node.color = UIThemeManager.toColor(color);

        // 使用内置的 Sprite + 单色方式
        let sprite = node.getComponent(cc.Sprite);
        if (!sprite) {
            sprite = node.addComponent(cc.Sprite);
        }
        sprite.type = cc.Sprite.Type.SIMPLE;
        sprite.sizeMode = cc.Sprite.SizeMode.CUSTOM;
        // 不设 spriteFrame 时 Sprite 会渲染为白色矩形，通过 node.color 染色
        return node;
    }

    /**
     * 创建渐变背景（上下两色）
     * 使用两个半透明 Sprite 叠加模拟渐变效果
     * @param name 节点名
     * @param parent 父节点
     * @param w 宽度
     * @param h 高度
     * @param topColor 顶部颜色
     * @param bottomColor 底部颜色
     * @returns 背景根节点
     */
    static createGradientBg(
        name: string,
        parent: cc.Node,
        w: number,
        h: number,
        topColor: RGBA,
        bottomColor: RGBA
    ): cc.Node {
        let root = parent.getChildByName(name);
        if (!root) {
            root = new cc.Node(name);
            root.parent = parent;
        }
        root.setContentSize(w, h);

        // 底层：底部颜色
        UITextureHelper.createColorBg("GradBottom", root, w, h, bottomColor);

        // 上层：顶部颜色，设置锚点偏上，高度为一半，加渐变透明
        let topNode = root.getChildByName("GradTop");
        if (!topNode) {
            topNode = new cc.Node("GradTop");
            topNode.parent = root;
        }
        topNode.setContentSize(w, h);
        topNode.y = 0;
        topNode.color = UIThemeManager.toColor(topColor);
        topNode.opacity = 180;

        let topSprite = topNode.getComponent(cc.Sprite);
        if (!topSprite) {
            topSprite = topNode.addComponent(cc.Sprite);
        }
        topSprite.type = cc.Sprite.Type.SIMPLE;
        topSprite.sizeMode = cc.Sprite.SizeMode.CUSTOM;

        return root;
    }

    // ===================== 样式应用（主题切换时使用） =====================

    /**
     * 对节点应用颜色染色
     * @param node 目标节点
     * @param rgba 颜色
     */
    static applyColor(node: cc.Node, rgba: RGBA): void {
        if (!node) return;
        node.color = UIThemeManager.toColor(rgba);
        node.opacity = rgba[3] != null ? rgba[3] : 255;
    }

    /**
     * 对面板节点应用颜色（偏亮处理，适配白色底图）
     * @param node 面板节点
     * @param rgba 面板底色
     */
    static applyPanelColor(node: cc.Node, rgba: RGBA): void {
        if (!node) return;
        node.color = cc.color(Math.min(255, rgba[0] + 60), Math.min(255, rgba[1] + 60), Math.min(255, rgba[2] + 60));
        node.opacity = rgba[3] != null ? rgba[3] : 220;
    }

    /**
     * 对按钮节点应用颜色
     * @param node 按钮节点
     * @param rgba 按钮颜色
     */
    static applyBtnColor(node: cc.Node, rgba: RGBA): void {
        if (!node) return;
        node.color = UIThemeManager.toColor(rgba);
        node.opacity = 255;
    }

    /**
     * 切换按钮纹理（主题切换时更换底图）
     * @param node 按钮节点
     * @param sfPath 新 SpriteFrame 资源路径
     */
    static switchSpriteFrame(node: cc.Node, sfPath: string): void {
        if (!node) return;
        const sf = UITextureHelper.getSpriteFrame(sfPath);
        if (!sf) {
            Logger.getInstance().warn("UITextureHelper", "未找到缓存纹理: " + sfPath);
            return;
        }
        const sprite = node.getComponent(cc.Sprite);
        if (sprite) {
            sprite.spriteFrame = sf;
        }
    }

    /**
     * 切换整套主题纹理（重新应用按钮/面板的 SpriteFrame）
     * @param btnNodes 按钮节点数组
     * @param panelNodes 面板节点数组
     * @param newPack 新的纹理包配置
     * @param theme 完整主题（用于染色）
     */
    static applyThemePack(
        btnNodes: cc.Node[],
        panelNodes: cc.Node[],
        newPack: ITexturePackConfig,
        theme: IUITheme
    ): void {
        // 更换按钮纹理 + 染色
        for (let i = 0; i < btnNodes.length; i++) {
            if (btnNodes[i] && btnNodes[i].isValid) {
                UITextureHelper.switchSpriteFrame(btnNodes[i], newPack.btnRect);
                UITextureHelper.applyBtnColor(btnNodes[i], theme.btn.bg);
            }
        }
        // 更换面板纹理 + 染色
        for (let i = 0; i < panelNodes.length; i++) {
            if (panelNodes[i] && panelNodes[i].isValid) {
                UITextureHelper.switchSpriteFrame(panelNodes[i], newPack.panel);
                UITextureHelper.applyPanelColor(panelNodes[i], theme.hud.panelBg);
            }
        }
    }

    // ===================== 工具方法 =====================

    /**
     * 在节点上确保存在 Label 子节点
     * @param parent 父节点
     * @param text 文本内容
     * @param fontSize 字号
     * @param textColor 文字颜色
     * @returns Label 组件
     */
    static ensureLabel(parent: cc.Node, text: string, fontSize: number, textColor: RGBA): cc.Label {
        let lblNode = parent.getChildByName("Label");
        if (!lblNode) {
            lblNode = new cc.Node("Label");
            lblNode.parent = parent;
        }
        let lbl = lblNode.getComponent(cc.Label);
        if (!lbl) {
            lbl = lblNode.addComponent(cc.Label);
        }
        lbl.string = text;
        lbl.fontSize = fontSize;
        lbl.lineHeight = fontSize + 4;
        lbl.horizontalAlign = cc.Label.HorizontalAlign.CENTER;
        lbl.verticalAlign = cc.Label.VerticalAlign.CENTER;
        lblNode.color = UIThemeManager.toColor(textColor);
        return lbl;
    }

    /**
     * 创建/获取子节点工具
     * @param name 节点名
     * @param parent 父节点
     * @param w 宽度
     * @param h 高度
     * @returns 子节点
     */
    static ensureChild(name: string, parent: cc.Node, w: number, h: number): cc.Node {
        let node = parent.getChildByName(name);
        if (!node) {
            node = new cc.Node(name);
            node.parent = parent;
        }
        node.setContentSize(w, h);
        return node;
    }
}
