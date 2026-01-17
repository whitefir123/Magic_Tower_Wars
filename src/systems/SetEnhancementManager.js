/**
 * SetEnhancementManager - 管理套装强化系统
 * 
 * 允许玩家对完整套装进行整体强化，提升套装效果
 * 套装强化等级独立于单件装备强化等级
 */

import { FORGE_CONFIG } from '../constants.js';

export class SetEnhancementManager {
  constructor() {
    // 套装强化配置
    this.SET_ENHANCEMENT_CONFIG = FORGE_CONFIG.SET_ENHANCEMENT || {
      ESSENCE_PER_LEVEL: 10,
      MAX_SET_LEVEL: 10,
      BONUS_PER_LEVEL: {
        2: 0.05,  // 2件套：每级+5%
        4: 0.08,  // 4件套：每级+8%
        6: 0.10   // 6件套：每级+10%
      }
    };
    
    console.log('✓ SetEnhancementManager 已初始化');
  }
  
  /**
   * 检查玩家是否拥有完整套装
   * @param {string} setId - 套装ID
   * @param {Object} player - 玩家对象
   * @returns {Object} { isComplete: boolean, pieces: Array, missingSlots: Array }
   */
  checkSetCompletion(setId, player) {
    if (!setId || !player) {
      return { isComplete: false, pieces: [], missingSlots: [] };
    }
    
    const equipment = player.equipment || {};
    const setPieces = [];
    const allSlots = ['weapon', 'armor', 'helm', 'boots', 'ring', 'amulet'];
    const missingSlots = [];
    
    // 检查每个装备槽位
    for (const slot of allSlots) {
      const item = equipment[slot];
      if (item && item.setId === setId) {
        setPieces.push({
          slot: slot,
          item: item
        });
      } else {
        missingSlots.push(slot);
      }
    }
    
    // 套装至少需要2件才算完整
    const isComplete = setPieces.length >= 2;
    
    return {
      isComplete: isComplete,
      pieces: setPieces,
      pieceCount: setPieces.length,
      missingSlots: missingSlots,
      setId: setId
    };
  }
  
  /**
   * 强化套装
   * @param {string} setId - 套装ID
   * @param {Object} player - 玩家对象
   * @param {Object} materialSystem - 材料系统实例
   * @returns {Object} { success: boolean, message: string, previousLevel: number, newLevel: number }
   */
  enhanceSet(setId, player, materialSystem) {
    if (!setId || !player || !materialSystem) {
      return { 
        success: false, 
        message: '无效的套装、玩家或材料系统', 
        previousLevel: 0, 
        newLevel: 0 
      };
    }
    
    // 检查套装完整性
    const completion = this.checkSetCompletion(setId, player);
    if (!completion.isComplete) {
      return { 
        success: false, 
        message: '套装不完整，无法进行套装强化', 
        previousLevel: 0, 
        newLevel: 0 
      };
    }
    
    // 获取当前套装强化等级（从第一件装备读取）
    const firstPiece = completion.pieces[0].item;
    const currentLevel = firstPiece.setEnhancementLevel || 0;
    
    // 检查是否达到最大等级
    if (currentLevel >= this.SET_ENHANCEMENT_CONFIG.MAX_SET_LEVEL) {
      return { 
        success: false, 
        message: `套装已达到最大强化等级 +${this.SET_ENHANCEMENT_CONFIG.MAX_SET_LEVEL}`, 
        previousLevel: currentLevel, 
        newLevel: currentLevel 
      };
    }
    
    // 计算所需套装精华
    const essenceCost = this.SET_ENHANCEMENT_CONFIG.ESSENCE_PER_LEVEL;
    const materialsRequired = {
      set_essence: essenceCost
    };
    
    // 检查材料是否足够
    if (!materialSystem.hasMaterials(materialsRequired)) {
      return { 
        success: false, 
        message: `套装精华不足！需要 ${essenceCost} 个套装精华`, 
        previousLevel: currentLevel, 
        newLevel: currentLevel 
      };
    }
    
    // 消耗材料
    const consumed = materialSystem.consumeMaterials(materialsRequired);
    if (!consumed) {
      return { 
        success: false, 
        message: '材料消耗失败', 
        previousLevel: currentLevel, 
        newLevel: currentLevel 
      };
    }
    
    // 提升套装强化等级（应用到所有套装件）
    const newLevel = currentLevel + 1;
    const affectedPieces = [];
    
    for (const pieceInfo of completion.pieces) {
      const item = pieceInfo.item;
      item.setEnhancementLevel = newLevel;
      affectedPieces.push(item);
    }
    
    return {
      success: true,
      message: `套装强化成功！${setId} 现在是套装等级 +${newLevel}`,
      previousLevel: currentLevel,
      newLevel: newLevel,
      affectedPieces: affectedPieces,
      pieceCount: completion.pieceCount
    };
  }
  
