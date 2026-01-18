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

/**
 * 强化材料图标映射
 * 对应 FORGE_MATERIALS 精灵图的布局（2行3列，共6种材料）
 * 
 * 精灵图布局：
 * 第1行: [保护卷轴(0), 祝福石(1), 套装精华(2)]
 * 第2行: [觉醒石(3), 附魔卷轴(4), 幸运石(5)]
 */
export const FORGE_MATERIAL_ICONS = {
  // 保护卷轴 - 带盾牌符号的羊皮纸
  // 用于防止强化失败时装备等级下降
  PROTECTION_SCROLL: { 
    iconIndex: 0,
    row: 0,
    col: 0,
    name: '保护卷轴',
    description: '防止强化失败时等级下降'
  },
  
  // 祝福石 - 发光的蓝色水晶
  // 用于提高强化成功率
  BLESSING_STONE: { 
    iconIndex: 1,
    row: 0,
    col: 1,
    name: '祝福石',
    description: '提高强化成功率'
  },
  
  // 套装精华 - 紫色宝石簇
  // 用于套装装备的强化
  SET_ESSENCE: { 
    iconIndex: 2,
    row: 0,
    col: 2,
    name: '套装精华',
    description: '用于套装装备强化'
  },
  
  // 觉醒石 - 金色辐射水晶
  // 用于神话品质+15装备的觉醒
  AWAKENING_STONE: { 
    iconIndex: 3,
    row: 1,
    col: 0,
    name: '觉醒石',
    description: '用于装备觉醒'
  },
  
  // 附魔卷轴 - 带符文的魔法羊皮纸
  // 用于给装备添加附魔效果
  ENCHANTMENT_SCROLL: { 
    iconIndex: 4,
    row: 1,
    col: 1,
    name: '附魔卷轴',
    description: '用于装备附魔'
  },
  
  // 幸运石 - 提升强化成功率的特殊材料
  LUCKY_STONE: { 
    iconIndex: 5,
    row: 1,
    col: 2,
    name: '幸运石',
    description: '提升强化成功率'
  }
};

/**
 * 品质边框图标映射
 * 对应 FORGE_QUALITY_BORDERS 精灵图的布局（2行3列，共6种品质）
 * 
 * 精灵图布局：
 * 第1行: [白色-普通(0), 绿色-优秀(1), 蓝色-稀有(2)]
 * 第2行: [紫色-史诗(3), 橙色-传说(4), 金色-神话(5)]
 */
export const QUALITY_BORDER_MAPPING = {
  COMMON: { iconIndex: 0, row: 0, col: 0, color: '#ffffff' },
  UNCOMMON: { iconIndex: 1, row: 0, col: 1, color: '#1eff00' },
  RARE: { iconIndex: 2, row: 0, col: 2, color: '#0070dd' },
  EPIC: { iconIndex: 3, row: 1, col: 0, color: '#a335ee' },
  LEGENDARY: { iconIndex: 4, row: 1, col: 1, color: '#ff8000' },
  MYTHIC: { iconIndex: 5, row: 1, col: 2, color: '#e6cc80' }
};

/**
 * 铁匠NPC动画帧配置
 * 对应 FORGE_BLACKSMITH_NPC 精灵图的布局（2行3列，共6帧）
 * 
 * 精灵图布局：
 * 第1行: [待机1(0), 待机2(1), 锻造1(2)]
 * 第2行: [锻造2(3), 锻造3(4), 完成(5)]
 */
export const BLACKSMITH_ANIMATION_FRAMES = {
  IDLE: [0, 1], // 待机动画：帧0和帧1循环
  HAMMERING: [2, 3, 4], // 锻造动画：帧2、3、4循环
  COMPLETE: [5] // 完成动画：帧5
};

/**
 * 强化特效动画配置
 * 成功和失败特效都是2行4列，共8帧
 */
export const ENHANCEMENT_EFFECT_CONFIG = {
  SUCCESS: {
    frames: 8,
    rows: 2,
    cols: 4,
    duration: 600, // 毫秒
    description: '金色闪光特效'
  },
  FAILURE: {
    frames: 8,
    rows: 2,
    cols: 4,
    duration: 400, // 毫秒
    description: '红色烟雾特效'
  }
};

/**
 * 从精灵图中提取单个图标
 * @param {HTMLImageElement} spriteImage - 精灵图图片
 * @param {number} row - 行索引（从0开始）
 * @param {number} col - 列索引（从0开始）
 * @param {number} totalRows - 总行数
 * @param {number} totalCols - 总列数
 * @param {number} targetSize - 目标尺寸（可选）
 * @returns {HTMLCanvasElement} 提取的图标canvas
 */
export function extractSpriteIcon(spriteImage, row, col, totalRows, totalCols, targetSize = null) {
  if (!spriteImage || !spriteImage.complete) {
    console.warn('[ForgeModels] 精灵图未加载完成');
    return null;
  }
  
  const cellW = Math.floor(spriteImage.width / totalCols);
  const cellH = Math.floor(spriteImage.height / totalRows);
  
  const sx = col * cellW;
  const sy = row * cellH;
  
  const canvas = document.createElement('canvas');
  const size = targetSize || cellW;
  canvas.width = size;
  canvas.height = size;
  
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false; // 保持像素艺术风格
  ctx.drawImage(spriteImage, sx, sy, cellW, cellH, 0, 0, size, size);
  
  return canvas;
}

/**
 * 渲染材料图标
 * @param {string} materialType - 材料类型（FORGE_MATERIAL_ICONS的键）
 * @param {HTMLImageElement} materialImage - 材料精灵图
 * @param {number} size - 目标尺寸
 * @returns {HTMLCanvasElement} 渲染的图标canvas
 */
export function renderMaterialIcon(materialType, materialImage, size = 32) {
  const iconData = FORGE_MATERIAL_ICONS[materialType];
  if (!iconData) {
    console.warn(`[ForgeModels] 未知的材料类型: ${materialType}`);
    return null;
  }
  
  return extractSpriteIcon(materialImage, iconData.row, iconData.col, 2, 3, size);
}

/**
 * 渲染品质边框
 * @param {string} quality - 品质类型（COMMON, UNCOMMON等）
 * @param {HTMLImageElement} borderImage - 边框精灵图
 * @param {number} size - 目标尺寸
 * @returns {HTMLCanvasElement} 渲染的边框canvas
 */
export function renderQualityBorder(quality, borderImage, size = 128) {
  const borderData = QUALITY_BORDER_MAPPING[quality];
  if (!borderData) {
    console.warn(`[ForgeModels] 未知的品质类型: ${quality}`);
    return null;
  }
  
  return extractSpriteIcon(borderImage, borderData.row, borderData.col, 2, 3, size);
}

/**
 * 获取铁匠动画帧
 * @param {string} animationType - 动画类型（IDLE, HAMMERING, COMPLETE）
 * @param {number} frameIndex - 当前帧索引
 * @returns {Object} 帧信息 { row, col }
 */
export function getBlacksmithFrame(animationType, frameIndex) {
  const frames = BLACKSMITH_ANIMATION_FRAMES[animationType];
  if (!frames || frames.length === 0) {
    return { row: 0, col: 0 };
  }
  
  const actualFrame = frames[frameIndex % frames.length];
  return {
    row: Math.floor(actualFrame / 3),
    col: actualFrame % 3
  };
}
