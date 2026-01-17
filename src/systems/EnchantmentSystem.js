/**
 * EnchantmentSystem - 管理装备附魔系统
 * 
 * 允许玩家为装备添加特殊效果，独立于强化等级
 * 附魔类型：吸血、暴击、元素伤害、抗性等
 * 附魔等级：基础、高级、大师
 */

export class EnchantmentSystem {
  constructor() {
    // 附魔库 - 定义所有可用的附魔类型和等级
    this.ENCHANTMENT_LIBRARY = {
      lifesteal: {
        name: '吸血',
        nameEn: 'Lifesteal',
        type: 'lifesteal',
        applicableTypes: ['WEAPON'],
        tiers: {
          basic: {
            name: '基础吸血',
            value: 0.03,
            scrollCost: 5,
            description: '攻击时恢复造成伤害的3%生命值'
          },
          advanced: {
            name: '高级吸血',
            value: 0.06,
            scrollCost: 15,
            description: '攻击时恢复造成伤害的6%生命值'
          },
          master: {
            name: '大师吸血',
            value: 0.10,
            scrollCost: 30,
            description: '攻击时恢复造成伤害的10%生命值'
          }
        }
      },
      critical: {
        name: '暴击强化',
        nameEn: 'Critical Enhancement',
        type: 'critical',
        applicableTypes: ['WEAPON'],
        tiers: {
          basic: {
            name: '基础暴击',
            value: 0.05,
            scrollCost: 5,
            description: '暴击率+5%'
          },
          advanced: {
            name: '高级暴击',
            value: 0.10,
            scrollCost: 15,
            description: '暴击率+10%'
          },
          master: {
            name: '大师暴击',
            value: 0.15,
            scrollCost: 30,
            description: '暴击率+15%'
          }
        }
      },
      fire_damage: {
        name: '火焰伤害',
        nameEn: 'Fire Damage',
        type: 'elemental',
        applicableTypes: ['WEAPON'],
        tiers: {
          basic: {
            name: '基础火焰',
            value: 10,
            scrollCost: 5,
            description: '额外造成10点火焰伤害'
          },
          advanced: {
            name: '高级火焰',
            value: 25,
            scrollCost: 15,
            description: '额外造成25点火焰伤害'
          },
          master: {
            name: '大师火焰',
            value: 50,
            scrollCost: 30,
            description: '额外造成50点火焰伤害'
          }
        }
      },
      ice_damage: {
        name: '冰霜伤害',
        nameEn: 'Ice Damage',
        type: 'elemental',
        applicableTypes: ['WEAPON'],
        tiers: {
          basic: {
            name: '基础冰霜',
            value: 10,
            scrollCost: 5,
            description: '额外造成10点冰霜伤害'
          },
          advanced: {
            name: '高级冰霜',
            value: 25,
            scrollCost: 15,
            description: '额外造成25点冰霜伤害'
          },
          master: {
            name: '大师冰霜',
            value: 50,
            scrollCost: 30,
            description: '额外造成50点冰霜伤害'
          }
        }
      },
      physical_resistance: {
        name: '物理抗性',
        nameEn: 'Physical Resistance',
        type: 'resistance',
        applicableTypes: ['ARMOR', 'HELM', 'BOOTS'],
        tiers: {
          basic: {
            name: '基础物抗',
            value: 5,
            scrollCost: 5,
            description: '物理防御+5'
          },
          advanced: {
            name: '高级物抗',
            value: 12,
            scrollCost: 15,
            description: '物理防御+12'
          },
          master: {
            name: '大师物抗',
            value: 25,
            scrollCost: 30,
            description: '物理防御+25'
          }
        }
      },
      magic_resistance: {
        name: '魔法抗性',
        nameEn: 'Magic Resistance',
        type: 'resistance',
        applicableTypes: ['ARMOR', 'HELM', 'BOOTS'],
        tiers: {
          basic: {
            name: '基础魔抗',
            value: 5,
            scrollCost: 5,
            description: '魔法防御+5'
          },
          advanced: {
            name: '高级魔抗',
            value: 12,
            scrollCost: 15,
            description: '魔法防御+12'
          },
          master: {
            name: '大师魔抗',
            value: 25,
            scrollCost: 30,
            description: '魔法防御+25'
          }
        }
      },
      health_boost: {
        name: '生命强化',
        nameEn: 'Health Boost',
        type: 'stat_boost',
        applicableTypes: ['ARMOR', 'HELM', 'AMULET'],
        tiers: {
          basic: {
            name: '基础生命',
            value: 30,
            scrollCost: 5,
            description: '最大生命值+30'
          },
          advanced: {
            name: '高级生命',
            value: 75,
            scrollCost: 15,
            description: '最大生命值+75'
          },
          master: {
            name: '大师生命',
            value: 150,
            scrollCost: 30,
            description: '最大生命值+150'
          }
        }
      },
      attack_boost: {
        name: '攻击强化',
        nameEn: 'Attack Boost',
        type: 'stat_boost',
        applicableTypes: ['RING', 'AMULET'],
        tiers: {
          basic: {
            name: '基础攻击',
            value: 5,
            scrollCost: 5,
            description: '物理攻击+5'
          },
          advanced: {
            name: '高级攻击',
            value: 12,
            scrollCost: 15,
            description: '物理攻击+12'
          },
          master: {
            name: '大师攻击',
            value: 25,
            scrollCost: 30,
            description: '物理攻击+25'
          }
        }
      }
    };
    
    // 装备类型的附魔槽位数量
    this.ENCHANTMENT_SLOTS_BY_TYPE = {
      WEAPON: 2,
      ARMOR: 2,
      HELM: 1,
      BOOTS: 1,
      RING: 1,
      AMULET: 1,
      ACCESSORY: 1
    };
  }
  
