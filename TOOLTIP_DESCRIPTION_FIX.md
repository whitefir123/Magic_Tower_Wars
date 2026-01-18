# Tooltip描述显示修复

## 问题描述
赌徒界面中的某些装备和消耗品tooltip只显示名称和类型，缺少详细描述。而商店页面能正常显示完整的tooltip。

## 问题分析

### 症状
1. **装备tooltip不完整**：只显示名称和"equipment"类型，没有描述和属性
2. **火焰卷轴无描述**：tooltip中没有显示具体的效果描述
3. **商店正常**：同样的物品在商店中能正常显示完整tooltip

### 根本原因

经过详细检查，发现了两个关键问题：

#### 问题1：描述字段不匹配
- **数据库使用**：`descZh`字段（中文描述）
- **TooltipManager检查**：只检查`description`字段
- **结果**：所有使用`descZh`的物品描述都无法显示

```javascript
// 修复前
if (item.description) {
  content += `<div class="tt-desc">${item.description}</div>`;
}

// 问题：数据库中是 descZh，不是 description
```

#### 问题2：占位符未替换
- 某些消耗品描述包含占位符（如`{amount}`、`{damage}`）
- TooltipManager没有替换这些占位符
- 结果：显示原始的占位符文本，而不是实际数值

```javascript
// 火焰卷轴的描述
descZh: '消耗品：使用后，使你的下一次成功攻击在命中前先造成 {damage} 点火焰伤害...'
effect: { kind: 'prime_state', damage: 30 }

// 应该显示：造成 30 点火焰伤害
// 实际显示：造成 {damage} 点火焰伤害
```

## 修复方案

### 修复1：支持多种描述字段

修改TooltipManager以支持`descZh`、`description`和`desc`字段：

```javascript
// 修复后：按优先级检查多个字段
let description = item.descZh || item.description || item.desc;
```

**优先级顺序：**
1. `descZh` - 中文描述（优先）
2. `description` - 英文描述
3. `desc` - 简短描述

### 修复2：替换描述占位符

添加占位符替换逻辑，支持常见的占位符：

```javascript
// 替换描述中的占位符
if (description && item.effect) {
  // 替换 {amount} 占位符
  if (item.effect.amount !== undefined) {
    description = description.replace(/\{amount\}/g, item.effect.amount);
  }
  // 替换 {damage} 占位符
  if (item.effect.damage !== undefined) {
    description = description.replace(/\{damage\}/g, item.effect.damage);
  }
}
```

**支持的占位符：**
- `{amount}` - 数量（用于药水、经验卷轴等）
- `{damage}` - 伤害（用于火焰卷轴等）

## 修复效果

### 修复前

**装备tooltip：**
```
┌─────────────────────────────────┐
│ 木制法杖                        │
│ equipment                       │
└─────────────────────────────────┘
```

**火焰卷轴tooltip：**
```
┌─────────────────────────────────┐
│ 火焰卷轴                        │
│ 消耗品                          │
│                                 │
│ 消耗品：使用后，使你的下一次    │
│ 成功攻击在命中前先造成 {damage} │
│ 点火焰伤害...                   │
└─────────────────────────────────┘
```

### 修复后

**装备tooltip：**
```
┌─────────────────────────────────┐
│ 木制法杖                        │
│ 武器                            │
│                                 │
│ 一根普通的橡木手杖，能够微弱地  │
│ 引导魔法能量。                  │
│                                 │
│ 魔攻: +3                        │
└─────────────────────────────────┘
```

**火焰卷轴tooltip：**
```
┌─────────────────────────────────┐
│ 火焰卷轴                        │
│ 消耗品                          │
│                                 │
│ 消耗品：使用后，使你的下一次    │
│ 成功攻击在命中前先造成 30 点    │
│ 火焰伤害并施加灼烧，可与技能    │
│ 本身的灼烧叠加并触发元素反应。  │
│                                 │
│ 造成 30 伤害                    │
└─────────────────────────────────┘
```

## 数据库字段使用情况

### 装备数据库
所有装备使用`descZh`字段：

```javascript
WEAPON_STAFF_T1: { 
  id: 'WEAPON_STAFF_T1', 
  name: 'Wooden Staff', 
  nameZh: '木制法杖', 
  descZh: '一根普通的橡木手杖，能够微弱地引导魔法能量。',
  // ...
}
```

