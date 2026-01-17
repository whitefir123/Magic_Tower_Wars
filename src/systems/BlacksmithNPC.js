/**
 * BlacksmithNPC - 铁匠NPC系统
 * 
 * 管理铁匠角色的等级、经验、亲密度和对话系统
 */

import { FORGE_CONFIG } from '../constants.js';

export class BlacksmithNPC {
  constructor(game) {
    this.game = game;
    
    // 铁匠状态
    this.level = 1;
    this.experience = 0;
    this.affinity = 0;
    this.unlockedFeatures = [];
    
    // 等级阈值配置
    this.LEVEL_THRESHOLDS = FORGE_CONFIG.BLACKSMITH?.LEVEL_THRESHOLDS || [
      { level: 1, exp: 0, unlocks: [] },
      { level: 2, exp: 100, unlocks: ['批量强化'] },
      { level: 3, exp: 300, unlocks: ['附魔系统'] },
      { level: 5, exp: 1000, unlocks: ['套装强化'] },
      { level: 7, exp: 3000, unlocks: ['宝石融合'] },
      { level: 10, exp: 10000, unlocks: ['+16强化', '觉醒系统'] }
    ];
    
    // 经验获取配置
    this.EXP_GAINS = FORGE_CONFIG.BLACKSMITH?.EXP_GAINS || {
      enhance: 1,
      reforge: 2,
      socket: 1,
      dismantle: 1,
      enchant: 3,
      awaken: 10,
      set_enhance: 5,
      gem_fusion: 2,
      gem_extraction: 1
    };
    
    // 亲密度阈值配置
    this.AFFINITY_THRESHOLDS = FORGE_CONFIG.BLACKSMITH?.AFFINITY_THRESHOLDS || [
      { affinity: 0, discount: 0, title: '陌生' },
      { affinity: 100, discount: 0.05, title: '熟识' },
      { affinity: 500, discount: 0.10, title: '友好' },
      { affinity: 1000, discount: 0.15, title: '信赖' },
      { affinity: 3000, discount: 0.20, title: '挚友' }
    ];
    
    // 亲密度获取配置
    this.AFFINITY_GAINS = FORGE_CONFIG.BLACKSMITH?.AFFINITY_GAINS || {
      operation: 1,
      success: 2,
      failure: 1,
      dialogue_choice: 5
    };
    
    // 对话库
    this.DIALOGUES = FORGE_CONFIG.BLACKSMITH_DIALOGUES || {
      greeting: [
        '欢迎光临！需要强化装备吗？',
        '又见面了，今天想打造什么？',
        '我的手艺可是一流的！',
        '有什么需要帮忙的吗？',
        '来看看我的新技术吧！'
      ],
      success: [
        '成功了！看这光泽，完美！',
        '不愧是我打造的，质量上乘！',
        '哈哈，又是一件杰作！',
        '这才是真正的工艺！',
        '你的装备现在更强了！'
      ],
      failure: [
        '唉，这次运气不太好...',
        '别灰心，下次一定成功！',
        '强化本就有风险，再试试吧。',
        '失败是成功之母，继续努力！',
        '有时候材料就是不配合...'
      ],
      level_up: [
        '我的技艺又精进了！',
        '感谢你的信任，我学到了新技术！',
        '太好了！我掌握了新的锻造方法！',
        '这些经验让我变得更强了！'
      ],
      affinity_increase: [
        '很高兴能为你服务！',
        '我们的合作越来越默契了！',
        '你是我最信赖的客户！',
        '能认识你真是太好了！'
      ],
      feature_unlock: [
        '我刚学会了新技术，要试试吗？',
        '这个新功能应该能帮到你！',
        '看看我的新本领！',
        '我现在能做更多事情了！'
      ]
    };
    
    console.log('✓ BlacksmithNPC 已初始化');
  }
  
  /**
   * 添加经验值
   * @param {string} operationType - 操作类型
   * @returns {Object} 结果对象 { leveledUp: boolean, newLevel: number, unlockedFeatures: Array }
   */
  addExperience(operationType) {
    const expGain = this.EXP_GAINS[operationType] || 0;
    
    if (expGain === 0) {
      return { leveledUp: false, newLevel: this.level, unlockedFeatures: [] };
    }
    
    this.experience += expGain;
    
    // 检查是否升级
    const levelUpResult = this.checkLevelUp();
    
    return levelUpResult;
  }
  
