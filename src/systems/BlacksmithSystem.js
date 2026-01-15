// BlacksmithSystem.js - 铁匠系统
// 负责装备强化和重铸逻辑

import { ITEM_QUALITY, FORGE_CONFIG, EQUIPMENT_DB } from '../constants.js';
import { createStandardizedItem } from '../data/items.js';

/**
 * BlacksmithSystem - 铁匠系统
 * 提供装备强化和品质重铸功能
 */
export class BlacksmithSystem {
  constructor() {
    console.log('✓ BlacksmithSystem 已初始化');
  }

  /**
   * 计算强化费用
   * @param {Object} item - 装备对象
   * @returns {number} 强化费用
   */
  calculateEnhanceCost(item) {
    if (!item) return 0;
    
    const currentLevel = item.enhanceLevel || 0;
    const baseCost = FORGE_CONFIG.ENHANCE.BASE_COST;
    const multiplier = FORGE_CONFIG.ENHANCE.COST_MULTIPLIER;
    
    // 费用公式: 基础费用 * (当前等级 + 1) * 倍率^当前等级
    return Math.floor(baseCost * (currentLevel + 1) * Math.pow(multiplier, currentLevel));
  }

  /**
   * 强化装备
   * @param {Object} item - 装备对象
   * @param {Object} player - 玩家对象
   * @returns {Object} 结果对象 { success: boolean, message: string, item: Object }
   */
  enhanceItem(item, player) {
    if (!item || !player) {
      return { success: false, message: '无效的装备或玩家', item: null };
    }

    // 检查是否是可强化的装备
    if (item.type === 'CONSUMABLE') {
      return { success: false, message: '消耗品无法强化', item: null };
    }

    // 初始化强化等级
    if (!item.enhanceLevel) {
      item.enhanceLevel = 0;
    }

    // 检查是否达到最大等级
    if (item.enhanceLevel >= FORGE_CONFIG.ENHANCE.MAX_LEVEL) {
      return { success: false, message: `已达到最大强化等级 +${FORGE_CONFIG.ENHANCE.MAX_LEVEL}`, item: null };
    }

    // 计算费用
    const cost = this.calculateEnhanceCost(item);

    // 检查金币是否足够
    if (player.stats.gold < cost) {
      return { success: false, message: `金币不足！需要 ${cost} 金币`, item: null };
    }

    // 扣除金币
    player.stats.gold -= cost;

    // 强化成功（暂时100%成功率）
    item.enhanceLevel += 1;

    // 更新装备名称（添加 +X）
    this.updateItemName(item);

    // 重新计算属性
    this.recalculateStats(item);

    return {
      success: true,
      message: `强化成功！${this.getItemDisplayName(item)} 现在是 +${item.enhanceLevel}`,
      item: item
    };
  }

  /**
   * 计算重铸费用
   * @param {Object} item - 装备对象
   * @returns {number} 重铸费用
   */
  calculateReforgeCost(item) {
    if (!item) return 0;
    
    const baseCost = FORGE_CONFIG.REFORGE.BASE_COST;
    const tier = item.tier || 1;
    const multiplier = FORGE_CONFIG.REFORGE.COST_MULTIPLIER;
    
    // 费用公式: 基础费用 * 装备等级 * 倍率
    return Math.floor(baseCost * tier * multiplier);
  }

