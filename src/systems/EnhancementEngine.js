/**
 * EnhancementEngine.js
 * 强化引擎 - 处理装备强化逻辑，包括失败机制和保护道具
 */

import { FORGE_CONFIG } from '../constants.js';

/**
 * EnhancementEngine - 强化引擎
 * 管理装备强化的核心逻辑，包括成功率计算、失败处理和保护道具
 */
export class EnhancementEngine {
  constructor() {
    console.log('✓ EnhancementEngine 已初始化');
  }

  /**
   * 计算强化成功概率
   * @param {number} currentLevel - 当前强化等级
   * @param {number} blessingStoneCount - 使用的祝福石数量
   * @returns {number} 成功概率 (0-1)
   */
  calculateSuccessProbability(currentLevel, blessingStoneCount = 0) {
    // 获取基础成功率
    const baseRate = FORGE_CONFIG.ENHANCE.BASE_SUCCESS_RATES[currentLevel] || 0.1;
    
    // 计算祝福石加成
    const stoneCount = Math.min(blessingStoneCount, FORGE_CONFIG.ENHANCE.MAX_BLESSING_STONES);
    const bonusRate = stoneCount * FORGE_CONFIG.ENHANCE.BLESSING_STONE_BONUS;
    
    // 计算最终成功率（有上限）
    const finalRate = Math.min(
      baseRate + bonusRate,
      FORGE_CONFIG.ENHANCE.MAX_SUCCESS_RATE
    );
    
    return finalRate;
  }

  /**
   * 尝试强化装备
   * @param {Object} equipment - 装备对象
   * @param {Object} options - 强化选项
   * @param {boolean} options.useProtectionScroll - 是否使用保护卷轴
   * @param {number} options.blessingStoneCount - 使用的祝福石数量
   * @returns {Object} 强化结果
   */
  enhance(equipment, options = {}) {
    if (!equipment) {
      return {
        success: false,
        error: 'INVALID_EQUIPMENT',
        message: '无效的装备'
      };
    }

    const currentLevel = equipment.enhanceLevel || 0;
    const useProtection = options.useProtectionScroll || false;
    const blessingStones = options.blessingStoneCount || 0;

    // 计算成功概率
    const successProbability = this.calculateSuccessProbability(currentLevel, blessingStones);
    
    // 执行随机判定
    const roll = Math.random();
    const isSuccess = roll <= successProbability;

    // 记录之前的等级
    const previousLevel = currentLevel;
    let newLevel = currentLevel;

    if (isSuccess) {
      // 强化成功
      newLevel = currentLevel + 1;
      equipment.enhanceLevel = newLevel;
    } else {
      // 强化失败
      if (useProtection) {
        // 使用了保护卷轴，等级不变
        newLevel = currentLevel;
      } else {
        // 没有保护，等级降低1
        newLevel = Math.max(0, currentLevel - 1);
        equipment.enhanceLevel = newLevel;
      }
    }

    return {
      success: isSuccess,
      previousLevel: previousLevel,
      newLevel: newLevel,
      protectionUsed: useProtection && !isSuccess,
      blessingStonesUsed: blessingStones,
      successProbability: successProbability,
      roll: roll
    };
  }

  /**
   * 批量强化到目标等级
   * @param {Object} equipment - 装备对象
   * @param {number} targetLevel - 目标等级
   * @param {Object} options - 批量强化选项
   * @param {boolean} options.useProtectionScroll - 是否使用保护卷轴
   * @param {number} options.blessingStoneCount - 每次使用的祝福石数量
   * @param {Function} progressCallback - 进度回调函数
   * @returns {Object} 批量强化结果
   */
  batchEnhance(equipment, targetLevel, options = {}, progressCallback = null) {
    if (!equipment) {
      return {
        success: false,
        error: 'INVALID_EQUIPMENT',
        message: '无效的装备',
        attempts: []
      };
    }

    const startLevel = equipment.enhanceLevel || 0;
    const attempts = [];
    let currentLevel = startLevel;
    let totalAttempts = 0;
    let successCount = 0;

    // 最多尝试1000次，防止无限循环
    const maxAttempts = 1000;

    while (currentLevel < targetLevel && totalAttempts < maxAttempts) {
      // 执行单次强化
      const result = this.enhance(equipment, options);
      
      attempts.push({
        attemptNumber: totalAttempts + 1,
        previousLevel: result.previousLevel,
        newLevel: result.newLevel,
        success: result.success,
        protectionUsed: result.protectionUsed
      });

      if (result.success) {
        successCount++;
      }

      currentLevel = result.newLevel;
      totalAttempts++;

      // 调用进度回调
      if (progressCallback) {
        progressCallback({
          current: currentLevel,
          target: targetLevel,
          attempts: totalAttempts,
          successes: successCount
        });
      }

      // 如果失败且没有保护，可能需要更多次尝试
      // 这里不做特殊处理，让循环继续
    }

    const finalLevel = equipment.enhanceLevel || 0;
    const reachedTarget = finalLevel >= targetLevel;

    return {
      success: reachedTarget,
      startLevel: startLevel,
      finalLevel: finalLevel,
      targetLevel: targetLevel,
      totalAttempts: totalAttempts,
      successCount: successCount,
      failureCount: totalAttempts - successCount,
      attempts: attempts,
      message: reachedTarget 
        ? `批量强化成功！从 +${startLevel} 到 +${finalLevel}，共尝试 ${totalAttempts} 次`
        : `批量强化未完成。从 +${startLevel} 到 +${finalLevel}，目标 +${targetLevel}，共尝试 ${totalAttempts} 次`
    };
  }

