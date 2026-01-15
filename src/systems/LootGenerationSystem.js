// LootGenerationSystem.js - 动态装备生成系统
// 基于楼层、怪物、职业和幸运值生成程序化装备

import { ARCHETYPES, AFFIXES, getAvailableAffixes, weightedRandom } from '../data/procgen.js';
import { ITEM_QUALITY } from '../data/loot.js';
import { getAllSetIds } from '../data/sets.js';
import { EQUIPMENT_DB, CONSUMABLE_IDS, createDynamicConsumable } from '../data/items.js';

/**
 * LootGenerator - 程序化生成装备的核心系统
 * 实现基于iPwr（Item Power）的动态属性计算
 */
export class LootGenerator {
  constructor() {
    // 品质配置（根据iPwr和MF决定）
    this.qualityThresholds = {
      COMMON: 0,      // iPwr 0+
      UNCOMMON: 15,   // iPwr 15+
      RARE: 40,       // iPwr 40+
      EPIC: 80,       // iPwr 80+
      LEGENDARY: 150, // iPwr 150+
      MYTHIC: 300     // iPwr 300+ (极难达到)
    };

    // 词缀配置（基础槽位与最大Tier，不在此处硬编码数值倍率）
    this.affixRules = {
      COMMON: { prefix: 0, suffix: 0, maxTier: 1 },
      UNCOMMON: { prefix: 1, suffix: 0, maxTier: 2 },
      RARE: { prefix: 1, suffix: 1, maxTier: 3 },
      EPIC: { prefix: 1, suffix: 1, maxTier: 4 },
      LEGENDARY: { prefix: 1, suffix: 1, maxTier: 5 },
      MYTHIC: { prefix: 1, suffix: 1, maxTier: 5 }
    };

    // 根据 ITEM_QUALITY 动态注入 statMulti，确保数值来源唯一
    Object.keys(this.affixRules).forEach(quality => {
      const qualityCfg = ITEM_QUALITY[quality];
      const multiplier = qualityCfg?.multiplier ?? 1.0;
      this.affixRules[quality].statMulti = multiplier;
    });
  }

  /**
   * 核心生成方法
   * @param {Object} params - 生成参数
   * @param {number} params.floor - 当前楼层
   * @param {number} params.monsterTier - 怪物等级 (1-3)
   * @param {string} params.playerClass - 玩家职业 ('warrior', 'mage', 'rogue')
   * @param {number} params.magicFind - 魔法发现 (0-1)
   * @param {number} params.ascensionLevel - 飞升等级 (可选)
   * @param {SeededRandom} params.rng - 可选的随机数生成器（如果提供则使用，否则使用 Math.random）
   * @returns {Object} 生成的装备对象
   */
  generate(params = {}) {
    const {
      floor = 1,
      monsterTier = 1,
      playerClass = null,
      magicFind = 0,
      ascensionLevel = 0,
      rng = null
    } = params;

    // === 第一步：计算物品等级 (iPwr) ===
    const iPwr = this.calculateItemPower(floor, monsterTier, ascensionLevel);

    // === 第二步：Fate Roll (命运骰子) ===
    const fateRoll = this.rollFate(iPwr, rng);

    // === 第三步：选择底材 (Archetype) ===
    const archetype = this.rollArchetype(playerClass, fateRoll.isJackpot, rng);

    // === 第四步：确定品质与词缀槽 ===
    const quality = this.determineQuality(fateRoll.iPwr, magicFind, fateRoll.isJackpot, rng);
    const affixConfig = this.affixRules[quality];

    // === 第五步：Roll词缀 ===
    const prefix = affixConfig.prefix > 0 
      ? this.rollAffix('PREFIXES', affixConfig.maxTier, fateRoll.isJackpot, rng)
      : null;
    
    const suffix = affixConfig.suffix > 0
      ? this.rollAffix('SUFFIXES', affixConfig.maxTier, fateRoll.isJackpot, rng)
      : null;

    // === 第六步：生成最终属性 ===
    const statMulti = affixConfig?.statMulti ?? 1;

    const statsResult = this.calculateFinalStats(
      archetype,
      prefix,
      suffix,
      floor,
      monsterTier,
      ascensionLevel,
      fateRoll,
      statMulti,
      rng
    );

    // === 第七步：构建装备对象 ===
    const item = this.buildItemObject(
      archetype,
      prefix,
      suffix,
      quality,
      fateRoll.iPwr,
      statsResult.baseStats, // 纯底材数值
      statsResult.finalStats, // 最终数值
      fateRoll,
      statsResult.materialMult, // 材质倍率
      rng
    );

    // 调试日志
    if (fateRoll.isJackpot || fateRoll.isLucky) {
      console.log(`🎰 ${fateRoll.isJackpot ? 'JACKPOT' : 'LUCKY'} Drop:`, item.name, `(iPwr: ${fateRoll.iPwr})`);
    }

    return item;
  }

