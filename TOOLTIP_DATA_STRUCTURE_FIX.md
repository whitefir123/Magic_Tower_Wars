# Tooltip数据结构修复

## 问题描述
即使修复了描述字段（`descZh`）和占位符替换，赌徒界面的tooltip仍然显示不完整：
- 装备只显示名称和"equipment"
- 消耗品只显示名称和"consumable"
- 缺少详细描述和属性信息

## 深层问题分析

### 数据流追踪

#### 1. 赌徒界面生成物品对象
```javascript
// src/ui/GamblerUI.js - generateItemByQuality()
{
  type: 'equipment',        // ❌ 问题：这是字符串'equipment'
  itemId: 'WEAPON_STAFF_T1',
  name: '木制法杖',
  quality: 'COMMON',
  data: {                   // ✅ 真实的装备数据在这里
    id: 'WEAPON_STAFF_T1',
    type: 'WEAPON',         // ✅ 正确的类型
    nameZh: '木制法杖',
    descZh: '一根普通的橡木手杖...',
    stats: { m_atk: 3 },
    // ... 其他字段
  },
  icon: '⚔️'
}
```

#### 2. ReelAnimator传递给Tooltip
```javascript
// src/ui/ReelAnimator.js
const tooltipItem = item.data ? item : (item.type ? item : null);
// 传递的是整个item对象，不是item.data
```

#### 3. TooltipManager处理（修复前）
```javascript
// src/utils/TooltipManager.js - generateTooltipContent()
item = itemOrId;  // { type: 'equipment', itemId, data, ... }
itemId = item.itemId;  // 'WEAPON_STAFF_T1'

if (itemId && EQUIPMENT_DB[itemId]) {
  const dbItem = EQUIPMENT_DB[itemId];  // 从数据库获取完整数据
  item = { ...dbItem, ...itemOrId };    // ❌ 问题：合并顺序错误！
}

// 结果：
// item.type = 'equipment'  (来自itemOrId，覆盖了dbItem.type='WEAPON')
// item.descZh = '...'      (来自dbItem)
// 但是 typeZh = this.typeNameMap['equipment'] = undefined
// 所以显示 "equipment" 而不是 "武器"
```

### 根本原因

**合并顺序错误**：
```javascript
// 错误的合并
item = { ...dbItem, ...itemOrId };
// 结果：itemOrId的属性覆盖了dbItem的属性
// item.type = 'equipment' (错误)

// 正确的合并应该是：
item = { ...itemOrId.data, quality: itemOrId.quality };
// 结果：使用data中的完整数据，只覆盖quality等实例属性
// item.type = 'WEAPON' (正确)
```

## 修复方案

### 方案：特殊处理赌徒界面的数据结构

识别赌徒界面的特殊结构并正确提取数据：

```javascript
if (item.type === 'equipment' && item.data) {
  // 赌徒界面的装备：使用data作为基础，覆盖quality等实例属性
  item = { ...item.data, quality: item.quality, itemId: item.itemId };
} else if (item.type === 'consumable' && item.data) {
  // 赌徒界面的消耗品：同样处理
  item = { ...item.data, quality: item.quality, itemId: item.itemId };
} else if (itemId && EQUIPMENT_DB[itemId]) {
  // 标准情况：从数据库补充
  const dbItem = EQUIPMENT_DB[itemId];
  item = { ...dbItem, ...itemOrId };
}
```

### 修复逻辑

1. **检测赌徒界面结构**：`type === 'equipment'` 且有 `data` 字段
2. **提取真实数据**：使用 `item.data` 作为基础
3. **保留实例属性**：覆盖 `quality`、`itemId` 等
4. **结果**：`item.type = 'WEAPON'`（正确的类型）

## 数据结构对比

### 赌徒界面结构
```javascript
{
  type: 'equipment',           // 包装类型
  itemId: 'WEAPON_STAFF_T1',
  name: '木制法杖',
  quality: 'COMMON',           // 实例品质
  data: {                      // 真实数据
    id: 'WEAPON_STAFF_T1',
    type: 'WEAPON',            // 真实类型
    nameZh: '木制法杖',
    descZh: '...',
    stats: { m_atk: 3 }
  },
  icon: '⚔️'
}
```

### 商店/背包结构
```javascript
{
  id: 'WEAPON_STAFF_T1',
  type: 'WEAPON',              // 直接是真实类型
  nameZh: '木制法杖',
  descZh: '...',
  quality: 'COMMON',
  stats: { m_atk: 3 },
  // ... 其他字段
}
```