  /**
   * 获取装备的附魔槽位数量
   * @param {Object} equipment - 装备对象
   * @returns {number} 槽位数量
   */
  getEnchantmentSlotCount(equipment) {
    if (!equipment) return 0;
    return this.ENCHANTMENT_SLOTS_BY_TYPE[equipment.type] || 0;
  }
  
  /**
   * 初始化装备的附魔槽位
   * @param {Object} equipment - 装备对象
   */
  initializeEnchantmentSlots(equipment) {
    if (!equipment) return;
    
    if (!equipment.enchantments) {
      const slotCount = this.getEnchantmentSlotCount(equipment);
      equipment.enchantments = new Array(slotCount).fill(null);
    }
  }
  
  /**
   * 应用附魔到装备槽位
   * @param {Object} equipment - 装备对象
   * @param {number} slotIndex - 槽位索引
   * @param {string} enchantmentId - 附魔ID
   * @param {string} tier - 附魔等级 ('basic'|'advanced'|'master')
   * @returns {Object} { success: boolean, message: string }
   */
  applyEnchantment(equipment, slotIndex, enchantmentId, tier) {
    if (!equipment) {
      return { success: false, message: '无效的装备' };
    }
    
    // 初始化附魔槽位
    this.initializeEnchantmentSlots(equipment);
    
    // 验证槽位索引
    if (slotIndex < 0 || slotIndex >= equipment.enchantments.length) {
      return { success: false, message: '无效的槽位索引' };
    }
    
    // 验证附魔ID
    const enchantmentDef = this.ENCHANTMENT_LIBRARY[enchantmentId];
    if (!enchantmentDef) {
      return { success: false, message: `未知的附魔: ${enchantmentId}` };
    }
    
    // 验证附魔等级
    if (!enchantmentDef.tiers[tier]) {
      return { success: false, message: `无效的附魔等级: ${tier}` };
    }
    
    // 验证装备类型
    if (!enchantmentDef.applicableTypes.includes(equipment.type)) {
      return { 
        success: false, 
        message: `${enchantmentDef.name} 不能应用于 ${equipment.type} 类型装备` 
      };
    }
    
    // 应用附魔
    const tierInfo = enchantmentDef.tiers[tier];
    equipment.enchantments[slotIndex] = {
      id: enchantmentId,
      tier: tier,
      name: tierInfo.name,
      value: tierInfo.value,
      type: enchantmentDef.type,
      description: tierInfo.description
    };
    
    return { 
      success: true, 
      message: `成功附魔: ${tierInfo.name}` 
    };
  }
  
