# 铁匠系统使用示例

## 基础使用

### 1. 初始化系统

```javascript
// 在 Game 类中已经自动初始化
this.blacksmithSystem = new BlacksmithSystem();
this.forgeUI = new ForgeUI(this.blacksmithSystem);
```

### 2. 打开铁匠铺

```javascript
// 玩家走到铁砧旁边时自动触发
game.openForge();

// 或者手动调用
if (game.forgeUI) {
  game.forgeUI.open();
}
```

### 3. 关闭铁匠铺

```javascript
game.closeForge();

// 或者
if (game.forgeUI) {
  game.forgeUI.close();
}
```

## 装备操作示例

### 初始化装备

```javascript
// 获取装备
const sword = EQUIPMENT_DB['SWORD_2']; // 铁剑

// 初始化装备（添加品质和强化等级）
game.blacksmithSystem.initializeItem(sword);

console.log(sword);
// 输出:
// {
//   id: 'SWORD_2',
//   name: 'Iron Sword',
//   nameZh: '铁剑',
//   type: 'WEAPON',
//   quality: 'COMMON',
//   enhanceLevel: 0,
//   baseStats: { p_atk: 6 },
//   stats: { p_atk: 6 },
//   displayName: '普通 铁剑'
// }
```

### 强化装备

```javascript
// 强化装备
const result = game.blacksmithSystem.enhanceItem(sword, game.player);

if (result.success) {
  console.log(result.message); // "强化成功！普通 铁剑 现在是 +1"
  console.log(sword.enhanceLevel); // 1
  console.log(sword.stats.p_atk); // 6.6 (6 * 1.1)
} else {
  console.log(result.message); // "金币不足！需要 100 金币"
}
```

### 重铸品质

```javascript
// 重铸装备品质
const result = game.blacksmithSystem.reforgeItem(sword, game.player);

if (result.success) {
  console.log(result.message); // "重铸成功！品质提升为 稀有！"
  console.log(result.oldQuality); // "COMMON"
  console.log(result.newQuality); // "RARE"
  console.log(sword.stats.p_atk); // 9.9 (6 * 1.5 * 1.1)
} else {
  console.log(result.message); // "金币不足！需要 1000 金币"
}
```

### 获取装备详情

```javascript
const details = game.blacksmithSystem.getItemDetails(sword);

console.log(details);
// 输出:
// {
//   name: '稀有 铁剑 +1',
//   baseName: '铁剑',
//   quality: '稀有',
//   qualityColor: '#0070dd',
//   enhanceLevel: 1,
//   stats: { p_atk: 9 },
//   baseStats: { p_atk: 6 },
//   enhanceCost: 300,
//   reforgeCost: 2000,
//   canEnhance: true,
//   maxLevel: 15
// }
```

## 高级用法

### 批量强化装备

```javascript
// 强化所有已装备的物品到 +5
function enhanceAllEquipmentTo5(player, blacksmithSystem) {
  const slots = ['WEAPON', 'ARMOR', 'HELM', 'BOOTS', 'RING', 'AMULET'];
  const results = [];
  
  slots.forEach(slot => {
    const itemId = player.equipment[slot];
    if (itemId) {
      const item = EQUIPMENT_DB[itemId];
      
      // 初始化装备
      blacksmithSystem.initializeItem(item);
      
      // 强化到 +5
      while (item.enhanceLevel < 5) {
        const result = blacksmithSystem.enhanceItem(item, player);
        results.push({
          slot,
          success: result.success,
          message: result.message
        });
        
        if (!result.success) break; // 金币不足，停止
      }
    }
  });
  
  return results;
}

// 使用
const results = enhanceAllEquipmentTo5(game.player, game.blacksmithSystem);
console.log(results);
```

### 自动重铸直到获得指定品质

```javascript
// 重铸装备直到获得至少 RARE 品质
function reforgeUntilRare(item, player, blacksmithSystem) {
  const qualityOrder = ['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY', 'MYTHIC'];
  const targetIndex = qualityOrder.indexOf('RARE');
  
  let attempts = 0;
  const maxAttempts = 10; // 最多尝试10次
  
  while (attempts < maxAttempts) {
    const currentIndex = qualityOrder.indexOf(item.quality);
    
    if (currentIndex >= targetIndex) {
      return {
        success: true,
        attempts,
        finalQuality: item.quality
      };
    }
    
    const result = blacksmithSystem.reforgeItem(item, player);
    if (!result.success) {
      return {
        success: false,
        attempts,
        message: result.message
      };
    }
    
    attempts++;
  }
  
  return {
    success: false,
    attempts,
    message: '达到最大尝试次数'
  };
}

// 使用
const sword = EQUIPMENT_DB['SWORD_2'];
game.blacksmithSystem.initializeItem(sword);
const result = reforgeUntilRare(sword, game.player, game.blacksmithSystem);
console.log(result);
```