  /**
   * 重铸装备品质
   * @param {Object} item - 装备对象
   * @param {Object} player - 玩家对象
   * @returns {Object} 结果对象 { success: boolean, message: string, item: Object, oldQuality: string, newQuality: string }
   */
  reforgeItem(item, player) {
    if (!item || !player) {
      return { success: false, message: '无效的装备或玩家', item: null };
    }

    // 检查是否是可重铸的装备
    if (item.type === 'CONSUMABLE') {
      return { success: false, message: '消耗品无法重铸', item: null };
    }

    // 计算费用
    const cost = this.calculateReforgeCost(item);

    // 检查金币是否足够
    if (player.stats.gold < cost) {
      return { success: false, message: `金币不足！需要 ${cost} 金币`, item: null };
    }

    // 扣除金币
    player.stats.gold -= cost;

    // 保存旧品质
    const oldQuality = item.quality || 'COMMON';

    // 随机新品质（加权随机）
    const newQuality = this.rollQuality();
    item.quality = newQuality;

    // ✅ FIX: 重铸不再修改 baseStats，只修改 quality 和 tier
    // baseStats 永远保持创建时的初始值（通常是 Common 或者是掉落时的原始值）
    // 重铸只影响最终计算结果，不修改存档数据
    // 品质倍率将在 recalculateDynamicItemStats 中动态计算

    // 更新 Tier（根据新品质）
    if (['LEGENDARY', 'MYTHIC'].includes(newQuality)) {
      item.tier = 3;
    } else if (['RARE', 'EPIC'].includes(newQuality)) {
      item.tier = 2;
    } else {
      item.tier = 1;
    }

    // 重新计算属性
    this.recalculateStats(item);

    // 更新装备名称
    this.updateItemName(item);

    const qualityUpgrade = this.compareQuality(oldQuality, newQuality);
    let message = '';
    
    if (qualityUpgrade > 0) {
      message = `重铸成功！品质提升为 ${ITEM_QUALITY[newQuality].name}！`;
    } else if (qualityUpgrade < 0) {
      message = `重铸完成，品质降低为 ${ITEM_QUALITY[newQuality].name}...`;
    } else {
      message = `重铸完成，品质保持 ${ITEM_QUALITY[newQuality].name}`;
    }

    return {
      success: true,
      message: message,
      item: item,
      oldQuality: oldQuality,
      newQuality: newQuality
    };
  }

  /**
   * 加权随机选择品质
   * @returns {string} 品质ID
   */
  rollQuality() {
    const qualities = Object.values(ITEM_QUALITY);
    const totalWeight = qualities.reduce((sum, q) => sum + q.weight, 0);
    
    let random = Math.random() * totalWeight;
    
    for (const quality of qualities) {
      random -= quality.weight;
      if (random <= 0) {
        return quality.id;
      }
    }
    
    // 默认返回普通品质
    return 'COMMON';
  }

  /**
   * 比较品质等级
   * @param {string} quality1 - 品质1
   * @param {string} quality2 - 品质2
   * @returns {number} 1: quality2更高, -1: quality2更低, 0: 相同
   */
  compareQuality(quality1, quality2) {
    const qualityOrder = ['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY', 'MYTHIC'];
    const index1 = qualityOrder.indexOf(quality1);
    const index2 = qualityOrder.indexOf(quality2);
    
    if (index2 > index1) return 1;
    if (index2 < index1) return -1;
    return 0;
  }

  /**
   * 重新计算装备属性
   * @param {Object} item - 装备对象
   */
  recalculateStats(item) {
    if (!item) return;
    
    // ✅ FIX: 检查是否为动态生成的装备（通过meta或uid判断）
    const isDynamicItem = item.meta || (item.uid && item.uid.startsWith('PROCGEN_'));
    
    if (isDynamicItem) {
      // 动态装备：保留前后缀加成
      this.recalculateDynamicItemStats(item);
    } else {
      // 静态装备：使用原有逻辑
      this.recalculateStaticItemStats(item);
    }
  }
  
