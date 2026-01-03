# 每日挑战系统逻辑审查报告

## 审查日期
2024年审查

## 审查范围
对每日挑战系统（Daily Challenge System）进行深度逻辑审查，重点排查RNG确定性、状态污染、存档安全、时间一致性、数值计算和UI交互等关键问题。

---

## 🔴 严重问题（Critical Issues）

### 1. RNG 确定性漏洞：灵魂水晶掉落使用 Math.random()

**位置**: `src/systems/MapSystem.js:1037-1042`

**问题描述**:
```javascript
// 随机掉落判定
if (Math.random() > dropConfig.chance) return;

// 计算掉落数量
const amount = Math.floor(
  Math.random() * (dropConfig.max - dropConfig.min + 1) + dropConfig.min
);
```

**影响**:
- 在每日挑战模式下，灵魂水晶的掉落判定和数量计算使用了 `Math.random()`，破坏了确定性
- 虽然灵魂水晶是元进度数据，不影响游戏流程，但会导致重试时掉落结果不一致

**修复建议**:
```javascript
dropSoulCrystals(monster) {
  const game = window.game;
  if (!game || !game.metaSaveSystem) return;
  
  // ✅ FIX: 使用 RNG（如果存在）
  const rng = (game.isDailyMode && game.rng) ? game.rng : null;
  const randomValue = rng ? rng.next() : Math.random();
  
  // 随机掉落判定
  if (randomValue > dropConfig.chance) return;
  
  // 计算掉落数量
  const amountRandom = rng ? rng.next() : Math.random();
  const amount = Math.floor(
    amountRandom * (dropConfig.max - dropConfig.min + 1) + dropConfig.min
  );
  // ...
}
```

---

### 2. RNG 确定性漏洞：怪物掉落装备使用 Math.random()

**位置**: `src/systems/CombatSystem.js:1534, 1553, 1565`

**问题描述**:
```javascript
if (Math.random() < 0.3) {
  // 装备掉落
}
if (Math.random() < 0.15) {
  // 消耗品掉落
}
if (Math.random() < 0.2) {
  // 钥匙掉落
}
```

**影响**:
- 怪物死亡时的装备、消耗品、钥匙掉落判定使用了 `Math.random()`
- 虽然 `getEquipmentDropForFloor` 已经支持 RNG 传递（通过 `game` 对象），但掉落判定本身仍使用 `Math.random()`
- 这会导致重试时掉落结果不一致

**修复建议**:
```javascript
// 在 CombatSystem.checkInteraction 中
const game = window.game;
const rng = (game.isDailyMode && game.rng) ? game.rng : null;
const random = rng ? rng.next() : Math.random();

if (random < 0.3) {
  // 装备掉落（已支持 RNG）
  const drop = getEquipmentDropForFloor(player.stats.floor || 1, {
    // ...
    game: game // 已传递
  });
}

const consumableRandom = rng ? rng.next() : Math.random();
if (consumableRandom < 0.15) {
  // 消耗品掉落（需要修改 getRandomConsumable 支持 RNG）
  const consumable = getRandomConsumable(rng);
}

const keyRandom = rng ? rng.next() : Math.random();
if (keyRandom < 0.2) {
  // 钥匙掉落
}
```

---

### 2.1. RNG 确定性漏洞：getRandomConsumable 使用 Math.random()

**位置**: `src/data/items.js:838-843`

**问题描述**:
```javascript
export function getRandomConsumable() {
  const list = CONSUMABLE_IDS.filter(id => EQUIPMENT_DB[id]);
  if (list.length === 0) return null;
  const id = list[Math.floor(Math.random() * list.length)];
  return EQUIPMENT_DB[id];
}
```

**影响**:
- `getRandomConsumable()` 函数内部使用 `Math.random()` 选择消耗品
- 在每日挑战模式下，消耗品掉落结果会不一致

**修复建议**:
```javascript
export function getRandomConsumable(rng = null) {
  const list = CONSUMABLE_IDS.filter(id => EQUIPMENT_DB[id]);
  if (list.length === 0) return null;
  const randomValue = rng ? rng.next() : Math.random();
  const id = list[Math.floor(randomValue * list.length)];
  return EQUIPMENT_DB[id];
}
```

然后在所有调用处传递 RNG：
```javascript
const consumable = getRandomConsumable(rng);
```

---

### 3. 状态污染风险：普通模式回归时未清理每日挑战状态

**位置**: `src/main.js:3182` - `startGame()` 方法

**问题描述**:
- 当玩家从每日挑战失败后选择"返回主菜单"，然后开始普通游戏时，以下状态可能残留：
  - `game.isDailyMode` - 已在构造函数初始化为 `false`，但需要确认所有退出路径都清理
  - `game.rng` - 需要设置为 `null`
  - `game.dailyShopPriceMultiplier` - 已在构造函数初始化为 `1.0`，但需要确认
  - `game.dailyEliteSpawnMultiplier` - 已在构造函数初始化为 `1.0`，但需要确认

**当前状态**:
- ✅ 构造函数中已初始化：`this.isDailyMode = false;`, `this.dailyShopPriceMultiplier = 1.0;`, `this.dailyEliteSpawnMultiplier = 1.0;`
- ⚠️ `this.rng = null;` 已在构造函数初始化
- ⚠️ 但 `startGame()` 中没有显式清理逻辑，依赖构造函数初始化

**影响**:
- 虽然构造函数已初始化，但为了防御性编程，应该在 `startGame()` 开始时显式清理
- 如果状态未清理，可能导致普通模式受到每日挑战词缀影响