  /**
   * 计算物品等级 (Item Power)
   * 公式：iPwr = (Floor * 6) + (MonsterBonus) + (AscensionBonus)
   * ✅ FIX: 楼层系数从 10 降低为 6，平滑掉落曲线
   */
  calculateItemPower(floor, monsterTier, ascensionLevel) {
    const floorBonus = floor * 6;
    const monsterBonus = (monsterTier - 1) * 5; // T1:0, T2:5, T3:10
    const ascensionBonus = ascensionLevel * 20;
    
    return floorBonus + monsterBonus + ascensionBonus;
  }

  /**
   * Fate Roll - 命运骰子
   * 1% Jackpot (+30 iPwr, 强制升阶)
   * 9% Lucky (+10 iPwr)
   * @param {number} baseiPwr - 基础物品等级
   * @param {SeededRandom} rng - 可选的随机数生成器
   * @returns {Object} { iPwr, isJackpot, isLucky }
   */
  rollFate(baseiPwr, rng = null) {
    const roll = rng ? rng.next() : Math.random();
    
    if (roll < 0.01) {
      // 1% Jackpot
      return {
        iPwr: baseiPwr + 30,
        isJackpot: true,
        isLucky: false
      };
    } else if (roll < 0.10) {
      // 9% Lucky (累计10%)
      return {
        iPwr: baseiPwr + 10,
        isJackpot: false,
        isLucky: true
      };
    } else {
      // 90% 正常
      return {
        iPwr: baseiPwr,
        isJackpot: false,
        isLucky: false
      };
    }
  }

  /**
   * 选择底材 (Archetype)
   * 根据职业调整权重
   * @param {string} playerClass - 玩家职业
   * @param {boolean} isJackpot - 是否为 Jackpot
   * @param {SeededRandom} rng - 可选的随机数生成器
   */
  rollArchetype(playerClass, isJackpot, rng = null) {
    const archetypes = Object.values(ARCHETYPES);
    
    // ✅ FIX: 移除强制小写转换，增加容错检查
    const targetClass = playerClass || null;
    
    // 如果有职业，调整权重
    const weightedPool = archetypes.map(arch => {
      let weight = arch.weight;
      
      if (targetClass && arch.classAffinity) {
        // 尝试直接匹配 targetClass
        let affinity = arch.classAffinity[targetClass];
        
        // 如果直接匹配失败，尝试匹配大写版本
        if (affinity === undefined && typeof targetClass === 'string') {
          affinity = arch.classAffinity[targetClass.toUpperCase()];
        }
        
        // 如果仍然失败，尝试匹配小写版本（兼容旧配置）
        if (affinity === undefined && typeof targetClass === 'string') {
          affinity = arch.classAffinity[targetClass.toLowerCase()];
        }
        
        if (affinity !== undefined) {
          weight *= affinity;
        }
      }
      
      return { ...arch, weight };
    });
    
    return weightedRandom(weightedPool, rng);
  }