  /**
   * V2.0 重新计算动态装备属性（强化只提升底材）
   * @param {Object} item - 动态生成的装备对象
   */
  recalculateDynamicItemStats(item) {
    if (!item.baseStats) {
      // 如果没有基础属性，保存当前属性作为基础属性
      if (item.stats) {
        item.baseStats = { ...item.stats };
      }
      return;
    }
    
    // ✅ CRITICAL FIX: baseStats 应该永远保持为 Common 品质的原始底材数值（+0 强化等级）
    // 重铸时不再修改 baseStats，而是通过品质倍率动态计算最终属性
    // 这样可以避免属性降级问题：Legendary -> Common -> Legendary 不会导致属性损失
    
    // 第一步：读取底材（baseStats 应该是 Common 品质的原始值）
    const base = { ...item.baseStats };
    
    // ✅ FIX: 第二步：先应用品质倍率（重铸不再修改 baseStats，而是通过品质倍率动态计算）
    const quality = item.quality || 'COMMON';
    const qualityMultiplier = ITEM_QUALITY[quality]?.multiplier || 1.0;
    
    const qualityAdjustedBase = {};
    for (const [stat, value] of Object.entries(base)) {
      if (stat.includes('rate') || stat.includes('dodge') || stat.includes('pen') || stat.includes('gold') || stat.includes('lifesteal')) {
        // 百分比属性保留2位小数
        qualityAdjustedBase[stat] = Math.round(value * qualityMultiplier * 100) / 100;
      } else {
        // 整数属性向下取整
        qualityAdjustedBase[stat] = Math.floor(value * qualityMultiplier);
      }
    }
    
    // ✅ FIX: 第三步：应用强化倍率（+10% per level）
    const enhanceLevel = item.enhanceLevel || 0;
    const enhanceMultiplier = 1 + (enhanceLevel * 0.1); // +10% per level
    
    const enhancedBase = {};
    for (const [stat, value] of Object.entries(qualityAdjustedBase)) {
      if (stat.includes('rate') || stat.includes('dodge') || stat.includes('pen') || stat.includes('gold') || stat.includes('lifesteal')) {
        // 百分比属性保留2位小数
        enhancedBase[stat] = Math.round(value * enhanceMultiplier * 100) / 100;
      } else {
        // 整数属性向下取整
        enhancedBase[stat] = Math.floor(value * enhanceMultiplier);
      }
    }
    
    // 第四步：重新应用前缀固定加成
    const prefixStats = item.meta?.prefixStats;
    if (prefixStats) {
      for (const [key, value] of Object.entries(prefixStats)) {
        if (key === 'multiplier') continue; // V2.0 不再使用前缀倍率
        
        // 累加固定数值加成
        if (enhancedBase[key]) {
          enhancedBase[key] += value;
        } else {
          enhancedBase[key] = value;
        }
      }
    }
    
    // 第五步：重新应用后缀百分比加成
    const suffixStats = item.meta?.suffixStats;
    if (suffixStats) {
      for (const [key, value] of Object.entries(suffixStats)) {
        // 百分比加成
        if (key.endsWith('_percent')) {
          const baseKey = key.replace('_percent', '');
          if (enhancedBase[baseKey] !== undefined) {
            if (baseKey.includes('rate') || baseKey.includes('dodge') || baseKey.includes('pen') || baseKey.includes('gold') || baseKey.includes('lifesteal')) {
              enhancedBase[baseKey] = Math.round(enhancedBase[baseKey] * (1 + value) * 100) / 100;
            } else {
              enhancedBase[baseKey] = Math.floor(enhancedBase[baseKey] * (1 + value));
            }
          }
        } else {
          // 固定加成（后缀也可能有固定值）
          if (enhancedBase[key]) {
            enhancedBase[key] += value;
          } else {
            enhancedBase[key] = value;
          }
        }
      }
    }
    
    // ✅ CRITICAL FIX: 第六步：应用宝石属性加成
    // 宝石属性在品质倍率和强化倍率之后应用，提供固定数值加成（不参与倍率计算）
    if (item.meta && item.meta.sockets) {
      item.meta.sockets.forEach(socket => {
        if (socket.status === 'FILLED' && socket.gemId) {
          const gemDef = EQUIPMENT_DB[socket.gemId];
          if (gemDef && gemDef.gemEffects) {
            // 判断是武器还是防具/饰品
            const effectType = item.type === 'WEAPON' ? 'weapon' : 'armor';
            const effects = gemDef.gemEffects[effectType];
            
            if (effects) {
              for (const [key, val] of Object.entries(effects)) {
                if (key === 'infuseElement') continue; // 跳过非数值属性
                
                // 初始化或累加
                if (enhancedBase[key] === undefined) {
                  enhancedBase[key] = 0;
                }
                
                // 累加属性值
                if (typeof val === 'number' && !isNaN(val)) {
                  // 处理百分比属性（crit_rate, dodge, lifesteal 等）
                  if (key.includes('rate') || key.includes('dodge') || key.includes('pen') || key.includes('gold') || key.includes('lifesteal')) {
                    // 百分比属性保留2位小数
                    enhancedBase[key] = Math.round((enhancedBase[key] + val) * 100) / 100;
                  } else {
                    // 整数属性向下取整后累加
                    enhancedBase[key] = Math.floor(enhancedBase[key] + val);
                  }
                }
              }
            }
          }
        }
      });
    }
    
    // 第七步：更新最终属性（不修改 baseStats）
    item.stats = enhancedBase;
  }
  
