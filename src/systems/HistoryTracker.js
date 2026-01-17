/**
 * HistoryTracker - 历史追踪和成就系统
 * 
 * 追踪所有铁匠铺操作历史，管理成就系统
 */

import { FORGE_CONFIG } from '../constants.js';

export class HistoryTracker {
  constructor(game) {
    this.game = game;
    
    // 历史记录
    this.history = [];
    
    // 统计数据
    this.statistics = {
      totalEnhancements: 0,
      successfulEnhancements: 0,
      failedEnhancements: 0,
      consecutiveSuccesses: 0,
      maxConsecutiveSuccesses: 0,
      totalGoldSpent: 0,
      totalReforges: 0,
      mythicReforges: 0,
      totalEnchantments: 0,
      totalAwakenings: 0,
      perfectGemsFused: 0,
      maxEnhancementReached: 0,
      totalDismantles: 0,
      totalSetEnhancements: 0,
      totalGemFusions: 0,
      totalGemExtractions: 0
    };
    
    // 成就数据
    this.achievements = {};
    
    // 初始化成就
    this.initializeAchievements();
    
    console.log('✓ HistoryTracker 已初始化');
  }
  
  /**
   * 初始化成就系统
   */
  initializeAchievements() {
    const achievementDefs = FORGE_CONFIG.FORGE_ACHIEVEMENTS || [];
    
    for (const def of achievementDefs) {
      if (!this.achievements[def.id]) {
        this.achievements[def.id] = {
          id: def.id,
          name: def.name,
          description: def.description,
          category: def.category,
          unlocked: false,
          progress: 0,
          maxProgress: def.maxProgress || 1,
          unlockedAt: null,
          reward: def.reward || {}
        };
      }
    }
  }
  
  /**
   * 记录强化操作
   * @param {Object} record - 操作记录
   */
  logEnhancement(record) {
    if (!record) return;
    
    // 添加时间戳
    const enhancementRecord = {
      timestamp: Date.now(),
      equipmentId: record.equipmentId || record.equipment?.uid || record.equipment?.id,
      equipmentName: record.equipmentName || record.equipment?.nameZh || record.equipment?.name || '未知装备',
      operation: record.operation || 'enhance',
      previousLevel: record.previousLevel || 0,
      newLevel: record.newLevel || 0,
      success: record.success || false,
      goldSpent: record.goldSpent || 0,
      materialsUsed: record.materialsUsed || {},
      protectionUsed: record.protectionUsed || false,
      blessingStonesUsed: record.blessingStonesUsed || 0
    };
    
    // 添加到历史记录
    this.history.push(enhancementRecord);
    
    // 更新统计数据
    this.updateStatistics(enhancementRecord);
    
    // 检查成就
    this.checkAchievements('enhancement');
  }
  
  /**
   * 记录重铸操作
   * @param {Object} record - 操作记录
   */
  logReforge(record) {
    if (!record) return;
    
    const reforgeRecord = {
      timestamp: Date.now(),
      equipmentId: record.equipmentId || record.equipment?.uid || record.equipment?.id,
      equipmentName: record.equipmentName || record.equipment?.nameZh || record.equipment?.name || '未知装备',
      operation: 'reforge',
      oldQuality: record.oldQuality || 'COMMON',
      newQuality: record.newQuality || 'COMMON',
      success: true,
      goldSpent: record.goldSpent || 0
    };
    
    this.history.push(reforgeRecord);
    
    // 更新统计
    this.statistics.totalReforges++;
    this.statistics.totalGoldSpent += reforgeRecord.goldSpent;
    
    if (reforgeRecord.newQuality === 'MYTHIC') {
      this.statistics.mythicReforges++;
    }
    
    // 检查成就
    this.checkAchievements('reforge');
  }
  