### 计算强化到指定等级的总费用

```javascript
// 计算从当前等级强化到目标等级的总费用
function calculateTotalEnhanceCost(item, targetLevel, blacksmithSystem) {
  const currentLevel = item.enhanceLevel || 0;
  let totalCost = 0;
  
  // 临时克隆装备以计算费用
  const tempItem = { ...item };
  
  for (let level = currentLevel; level < targetLevel; level++) {
    tempItem.enhanceLevel = level;
    totalCost += blacksmithSystem.calculateEnhanceCost(tempItem);
  }
  
  return totalCost;
}

// 使用
const sword = EQUIPMENT_DB['SWORD_2'];
game.blacksmithSystem.initializeItem(sword);

const costTo5 = calculateTotalEnhanceCost(sword, 5, game.blacksmithSystem);
const costTo10 = calculateTotalEnhanceCost(sword, 10, game.blacksmithSystem);
const costTo15 = calculateTotalEnhanceCost(sword, 15, game.blacksmithSystem);

console.log(`强化到 +5: ${costTo5} 金币`);
console.log(`强化到 +10: ${costTo10} 金币`);
console.log(`强化到 +15: ${costTo15} 金币`);
```

### 比较两件装备的属性

```javascript
// 比较两件装备的总属性值
function compareEquipment(item1, item2, blacksmithSystem) {
  blacksmithSystem.initializeItem(item1);
  blacksmithSystem.initializeItem(item2);
  
  const getTotalStats = (item) => {
    return Object.values(item.stats).reduce((sum, val) => sum + val, 0);
  };
  
  const total1 = getTotalStats(item1);
  const total2 = getTotalStats(item2);
  
  return {
    item1: {
      name: blacksmithSystem.getItemDisplayName(item1),
      totalStats: total1
    },
    item2: {
      name: blacksmithSystem.getItemDisplayName(item2),
      totalStats: total2
    },
    better: total1 > total2 ? 'item1' : (total2 > total1 ? 'item2' : 'equal')
  };
}

// 使用
const sword1 = EQUIPMENT_DB['SWORD_1'];
const sword2 = EQUIPMENT_DB['SWORD_2'];

const comparison = compareEquipment(sword1, sword2, game.blacksmithSystem);
console.log(comparison);
```

## 调试和测试

### 给玩家添加金币

```javascript
// 添加大量金币用于测试
game.player.stats.gold += 100000;
game.ui.updateStats(game.player);
console.log(`玩家金币: ${game.player.stats.gold}`);
```

### 强制设置装备品质

```javascript
// 直接设置装备品质（用于测试）
const sword = EQUIPMENT_DB['SWORD_2'];
game.blacksmithSystem.initializeItem(sword);

sword.quality = 'LEGENDARY';
game.blacksmithSystem.recalculateStats(sword);
game.blacksmithSystem.updateItemName(sword);

console.log(sword.displayName); // "传说 铁剑"
console.log(sword.stats); // { p_atk: 18 } (6 * 3.0)
```

### 强制设置强化等级

```javascript
// 直接设置强化等级（用于测试）
const sword = EQUIPMENT_DB['SWORD_2'];
game.blacksmithSystem.initializeItem(sword);

sword.enhanceLevel = 10;
game.blacksmithSystem.recalculateStats(sword);
game.blacksmithSystem.updateItemName(sword);

console.log(sword.displayName); // "普通 铁剑 +10"
console.log(sword.stats); // { p_atk: 15 } (6 * 1.0 * 2.5)
```

### 测试品质随机分布

```javascript
// 测试品质随机分布（运行1000次）
function testQualityDistribution(blacksmithSystem, iterations = 1000) {
  const distribution = {
    COMMON: 0,
    UNCOMMON: 0,
    RARE: 0,
    EPIC: 0,
    LEGENDARY: 0,
    MYTHIC: 0
  };
  
  for (let i = 0; i < iterations; i++) {
    const quality = blacksmithSystem.rollQuality();
    distribution[quality]++;
  }
  
  console.log('品质分布 (1000次):');
  Object.entries(distribution).forEach(([quality, count]) => {
    const percentage = (count / iterations * 100).toFixed(2);
    console.log(`${quality}: ${count} (${percentage}%)`);
  });
}

// 使用
testQualityDistribution(game.blacksmithSystem);
```

## 控制台快捷命令

在浏览器控制台中可以使用以下命令快速测试：

