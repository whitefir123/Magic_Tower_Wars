/**
 * BatchOperationProcessor - 批量操作处理器
 * 
 * 处理批量强化和批量分解操作，支持进度追踪和取消
 */

export class BatchOperationProcessor {
  constructor(blacksmithSystem) {
    this.blacksmithSystem = blacksmithSystem;
    this.isCancelled = false;
    this.isProcessing = false;
    
    console.log('✓ BatchOperationProcessor 已初始化');
  }
  
  /**
   * 批量强化装备到目标等级
   * @param {Object} equipment - 装备对象
   * @param {number} targetLevel - 目标强化等级
   * @param {Object} player - 玩家对象
   * @param {Object} options - 强化选项
   * @param {Function} progressCallback - 进度回调函数
   * @returns {Promise<Object>} 批量强化结果
   */
  async batchEnhance(equipment, targetLevel, player, options = {}, progressCallback = null) {
    if (!equipment || !player) {
      return {
        success: false,
        message: '无效的装备或玩家',
        completed: 0,
        attempts: 0,
        successes: 0,
        failures: 0,
        totalGoldSpent: 0,
        details: []
      };
    }
    
    // 检查是否已经在处理中
    if (this.isProcessing) {
      return {
        success: false,
        message: '已有批量操作正在进行中',
        completed: 0,
        attempts: 0,
        successes: 0,
        failures: 0,
        totalGoldSpent: 0,
        details: []
      };
    }
    
    this.isProcessing = true;
    this.isCancelled = false;
    
    const startLevel = equipment.enhanceLevel || 0;
    const results = [];
    let totalGoldSpent = 0;
    let successCount = 0;
    let failureCount = 0;
    
    // 验证目标等级
    const maxLevel = this.blacksmithSystem.enhancementEngine.MAX_LEVEL || 15;
    if (targetLevel > maxLevel) {
      this.isProcessing = false;
      return {
        success: false,
        message: `目标等级超过最大等级 +${maxLevel}`,
        completed: startLevel,
        attempts: 0,
        successes: 0,
        failures: 0,
        totalGoldSpent: 0,
        details: []
      };
    }
    
    if (startLevel >= targetLevel) {
      this.isProcessing = false;
      return {
        success: false,
        message: '当前等级已达到或超过目标等级',
        completed: startLevel,
        attempts: 0,
        successes: 0,
        failures: 0,
        totalGoldSpent: 0,
        details: []
      };
    }
    
    try {
      // 批量强化循环
      while (equipment.enhanceLevel < targetLevel && !this.isCancelled) {
        const currentLevel = equipment.enhanceLevel;
        
        // 执行单次强化
        const result = this.blacksmithSystem.enhanceItem(equipment, player, options);
        
        // 记录结果
        results.push({
          attempt: results.length + 1,
          previousLevel: currentLevel,
          newLevel: equipment.enhanceLevel,
          success: result.success,
          goldSpent: this.blacksmithSystem.calculateEnhanceCost({ enhanceLevel: currentLevel }),
          protectionUsed: result.enhanceResult?.protectionUsed || false
        });
        
        // 统计
        if (result.success) {
          successCount++;
        } else {
          failureCount++;
        }
        
        totalGoldSpent += this.blacksmithSystem.calculateEnhanceCost({ enhanceLevel: currentLevel });
        
        // 调用进度回调
        if (progressCallback) {
          progressCallback({
            current: equipment.enhanceLevel,
            target: targetLevel,
            attempts: results.length,
            successes: successCount,
            failures: failureCount,
            totalGoldSpent: totalGoldSpent,
            cancelled: false
          });
        }
        
        // 如果失败且没有保护，可能会降级，需要继续尝试
        // 如果成功，继续下一级
        
        // 添加小延迟以保持UI响应性
        await this.delay(50);
      }
      
      this.isProcessing = false;
      
      return {
        success: true,
        message: this.isCancelled ? '批量强化已取消' : '批量强化完成',
        completed: equipment.enhanceLevel,
        startLevel: startLevel,
        targetLevel: targetLevel,
        attempts: results.length,
        successes: successCount,
        failures: failureCount,
        totalGoldSpent: totalGoldSpent,
        cancelled: this.isCancelled,
        details: results
      };
      
    } catch (error) {
      this.isProcessing = false;
      console.error('[BatchOperationProcessor] 批量强化错误:', error);
      
      return {
        success: false,
        message: `批量强化出错: ${error.message}`,
        completed: equipment.enhanceLevel,
        startLevel: startLevel,
        attempts: results.length,
        successes: successCount,
        failures: failureCount,
        totalGoldSpent: totalGoldSpent,
        details: results
      };
    }
  }
  
