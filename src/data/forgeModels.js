/**
 * forgeModels.js
 * 铁匠系统增强的数据模型定义
 * 定义了扩展的装备结构、存档数据结构和迁移逻辑
 */

/**
 * 创建默认的铁匠系统存档数据
 * @returns {Object} 默认的铁匠系统数据
 */
export function createDefaultForgeData() {
  return {
    // 材料库存
    materials: {
      enhancement_stone: 0,
      reforge_crystal: 0,
      enchantment_dust: 0,
      set_essence: 0,
      awakening_stone: 0
    },
    // 保护道具
    protectionItems: {
      protection_scroll: 0,
      blessing_stone: 0
    },
    // 铁匠NPC数据
    blacksmith: {
      level: 1,
      experience: 0,
      affinity: 0,
      unlockedFeatures: []
    },
    // 强化历史记录
    history: [],
    // 成就数据
    achievements: {},
    // 统计数据
    statistics: {
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
      totalSetEnhancements: 0
    }
  };
}

/**
 * 初始化装备的扩展字段
 * @param {Object} equipment - 装备对象
 * @returns {Object} 初始化后的装备对象
 */
export function initializeEquipmentExtensions(equipment) {
  if (!equipment) return null;

  // 特化方向（在+5, +10, +15时选择）
  if (!equipment.specializations) {
    equipment.specializations = {
      5: null,
      10: null,
      15: null
    };
  }

  // 套装强化等级
  if (equipment.setEnhancementLevel === undefined) {
    equipment.setEnhancementLevel = 0;
  }

  // 附魔槽位
  if (!equipment.enchantments) {
    equipment.enchantments = [];
  }

  // 觉醒数据
  if (!equipment.awakening) {
    equipment.awakening = {
      isAwakened: false,
      skill: null
    };
  }

  // 历史统计
  if (!equipment.history) {
    equipment.history = {
      totalEnhancements: 0,
      successfulEnhancements: 0,
      totalGoldInvested: 0
    };
  }

  return equipment;
}

/**
 * 迁移旧存档数据到新格式
 * @param {Object} saveData - 旧的存档数据
 * @returns {Object} 迁移后的存档数据
 */
export function migrateSaveData(saveData) {
  if (!saveData) return saveData;

  // 检查是否已有铁匠系统数据
  if (!saveData.forge) {
    console.log('[ForgeModels] 迁移存档：添加铁匠系统数据');
    saveData.forge = createDefaultForgeData();
  }

  // 迁移装备数据
  if (saveData.player && saveData.player.equipment) {
    Object.keys(saveData.player.equipment).forEach(slot => {
      const equipment = saveData.player.equipment[slot];
      if (equipment && typeof equipment === 'object') {
        initializeEquipmentExtensions(equipment);
      }
    });
  }

  // 迁移背包中的装备
  if (saveData.player && saveData.player.inventory) {
    saveData.player.inventory.forEach((item, index) => {
      if (item && typeof item === 'object' && item.type !== 'CONSUMABLE' && item.type !== 'GEM') {
        initializeEquipmentExtensions(item);
      }
    });
  }

  // 确保所有成就都有初始状态
  if (saveData.forge && saveData.forge.achievements) {
    // 成就数据已存在，确保格式正确
    Object.keys(saveData.forge.achievements).forEach(achievementId => {
      const achievement = saveData.forge.achievements[achievementId];
      if (typeof achievement !== 'object') {
        saveData.forge.achievements[achievementId] = {
          unlocked: false,
          progress: 0,
          unlockedAt: null
        };
      }
    });
  }

  console.log('[ForgeModels] 存档迁移完成');
  return saveData;
}

/**
 * 验证存档数据完整性
 * @param {Object} saveData - 存档数据
 * @returns {boolean} 是否有效
 */
export function validateSaveData(saveData) {
  if (!saveData) return false;

  // 检查必需的铁匠系统数据
  if (!saveData.forge) {
    console.warn('[ForgeModels] 存档验证失败：缺少铁匠系统数据');
    return false;
  }

  // 检查材料数据
  if (!saveData.forge.materials) {
    console.warn('[ForgeModels] 存档验证失败：缺少材料数据');
    return false;
  }

  // 检查铁匠NPC数据
  if (!saveData.forge.blacksmith) {
    console.warn('[ForgeModels] 存档验证失败：缺少铁匠NPC数据');
    return false;
  }

  // 检查统计数据
  if (!saveData.forge.statistics) {
    console.warn('[ForgeModels] 存档验证失败：缺少统计数据');
    return false;
  }

  return true;
}

/**
 * 创建强化记录
 * @param {Object} params - 记录参数
 * @returns {Object} 强化记录对象
 */
export function createEnhancementRecord(params) {
  return {
    timestamp: Date.now(),
    equipmentId: params.equipmentId || '',
    equipmentName: params.equipmentName || '',
    operation: params.operation || 'enhance',
    previousLevel: params.previousLevel || 0,
    newLevel: params.newLevel || 0,
    success: params.success || false,
    goldSpent: params.goldSpent || 0,
    materialsUsed: params.materialsUsed || {},
    protectionUsed: params.protectionUsed || false
  };
}

/**
 * 创建成就进度对象
 * @param {string} achievementId - 成就ID
 * @returns {Object} 成就进度对象
 */
export function createAchievementProgress(achievementId) {
  return {
    unlocked: false,
    progress: 0,
    unlockedAt: null
  };
}

/**
 * 深度克隆对象（用于避免引用问题）
 * @param {Object} obj - 要克隆的对象
 * @returns {Object} 克隆后的对象
 */
export function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime());
  if (obj instanceof Array) return obj.map(item => deepClone(item));
  
  const clonedObj = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      clonedObj[key] = deepClone(obj[key]);
    }
  }
  return clonedObj;
}

/**
 * 合并装备统计数据
 * @param {Object} equipment - 装备对象
 * @param {Object} stats - 要合并的统计数据
 */
export function mergeEquipmentStats(equipment, stats) {
  if (!equipment || !stats) return;
  
  if (!equipment.history) {
    equipment.history = {
      totalEnhancements: 0,
      successfulEnhancements: 0,
      totalGoldInvested: 0
    };
  }

  equipment.history.totalEnhancements += stats.totalEnhancements || 0;
  equipment.history.successfulEnhancements += stats.successfulEnhancements || 0;
  equipment.history.totalGoldInvested += stats.totalGoldInvested || 0;
}

/**
 * 获取装备的完整显示信息
 * @param {Object} equipment - 装备对象
 * @returns {Object} 显示信息对象
 */
export function getEquipmentDisplayInfo(equipment) {
  if (!equipment) return null;

  return {
    name: equipment.displayName || equipment.nameZh || equipment.name,
    quality: equipment.quality || 'COMMON',
    enhancementLevel: equipment.enhanceLevel || 0,
    setEnhancementLevel: equipment.setEnhancementLevel || 0,
    specializations: equipment.specializations || { 5: null, 10: null, 15: null },
    enchantments: equipment.enchantments || [],
    awakening: equipment.awakening || { isAwakened: false, skill: null },
    sockets: equipment.meta?.sockets || [],
    history: equipment.history || {
      totalEnhancements: 0,
      successfulEnhancements: 0,
      totalGoldInvested: 0
    }
  };
}