  /**
   * 记录附魔操作
   * @param {Object} record - 操作记录
   */
  logEnchantment(record) {
    if (!record) return;
    
    const enchantmentRecord = {
      timestamp: Date.now(),
      equipmentId: record.equipmentId || record.equipment?.uid || record.equipment?.id,
      equipmentName: record.equipmentName || record.equipment?.nameZh || record.equipment?.name || '未知装备',
      operation: 'enchant',
      enchantmentId: record.enchantmentId,
      enchantmentName: record.enchantmentName,
      tier: record.tier,
      success: record.success || false,
      materialsUsed: record.materialsUsed || {}
    };
    
    this.history.push(enchantmentRecord);
    
    // 更新统计
    if (enchantmentRecord.success) {
      this.statistics.totalEnchantments++;
    }
    
    // 检查成就
    this.checkAchievements('enchantment');
  }
  
  /**
   * 记录觉醒操作
   * @param {Object} record - 操作记录
   */
  logAwakening(record) {
    if (!record) return;
    
    const awakeningRecord = {
      timestamp: Date.now(),
      equipmentId: record.equipmentId || record.equipment?.uid || record.equipment?.id,
      equipmentName: record.equipmentName || record.equipment?.nameZh || record.equipment?.name || '未知装备',
      operation: 'awaken',
      skillId: record.skillId,
      skillName: record.skillName,
      success: record.success || false,
      materialsUsed: record.materialsUsed || {}
    };
    
    this.history.push(awakeningRecord);
    
    // 更新统计
    if (awakeningRecord.success) {
      this.statistics.totalAwakenings++;
    }
    
    // 检查成就
    this.checkAchievements('awakening');
  }
  
  /**
   * 记录分解操作
   * @param {Object} record - 操作记录
   */
  logDismantle(record) {
    if (!record) return;
    
    const dismantleRecord = {
      timestamp: Date.now(),
      equipmentId: record.equipmentId || record.equipment?.uid || record.equipment?.id,
      equipmentName: record.equipmentName || record.equipment?.nameZh || record.equipment?.name || '未知装备',
      operation: 'dismantle',
      goldGained: record.goldGained || 0,
      materialsGained: record.materialsGained || {}
    };
    
    this.history.push(dismantleRecord);
    
    // 更新统计
    this.statistics.totalDismantles++;
    
    // 检查成就
    this.checkAchievements('dismantle');
  }
  
  /**
   * 记录套装强化操作
   * @param {Object} record - 操作记录
   */
  logSetEnhancement(record) {
    if (!record) return;
    
    const setEnhancementRecord = {
      timestamp: Date.now(),
      setId: record.setId,
      operation: 'set_enhance',
      previousLevel: record.previousLevel || 0,
      newLevel: record.newLevel || 0,
      success: record.success || false,
      materialsUsed: record.materialsUsed || {}
    };
    
    this.history.push(setEnhancementRecord);
    
    // 更新统计
    if (setEnhancementRecord.success) {
      this.statistics.totalSetEnhancements++;
    }
    
    // 检查成就
    this.checkAchievements('set_enhancement');
  }
  
  /**
   * 记录宝石融合操作
   * @param {Object} record - 操作记录
   */
  logGemFusion(record) {
    if (!record) return;
    
    const gemFusionRecord = {
      timestamp: Date.now(),
      operation: 'gem_fusion',
      gemType: record.gemType,
      previousQuality: record.previousQuality,
      newQuality: record.newQuality,
      success: record.success || false
    };
    
    this.history.push(gemFusionRecord);
    
    // 更新统计
    if (gemFusionRecord.success) {
      this.statistics.totalGemFusions++;
      
      if (gemFusionRecord.newQuality === 'perfect') {
        this.statistics.perfectGemsFused++;
      }
    }
    
    // 检查成就
    this.checkAchievements('gem');
  }
  
  /**
   * 记录宝石提取操作
   * @param {Object} record - 操作记录
   */
  logGemExtraction(record) {
    if (!record) return;
    
    const gemExtractionRecord = {
      timestamp: Date.now(),
      equipmentId: record.equipmentId || record.equipment?.uid || record.equipment?.id,
      equipmentName: record.equipmentName || record.equipment?.nameZh || record.equipment?.name || '未知装备',
      operation: 'gem_extraction',
      gemType: record.gemType,
      gemQuality: record.gemQuality,
      goldSpent: record.goldSpent || 0,
      success: record.success || false
    };
    
    this.history.push(gemExtractionRecord);
    
    // 更新统计
    if (gemExtractionRecord.success) {
      this.statistics.totalGemExtractions++;
      this.statistics.totalGoldSpent += gemExtractionRecord.goldSpent;
    }
    
    // 检查成就
    this.checkAchievements('gem');
  }
  
