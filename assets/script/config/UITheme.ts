/**
 * UI 主题系统
 * 提供多套预设风格，支持快速切换
 */

const { ccclass } = cc._decorator;

// ===================== 类型定义 =====================

/** 颜色四元组 [r, g, b, a?] */
export type RGBA = [number, number, number, number?];

/** 单个按钮样式 */
export interface IBtnStyle {
    bg: RGBA;
    text: RGBA;
    fontSize: number;
    radius: number;
    /** 按下态颜色偏移 (变暗多少 0-100) */
    pressDarken: number;
}

/** HUD 面板样式 */
export interface IHudStyle {
    /** 面板底色 */
    panelBg: RGBA;
    panelRadius: number;
    panelOpacity: number;
    /** 主要文字 (分数/时间) */
    primaryText: RGBA;
    primaryFontSize: number;
    /** 强调文字 (连击/特殊提示) */
    accentText: RGBA;
    accentFontSize: number;
    /** 次要文字 */
    secondaryText: RGBA;
    secondaryFontSize: number;
}

/** 游戏区域样式 */
export interface IGameAreaStyle {
    /** 主色 (大面积背景) */
    primary: RGBA;
    /** 辅色 (装饰/分割线) */
    secondary: RGBA;
    /** 高亮色 (得分/特效) */
    highlight: RGBA;
    /** 暗色 (阴影/洞口) */
    dark: RGBA;
    /** 角色/元素主色 */
    entityPrimary: RGBA;
    /** 角色/元素辅色 */
    entitySecondary: RGBA;
}

/**
 * 纹理包资源路径映射
 * 所有路径相对于 resources/ 目录，不含扩展名
 */
export interface ITexturePackConfig {
    /** 矩形按钮 (主按钮) */
    btnRect: string;
    /** 矩形按钮 (带阴影/depth 版) */
    btnRectDepth: string;
    /** 圆角按钮 */
    btnRound: string;
    /** 圆角按钮 (带阴影/depth 版) */
    btnRoundDepth: string;
    /** 方形按钮 */
    btnSquare: string;
    /** 面板/容器底板 */
    panel: string;
    /** 分割线 */
    divider: string;
    /** 星星 (实心) */
    star: string;
    /** 星星 (描边) */
    starOutline: string;
    /** 复选框 (选中) */
    checkColor: string;
    /** 复选框 (空) */
    checkGrey: string;
    /** 滑块条 */
    slideBar: string;
    /** 滑块手柄 */
    slideHandle: string;
    /** 输入框 */
    inputRect: string;
    /** 图标: 对勾 */
    iconCheck: string;
    /** 图标: 叉号 */
    iconCross: string;
    /** 图标: 播放 */
    iconPlay: string;
    /** 图标: 重复/刷新 */
    iconRepeat: string;
    /** 图标: 向下箭头 */
    iconArrowDown: string;
}

/** 完整主题定义 */
export interface IUITheme {
    name: string;
    /** 全局背景 */
    background: {
        topColor: RGBA;
        bottomColor: RGBA;
    };
    hud: IHudStyle;
    btn: IBtnStyle;
    gameArea: IGameAreaStyle;
    /** 特效色 (飘分/粒子) */
    fx: {
        scorePopColor: RGBA;
        comboColor: RGBA;
        hitFlashColor: RGBA;
    };
    /** 纹理包资源路径映射 (替代 cc.Graphics 绘制 UI) */
    texturePack: ITexturePackConfig;
}

// ===================== 预设主题 =====================

/** 🌿 卡通田园 */
const THEME_CARTOON: IUITheme = {
    name: "卡通田园",
    background: {
        topColor: [135, 206, 100],
        bottomColor: [60, 140, 50],
    },
    hud: {
        panelBg: [255, 255, 255, 180],
        panelRadius: 20,
        panelOpacity: 200,
        primaryText: [60, 60, 60],
        primaryFontSize: 44,
        accentText: [230, 80, 60],
        accentFontSize: 40,
        secondaryText: [120, 120, 120],
        secondaryFontSize: 32,
    },
    btn: {
        bg: [230, 80, 60],
        text: [255, 255, 255],
        fontSize: 32,
        radius: 16,
        pressDarken: 30,
    },
    gameArea: {
        primary: [110, 180, 70],
        secondary: [90, 155, 55],
        highlight: [255, 220, 50],
        dark: [50, 35, 18],
        entityPrimary: [190, 120, 60],
        entitySecondary: [155, 90, 40],
    },
    fx: {
        scorePopColor: [255, 220, 50],
        comboColor: [255, 100, 100],
        hitFlashColor: [255, 255, 200],
    },
    texturePack: {
        btnRect: "ui/kenney/btn_green",
        btnRectDepth: "ui/kenney/btn_green",
        btnRound: "ui/kenney/btn_round_green",
        btnRoundDepth: "ui/kenney/btn_round_green",
        btnSquare: "ui/kenney/btn_square_blue",
        panel: "ui/kenney/panel_green",
        divider: "ui/kenney/divider",
        star: "ui/kenney/star_yellow",
        starOutline: "ui/kenney/star_outline",
        checkColor: "ui/kenney/btn_round_green",
        checkGrey: "ui/kenney/btn_round_grey",
        slideBar: "ui/kenney/slide_bar",
        slideHandle: "ui/kenney/slide_handle",
        inputRect: "ui/kenney/input_rect",
        iconCheck: "ui/kenney/star_green",
        iconCross: "ui/kenney/star_red",
        iconPlay: "ui/kenney/icon_play",
        iconRepeat: "ui/kenney/icon_repeat",
        iconArrowDown: "ui/kenney/icon_arrow_down",
    },
};

