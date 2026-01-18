# 赌徒历史记录问题修复

## 问题 1：十连抽历史记录只显示 15 个

### 问题描述
进行多次十连抽奖后，历史记录只显示最近的 15 个结果，而不是所有的抽奖结果。

### 问题原因
1. **容量限制**：HistoryTracker 初始化时设置的最大容量为 15 条
2. **高品质奖励未记录**：在批量抽奖时，EPIC、LEGENDARY、JACKPOT 品质的奖励没有被添加到历史记录中

### 修复方案

#### 1. 增加历史记录容量
将 HistoryTracker 的最大容量从 15 增加到 30，可以显示 3 次十连的完整记录：

```javascript
// 修复前
this.historyTracker = new HistoryTracker(15);

// 修复后
this.historyTracker = new HistoryTracker(30);
```

#### 2. 为高品质奖励添加历史记录
在 `batchSpin` 方法中，为 EPIC、LEGENDARY、JACKPOT 品质的奖励也添加历史记录：

```javascript
// 修复前
if (['EPIC', 'LEGENDARY', 'JACKPOT'].includes(reward.quality)) {
  const actualReward = await this.performReelAnimation(reward);
  const finalReward = actualReward || reward;
  results[i] = finalReward;
  await this.showResultWithoutUrge(finalReward);
  await this.sleep(800);
}

// 修复后
if (['EPIC', 'LEGENDARY', 'JACKPOT'].includes(reward.quality)) {
  const actualReward = await this.performReelAnimation(reward);
  const finalReward = actualReward || reward;
  results[i] = finalReward;
  await this.showResultWithoutUrge(finalReward);
  
  // 添加到历史记录
  const totalItems = 50;
  const winnerIndex = 45;
  const items = [];
  for (let j = 0; j < totalItems; j++) {
    if (j === winnerIndex) {
      items.push(finalReward);
    } else {
      const randomQ = Math.random() < 0.8 ? 'COMMON' : 'UNCOMMON';
      items.push({ icon: '?', quality: randomQ });
    }
  }
  const nearMissResult = this.historyTracker.detectNearMiss(winnerIndex, items);
  this.historyTracker.addResult(finalReward, nearMissResult.isNearMiss, nearMissResult.missedItem?.quality);
  
  await this.sleep(800);
}
```

## 修改文件
- `src/ui/GamblerUI.js`
  - 构造函数：增加历史记录容量到 30
  - `batchSpin` 方法：为高品质奖励添加历史记录

## 效果
- 现在可以显示最近 30 次抽奖的完整历史记录
- 所有品质的奖励（包括 EPIC、LEGENDARY、JACKPOT）都会被正确记录
- 进行 3 次十连后，仍能看到所有 30 个结果