  /**
   * 重新计算静态装备属性（原有逻辑）
   * @param {Object} item - 静态装备对象
   */
  recalculateStaticItemStats(item) {
    if (!item.baseStats) {
      // 如果没有基础属性，保存当前属性作为基础属性
      if (item.stats) {
        item.baseStats = { ...item.stats };
      }
      return;
    }
    
    // ✅ CRITICAL FIX: baseStats 应该永远保持为 Common 品质的原始数值
    // 重铸时不再修改 baseStats，而是通过品质倍率动态计算最终属性
    
    // 获取品质倍率
    const quality = item.quality || 'COMMON';
    const qualityMultiplier = ITEM_QUALITY[quality]?.multiplier || 1.0;
    
    // 获取强化等级倍率
    const enhanceLevel = item.enhanceLevel || 0;
    const enhanceMultiplier = 1 + (enhanceLevel * FORGE_CONFIG.ENHANCE.STAT_INCREASE);
    
    // 计算最终属性（品质倍率 × 强化倍率）
    item.stats = {};
    for (const [stat, value] of Object.entries(item.baseStats)) {
      if (stat.includes('rate') || stat.includes('dodge') || stat.includes('pen') || stat.includes('gold') || stat.includes('lifesteal')) {
        // 百分比属性保留2位小数
        item.stats[stat] = Math.round(value * qualityMultiplier * enhanceMultiplier * 100) / 100;
      } else {
        // 整数属性向下取整
        item.stats[stat] = Math.floor(value * qualityMultiplier * enhanceMultiplier);
      }
    }
    
    // ✅ CRITICAL FIX: 应用宝石属性加成
    // 宝石属性在品质倍率和强化倍率之后应用，提供固定数值加成（不参与倍率计算）
    if (item.meta && item.meta.sockets) {
      item.meta.sockets.forEach(socket => {
        if (socket.status === 'FILLED' && socket.gemId) {
          const gemDef = EQUIPMENT_DB[socket.gemId];
          if (gemDef && gemDef.gemEffects) {
            // 判断是武器还是防具/饰品
            // 如果是 WEAPON，使用 gemEffects.weapon
            // 如果是 ARMOR, HELM, BOOTS, RING, AMULET 等，使用 gemEffects.armor
            const effectType = item.type === 'WEAPON' ? 'weapon' : 'armor';
            const effects = gemDef.gemEffects[effectType];
            
            if (effects) {
              for (const [key, val] of Object.entries(effects)) {
                if (key === 'infuseElement') continue; // 跳过非数值属性
                
                // 初始化或累加
                if (item.stats[key] === undefined) {
                  item.stats[key] = 0;
                }
                
                // 累加属性值
                if (typeof val === 'number' && !isNaN(val)) {
                  // 处理百分比属性（crit_rate, dodge, lifesteal 等）
                  if (key.includes('rate') || key.includes('dodge') || key.includes('pen') || key.includes('gold') || key.includes('lifesteal')) {
                    // 百分比属性保留2位小数
                    item.stats[key] = Math.round((item.stats[key] + val) * 100) / 100;
                  } else {
                    // 整数属性向下取整后累加
                    item.stats[key] = Math.floor(item.stats[key] + val);
                  }
                }
              }
            }
          }
        }
      });
    }
  }

