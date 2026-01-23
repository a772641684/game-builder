# Quickstart: 002-extra-mini-games

本方案集成了 6 款经典小游戏，旨在快速生成可玩的 Demo。

## 1. 运行步骤

1. **注册 UI**: 在 `UIEnum.ts` 中添加新的游戏枚举。
2. **生成 Prefab**: 运行 `prefabBuilder` 脚本，根据代码说明生成 UI 预制体。
3. **入口对接**: 在 `GameCenter.ts` 中添加新游戏 ID 的分发逻辑。
4. **资源依赖**: 确保 `assets/resources/ui/` 下包含生成的预制体。

## 2. 调试指南

- **物理调试**: 在 `onLoad` 中开启 `cc.director.getPhysicsManager().debugDrawFlags = 1` 以查看碰撞盒。
- **日志查看**: 使用 `Logger.getInstance()` 过滤 "EXTRA_GAME" 标签。

## 3. 核心文件映射

- **抓娃娃**: `UIPlayGroundGameClaw.ts` / `ClawControl.ts`
- **下一百层**: `UIPlayGroundGameFloor.ts` / `FloorControl.ts`
- **涂鸦跳跃**: `UIPlayGroundGameDoodle.ts` / `DoodleControl.ts`
- **点线交织**: `UIPlayGroundGamePoly.ts` / `PolyControl.ts`
- **弹弹球**: `UIPlayGroundGameBouncy.ts` / `BouncyControl.ts`
- **泡泡龙**: `UIPlayGroundGameBubble.ts` / `BubbleControl.ts`