/** 🌊 清新海洋 */
const THEME_OCEAN: IUITheme = {
    name: "清新海洋",
    background: {
        topColor: [100, 180, 240],
        bottomColor: [30, 100, 180],
    },
    hud: {
        panelBg: [20, 60, 120, 160],
        panelRadius: 24,
        panelOpacity: 220,
        primaryText: [230, 245, 255],
        primaryFontSize: 44,
        accentText: [255, 200, 80],
        accentFontSize: 40,
        secondaryText: [180, 210, 240],
        secondaryFontSize: 32,
    },
    btn: {
        bg: [40, 120, 200],
        text: [255, 255, 255],
        fontSize: 32,
        radius: 30,
        pressDarken: 25,
    },
    gameArea: {
        primary: [60, 150, 210],
        secondary: [45, 120, 185],
        highlight: [255, 220, 80],
        dark: [20, 55, 90],
        entityPrimary: [250, 180, 80],
        entitySecondary: [220, 140, 50],
    },
    fx: {
        scorePopColor: [255, 240, 100],
        comboColor: [80, 220, 255],
        hitFlashColor: [200, 240, 255],
    },
    texturePack: {
        btnRect: "ui/kenney/btn_blue",
        btnRectDepth: "ui/kenney/btn_blue",
        btnRound: "ui/kenney/btn_round_green",
        btnRoundDepth: "ui/kenney/btn_round_green",
        btnSquare: "ui/kenney/btn_square_blue",
        panel: "ui/kenney/panel_grey",
        divider: "ui/kenney/divider",
        star: "ui/kenney/star_blue",
        starOutline: "ui/kenney/star_outline",
        checkColor: "ui/kenney/btn_round_green",
        checkGrey: "ui/kenney/btn_round_grey",
        slideBar: "ui/kenney/slide_bar",
        slideHandle: "ui/kenney/slide_handle",
        inputRect: "ui/kenney/input_rect",
        iconCheck: "ui/kenney/star_blue",
        iconCross: "ui/kenney/star_red",
        iconPlay: "ui/kenney/icon_play",
        iconRepeat: "ui/kenney/icon_repeat",
        iconArrowDown: "ui/kenney/icon_arrow_down",
    },
};

/** 🌙 暗夜霓虹 */
const THEME_NEON: IUITheme = {
    name: "暗夜霓虹",
    background: {
        topColor: [30, 20, 50],
        bottomColor: [15, 10, 35],
    },
    hud: {
        panelBg: [40, 30, 70, 200],
        panelRadius: 16,
        panelOpacity: 230,
        primaryText: [220, 200, 255],
        primaryFontSize: 44,
        accentText: [255, 80, 200],
        accentFontSize: 40,
        secondaryText: [140, 120, 180],
        secondaryFontSize: 32,
    },
    btn: {
        bg: [160, 40, 200],
        text: [255, 255, 255],
        fontSize: 32,
        radius: 12,
        pressDarken: 20,
    },
    gameArea: {
        primary: [50, 30, 80],
        secondary: [70, 40, 110],
        highlight: [0, 255, 200],
        dark: [20, 12, 35],
        entityPrimary: [255, 100, 200],
        entitySecondary: [200, 60, 160],
    },
    fx: {
        scorePopColor: [0, 255, 200],
        comboColor: [255, 80, 200],
        hitFlashColor: [180, 100, 255],
    },
    texturePack: {
        btnRect: "ui/kenney/btn_red",
        btnRectDepth: "ui/kenney/btn_red",
        btnRound: "ui/kenney/btn_round_red",
        btnRoundDepth: "ui/kenney/btn_round_red",
        btnSquare: "ui/kenney/btn_square_red",
        panel: "ui/kenney/panel_grey",
        divider: "ui/kenney/divider",
        star: "ui/kenney/star_red",
        starOutline: "ui/kenney/star_outline",
        checkColor: "ui/kenney/btn_round_red",
        checkGrey: "ui/kenney/btn_round_grey",
        slideBar: "ui/kenney/slide_bar",
        slideHandle: "ui/kenney/slide_handle",
        inputRect: "ui/kenney/input_rect",
        iconCheck: "ui/kenney/star_red",
        iconCross: "ui/kenney/star_red",
        iconPlay: "ui/kenney/icon_play",
        iconRepeat: "ui/kenney/icon_repeat",
        iconArrowDown: "ui/kenney/icon_arrow_down",
    },
};

