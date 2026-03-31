import { Singleton } from "../../ace/logic/Singleton";
import { Logger } from "./Logger";

/**
 * 资源加载与实例化管理器
 * [宪法 IV] 必须使用此类的 instantiate 代替 cc.instantiate
 */
export class Loader extends Singleton<Loader> {
    private _loadedRes: Map<string, cc.Asset> = new Map();

    public static get instance(): Loader {
        if (!this._instance) {
            this._instance = new Loader();
            (this._instance as any).init();
        }
        return this._instance;
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

        cc.loader.loadRes(path, type, (err, res: T) => {
            if (!err) {
                this._loadedRes.set(path, res);
            }
            onComplete(err, res);
        });
    }

    /**
     * 批量加载资源
     * @param paths 资源路径数组
     * @param type 资源类型
     * @param onProgress 单个加载完成回调（可选）
     * @param onComplete 全部加载完成回调
     */
    public loadBatch<T extends cc.Asset>(
        paths: string[],
        type: typeof cc.Asset,
        onComplete: (results: Map<string, T>) => void,
        onProgress?: (loaded: number, total: number) => void
    ): void {
        const results: Map<string, T> = new Map();
        if (!paths || paths.length === 0) {
            onComplete(results);
            return;
        }

        let loaded = 0;
        const total = paths.length;

        for (let i = 0; i < total; i++) {
            const resPath = paths[i];
            this.load<T>(resPath, type, (err: Error, res: T) => {
                if (!err && res) {
                    results.set(resPath, res);
                } else {
                    Logger.getInstance().warn("Loader", `批量加载失败: ${resPath}`);
                }
                loaded++;
                if (onProgress) {
                    onProgress(loaded, total);
                }
                if (loaded >= total) {
                    Logger.getInstance().info("Loader", `批量加载完成 (${results.size}/${total})`);
                    onComplete(results);
                }
            });
        }
    }

    /**
     * 获取已缓存的资源（不触发加载）
     * @param path 资源路径
     * @returns 已缓存的资源，未找到返回 null
     */
    public getCached<T extends cc.Asset>(path: string): T {
        if (this._loadedRes.has(path)) {
            return this._loadedRes.get(path) as T;
        }
        return null;
    }

    /**
     * 释放资源
     * @param path 路径
     */
    public releaseRes(path: string) {
        if (this._loadedRes.has(path)) {
            const res = this._loadedRes.get(path);
            cc.loader.releaseRes(path, (res as any).constructor);
            this._loadedRes.delete(path);
            Logger.getInstance().info("Loader", `资源已释放: ${path}`);
        }
    }

    public destroy(): void {
        this._loadedRes.clear();
        Loader._instance = null;
    }
}