  /**
   * 批量分解装备
   * @param {Array} equipmentList - 装备列表
   * @param {Object} player - 玩家对象
   * @param {Function} progressCallback - 进度回调函数
   * @returns {Promise<Object>} 批量分解结果
   */
  async batchDismantle(equipmentList, player, progressCallback = null) {
    if (!equipmentList || !Array.isArray(equipmentList) || equipmentList.length === 0) {
      return {
        success: false,
        message: '无效的装备列表',
        completed: 0,
        totalGoldGained: 0,
        materialsGained: {},
        details: []
      };
    }
    
    if (!player) {
      return {
        success: false,
        message: '无效的玩家',
        completed: 0,
        totalGoldGained: 0,
        materialsGained: {},
        details: []
      };
    }
    
    // 检查是否已经在处理中
    if (this.isProcessing) {
      return {
        success: false,
        message: '已有批量操作正在进行中',
        completed: 0,
        totalGoldGained: 0,
        materialsGained: {},
        details: []
      };
    }
    
    this.isProcessing = true;
    this.isCancelled = false;
    
    const results = [];
    let totalGoldGained = 0;
    const materialsGained = {};
    let completedCount = 0;
    
    try {
      // 批量分解循环
      for (let i = 0; i < equipmentList.length && !this.isCancelled; i++) {
        const equipment = equipmentList[i];
        
        if (!equipment) {
          continue;
        }
        
        // 执行分解
        const result = this.blacksmithSystem.dismantleItem(equipment, player);
        
        // 记录结果
        if (result.success) {
          completedCount++;
          totalGoldGained += result.value || 0;
          
          // 累加材料
          if (result.materials) {
            for (const [materialType, amount] of Object.entries(result.materials)) {
              materialsGained[materialType] = (materialsGained[materialType] || 0) + amount;
            }
          }
          
          results.push({
            index: i,
            itemName: this.blacksmithSystem.getItemDisplayName(equipment),
            success: true,
            goldGained: result.value || 0,
            materials: result.materials || {}
          });
        } else {
          results.push({
            index: i,
            itemName: this.blacksmithSystem.getItemDisplayName(equipment),
            success: false,
            message: result.message
          });
        }
        
        // 调用进度回调
        if (progressCallback) {
          progressCallback({
            current: i + 1,
            total: equipmentList.length,
            completed: completedCount,
            totalGoldGained: totalGoldGained,
            materialsGained: materialsGained,
            cancelled: false
          });
        }
        
        // 添加小延迟以保持UI响应性
        await this.delay(30);
      }
      
      this.isProcessing = false;
      
      return {
        success: true,
        message: this.isCancelled ? '批量分解已取消' : '批量分解完成',
        completed: completedCount,
        total: equipmentList.length,
        totalGoldGained: totalGoldGained,
        materialsGained: materialsGained,
        cancelled: this.isCancelled,
        details: results
      };
      
    } catch (error) {
      this.isProcessing = false;
      console.error('[BatchOperationProcessor] 批量分解错误:', error);
      
      return {
        success: false,
        message: `批量分解出错: ${error.message}`,
        completed: completedCount,
        total: equipmentList.length,
        totalGoldGained: totalGoldGained,
        materialsGained: materialsGained,
        details: results
      };
    }
  }
  
  /**
   * 取消当前批量操作
   */
  cancelBatch() {
    if (this.isProcessing) {
      this.isCancelled = true;
      console.log('[BatchOperationProcessor] 批量操作已请求取消');
    }
  }
  
  /**
   * 检查是否正在处理
   * @returns {boolean}
   */
  isProcessingBatch() {
    return this.isProcessing;
  }
  
  /**
   * 延迟函数（用于保持UI响应性）
   * @param {number} ms - 延迟毫秒数
   * @returns {Promise}
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * 分块处理大批量操作
   * @param {Array} items - 项目列表
   * @param {number} chunkSize - 每块大小
   * @param {Function} processor - 处理函数
   * @param {Function} progressCallback - 进度回调
   * @returns {Promise<Array>} 处理结果
   */
  async processInChunks(items, chunkSize, processor, progressCallback = null) {
    const results = [];
    const totalChunks = Math.ceil(items.length / chunkSize);
    
    for (let i = 0; i < items.length && !this.isCancelled; i += chunkSize) {
      const chunk = items.slice(i, i + chunkSize);
      const chunkIndex = Math.floor(i / chunkSize);
      
      // 处理当前块
      for (const item of chunk) {
        if (this.isCancelled) break;
        
        const result = await processor(item);
        results.push(result);
        
        // 调用进度回调
        if (progressCallback) {
          progressCallback({
            current: results.length,
            total: items.length,
            currentChunk: chunkIndex + 1,
            totalChunks: totalChunks,
            cancelled: false
          });
        }
      }
      
      // 块之间添加延迟
      if (i + chunkSize < items.length) {
        await this.delay(100);
      }
    }
    
    return results;
  }
}
