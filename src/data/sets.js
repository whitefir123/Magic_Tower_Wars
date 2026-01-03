// sets.js - 套装配置系统
// 定义装备套装及其激活效果

/**
 * 套装效果类型说明：
 * - stats: 直接属性加成（如 { p_atk: 20 }）
 * - flags: 特殊标记（如 { rage_regen_up: true }）
 * - conversions: 转化类效果（如 { p_def_to_p_atk: 0.2 } 表示将20%的护甲转化为攻击力）
 */

export const EQUIPMENT_SETS = {
  /**
   * 狂战士套装 (BERSERKER_SET)
   * 2件套：物理攻击 +20
   * 4件套：怒气回复速度 +50%，物理攻击 +30
   */
  BERSERKER_SET: {
    id: 'BERSERKER_SET',
    name: 'Berserker Set',
    nameZh: '狂战士套装',
    pieces: {
      2: {
        stats: {
          p_atk: 20
        },
        description: '物理攻击 +20',
        descriptionZh: '物理攻击 +20'
      },
      4: {
        stats: {
          p_atk: 30
        },
        flags: {
          rage_regen_up: true // 怒气回复速度提升（在战斗系统中处理）
        },
        description: '物理攻击 +30，怒气回复速度 +50%',
        descriptionZh: '物理攻击 +30，怒气回复速度 +50%'
      }
    }
  },

  /**
   * 法师套装 (MAGE_SET)
   * 2件套：魔法攻击 +25
   * 4件套：魔法攻击 +35，魔法防御 +20
   */
  MAGE_SET: {
    id: 'MAGE_SET',
    name: 'Mage Set',
    nameZh: '法师套装',
    pieces: {
      2: {
        stats: {
          m_atk: 25
        },
        description: '魔法攻击 +25',
        descriptionZh: '魔法攻击 +25'
      },
      4: {
        stats: {
          m_atk: 35,
          m_def: 20
        },
        description: '魔法攻击 +35，魔法防御 +20',
        descriptionZh: '魔法攻击 +35，魔法防御 +20'
      }
    }
  },

  /**
   * 守护者套装 (GUARDIAN_SET)
   * 2件套：物理防御 +30
   * 4件套：物理防御 +40，将20%的护甲转化为攻击力
   */
  GUARDIAN_SET: {
    id: 'GUARDIAN_SET',
    name: 'Guardian Set',
    nameZh: '守护者套装',
    pieces: {
      2: {
        stats: {
          p_def: 30
        },
        description: '物理防御 +30',
        descriptionZh: '物理防御 +30'
      },
      4: {
        stats: {
          p_def: 40
        },
        conversions: {
          p_def_to_p_atk: 0.2 // 将20%的护甲转化为物理攻击
        },
        description: '物理防御 +40，将20%的护甲转化为攻击力',
        descriptionZh: '物理防御 +40，将20%的护甲转化为攻击力'
      }
    }
  }
};

/**
 * 获取套装配置
 * @param {string} setId - 套装ID
 * @returns {Object|null} 套装配置
 */
export function getSetConfig(setId) {
  return EQUIPMENT_SETS[setId] || null;
}

/**
 * 获取所有套装ID列表
 * @returns {Array<string>} 套装ID数组
 */
export function getAllSetIds() {
  return Object.keys(EQUIPMENT_SETS);
}

