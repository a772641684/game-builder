const { ccclass, property } = cc._decorator;
import { UnscrewControl } from "../logic/UnscrewControl";

/**
 * 拆螺丝益智游戏主 UI 面板
 * [Prefab 结构说明]:
 * 根节点 (UIPlayGroundGameUnscrew): 容器节点。
 * ├── TopUI: 顶部槽位容器。
 * └── GameArea: 物理引擎作用的关卡物品容器。
 */
@ccclass
export default class UIPlayGroundGameUnscrew extends cc.Component {

    /**
     * 组件启动回调
     */
    protected start(): void {
        // 初始化游戏逻辑
        UnscrewControl.getInstance();
    }

    /**
     * 遵循宪法原则 X: 显式销毁单例以释放资源
     */
    protected onDestroy(): void {
        UnscrewControl.destroyInstance();
    }
}