  /**
   * 更新装备名称（添加品质和强化等级）
   * @param {Object} item - 装备对象
   */
  updateItemName(item) {
    if (!item) return;

    // 获取基础名称
    const baseName = item.nameZh || item.name || '未知装备';
    
    // 获取品质前缀
    const quality = item.quality || 'COMMON';
    const qualityName = ITEM_QUALITY[quality]?.name || '';
    
    // 获取强化等级后缀
    const enhanceLevel = item.enhanceLevel || 0;
    const enhanceSuffix = enhanceLevel > 0 ? ` +${enhanceLevel}` : '';
    
    // 组合显示名称
    item.displayName = `${qualityName} ${baseName}${enhanceSuffix}`;
  }

  /**
   * 获取装备显示名称
   * @param {Object} item - 装备对象
   * @returns {string} 显示名称
   */
  getItemDisplayName(item) {
    if (!item) return '未知装备';
    
    if (item.displayName) {
      return item.displayName;
    }
    
    // 如果没有显示名称，生成一个
    this.updateItemName(item);
    return item.displayName || item.nameZh || item.name || '未知装备';
  }

  /**
   * 获取装备品质颜色
   * @param {Object} item - 装备对象
   * @returns {string} 颜色代码
   */
  getItemQualityColor(item) {
    if (!item) return '#ffffff';
    
    const quality = item.quality || 'COMMON';
    return ITEM_QUALITY[quality]?.color || '#ffffff';
  }

  /**
   * 初始化装备（为旧装备添加品质和基础属性）
   * @param {Object} item - 装备对象
   * @returns {Object} 初始化后的装备
   */
  initializeItem(item) {
    if (!item) return null;

    // 如果已经初始化过，直接返回
    if (item.baseStats && item.quality) {
      return item;
    }

    // 保存基础属性
    if (item.stats && !item.baseStats) {
      item.baseStats = { ...item.stats };
    }

    // 设置默认品质
    if (!item.quality) {
      item.quality = 'COMMON';
    }

    // 设置默认强化等级
    if (item.enhanceLevel === undefined) {
      item.enhanceLevel = 0;
    }

    // 重新计算属性
    this.recalculateStats(item);

    // 更新名称
    this.updateItemName(item);

    return item;
  }

  /**
   * 获取装备详细信息（用于UI显示）
   * @param {Object} item - 装备对象
   * @returns {Object} 详细信息对象
   */
  getItemDetails(item) {
    if (!item) return null;

    const quality = item.quality || 'COMMON';
    const qualityInfo = ITEM_QUALITY[quality];
    const enhanceLevel = item.enhanceLevel || 0;

    return {
      name: this.getItemDisplayName(item),
      baseName: item.nameZh || item.name,
      quality: qualityInfo.name,
      qualityColor: qualityInfo.color,
      enhanceLevel: enhanceLevel,
      stats: item.stats || {},
      baseStats: item.baseStats || {},
      enhanceCost: this.calculateEnhanceCost(item),
      reforgeCost: this.calculateReforgeCost(item),
      dismantleValue: this.calculateDismantleValue(item),
      canEnhance: enhanceLevel < FORGE_CONFIG.ENHANCE.MAX_LEVEL,
      maxLevel: FORGE_CONFIG.ENHANCE.MAX_LEVEL
    };
  }

  /**
   * 计算装备强化所累积消耗的总金币数
   * @param {Object} item - 装备对象
   * @returns {number} 累积消耗的总金币数
   */
  calculateTotalInvestedGold(item) {
    if (!item) return 0;
    
    const enhanceLevel = item.enhanceLevel || 0;
    if (enhanceLevel === 0) return 0;
    
    let totalCost = 0;
    // 遍历 0 到 enhanceLevel - 1，累加每级的强化费用
    for (let level = 0; level < enhanceLevel; level++) {
      // 创建临时对象以计算该等级的费用，避免修改原始对象
      const tempItem = { ...item, enhanceLevel: level };
      totalCost += this.calculateEnhanceCost(tempItem);
    }
    
    return totalCost;
  }