  /**
   * 确定品质
   * 根据iPwr和MagicFind
   */
  determineQuality(iPwr, magicFind, isJackpot, rng = null) {
    // 1) 规范化 Magic Find（0-1 区间）
    const mf = Math.max(0, Math.min(1, magicFind || 0));

    // 2) 获取满足阈值的已解锁品质
    const unlockedQualities = [];
    const qualityKeys = Object.keys(ITEM_QUALITY); // ['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY', 'MYTHIC']

    for (const quality of qualityKeys) {
      const threshold = this.qualityThresholds[quality];
      if (threshold === undefined) continue;
      if (iPwr >= threshold) {
        unlockedQualities.push(quality);
      }
    }

    // 理论上不会为空（COMMON 阈值为 0），但做一次兜底
    if (unlockedQualities.length === 0) {
      unlockedQualities.push('COMMON');
    }

    // 3) Jackpot 强制 EPIC+：过滤掉 EPIC 以下品质
    let candidateQualities = unlockedQualities;
    if (isJackpot) {
      const highTier = ['EPIC', 'LEGENDARY', 'MYTHIC'];
      const filtered = unlockedQualities.filter(q => highTier.includes(q));

      // 如果当前 iPwr 还未解锁 EPIC+，仍然强制提供 EPIC 作为候选
      candidateQualities = filtered.length > 0 ? filtered : ['EPIC'];
    }

    // 4) 基于 ITEM_QUALITY 和 Magic Find 构建权重池
    const pool = [];
    const rarityFactor = {
      COMMON: 0,
      UNCOMMON: 1,
      RARE: 1.5,
      EPIC: 2,
      LEGENDARY: 3,
      MYTHIC: 4
    };

    for (const quality of candidateQualities) {
      const cfg = ITEM_QUALITY[quality];
      if (!cfg) continue;

      const baseWeight = cfg.weight ?? 0;
      if (baseWeight <= 0) continue;

      let weight = baseWeight;

      // 对 UNCOMMON 及以上品质应用 MF 提升概率（高稀有度放大系数更大）
      if (quality !== 'COMMON') {
        const factor = rarityFactor[quality] ?? 1;
        weight = baseWeight * (1 + mf * 2 * factor);
      }

      pool.push({
        id: quality,
        quality,
        weight
      });
    }

    // 如果权重池为空，兜底返回 COMMON
    if (pool.length === 0) {
      return 'COMMON';
    }

    // 5) 执行加权随机
    const selected = weightedRandom(pool, rng);
    return selected?.id || selected?.quality || 'COMMON';
  }

  /**
   * 生成带随机品质的消耗品
   * @param {number} floor - 当前楼层
   * @param {number} magicFind - 魔法发现（0-1）
   * @param {SeededRandom|null} rng - 可选随机数生成器
   * @returns {Object|null} 动态消耗品实例
   */
  generateConsumable(floor, magicFind, rng = null) {
    // 1. 获取所有消耗品ID（优先使用 CONSUMABLE_IDS）
    const consumableIds = (Array.isArray(CONSUMABLE_IDS) && CONSUMABLE_IDS.length > 0)
      ? CONSUMABLE_IDS
      : ['POTION_HP_S', 'POTION_RAGE', 'SCROLL_XP', 'SCROLL_FIRE'];

    if (consumableIds.length === 0) return null;

    const randomVal = rng ? rng.next() : Math.random();
    const id = consumableIds[Math.floor(randomVal * consumableIds.length)];
    const def = EQUIPMENT_DB[id];

    if (!def) return null;

    // 2. 判定品质：构造一个虚拟 iPwr 用于品质计算
    const baseiPwr = Math.max(1, floor) * 5;
    const fate = this.rollFate(baseiPwr, rng);
    const quality = this.determineQuality(fate.iPwr, magicFind || 0, fate.isJackpot, rng);

    // 3. 生成实例
    return createDynamicConsumable(def, quality);
  }

  /**
   * Roll词缀
   * @param {string} affixType - 词缀类型 ('PREFIXES' 或 'SUFFIXES')
   * @param {number} maxTier - 最大 Tier
   * @param {boolean} isJackpot - 是否为 Jackpot
   * @param {SeededRandom} rng - 可选的随机数生成器
   */
  rollAffix(affixType, maxTier, isJackpot, rng = null) {
    const availableAffixes = getAvailableAffixes(affixType, maxTier, isJackpot);
    
    if (availableAffixes.length === 0) return null;
    
    return weightedRandom(availableAffixes, rng);
  }

