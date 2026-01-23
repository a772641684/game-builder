import { Logger } from "./Logger";
import { Singleton } from "./Singleton";

/**
 * 资源加载与实例化管理器
 * [宪法 IV] 必须使用此类的 instantiate 代替 cc.instantiate
 */
export class Loader extends Singleton<Loader> {
    private _loadedRes: Map<string, cc.Asset> = new Map();

    public static get instance(): Loader {
        return super.instance as Loader;
    }

    /**
     * 实例化预制体
     * @param prefab 预制体对象
     */
    public instantiate(prefab: cc.Prefab): cc.Node {
        if (!prefab) {
            Logger.getInstance().error("Loader", "实例化失败: 预制体为空");
            return null;
        }
        return cc.instantiate(prefab);
    }

    /**
     * 加载并缓存资源
     * @param path 路径
     * @param type 类型
     * @param onComplete 回调
     */
    public load<T extends cc.Asset>(path: string, type: typeof cc.Asset, onComplete: (err: Error, res: T) => void) {
        if (this._loadedRes.has(path)) {
            onComplete(null, this._loadedRes.get(path) as T);
            return;
        }

        cc.resources.load(path, type, (err, res: T) => {
            if (!err) {
                this._loadedRes.set(path, res);
            }
            onComplete(err, res);
        });
    }

    /**
     * 释放资源
     * @param path 路径
     */
    public releaseRes(path: string) {
        if (this._loadedRes.has(path)) {
            const res = this._loadedRes.get(path);
            cc.resources.release(path);
            this._loadedRes.delete(path);
            Logger.getInstance().info("Loader", `资源已释放: ${path}`);
        }
    }
}
