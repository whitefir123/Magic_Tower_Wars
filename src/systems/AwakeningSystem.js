/**
 * AwakeningSystem - 管理装备觉醒系统
 * 
 * 允许玩家为神话品质+15装备觉醒，获得独特技能
 * 觉醒技能分为主动技能和被动技能
 */

import { AWAKENING_SKILLS, FORGE_CONFIG } from '../constants.js';

export class AwakeningSystem {
  constructor() {
    // 觉醒配置
    this.AWAKENING_CONFIG = FORGE_CONFIG.AWAKENING || {
      REQUIRED_QUALITY: 'MYTHIC',
      REQUIRED_ENHANCEMENT: 15,
      STONE_COST: 1,
      SUCCESS_RATE: 1.0  // 100% 成功率
    };
    
    console.log('✓ AwakeningSystem 已初始化');
  }
  
  /**
   * 检查装备是否可以觉醒
   * @param {Object} equipment - 装备对象
   * @returns {Object} { canAwaken: boolean, reason: string }
   */
  canAwaken(equipment) {
    if (!equipment) {
      return { canAwaken: false, reason: '无效的装备' };
    }
    
    // 检查是否已经觉醒
    if (equipment.awakened) {
      return { canAwaken: false, reason: '该装备已经觉醒' };
    }
    
    // 检查品质
    const quality = (equipment.quality || 'COMMON').toUpperCase();
    if (quality !== this.AWAKENING_CONFIG.REQUIRED_QUALITY) {
      return { 
        canAwaken: false, 
        reason: `只有${this.AWAKENING_CONFIG.REQUIRED_QUALITY}品质的装备才能觉醒` 
      };
    }
    
    // 检查强化等级
    const enhanceLevel = equipment.enhanceLevel || 0;
    if (enhanceLevel < this.AWAKENING_CONFIG.REQUIRED_ENHANCEMENT) {
      return { 
        canAwaken: false, 
        reason: `需要强化到+${this.AWAKENING_CONFIG.REQUIRED_ENHANCEMENT}才能觉醒` 
      };
    }
    
    return { canAwaken: true, reason: '可以觉醒' };
  }
  
  /**
   * 执行装备觉醒
   * @param {Object} equipment - 装备对象
   * @param {Object} player - 玩家对象
   * @returns {Object} { success: boolean, message: string, skill: Object }
   */
  awaken(equipment, player) {
    if (!equipment || !player) {
      return { success: false, message: '无效的装备或玩家', skill: null };
    }
    
    // 检查是否可以觉醒
    const eligibility = this.canAwaken(equipment);
    if (!eligibility.canAwaken) {
      return { success: false, message: eligibility.reason, skill: null };
    }
    
    // 检查觉醒石数量
    const stoneCost = this.AWAKENING_CONFIG.STONE_COST;
    const materials = player.materials || {};
    const availableStones = materials.awakening_stone || 0;
    
    if (availableStones < stoneCost) {
      return { 
        success: false, 
        message: `觉醒石不足！需要 ${stoneCost} 个觉醒石，当前只有 ${availableStones} 个`, 
        skill: null 
      };
    }
    
    // 消耗觉醒石
    materials.awakening_stone -= stoneCost;
    
    // 随机选择觉醒技能
    const skill = this.rollAwakeningSkill(equipment.type);
    
    if (!skill) {
      // 回退觉醒石消耗
      materials.awakening_stone += stoneCost;
      return { 
        success: false, 
        message: '该装备类型没有可用的觉醒技能', 
        skill: null 
      };
    }
    
    // 应用觉醒
    equipment.awakened = true;
    equipment.awakeningSkill = {
      id: skill.id,
      name: skill.name,
      nameEn: skill.nameEn,
      type: skill.type,
      description: skill.description,
      cooldown: skill.cooldown
    };
    
    return {
      success: true,
      message: `觉醒成功！获得技能：${skill.name}`,
      skill: equipment.awakeningSkill
    };
  }
  
