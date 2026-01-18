# 赌徒十连抽卡死问题修复

## 问题描述
在赌徒界面进行多次十连抽奖时，游戏会卡死，控制台报错：
```
Uncaught (in promise) TypeError: game.map.addEquipAt is not a function
at GamblerUI.applyReward (GamblerUI.js:1839:22)
at GamblerUI.batchSpin (GamblerUI.js:1090:14)
```

## 问题原因
在 `applyReward` 方法中，当装备或消耗品无法添加到背包时，代码尝试将物品掉落到地图上。但是代码没有检查 `game.map.addEquipAt` 和 `game.map.addConsumableAt` 方法是否存在，导致在某些情况下（如批量抽奖时）调用未定义的方法而报错。

## 修复方案

### 1. 装备掉落安全检查
在调用 `game.map.addEquipAt` 之前，添加类型检查：

```javascript
// 修复前
if (!success && game.map) {
  game.map.addEquipAt(reward.itemId, game.player.x, game.player.y);
}

// 修复后
if (!success && game.map && typeof game.map.addEquipAt === 'function') {
  game.map.addEquipAt(itemInstance, game.player.x, game.player.y);
}
```

注意：同时修正了传递参数，从 `reward.itemId` 改为 `itemInstance`，因为 `addEquipAt` 方法支持传递完整的物品对象。

### 2. 消耗品掉落安全检查
同样为消耗品添加安全检查：

```javascript
// 修复前
if (!success && game.map) {
  game.map.addConsumableAt(reward.itemId, game.player.x, game.player.y);
}

// 修复后
if (!success && game.map && typeof game.map.addConsumableAt === 'function') {
  game.map.addConsumableAt(reward.itemId, game.player.x, game.player.y);
}
```

## 修改文件
- `src/ui/GamblerUI.js` - `applyReward` 方法（第 1802 行和 1838 行）

## 测试建议
1. 进入赌徒界面
2. 进行多次十连抽奖
3. 确保背包已满的情况下也能正常抽奖
4. 检查控制台是否还有相关错误

## 技术细节
- 使用 `typeof` 检查确保方法存在后再调用
- 传递完整的 `itemInstance` 对象而不是 ID，以保留品质、属性等信息
- 这种防御性编程可以避免在特殊情况下（如地图未初始化）导致的崩溃
