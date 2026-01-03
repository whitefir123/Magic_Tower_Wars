// src/data/artifacts.js

// 遗物图标资源
const ICON_URLS = {
    MERCHANTS_RING: 'https://i.postimg.cc/mkdVg1cB/ring1.png',
    VAMPIRE_FANG: 'https://i.postimg.cc/mr0vTJxB/guyalian1.png',
    THUNDER_CORE: 'https://i.postimg.cc/65yfh328/core1.png',
    CURSED_DICE: 'https://i.postimg.cc/ydpSJmTM/touzi1.png'
};

export const ARTIFACTS = {
  MERCHANTS_RING: {
    id: 'MERCHANTS_RING',
    name: '贪婪戒指',
    desc: '商店物品价格降低 20%，且刷新商店免费。(暂未实装商店逻辑)',
    rarity: 'RARE',
    icon: ICON_URLS.MERCHANTS_RING,
    type: 'ECONOMY',
    hooks: {}
  },

  VAMPIRE_FANG: {
    id: 'VAMPIRE_FANG',
    name: '吸血鬼之牙',
    desc: '击杀敌人时，恢复 5% 最大生命值。',
    rarity: 'EPIC',
    icon: ICON_URLS.VAMPIRE_FANG,
    type: 'SURVIVAL',
    hooks: {
      onKill: (player, monster, context) => {
        const healAmount = Math.floor(player.stats.maxHp * 0.05);
        if (healAmount > 0) {
          player.heal(healAmount);
          if (window.game && window.game.ui) {
             window.game.ui.logMessage(`${player.charConfig?.name || '玩家'} 通过 [吸血鬼之牙] 恢复了 ${healAmount} HP`, 'gain');
          }
        }
      }
    }
  },

  THUNDER_CORE: {
    id: 'THUNDER_CORE',
    name: '雷霆核心',
    desc: '造成暴击时，必定触发一道连锁闪电，造成 50% 攻击力的伤害。',
    rarity: 'LEGENDARY',
    icon: ICON_URLS.THUNDER_CORE,
    type: 'COMBAT',
    hooks: {
      // context 包含 isCrit, damageMultiplier 等
      onHit: (player, monster, context) => {
        if (context && context.isCrit) {
          // ✅ FIX: 安全增强 - 添加可选链和判空，防止在极少数初始化边缘情况下报错
          const game = window.game;
          if (!game) return;
          
          const CombatSystem = game.combatSystem; 
          if (CombatSystem && typeof CombatSystem.executeLightningChain === 'function') {
             // 使用当前伤害作为基准，如果没有则使用玩家总攻击力
             const totalStats = player && player.getTotalStats ? player.getTotalStats() : (player?.stats || {});
             const baseDamage = context.damage || Math.max(totalStats.p_atk || 0, totalStats.m_atk || 0);
             CombatSystem.executeLightningChain(player, monster, { damage: baseDamage });
          }
        }
      }
    }
  },

  CURSED_DICE: {
    id: 'CURSED_DICE',
    name: '恶魔骰子',
    desc: '造成的最终伤害在 50% 到 150% 之间随机波动。',
    rarity: 'CURSED',
    icon: ICON_URLS.CURSED_DICE,
    type: 'SPECIAL',
    hooks: {
      // 修改 context.damageMultiplier
      onBeforeAttack: (player, monster, context) => {
        // 生成 0.5 到 1.5 之间的随机数
        const roll = Math.random() + 0.5; 
        const multiplier = parseFloat(roll.toFixed(2));
        
        // 修改传入的 context 对象
        if (context.damageMultiplier !== undefined) {
           context.damageMultiplier *= multiplier;
        } else {
           context.damageMultiplier = multiplier;
        }

        if (window.game && window.game.ui) {
            // 只有波动较大时才提示，避免刷屏
            if (multiplier > 1.3) {
                window.game.ui.logMessage(`[恶魔骰子] 幸运！伤害倍率 x${multiplier}`, 'gain');
            } else if (multiplier < 0.7) {
                window.game.ui.logMessage(`[恶魔骰子] 厄运... 伤害倍率 x${multiplier}`, 'combat');
            }
        }
      }
    }
  }
};