```javascript
// 打开铁匠铺
game.openForge();

// 给玩家添加金币
game.player.stats.gold += 100000;

// 获取当前装备的武器
const weapon = EQUIPMENT_DB[game.player.equipment.WEAPON];

// 强化武器
game.blacksmithSystem.enhanceItem(weapon, game.player);

// 重铸武器品质
game.blacksmithSystem.reforgeItem(weapon, game.player);

// 查看武器详情
console.log(game.blacksmithSystem.getItemDetails(weapon));

// 刷新UI
game.ui.updateStats(game.player);
```

## 常见错误处理

### 错误：装备没有 baseStats

```javascript
// 问题：旧装备可能没有 baseStats
const sword = EQUIPMENT_DB['SWORD_2'];
console.log(sword.baseStats); // undefined

// 解决方案：使用 initializeItem
game.blacksmithSystem.initializeItem(sword);
console.log(sword.baseStats); // { p_atk: 6 }
```

### 错误：强化后UI没有更新

```javascript
// 问题：强化后UI显示的属性没有变化
game.blacksmithSystem.enhanceItem(weapon, game.player);

// 解决方案：手动更新UI
game.ui.updateStats(game.player);
game.ui.updateEquipmentSockets(game.player);
```

### 错误：重铸后装备名称没有变化

```javascript
// 问题：重铸后装备名称没有更新
game.blacksmithSystem.reforgeItem(weapon, game.player);

// 解决方案：updateItemName 已经在 reforgeItem 中自动调用
// 如果仍然没有更新，手动调用：
game.blacksmithSystem.updateItemName(weapon);
```

## 性能优化建议

### 1. 缓存装备详情

```javascript
// 不推荐：每次渲染都计算
function render() {
  const details = game.blacksmithSystem.getItemDetails(item);
  // 使用 details...
}

// 推荐：缓存计算结果
let cachedDetails = null;
let lastItem = null;

function render() {
  if (item !== lastItem) {
    cachedDetails = game.blacksmithSystem.getItemDetails(item);
    lastItem = item;
  }
  // 使用 cachedDetails...
}
```

### 2. 批量操作

```javascript
// 不推荐：逐个更新UI
items.forEach(item => {
  game.blacksmithSystem.enhanceItem(item, game.player);
  game.ui.updateStats(game.player); // 每次都更新
});

// 推荐：批量操作后统一更新
items.forEach(item => {
  game.blacksmithSystem.enhanceItem(item, game.player);
});
game.ui.updateStats(game.player); // 只更新一次
```

## 扩展示例

### 添加强化失败机制

```javascript
// 扩展 BlacksmithSystem 添加失败机制
class ExtendedBlacksmithSystem extends BlacksmithSystem {
  enhanceItem(item, player) {
    // 计算成功率（等级越高成功率越低）
    const baseSuccessRate = FORGE_CONFIG.ENHANCE.SUCCESS_RATE;
    const levelPenalty = item.enhanceLevel * 0.05; // 每级降低5%
    const successRate = Math.max(0.5, baseSuccessRate - levelPenalty);
    
    // 随机判断是否成功
    if (Math.random() > successRate) {
      return {
        success: false,
        message: `强化失败！成功率: ${(successRate * 100).toFixed(0)}%`,
        item: null
      };
    }
    
    // 调用原始方法
    return super.enhanceItem(item, player);
  }
}

// 使用扩展系统
game.blacksmithSystem = new ExtendedBlacksmithSystem();
```

### 添加强化材料系统

```javascript
// 定义强化材料
const ENHANCE_MATERIALS = {
  STONE_BASIC: {
    id: 'STONE_BASIC',
    name: '基础强化石',
    successBonus: 0.1, // +10% 成功率
    cost: 50
  },
  STONE_ADVANCED: {
    id: 'STONE_ADVANCED',
    name: '高级强化石',
    successBonus: 0.2, // +20% 成功率
    cost: 200
  }
};

// 扩展强化方法
function enhanceWithMaterial(item, player, materialId, blacksmithSystem) {
  const material = ENHANCE_MATERIALS[materialId];
  if (!material) {
    return { success: false, message: '无效的材料' };
  }
  
  // 检查材料费用
  if (player.stats.gold < material.cost) {
    return { success: false, message: '金币不足购买材料' };
  }
  
  // 扣除材料费用
  player.stats.gold -= material.cost;
  
  // 执行强化（这里可以添加成功率加成逻辑）
  const result = blacksmithSystem.enhanceItem(item, player);
  
  if (result.success) {
    result.message += ` (使用了${material.name})`;
  }
  
  return result;
}
```

这些示例应该能帮助你快速上手使用铁匠系统！

