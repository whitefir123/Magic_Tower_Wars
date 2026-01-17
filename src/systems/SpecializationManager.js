/**
 * SpecializationManager - 管理装备强化专精系统
 * 
 * 在 +5、+10、+15 强化等级时，玩家可以选择装备的发展方向：
 * - Attack Focus (攻击专精): 提升攻击属性
 * - Defense Focus (防御专精): 提升防御属性
 * - Speed Focus (速度专精): 提升速度/闪避属性
 * - Balanced (平衡): 全面提升
 */

export class SpecializationManager {
  constructor() {
    // 专精里程碑等级
    this.SPECIALIZATION_MILESTONES = [5, 10, 15];
    
    // 专精方向及其加成倍率
    this.SPECIALIZATION_BONUSES = {
      attack: {
        name: '攻击专精',
        nameEn: 'Attack Focus',
        description: '大幅提升攻击属性，略微降低防御',
        multipliers: {
          p_atk: 1.5,
          m_atk: 1.5,
          crit_rate: 1.3,
          crit_dmg: 1.3,
          p_def: 0.8,
          m_def: 0.8,
          maxHp: 0.9
        }
      },
      defense: {
        name: '防御专精',
        nameEn: 'Defense Focus',
        description: '大幅提升防御属性，略微降低攻击',
        multipliers: {
          p_def: 1.5,
          m_def: 1.5,
          maxHp: 1.5,
          dodge: 1.2,
          p_atk: 0.8,
          m_atk: 0.8
        }
      },
      speed: {
        name: '速度专精',
        nameEn: 'Speed Focus',
        description: '大幅提升速度和闪避，略微降低防御',
        multipliers: {
          dodge: 1.5,
          crit_rate: 1.4,
          p_atk: 1.1,
          m_atk: 1.1,
          p_def: 0.8,
          m_def: 0.8
        }
      },
      balanced: {
        name: '平衡发展',
        nameEn: 'Balanced',
        description: '全面提升所有属性',
        multipliers: {
          p_atk: 1.2,
          m_atk: 1.2,
          p_def: 1.2,
          m_def: 1.2,
          maxHp: 1.2,
          dodge: 1.2,
          crit_rate: 1.2
        }
      }
    };
  }
  
  /**
   * 检查装备是否可以选择专精
   * @param {Object} equipment - 装备对象
   * @returns {Object} { canChoose: boolean, milestone: number|null, reason: string }
   */
  canChooseSpecialization(equipment) {
    if (!equipment) {
      return { canChoose: false, milestone: null, reason: '无效的装备' };
    }
    
    const enhanceLevel = equipment.enhanceLevel || 0;
    
    // 检查是否在里程碑等级
    if (!this.SPECIALIZATION_MILESTONES.includes(enhanceLevel)) {
      return { 
        canChoose: false, 
        milestone: null, 
        reason: `当前等级 +${enhanceLevel} 不是专精里程碑` 
      };
    }
    
    // 初始化专精数据结构
    if (!equipment.specializations) {
      equipment.specializations = {
        5: null,
        10: null,
        15: null
      };
    }
    
    // 检查该里程碑是否已经选择过专精
    if (equipment.specializations[enhanceLevel]) {
      return { 
        canChoose: false, 
        milestone: enhanceLevel, 
        reason: `+${enhanceLevel} 专精已选择: ${this.getSpecializationName(equipment.specializations[enhanceLevel])}` 
      };
    }
    
    return { 
      canChoose: true, 
      milestone: enhanceLevel, 
      reason: '可以选择专精' 
    };
  }
  
  /**
   * 应用专精选择到装备
   * @param {Object} equipment - 装备对象
   * @param {string} direction - 专精方向 ('attack'|'defense'|'speed'|'balanced')
   * @returns {Object} { success: boolean, message: string }
   */
  applySpecialization(equipment, direction) {
    if (!equipment) {
      return { success: false, message: '无效的装备' };
    }
    
    // 验证专精方向
    if (!this.SPECIALIZATION_BONUSES[direction]) {
      return { success: false, message: `无效的专精方向: ${direction}` };
    }
    
    // 检查是否可以选择专精
    const checkResult = this.canChooseSpecialization(equipment);
    if (!checkResult.canChoose) {
      return { success: false, message: checkResult.reason };
    }
    
    const milestone = checkResult.milestone;
    
    // 应用专精
    equipment.specializations[milestone] = direction;
    
    const specializationInfo = this.SPECIALIZATION_BONUSES[direction];
    return { 
      success: true, 
      message: `成功选择 +${milestone} 专精: ${specializationInfo.name}` 
    };
  }
  
