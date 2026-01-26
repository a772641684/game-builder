import { UI_ENUM } from "../enums/UIEnum";
import { GameCenter } from "./GameCenter";
import { Logger } from "./Logger";
import { UILayer, UIManager } from "./UIManager";

const { ccclass, property } = cc._decorator;

/**
 * 主场景挂载脚本
 * 负责场景初始化，UI 根节点设置以及加载首屏 UI
 */
@ccclass
export default class MainScene extends cc.Component {
    @property({
        type: cc.Node,
        tooltip: "UI 根节点 (通常为 Canvas 节点)",
    })
    uiRoot: cc.Node = null;

    protected onLoad() {
        if (!this.uiRoot) {
            // 如果未手动绑定，尝试获取当前 Canvas
            this.uiRoot = cc.find("Canvas");
        }

        if (!this.uiRoot) {
            Logger.getInstance().error("MainScene", "未找到 UI 根节点 (Canvas)");
            return;
        }

        // 1. 初始化游戏中心 & UI 管理器
        // 会通过 GameCenter 调用 UIManager.instance.setRoot(this.uiRoot)
        GameCenter.instance.setRootNode(this.uiRoot);

        // 2. 加载首屏 UI (主页)
        this.loadHomeUI();

        Logger.getInstance().info("MainScene", "主场景初始化完成");
    }

    private loadHomeUI() {
        // 调用 UIManager 加载首页预制体
        UIManager.instance.openUI(UI_ENUM.HOME, UILayer.Base);
    }
}
