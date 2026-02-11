/**
 * 为 assets/texture 下的 PNG 图片和目录生成 .meta 文件
 * 用法: node tools/genTextureMeta.js [目标目录]
 * 默认目标: assets/texture/ui
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { execSync } = require("child_process");

/**
 * 基于路径生成稳定的 UUID
 * @param {string} filePath
 * @returns {string}
 */
function generateUuid(filePath) {
    const normalized = filePath.replace(/\\/g, "/");
    const hash = crypto.createHash("md5").update(normalized).digest("hex");
    return [
        hash.substring(0, 8),
        hash.substring(8, 12),
        hash.substring(12, 16),
        hash.substring(16, 20),
        hash.substring(20, 32),
    ].join("-");
}

/**
 * 用 identify 或简易方法获取 PNG 尺寸
 * @param {string} pngPath
 * @returns {{ width: number, height: number }}
 */
function getPngSize(pngPath) {
    try {
        const buf = fs.readFileSync(pngPath);
        // PNG 标准: 第 16-19 字节为宽度，第 20-23 字节为高度 (big endian)
        if (buf.length >= 24 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
            const width = buf.readUInt32BE(16);
            const height = buf.readUInt32BE(20);
            return { width, height };
        }
    } catch (e) {
        // ignore
    }
    return { width: 64, height: 64 };
}

/**
 * 为目录生成 .meta
 * @param {string} dirPath
 */
function genDirMeta(dirPath) {
    const metaPath = dirPath + ".meta";
    if (fs.existsSync(metaPath)) return;

    const uuid = generateUuid(dirPath);
    const meta = {
        ver: "1.0.1",
        uuid: uuid,
        isSubpackage: false,
        subpackageName: "",
        subMetas: {},
    };
    fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));
    console.log("[DIR ] " + path.basename(dirPath) + " -> " + uuid);
}

/**
 * 为 PNG 图片生成 .meta
 * @param {string} pngPath
 */
function genPngMeta(pngPath) {
    const metaPath = pngPath + ".meta";
    if (fs.existsSync(metaPath)) return;

    const rawUuid = generateUuid(pngPath);
    const subUuid = generateUuid(pngPath + "#sub");
    const size = getPngSize(pngPath);
    const baseName = path.basename(pngPath, ".png");

    const meta = {
        ver: "2.3.4",
        uuid: rawUuid,
        type: "sprite",
        wrapMode: "clamp",
        filterMode: "bilinear",
        premultiplyAlpha: false,
        genMipmaps: false,
        packable: true,
        width: size.width,
        height: size.height,
        platformSettings: {},
        subMetas: {},
    };

    meta.subMetas[baseName] = {
        ver: "1.0.4",
        uuid: subUuid,
        rawTextureUuid: rawUuid,
        trimType: "auto",
        trimThreshold: 1,
        rotated: false,
        offsetX: 0,
        offsetY: 0,
        trimX: 0,
        trimY: 0,
        width: size.width,
        height: size.height,
        rawWidth: size.width,
        rawHeight: size.height,
        borderTop: 0,
        borderBottom: 0,
        borderLeft: 0,
        borderRight: 0,
        subMetas: {},
    };

    fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));
    console.log("[PNG ] " + baseName + " (" + size.width + "x" + size.height + ") -> " + rawUuid);
}

/**
 * 递归处理目录
 * @param {string} dir
 */
function processDir(dir) {
    // 先确保目录本身有 meta
    genDirMeta(dir);

    const entries = fs.readdirSync(dir);
    let pngCount = 0;
    let dirCount = 0;

    entries.forEach(function (entry) {
        const fullPath = path.join(dir, entry);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            if (entry !== "node_modules" && entry !== ".git" && !entry.endsWith(".meta")) {
                dirCount++;
                processDir(fullPath);
            }
        } else if (entry.endsWith(".png") || entry.endsWith(".jpg") || entry.endsWith(".jpeg")) {
            pngCount++;
            genPngMeta(fullPath);
        }
    });

    if (pngCount > 0 || dirCount > 0) {
        console.log("[SCAN] " + path.basename(dir) + ": " + pngCount + " images, " + dirCount + " subdirs");
    }
}

// 入口
var targetDir = process.argv[2] || path.resolve(__dirname, "../assets/texture/ui");
targetDir = path.resolve(targetDir);

if (!fs.existsSync(targetDir)) {
    console.error("目标目录不存在: " + targetDir);
    process.exit(1);
}

console.log("=== 生成纹理 Meta 文件 ===");
console.log("目标: " + targetDir);
console.log("");

processDir(targetDir);

// 统计
var totalMeta = 0;
function countMeta(d) {
    fs.readdirSync(d).forEach(function (f) {
        var fp = path.join(d, f);
        if (fs.statSync(fp).isDirectory() && !f.endsWith(".meta")) {
            countMeta(fp);
        } else if (f.endsWith(".meta")) {
            totalMeta++;
        }
    });
}
countMeta(targetDir);
console.log("\n=== 完成 ===");
console.log("共生成/检测到 " + totalMeta + " 个 .meta 文件");