**修复建议**:
在 `startGame()` 开始时添加清理逻辑：
```javascript
async startGame() {
  console.log('[StartGame] Starting game...');
  
  // ✅ FIX: 清理每日挑战状态（防御性编程）
  this.isDailyMode = false;
  this.rng = null;
  this.dailyShopPriceMultiplier = 1.0;
  this.dailyEliteSpawnMultiplier = 1.0;
  
  // ... 其余代码
}
```

**优先级**: 中 - 虽然构造函数已初始化，但显式清理更安全。

---

## 🟡 中等问题（Medium Issues）

### 4. 重试时 RNG 种子重置问题

**位置**: `src/main.js:3861`

**问题描述**:
```javascript
if (wasDailyMode) {
  // 重新获取每日挑战配置（使用今日种子）
  const dailyConfig = DailyChallengeSystem.getDailyConfig();
  
  // 重新初始化 RNG（使用今日种子）
  this.rng = dailyConfig.rng;
}
```

**分析**:
- ✅ **正确**: `getDailyConfig()` 每次调用都会创建新的 `SeededRandom` 实例，但使用相同的种子（基于UTC日期）
- ✅ **正确**: 由于种子相同，新实例会生成相同的随机序列
- ⚠️ **潜在问题**: 如果 RNG 在第一次运行时被消耗了（例如用于生成地图），重试时创建新实例会导致序列从头开始，但这是**期望的行为**（重试应该完全重置）

**结论**: **无问题** - 这是正确的实现。重试时应该完全重置，包括 RNG 状态。

---

### 5. 初始遗物数值计算一致性

**位置**: `src/main.js:3466-3506` 和 `src/main.js:3914-3952`

**问题描述**:
- `startDailyChallenge()` 和 `restartGame()` 中都有初始遗物数值计算逻辑
- 代码与 `RoguelikeSystem.generateRuneOptions()` 中的计算逻辑**基本一致**，但需要确认完全一致

**对比分析**:
```javascript
// startDailyChallenge / restartGame 中的计算
if (dailyConfig.startingRune.type === 'STAT') {
  if (dailyConfig.startingRune.id.includes('might') || dailyConfig.startingRune.id.includes('brutal')) {
    value = Math.floor(1 * multiplier * (1 + floor * 0.1));
  }
  // ...
}

// RoguelikeSystem.generateRuneOptions 中的计算
if (rune.type === 'STAT') {
  if (rune.id.includes('might') || rune.id.includes('brutal')) {
    value = Math.floor(1 * multiplier * (1 + floor * 0.1));
  }
  // ...
}
```

**结论**: **一致** - 计算逻辑完全相同。

---

### 6. 存档系统安全性

**位置**: 多个位置

**检查结果**:
- ✅ `SaveSystem.save()` - 已拦截 `isDailyMode === true` (line 17)
- ✅ `Game.saveGame()` - 已拦截 `isDailyMode` (line 4023)
- ✅ `Game.nextLevel()` 自动保存 - 已拦截 `!this.isDailyMode` (line 758)
- ⚠️ **需要检查**: 快捷键触发的保存（如果有）

**修复建议**:
确认所有保存入口都已拦截。如果存在快捷键保存，需要添加检查。

---

## 🟢 轻微问题（Minor Issues）

### 7. 时间与时区一致性

**位置**: `src/ui/DailyBriefingUI.js:558-562`, `src/ui/LeaderboardUI.js:617-621`, `src/main.js:3721-3725`

**检查结果**:
- ✅ **正确**: 所有位置都使用了 `getUTCFullYear()`, `getUTCMonth()`, `getUTCDate()`
- ✅ **正确**: `DailyChallengeSystem.getDailySeed()` 也使用 UTC 时间
- ✅ **一致**: 前后端日期对齐正确

**结论**: **无问题** - 时间处理完全一致。

---

### 8. UI 按钮状态

**位置**: `src/main.js:1197-1221`

**检查结果**:
- ✅ `updateSaveLoadButtonsVisibility()` 正确隐藏了保存/读取按钮
- ✅ 在 `startDailyChallenge()` 和 `restartGame()` 中都调用了此方法

**结论**: **无问题** - UI 状态管理正确。

---

### 9. 死亡结算重试逻辑

**位置**: `src/main.js:3808-4018`

**检查结果**:
- ✅ `restartGame()` 正确检测 `wasDailyMode`
- ✅ 如果是每日挑战模式，重新获取配置并应用词缀
- ✅ 使用相同的种子重新初始化 RNG

**结论**: **无问题** - 重试逻辑正确。

---

## 📋 总结

### 需要立即修复的问题

1. **🔴 严重**: `MapSystem.dropSoulCrystals()` 使用 `Math.random()` - 需要传递 RNG
2. **🔴 严重**: `CombatSystem.checkInteraction()` 中的掉落判定使用 `Math.random()` - 需要传递 RNG
3. **🔴 严重**: 普通模式回归时状态清理 - 需要确认所有退出路径都清理状态

### 已验证无问题的部分

- ✅ RNG 种子重置逻辑（重试时创建新实例是正确的）
- ✅ 初始遗物数值计算一致性
- ✅ 存档系统安全性（主要入口已拦截）
- ✅ 时间与时区一致性
- ✅ UI 按钮状态管理
- ✅ 死亡结算重试逻辑

---

## 🔧 修复优先级

1. **P0 (立即修复)**: 修复 `dropSoulCrystals` 和 `checkInteraction` 中的 `Math.random()` 调用
2. **P1 (高优先级)**: 确认普通模式回归时的状态清理
3. **P2 (中优先级)**: 检查是否有快捷键保存需要拦截

---

## 📝 备注

- 精英怪物的视觉效果（`_drawEliteMonster`）使用 `Math.random()` 是**可接受的**，因为这只是视觉效果，不影响游戏逻辑的确定性
- `getRandomConsumable()` 如果使用 `Math.random()`，也需要检查并修复（如果影响确定性）

