/**
 * 结构化日志记录器
 * 遵循项目宪法 V 规范
 */
export class Logger {
    private static _instance: Logger = null;

    public static getInstance(): Logger {
        if (!this._instance) {
            this._instance = new Logger();
        }
        return this._instance;
    }

    /**
     * 普通信息日志
     * @param tag 标签/模块
     * @param message 消息内容
     */
    public info(tag: string, message: string): void {
        const timestamp = new Date().toLocaleTimeString();
        console.log(`[INFO][${timestamp}][${tag}] ${message}`);
    }

    /**
     * 警告日志
     * @param tag 标签/模块
     * @param message 消息内容
     */
    public warn(tag: string, message: string): void {
        const timestamp = new Date().toLocaleTimeString();
        console.warn(`[WARN][${timestamp}][${tag}] ${message}`);
    }

    /**
     * 错误日志
     * @param tag 标签/模块
     * @param message 消息内容
     */
    public error(tag: string, message: string): void {
        const timestamp = new Date().toLocaleTimeString();
        console.error(`[ERROR][${timestamp}][${tag}] ${message}`);
    }

    /**
     * 兼容性别名接口 (宪法原文中使用 Logger.getInstance().log)
     */
    public log(tag: string, message: string): void {
        this.info(tag, message);
    }
}