/** 🍬 糖果甜心 */
const THEME_CANDY: IUITheme = {
    name: "糖果甜心",
    background: {
        topColor: [255, 200, 220],
        bottomColor: [240, 150, 180],
    },
    hud: {
        panelBg: [255, 255, 255, 200],
        panelRadius: 28,
        panelOpacity: 230,
        primaryText: [100, 60, 80],
        primaryFontSize: 44,
        accentText: [220, 60, 120],
        accentFontSize: 40,
        secondaryText: [160, 120, 140],
        secondaryFontSize: 32,
    },
    btn: {
        bg: [255, 100, 150],
        text: [255, 255, 255],
        fontSize: 32,
        radius: 24,
        pressDarken: 20,
    },
    gameArea: {
        primary: [255, 180, 200],
        secondary: [240, 160, 185],
        highlight: [255, 230, 100],
        dark: [120, 60, 80],
        entityPrimary: [255, 160, 100],
        entitySecondary: [240, 120, 70],
    },
    fx: {
        scorePopColor: [255, 230, 100],
        comboColor: [255, 100, 180],
        hitFlashColor: [255, 240, 200],
    },
    texturePack: {
        btnRect: "ui/kenney/btn_yellow",
        btnRectDepth: "ui/kenney/btn_yellow",
        btnRound: "ui/kenney/btn_round_green",
        btnRoundDepth: "ui/kenney/btn_round_green",
        btnSquare: "ui/kenney/btn_square_blue",
        panel: "ui/kenney/panel_green",
        divider: "ui/kenney/divider",
        star: "ui/kenney/star_yellow",
        starOutline: "ui/kenney/star_outline",
        checkColor: "ui/kenney/btn_round_green",
        checkGrey: "ui/kenney/btn_round_grey",
        slideBar: "ui/kenney/slide_bar",
        slideHandle: "ui/kenney/slide_handle",
        inputRect: "ui/kenney/input_rect",
        iconCheck: "ui/kenney/star_green",
        iconCross: "ui/kenney/star_red",
        iconPlay: "ui/kenney/icon_play",
        iconRepeat: "ui/kenney/icon_repeat",
        iconArrowDown: "ui/kenney/icon_arrow_down",
    },
};

// ===================== 主题管理器 =====================

/** 所有可用主题 */
const ALL_THEMES: IUITheme[] = [THEME_CARTOON, THEME_OCEAN, THEME_NEON, THEME_CANDY];

/** 当前激活主题索引 (持久化 key) */
const STORAGE_KEY = "ui_theme_index";

@ccclass("UIThemeManager")
export class UIThemeManager {
    private static _current: IUITheme = THEME_CARTOON;
    private static _index: number = 0;

    /** 获取当前主题 */
    static get current(): IUITheme {
        return this._current;
    }

    /** 获取当前主题索引 */
    static get index(): number {
        return this._index;
    }

    /** 获取所有主题名称列表 */
    static get themeNames(): string[] {
        return ALL_THEMES.map((t) => t.name);
    }

    /** 主题总数 */
    static get count(): number {
        return ALL_THEMES.length;
    }

    /** 初始化 (从本地存储恢复) */
    static init(): void {
        const saved = cc.sys.localStorage.getItem(STORAGE_KEY);
        if (saved !== null && saved !== undefined) {
            const idx = parseInt(saved, 10);
            if (idx >= 0 && idx < ALL_THEMES.length) {
                this._index = idx;
                this._current = ALL_THEMES[idx];
            }
        }
    }

    /** 切换到指定索引的主题 */
    static setTheme(index: number): void {
        if (index < 0 || index >= ALL_THEMES.length) return;
        this._index = index;
        this._current = ALL_THEMES[index];
        cc.sys.localStorage.setItem(STORAGE_KEY, String(index));
    }

    /** 切换到下一套主题 (循环) */
    static nextTheme(): IUITheme {
        this.setTheme((this._index + 1) % ALL_THEMES.length);
        return this._current;
    }

    // ===================== 便捷工具方法 =====================

    /** RGBA 数组 -> cc.Color */
    static toColor(rgba: RGBA): cc.Color {
        return cc.color(rgba[0], rgba[1], rgba[2], rgba[3] != null ? rgba[3] : 255);
    }

    /** 颜色变暗 */
    static darken(rgba: RGBA, amount: number): RGBA {
        return [
            Math.max(0, rgba[0] - amount),
            Math.max(0, rgba[1] - amount),
            Math.max(0, rgba[2] - amount),
            rgba[3] != null ? rgba[3] : 255,
        ];
    }

    /** 颜色变亮 */
    static lighten(rgba: RGBA, amount: number): RGBA {
        return [
            Math.min(255, rgba[0] + amount),
            Math.min(255, rgba[1] + amount),
            Math.min(255, rgba[2] + amount),
            rgba[3] != null ? rgba[3] : 255,
        ];
    }
}
