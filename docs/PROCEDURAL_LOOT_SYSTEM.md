# 程序化装备生成系统 (Procedural Loot Generation System)

## 概述

本系统将现有的静态装备数据库升级为基于**过程生成（Procedural Generation）**的动态系统。通过"前缀+底材+后缀"的方式，能够生成海量独特装备，同时保留了现有的16个装备图标。

## 核心特性

### 1. 装备原型（Archetypes）
- 将16个图标映射为底材类型
- 每个底材有基础属性范围
- 支持职业亲和系统（职业适配权重）

### 2. 词缀系统（Affixes）
- **前缀（Prefixes）**: 决定材质/状态，修正基础数值
  - T1: 破败（Rusted, Broken）- 数值略低
  - T2: 普通（Iron, Common）- 标准
  - T3: 精良（Tempered, Honed）- 数值+
  - T4: 史诗（Void-forged, Dragonbone, Astral）- 数值++
  - T5: 神话（Primordial, Eternal）- Jackpot专属

- **后缀（Suffixes）**: 决定传说/特殊效果
  - T1: 基础（Wolf, Bear, Fox）- 基础加成
  - T2: 进阶（Titan, Precision, Arcane）- 百分比加成
  - T3: 高级（Vampire, Greed, Phoenix）- 特殊效果
  - T4: 传说（Dragon, Immortality, Omnipotence）- 多重加成
  - T5: 神话（Ragnarok, Abyss）- Jackpot专属

### 3. 物品等级（Item Power - iPwr）
```
iPwr = (Floor × 10) + (MonsterBonus) + (AscensionBonus)
```

- **MonsterBonus**: 
  - T1 怪物: +0
  - T2 怪物: +5
  - T3 怪物: +10

- **AscensionBonus**: 飞升等级 × 20

### 4. 命运骰子（Fate Roll）
- **1% Jackpot**: +30 iPwr，强制升阶，可获得T5词缀
- **9% Lucky**: +10 iPwr
- **90% Normal**: 标准掉落

### 5. 品质系统
根据 iPwr 和 MagicFind 决定品质：

| 品质 | 阈值 | 词缀配置 |
|------|------|----------|
| Common | 0+ | 无词缀 |
| Uncommon | 15+ | 1前缀 |
| Rare | 40+ | 1前缀 + 1后缀 |
| Epic | 80+ | 1前缀 + 1后缀 (×1.2倍率) |
| Legendary | 150+ | 1前缀 + 1后缀 (×1.5倍率) |
| Mythic | 300+ | 1前缀 + 1后缀 (×2.0倍率) |

### 6. 属性计算公式
```
iPwrMulti = 1 + (iPwr / 100)
FinalStat = (BaseStat × iPwrMulti × PrefixMulti × QualityMulti) + PrefixFlat + SuffixFlat
```

对于百分比后缀：
```
FinalStat = FinalStat × (1 + SuffixPercent)
```

## 使用方法

### 基础使用

```javascript
import { generateLoot } from './systems/LootGenerationSystem.js';

// 简单生成
const item = generateLoot(10);  // 第10层掉落

// 完整参数
const item = generateLoot(10, {
  monsterTier: 2,           // 怪物等级
  playerClass: 'warrior',   // 玩家职业（影响掉落权重）
  magicFind: 0.2,           // 20% 魔法发现
  ascensionLevel: 5         // 飞升等级5
});
```

### 生成的物品对象结构

```javascript
{
  uid: "PROCGEN_1234567890_abc123",
  id: "PROCGEN_1234567890_abc123",
  name: "Tempered Blade of the Vampire",
  nameZh: "锻造剑吸血鬼",
  type: "WEAPON",
  quality: "EPIC",
  itemPower: 45,
  tier: 2,
  stats: {
    p_atk: 15,
    lifesteal: 0.08
  },
  iconIndex: 0,
  description: "史诗 • iPwr 45",
  meta: {
    archetype: "BLADE",
    prefix: "Tempered",
    suffix: "of the Vampire",
    isJackpot: false,
    isLucky: false
  }
}
```

## 集成方式

### 1. 装备掉落（已集成）

```javascript
// CombatSystem.js - 怪物死亡掉落
const drop = getEquipmentDropForFloor(player.stats.floor || 1, {
  monsterTier: monster.tier || 1,
  playerClass: player.classId?.toLowerCase() || null,
  magicFind: player.stats.magicFind || 0,
  ascensionLevel: game.selectedAscensionLevel || 0
});

if (drop) {
  game.map.addEquipAt(drop, monster.x, monster.y);
}
```

### 2. UI 渲染（已适配）

TooltipManager 已自动支持动态生成的装备：
- 显示物品等级（iPwr）
- 显示词缀信息
- 百分比属性正确格式化
- 支持 Jackpot/Lucky 标记

### 3. 背包系统（已适配）

Player 类的 `addToInventory()` 和 `equip()` 方法已支持动态装备对象。

## 数值平衡示例

### 第1层
- iPwr: 10-20 (Normal)
- iPwr: 20-30 (Lucky 9%)
- iPwr: 40-50 (Jackpot 1%)
- 品质: Common ~ Rare

### 第10层
- iPwr: 100-110 (Normal)
- iPwr: 110-120 (Lucky)
- iPwr: 130-140 (Jackpot)
- 品质: Epic ~ Legendary

### 第30层 (飞升10)
- iPwr: 500-510 (Normal)
- iPwr: 510-520 (Lucky)
- iPwr: 530-540 (Jackpot)
- 品质: Legendary ~ Mythic

## 特殊装备名称示例

- `Rusted Blade` - 锈蚀的剑（普通）
- `Iron Staff of the Wolf` - 铁制法杖狼之（暴击加成）
- `Tempered Plate of the Titan` - 锻造板甲泰坦（生命+防御）
- `Void-forged Scythe of the Vampire` - 虚空锻造镰吸血鬼（史诗吸血）
- `Primordial Edge of Ragnarok` - 原初刃诸神黄昏（神话全能）

## 旧系统兼容

旧的静态装备系统（`EQUIPMENT_DB`）保留用于：
- 商店固定商品
- 教学/新手装备
- 特殊剧情装备

使用方法：
```javascript
const item = getEquipmentDropForFloor(floor, { useLegacySystem: true });
```

## 调试和测试

### 查看动态装备池
```javascript
console.log(window.__dynamicItems);  // Map 对象
```

### 强制 Jackpot 测试
```javascript
// 临时修改概率（仅开发环境）
const fateRoll = { iPwr: 100, isJackpot: true, isLucky: false };
```

## 注意事项

1. **唯一ID**: 每个动态生成的装备都有唯一的 UID
2. **存储**: 动态装备存储在 `window.__dynamicItems` Map 中
3. **序列化**: 保存/加载系统需要序列化动态装备对象
4. **性能**: 装备生成是轻量级操作，不会影响性能
5. **数值膨胀**: 所有属性都有上限保护，防止数值溢出

## 未来扩展

- [ ] 自定义词缀组合规则
- [ ] 装备套装系统
- [ ] 传说特效（Legendary Effects）
- [ ] 装备重铸系统（Reroll Affixes）
- [ ] 装备分解与合成
- [ ] 词缀锁定功能

---

**版本**: 1.0.0  
**创建日期**: 2025-12-31  
**作者**: Cursor AI Assistant

