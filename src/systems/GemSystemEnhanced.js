/**
 * GemSystemEnhanced - 增强宝石系统
 * 
 * 扩展现有宝石系统，添加品质、融合和套装效果
 */

import { FORGE_CONFIG } from '../constants.js';

export class GemSystemEnhanced {
  constructor() {
    // 宝石品质倍率
    this.GEM_QUALITY_MULTIPLIERS = FORGE_CONFIG.GEM_ENHANCED?.QUALITY_MULTIPLIERS || {
      normal: 1.0,
      fine: 1.5,
      perfect: 2.0
    };
    
    // 宝石融合配置
    this.GEM_FUSION_CONFIG = FORGE_CONFIG.GEM_ENHANCED?.FUSION_CONFIG || {
      normal: { canFuse: true, result: 'fine', successRate: 1.0 },
      fine: { canFuse: true, result: 'perfect', successRate: 1.0 },
      perfect: { canFuse: false }
    };
    
    // 宝石提取费用
    this.GEM_EXTRACTION_COST = FORGE_CONFIG.GEM_ENHANCED?.EXTRACTION_COST || {
      normal: 1000,
      fine: 5000,
      perfect: 20000
    };
    
    // 宝石系列定义
    this.GEM_SERIES = FORGE_CONFIG.GEM_ENHANCED?.SERIES || {
      fire: ['ruby', 'fire_opal', 'sunstone'],
      ice: ['sapphire', 'aquamarine', 'moonstone'],
      lightning: ['topaz', 'citrine', 'amber'],
      nature: ['emerald', 'jade', 'peridot']
    };
    
    // 宝石套装加成
    this.GEM_SET_BONUSES = FORGE_CONFIG.GEM_ENHANCED?.SET_BONUSES || {
      2: { bonus: 0.10, effect: 'minor' },
      3: { bonus: 0.25, effect: 'major' },
      4: { bonus: 0.50, effect: 'ultimate' }
    };
    
    // 系列效果描述
    this.SERIES_EFFECTS = {
      fire: {
        minor: '攻击有10%几率造成灼烧',
        major: '灼烧伤害+50%，持续时间+2秒',
        ultimate: '灼烧效果扩散到附近敌人'
      },
      ice: {
        minor: '攻击有10%几率造成减速',
        major: '减速效果+50%，移动速度-30%',
        ultimate: '被减速的敌人可被冰冻'
      },
      lightning: {
        minor: '攻击有10%几率造成麻痹',
        major: '麻痹持续时间+50%，伤害+30%',
        ultimate: '麻痹效果可连锁传递'
      },
      nature: {
        minor: '攻击有10%几率恢复生命',
        major: '生命恢复+50%，每秒回复1%生命',
        ultimate: '击杀敌人时恢复20%最大生命'
      }
    };
    
    console.log('✓ GemSystemEnhanced 已初始化');
  }
  