  /**
   * 检查是否升级
   * @returns {Object} 升级结果 { leveledUp: boolean, newLevel: number, unlockedFeatures: Array }
   */
  checkLevelUp() {
    let leveledUp = false;
    const unlockedFeatures = [];
    
    // 从当前等级开始检查
    for (let i = this.level; i < this.LEVEL_THRESHOLDS.length; i++) {
      const threshold = this.LEVEL_THRESHOLDS[i];
      
      if (this.experience >= threshold.exp && this.level < threshold.level) {
        this.level = threshold.level;
        leveledUp = true;
        
        // 解锁新功能
        if (threshold.unlocks && threshold.unlocks.length > 0) {
          for (const feature of threshold.unlocks) {
            if (!this.unlockedFeatures.includes(feature)) {
              this.unlockedFeatures.push(feature);
              unlockedFeatures.push(feature);
            }
          }
        }
      }
    }
    
    return {
      leveledUp: leveledUp,
      newLevel: this.level,
      unlockedFeatures: unlockedFeatures
    };
  }
  
  /**
   * 增加亲密度
   * @param {string} type - 亲密度增加类型 ('operation'|'success'|'failure'|'dialogue_choice')
   * @returns {Object} 结果对象 { affinityIncreased: number, newAffinity: number, newTitle: string }
   */
  increaseAffinity(type) {
    const affinityGain = this.AFFINITY_GAINS[type] || 0;
    
    if (affinityGain === 0) {
      return { 
        affinityIncreased: 0, 
        newAffinity: this.affinity, 
        newTitle: this.getAffinityTitle() 
      };
    }
    
    const oldTitle = this.getAffinityTitle();
    this.affinity += affinityGain;
    const newTitle = this.getAffinityTitle();
    
    return {
      affinityIncreased: affinityGain,
      newAffinity: this.affinity,
      newTitle: newTitle,
      titleChanged: oldTitle !== newTitle
    };
  }
  
  /**
   * 获取当前亲密度称号
   * @returns {string} 亲密度称号
   */
  getAffinityTitle() {
    let currentTitle = '陌生';
    
    for (const threshold of this.AFFINITY_THRESHOLDS) {
      if (this.affinity >= threshold.affinity) {
        currentTitle = threshold.title;
      } else {
        break;
      }
    }
    
    return currentTitle;
  }
  
  /**
   * 获取当前折扣率
   * @returns {number} 折扣率 (0-1)
   */
  getDiscountRate() {
    let discount = 0;
    
    for (const threshold of this.AFFINITY_THRESHOLDS) {
      if (this.affinity >= threshold.affinity) {
        discount = threshold.discount;
      } else {
        break;
      }
    }
    
    return discount;
  }
  
  /**
   * 获取对话文本
   * @param {string} context - 对话上下文 ('greeting'|'success'|'failure'|'level_up'|'affinity_increase'|'feature_unlock')
   * @returns {string} 对话文本
   */
  getDialogue(context) {
    const dialogues = this.DIALOGUES[context];
    
    if (!dialogues || dialogues.length === 0) {
      return '...';
    }
    
    // 根据亲密度和等级调整对话选择
    const affinityBonus = Math.floor(this.affinity / 500); // 每500亲密度增加一个对话选项
    const levelBonus = Math.floor(this.level / 3); // 每3级增加一个对话选项
    
    const availableDialogues = dialogues.slice(0, Math.min(dialogues.length, 1 + affinityBonus + levelBonus));
    
    // 随机选择一个对话
    const randomIndex = Math.floor(Math.random() * availableDialogues.length);
    return availableDialogues[randomIndex];
  }
  
  /**
   * 检查功能是否已解锁
   * @param {string} featureName - 功能名称
   * @returns {boolean} 是否已解锁
   */
  isFeatureUnlocked(featureName) {
    return this.unlockedFeatures.includes(featureName);
  }
  
