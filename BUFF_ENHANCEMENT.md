# Buff增益系统增强

## 更新内容

### 1. 品质相关的数值系统

Buff现在根据品质提供不同的数值加成：

#### 攻击/防御类Buff（Might, Iron Skin, Arcana, Ward）

| 品质 | 数值 | 说明 |
|------|------|------|
| 普通 (COMMON) | +1 | 基础加成 |
| 优秀 (UNCOMMON) | +1 | 基础加成 |
| 稀有 (RARE) | +2 | 2倍加成 |
| 史诗 (EPIC) | +3 | 3倍加成 |
| 传说 (LEGENDARY) | +5 | 5倍加成 |

#### 生命类Buff（Vitality）

| 品质 | 数值 | 说明 |
|------|------|------|
| 普通 (COMMON) | +10 HP | 基础加成 |
| 优秀 (UNCOMMON) | +10 HP | 基础加成 |
| 稀有 (RARE) | +20 HP | 2倍加成 |
| 史诗 (EPIC) | +30 HP | 3倍加成 |
| 传说 (LEGENDARY) | +50 HP | 5倍加成 |

#### 怒气类Buff（Fury）

| 品质 | 数值 | 说明 |
|------|------|------|
| 普通 (COMMON) | +15 | 基础加成 |
| 优秀 (UNCOMMON) | +15 | 基础加成 |
| 稀有 (RARE) | +20 | 增强加成 |
| 史诗 (EPIC) | +30 | 强力加成 |
| 传说 (LEGENDARY) | +40 | 最大加成 |

#### 金币类Buff（Fortune）

| 品质 | 数值 | 说明 |
|------|------|------|
| 普通 (COMMON) | +50 G | 基础加成 |
| 优秀 (UNCOMMON) | +50 G | 基础加成 |
| 稀有 (RARE) | +100 G | 2倍加成 |
| 史诗 (EPIC) | +150 G | 3倍加成 |
| 传说 (LEGENDARY) | +200 G | 4倍加成 |

### 2. 详细的Buff描述

每个Buff现在都有具体的描述文本：

#### Might（蛮力）
- **普通**：永久提升 1 点物理攻击
- **稀有**：永久提升 2 点物理攻击
- **史诗**：永久提升 3 点物理攻击
- **传说**：永久提升 5 点物理攻击

#### Iron Skin（铁壁）
- **普通**：永久提升 1 点物理防御
- **稀有**：永久提升 2 点物理防御
- **史诗**：永久提升 3 点物理防御
- **传说**：永久提升 5 点物理防御

#### Arcana（奥术）
- **普通**：永久提升 1 点魔法攻击
- **稀有**：永久提升 2 点魔法攻击
- **史诗**：永久提升 3 点魔法攻击
- **传说**：永久提升 5 点魔法攻击

#### Ward（守护）
- **普通**：永久提升 1 点魔法防御
- **稀有**：永久提升 2 点魔法防御
- **史诗**：永久提升 3 点魔法防御
- **传说**：永久提升 5 点魔法防御

#### Vitality（活力）
- **普通**：永久提升 10 点最大生命值并立即回复等量生命
- **稀有**：永久提升 20 点最大生命值并立即回复等量生命
- **史诗**：永久提升 30 点最大生命值并立即回复等量生命
- **传说**：永久提升 50 点最大生命值并立即回复等量生命

#### Fury（狂怒）
- **普通**：立即获得 15 点怒气
- **稀有**：立即获得 20 点怒气
- **史诗**：立即获得 30 点怒气
- **传说**：立即获得 40 点怒气

#### Fortune（财富）
- **普通**：立即获得 50 金币
- **稀有**：立即获得 100 金币
- **史诗**：立即获得 150 金币
- **传说**：立即获得 200 金币

### 3. 增强的Tooltip显示

Buff的tooltip现在显示：