  /**
   * 计算套装强化加成
   * @param {Array} setPieces - 套装件数组
   * @returns {Object} 套装加成对象 { allStatsBonus: number, setEffectMultiplier: number }
   */
  calculateSetBonuses(setPieces) {
    if (!setPieces || setPieces.length === 0) {
      return { allStatsBonus: 0, setEffectMultiplier: 1.0 };
    }
    
    // 获取套装强化等级（从第一件读取，所有套装件应该有相同的等级）
    const setLevel = setPieces[0].setEnhancementLevel || 0;
    
    if (setLevel === 0) {
      return { allStatsBonus: 0, setEffectMultiplier: 1.0 };
    }
    
    // 获取套装件数量
    const pieceCount = setPieces.length;
    
    // 根据套装件数量获取每级加成率
    let bonusPerLevel = 0;
    if (pieceCount >= 6) {
      bonusPerLevel = this.SET_ENHANCEMENT_CONFIG.BONUS_PER_LEVEL[6] || 0.10;
    } else if (pieceCount >= 4) {
      bonusPerLevel = this.SET_ENHANCEMENT_CONFIG.BONUS_PER_LEVEL[4] || 0.08;
    } else if (pieceCount >= 2) {
      bonusPerLevel = this.SET_ENHANCEMENT_CONFIG.BONUS_PER_LEVEL[2] || 0.05;
    }
    
    // 计算总加成
    const allStatsBonus = bonusPerLevel * setLevel;
    
    // 套装效果倍率（用于增强套装本身的特殊效果）
    const setEffectMultiplier = 1.0 + allStatsBonus;
    
    return {
      allStatsBonus: allStatsBonus,
      setEffectMultiplier: setEffectMultiplier,
      bonusPerLevel: bonusPerLevel,
      setLevel: setLevel,
      pieceCount: pieceCount
    };
  }
  
  /**
   * 应用套装强化加成到装备属性
   * @param {Object} item - 装备对象
   * @param {Object} stats - 当前属性对象
   * @param {Array} setPieces - 套装件数组（包含该装备）
   * @returns {Object} 应用加成后的属性对象
   */
  applySetEnhancementToStats(item, stats, setPieces) {
    if (!item || !stats || !setPieces || setPieces.length === 0) {
      return stats;
    }
    
    // 检查该装备是否在套装中
    const isInSet = setPieces.some(piece => 
      piece === item || 
      (piece.uid && item.uid && piece.uid === item.uid) ||
      (piece.itemId && item.itemId && piece.itemId === item.itemId)
    );
    
    if (!isInSet) {
      return stats;
    }
    
    // 计算套装加成
    const bonuses = this.calculateSetBonuses(setPieces);
    
    if (bonuses.allStatsBonus === 0) {
      return stats;
    }
    
    // 应用加成到所有属性
    const enhancedStats = {};
    for (const [stat, value] of Object.entries(stats)) {
      if (typeof value === 'number') {
        // 百分比属性保留2位小数
        if (stat.includes('rate') || stat.includes('dodge') || stat.includes('pen') || stat.includes('gold') || stat.includes('lifesteal')) {
          enhancedStats[stat] = Math.round(value * (1 + bonuses.allStatsBonus) * 100) / 100;
        } else {
          // 整数属性向下取整
          enhancedStats[stat] = Math.floor(value * (1 + bonuses.allStatsBonus));
        }
      } else {
        enhancedStats[stat] = value;
      }
    }
    
    return enhancedStats;
  }
  
  /**
   * 获取套装强化信息
   * @param {string} setId - 套装ID
   * @param {Object} player - 玩家对象
   * @returns {Object} 套装强化信息
   */
  getSetEnhancementInfo(setId, player) {
    if (!setId || !player) {
      return null;
    }
    
    const completion = this.checkSetCompletion(setId, player);
    
    if (!completion.isComplete) {
      return {
        setId: setId,
        isComplete: false,
        pieceCount: completion.pieceCount,
        missingSlots: completion.missingSlots,
        currentLevel: 0,
        maxLevel: this.SET_ENHANCEMENT_CONFIG.MAX_SET_LEVEL,
        canEnhance: false,
        essenceCost: this.SET_ENHANCEMENT_CONFIG.ESSENCE_PER_LEVEL
      };
    }
    
    const firstPiece = completion.pieces[0].item;
    const currentLevel = firstPiece.setEnhancementLevel || 0;
    const bonuses = this.calculateSetBonuses(completion.pieces.map(p => p.item));
    
    return {
      setId: setId,
      isComplete: true,
      pieceCount: completion.pieceCount,
      pieces: completion.pieces,
      currentLevel: currentLevel,
      maxLevel: this.SET_ENHANCEMENT_CONFIG.MAX_SET_LEVEL,
      canEnhance: currentLevel < this.SET_ENHANCEMENT_CONFIG.MAX_SET_LEVEL,
      essenceCost: this.SET_ENHANCEMENT_CONFIG.ESSENCE_PER_LEVEL,
      bonuses: bonuses
    };
  }
  
  /**
   * 获取玩家所有套装的强化信息
   * @param {Object} player - 玩家对象
   * @returns {Array} 套装强化信息数组
   */
  getAllSetEnhancementInfo(player) {
    if (!player) {
      return [];
    }
    
    const equipment = player.equipment || {};
    const setIds = new Set();
    
    // 收集所有套装ID
    for (const item of Object.values(equipment)) {
      if (item && item.setId) {
        setIds.add(item.setId);
      }
    }
    
    // 获取每个套装的信息
    const setInfos = [];
    for (const setId of setIds) {
      const info = this.getSetEnhancementInfo(setId, player);
      if (info) {
        setInfos.push(info);
      }
    }
    
    return setInfos;
  }
}
