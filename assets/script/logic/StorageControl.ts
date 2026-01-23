import { Singleton } from "../../ace/logic/Singleton";
import { Logger } from "./Logger";

/**
 * 混合模式存储管理器
 * 遵循项目宪法 XII 规范及 FR-008 要求
 */
export class StorageControl extends Singleton<StorageControl> {
    private readonly STORAGE_KEY = "LegendMultiGames_UserData";

    public static get instance(): StorageControl {
        return super.instance as StorageControl;
    }

    /**
     * 保存数据到本地并尝试同步到云端
     * @param data 要保存的数据对象
     */
    public saveData(data: any): void {
        try {
            const jsonStr = JSON.stringify(data);
            cc.sys.localStorage.setItem(this.STORAGE_KEY, jsonStr);
            Logger.getInstance().info("Storage", "游戏数据已成功保存至本地");

            this.syncToCloud(data);
        } catch (e) {
            Logger.getInstance().error("Storage", `保存数据失败: ${e.message}`);
        }
    }

    /**
     * 从本地加载数据
     */
    public loadData(): any {
        const jsonStr = cc.sys.localStorage.getItem(this.STORAGE_KEY);
        if (jsonStr) {
            try {
                Logger.getInstance().info("Storage", "正在从本地读取存档");
                return JSON.parse(jsonStr);
            } catch (e) {
                Logger.getInstance().error("Storage", "本地存储格式损坏");
                return null;
            }
        }
        return null;
    }

    /**
     * 后端同步存根 (Stub)
     * @param data 要同步的数据
     */
    private async syncToCloud(data: any): Promise<void> {
        // [TODO]: 这里后续对接真正的后端 API
        Logger.getInstance().info("Storage", "正在进行后端数据同步存根调用...");
    }

    public destroy(): void {
        StorageControl._instance = null;
    }
}