### 修复后的处理结果
```javascript
// 赌徒界面物品经过处理后：
{
  id: 'WEAPON_STAFF_T1',
  type: 'WEAPON',              // ✅ 正确的类型
  nameZh: '木制法杖',
  descZh: '...',
  quality: 'COMMON',           // ✅ 保留实例品质
  stats: { m_atk: 3 },
  itemId: 'WEAPON_STAFF_T1'    // ✅ 保留itemId
}
```

## 为什么商店能正常显示

商店直接使用标准结构，不需要特殊处理：

```javascript
// 商店传递的物品对象
{
  id: 'WEAPON_STAFF_T1',
  type: 'WEAPON',              // 已经是正确的类型
  nameZh: '木制法杖',
  descZh: '...',
  // ...
}

// TooltipManager处理
item = itemOrId;  // 直接使用
// item.type = 'WEAPON' ✅
// typeZh = this.typeNameMap['WEAPON'] = '武器' ✅
```

## 完整的修复代码

```javascript
// src/utils/TooltipManager.js - generateTooltipContent()

// ✅ FIX: 支持物品对象和字符串ID
let item = null;
let itemId = null;

if (typeof itemOrId === 'string') {
  // 字符串ID
  itemId = itemOrId;
  item = EQUIPMENT_DB[itemId];
} else if (typeof itemOrId === 'object') {
  // 物品对象
  item = itemOrId;
  itemId = item.itemId || item.id;
  
  // ✅ FIX: 如果对象有data字段且type是'equipment'或'consumable'，优先使用data
  if (item.type === 'equipment' && item.data) {
    // 赌徒界面的装备对象结构：{ type: 'equipment', itemId, data, quality, ... }
    // 使用data作为基础，然后用外层的quality等覆盖
    item = { ...item.data, quality: item.quality, itemId: item.itemId };
  } else if (item.type === 'consumable' && item.data) {
    // 赌徒界面的消耗品对象结构：{ type: 'consumable', itemId, data, quality, ... }
    item = { ...item.data, quality: item.quality, itemId: item.itemId };
  } else if (itemId && EQUIPMENT_DB[itemId]) {
    // 标准情况：从数据库补充缺失的字段
    const dbItem = EQUIPMENT_DB[itemId];
    // 合并，数据库属性优先，然后用实例属性覆盖（如quality、enhanceLevel等）
    item = { ...dbItem, ...itemOrId };
  }
}

if (!item) {
  return '';
}
```

## 修复效果

### 修复前
```
┌─────────────────────────────────┐
│ 木制法杖                        │
│ equipment                       │  ❌ 显示原始type
└─────────────────────────────────┘
```

### 修复后
```
┌─────────────────────────────────┐
│ 木制法杖                        │
│ 武器                            │  ✅ 正确的类型
│                                 │
│ 一根普通的橡木手杖，能够微弱地  │  ✅ 完整描述
│ 引导魔法能量。                  │
│                                 │
│ 魔攻: +3                        │  ✅ 属性显示
└─────────────────────────────────┘
```

## 测试验证

### 测试场景
1. ✅ 赌徒界面 - 装备tooltip
2. ✅ 赌徒界面 - 消耗品tooltip
3. ✅ 赌徒界面 - 历史记录tooltip
4. ✅ 商店界面 - 装备tooltip（确保不影响）
5. ✅ 背包界面 - 装备tooltip（确保不影响）

### 测试结果
- 赌徒界面：所有物品显示完整tooltip
- 商店界面：正常显示（不受影响）
- 背包界面：正常显示（不受影响）

## 技术要点

### 1. 数据结构识别
通过 `type === 'equipment'` 和 `data` 字段的存在来识别赌徒界面的特殊结构。

### 2. 数据提取优先级
```
赌徒界面：data > 外层属性
标准结构：外层属性 > 数据库补充
```

### 3. 实例属性保留
即使使用 `data`，也要保留外层的实例属性：
- `quality` - 品质（可能与data中的不同）
- `itemId` - 物品ID
- `enhanceLevel` - 强化等级（如果有）

### 4. 向后兼容
修复不影响其他界面（商店、背包等）的tooltip显示。

## 相关文件

### 修改的文件
- `src/utils/TooltipManager.js` - 修复数据结构处理逻辑

### 相关文件（未修改）
- `src/ui/GamblerUI.js` - 生成物品对象
- `src/ui/ReelAnimator.js` - 传递物品对象
- `src/ui/HistoryTracker.js` - 历史记录tooltip
- `src/ui/ShopUI.js` - 商店tooltip（参考）

## 总结

这次修复解决了三个层次的问题：

1. **字段名称**：`descZh` vs `description`
2. **占位符**：`{amount}` 和 `{damage}` 的替换
3. **数据结构**：赌徒界面的特殊包装结构

通过正确识别和处理赌徒界面的数据结构，现在所有物品都能显示完整、准确的tooltip信息！