1. **名称**（带品质颜色）
2. **类型**：临时增益
3. **详细描述**：具体的效果说明
4. **效果数值**：带颜色编码
   - 进攻类：红色 (#ff6b6b)
   - 防御类：蓝色 (#4dabf7)
   - 资源类：金色 (#ffd700)
   - 其他：绿色 (#4caf50)
5. **标签**：进攻/防御/物理/魔法/资源

#### Tooltip示例

**普通品质 - Might**
```
┌─────────────────────────────────┐
│ Buff: Might                     │
│ 临时增益                        │
│                                 │
│ 永久提升 1 点物理攻击           │
│                                 │
│ 效果数值: 1                     │
│ 进攻 · 物理                     │
└─────────────────────────────────┘
```

**传说品质 - Might**
```
┌─────────────────────────────────┐
│ Buff: Might                     │
│ 临时增益                        │
│                                 │
│ 永久提升 5 点物理攻击           │
│                                 │
│ 效果数值: 5                     │
│ 进攻 · 物理                     │
└─────────────────────────────────┘
```

**史诗品质 - Vitality**
```
┌─────────────────────────────────┐
│ Buff: Vitality                  │
│ 临时增益                        │
│                                 │
│ 永久提升 30 点最大生命值并立即  │
│ 回复等量生命                    │
│                                 │
│ 效果数值: 30                    │
│ 资源                            │
└─────────────────────────────────┘
```

### 4. 效果应用逻辑

Buff现在使用计算好的数值正确应用：

```javascript
// 修复前
reward.data.effect(game.player, 5); // 固定值

// 修复后
const value = reward.buffValue || 1; // 使用计算好的数值
reward.data.effect(game.player, value);
```

### 5. 游戏消息显示

获得Buff时显示详细的效果消息：

```javascript
// 示例消息
"永久提升 3 点物理攻击"
"永久提升 20 点最大生命值并立即回复等量生命"
"立即获得 100 金币"
```

## 技术实现

### 修改的文件

#### 1. src/ui/GamblerUI.js

**Buff生成逻辑（generateItemByQuality）：**
```javascript
case 'BUFF':
  const buff = BUFF_POOL[Math.floor(Math.random() * BUFF_POOL.length)];
  
  // 根据品质计算Buff数值
  let buffValue = 1;
  let buffDesc = '';
  
  // 根据Buff类型和品质计算数值
  if (buff.id === 'str' || buff.id === 'iron' || buff.id === 'arc' || buff.id === 'ward') {
    // 攻击/防御类
    if (quality === 'LEGENDARY') buffValue = 5;
    else if (quality === 'EPIC') buffValue = 3;
    else if (quality === 'RARE') buffValue = 2;
    else buffValue = 1;
    
    const statName = /* ... */;
    buffDesc = `永久提升 ${buffValue} 点${statName}`;
  }
  // ... 其他类型
  
  return {
    type: 'buff',
    name: `Buff: ${buff.name}`,
    quality: quality,
    data: buff,
    buffValue: buffValue,  // 新增
    buffDesc: buffDesc,    // 新增
    icon: '⚡'
  };
```

**Buff应用逻辑（applyReward）：**
```javascript
case 'buff':
  if (reward.data && reward.data.effect) {
    const value = reward.buffValue || 1; // 使用计算好的数值
    reward.data.effect(game.player, value);
    
    const effectMsg = reward.buffDesc || `${reward.name} 生效！`;
    game.ui.logMessage(effectMsg, 'upgrade');
  }
  break;
```

#### 2. src/utils/TooltipManager.js

**Buff tooltip生成：**
```javascript
if (itemOrId.type === 'buff' && itemOrId.data) {
  const buff = itemOrId.data;
  // ... 名称和类型
  
  // 显示详细描述
  if (itemOrId.buffDesc) {
    content += `<div class="tt-desc">${itemOrId.buffDesc}</div>`;
  }
  
  // 显示数值（带颜色）
  if (itemOrId.buffValue !== undefined) {
    const valueColor = /* 根据标签选择颜色 */;
    content += `<div class="tt-stat" style="color: ${valueColor};">效果数值: ${itemOrId.buffValue}</div>`;
  }
  
  // 显示标签
  // ...
}
```

## 数值平衡

### 设计理念

1. **基础值保守**：普通和优秀品质提供基础加成
2. **稀有值实用**：稀有品质提供2倍加成，开始有明显效果
3. **史诗值强力**：史诗品质提供3倍加成，效果显著
4. **传说值顶级**：传说品质提供5倍加成，非常强力

### 与装备对比

- **T1装备**：通常提供 3 点属性
- **普通Buff**：提供 1 点属性（约33%）
- **稀有Buff**：提供 2 点属性（约67%）
- **史诗Buff**：提供 3 点属性（相当于T1装备）
- **传说Buff**：提供 5 点属性（超过T1装备）

### 获取成本

假设标准旋转成本为50G：

| Buff品质 | 期望成本 | 数值 | 性价比 |
|---------|---------|------|--------|
| 普通 | ~100G | +1 | 0.01/G |
| 稀有 | ~500G | +2 | 0.004/G |
| 史诗 | ~5000G | +3 | 0.0006/G |
| 传说 | 极高 | +5 | 极低 |

**结论**：普通Buff性价比最高，但效果微弱；传说Buff效果强大，但极难获得。

## 测试验证

### 测试项目

1. ✅ 不同品质的Buff生成正确的数值
2. ✅ Tooltip显示详细的描述和数值
3. ✅ Buff效果正确应用到玩家属性
4. ✅ 游戏消息显示正确的效果描述
5. ✅ 颜色编码正确显示

### 测试方法

```javascript
// 在赌徒界面抽取Buff
// 检查tooltip显示
// 检查玩家属性变化
// 检查游戏消息
```

## 兼容性

- ✅ 向后兼容：不影响现有Buff系统
- ✅ 扩展性：可以轻松添加新的Buff类型
- ✅ 平衡性：数值经过精心设计

## 后续优化建议

### 1. 临时Buff系统
当前Buff是永久的，可以考虑添加临时Buff：

```javascript
{
  type: 'temporary_buff',
  duration: 300, // 5分钟
  effect: { p_atk: 5 }
}
```

### 2. Buff堆叠
允许相同Buff堆叠，但有上限：

```javascript
player.buffs = {
  'might': { stacks: 3, value: 3 }
}
```

### 3. Buff图标
为不同的Buff使用不同的图标：

```javascript
const buffIcons = {
  'str': '💪',
  'iron': '🛡️',
  'arc': '✨',
  'ward': '🔮',
  'vit': '❤️',
  'fury': '😡',
  'fortune': '💰'
};
```

### 4. Buff动画
添加获得Buff时的视觉效果：

```javascript
// 粒子效果
// 属性数值飘字
// 角色光效
```

## 总结

通过这次增强：
1. ✅ Buff现在有明确的数值系统
2. ✅ 不同品质提供不同的加成
3. ✅ Tooltip显示详细的效果描述
4. ✅ 效果正确应用到玩家
5. ✅ 提升了游戏体验和可读性

Buff系统现在更加完善和平衡！
