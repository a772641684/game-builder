import { Logger } from "../../script/logic/Logger";

/**
 * 逻辑单例基类
 * 遵循项目宪法 XII 规范
 */
export abstract class Singleton<T> {
    protected static _instance: any = null;

    /**
     * 获取单例实例
     */
    public static get instance(): any {
        if (!this._instance) {
            // @ts-ignore
            this._instance = new this();
            this._instance.init();
        }
        return this._instance;
    }

    /**
     * 初始化接口，子类通过覆盖此方法实现初始化逻辑
     */
    protected init(): void {
        Logger.getInstance().info("Singleton", `${this.constructor.name} 初始化完成`);
    }
}
