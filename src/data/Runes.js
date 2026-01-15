/**
 * 命运符文系统 2.1 - 符文数据定义
 * 
 * 符文类型：
 * - STAT: 基础属性提升（物攻、物防、生命等）
 * - MECHANIC: 战斗机制（闪电链、吸血、处决等）
 * - CURSE: 诅咒（负面效果但可能有正面收益）
 * 
 * 稀有度：
 * - COMMON: 普通
 * - RARE: 稀有
 * - LEGENDARY: 传说
 * - CURSED: 诅咒（特殊稀有度，通常伴随负面效果）
 */

/**
 * 符文数据结构：
 * {
 *   id: string,              // 唯一标识符
 *   name: string,            // 英文名称
 *   nameZh: string,          // 中文名称
 *   type: 'STAT' | 'MECHANIC' | 'CURSE',
 *   rarity: 'COMMON' | 'RARE' | 'LEGENDARY' | 'CURSED',
 *   description: string,      // 描述文本（支持动态数值，如 {{value}}）
 *   onObtain: (player) => {}, // 获取时立即触发的效果
 *   hooks: {                  // 战斗钩子配置（可选）
 *     onHit?: (attacker, defender, context) => {},
 *     onKill?: (attacker, defender, context) => {},
 *     onDamaged?: (attacker, defender, context) => {},
 *     onBeforeAttack?: (attacker, defender, context) => {}
 *   }
 * }
 */