  /**
   * 移除装备槽位的附魔
   * @param {Object} equipment - 装备对象
   * @param {number} slotIndex - 槽位索引
   * @returns {Object} { success: boolean, message: string }
   */
  removeEnchantment(equipment, slotIndex) {
    if (!equipment || !equipment.enchantments) {
      return { success: false, message: '装备没有附魔' };
    }
    
    if (slotIndex < 0 || slotIndex >= equipment.enchantments.length) {
      return { success: false, message: '无效的槽位索引' };
    }
    
    if (!equipment.enchantments[slotIndex]) {
      return { success: false, message: '该槽位没有附魔' };
    }
    
    const enchantmentName = equipment.enchantments[slotIndex].name;
    equipment.enchantments[slotIndex] = null;
    
    return { 
      success: true, 
      message: `已移除附魔: ${enchantmentName}` 
    };
  }
  
  /**
   * 获取装备类型可用的附魔列表
   * @param {string} equipmentType - 装备类型
   * @param {string} tier - 附魔等级（可选）
   * @returns {Array} 可用附魔列表
   */
  getAvailableEnchantments(equipmentType, tier = null) {
    const available = [];
    
    for (const [id, enchantment] of Object.entries(this.ENCHANTMENT_LIBRARY)) {
      if (enchantment.applicableTypes.includes(equipmentType)) {
        if (tier) {
          // 只返回指定等级
          if (enchantment.tiers[tier]) {
            available.push({
              id: id,
              name: enchantment.name,
              type: enchantment.type,
              tier: tier,
              ...enchantment.tiers[tier]
            });
          }
        } else {
          // 返回所有等级
          for (const [tierKey, tierInfo] of Object.entries(enchantment.tiers)) {
            available.push({
              id: id,
              name: enchantment.name,
              type: enchantment.type,
              tier: tierKey,
              ...tierInfo
            });
          }
        }
      }
    }
    
    return available;
  }
  
  /**
   * 计算装备的附魔效果
   * @param {Object} equipment - 装备对象
   * @returns {Object} 附魔效果对象 { lifesteal: number, crit_rate: number, ... }
   */
  calculateEnchantmentEffects(equipment) {
    if (!equipment || !equipment.enchantments) {
      return {};
    }
    
    const effects = {};
    
    for (const enchantment of equipment.enchantments) {
      if (!enchantment) continue;
      
      // 根据附魔类型应用效果
      switch (enchantment.type) {
        case 'lifesteal':
          effects.lifesteal = (effects.lifesteal || 0) + enchantment.value;
          break;
        case 'critical':
          effects.crit_rate = (effects.crit_rate || 0) + enchantment.value;
          break;
        case 'elemental':
          // 元素伤害附魔
          if (enchantment.id.includes('fire')) {
            effects.fire_damage = (effects.fire_damage || 0) + enchantment.value;
          } else if (enchantment.id.includes('ice')) {
            effects.ice_damage = (effects.ice_damage || 0) + enchantment.value;
          }
          break;
        case 'resistance':
          if (enchantment.id.includes('physical')) {
            effects.p_def = (effects.p_def || 0) + enchantment.value;
          } else if (enchantment.id.includes('magic')) {
            effects.m_def = (effects.m_def || 0) + enchantment.value;
          }
          break;
        case 'stat_boost':
          if (enchantment.id.includes('health')) {
            effects.maxHp = (effects.maxHp || 0) + enchantment.value;
          } else if (enchantment.id.includes('attack')) {
            effects.p_atk = (effects.p_atk || 0) + enchantment.value;
          }
          break;
      }
    }
    
    return effects;
  }
  
  /**
   * 获取附魔摘要
   * @param {Object} equipment - 装备对象
   * @returns {Array} 附魔摘要数组
   */
  getEnchantmentSummary(equipment) {
    if (!equipment || !equipment.enchantments) {
      return [];
    }
    
    const summary = [];
    equipment.enchantments.forEach((enchantment, index) => {
      if (enchantment) {
        summary.push({
          slotIndex: index,
          name: enchantment.name,
          description: enchantment.description,
          tier: enchantment.tier,
          value: enchantment.value
        });
      }
    });
    
    return summary;
  }
  
  /**
   * 计算附魔的总战力贡献
   * @param {Object} equipment - 装备对象
   * @returns {number} 战力值
   */
  calculateEnchantmentPower(equipment) {
    if (!equipment || !equipment.enchantments) {
      return 0;
    }
    
    let power = 0;
    const tierMultipliers = {
      basic: 1,
      advanced: 2,
      master: 3
    };
    
    for (const enchantment of equipment.enchantments) {
      if (enchantment) {
        const multiplier = tierMultipliers[enchantment.tier] || 1;
        power += enchantment.value * multiplier;
      }
    }
    
    return Math.floor(power);
  }
}