  /**
   * 计算装备分解价值
   * @param {Object} item - 装备对象
   * @returns {number} 分解价值（金币）
   */
  calculateDismantleValue(item) {
    if (!item) return 0;
    
    const config = FORGE_CONFIG.DISMANTLE;
    const baseValue = config.BASE_VALUE;
    const tier = item.tier || 1;
    const quality = item.quality || 'COMMON';
    const qualityMultiplier = config.QUALITY_MULTIPLIERS[quality] || 1.0;
    
    // 计算基础价值
    const baseItemValue = baseValue * tier * qualityMultiplier;
    
    // 计算累积投入的强化费用
    const totalInvested = this.calculateTotalInvestedGold(item);
    const refundAmount = totalInvested * config.REFUND_RATE;
    
    // 最终分解价值 = 基础价值 + 返还的强化费用
    return Math.floor(baseItemValue + refundAmount);
  }

  /**
   * 镶嵌宝石
   * @param {Object} item - 装备对象
   * @param {number} socketIndex - 孔位索引
   * @param {Object} gemItem - 宝石物品对象
   * @param {Object} player - 玩家对象
   * @returns {Object} 结果对象 { success: boolean, message: string }
   */
  socketGem(item, socketIndex, gemItem, player) {
    if (!item || !gemItem || !player) {
      return { success: false, message: '无效的装备、宝石或玩家' };
    }

    // 检查装备是否有 sockets
    if (!item.meta) {
      item.meta = {};
    }
    if (!item.meta.sockets || !Array.isArray(item.meta.sockets)) {
      return { success: false, message: '该装备没有镶嵌槽' };
    }

    // 检查 socketIndex 是否有效
    if (socketIndex < 0 || socketIndex >= item.meta.sockets.length) {
      return { success: false, message: '无效的孔位索引' };
    }

    // 检查孔位是否为空
    const socket = item.meta.sockets[socketIndex];
    if (socket.status === 'FILLED') {
      return { success: false, message: '该孔位已被占用' };
    }

    // 检查宝石是否在背包中
    const inventory = player.inventory || [];
    const gemIndex = inventory.findIndex(invItem => 
      invItem === gemItem || 
      (invItem && invItem.uid && gemItem.uid && invItem.uid === gemItem.uid)
    );

    if (gemIndex === -1) {
      return { success: false, message: '宝石不在背包中' };
    }

    // 检查宝石类型
    if (gemItem.type !== 'GEM') {
      return { success: false, message: '只能镶嵌宝石' };
    }

    // 执行镶嵌
    socket.status = 'FILLED';
    socket.gemId = gemItem.itemId || gemItem.id;

    // 从背包移除宝石
    inventory[gemIndex] = null;

    // ✅ FIX: 重新计算装备属性（应用宝石加成）
    this.recalculateStats(item);

    const gemName = gemItem.nameZh || gemItem.name || '宝石';
    const itemName = this.getItemDisplayName(item);

    return {
      success: true,
      message: `成功将 ${gemName} 镶嵌到 ${itemName} 的槽位 ${socketIndex + 1}`
    };
  }

