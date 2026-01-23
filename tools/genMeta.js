const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

function generateUuid(filePath) {
    // 基于路径生成稳定但看起来像 UUID 的字符串
    const hash = crypto.createHash("md5").update(filePath).digest("hex");
    return [
        hash.substring(0, 8),
        hash.substring(8, 12),
        hash.substring(12, 16),
        hash.substring(16, 20),
        hash.substring(20, 32),
    ].join("-");
}

function processDir(dir) {
    const files = fs.readdirSync(dir);
    files.forEach((file) => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            if (file !== "node_modules" && file !== ".git") {
                processDir(fullPath);
            }
        } else if (file.endsWith(".ts") && !file.endsWith(".d.ts")) {
            const metaPath = fullPath + ".meta";
            if (!fs.existsSync(metaPath)) {
                const uuid = generateUuid(fullPath);
                const metaContent = {
                    ver: "1.1.0",
                    uuid: uuid,
                    isScriptAsset: true,
                    externalEngine: false,
                };
                fs.writeFileSync(metaPath, JSON.stringify(metaContent, null, 2));
                console.log(`Generated meta for ${file}: ${uuid}`);
            }
        }
    });
}

processDir(path.resolve(__dirname, "../assets/script"));