  /**
   * 更新统计数据
   * @param {Object} record - 操作记录
   */
  updateStatistics(record) {
    if (record.operation === 'enhance') {
      this.statistics.totalEnhancements++;
      this.statistics.totalGoldSpent += record.goldSpent || 0;
      
      if (record.success) {
        this.statistics.successfulEnhancements++;
        this.statistics.consecutiveSuccesses++;
        
        // 更新最大连续成功次数
        if (this.statistics.consecutiveSuccesses > this.statistics.maxConsecutiveSuccesses) {
          this.statistics.maxConsecutiveSuccesses = this.statistics.consecutiveSuccesses;
        }
        
        // 更新最高强化等级
        if (record.newLevel > this.statistics.maxEnhancementReached) {
          this.statistics.maxEnhancementReached = record.newLevel;
        }
      } else {
        this.statistics.failedEnhancements++;
        this.statistics.consecutiveSuccesses = 0; // 重置连续成功次数
      }
    }
  }
  
  /**
   * 获取历史记录
   * @param {Object} filters - 过滤条件
   * @returns {Array} 历史记录数组
   */
  getHistory(filters = {}) {
    let filteredHistory = [...this.history];
    
    // 按操作类型过滤
    if (filters.operation) {
      filteredHistory = filteredHistory.filter(record => record.operation === filters.operation);
    }
    
    // 按装备ID过滤
    if (filters.equipmentId) {
      filteredHistory = filteredHistory.filter(record => record.equipmentId === filters.equipmentId);
    }
    
    // 按成功/失败过滤
    if (filters.success !== undefined) {
      filteredHistory = filteredHistory.filter(record => record.success === filters.success);
    }
    
    // 按时间范围过滤
    if (filters.startTime) {
      filteredHistory = filteredHistory.filter(record => record.timestamp >= filters.startTime);
    }
    if (filters.endTime) {
      filteredHistory = filteredHistory.filter(record => record.timestamp <= filters.endTime);
    }
    
    // 限制数量
    if (filters.limit) {
      filteredHistory = filteredHistory.slice(-filters.limit);
    }
    
    return filteredHistory;
  }
  
  /**
   * 获取统计数据
   * @returns {Object} 统计数据对象
   */
  getStatistics() {
    return {
      ...this.statistics,
      successRate: this.statistics.totalEnhancements > 0 
        ? (this.statistics.successfulEnhancements / this.statistics.totalEnhancements * 100).toFixed(2) + '%'
        : '0%',
      averageGoldPerOperation: this.statistics.totalEnhancements > 0
        ? Math.floor(this.statistics.totalGoldSpent / this.statistics.totalEnhancements)
        : 0
    };
  }
  
  /**
   * 检查并解锁成就
   * @param {string} category - 成就类别
   */
  checkAchievements(category) {
    const achievementDefs = FORGE_CONFIG.FORGE_ACHIEVEMENTS || [];
    
    for (const def of achievementDefs) {
      // 跳过已解锁的成就
      if (this.achievements[def.id]?.unlocked) {
        continue;
      }
      
      // 跳过不匹配类别的成就
      if (category && def.category !== category && def.category !== 'general') {
        continue;
      }
      
      // 检查成就条件
      if (def.requirement && typeof def.requirement === 'function') {
        const met = def.requirement(this.statistics);
        
        if (met) {
          this.unlockAchievement(def.id);
        }
      }
    }
  }
  
