import { Singleton } from "../../ace/logic/Singleton";
import { Loader } from "./Loader";
import { Logger } from "./Logger";

/**
 * UI 层级枚举
 */
export enum UILayer {
    /** 基础层 (主界面) */
    Base,
    /** 弹窗层 */
    Popup,
    /** 顶层 (Loading, Toast) */
    Top,
}

/**
 * UI 管理器
 * 负责界面层级管理、打开/关闭、堆栈维护
 */
export class UIManager extends Singleton<UIManager> {
    private _root: cc.Node = null;
    private _layers: Map<UILayer, cc.Node> = new Map();
    private _uiNodes: Map<string, cc.Node> = new Map();

    public static get instance(): UIManager {
        if (!this._instance) {
            this._instance = new UIManager();
            this._instance.init();
        }
        return this._instance;
    }

    protected init(): void {
        super.init();
    }

    /**
     * 设置 UI 根节点并初始化层级
     */
    public setRoot(root: cc.Node): void {
        this._root = root;
        this._setupLayers();
    }

    private _setupLayers(): void {
        if (!this._root) return;

        // 创建各层级节点
        const layerNames = ["BaseLayer", "PopupLayer", "TopLayer"];
        [UILayer.Base, UILayer.Popup, UILayer.Top].forEach((layer, index) => {
            let layerNode = this._root.getChildByName(layerNames[index]);
            if (!layerNode) {
                layerNode = new cc.Node(layerNames[index]);
                layerNode.parent = this._root;
                // 拉伸以适配根节点
                layerNode.addComponent(cc.Widget);
                const widget = layerNode.getComponent(cc.Widget);
                widget.isAlignBottom = widget.isAlignTop = widget.isAlignLeft = widget.isAlignRight = true;
                widget.bottom = widget.top = widget.left = widget.right = 0;
            }
            this._layers.set(layer, layerNode);
        });
    }

    /**
     * 打开 UI
     * @param path UI 路径 (UI_ENUM)
     * @param layer 层级
     * @param cleanupBase 是否清理 Base 层 (仅对 Base 层有效)
     * @param callback 加载完成后的回调
     */
    public openUI(
        path: string,
        layer: UILayer = UILayer.Base,
        cleanupBase: boolean = true,
        callback?: (node: cc.Node) => void
    ): void {
        const layerNode = this._layers.get(layer);
        if (!layerNode) {
            Logger.getInstance().error("UIManager", `未设置 UI 根节点或层级未初始化`);
            return;
        }

        if (layer === UILayer.Base && cleanupBase) {
            this.clearLayer(UILayer.Base);
        }

        if (this._uiNodes.has(path)) {
            const node = this._uiNodes.get(path);
            // 防御性检查：缓存的节点是否仍然有效
            if (node && node.isValid) {
                node.active = true;
                node.parent = layerNode; // 确保在正确的层级
                callback && callback(node);
                return;
            }
            // 节点已被销毁，清除无效缓存，重新加载
            this._uiNodes.delete(path);
            Logger.getInstance().warn("UIManager", `缓存节点已失效，重新加载: ${path}`);
        }

        Logger.getInstance().info("UIManager", `加载 UI: ${path}`);
        Loader.instance.load(path, cc.Prefab, (err, prefab: cc.Prefab) => {
            if (err) {
                Logger.getInstance().error("UIManager", `加载 UI 失败: ${path}`);
                return;
            }

            const node = Loader.instance.instantiate(prefab);
            node.parent = layerNode;
            node.setPosition(0, 0);
            this._uiNodes.set(path, node);

            Logger.getInstance().info("UIManager", `UI 展示成功: ${path}`);
            callback && callback(node);
        });
    }

    /**
     * 关闭指定 UI
     */
    public closeUI(path: string): void {
        const node = this._uiNodes.get(path);
        if (node && node.isValid) {
            node.destroy();
            this._uiNodes.delete(path);
            Logger.getInstance().info("UIManager", `UI 已关闭: ${path}`);
        }
    }

    /**
     * 清理指定层级的所有 UI
     */
    public clearLayer(layer: UILayer): void {
        const layerNode = this._layers.get(layer);
        if (!layerNode) return;

        // 先收集需要删除的缓存 key（节点销毁前，parent 还有效）
        const keysToRemove: string[] = [];
        for (const [path, node] of this._uiNodes.entries()) {
            if (!node || !node.isValid || node.parent === layerNode) {
                keysToRemove.push(path);
            }
        }

        // 销毁所有子节点
        layerNode.removeAllChildren();

        // 清理缓存
        for (const key of keysToRemove) {
            this._uiNodes.delete(key);
        }
    }

    /**
     * 获取当前显示的 UI 节点
     */
    public getUI(path: string): cc.Node | null {
        return this._uiNodes.get(path) || null;
    }
}