  /**
   * 拆除宝石
   * @param {Object} item - 装备对象
   * @param {number} socketIndex - 孔位索引
   * @param {Object} player - 玩家对象
   * @param {number} cost - 拆除费用（默认200金币）
   * @returns {Object} 结果对象 { success: boolean, message: string }
   */
  unsocketGem(item, socketIndex, player, cost = 200) {
    if (!item || !player) {
      return { success: false, message: '无效的装备或玩家' };
    }

    // 检查装备是否有 sockets
    if (!item.meta || !item.meta.sockets || !Array.isArray(item.meta.sockets)) {
      return { success: false, message: '该装备没有镶嵌槽' };
    }

    // 检查 socketIndex 是否有效
    if (socketIndex < 0 || socketIndex >= item.meta.sockets.length) {
      return { success: false, message: '无效的孔位索引' };
    }

    // 检查孔位是否有宝石
    const socket = item.meta.sockets[socketIndex];
    if (socket.status !== 'FILLED' || !socket.gemId) {
      return { success: false, message: '该孔位没有宝石' };
    }

    // 检查金币是否足够
    if (player.stats.gold < cost) {
      return { success: false, message: `金币不足！需要 ${cost} 金币` };
    }

    // 保存宝石ID（在清空前）
    const gemId = socket.gemId;
    
    // 从数据库获取宝石数据
    const gemDef = EQUIPMENT_DB[gemId];
    
    if (!gemDef) {
      return { success: false, message: '无法找到宝石数据' };
    }
    
    // ✅ FIX: 使用 createStandardizedItem 创建标准物品对象，确保结构完整
    // 这样可以确保宝石对象具有所有必需的字段（如 meta 等），避免后续处理时出错
    // 注意：createStandardizedItem 会生成新的 uid，避免与原有宝石实例冲突
    const gemItem = createStandardizedItem(gemDef, {
      level: 1,
      affixes: [],
      uniqueEffect: null,
      setId: null,
      sockets: null // 宝石不需要sockets
    });
    
    // 尝试将宝石添加到背包
    const inventory = player.inventory || [];
    const emptySlot = inventory.findIndex(slot => slot === null);
    
    if (emptySlot === -1) {
      return { success: false, message: '背包已满，无法拆除宝石' };
    }
    
    // 扣除金币
    player.stats.gold -= cost;

    // 清空孔位
    socket.status = 'EMPTY';
    socket.gemId = null;
    
    // 将宝石添加到背包
    inventory[emptySlot] = gemItem;

    // ✅ FIX: 重新计算装备属性（移除宝石加成）
    this.recalculateStats(item);

    const itemName = this.getItemDisplayName(item);
    const gemName = gemDef.nameZh || gemDef.name || '宝石';

    return {
      success: true,
      message: `成功从 ${itemName} 拆除宝石，已返还背包`
    };
  }

  /**
   * 分解装备
   * @param {Object} item - 装备对象
   * @param {Object} player - 玩家对象
   * @returns {Object} 结果对象 { success: boolean, message: string, value: number }
   */
  dismantleItem(item, player) {
    if (!item || !player) {
      return { success: false, message: '无效的装备或玩家', value: 0 };
    }

    // 检查是否是可分解的装备
    if (item.type === 'CONSUMABLE') {
      return { success: false, message: '消耗品无法分解', value: 0 };
    }

    // 计算分解价值
    const value = this.calculateDismantleValue(item);
    
    // 增加玩家金币
    player.stats.gold = (player.stats.gold || 0) + value;
    
    // 移除物品
    // 检查是否在装备槽中
    const equipment = player.equipment || {};
    let removedFromEquipment = false;
    let removedSlot = null;
    
    for (const [slot, equippedItem] of Object.entries(equipment)) {
      if (equippedItem === item || 
          (typeof equippedItem === 'object' && equippedItem.uid && item.uid && equippedItem.uid === item.uid) ||
          (typeof equippedItem === 'object' && equippedItem.itemId && item.itemId && equippedItem.itemId === item.itemId)) {
        equipment[slot] = null;
        removedFromEquipment = true;
        removedSlot = slot;
        break;
      }
    }
    
    // 如果不在装备槽中，检查背包
    if (!removedFromEquipment && player.inventory) {
      const inventory = player.inventory;
      for (let i = 0; i < inventory.length; i++) {
        const invItem = inventory[i];
        if (invItem === item ||
            (typeof invItem === 'object' && invItem.uid && item.uid && invItem.uid === item.uid) ||
            (typeof invItem === 'object' && invItem.itemId && item.itemId && invItem.itemId === item.itemId)) {
          inventory[i] = null;
          break;
        }
      }
    }
    
    const itemName = this.getItemDisplayName(item);
    return {
      success: true,
      message: `成功分解 ${itemName}，获得 ${value} 金币`,
      value: value
    };
  }
}