  /**
   * 获取所有可用功能
   * @returns {Object} 功能可用性对象
   */
  getAvailableFeatures() {
    return {
      batchEnhance: this.isFeatureUnlocked('批量强化'),
      enchantment: this.isFeatureUnlocked('附魔系统'),
      setEnhancement: this.isFeatureUnlocked('套装强化'),
      gemFusion: this.isFeatureUnlocked('宝石融合'),
      highLevelEnhance: this.isFeatureUnlocked('+16强化'),
      awakening: this.isFeatureUnlocked('觉醒系统')
    };
  }
  
  /**
   * 获取铁匠信息
   * @returns {Object} 铁匠信息对象
   */
  getInfo() {
    const currentThreshold = this.LEVEL_THRESHOLDS.find(t => t.level === this.level);
    const nextThreshold = this.LEVEL_THRESHOLDS.find(t => t.level === this.level + 1);
    
    return {
      level: this.level,
      experience: this.experience,
      nextLevelExp: nextThreshold ? nextThreshold.exp : null,
      expProgress: nextThreshold ? ((this.experience - currentThreshold.exp) / (nextThreshold.exp - currentThreshold.exp) * 100).toFixed(2) + '%' : '100%',
      affinity: this.affinity,
      affinityTitle: this.getAffinityTitle(),
      discountRate: this.getDiscountRate(),
      unlockedFeatures: [...this.unlockedFeatures],
      availableFeatures: this.getAvailableFeatures()
    };
  }
  
  /**
   * 获取下一个解锁的功能
   * @returns {Object|null} 下一个功能信息
   */
  getNextUnlock() {
    for (const threshold of this.LEVEL_THRESHOLDS) {
      if (threshold.level > this.level && threshold.unlocks.length > 0) {
        return {
          level: threshold.level,
          exp: threshold.exp,
          expNeeded: threshold.exp - this.experience,
          features: threshold.unlocks
        };
      }
    }
    
    return null;
  }
  
  /**
   * 处理操作完成事件
   * @param {string} operationType - 操作类型
   * @param {boolean} success - 是否成功
   * @returns {Object} 事件结果
   */
  onOperationComplete(operationType, success) {
    // 增加经验
    const expResult = this.addExperience(operationType);
    
    // 增加亲密度
    const affinityType = success ? 'success' : 'failure';
    const affinityResult = this.increaseAffinity(affinityType);
    
    // 构建结果对象
    const result = {
      exp: expResult,
      affinity: affinityResult,
      dialogue: null,
      notifications: []
    };
    
    // 选择对话
    if (expResult.leveledUp) {
      result.dialogue = this.getDialogue('level_up');
      result.notifications.push({
        type: 'level_up',
        message: `铁匠升级到 ${expResult.newLevel} 级！`,
        features: expResult.unlockedFeatures
      });
    } else if (affinityResult.titleChanged) {
      result.dialogue = this.getDialogue('affinity_increase');
      result.notifications.push({
        type: 'affinity_up',
        message: `与铁匠的关系变为：${affinityResult.newTitle}`,
        discount: this.getDiscountRate()
      });
    } else {
      result.dialogue = this.getDialogue(success ? 'success' : 'failure');
    }
    
    return result;
  }
  
  /**
   * 导出数据（用于保存）
   * @returns {Object} 导出的数据对象
   */
  exportData() {
    return {
      level: this.level,
      experience: this.experience,
      affinity: this.affinity,
      unlockedFeatures: [...this.unlockedFeatures]
    };
  }
  
  /**
   * 导入数据（用于加载）
   * @param {Object} data - 导入的数据对象
   */
  importData(data) {
    if (!data) return;
    
    if (typeof data.level === 'number') {
      this.level = data.level;
    }
    
    if (typeof data.experience === 'number') {
      this.experience = data.experience;
    }
    
    if (typeof data.affinity === 'number') {
      this.affinity = data.affinity;
    }
    
    if (Array.isArray(data.unlockedFeatures)) {
      this.unlockedFeatures = [...data.unlockedFeatures];
    }
  }
  
  /**
   * 重置铁匠数据
   */
  reset() {
    this.level = 1;
    this.experience = 0;
    this.affinity = 0;
    this.unlockedFeatures = [];
  }
}