export const RUNE_POOL = [
  // ========== STAT 类符文 - 基础属性提升 ==========
  
  // 物攻类
  {
    id: 'might',
    name: 'Might',
    nameZh: '蛮力',
    type: 'STAT',
    rarity: 'COMMON',
    spawnWeight: 1.0,
    description: '物理攻击力 +{{value}}',
    onObtain: (player, value = 1) => {
      // ✅ FIX: 不直接修改 player.stats，只更新 runeState.bonusStats
      // 实际属性加成在 getTotalStats() 中通过 bonusStats 计算
      if (!player.runeState) {
        player.runeState = {
          effects: {},
          bonusStats: { p_atk: 0, m_atk: 0, p_def: 0, m_def: 0, hp: 0, crit_rate: 0, dodge: 0, gold_rate: 0 }
        };
      }
      if (!player.runeState.bonusStats) {
        player.runeState.bonusStats = { p_atk: 0, m_atk: 0, p_def: 0, m_def: 0, hp: 0, crit_rate: 0, dodge: 0, gold_rate: 0 };
      }
      player.runeState.bonusStats.p_atk = (player.runeState.bonusStats.p_atk || 0) + value;
    }
  },
  
  {
    id: 'brutal_might',
    name: 'Brutal Might',
    nameZh: '狂暴蛮力',
    type: 'STAT',
    rarity: 'RARE',
    spawnWeight: 1.0,
    description: '物理攻击力 +{{value}}',
    onObtain: (player, value = 3) => {
      // ✅ FIX: 不直接修改 player.stats，只更新 runeState.bonusStats
      if (!player.runeState) {
        player.runeState = {
          effects: {},
          bonusStats: { p_atk: 0, m_atk: 0, p_def: 0, m_def: 0, hp: 0, crit_rate: 0, dodge: 0, gold_rate: 0 }
        };
      }
      if (!player.runeState.bonusStats) {
        player.runeState.bonusStats = { p_atk: 0, m_atk: 0, p_def: 0, m_def: 0, hp: 0, crit_rate: 0, dodge: 0, gold_rate: 0 };
      }
      player.runeState.bonusStats.p_atk = (player.runeState.bonusStats.p_atk || 0) + value;
    }
  },
  
  // 物防类
  {
    id: 'iron_skin',
    name: 'Iron Skin',
    nameZh: '铁壁',
    type: 'STAT',
    rarity: 'COMMON',
    spawnWeight: 1.0,
    description: '物理防御力 +{{value}}',
    onObtain: (player, value = 1) => {
      // ✅ FIX: 不直接修改 player.stats，只更新 runeState.bonusStats
      if (!player.runeState) {
        player.runeState = {
          effects: {},
          bonusStats: { p_atk: 0, m_atk: 0, p_def: 0, m_def: 0, hp: 0, crit_rate: 0, dodge: 0, gold_rate: 0 }
        };
      }
      if (!player.runeState.bonusStats) {
        player.runeState.bonusStats = { p_atk: 0, m_atk: 0, p_def: 0, m_def: 0, hp: 0, crit_rate: 0, dodge: 0, gold_rate: 0 };
      }
      player.runeState.bonusStats.p_def = (player.runeState.bonusStats.p_def || 0) + value;
    }
  },
  
  {
    id: 'fortress',
    name: 'Fortress',
    nameZh: '堡垒',
    type: 'STAT',
    rarity: 'RARE',
    spawnWeight: 1.0,
    description: '物理防御力 +{{value}}',
    onObtain: (player, value = 3) => {
      // ✅ FIX: 不直接修改 player.stats，只更新 runeState.bonusStats
      if (!player.runeState) {
        player.runeState = {
          effects: {},
          bonusStats: { p_atk: 0, m_atk: 0, p_def: 0, m_def: 0, hp: 0, crit_rate: 0, dodge: 0, gold_rate: 0 }
        };
      }
      if (!player.runeState.bonusStats) {
        player.runeState.bonusStats = { p_atk: 0, m_atk: 0, p_def: 0, m_def: 0, hp: 0, crit_rate: 0, dodge: 0, gold_rate: 0 };
      }
      player.runeState.bonusStats.p_def = (player.runeState.bonusStats.p_def || 0) + value;
    }
  },
  
  // 魔攻类
  {
    id: 'arcana',
    name: 'Arcana',
    nameZh: '奥术',
    type: 'STAT',
    rarity: 'COMMON',
    spawnWeight: 1.0,
    description: '魔法攻击力 +{{value}}',
    onObtain: (player, value = 1) => {
      // ✅ FIX: 不直接修改 player.stats，只更新 runeState.bonusStats
      if (!player.runeState) {
        player.runeState = {
          effects: {},
          bonusStats: { p_atk: 0, m_atk: 0, p_def: 0, m_def: 0, hp: 0, crit_rate: 0, dodge: 0, gold_rate: 0 }
        };
      }
      if (!player.runeState.bonusStats) {
        player.runeState.bonusStats = { p_atk: 0, m_atk: 0, p_def: 0, m_def: 0, hp: 0, crit_rate: 0, dodge: 0, gold_rate: 0 };
      }
      player.runeState.bonusStats.m_atk = (player.runeState.bonusStats.m_atk || 0) + value;
    }
  },
  
  {
    id: 'arcane_power',
    name: 'Arcane Power',
    nameZh: '奥术之力',
    type: 'STAT',
    rarity: 'RARE',
    spawnWeight: 1.0,
    description: '魔法攻击力 +{{value}}',
    onObtain: (player, value = 3) => {
      // ✅ FIX: 不直接修改 player.stats，只更新 runeState.bonusStats
      if (!player.runeState) {
        player.runeState = {
          effects: {},
          bonusStats: { p_atk: 0, m_atk: 0, p_def: 0, m_def: 0, hp: 0, crit_rate: 0, dodge: 0, gold_rate: 0 }
        };
      }
      if (!player.runeState.bonusStats) {
        player.runeState.bonusStats = { p_atk: 0, m_atk: 0, p_def: 0, m_def: 0, hp: 0, crit_rate: 0, dodge: 0, gold_rate: 0 };
      }
      player.runeState.bonusStats.m_atk = (player.runeState.bonusStats.m_atk || 0) + value;
    }
  },
  
  // 魔防类
  {
    id: 'ward',
    name: 'Ward',
    nameZh: '护盾',
    type: 'STAT',
    rarity: 'COMMON',
    spawnWeight: 1.0,
    description: '魔法防御力 +{{value}}',
    onObtain: (player, value = 1) => {
      // ✅ FIX: 不直接修改 player.stats，只更新 runeState.bonusStats
      if (!player.runeState) {
        player.runeState = {
          effects: {},
          bonusStats: { p_atk: 0, m_atk: 0, p_def: 0, m_def: 0, hp: 0, crit_rate: 0, dodge: 0, gold_rate: 0 }
        };
      }
      if (!player.runeState.bonusStats) {
        player.runeState.bonusStats = { p_atk: 0, m_atk: 0, p_def: 0, m_def: 0, hp: 0, crit_rate: 0, dodge: 0, gold_rate: 0 };
      }
      player.runeState.bonusStats.m_def = (player.runeState.bonusStats.m_def || 0) + value;
    }
  },
  
  {
    id: 'barrier',
    name: 'Barrier',
    nameZh: '屏障',
    type: 'STAT',
    rarity: 'RARE',
    spawnWeight: 1.0,
    description: '魔法防御力 +{{value}}',
    onObtain: (player, value = 3) => {
      // ✅ FIX: 不直接修改 player.stats，只更新 runeState.bonusStats
      if (!player.runeState) {
        player.runeState = {
          effects: {},
          bonusStats: { p_atk: 0, m_atk: 0, p_def: 0, m_def: 0, hp: 0, crit_rate: 0, dodge: 0, gold_rate: 0 }
        };
      }
      if (!player.runeState.bonusStats) {
        player.runeState.bonusStats = { p_atk: 0, m_atk: 0, p_def: 0, m_def: 0, hp: 0, crit_rate: 0, dodge: 0, gold_rate: 0 };
      }
      player.runeState.bonusStats.m_def = (player.runeState.bonusStats.m_def || 0) + value;
    }
  },
  
  // 生命类
  {
    id: 'vitality',
    name: 'Vitality',
    nameZh: '活力',
    type: 'STAT',
    rarity: 'COMMON',
    spawnWeight: 1.0,
    description: '最大生命值 +{{value}} 并回复 {{value}} 生命',
    onObtain: (player, value = 10) => {
      // ✅ FIX: 修复 vitality 符文的双重叠加风险 - 只更新 bonusStats，不直接修改 player.stats.maxHp
      // getTotalStats() 会通过 bonusStats.hp 累加到 total.maxHp，然后我们需要同步更新 player.stats.maxHp
      if (!player.stats) player.stats = {};
      if (!player.runeState) {
        player.runeState = {
          effects: {},
          bonusStats: { p_atk: 0, m_atk: 0, p_def: 0, m_def: 0, hp: 0, crit_rate: 0, dodge: 0, gold_rate: 0 }
        };
      }
      if (!player.runeState.bonusStats) {
        player.runeState.bonusStats = { p_atk: 0, m_atk: 0, p_def: 0, m_def: 0, hp: 0, crit_rate: 0, dodge: 0, gold_rate: 0 };
      }
      // 更新 bonusStats（用于 getTotalStats 计算）
      player.runeState.bonusStats.hp = (player.runeState.bonusStats.hp || 0) + value;
      // ✅ FIX: 同步更新 player.stats.maxHp（用于即时显示和血量上限），但不直接累加，而是通过 getTotalStats 计算
      // 获取当前总属性（包含所有加成）
      const totalStats = player.getTotalStats ? player.getTotalStats() : player.stats;
      const newMaxHp = totalStats.maxHp;
      const oldMaxHp = player.stats.maxHp || 100;
      const hpIncrease = newMaxHp - oldMaxHp;
      // 更新 maxHp 和 hp（即时反馈）
      player.stats.maxHp = newMaxHp;
      player.stats.hp = Math.min(newMaxHp, (player.stats.hp || 0) + hpIncrease);
    }
  },
  
  {
    id: 'life_essence',
    name: 'Life Essence',
    nameZh: '生命精华',
    type: 'STAT',
    rarity: 'RARE',
    spawnWeight: 1.0,
    description: '最大生命值 +{{value}} 并回复 {{value}} 生命',
    onObtain: (player, value = 30) => {
      // ✅ FIX: 修复 vitality 符文的双重叠加风险 - 只更新 bonusStats，不直接修改 player.stats.maxHp
      // getTotalStats() 会通过 bonusStats.hp 累加到 total.maxHp，然后我们需要同步更新 player.stats.maxHp
      if (!player.stats) player.stats = {};
      if (!player.runeState) {
        player.runeState = {
          effects: {},
          bonusStats: { p_atk: 0, m_atk: 0, p_def: 0, m_def: 0, hp: 0, crit_rate: 0, dodge: 0, gold_rate: 0 }
        };
      }
      if (!player.runeState.bonusStats) {
        player.runeState.bonusStats = { p_atk: 0, m_atk: 0, p_def: 0, m_def: 0, hp: 0, crit_rate: 0, dodge: 0, gold_rate: 0 };
      }
      // 更新 bonusStats（用于 getTotalStats 计算）
      player.runeState.bonusStats.hp = (player.runeState.bonusStats.hp || 0) + value;
      // ✅ FIX: 同步更新 player.stats.maxHp（用于即时显示和血量上限），但不直接累加，而是通过 getTotalStats 计算
      // 获取当前总属性（包含所有加成）
      const totalStats = player.getTotalStats ? player.getTotalStats() : player.stats;
      const newMaxHp = totalStats.maxHp;
      const oldMaxHp = player.stats.maxHp || 100;
      const hpIncrease = newMaxHp - oldMaxHp;
      // 更新 maxHp 和 hp（即时反馈）
      player.stats.maxHp = newMaxHp;
      player.stats.hp = Math.min(newMaxHp, (player.stats.hp || 0) + hpIncrease);
    }
  },
  
  // 暴击类
  {
    id: 'precision',
    name: 'Precision',
    nameZh: '精准',
    type: 'STAT',
    rarity: 'COMMON',
    spawnWeight: 0.3,
    description: '暴击率 +{{value}}%',
    onObtain: (player, value = 2) => {
      // ✅ FIX: STAT类符文只更新 bonusStats，不写入 player.runes（避免双重叠加）
      if (!player.runeState) {
        player.runeState = {
          effects: {},
          bonusStats: { p_atk: 0, m_atk: 0, p_def: 0, m_def: 0, hp: 0, crit_rate: 0, dodge: 0, gold_rate: 0 }
        };
      }
      if (!player.runeState.bonusStats) {
        player.runeState.bonusStats = { p_atk: 0, m_atk: 0, p_def: 0, m_def: 0, hp: 0, crit_rate: 0, dodge: 0, gold_rate: 0 };
      }
      player.runeState.bonusStats.crit_rate = (player.runeState.bonusStats.crit_rate || 0) + value / 100;
    }
  },
  
  {
    id: 'deadly_precision',
    name: 'Deadly Precision',
    nameZh: '致命精准',
    type: 'STAT',
    rarity: 'RARE',
    spawnWeight: 0.3,
    description: '暴击率 +{{value}}%',
    onObtain: (player, value = 6) => {
      // ✅ FIX: STAT类符文只更新 bonusStats，不写入 player.runes（避免双重叠加）
      if (!player.runeState) {
        player.runeState = {
          effects: {},
          bonusStats: { p_atk: 0, m_atk: 0, p_def: 0, m_def: 0, hp: 0, crit_rate: 0, dodge: 0, gold_rate: 0 }
        };
      }
      if (!player.runeState.bonusStats) {
        player.runeState.bonusStats = { p_atk: 0, m_atk: 0, p_def: 0, m_def: 0, hp: 0, crit_rate: 0, dodge: 0, gold_rate: 0 };
      }
      player.runeState.bonusStats.crit_rate = (player.runeState.bonusStats.crit_rate || 0) + value / 100;
    }
  },
  
  {
    id: 'assassins_mark',
    name: "Assassin's Mark",
    nameZh: '刺客印记',
    type: 'STAT',
    rarity: 'LEGENDARY',
    spawnWeight: 0.2,
    description: '暴击率 +{{value}}%，暴击伤害 +50%',
    onObtain: (player, value = 10) => {
      // ✅ FIX: LEGENDARY符文特殊处理 - 暴击率只加一次（通过bonusStats），暴击伤害加成通过player.runes处理
      if (!player.runeState) {
        player.runeState = {
          effects: {},
          bonusStats: { p_atk: 0, m_atk: 0, p_def: 0, m_def: 0, hp: 0, crit_rate: 0, dodge: 0, gold_rate: 0 }
        };
      }
      if (!player.runeState.bonusStats) {
        player.runeState.bonusStats = { p_atk: 0, m_atk: 0, p_def: 0, m_def: 0, hp: 0, crit_rate: 0, dodge: 0, gold_rate: 0 };
      }
      // 暴击率只加一次（通过bonusStats）
      player.runeState.bonusStats.crit_rate = (player.runeState.bonusStats.crit_rate || 0) + value / 100;
      
      // 暴击伤害加成（通过player.runes处理，用于getTotalStats第五阶段）
      if (!player.runes) player.runes = {};
      if (!player.runes.crit_dmg_bonus) player.runes.crit_dmg_bonus = 0;
      player.runes.crit_dmg_bonus = (player.runes.crit_dmg_bonus || 0) + 0.5;
    }
  },
  
  // 闪避类
  {
    id: 'agility',
    name: 'Agility',
    nameZh: '敏捷',
    type: 'STAT',
    rarity: 'COMMON',
    spawnWeight: 0.3,
    description: '闪避率 +{{value}}%',
    onObtain: (player, value = 2) => {
      // ✅ FIX: STAT类符文只更新 bonusStats，不写入 player.runes（避免双重叠加）
      if (!player.runeState) {
        player.runeState = {
          effects: {},
          bonusStats: { p_atk: 0, m_atk: 0, p_def: 0, m_def: 0, hp: 0, crit_rate: 0, dodge: 0, gold_rate: 0 }
        };
      }
      if (!player.runeState.bonusStats) {
        player.runeState.bonusStats = { p_atk: 0, m_atk: 0, p_def: 0, m_def: 0, hp: 0, crit_rate: 0, dodge: 0, gold_rate: 0 };
      }
      player.runeState.bonusStats.dodge = (player.runeState.bonusStats.dodge || 0) + value / 100;
    }
  },
  
  {
    id: 'phantom_step',
    name: 'Phantom Step',
    nameZh: '幻影步',
    type: 'STAT',
    rarity: 'RARE',
    spawnWeight: 0.3,
    description: '闪避率 +{{value}}%',
    onObtain: (player, value = 5) => {
      // ✅ FIX: STAT类符文只更新 bonusStats，不写入 player.runes（避免双重叠加）
      if (!player.runeState) {
        player.runeState = {
          effects: {},
          bonusStats: { p_atk: 0, m_atk: 0, p_def: 0, m_def: 0, hp: 0, crit_rate: 0, dodge: 0, gold_rate: 0 }
        };
      }
      if (!player.runeState.bonusStats) {
        player.runeState.bonusStats = { p_atk: 0, m_atk: 0, p_def: 0, m_def: 0, hp: 0, crit_rate: 0, dodge: 0, gold_rate: 0 };
      }
      player.runeState.bonusStats.dodge = (player.runeState.bonusStats.dodge || 0) + value / 100;
    }
  },
  
  // ========== MECHANIC 类符文 - 战斗机制 ==========
  
  // 闪电链
  {
    id: 'thunder',
    name: 'Thunder',
    nameZh: '雷霆',
    type: 'MECHANIC',
    rarity: 'RARE',
    spawnWeight: 0.4,
    description: '攻击时有 {{value}}% 概率触发闪电链，对目标周围敌人造成 {{chainDamage}}% 攻击力的魔法伤害',
    onObtain: (player) => {
      // 初始化符文数据
      if (!player.runes) player.runes = {};
      if (!player.runes.thunder) {
        player.runes.thunder = {
          chance: 0.12, // 12% 触发概率
          chainDamage: 0.6 // 60% 攻击力伤害
        };
      }
    },
    hooks: {
      onHit: (attacker, defender, context) => {
        const game = window.game;
        if (!attacker.runes || !attacker.runes.thunder) return;
        
        const { chance, chainDamage } = attacker.runes.thunder;
        if (Math.random() < chance) {
          // 触发闪电链
          const pTotals = attacker.getTotalStats ? attacker.getTotalStats() : attacker.stats;
          const baseDamage = Math.max(pTotals.p_atk || 0, pTotals.m_atk || 0);
          const chainDmg = Math.floor(baseDamage * chainDamage);
          
          // 查找目标周围的敌人（3x3范围）
          const nearbyMonsters = [];
          if (game && game.map && game.map.monsters) {
            for (const monster of game.map.monsters) {
              if (monster === defender || !monster.stats || monster.stats.hp <= 0) continue;
              const dist = Math.abs(monster.x - defender.x) + Math.abs(monster.y - defender.y);
              if (dist <= 1 && dist > 0) { // 相邻但不是目标本身
                nearbyMonsters.push(monster);
              }
            }
          }
          
          // 对周围敌人造成伤害
          for (const monster of nearbyMonsters) {
            // ✅ FIX: 强制添加实体有效性检查，防止怪物在循环过程中被移除
            if (!monster || !monster.stats || monster.stats.hp <= 0) continue;
            if (!game.map || !game.map.monsters || !game.map.monsters.includes(monster)) continue;
            
            const actualDmg = Math.max(1, chainDmg - (monster.stats.m_def || 0));
            monster.stats.hp -= actualDmg;
            
            // 显示伤害数字
            if (game.floatingTextPool && game.settings && game.settings.showDamageNumbers !== false) {
              const offsetX = (Math.random() - 0.5) * 15;
              const offsetY = -10 - Math.random() * 10;
              game.floatingTextPool.create(monster.visualX + offsetX, monster.visualY + offsetY, actualDmg, '#00ffff');
            }
            
            // 检查是否击杀
            if (monster.stats.hp <= 0) {
              if (game.combatSystem && game.combatSystem.handleMonsterDeath) {
                game.combatSystem.handleMonsterDeath(monster, attacker);
              }
            }
          }
          
          // 显示闪电链特效提示
          if (game.ui && game.ui.logMessage) {
            game.ui.logMessage(`雷霆触发！`, 'gain');
          }
        }
      }
    }
  },
  
  // 吸血
  {
    id: 'vampire',
    name: 'Vampire',
    nameZh: '吸血',
    type: 'MECHANIC',
    rarity: 'RARE',
    spawnWeight: 0.4,
    description: '攻击时回复造成伤害的 {{value}}% 生命值',
    onObtain: (player) => {
      if (!player.runes) player.runes = {};
      if (!player.runes.vampire) {
        player.runes.vampire = {
          lifesteal: 0.08 // 8% 吸血率
        };
      }
    },
    hooks: {
      onHit: (attacker, defender, context) => {
        if (!attacker.runes || !attacker.runes.vampire) return;
        if (!context.damage || context.damage <= 0) return;
        
        const { lifesteal } = attacker.runes.vampire;
        const healAmount = Math.floor(context.damage * lifesteal);
        
        if (healAmount > 0 && attacker.stats) {
          const oldHp = attacker.stats.hp || 0;
          attacker.stats.hp = Math.min(attacker.stats.maxHp || 100, oldHp + healAmount);
          
          // 显示治疗数字
          const game = window.game;
          if (game.floatingTextPool && game.settings && game.settings.showDamageNumbers !== false) {
            const offsetX = (Math.random() - 0.5) * 15;
            const offsetY = -10 - Math.random() * 10;
            game.floatingTextPool.create(attacker.visualX + offsetX, attacker.visualY + offsetY, `+${healAmount}`, '#00ff00');
          }
        }
      }
    }
  },
  
  // 处决（对低血量敌人造成额外伤害）
  {
    id: 'execute',
    name: 'Execute',
    nameZh: '处决',
    type: 'MECHANIC',
    rarity: 'RARE',
    spawnWeight: 0.4,
    description: '对生命值低于 {{value}}% 的敌人造成额外 {{executeDamage}}% 伤害',
    onObtain: (player) => {
      if (!player.runes) player.runes = {};
      if (!player.runes.execute) {
        player.runes.execute = {
          threshold: 0.2, // 20% 血量阈值
          damageBonus: 0.5 // 50% 额外伤害
        };
      }
    },
    hooks: {
      onBeforeAttack: (attacker, defender, context) => {
        if (!attacker.runes || !attacker.runes.execute) return;
        // ✅ FIX: 强制添加实体有效性检查
        if (!defender || !defender.stats || defender.stats.hp <= 0 || !defender.stats.maxHp) return;
        
        const game = window.game;
        // ✅ FIX: 检查怪物是否仍在 map.monsters 中
        if (game && game.map && game.map.monsters && !game.map.monsters.includes(defender)) return;
        
        const { threshold, damageBonus } = attacker.runes.execute;
        const hpPercent = defender.stats.hp / defender.stats.maxHp;
        
        if (hpPercent <= threshold) {
          // 应用额外伤害加成
          if (!context.damageMultiplier) context.damageMultiplier = 1;
          context.damageMultiplier = (context.damageMultiplier || 1) * (1 + damageBonus);
          
          // 显示处决提示
          if (game.ui && game.ui.logMessage) {
            game.ui.logMessage(`处决触发！`, 'gain');
          }
        }
      }
    }
  },
  
  // 双重施法
  {
    id: 'multicast',
    name: 'Multicast',
    nameZh: '多重施法',
    type: 'MECHANIC',
    rarity: 'LEGENDARY',
    spawnWeight: 0.4,
    description: '攻击时有 {{value}}% 概率触发双重攻击',
    onObtain: (player) => {
      if (!player.runes) player.runes = {};
      if (!player.runes.multicast) {
        player.runes.multicast = {
          chance: 0.25 // 25% 触发概率
        };
      }
    },
    hooks: {
      onHit: (attacker, defender, context) => {
        if (!attacker.runes || !attacker.runes.multicast) return;
        
        const { chance } = attacker.runes.multicast;
        if (Math.random() < chance) {
          // 触发双重攻击
          const game = window.game;
          if (game.combatSystem && game.combatSystem.checkInteraction) {
            // ✅ FIX: 修复多重施法的异步风险 - 添加实体有效性检查
            // 延迟执行第二次攻击，避免立即触发导致的问题
            setTimeout(() => {
              // ✅ FIX: 强制添加实体有效性检查，防止异步回调时实体已被移除
              if (!game || !game.combatSystem || !game.combatSystem.checkInteraction) return;
              if (!attacker || !attacker.stats || attacker.stats.hp <= 0) return; // 玩家已死亡
              if (!defender || !defender.stats || defender.stats.hp <= 0) return; // 怪物已死亡
              if (!game.map || !game.map.monsters || !game.map.monsters.includes(defender)) return; // 怪物已被移除
              
              // 执行第二次攻击
              game.combatSystem.checkInteraction(attacker, defender);
            }, 100);
            
            // 显示提示
            if (game.ui && game.ui.logMessage) {
              game.ui.logMessage(`多重施法触发！`, 'gain');
            }
          }
        }
      }
    }
  },
  
  // ========== CURSE 类符文 - 诅咒 ==========
  
  // 玻璃大炮（大幅加攻，扣除最大生命）
  {
    id: 'glass_cannon',
    name: 'Glass Cannon',
    nameZh: '玻璃大炮',
    type: 'CURSE',
    rarity: 'CURSED',
    spawnWeight: 0.2,
    description: '物理攻击力 +{{value}}，但最大生命值 -{{hpLoss}}%',
    onObtain: (player, value = 8) => {
      if (!player.stats) player.stats = {};
      // ✅ FIX: 攻击力加成只更新 bonusStats，不直接修改 player.stats
      if (!player.runeState) {
        player.runeState = {
          effects: {},
          bonusStats: { p_atk: 0, m_atk: 0, p_def: 0, m_def: 0, hp: 0, crit_rate: 0, dodge: 0, gold_rate: 0 }
        };
      }
      if (!player.runeState.bonusStats) {
        player.runeState.bonusStats = { p_atk: 0, m_atk: 0, p_def: 0, m_def: 0, hp: 0, crit_rate: 0, dodge: 0, gold_rate: 0 };
      }
      player.runeState.bonusStats.p_atk = (player.runeState.bonusStats.p_atk || 0) + value;
      
      // 扣除最大生命值（25%）（需要即时修改，因为这是负面效果）
      const hpLossPercent = 0.25;
      const maxHp = player.stats.maxHp || 100;
      const hpLoss = Math.floor(maxHp * hpLossPercent);
      player.stats.maxHp = Math.max(10, maxHp - hpLoss);
      
      // 如果当前生命值超过新的最大生命值，调整当前生命值
      if (player.stats.hp > player.stats.maxHp) {
        player.stats.hp = player.stats.maxHp;
      }
      
      // 存储诅咒数据用于显示
      if (!player.runes) player.runes = {};
      if (!player.runes.curses) player.runes.curses = [];
      player.runes.curses.push('glass_cannon');
    }
  },
  
  // 贪婪（金币翻倍，但受伤增加）
  {
    id: 'greed',
    name: 'Greed',
    nameZh: '贪婪',
    type: 'CURSE',
    rarity: 'CURSED',
    spawnWeight: 0.2,
    description: '获得的金币翻倍，但受到的伤害 +{{damageIncrease}}%',
    onObtain: (player) => {
      if (!player.runes) player.runes = {};
      if (!player.runes.greed) {
        player.runes.greed = {
          goldMultiplier: 2.0, // 金币翻倍
          damageTakenMultiplier: 1.25 // 受到伤害增加25%
        };
      }
      
      // 存储诅咒数据用于显示
      if (!player.runes.curses) player.runes.curses = [];
      player.runes.curses.push('greed');
    },
    hooks: {
      onDamaged: (attacker, defender, context) => {
        // 注意：这里 defender 是玩家，attacker 是怪物
        if (!defender.runes || !defender.runes.greed) return;
        
        const { damageTakenMultiplier } = defender.runes.greed;
        if (context.damage) {
          // 增加受到的伤害
          context.damage = Math.floor(context.damage * damageTakenMultiplier);
        }
      }
    }
  },
  
  // ========== 攻击速度类符文 ==========
  
  // Swiftness (Common)
  {
    id: 'swiftness',
    name: 'Swiftness',
    nameZh: '迅捷',
    type: 'STAT',
    rarity: 'COMMON',
    spawnWeight: 1.0,
    description: '攻击速度 +{{value}}',
    onObtain: (player, value = 1) => {
      // ✅ FIX: 将外部传入的通用数值转换为攻击速度加成（基础值 0.10）
      const baseValue = 0.10;
      const actualValue = baseValue * value;
      if (!player.runeState) {
        player.runeState = {
          effects: {},
          bonusStats: { p_atk: 0, m_atk: 0, p_def: 0, m_def: 0, hp: 0, crit_rate: 0, dodge: 0, gold_rate: 0, atk_speed: 0 }
        };
      }
      if (!player.runeState.bonusStats) {
        player.runeState.bonusStats = { p_atk: 0, m_atk: 0, p_def: 0, m_def: 0, hp: 0, crit_rate: 0, dodge: 0, gold_rate: 0, atk_speed: 0 };
      }
      player.runeState.bonusStats.atk_speed = (player.runeState.bonusStats.atk_speed || 0) + actualValue;
    }
  },
  
  // Zeal (Rare)
  {
    id: 'zeal',
    name: 'Zeal',
    nameZh: '狂热',
    type: 'STAT',
    rarity: 'RARE',
    spawnWeight: 1.0,
    description: '攻击速度 +{{value}}',
    onObtain: (player, value = 1) => {
      // ✅ FIX: 将外部传入的通用数值转换为攻击速度加成（基础值 0.25）
      const baseValue = 0.25;
      const actualValue = baseValue * value;
      if (!player.runeState) {
        player.runeState = {
          effects: {},
          bonusStats: { p_atk: 0, m_atk: 0, p_def: 0, m_def: 0, hp: 0, crit_rate: 0, dodge: 0, gold_rate: 0, atk_speed: 0 }
        };
      }
      if (!player.runeState.bonusStats) {
        player.runeState.bonusStats = { p_atk: 0, m_atk: 0, p_def: 0, m_def: 0, hp: 0, crit_rate: 0, dodge: 0, gold_rate: 0, atk_speed: 0 };
      }
      player.runeState.bonusStats.atk_speed = (player.runeState.bonusStats.atk_speed || 0) + actualValue;
    }
  },
  
  // Godspeed (Legendary)
  {
    id: 'godspeed',
    name: 'Godspeed',
    nameZh: '神速',
    type: 'STAT',
    rarity: 'LEGENDARY',
    spawnWeight: 0.4,
    description: '攻击速度 +{{value}}，移动速度 +0.1',
    onObtain: (player, value = 1) => {
      // ✅ FIX: 将外部传入的通用数值转换为攻击速度加成（基础值 0.50）
      const baseValue = 0.50;
      const actualValue = baseValue * value;
      if (!player.runeState) {
        player.runeState = {
          effects: {},
          bonusStats: { p_atk: 0, m_atk: 0, p_def: 0, m_def: 0, hp: 0, crit_rate: 0, dodge: 0, gold_rate: 0, atk_speed: 0 }
        };
      }
      if (!player.runeState.bonusStats) {
        player.runeState.bonusStats = { p_atk: 0, m_atk: 0, p_def: 0, m_def: 0, hp: 0, crit_rate: 0, dodge: 0, gold_rate: 0, atk_speed: 0 };
      }
      player.runeState.bonusStats.atk_speed = (player.runeState.bonusStats.atk_speed || 0) + actualValue;
      
      // 增加移动速度
      if (player.moveSpeed !== undefined) {
        player.moveSpeed = (player.moveSpeed || 0.25) + 0.1;
      }
    }
  },
  
  // Clunky (Cursed)
  {
    id: 'clunky',
    name: 'Clunky',
    nameZh: '笨重',
    type: 'CURSE',
    rarity: 'CURSED',
    spawnWeight: 0.2,
    description: '攻击力 +10%，攻击速度 -0.50',
    onObtain: (player) => {
      if (!player.runeState) {
        player.runeState = {
          effects: {},
          bonusStats: { p_atk: 0, m_atk: 0, p_def: 0, m_def: 0, hp: 0, maxMp: 0, mp_regen: 0, crit_rate: 0, dodge: 0, gold_rate: 0, atk_speed: 0, p_atk_percent: 0, m_atk_percent: 0 }
        };
      }
      if (!player.runeState.bonusStats) {
        player.runeState.bonusStats = { p_atk: 0, m_atk: 0, p_def: 0, m_def: 0, hp: 0, maxMp: 0, mp_regen: 0, crit_rate: 0, dodge: 0, gold_rate: 0, atk_speed: 0, p_atk_percent: 0, m_atk_percent: 0 };
      }
      // 攻击速度 -0.50
      player.runeState.bonusStats.atk_speed = (player.runeState.bonusStats.atk_speed || 0) - 0.50;
      // 攻击力 +10% (百分比加成)
      player.runeState.bonusStats.p_atk_percent = (player.runeState.bonusStats.p_atk_percent || 0) + 0.10;
      player.runeState.bonusStats.m_atk_percent = (player.runeState.bonusStats.m_atk_percent || 0) + 0.10;
      
      // 存储诅咒数据用于显示
      if (!player.runes) player.runes = {};
      if (!player.runes.curses) player.runes.curses = [];
      player.runes.curses.push('clunky');
    }
  },

  // ========= Mana / MP 相关符文 =========
  {
    id: 'clarity',
    name: 'Clarity',
    nameZh: '清明',
    type: 'STAT',
    rarity: 'COMMON',
    spawnWeight: 1.0,
    description: '最大魔力 +{{value}}',
    onObtain: (player, value = 30) => {
      if (!player.stats) player.stats = {};
      if (!player.runeState) {
        player.runeState = {
          effects: {},
          bonusStats: {
            p_atk: 0,
            m_atk: 0,
            p_def: 0,
            m_def: 0,
            hp: 0,
            maxMp: 0,
            mp_regen: 0,
            crit_rate: 0,
            dodge: 0,
            gold_rate: 0,
            atk_speed: 0,
            p_atk_percent: 0,
            m_atk_percent: 0
          }
        };
      }
      if (!player.runeState.bonusStats) {
        player.runeState.bonusStats = {
          p_atk: 0,
          m_atk: 0,
          p_def: 0,
          m_def: 0,
          hp: 0,
          maxMp: 0,
          mp_regen: 0,
          crit_rate: 0,
          dodge: 0,
          gold_rate: 0,
          atk_speed: 0,
          p_atk_percent: 0,
          m_atk_percent: 0
        };
      }

      player.runeState.bonusStats.maxMp = (player.runeState.bonusStats.maxMp || 0) + value;

      // 同步更新玩家当前最大 MP（通过 getTotalStats 计算后的值）
      const totalStats = player.getTotalStats ? player.getTotalStats() : player.stats;
      const newMaxMp = totalStats.maxMp || 0;
      const oldMaxMp = player.stats.maxMp || 0;
      const mpIncrease = newMaxMp - oldMaxMp;

      player.stats.maxMp = newMaxMp;
      // 适度回填当前 MP
      if (mpIncrease > 0) {
        player.stats.mp = Math.min(newMaxMp, (player.stats.mp || 0) + mpIncrease);
      }
    }
  },
  {
    id: 'meditation',
    name: 'Meditation',
    nameZh: '冥想',
    type: 'STAT',
    rarity: 'RARE',
    spawnWeight: 1.0,
    description: '魔力回复 +{{value}}/秒',
    onObtain: (player, value = 2) => {
      if (!player.runeState) {
        player.runeState = {
          effects: {},
          bonusStats: {
            p_atk: 0,
            m_atk: 0,
            p_def: 0,
            m_def: 0,
            hp: 0,
            maxMp: 0,
            mp_regen: 0,
            crit_rate: 0,
            dodge: 0,
            gold_rate: 0,
            atk_speed: 0,
            p_atk_percent: 0,
            m_atk_percent: 0
          }
        };
      }
      if (!player.runeState.bonusStats) {
        player.runeState.bonusStats = {
          p_atk: 0,
          m_atk: 0,
          p_def: 0,
          m_def: 0,
          hp: 0,
          maxMp: 0,
          mp_regen: 0,
          crit_rate: 0,
          dodge: 0,
          gold_rate: 0,
          atk_speed: 0,
          p_atk_percent: 0,
          m_atk_percent: 0
        };
      }

      player.runeState.bonusStats.mp_regen = (player.runeState.bonusStats.mp_regen || 0) + value;
    }
  },
  {
    id: 'soul_siphon',
    name: 'Soul Siphon',
    nameZh: '灵魂虹吸',
    type: 'MECHANIC',
    rarity: 'LEGENDARY',
    spawnWeight: 0.4,
    description: '击杀敌人时回复最大魔力的20%',
    onObtain: (player) => {
      if (!player.runes) player.runes = {};
      if (!player.runes.soul_siphon) {
        player.runes.soul_siphon = {
          mpRestorePercent: 0.2
        };
      }
    },
    hooks: {
      onKill: (attacker, defender, context) => {
        const game = window.game;
        if (!attacker || !attacker.stats) return;
        if (!attacker.runes || !attacker.runes.soul_siphon) return;

        const { mpRestorePercent } = attacker.runes.soul_siphon;
        const totals = attacker.getTotalStats ? attacker.getTotalStats() : attacker.stats;
        const maxMp = totals.maxMp || attacker.stats.maxMp || 0;
        if (maxMp <= 0) return;

        const restore = Math.floor(maxMp * (mpRestorePercent || 0.2));
        if (restore <= 0) return;

        const oldMp = attacker.stats.mp || 0;
        const newMp = Math.min(maxMp, oldMp + restore);
        const actualGain = newMp - oldMp;
        if (actualGain <= 0) return;

        attacker.stats.mp = newMp;

        if (game && game.floatingTextPool && game.floatingTexts && game.settings && game.settings.showDamageNumbers !== false) {
          const pos = attacker.getFloatingTextPosition ? attacker.getFloatingTextPosition() : { x: attacker.visualX, y: attacker.visualY };
          const microScatterY = VISUAL_CONFIG.ENABLE_MICRO_SCATTER ? Math.random() * 5 : 0;
          const mpText = game.floatingTextPool.create(pos.x, pos.y - 15 + microScatterY, `+${actualGain} MP`, '#3399FF');
          game.floatingTexts.push(mpText);
        }

        if (game && game.ui && game.ui.logMessage) {
          game.ui.logMessage(`灵魂虹吸：回复了 ${actualGain} 点魔力`, 'gain');
        }
      }
    }
  }
];

/**
 * 根据稀有度获取符文权重
 * 用于符文抽选时的权重计算
 */
export const RUNE_RARITY_WEIGHTS = {
  COMMON: 10,
  RARE: 3,
  LEGENDARY: 1,
  CURSED: 0.5 // 诅咒符文出现概率较低
};

/**
 * 根据类型获取符文权重
 * 用于符文抽选时的类型偏好
 */
export const RUNE_TYPE_WEIGHTS = {
  STAT: 1.0,
  MECHANIC: 0.8,
  CURSE: 0.3 // 诅咒符文出现概率较低
};

/**
 * 根据稀有度获取符文数值倍率
 * 用于根据层级调整符文效果数值
 */
export const RUNE_RARITY_MULTIPLIERS = {
  COMMON: 1.0,
  RARE: 2.0,
  LEGENDARY: 3.5,
  CURSED: 2.5 // 诅咒符文虽然有负面效果，但正面效果也更强
};