  /**
   * 融合两个相同的宝石以提升品质
   * @param {Object} gem1 - 宝石1
   * @param {Object} gem2 - 宝石2
   * @param {Object} player - 玩家对象
   * @returns {Object} 融合结果
   */
  fuseGems(gem1, gem2, player) {
    if (!gem1 || !gem2 || !player) {
      return {
        success: false,
        message: '无效的宝石或玩家',
        newGem: null
      };
    }
    
    // 检查宝石是否相同类型
    const gem1Id = gem1.itemId || gem1.id;
    const gem2Id = gem2.itemId || gem2.id;
    
    if (gem1Id !== gem2Id) {
      return {
        success: false,
        message: '只能融合相同类型的宝石',
        newGem: null
      };
    }
    
    // 获取宝石品质
    const quality1 = gem1.gemQuality || 'normal';
    const quality2 = gem2.gemQuality || 'normal';
    
    if (quality1 !== quality2) {
      return {
        success: false,
        message: '只能融合相同品质的宝石',
        newGem: null
      };
    }
    
    // 检查是否可以融合
    const fusionConfig = this.GEM_FUSION_CONFIG[quality1];
    if (!fusionConfig || !fusionConfig.canFuse) {
      return {
        success: false,
        message: '该品质的宝石无法继续融合',
        newGem: null
      };
    }
    
    // 从背包移除两个宝石
    const inventory = player.inventory || [];
    let removed = 0;
    
    for (let i = 0; i < inventory.length && removed < 2; i++) {
      const item = inventory[i];
      if (!item) continue;
      
      const itemId = item.itemId || item.id;
      const itemQuality = item.gemQuality || 'normal';
      
      if (itemId === gem1Id && itemQuality === quality1) {
        inventory[i] = null;
        removed++;
      }
    }
    
    if (removed < 2) {
      return {
        success: false,
        message: '背包中没有足够的宝石',
        newGem: null
      };
    }
    
    // 创建新品质的宝石
    const newQuality = fusionConfig.result;
    const newGem = {
      ...gem1,
      gemQuality: newQuality,
      uid: `GEM_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
    
    // 添加到背包
    const emptyIndex = inventory.findIndex(slot => slot === null);
    if (emptyIndex !== -1) {
      inventory[emptyIndex] = newGem;
    } else {
      return {
        success: false,
        message: '背包已满，无法放置融合后的宝石',
        newGem: null
      };
    }
    
    const gemName = gem1.nameZh || gem1.name || '宝石';
    const qualityNames = {
      normal: '普通',
      fine: '精良',
      perfect: '完美'
    };
    
    return {
      success: true,
      message: `成功融合！获得了${qualityNames[newQuality]}品质的${gemName}`,
      newGem: newGem,
      previousQuality: quality1,
      newQuality: newQuality
    };
  }
  
  /**
   * 从装备中提取宝石（付费，不破坏）
   * @param {Object} equipment - 装备对象
   * @param {number} socketIndex - 孔位索引
   * @param {Object} player - 玩家对象
   * @returns {Object} 提取结果
   */
  extractGem(equipment, socketIndex, player) {
    if (!equipment || !player) {
      return {
        success: false,
        message: '无效的装备或玩家',
        gem: null
      };
    }
    
    // 检查孔位
    if (!equipment.meta || !equipment.meta.sockets || !Array.isArray(equipment.meta.sockets)) {
      return {
        success: false,
        message: '该装备没有镶嵌槽',
        gem: null
      };
    }
    
    if (socketIndex < 0 || socketIndex >= equipment.meta.sockets.length) {
      return {
        success: false,
        message: '无效的孔位索引',
        gem: null
      };
    }
    
    const socket = equipment.meta.sockets[socketIndex];
    if (socket.status !== 'FILLED' || !socket.gemId) {
      return {
        success: false,
        message: '该孔位没有宝石',
        gem: null
      };
    }
    
    // 获取宝石数据
    const EQUIPMENT_DB = require('../constants.js').EQUIPMENT_DB;
    const gemDef = EQUIPMENT_DB[socket.gemId];
    
    if (!gemDef) {
      return {
        success: false,
        message: '无法找到宝石数据',
        gem: null
      };
    }
    
    // 获取宝石品质（如果有）
    const gemQuality = socket.gemQuality || 'normal';
    
    // 计算提取费用
    const extractionCost = this.GEM_EXTRACTION_COST[gemQuality] || 1000;
    
    // 检查金币
    if (player.stats.gold < extractionCost) {
      return {
        success: false,
        message: `金币不足！需要 ${extractionCost} 金币`,
        gem: null
      };
    }
    
    // 扣除金币
    player.stats.gold -= extractionCost;
    
    // 创建宝石物品
    const createStandardizedItem = require('../data/items.js').createStandardizedItem;
    const gemItem = createStandardizedItem(gemDef, {
      level: 1,
      affixes: [],
      uniqueEffect: null,
      setId: null,
      sockets: null
    });
    
    // 设置宝石品质
    gemItem.gemQuality = gemQuality;
    
    // 添加到背包
    const inventory = player.inventory || [];
    const emptyIndex = inventory.findIndex(slot => slot === null);
    
    if (emptyIndex === -1) {
      // 退还金币
      player.stats.gold += extractionCost;
      return {
        success: false,
        message: '背包已满，无法提取宝石',
        gem: null
      };
    }
    
    inventory[emptyIndex] = gemItem;
    
    // 清空孔位
    socket.status = 'EMPTY';
    socket.gemId = null;
    socket.gemQuality = null;
    
    const gemName = gemDef.nameZh || gemDef.name || '宝石';
    
    return {
      success: true,
      message: `成功提取宝石！花费 ${extractionCost} 金币`,
      gem: gemItem,
      cost: extractionCost
    };
  }
  
  /**
   * 计算装备的宝石套装效果
   * @param {Object} equipment - 装备对象
   * @returns {Object} 套装效果对象
   */
  calculateGemSetEffects(equipment) {
    if (!equipment || !equipment.meta || !equipment.meta.sockets) {
      return {
        hasSeries: false,
        series: null,
        count: 0,
        bonus: 0,
        effect: null,
        description: null
      };
    }
    
    // 统计每个系列的宝石数量
    const seriesCounts = {};
    
    for (const socket of equipment.meta.sockets) {
      if (socket.status === 'FILLED' && socket.gemId) {
        // 确定宝石属于哪个系列
        for (const [seriesName, gemTypes] of Object.entries(this.GEM_SERIES)) {
          // 检查gemId是否包含系列中的任何宝石类型
          const gemIdLower = socket.gemId.toLowerCase();
          for (const gemType of gemTypes) {
            if (gemIdLower.includes(gemType.toLowerCase())) {
              seriesCounts[seriesName] = (seriesCounts[seriesName] || 0) + 1;
              break;
            }
          }
        }
      }
    }
    
    // 找到数量最多的系列
    let maxSeries = null;
    let maxCount = 0;
    
    for (const [series, count] of Object.entries(seriesCounts)) {
      if (count > maxCount) {
        maxCount = count;
        maxSeries = series;
      }
    }
    
    // 如果没有形成套装（至少需要2个）
    if (maxCount < 2) {
      return {
        hasSeries: false,
        series: null,
        count: 0,
        bonus: 0,
        effect: null,
        description: null
      };
    }
    
    // 获取套装加成
    const setBonus = this.GEM_SET_BONUSES[maxCount] || this.GEM_SET_BONUSES[4];
    const seriesEffects = this.SERIES_EFFECTS[maxSeries] || {};
    
    return {
      hasSeries: true,
      series: maxSeries,
      count: maxCount,
      bonus: setBonus.bonus,
      effect: setBonus.effect,
      description: seriesEffects[setBonus.effect] || '未知效果'
    };
  }
  
  /**
   * 获取宝石的属性加成（考虑品质）
   * @param {Object} gem - 宝石对象
   * @returns {Object} 属性加成对象
   */
  getGemBonus(gem) {
    if (!gem) {
      return {};
    }
    
    const quality = gem.gemQuality || 'normal';
    const multiplier = this.GEM_QUALITY_MULTIPLIERS[quality] || 1.0;
    
    // 获取基础属性
    const baseStats = gem.stats || {};
    const bonuses = {};
    
    // 应用品质倍率
    for (const [stat, value] of Object.entries(baseStats)) {
      if (typeof value === 'number') {
        bonuses[stat] = value * multiplier;
      }
    }
    
    return bonuses;
  }
  
  /**
   * 获取宝石品质信息
   * @param {Object} gem - 宝石对象
   * @returns {Object} 品质信息
   */
  getGemQualityInfo(gem) {
    if (!gem) return null;
    
    const quality = gem.gemQuality || 'normal';
    const multiplier = this.GEM_QUALITY_MULTIPLIERS[quality] || 1.0;
    const fusionConfig = this.GEM_FUSION_CONFIG[quality];
    const extractionCost = this.GEM_EXTRACTION_COST[quality] || 1000;
    
    const qualityNames = {
      normal: '普通',
      fine: '精良',
      perfect: '完美'
    };
    
    return {
      quality: quality,
      qualityName: qualityNames[quality] || quality,
      multiplier: multiplier,
      canFuse: fusionConfig?.canFuse || false,
      nextQuality: fusionConfig?.result || null,
      extractionCost: extractionCost
    };
  }
}