  /**
   * V2.0 计算最终属性
   * 新的计算公式：
   * 1. 底材数值 = ArchetypeBase * LevelMult * MaterialMult
   * 2. 前缀固定加成累加
   * 3. 后缀百分比加成累加
   * 4. 最终属性 = (底材数值 + 前缀固定值) * (1 + 后缀百分比)
   * 
   * @param {Object} archetype - 底材
   * @param {Object} prefix - 前缀
   * @param {Object} suffix - 后缀
   * @param {number} floor - 楼层
   * @param {number} monsterTier - 怪物强度 (1-3)
   * @param {number} ascensionLevel - 难度等级
   * @param {Object} fateRoll - 命运骰子结果 { iPwr, isJackpot, isLucky }
   * @param {number} statMulti - 品质属性倍率（默认1）
   * @param {SeededRandom} rng - 可选的随机数生成器
   * @returns {Object} { baseStats: 纯底材数值, finalStats: 最终数值, materialMult: 材质倍率 }
   */
  calculateFinalStats(
    archetype,
    prefix,
    suffix,
    floor,
    monsterTier,
    ascensionLevel,
    fateRoll,
    statMulti = 1,
    rng = null
  ) {
    // === 第一步：计算 LevelMult ===
    const levelMult = 1 + (floor * 0.2) + (ascensionLevel * 0.05);
    
    // === 第二步：计算 MaterialMult ===
    let materialMultMin = 0.8;
    let materialMultMax = 1.2;
    
    // 根据命运骰子调整
    if (fateRoll.isJackpot) {
      materialMultMin = 2.0;
      materialMultMax = 3.0;
    } else if (fateRoll.isLucky) {
      materialMultMin = 1.3;
      materialMultMax = 1.5;
    }
    
    // 怪物修正
    if (monsterTier >= 3) {
      materialMultMin += 0.5;
      materialMultMax += 0.5;
    } else if (monsterTier >= 2) {
      materialMultMin += 0.2;
      materialMultMax += 0.2;
    }
    
    // 随机材质倍率
    const randomValue = rng ? rng.next() : Math.random();
    const materialMult = materialMultMin + randomValue * (materialMultMax - materialMultMin);
    
    // === 第三步：计算底材数值 (FinalBase) ===
    const baseStats = {}; // 纯底材数值（不含前后缀）
    
    for (const [statKey, range] of Object.entries(archetype.baseStats)) {
      // 随机 Level 1 基准值
      const randomValue = rng ? rng.next() : Math.random();
      const level1Base = range[0] + randomValue * (range[1] - range[0]);
      
      // 应用 LevelMult 和 MaterialMult
      const finalBase = level1Base * levelMult * materialMult * statMulti;
      
      // 根据属性类型决定取整方式
      if (statKey.includes('rate') || statKey.includes('dodge') || statKey.includes('pen') || statKey.includes('gold') || statKey.includes('lifesteal')) {
        // 百分比属性保留2位小数
        baseStats[statKey] = Math.round(finalBase * 100) / 100;
      } else {
        // 整数属性向下取整
        baseStats[statKey] = Math.floor(finalBase);
      }
    }
    
    // === 第四步：计算前缀固定加成 (affixStats) ===
    const affixStats = {};
    if (prefix?.stats) {
      for (const [key, value] of Object.entries(prefix.stats)) {
        if (key === 'multiplier') continue; // 前缀倍率已废弃（V2.0不再使用）
        
        // 累加固定数值加成
        if (affixStats[key]) {
          affixStats[key] += value;
        } else {
          affixStats[key] = value;
        }
      }
    }
    
    // === 第五步：计算后缀百分比加成 (suffixMultipliers) ===
    const suffixMultipliers = {};
    if (suffix?.stats) {
      for (const [key, value] of Object.entries(suffix.stats)) {
        // 百分比加成
        if (key.endsWith('_percent')) {
          const baseKey = key.replace('_percent', '');
          if (suffixMultipliers[baseKey]) {
            suffixMultipliers[baseKey] += value; // 累加多个百分比加成
          } else {
            suffixMultipliers[baseKey] = value;
          }
        } else {
          // 固定加成（后缀也可能有固定值）
          if (affixStats[key]) {
            affixStats[key] += value;
          } else {
            affixStats[key] = value;
          }
        }
      }
    }
    
    // === 第六步：计算最终属性 ===
    // FinalStats = (FinalBase + AffixStats) * (1 + SuffixMultipliers)
    const finalStats = {};
    
    // 先复制底材数值
    for (const [key, value] of Object.entries(baseStats)) {
      finalStats[key] = value;
    }
    
    // 加上前缀固定加成
    for (const [key, value] of Object.entries(affixStats)) {
      if (finalStats[key]) {
        finalStats[key] += value;
      } else {
        finalStats[key] = value;
      }
    }
    
    // 应用后缀百分比加成
    for (const [key, multiplier] of Object.entries(suffixMultipliers)) {
      if (finalStats[key] !== undefined) {
        if (key.includes('rate') || key.includes('dodge') || key.includes('pen') || key.includes('gold') || key.includes('lifesteal')) {
          finalStats[key] = Math.round(finalStats[key] * (1 + multiplier) * 100) / 100;
        } else {
          finalStats[key] = Math.floor(finalStats[key] * (1 + multiplier));
        }
      }
    }
    
    // === 确保数值在合理范围 ===
    const clampedFinal = this.clampStats(finalStats);
    const clampedBase = {};
    for (const [key, value] of Object.entries(baseStats)) {
      if (key.includes('rate') || key.includes('dodge') || key.includes('pen') || key.includes('gold') || key.includes('lifesteal')) {
        clampedBase[key] = Math.round(value * 100) / 100;
      } else {
        clampedBase[key] = Math.floor(value);
      }
    }
    
    return {
      baseStats: clampedBase,
      finalStats: clampedFinal,
      materialMult: materialMult
    };
  }