  /**
   * 验证强化选项
   * @param {Object} equipment - 装备对象
   * @param {Object} options - 强化选项
   * @param {Object} player - 玩家对象
   * @returns {Object} 验证结果
   */
  validateEnhanceOptions(equipment, options, player) {
    const errors = [];

    if (!equipment) {
      errors.push('装备无效');
      return { valid: false, errors };
    }

    if (!player) {
      errors.push('玩家数据无效');
      return { valid: false, errors };
    }

    const currentLevel = equipment.enhanceLevel || 0;

    // 检查是否达到最大等级
    const maxLevel = FORGE_CONFIG.ENHANCE.MAX_LEVEL;
    if (currentLevel >= maxLevel) {
      errors.push(`已达到最大强化等级 +${maxLevel}`);
    }

    // 检查保护卷轴
    if (options.useProtectionScroll) {
      const scrollCount = player.forge?.protectionItems?.protection_scroll || 0;
      if (scrollCount < 1) {
        errors.push('保护卷轴不足');
      }
    }

    // 检查祝福石
    if (options.blessingStoneCount > 0) {
      const stoneCount = player.forge?.protectionItems?.blessing_stone || 0;
      if (stoneCount < options.blessingStoneCount) {
        errors.push(`祝福石不足，需要 ${options.blessingStoneCount} 个，拥有 ${stoneCount} 个`);
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors
    };
  }

  /**
   * 消耗保护道具
   * @param {Object} player - 玩家对象
   * @param {Object} options - 强化选项
   * @returns {boolean} 是否成功消耗
   */
  consumeProtectionItems(player, options) {
    if (!player.forge) {
      player.forge = {
        protectionItems: {
          protection_scroll: 0,
          blessing_stone: 0
        }
      };
    }

    if (!player.forge.protectionItems) {
      player.forge.protectionItems = {
        protection_scroll: 0,
        blessing_stone: 0
      };
    }

    // 消耗保护卷轴
    if (options.useProtectionScroll) {
      if (player.forge.protectionItems.protection_scroll > 0) {
        player.forge.protectionItems.protection_scroll -= 1;
      } else {
        return false;
      }
    }

    // 消耗祝福石
    if (options.blessingStoneCount > 0) {
      if (player.forge.protectionItems.blessing_stone >= options.blessingStoneCount) {
        player.forge.protectionItems.blessing_stone -= options.blessingStoneCount;
      } else {
        return false;
      }
    }

    return true;
  }

  /**
   * 获取强化预览信息
   * @param {Object} equipment - 装备对象
   * @param {number} blessingStoneCount - 祝福石数量
   * @returns {Object} 预览信息
   */
  getEnhancePreview(equipment, blessingStoneCount = 0) {
    if (!equipment) return null;

    const currentLevel = equipment.enhanceLevel || 0;
    const nextLevel = currentLevel + 1;
    const successProbability = this.calculateSuccessProbability(currentLevel, blessingStoneCount);

    return {
      currentLevel: currentLevel,
      nextLevel: nextLevel,
      successProbability: successProbability,
      successPercentage: Math.round(successProbability * 100),
      canEnhance: currentLevel < FORGE_CONFIG.ENHANCE.MAX_LEVEL,
      maxLevel: FORGE_CONFIG.ENHANCE.MAX_LEVEL
    };
  }
}
