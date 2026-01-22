/**
 * ForgeErrorHandler - 铁匠铺错误处理系统
 * 
 * 统一处理铁匠铺中的各种错误情况
 * 提供友好的错误提示和恢复机制
 */

export class ForgeErrorHandler {
  constructor(forgeUI) {
    this.forgeUI = forgeUI;
    this.errorLog = [];
    this.maxLogSize = 50;
  }

  /**
   * 记录错误
   * @param {string} type - 错误类型
   * @param {string} message - 错误消息
   * @param {Error} error - 错误对象
   */
  logError(type, message, error = null) {
    const errorEntry = {
      type,
      message,
      error: error ? error.message : null,
      stack: error ? error.stack : null,
      timestamp: Date.now()
    };
    
    this.errorLog.push(errorEntry);
    
    // 限制日志大小
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog.shift();
    }
    
    console.error(`[ForgeErrorHandler] ${type}: ${message}`, error);
  }

  /**
   * 处理精灵图加载失败
   * @param {string} spriteId - 精灵图ID
   * @param {Error} error - 错误对象
   */
  handleSpriteLoadError(spriteId, error) {
    this.logError('SPRITE_LOAD_ERROR', `精灵图加载失败: ${spriteId}`, error);
    
    // 显示友好的错误提示
    this.showErrorMessage(
      '图片资源加载失败',
      '部分图标可能无法正常显示，但不影响功能使用。',
      'warning'
    );
    
    // 返回降级方案：使用emoji或文字占位符
    return this.getFallbackIcon(spriteId);
  }

  /**
   * 获取降级图标
   * @param {string} spriteId - 精灵图ID
   * @returns {string} 降级图标（emoji或文字）
   */
  getFallbackIcon(spriteId) {
    const fallbackIcons = {
      'ICONS_EQUIP': '⚔️',
      'ICONS_GEMS': '💎',
      'UI_SOCKET': '⭕',
      'NPC_BLACKSMITH': '🔨',
      'EFFECT_SUCCESS': '✨',
      'EFFECT_FAILURE': '💥'
    };
    
    return fallbackIcons[spriteId] || '❓';
  }

  /**
   * 处理背包数据损坏
   * @param {Error} error - 错误对象
   */
  handleInventoryDataError(error) {
    this.logError('INVENTORY_DATA_ERROR', '背包数据损坏', error);
    
    this.showErrorMessage(
      '背包数据异常',
      '检测到背包数据异常，已尝试修复。如果问题持续，请联系管理员。',
      'error'
    );
    
    // 尝试修复背包数据
    return this.repairInventoryData();
  }

  /**
   * 修复背包数据
   * @returns {boolean} 是否修复成功
   */
  repairInventoryData() {
    try {
      const game = window.game;
      if (!game || !game.player) {
        return false;
      }
      
      const player = game.player;
      
      // 确保背包数组存在
      if (!Array.isArray(player.inventory)) {
        player.inventory = [];
      }
      
      // 移除无效的背包项
      player.inventory = player.inventory.filter(item => {
        return item && typeof item === 'object' && (item.itemId || item.id);
      });
      
      // 确保装备栏对象存在
      if (!player.equipment || typeof player.equipment !== 'object') {
        player.equipment = {
          WEAPON: null,
          ARMOR: null,
          HELM: null,
          BOOTS: null,
          RING: null,
          AMULET: null,
          ACCESSORY: null
        };
      }
      
      console.log('✓ 背包数据已修复');
      return true;
    } catch (error) {
      this.logError('INVENTORY_REPAIR_ERROR', '背包数据修复失败', error);
      return false;
    }
  }

  /**
   * 处理数据同步错误
   * @param {string} operation - 操作类型
   * @param {Error} error - 错误对象
   */
  handleSyncError(operation, error) {
    this.logError('SYNC_ERROR', `数据同步失败: ${operation}`, error);
    
    this.showErrorMessage(
      '数据同步失败',
      '操作可能未保存，请重试。如果问题持续，请刷新页面。',
      'error'
    );
  }

  /**
   * 处理资源不足错误
   * @param {string} resourceType - 资源类型
   * @param {number} required - 需要的数量
   * @param {number} current - 当前数量
   */
  handleInsufficientResourceError(resourceType, required, current) {
    const resourceNames = {
      'gold': '金币',
      'material': '材料',
      'gem': '宝石',
      'drill': '钻头',
      'luckyStone': '幸运石'
    };
    
    const resourceName = resourceNames[resourceType] || resourceType;
    
    this.showErrorMessage(
      `${resourceName}不足`,
      `需要 ${required}，当前只有 ${current}。`,
      'warning'
    );
  }

  /**
   * 处理NPC交互错误
   * @param {string} action - 交互动作
   * @param {Error} error - 错误对象
   */
  handleNPCInteractionError(action, error) {
    this.logError('NPC_INTERACTION_ERROR', `NPC交互失败: ${action}`, error);
    
    this.showErrorMessage(
      'NPC交互失败',
      '无法与铁匠NPC交互，请稍后重试。',
      'error'
    );
  }

  /**
   * 处理动画错误
   * @param {string} animationType - 动画类型
   * @param {Error} error - 错误对象
   */
  handleAnimationError(animationType, error) {
    this.logError('ANIMATION_ERROR', `动画播放失败: ${animationType}`, error);
    
    // 动画错误不显示给用户，只记录日志
    // 因为动画失败不影响功能使用
    console.warn(`动画播放失败: ${animationType}，已跳过`);
  }

  /**
   * 处理性能错误
   * @param {string} operation - 操作类型
   * @param {number} duration - 操作耗时（毫秒）
   */
  handlePerformanceError(operation, duration) {
    this.logError('PERFORMANCE_ERROR', `操作耗时过长: ${operation} (${duration}ms)`);
    
    if (duration > 5000) {
      this.showErrorMessage(
        '操作响应缓慢',
        '系统响应较慢，建议刷新页面或清理浏览器缓存。',
        'warning'
      );
    }
  }

  /**
   * 显示错误消息
   * @param {string} title - 错误标题
   * @param {string} message - 错误消息
   * @param {string} type - 错误类型 ('error', 'warning', 'info')
   */
  showErrorMessage(title, message, type = 'error') {
    // 使用游戏的消息系统
    const game = window.game;
    if (game && game.ui && game.ui.logMessage) {
      game.ui.logMessage(`${title}: ${message}`, type);
    }
    
    // 同时在控制台输出
    const logMethod = type === 'error' ? console.error : type === 'warning' ? console.warn : console.log;
    logMethod(`[ForgeUI] ${title}: ${message}`);
  }

  /**
   * 获取错误日志
   * @returns {Array} 错误日志数组
   */
  getErrorLog() {
    return [...this.errorLog];
  }

  /**
   * 清除错误日志
   */
  clearErrorLog() {
    this.errorLog = [];
  }

  /**
   * 导出错误日志
   * @returns {string} JSON格式的错误日志
   */
  exportErrorLog() {
    return JSON.stringify(this.errorLog, null, 2);
  }

  /**
   * 通用错误处理包装器
   * @param {Function} fn - 要执行的函数
   * @param {string} operation - 操作名称
   * @returns {Function} 包装后的函数
   */
  wrapWithErrorHandler(fn, operation) {
    return (...args) => {
      try {
        const startTime = performance.now();
        const result = fn.apply(this.forgeUI, args);
        const duration = performance.now() - startTime;
        
        // 检查性能
        if (duration > 1000) {
          this.handlePerformanceError(operation, duration);
        }
        
        return result;
      } catch (error) {
        this.logError('OPERATION_ERROR', `操作失败: ${operation}`, error);
        this.showErrorMessage(
          '操作失败',
          `执行 ${operation} 时发生错误，请重试。`,
          'error'
        );
        return null;
      }
    };
  }

  /**
   * 清理资源
   */
  cleanup() {
    this.errorLog = [];
  }
}