  /**
   * 限制属性在合理范围内
   */
  clampStats(stats) {
    const clamped = { ...stats };
    
    // 攻击属性上限
    if (clamped.p_atk) clamped.p_atk = Math.min(clamped.p_atk, 500);
    if (clamped.m_atk) clamped.m_atk = Math.min(clamped.m_atk, 500);
    
    // 防御属性上限
    if (clamped.p_def) clamped.p_def = Math.min(clamped.p_def, 300);
    if (clamped.m_def) clamped.m_def = Math.min(clamped.m_def, 300);
    
    // 生命/魔法上限
    if (clamped.maxHp) clamped.maxHp = Math.min(clamped.maxHp, 1000);
    if (clamped.maxMp) clamped.maxMp = Math.min(clamped.maxMp, 500);
    
    // 百分比属性上限
    if (clamped.crit_rate) clamped.crit_rate = Math.min(clamped.crit_rate, 0.75);
    if (clamped.dodge) clamped.dodge = Math.min(clamped.dodge, 0.60);
    if (clamped.armor_pen) clamped.armor_pen = Math.min(clamped.armor_pen, 0.80);
    if (clamped.lifesteal) clamped.lifesteal = Math.min(clamped.lifesteal, 0.50);
    if (clamped.gold) clamped.gold = Math.min(clamped.gold, 2.0);
    
    return clamped;
  }