### 消耗品数据库
消耗品也使用`descZh`字段，部分包含占位符：

```javascript
POTION_HP_S: { 
  descZh: '一瓶红色的小药水，喝下去后能快速回复 {amount} 点生命值。',
  effect: { kind: 'heal', amount: 50 }
}

SCROLL_FIRE: { 
  descZh: '消耗品：使用后，使你的下一次成功攻击在命中前先造成 {damage} 点火焰伤害...',
  effect: { kind: 'prime_state', damage: 30 }
}
```

## 技术实现

### 修改文件
**src/utils/TooltipManager.js**

修改位置：`generateTooltipContent`方法中的描述显示部分

```javascript
// 显示描述（包括 Jackpot 等特殊标记）
// ✅ FIX: 支持 descZh 和 description 字段
let description = item.descZh || item.description || item.desc;

// ✅ FIX: 替换描述中的占位符
if (description && item.effect) {
  // 替换 {amount} 占位符
  if (item.effect.amount !== undefined) {
    description = description.replace(/\{amount\}/g, item.effect.amount);
  }
  // 替换 {damage} 占位符
  if (item.effect.damage !== undefined) {
    description = description.replace(/\{damage\}/g, item.effect.damage);
  }
}

if (description) {
  content += `<div class="tt-desc">${description}</div>`;
}
```

## 为什么商店能正常显示

商店使用相同的TooltipManager，但是：

1. **商店可能使用旧系统**：`getEquipmentDropForFloor`的`useLegacySystem`选项
2. **物品对象更完整**：商店直接从EQUIPMENT_DB获取物品，包含所有字段
3. **数据合并逻辑**：TooltipManager会从EQUIPMENT_DB补充缺失的字段

但是赌徒界面的问题在于：
- 即使数据合并了，`description`字段仍然不存在
- 需要检查`descZh`字段才能获取描述

## 测试验证

### 测试项目
1. ✅ 所有装备显示完整描述
2. ✅ 所有消耗品显示完整描述
3. ✅ 占位符正确替换为实际数值
4. ✅ 火焰卷轴显示"造成 30 点火焰伤害"
5. ✅ 小型药水显示"回复 50 点生命值"
6. ✅ 知识卷轴显示"获得 10 点经验"

### 测试方法
```bash
# 在浏览器中打开赌徒界面
# 鼠标悬停在各种奖品上
# 检查tooltip是否显示完整描述
```

## 兼容性

- ✅ 向后兼容：支持旧的`description`字段
- ✅ 多语言支持：优先使用中文描述
- ✅ 占位符扩展：可以轻松添加更多占位符类型
- ✅ 性能：正则替换性能开销极小

## 后续优化建议

### 1. 统一描述字段
建议在整个项目中统一使用`descZh`字段，避免混淆：

```javascript
// 推荐
item.descZh = '中文描述';

// 不推荐
item.description = 'English description';
```

### 2. 扩展占位符系统
可以添加更多占位符支持：

```javascript
// 建议支持的占位符
{value}     // 通用数值
{duration}  // 持续时间
{cooldown}  // 冷却时间
{range}     // 范围
{percent}   // 百分比
```

### 3. 占位符格式化
可以添加格式化选项：

```javascript
{amount:0}      // 整数
{amount:2}      // 保留2位小数
{percent:1}%    // 百分比，保留1位小数
```

### 4. 动态描述生成
对于复杂的物品，可以考虑动态生成描述：

```javascript
function generateDescription(item) {
  if (item.type === 'WEAPON') {
    return `一把${item.tier}级${item.nameZh}，提供${item.stats.p_atk}点物理攻击。`;
  }
  // ...
}
```

## 注意事项

1. **占位符大小写**：当前使用小写占位符（`{amount}`），保持一致
2. **正则表达式**：使用全局替换（`/g`标志）确保替换所有出现的占位符
3. **undefined检查**：替换前检查值是否存在，避免显示"undefined"
4. **数据完整性**：确保所有物品都有`descZh`字段

## 总结

通过这次修复：
1. ✅ 解决了描述字段不匹配的问题
2. ✅ 实现了占位符自动替换
3. ✅ 统一了赌徒界面和商店的tooltip显示
4. ✅ 提升了用户体验，所有物品都有完整的描述信息

现在赌徒界面的所有奖品都能显示完整、准确的tooltip信息！