  /**
   * 解锁成就
   * @param {string} achievementId - 成就ID
   */
  unlockAchievement(achievementId) {
    const achievement = this.achievements[achievementId];
    
    if (!achievement || achievement.unlocked) {
      return;
    }
    
    // 标记为已解锁
    achievement.unlocked = true;
    achievement.unlockedAt = Date.now();
    achievement.progress = achievement.maxProgress;
    
    // 获取成就定义
    const achievementDefs = FORGE_CONFIG.FORGE_ACHIEVEMENTS || [];
    const def = achievementDefs.find(a => a.id === achievementId);
    
    if (def && def.reward) {
      // 发放奖励
      this.grantReward(def.reward);
    }
    
    console.log(`🏆 成就解锁: ${achievement.name}`);
    
    // 触发成就解锁事件（可以用于UI显示）
    if (this.game && this.game.events) {
      this.game.events.emit('achievement_unlocked', achievement);
    }
  }
  
  /**
   * 发放成就奖励
   * @param {Object} reward - 奖励对象
   */
  grantReward(reward) {
    if (!reward || !this.game || !this.game.player) {
      return;
    }
    
    const player = this.game.player;
    
    // 金币奖励
    if (reward.gold) {
      player.stats.gold = (player.stats.gold || 0) + reward.gold;
    }
    
    // 材料奖励
    if (reward.materials && this.game.blacksmithSystem) {
      this.game.blacksmithSystem.materialSystem.addMaterials(reward.materials);
    }
    
    // 保护道具奖励
    if (reward.protectionScroll && player.inventory) {
      // 添加保护卷轴到背包
      this.addItemToInventory(player, 'ITEM_PROTECTION_SCROLL', reward.protectionScroll);
    }
    
    if (reward.blessingStone && player.inventory) {
      // 添加祝福石到背包
      this.addItemToInventory(player, 'ITEM_BLESSING_STONE', reward.blessingStone);
    }
    
    // 称号奖励
    if (reward.title) {
      if (!player.titles) {
        player.titles = [];
      }
      if (!player.titles.includes(reward.title)) {
        player.titles.push(reward.title);
      }
    }
    
    // 永久折扣奖励
    if (reward.discount) {
      if (!player.permanentDiscounts) {
        player.permanentDiscounts = {};
      }
      player.permanentDiscounts.forge = (player.permanentDiscounts.forge || 0) + reward.discount;
    }
  }
  
  /**
   * 添加物品到背包
   * @param {Object} player - 玩家对象
   * @param {string} itemId - 物品ID
   * @param {number} count - 数量
   */
  addItemToInventory(player, itemId, count) {
    if (!player || !player.inventory) return;
    
    const { EQUIPMENT_DB } = require('../constants.js');
    const { createStandardizedItem } = require('../data/items.js');
    
    const itemDef = EQUIPMENT_DB[itemId];
    if (!itemDef) return;
    
    const inventory = player.inventory;
    
    // 尝试堆叠
    for (let i = 0; i < inventory.length; i++) {
      const invItem = inventory[i];
      if (invItem && (invItem.itemId === itemId || invItem.id === itemId)) {
        const currentCount = invItem.count || 1;
        const maxStack = invItem.maxStack || 99;
        
        if (currentCount + count <= maxStack) {
          invItem.count = currentCount + count;
          return;
        }
      }
    }
    
    // 找空位
    const emptyIndex = inventory.findIndex(slot => slot === null);
    if (emptyIndex !== -1) {
      const item = createStandardizedItem(itemDef, {
        level: 1,
        affixes: [],
        uniqueEffect: null,
        setId: null
      });
      item.count = count;
      item.maxStack = 99;
      inventory[emptyIndex] = item;
    }
  }
  
  /**
   * 获取所有成就及进度
   * @returns {Array} 成就数组
   */
  getAchievements() {
    return Object.values(this.achievements);
  }
  