  /**
   * 构建最终装备对象 (v2.0 标准化结构)
   * @param {Object} archetype - 底材
   * @param {Object} prefix - 前缀
   * @param {Object} suffix - 后缀
   * @param {string} quality - 品质
   * @param {number} iPwr - 物品等级
   * @param {Object} baseStats - 纯底材数值（不含前后缀）
   * @param {Object} finalStats - 最终数值（含前后缀）
   * @param {Object} fateRoll - 命运骰子结果
   * @param {number} materialMult - 材质倍率
   * @param {SeededRandom} rng - 可选的随机数生成器
   */
  buildItemObject(archetype, prefix, suffix, quality, iPwr, baseStats, finalStats, fateRoll, materialMult, rng = null) {
    // 生成唯一ID
    const uid = this.generateUID(rng);
    
    // 构建名称
    const name = this.buildItemName(archetype, prefix, suffix);
    
    // 构建描述
    const description = this.buildDescription(archetype, prefix, suffix, quality, iPwr, fateRoll);
    
    // 保存前后缀的数值加成（用于BlacksmithSystem重新应用）
    const prefixStats = prefix?.stats ? { ...prefix.stats } : null;
    const suffixStats = suffix?.stats ? { ...suffix.stats } : null;
    
    // ✅ v2.0: 构建标准化的 affixes 数组（区分 prefix/suffix）
    const affixes = [];
    if (prefix) {
      affixes.push({
        type: 'prefix',
        id: prefix.id || prefix.name,
        name: prefix.name || '',
        nameZh: prefix.nameZh || prefix.name || '',
        stats: prefixStats || {}
      });
    }
    if (suffix) {
      affixes.push({
        type: 'suffix',
        id: suffix.id || suffix.name,
        name: suffix.name || '',
        nameZh: suffix.nameZh || suffix.name || '',
        stats: suffixStats || {}
      });
    }
    
    // ✅ v2.0: 计算物品等级（基于 iPwr，简化计算）
    const level = Math.max(1, Math.floor(iPwr / 10) + 1);
    
    // ✅ v2.0: 为 Legendary/Mythic 装备随机分配套装ID（20%概率）
    let setId = null;
    if ((quality === 'LEGENDARY' || quality === 'MYTHIC')) {
      const randomValue = rng ? rng.next() : Math.random();
      if (randomValue < 0.2) {
        const allSetIds = getAllSetIds();
        if (allSetIds.length > 0) {
          // 随机选择一个套装ID
          const randomIndex = rng ? rng.nextInt(0, allSetIds.length - 1) : Math.floor(Math.random() * allSetIds.length);
          setId = allSetIds[randomIndex];
        }
      }
    }
    
    // ✅ v2.0: 为 Legendary/Mythic 装备随机分配传奇特效（15%概率）
    let uniqueEffect = null;
    if (quality === 'LEGENDARY' || quality === 'MYTHIC') {
      // 15% 概率获得传奇特效
      const randomValue = rng ? rng.next() : Math.random();
      if (randomValue < 0.15) {
        // 可用的传奇特效列表
        const availableEffects = [
          {
            id: 'LIGHTNING_CHAIN',
            name: 'Lightning Chain',
            nameZh: '闪电链',
            chance: 0.2, // 20% 触发概率
            trigger: 'onHit', // 触发时机：命中时
            description: '攻击时有20%概率触发闪电链，对目标周围2格内的敌人造成50%伤害',
            descriptionZh: '攻击时有20%概率触发闪电链，对目标周围2格内的敌人造成50%伤害'
          }
          // 可以在这里添加更多传奇特效
        ];
        
        if (availableEffects.length > 0) {
          // 随机选择一个传奇特效
          const randomIndex = rng ? rng.nextInt(0, availableEffects.length - 1) : Math.floor(Math.random() * availableEffects.length);
          uniqueEffect = availableEffects[randomIndex];
        }
      }
    }
    
    // ✅ 宝石镶嵌系统：生成sockets数组
    const sockets = [];
    let socketCount = 0;
    const randomValue = rng ? rng.next() : Math.random();
    
    if (quality === 'COMMON' || quality === 'UNCOMMON') {
      // 10% 几率 1 孔
      if (randomValue < 0.10) {
        socketCount = 1;
      }
    } else if (quality === 'RARE') {
      // 30% 1 孔, 10% 2 孔
      if (randomValue < 0.10) {
        socketCount = 2;
      } else if (randomValue < 0.40) {
        socketCount = 1;
      }
    } else if (quality === 'EPIC') {
      // 50% 1-2 孔
      if (randomValue < 0.50) {
        const socketRandom = rng ? rng.next() : Math.random();
        socketCount = socketRandom < 0.5 ? 1 : 2;
      }
    } else if (quality === 'LEGENDARY' || quality === 'MYTHIC') {
      // 80% 2-3 孔
      if (randomValue < 0.80) {
        const socketRandom = rng ? rng.next() : Math.random();
        socketCount = socketRandom < 0.5 ? 2 : 3;
      }
    }
    
    // 初始化sockets数组
    for (let i = 0; i < socketCount; i++) {
      sockets.push({ status: 'EMPTY', gemId: null });
    }
    
    // ✅ v2.0: 构建标准化的 meta 对象
    const meta = {
      level, // 物品等级
      affixes, // 词缀数组（区分 prefix/suffix）
      uniqueEffect, // 传奇特效（15%概率分配给Legendary/Mythic装备）
      setId, // 套装ID（20%概率分配给Legendary/Mythic装备）
      sockets, // ✅ 宝石镶嵌系统：sockets数组
      // 保留原有元数据用于调试和BlacksmithSystem
      archetype: archetype.id,
      prefix: prefix?.name || null,
      suffix: suffix?.name || null,
      prefixStats: prefixStats,
      suffixStats: suffixStats,
      materialMult: materialMult,
      isJackpot: fateRoll.isJackpot,
      isLucky: fateRoll.isLucky
    };
    
    return {
      uid, // 唯一标识符
      id: archetype.id, // 原始模板ID（使用底材ID）
      name: name.en,
      nameZh: name.zh,
      type: archetype.type,
      quality,
      itemPower: iPwr,
      tier: this.qualityToTier(quality),
      rarity: quality, // 兼容旧系统
      stats: finalStats, // 扁平化的当前属性对象
      baseStats: baseStats, // ✅ V2.0: 保存纯底材数值（不含前后缀），供BlacksmithSystem使用
      iconIndex: archetype.iconIndex,
      description,
      meta, // ✅ v2.0: 标准化的元数据对象
      // 兼容旧系统的 itemId 字段
      itemId: archetype.id
    };
  }