  /**
   * 获取装备的专精加成倍率
   * @param {Object} equipment - 装备对象
   * @returns {Object} 属性倍率对象 { p_atk: number, p_def: number, ... }
   */
  getSpecializationBonuses(equipment) {
    if (!equipment || !equipment.specializations) {
      return {}; // 没有专精，返回空对象
    }
    
    // 合并所有已选择的专精加成
    const combinedMultipliers = {};
    
    for (const milestone of this.SPECIALIZATION_MILESTONES) {
      const direction = equipment.specializations[milestone];
      if (direction && this.SPECIALIZATION_BONUSES[direction]) {
        const multipliers = this.SPECIALIZATION_BONUSES[direction].multipliers;
        
        // 累乘倍率（多个专精的效果叠加）
        for (const [stat, multiplier] of Object.entries(multipliers)) {
          if (!combinedMultipliers[stat]) {
            combinedMultipliers[stat] = 1.0;
          }
          combinedMultipliers[stat] *= multiplier;
        }
      }
    }
    
    return combinedMultipliers;
  }
  
  /**
   * 应用专精加成到装备属性
   * @param {Object} equipment - 装备对象
   * @param {Object} baseStats - 基础属性对象
   * @returns {Object} 应用专精后的属性对象
   */
  applySpecializationToStats(equipment, baseStats) {
    if (!baseStats || typeof baseStats !== 'object') {
      return baseStats;
    }
    
    const multipliers = this.getSpecializationBonuses(equipment);
    
    // 如果没有专精，直接返回基础属性
    if (Object.keys(multipliers).length === 0) {
      return { ...baseStats };
    }
    
    // 应用倍率
    const enhancedStats = { ...baseStats };
    for (const [stat, value] of Object.entries(enhancedStats)) {
      if (multipliers[stat]) {
        // 百分比属性保留2位小数
        if (stat.includes('rate') || stat.includes('dodge') || stat.includes('pen') || 
            stat.includes('gold') || stat.includes('lifesteal')) {
          enhancedStats[stat] = Math.round(value * multipliers[stat] * 100) / 100;
        } else {
          // 整数属性向下取整
          enhancedStats[stat] = Math.floor(value * multipliers[stat]);
        }
      }
    }
    
    return enhancedStats;
  }
  
  /**
   * 获取专精方向的显示名称
   * @param {string} direction - 专精方向
   * @returns {string} 显示名称
   */
  getSpecializationName(direction) {
    if (!direction || !this.SPECIALIZATION_BONUSES[direction]) {
      return '未知专精';
    }
    return this.SPECIALIZATION_BONUSES[direction].name;
  }
  
  /**
   * 获取专精方向的描述
   * @param {string} direction - 专精方向
   * @returns {string} 描述
   */
  getSpecializationDescription(direction) {
    if (!direction || !this.SPECIALIZATION_BONUSES[direction]) {
      return '';
    }
    return this.SPECIALIZATION_BONUSES[direction].description;
  }
  
  /**
   * 获取所有可用的专精方向
   * @returns {Array} 专精方向数组
   */
  getAvailableSpecializations() {
    return Object.keys(this.SPECIALIZATION_BONUSES).map(key => ({
      id: key,
      name: this.SPECIALIZATION_BONUSES[key].name,
      nameEn: this.SPECIALIZATION_BONUSES[key].nameEn,
      description: this.SPECIALIZATION_BONUSES[key].description,
      multipliers: this.SPECIALIZATION_BONUSES[key].multipliers
    }));
  }
  
  /**
   * 获取装备的专精摘要
   * @param {Object} equipment - 装备对象
   * @returns {Array} 专精摘要数组 [{ milestone: number, direction: string, name: string }]
   */
  getSpecializationSummary(equipment) {
    if (!equipment || !equipment.specializations) {
      return [];
    }
    
    const summary = [];
    for (const milestone of this.SPECIALIZATION_MILESTONES) {
      const direction = equipment.specializations[milestone];
      if (direction) {
        summary.push({
          milestone: milestone,
          direction: direction,
          name: this.getSpecializationName(direction)
        });
      }
    }
    
    return summary;
  }
}