  /**
   * 获取成就进度
   * @param {string} achievementId - 成就ID
   * @returns {Object} 成就进度对象
   */
  getAchievementProgress(achievementId) {
    const achievement = this.achievements[achievementId];
    
    if (!achievement) return null;
    
    return {
      id: achievement.id,
      name: achievement.name,
      description: achievement.description,
      category: achievement.category,
      unlocked: achievement.unlocked,
      progress: achievement.progress,
      maxProgress: achievement.maxProgress,
      progressPercent: achievement.maxProgress > 0 
        ? (achievement.progress / achievement.maxProgress * 100).toFixed(2) + '%'
        : '0%',
      unlockedAt: achievement.unlockedAt
    };
  }
  
  /**
   * 获取个人记录
   * @returns {Object} 个人记录对象
   */
  getPersonalRecords() {
    return {
      maxEnhancementLevel: this.statistics.maxEnhancementReached,
      maxConsecutiveSuccesses: this.statistics.maxConsecutiveSuccesses,
      totalGoldSpent: this.statistics.totalGoldSpent,
      totalOperations: this.statistics.totalEnhancements + 
                       this.statistics.totalReforges + 
                       this.statistics.totalEnchantments + 
                       this.statistics.totalAwakenings,
      mythicReforges: this.statistics.mythicReforges,
      perfectGemsFused: this.statistics.perfectGemsFused
    };
  }
  
  /**
   * 获取里程碑进度
   * @returns {Array} 里程碑数组
   */
  getMilestoneProgress() {
    const milestones = [
      {
        name: '强化新手',
        description: '完成10次强化',
        current: this.statistics.totalEnhancements,
        target: 10,
        completed: this.statistics.totalEnhancements >= 10
      },
      {
        name: '强化专家',
        description: '完成100次强化',
        current: this.statistics.totalEnhancements,
        target: 100,
        completed: this.statistics.totalEnhancements >= 100
      },
      {
        name: '强化大师',
        description: '完成1000次强化',
        current: this.statistics.totalEnhancements,
        target: 1000,
        completed: this.statistics.totalEnhancements >= 1000
      },
      {
        name: '重铸达人',
        description: '完成50次重铸',
        current: this.statistics.totalReforges,
        target: 50,
        completed: this.statistics.totalReforges >= 50
      },
      {
        name: '附魔师',
        description: '完成30次附魔',
        current: this.statistics.totalEnchantments,
        target: 30,
        completed: this.statistics.totalEnchantments >= 30
      },
      {
        name: '觉醒者',
        description: '完成5次觉醒',
        current: this.statistics.totalAwakenings,
        target: 5,
        completed: this.statistics.totalAwakenings >= 5
      }
    ];
    
    return milestones;
  }
  
  /**
   * 清空历史记录（保留统计数据）
   */
  clearHistory() {
    this.history = [];
  }
  
  /**
   * 重置所有数据（包括统计和成就）
   */
  reset() {
    this.history = [];
    this.statistics = {
      totalEnhancements: 0,
      successfulEnhancements: 0,
      failedEnhancements: 0,
      consecutiveSuccesses: 0,
      maxConsecutiveSuccesses: 0,
      totalGoldSpent: 0,
      totalReforges: 0,
      mythicReforges: 0,
      totalEnchantments: 0,
      totalAwakenings: 0,
      perfectGemsFused: 0,
      maxEnhancementReached: 0,
      totalDismantles: 0,
      totalSetEnhancements: 0,
      totalGemFusions: 0,
      totalGemExtractions: 0
    };
    this.initializeAchievements();
  }
  
  /**
   * 导出数据（用于保存）
   * @returns {Object} 导出的数据对象
   */
  exportData() {
    return {
      history: this.history,
      statistics: this.statistics,
      achievements: this.achievements
    };
  }
  
  /**
   * 导入数据（用于加载）
   * @param {Object} data - 导入的数据对象
   */
  importData(data) {
    if (!data) return;
    
    if (data.history) {
      this.history = data.history;
    }
    
    if (data.statistics) {
      this.statistics = { ...this.statistics, ...data.statistics };
    }
    
    if (data.achievements) {
      // 合并成就数据（保留新定义的成就）
      for (const [id, achievement] of Object.entries(data.achievements)) {
        if (this.achievements[id]) {
          this.achievements[id] = { ...this.achievements[id], ...achievement };
        }
      }
    }
  }
}