  /**
   * 为装备类型随机选择觉醒技能
   * @param {string} equipmentType - 装备类型
   * @returns {Object} 觉醒技能对象
   */
  rollAwakeningSkill(equipmentType) {
    if (!equipmentType) return null;
    
    // 标准化装备类型
    const normalizedType = equipmentType.toUpperCase();
    
    // 根据装备类型获取技能池
    let skillPool = [];
    
    // 映射装备类型到技能池
    if (normalizedType === 'WEAPON') {
      skillPool = AWAKENING_SKILLS.weapon || [];
    } else if (normalizedType === 'ARMOR') {
      skillPool = AWAKENING_SKILLS.armor || [];
    } else if (normalizedType === 'HELM') {
      skillPool = AWAKENING_SKILLS.helm || [];
    } else if (normalizedType === 'BOOTS') {
      skillPool = AWAKENING_SKILLS.boots || [];
    } else if (['RING', 'AMULET', 'ACCESSORY'].includes(normalizedType)) {
      skillPool = AWAKENING_SKILLS.accessory || [];
    }
    
    // 过滤适用于该装备类型的技能
    const applicableSkills = skillPool.filter(skill => 
      skill.applicableTypes && skill.applicableTypes.includes(normalizedType)
    );
    
    // 如果没有适用技能，使用整个技能池
    const finalPool = applicableSkills.length > 0 ? applicableSkills : skillPool;
    
    if (finalPool.length === 0) {
      console.warn(`[AwakeningSystem] No awakening skills found for type: ${equipmentType}`);
      return null;
    }
    
    // 随机选择一个技能
    const randomIndex = Math.floor(Math.random() * finalPool.length);
    return finalPool[randomIndex];
  }
  
  /**
   * 获取装备类型可用的觉醒技能列表
   * @param {string} equipmentType - 装备类型
   * @returns {Array} 觉醒技能列表
   */
  getAvailableSkills(equipmentType) {
    if (!equipmentType) return [];
    
    const normalizedType = equipmentType.toUpperCase();
    let skillPool = [];
    
    if (normalizedType === 'WEAPON') {
      skillPool = AWAKENING_SKILLS.weapon || [];
    } else if (normalizedType === 'ARMOR') {
      skillPool = AWAKENING_SKILLS.armor || [];
    } else if (normalizedType === 'HELM') {
      skillPool = AWAKENING_SKILLS.helm || [];
    } else if (normalizedType === 'BOOTS') {
      skillPool = AWAKENING_SKILLS.boots || [];
    } else if (['RING', 'AMULET', 'ACCESSORY'].includes(normalizedType)) {
      skillPool = AWAKENING_SKILLS.accessory || [];
    }
    
    return skillPool.filter(skill => 
      skill.applicableTypes && skill.applicableTypes.includes(normalizedType)
    );
  }
  
  /**
   * 获取装备的觉醒信息
   * @param {Object} equipment - 装备对象
   * @returns {Object} 觉醒信息
   */
  getAwakeningInfo(equipment) {
    if (!equipment) return null;
    
    const eligibility = this.canAwaken(equipment);
    const availableSkills = this.getAvailableSkills(equipment.type);
    
    return {
      canAwaken: eligibility.canAwaken,
      reason: eligibility.reason,
      awakened: equipment.awakened || false,
      skill: equipment.awakeningSkill || null,
      availableSkills: availableSkills,
      requiredQuality: this.AWAKENING_CONFIG.REQUIRED_QUALITY,
      requiredEnhancement: this.AWAKENING_CONFIG.REQUIRED_ENHANCEMENT,
      stoneCost: this.AWAKENING_CONFIG.STONE_COST
    };
  }
  
  /**
   * 计算觉醒技能的战力贡献
   * @param {Object} equipment - 装备对象
   * @returns {number} 战力值
   */
  calculateAwakeningPower(equipment) {
    if (!equipment || !equipment.awakened || !equipment.awakeningSkill) {
      return 0;
    }
    
    // 主动技能和被动技能的战力贡献不同
    const skill = equipment.awakeningSkill;
    const basePower = 100; // 基础战力
    
    if (skill.type === 'active') {
      // 主动技能：基于冷却时间计算（冷却越短，战力越高）
      const cooldownFactor = skill.cooldown ? (20 / skill.cooldown) : 1;
      return Math.floor(basePower * cooldownFactor);
    } else {
      // 被动技能：固定战力
      return basePower * 2;
    }
  }
}