  /**
   * 构建物品名称
   */
  buildItemName(archetype, prefix, suffix) {
    let enParts = [];
    let zhParts = [];
    
    // 前缀
    if (prefix) {
      enParts.push(prefix.name);
      zhParts.push(prefix.nameZh);
    }
    
    // 底材
    enParts.push(archetype.name);
    zhParts.push(archetype.nameZh);
    
    // 后缀
    if (suffix) {
      enParts.push(suffix.name);
      zhParts.push(suffix.nameZh);
    }
    
    return {
      en: enParts.join(' '),
      zh: zhParts.join('')
    };
  }

  /**
   * 生成描述
   */
  buildDescription(archetype, prefix, suffix, quality, iPwr, fateRoll) {
    let desc = `${ITEM_QUALITY[quality]?.name || quality} • iPwr ${iPwr}`;
    
    if (fateRoll.isJackpot) {
      desc += ' 🎰JACKPOT';
    } else if (fateRoll.isLucky) {
      desc += ' 🍀Lucky';
    }
    
    return desc;
  }

  /**
   * 品质转Tier（兼容旧系统）
   */
  qualityToTier(quality) {
    const mapping = {
      COMMON: 1,
      UNCOMMON: 1,
      RARE: 2,
      EPIC: 2,
      LEGENDARY: 3,
      MYTHIC: 3
    };
    return mapping[quality] || 1;
  }

  /**
   * 生成唯一ID
   * @param {SeededRandom} rng - 可选的随机数生成器
   */
  generateUID(rng = null) {
    // ✅ FIX: 在每日挑战模式下，使用 RNG 生成时间戳部分，确保确定性
    let timestampPart;
    if (rng) {
      // 使用 RNG 生成一个伪时间戳（基于种子，确保确定性）
      // 范围：1000000000-9999999999（模拟时间戳范围）
      timestampPart = Math.floor(1000000000 + rng.next() * 8999999999);
    } else {
      timestampPart = Date.now();
    }
    
    // ✅ FIX: 修复 randomPart 生成逻辑，确保在每日挑战模式下使用 RNG
    let randomPart;
    if (rng) {
      // 使用 RNG 生成一个随机整数，然后转换为36进制字符串
      // 生成9位随机字符串：使用多个随机数拼接
      const r1 = Math.floor(rng.next() * 36);
      const r2 = Math.floor(rng.next() * 36);
      const r3 = Math.floor(rng.next() * 36);
      const r4 = Math.floor(rng.next() * 36);
      const r5 = Math.floor(rng.next() * 36);
      const r6 = Math.floor(rng.next() * 36);
      const r7 = Math.floor(rng.next() * 36);
      const r8 = Math.floor(rng.next() * 36);
      const r9 = Math.floor(rng.next() * 36);
      randomPart = [r1, r2, r3, r4, r5, r6, r7, r8, r9].map(n => n.toString(36)).join('');
    } else {
      randomPart = Math.random().toString(36).substr(2, 9);
    }
    return `PROCGEN_${timestampPart}_${randomPart}`;
  }
}

// 导出单例
export const lootGenerator = new LootGenerator();
// ✅ FIX: 立即将单例注册到全局对象，确保其他模块（如 items.js）可以通过 window.__lootGenerator 访问
// 这解决了 getEquipmentDropForFloor 中可能出现的 Race Condition 问题
if (typeof window !== 'undefined') {
  window.__lootGenerator = lootGenerator;
}

/**
 * 便捷生成函数
 * @param {number} floor - 楼层
 * @param {Object} options - 额外选项
 */
export function generateLoot(floor, options = {}) {
  return lootGenerator.generate({
    floor,
    ...options
  });
}

/**
 * 便捷生成消耗品函数
 * @param {number} floor - 楼层
 * @param {Object} options - 额外选项
 * @param {number} options.magicFind - 魔法发现（0-1）
 * @param {SeededRandom} options.rng - 随机数生成器
 */
export function generateConsumableLoot(floor, options = {}) {
  const { magicFind = 0, rng = null } = options;
  return lootGenerator.generateConsumable(floor, magicFind, rng);
}

