/**
 * Cocos Creator 2.3.x UUID 压缩算法工具
 */
export class UuidUtils {
    private static BASE64_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    private static CharToMap: { [key: string]: number } = {};

    static {
        for (let i = 0; i < UuidUtils.BASE64_CHARS.length; i++) {
            UuidUtils.CharToMap[UuidUtils.BASE64_CHARS[i]] = i;
        }
    }

    /**
     * 将 36 位标准 UUID 压缩为 Cocos 23 位 UUID
     * @param uuid 36位UUID (如: 88215c37-3743-4424-1960-34659c5dd844)
     */
    public static compressUuid(uuid: string): string {
        if (uuid.length !== 36) return uuid;

        const cleanUuid = uuid.replace(/-/g, "");
        const prefix = cleanUuid.substring(0, 5);
        const rest = cleanUuid.substring(5);

        let compressed = prefix;
        const hex = rest;

        // 按照每 3 个 hex 字符一组进行转换 (1.5 bytes)
        // Cocos 的逻辑实际上是将剩余部分视为 hex 字符串，每 2 个 hex = 1 byte
        // 27 个 hex 对应约 13.5 bytes
        // 实际上 Cocos 采用的是 2 2 3 组
        const indices = [5, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2]; // 简化示意，实际逻辑封装如下

        return UuidUtils._compressHex(cleanUuid);
    }

    private static _compressHex(hex: string): string {
        if (hex.length === 23) return hex;
        if (hex.length !== 32) return hex;

        const prefix = hex.substring(0, 5);
        const rest = hex.substring(5);
        let res = prefix;

        // Cocos logic:
        // Iterate through 2-byte chunks (4 hex chars), convert to 3 base64 chars
        // Or 3-hex chunks to 2 base64 chars?
        // 27 hex left / 3 = 9 chunks. 9 chunks * 2 = 18 base64 chars. 5 + 18 = 23.
        for (let i = 0; i < rest.length; i += 3) {
            const h1 = parseInt(rest[i], 16);
            const h2 = parseInt(rest[i + 1], 16);
            const h3 = parseInt(rest[i + 2], 16);

            const combined = (h1 << 8) | (h2 << 4) | h3;
            res += UuidUtils.BASE64_CHARS[(combined >> 6) & 0x3f];
            res += UuidUtils.BASE64_CHARS[combined & 0x3f];
        }
        return res;
    }

    /**
     * 将 23 位 Cocos UUID 还原为 32 位 Hex (不含连字符)
     */
    public static decompressUuid(uuid: string): string {
        if (uuid.length !== 23) return uuid;

        const prefix = uuid.substring(0, 5);
        const rest = uuid.substring(5);
        let hex = prefix;

        for (let i = 0; i < rest.length; i += 2) {
            const c1 = UuidUtils.CharToMap[rest[i]];
            const c2 = UuidUtils.CharToMap[rest[i + 1]];
            const combined = (c1 << 6) | c2;

            hex += combined.toString(16).padStart(3, "0");
        }
        return hex;
    }
}
