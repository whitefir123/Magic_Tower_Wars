// CombatSystem.js - 战斗计算逻辑
import { COMBAT_CONFIG, MONSTER_STATS, getEquipmentDropForFloor, getRandomConsumable, ELITE_AFFIXES, ELEMENTS, STATUS_TYPES, ELEMENT_REACTIONS, PENETRATION_CONFIG, CRITICAL_CONFIG, MONSTER_TRAITS, EQUIPMENT_DB, TILE_SIZE } from '../constants.js';
import { WEAPON_MASTERY, COMBO_RESET_TIME } from '../data/combat.js';
import { FloatingText } from '../utils.js';
import { RUNE_POOL } from '../data/Runes.js';

export class CombatSystem {
  /**
   * ✅ v2.0: 处理装备 Hook 系统
   * ✅ v2.1: 扩展支持符文系统 hooks
   * 遍历装备的 uniqueEffect 和 affixes，执行对应的触发器
   * 同时处理符文系统的 hooks
   * @param {Entity} attacker - 攻击者（通常是玩家）
   * @param {Entity} defender - 防御者（通常是怪物或玩家）
   * @param {string} hookType - Hook 类型：'onBeforeAttack', 'onHit', 'onKill', 'onDamaged'
   * @param {Object} context - 上下文信息（伤害值、是否暴击等）
   */
  static processHooks(attacker, defender, hookType, context = {}) {
    const game = window.game;
    if (!attacker) return;
    
    // ========== 处理装备 Hooks ==========
    if (attacker.equipment) {
      // 遍历所有装备
      const equipmentSlots = ['WEAPON', 'ARMOR', 'HELM', 'BOOTS', 'RING', 'AMULET', 'ACCESSORY'];
      
      for (const slot of equipmentSlots) {
        const item = attacker.equipment[slot];
        if (!item || typeof item !== 'object') continue;
        
        // 检查 uniqueEffect
        const uniqueEffect = item.meta?.uniqueEffect;
        if (uniqueEffect && uniqueEffect.id) {
          this.processUniqueEffect(attacker, defender, uniqueEffect, hookType, context);
        }
        
        // 检查 affixes（词缀也可能有触发器）
        const affixes = item.meta?.affixes || [];
        for (const affix of affixes) {
          if (affix.trigger && affix.trigger.type === 'trigger' && affix.trigger.event === hookType) {
            // 词缀触发器
            this.processAffixTrigger(attacker, defender, affix, hookType, context);
          }
        }
      }
    }
    
    // ========== 处理符文系统 Hooks ==========
    // ✅ v2.1: 命运符文系统 2.1 - 符文 hooks 处理
    if (attacker.runeState && attacker.runeState.effects) {
      this.processRuneHooks(attacker, defender, hookType, context);
    }
    
    // ========== 处理遗物系统 Hooks ==========
    if (attacker.relics && attacker.relics.size > 0) {
      for (const relic of attacker.relics.values()) {
        if (relic.hooks && relic.hooks[hookType]) {
          try {
            relic.hooks[hookType](attacker, defender, context);
          } catch (err) {
            console.error(`[CombatSystem] 执行遗物 ${relic.id} 的 ${hookType} hook 时出错:`, err);
          }
        }
      }
    }
  }
  
  /**
   * ✅ v2.1: 处理符文系统 Hooks
   * ✅ FIX: 统一符文 hooks 执行逻辑 - 从 Runes.js 读取并执行 hooks，移除硬编码
   * @param {Entity} attacker - 攻击者（通常是玩家）
   * @param {Entity} defender - 防御者（通常是怪物或玩家）
   * @param {string} hookType - Hook 类型
   * @param {Object} context - 上下文信息
   */
  static processRuneHooks(attacker, defender, hookType, context = {}) {
    const game = window.game;
    // ✅ FIX: 防御性检查 - 确保attacker及其相关属性存在
    if (!attacker || !attacker.runeState || !attacker.runeState.effects) return;
    
    // ✅ FIX: 防御性检查 - 确保defender存在（某些hook需要defender）
    if ((hookType === 'onBeforeAttack' || hookType === 'onHit') && (!defender || !defender.stats)) {
      return;
    }
    
    const effects = attacker.runeState.effects;
    const runes = attacker.runes || {};
    
    // ✅ FIX: 统一符文 hooks 执行逻辑 - 从 RUNE_POOL 中查找符文定义并执行 hooks
    // 遍历所有激活的符文效果
    for (const [runeId, runeLevel] of Object.entries(effects)) {
      if (!runeId || runeLevel <= 0) continue;
      
      // 从 RUNE_POOL 中查找符文定义
      const runeDef = RUNE_POOL.find(r => r.id === runeId);
      if (!runeDef || !runeDef.hooks) continue;
      
      // 检查该符文是否有对应 hookType 的 hook
      const hook = runeDef.hooks[hookType];
      if (!hook || typeof hook !== 'function') continue;
      
      // 执行 hook 函数
      try {
        hook(attacker, defender, context);
      } catch (err) {
        console.error(`[CombatSystem] 执行符文 ${runeId} 的 ${hookType} hook 时出错:`, err);
      }
    }
    
    // ✅ FIX: 保留对特殊符文的兼容性处理（Thunder 需要特殊逻辑）
    // Thunder 的 hook 在 Runes.js 中已经实现，但为了保持一致性，我们也可以保留 executeRuneThunder
    // 实际上，Thunder 的 hook 已经在上面通过统一逻辑执行了，这里可以移除
    // 但为了向后兼容，我们保留 executeRuneThunder 方法，但不再在这里调用
  }
  
  /**
   * ✅ v2.1: 执行符文 Thunder（雷霆）效果
   * @param {Entity} attacker - 攻击者（玩家）
   * @param {Entity} defender - 防御者（被攻击的怪物）
   * @param {Object} context - 上下文
   */
  static executeRuneThunder(attacker, defender, context) {
    const game = window.game;
    // ✅ FIX: 防御性检查 - 确保所有必需对象存在
    if (!game || !game.map || !game.map.monsters) return;
    if (!attacker || !attacker.stats || !defender || !defender.stats) return;
    
    const runes = attacker.runes || {};
    const thunderConfig = runes.thunder;
    if (!thunderConfig) return;
    
    const { chainDamage } = thunderConfig;
    const pTotals = attacker.getTotalStats ? attacker.getTotalStats() : (attacker.stats || {});
    const baseDamage = Math.max(pTotals.p_atk || 0, pTotals.m_atk || 0);
    const chainDmg = Math.floor(baseDamage * chainDamage);
    
    // 查找目标周围的敌人（3x3范围）
    const nearbyMonsters = [];
    for (const monster of game.map.monsters) {
      // ✅ FIX: 防御性检查 - 确保monster及其stats属性完整
      if (!monster || monster === defender || !monster.stats || monster.stats.hp === undefined || monster.stats.hp <= 0) continue;
      if (monster.x === undefined || monster.y === undefined || defender.x === undefined || defender.y === undefined) continue;
      
      const dist = Math.abs(monster.x - defender.x) + Math.abs(monster.y - defender.y);
      if (dist <= 1 && dist > 0) { // 相邻但不是目标本身
        nearbyMonsters.push(monster);
      }
    }
    
    // 对周围敌人造成伤害
    for (const monster of nearbyMonsters) {
      // ✅ FIX: 防御性检查 - 确保monster仍然有效（可能在循环中被移除）
      if (!monster || !monster.stats || monster.stats.hp === undefined || monster.stats.hp <= 0) continue;
      
      const actualDmg = Math.max(1, chainDmg - (monster.stats.m_def || 0));
      monster.stats.hp -= actualDmg;
      
      // ✅ FIX: 累加雷霆连锁伤害到统计（用于排行榜）
      if (game.totalDamageDealt !== undefined) {
        game.totalDamageDealt += actualDmg;
      }
      
      // 显示伤害数字
      if (game.floatingTextPool && game.settings && game.settings.showDamageNumbers !== false) {
        const offsetX = (Math.random() - 0.5) * 15;
        const offsetY = -10 - Math.random() * 10;
        game.floatingTextPool.create(monster.visualX + TILE_SIZE / 2 + offsetX, monster.visualY + offsetY, `⚡${actualDmg}`, '#00ffff');
      }
      
      // 触发受击逻辑
      if (monster.onDamageTaken && typeof monster.onDamageTaken === 'function') {
        monster.onDamageTaken(actualDmg, attacker);
      }
      
      // 检查是否击杀
      if (monster.stats.hp <= 0) {
        if (game.combatSystem && game.combatSystem.handleMonsterDeath) {
          game.combatSystem.handleMonsterDeath(monster, attacker);
        } else {
          // 备用处理：直接调用怪物死亡逻辑
          if (game.map && game.map.handleMonsterDeath) {
            game.map.handleMonsterDeath(monster, attacker);
          }
        }
      }
    }
    
    // 显示闪电链特效提示
    if (game.ui && game.ui.logMessage) {
      game.ui.logMessage(`⚡ 雷霆触发！`, 'gain');
    }
  }
  
  /**
   * ✅ v2.0: 处理传奇特效
   * @param {Entity} attacker - 攻击者
   * @param {Entity} defender - 防御者
   * @param {Object} uniqueEffect - 传奇特效对象 { id, chance, trigger, ... }
   * @param {string} hookType - Hook 类型：'onBeforeAttack', 'onHit', 'onKill', 'onDamaged'
   * @param {Object} context - 上下文
   */
  static processUniqueEffect(attacker, defender, uniqueEffect, hookType, context) {
    const game = window.game;
    if (!game) return;
    
    // 检查触发条件：uniqueEffect.trigger 必须匹配当前的 hookType
    const effectTrigger = uniqueEffect.trigger;
    if (effectTrigger && effectTrigger !== hookType) {
      return; // 不匹配的触发事件
    }
    
    // 如果没有指定 trigger，默认在 onHit 时触发（向后兼容）
    if (!effectTrigger && hookType !== 'onHit') {
      return;
    }
    
    // 检查触发概率
    const chance = uniqueEffect.chance !== undefined ? uniqueEffect.chance : 1.0;
    if (Math.random() >= chance) {
      return; // 未触发
    }
    
    // 执行特效
    const effectId = uniqueEffect.id;
    switch (effectId) {
      case 'LIGHTNING_CHAIN':
        this.executeLightningChain(attacker, defender, context);
        break;
      // 可以在这里添加更多特效
      default:
        console.warn(`[CombatSystem] 未知的传奇特效: ${effectId}`);
    }
  }
  
  /**
   * ✅ v2.0: 处理词缀触发器
   * @param {Entity} attacker - 攻击者
   * @param {Entity} defender - 防御者
   * @param {Object} affix - 词缀对象
   * @param {string} hookType - Hook 类型
   * @param {Object} context - 上下文
   */
  static processAffixTrigger(attacker, defender, affix, hookType, context) {
    // 词缀触发器逻辑（可以扩展）
    // 例如：某些词缀在特定条件下触发额外效果
  }
  
  /**
   * ✅ v2.0: 执行闪电链特效
   * 攻击时有一定概率触发闪电链，对目标周围的敌人造成额外伤害
   * @param {Entity} attacker - 攻击者（玩家）
   * @param {Entity} defender - 防御者（被攻击的怪物）
   * @param {Object} context - 上下文（包含伤害值等）
   */
  static executeLightningChain(attacker, defender, context) {
    const game = window.game;
    if (!game || !game.map || !game.map.monsters) return;
    
    const damage = context.damage || 0;
    const chainDamage = Math.floor(damage * 0.5); // 闪电链造成50%的原始伤害
    const chainRange = 2; // 2格范围
    
    // 查找目标周围的敌人
    const nearbyEnemies = [];
    for (const monster of game.map.monsters) {
      if (monster === defender || monster.stats.hp <= 0) continue;
      
      const distance = Math.abs(monster.x - defender.x) + Math.abs(monster.y - defender.y);
      if (distance <= chainRange) {
        nearbyEnemies.push(monster);
      }
    }
    
    if (nearbyEnemies.length === 0) return; // 没有附近敌人，不触发
    
    // 对每个附近敌人造成伤害
    for (const enemy of nearbyEnemies) {
      enemy.stats.hp -= chainDamage;
      
      // ✅ FIX: 累加闪电链伤害到统计（用于排行榜）
      if (game.totalDamageDealt !== undefined) {
        game.totalDamageDealt += chainDamage;
      }
      
      // 显示伤害数字
      if (game.floatingTextPool && game.settings && game.settings.showDamageNumbers !== false) {
        const offsetX = (Math.random() - 0.5) * 15;
        const offsetY = -10 - Math.random() * 10;
        const chainText = game.floatingTextPool.create(
          enemy.visualX + TILE_SIZE / 2 + offsetX,
          enemy.visualY + offsetY,
          `⚡${chainDamage}`,
          '#ffff00'
        );
        game.floatingTexts.push(chainText);
      }
      
      // 触发受击逻辑
      if (enemy.onDamageTaken && typeof enemy.onDamageTaken === 'function') {
        enemy.onDamageTaken(chainDamage, attacker);
      }
      
      // 检查是否死亡
      if (enemy.stats.hp <= 0) {
        // ✅ v2.0: 处理闪电链击杀的完整奖励结算
        if (attacker === game.player && game.map) {
          const g = enemy.stats.goldYield || enemy.stats.gold || 0;
          const xp = enemy.stats.xpYield || enemy.stats.xp || 0;
          
          // 给予金币奖励（应用 gold_rate 和点石成金）
          if (g > 0) {
            // ✅ 计算金币倍率：基础倍率 + 天赋 gold_rate + 点石成金关键石
            const attackerTotals = attacker.getTotalStats ? attacker.getTotalStats() : attacker.stats;
            const goldRate = attackerTotals.gold_rate || 0;
            const hasGoldenTouch = attacker.activeKeystones && attacker.activeKeystones.includes('GOLDEN_TOUCH');
            const goldMult = 1 + goldRate + (hasGoldenTouch ? 0.3 : 0);
            const finalGold = Math.floor(g * goldMult);
            
            attacker.stats.gold = (attacker.stats.gold || 0) + finalGold;
            if (game.settings && game.settings.showDamageNumbers !== false) {
              const offsetX = (Math.random() - 0.5) * 15;
              const goldText = game.floatingTextPool.create(enemy.visualX + TILE_SIZE / 2 + offsetX, enemy.visualY - 26, `+${finalGold} 金币`, '#ffd700');
              game.floatingTexts.push(goldText);
            }
            if (game.audio) game.audio.playCoins({ forceCategory: 'gameplay' });
          }
          
          // 给予经验奖励
          if (xp > 0) {
            game.totalXpGained = (game.totalXpGained || 0) + xp;
            const leveled = attacker.gainXp(xp);
            // 移除 XP 飘字
            
            if (leveled && game.roguelike && game.roguelike.triggerDraft) {
              game.roguelike.triggerDraft('ELITE', enemy, 'LEVEL_UP');
            }
          }
          
          // 更新击杀计数
          game.killCount = (game.killCount || 0) + 1;
          if (game.achievementSystem) game.achievementSystem.check('onKill');
          
          // 任务系统：检查击杀事件
          if (game.questSystem) {
            game.questSystem.check('onKill', { monsterType: enemy.type });
          }
          
          // 掉落物品（30%概率）
          if (Math.random() < 0.3) {
            // ✅ FIX: 应用每日挑战词缀 - LUCKY（幸运）词缀的魔法发现加成
            const baseMagicFind = attacker.stats.magicFind || 0;
            const dailyMagicFind = attacker.dailyMagicFind || 0;
            const totalMagicFind = baseMagicFind + dailyMagicFind;
            
            const drop = getEquipmentDropForFloor(attacker.stats.floor || 1, {
              monsterTier: enemy.tier || 1,
              playerClass: attacker.classId?.toLowerCase() || null,
              magicFind: totalMagicFind,
              ascensionLevel: game.selectedAscensionLevel || 0,
              game: game // ✅ FIX: 传递 game 对象以支持每日挑战模式的 RNG
            });
            if (drop) {
              game.map.addEquipAt(drop.id || drop, enemy.x, enemy.y);
            }
          }
          
          // 掉落消耗品（15%概率）
          // ✅ FIX: 使用 RNG（如果存在，每日挑战模式需要确定性）
          const rng1 = (game.isDailyMode && game.rng) ? game.rng : null;
          const consumableRandom1 = rng1 ? rng1.next() : Math.random();
          if (consumableRandom1 < 0.15) {
            const consumable = getRandomConsumable(rng1);
            if (consumable) game.map.addConsumableAt(consumable.id, enemy.x, enemy.y);
          }
        }
        
        // 移除怪物
        if (game.map) {
          game.map.removeMonster(enemy);
        }
      }
    }
    
    // 日志输出
    if (game.ui) {
      game.ui.logMessage(`⚡ 闪电链！对 ${nearbyEnemies.length} 个敌人造成 ${chainDamage} 伤害`, 'combat');
    }
  }
  
  /**
   * ✅ FIX: 处理DoT效果的tick（数据驱动，不依赖闭包函数）
   * @param {Entity} entity - 拥有DoT的实体
   * @param {Object} dot - DoT数据对象（不包含onTick函数）
   */
  static handleDoTTick(entity, dot) {
    const game = window.game;
    if (!game || !game.map) return;
    
    // 检查实体是否仍然有效
    if (!entity || !entity.stats || entity.stats.hp <= 0) return;
    
    // ✅ FIX: 自爆怪物在倒计时期间免疫DoT伤害
    if (entity.isInvulnerable || (entity.hasAffix && entity.hasAffix('VOLATILE') && entity.eliteVisualEffects && entity.eliteVisualEffects.volatileExploding)) {
      return; // 免疫DoT伤害
    }
    
      // ✅ FIX: 根据DoT类型处理不同的逻辑
      if (dot.type === 'BURN' || dot.type === 'FREEZE_DOT' || dot.type === 'POISON') {
        // ✅ FIX: 处理状态DoT（BURN, FREEZE_DOT, POISON）
        const damage = dot.damage || 0;
        const dotColor = dot.color || '#ffffff';
        
        // 对目标造成伤害
        entity.stats.hp -= damage;
        
        // ✅ FIX: 累加 DoT 伤害到统计（用于排行榜）
        if (game.totalDamageDealt !== undefined) {
          game.totalDamageDealt += damage;
        }
        
        // ✅ FIX: 如果目标是Monster，调用onDamageTaken以触发精英怪逻辑（如TELEPORTER计数、打断回血）
        if (entity.onDamageTaken && typeof entity.onDamageTaken === 'function') {
          let source = null;
          if (dot.sourceId === 'player' && game.player) {
            source = game.player;
          }
          entity.onDamageTaken(damage, source);
        }
        
        // ✅ FIX: 优化飘字显示重叠 - 添加随机偏移
        if (game.floatingTextPool && game.settings && game.settings.showDamageNumbers !== false) {
          const offsetX = (Math.random() - 0.5) * 15;
          const offsetY = -10 - Math.random() * 10;
          const dotText = game.floatingTextPool.create(entity.visualX + TILE_SIZE / 2 + offsetX, entity.visualY + offsetY, `-${damage}`, dotColor);
          game.floatingTexts.push(dotText);
        }
        
        // 检查目标是否死亡
        if (entity.stats.hp <= 0) {
          if (game.map) {
            if (entity === game.player) {
              // 玩家死亡处理
              game.endGame(true);
            } else {
              // ✅ FIX: 增强DoT击杀的奖励归属判定 - 只要sourceId === 'player'就给予奖励
              if (dot.sourceId === 'player' && game.player) {
                const source = game.player;
                const g = entity.stats.goldYield || entity.stats.gold || 0;
                const xp = entity.stats.xpYield || entity.stats.xp || 0;
                
                if (g > 0) {
                  source.stats.gold = (source.stats.gold || 0) + g;
                  if (game.settings && game.settings.showDamageNumbers !== false) {
                    const offsetX = (Math.random() - 0.5) * 15;
                    const goldText = game.floatingTextPool.create(entity.visualX + TILE_SIZE / 2 + offsetX, entity.visualY - 26, `+${g} 金币`, '#ffd700');
                    game.floatingTexts.push(goldText);
                  }
                  if (game.audio) game.audio.playCoins({ forceCategory: 'gameplay' });
                }
                
                if (xp > 0) {
                  game.totalXpGained = (game.totalXpGained || 0) + xp;
                  const leveled = source.gainXp(xp);
                  // 移除 XP 飘字
                  
                  if (leveled && game.roguelike && game.roguelike.triggerDraft) {
                    game.roguelike.triggerDraft('ELITE', entity, 'LEVEL_UP');
                  }
                }
                
                game.killCount = (game.killCount || 0) + 1;
                if (game.achievementSystem) game.achievementSystem.check('onKill');
                
                // 任务系统：检查击杀事件
                if (game.questSystem) {
                  game.questSystem.check('onKill', { monsterType: entity.type });
                }
                
                // ✅ FIX: 触发 onKill 遗物效果（如吸血鬼之牙）
                if (game.combatSystem) {
                  this.processHooks(source, entity, 'onKill', {
                    damage: dot.damage || 0,
                    isCrit: false,
                    damageType: 'DOT'
                  });
                }
                
                // 掉落物品（技能击杀）
                if (Math.random() < 0.3) {
                  // ✅ FIX: 应用每日挑战词缀 - LUCKY（幸运）词缀的魔法发现加成
                  const baseMagicFind = source.stats.magicFind || 0;
                  const dailyMagicFind = source.dailyMagicFind || 0;
                  const totalMagicFind = baseMagicFind + dailyMagicFind;
                  
                  const drop = getEquipmentDropForFloor(source.stats.floor || 1, {
                    monsterTier: entity.tier || 1,
                    playerClass: source.classId?.toLowerCase() || null,
                    magicFind: totalMagicFind,
                    ascensionLevel: game.selectedAscensionLevel || 0,
                    game: game // ✅ FIX: 传递 game 对象以支持每日挑战模式的 RNG
                  });
                  if (drop) game.map.addEquipAt(drop.id || drop, entity.x, entity.y);
                }
                // ✅ FIX: 使用 RNG（如果存在，每日挑战模式需要确定性）
                const rng2 = (game.isDailyMode && game.rng) ? game.rng : null;
                const consumableRandom2 = rng2 ? rng2.next() : Math.random();
                if (consumableRandom2 < 0.15) {
                  const consumable = getRandomConsumable(rng2);
                  if (consumable) game.map.addConsumableAt(consumable.id, entity.x, entity.y);
                }
              }
              
              game.map.removeMonster(entity);
            }
          }
        }
      } else if (dot.type === 'ELECTRO_CHARGED') {
      // 感电DoT：对目标和最近敌人造成伤害
      const damage = dot.damage || 0;
      
      // ✅ FIX: 对目标造成伤害，并触发受击逻辑
      entity.stats.hp -= damage;
      
      // ✅ FIX: 累加 DoT 伤害到统计（用于排行榜）
      if (game.totalDamageDealt !== undefined) {
        game.totalDamageDealt += damage;
      }
      
      // ✅ FIX: 如果目标是Monster，调用onDamageTaken以触发精英怪逻辑（如TELEPORTER计数、打断回血）
      if (entity.onDamageTaken && typeof entity.onDamageTaken === 'function') {
        // 尝试从sourceId恢复source引用
        let source = null;
        if (dot.sourceId === 'player' && game.player) {
          source = game.player;
        }
        entity.onDamageTaken(damage, source);
      }
      
      // ✅ FIX: 优化飘字显示重叠 - 添加随机偏移
      if (game.floatingTextPool && game.settings && game.settings.showDamageNumbers !== false) {
        const offsetX = (Math.random() - 0.5) * 15;
        const offsetY = -10 - Math.random() * 10;
        const electroText = game.floatingTextPool.create(entity.visualX + TILE_SIZE / 2 + offsetX, entity.visualY + offsetY, `-${damage}`, '#ffff00');
        game.floatingTexts.push(electroText);
      }
      
      // 查找2格内最近的敌人（连锁伤害）
      if (game.map.monsters && entity !== game.player) {
        // 如果目标是怪物，查找其他怪物
        let nearestEnemy = null;
        let minDistance = Infinity;
        const tetherRadius = dot.tetherRadius || 2;
        
        for (const enemy of game.map.monsters) {
          if (enemy === entity) continue;
          const distance = Math.abs(enemy.x - entity.x) + Math.abs(enemy.y - entity.y);
          if (distance <= tetherRadius && distance < minDistance) {
            minDistance = distance;
            nearestEnemy = enemy;
          }
        }
        
        // ✅ FIX: 对最近的敌人造成伤害，并触发受击逻辑
        if (nearestEnemy) {
          nearestEnemy.stats.hp -= damage;
          
          // ✅ FIX: 累加感电连锁伤害到统计（用于排行榜）
          if (game.totalDamageDealt !== undefined) {
            game.totalDamageDealt += damage;
          }
          
          // ✅ FIX: 触发受击逻辑（TELEPORTER计数、打断回血等）
          if (nearestEnemy.onDamageTaken && typeof nearestEnemy.onDamageTaken === 'function') {
            let source = null;
            if (dot.sourceId === 'player' && game.player) {
              source = game.player;
            }
            nearestEnemy.onDamageTaken(damage, source);
          }
          
          // ✅ FIX: 优化飘字显示重叠 - 添加随机偏移
          if (game.floatingTextPool && game.settings && game.settings.showDamageNumbers !== false) {
            const offsetX = (Math.random() - 0.5) * 15;
            const offsetY = -10 - Math.random() * 10;
            const tetherText = game.floatingTextPool.create(nearestEnemy.visualX + TILE_SIZE / 2 + offsetX, nearestEnemy.visualY + offsetY, `-${damage}`, '#ffff00');
            game.floatingTexts.push(tetherText);
          }
          
          // ✅ FIX: 感电DoT击杀时给予完整奖励结算
          // ✅ FIX: 增强DoT击杀的奖励归属判定 - 只要sourceId === 'player'就给予奖励
          if (nearestEnemy.stats.hp <= 0) {
            // 只要sourceId是'player'，即使source引用丢失，也给予玩家奖励
            if (dot.sourceId === 'player' && game.player) {
              const source = game.player;
              const g = nearestEnemy.stats.goldYield || nearestEnemy.stats.gold || 0;
              const xp = nearestEnemy.stats.xpYield || nearestEnemy.stats.xp || 0;
              
              if (g > 0) {
                source.stats.gold = (source.stats.gold || 0) + g;
                // ✅ FIX: 优化飘字显示重叠 - 金币和XP使用不同的高度偏移
                if (game.settings && game.settings.showDamageNumbers !== false) {
                  const offsetX = (Math.random() - 0.5) * 15;
                  const goldText = game.floatingTextPool.create(nearestEnemy.visualX + TILE_SIZE / 2 + offsetX, nearestEnemy.visualY - 26, `+${g} 金币`, '#ffd700');
                  game.floatingTexts.push(goldText);
                }
                if (game.audio) game.audio.playCoins({ forceCategory: 'gameplay' });
              }
              
              if (xp > 0) {
                game.totalXpGained = (game.totalXpGained || 0) + xp;
                const leveled = source.gainXp(xp);
                // 移除 XP 飘字
                
                if (leveled && game.roguelike && game.roguelike.triggerDraft) {
                  game.roguelike.triggerDraft('ELITE', nearestEnemy, 'LEVEL_UP');
                }
              }
              
              game.killCount = (game.killCount || 0) + 1;
              if (game.achievementSystem) game.achievementSystem.check('onKill');
              
              // 任务系统：检查击杀事件
              if (game.questSystem) {
                game.questSystem.check('onKill', { monsterType: nearestEnemy.type });
              }
              
              // 掉落物品（技能击杀）
              if (Math.random() < 0.3) {
                // ✅ FIX: 应用每日挑战词缀 - LUCKY（幸运）词缀的魔法发现加成
                const baseMagicFind = source.stats.magicFind || 0;
                const dailyMagicFind = source.dailyMagicFind || 0;
                const totalMagicFind = baseMagicFind + dailyMagicFind;
                
                const drop = getEquipmentDropForFloor(source.stats.floor || 1, {
                  monsterTier: nearestEnemy.tier || 1,
                  playerClass: source.classId?.toLowerCase() || null,
                  magicFind: totalMagicFind,
                  ascensionLevel: game.selectedAscensionLevel || 0,
                  game: game // ✅ FIX: 传递 game 对象以支持每日挑战模式的 RNG
                });
                if (drop) game.map.addEquipAt(drop.id || drop, nearestEnemy.x, nearestEnemy.y);
              }
              // ✅ FIX: 使用 RNG（如果存在，每日挑战模式需要确定性）
              const rng3 = (game.isDailyMode && game.rng) ? game.rng : null;
              const consumableRandom3 = rng3 ? rng3.next() : Math.random();
              if (consumableRandom3 < 0.15) {
                const consumable = getRandomConsumable(rng3);
                if (consumable) game.map.addConsumableAt(consumable.id, nearestEnemy.x, nearestEnemy.y);
              }
              
              if (game.ui) {
                const enemyName = MONSTER_STATS[nearestEnemy.type]?.cnName || nearestEnemy.type;
                game.ui.logMessage(`${enemyName} 被感电击杀！`, 'gain');
              }
            }
            
            // 移除怪物
            game.map.removeMonster(nearestEnemy);
          }
        }
      }
      
      // 检查目标是否死亡
      if (entity.stats.hp <= 0) {
        if (game.map) {
          if (entity === game.player) {
            // 玩家死亡处理
            game.endGame(true);
          } else {
            // ✅ FIX: 增强DoT击杀的奖励归属判定 - 只要sourceId === 'player'就给予奖励
            if (dot.sourceId === 'player' && game.player) {
              const source = game.player;
              const g = entity.stats.goldYield || entity.stats.gold || 0;
              const xp = entity.stats.xpYield || entity.stats.xp || 0;
              
              if (g > 0) {
                source.stats.gold = (source.stats.gold || 0) + g;
                if (game.settings && game.settings.showDamageNumbers !== false) {
                  const offsetX = (Math.random() - 0.5) * 15;
                  const goldText = game.floatingTextPool.create(entity.visualX + TILE_SIZE / 2 + offsetX, entity.visualY - 26, `+${g} 金币`, '#ffd700');
                  game.floatingTexts.push(goldText);
                }
                if (game.audio) game.audio.playCoins({ forceCategory: 'gameplay' });
              }
              
              if (xp > 0) {
                game.totalXpGained = (game.totalXpGained || 0) + xp;
                const leveled = source.gainXp(xp);
                // 移除 XP 飘字
                
                if (leveled && game.roguelike && game.roguelike.triggerDraft) {
                  game.roguelike.triggerDraft('ELITE', entity, 'LEVEL_UP');
                }
              }
              
              game.killCount = (game.killCount || 0) + 1;
              if (game.achievementSystem) game.achievementSystem.check('onKill');
              
              // 任务系统：检查击杀事件
              if (game.questSystem) {
                game.questSystem.check('onKill', { monsterType: entity.type });
              }
              
              // ✅ FIX: 触发 onKill 遗物效果（如吸血鬼之牙）
              if (game.combatSystem) {
                this.processHooks(source, entity, 'onKill', {
                  damage: dot.damage || 0,
                  isCrit: false,
                  damageType: 'DOT'
                });
              }
              
              // 掉落物品（技能击杀）
              if (Math.random() < 0.3) {
                // ✅ FIX: 应用每日挑战词缀 - LUCKY（幸运）词缀的魔法发现加成
                const baseMagicFind = source.stats.magicFind || 0;
                const dailyMagicFind = source.dailyMagicFind || 0;
                const totalMagicFind = baseMagicFind + dailyMagicFind;
                
                const drop = getEquipmentDropForFloor(source.stats.floor || 1, {
                  monsterTier: entity.tier || 1,
                  playerClass: source.classId?.toLowerCase() || null,
                  magicFind: totalMagicFind,
                  ascensionLevel: game.selectedAscensionLevel || 0,
                  game: game // ✅ FIX: 传递 game 对象以支持每日挑战模式的 RNG
                });
                if (drop) game.map.addEquipAt(drop.id || drop, entity.x, entity.y);
              }
              // ✅ FIX: 使用 RNG（如果存在，每日挑战模式需要确定性）
              const rng4 = (game.isDailyMode && game.rng) ? game.rng : null;
              const consumableRandom4 = rng4 ? rng4.next() : Math.random();
              if (consumableRandom4 < 0.15) {
                const consumable = getRandomConsumable(rng4);
                if (consumable) game.map.addConsumableAt(consumable.id, entity.x, entity.y);
              }
            }
            
            game.map.removeMonster(entity);
          }
        }
      }
    }
    // 其他类型的DoT可以在这里扩展
  }
  
  /**
   * 应用元素反应系统
   * @param {Entity} target - 目标实体（怪物或玩家）
   * @param {string} incomingElement - 即将应用的元素类型
   * @param {number} damageAmount - 伤害数值
   * @param {Entity} source - 伤害来源（玩家或怪物）
   * @returns {Object} 反应结果 { reactionOccurred, reactionName, finalDamage, additionalEffects }
   */
  static applyElementalReaction(target, incomingElement, damageAmount, source) {
    const game = window.game;
    let reactionOccurred = false;
    let reactionName = '';
    let finalDamage = damageAmount;
    const additionalEffects = [];
    
    // 检查目标身上是否有元素状态，以触发反应
    const existingStatuses = target.statuses || [];
    
    // 遍历所有状态，寻找元素反应
    for (const status of existingStatuses) {
      const statusDef = STATUS_TYPES[status.type];
      if (!statusDef || !statusDef.element) continue;
      
      const existingElement = statusDef.element;
      
      // ========== BURN + HYDRO/CRYO -> Vaporize/Melt ==========
      if (existingElement === ELEMENTS.PYRO && status.type === 'BURN') {
        if (incomingElement === ELEMENTS.HYDRO) {
          // 蒸发反应
          reactionOccurred = true;
          reactionName = '蒸发';
          finalDamage = Math.floor(damageAmount * ELEMENT_REACTIONS.VAPORIZE.damageMultiplier);
          target.removeStatus('BURN');
          break;
        } else if (incomingElement === ELEMENTS.CRYO) {
          // 融化反应
          reactionOccurred = true;
          reactionName = '融化';
          finalDamage = Math.floor(damageAmount * ELEMENT_REACTIONS.MELT.damageMultiplier);
          target.removeStatus('BURN');
          break;
        } else if (incomingElement === ELEMENTS.ELECTRO) {
          // 超载反应
          reactionOccurred = true;
          reactionName = '超载';
          target.removeStatus('BURN');
          
          // AOE 伤害 - 在2格半径内造成150%伤害
          const aoeDamage = Math.floor(damageAmount * ELEMENT_REACTIONS.OVERLOAD.aoeDamageMultiplier);
          const aoeRadius = ELEMENT_REACTIONS.OVERLOAD.aoeRadius;
          
          // 查找范围内的所有敌人
          if (game && game.map && game.map.monsters) {
            for (const enemy of game.map.monsters) {
              if (enemy === target) continue; // 跳过目标自己
              const distance = Math.abs(enemy.x - target.x) + Math.abs(enemy.y - target.y);
              if (distance <= aoeRadius) {
                enemy.stats.hp -= aoeDamage;
                // ✅ FIX: 累加 AOE 伤害到统计（用于排行榜）
                if (game.totalDamageDealt !== undefined) {
                  game.totalDamageDealt += aoeDamage;
                }
                // ✅ FIX: 优化飘字显示重叠 - 添加随机偏移
                if (game.floatingTextPool && game.settings && game.settings.showDamageNumbers !== false) {
                  const offsetX = (Math.random() - 0.5) * 15;
                  const offsetY = -10 - Math.random() * 10;
                  const aoeText = game.floatingTextPool.create(enemy.visualX + TILE_SIZE / 2 + offsetX, enemy.visualY + offsetY, `-${aoeDamage}`, '#ff9900');
                  game.floatingTexts.push(aoeText);
                }
                if (enemy.stats.hp <= 0) {
                  game.map.removeMonster(enemy);
                }
              }
            }
          }
          
          // 镜头震动
          if (game.camera) {
            game.camera.shakeTimer = Math.max(game.camera.shakeTimer || 0, 20);
          }
          
          break;
        }
      }
      
      // ========== WET + CRYO -> Freeze ==========
      if (existingElement === ELEMENTS.HYDRO && status.type === 'WET') {
        if (incomingElement === ELEMENTS.CRYO) {
          reactionOccurred = true;
          reactionName = '冰冻';
          target.removeStatus('WET');
          
          // 应用冰冻状态（3秒）
          target.applyStatus('FROZEN', source, { duration: ELEMENT_REACTIONS.FREEZE.freezeDuration });
          
          break;
        } else if (incomingElement === ELEMENTS.ELECTRO) {
          // 感电反应
          reactionOccurred = true;
          reactionName = '感电';
          
          // 感电DoT - 每0.5秒对目标和最近敌人造成20%伤害，持续3秒
          const tetherDamage = Math.floor(damageAmount * ELEMENT_REACTIONS.ELECTRO_CHARGED.damagePercent);
          const duration = ELEMENT_REACTIONS.ELECTRO_CHARGED.duration;
          const tickInterval = ELEMENT_REACTIONS.ELECTRO_CHARGED.tickInterval;
          const tetherRadius = ELEMENT_REACTIONS.ELECTRO_CHARGED.tetherRadius;
          
          // 初始化 activeDoTs 数组（如果不存在）
          if (!target.activeDoTs) {
            target.activeDoTs = [];
          }
          
          // ✅ FIX: 创建感电DoT效果（数据驱动，不包含onTick函数）
          // 使用sourceId而不是source对象引用，便于序列化
          const electroDoT = {
            type: 'ELECTRO_CHARGED',
            sourceId: source === game.player ? 'player' : null, // 简化：只保存player标识
            damage: tetherDamage,
            duration: duration,
            tickInterval: tickInterval,
            tetherRadius: tetherRadius,
            elapsedTime: 0,
            nextTickTime: tickInterval // 第一次tick在tickInterval后触发
            // ✅ FIX: 不再包含onTick函数，改为在Entity.updateStatuses中调用CombatSystem.handleDoTTick
          };
          
          // 添加到DoT列表
          target.activeDoTs.push(electroDoT);
          
          break;
        }
      }
      
      // ========== FROZEN + PYRO -> Shatter ==========
      // ✅ FIX: 修复碎裂反应状态清理不彻底 - 同时移除FROZEN和FREEZE_DOT
      if (existingElement === ELEMENTS.CRYO && status.type === 'FROZEN') {
        if (incomingElement === ELEMENTS.PYRO) {
          reactionOccurred = true;
          reactionName = '碎裂';
          finalDamage = Math.floor(damageAmount * ELEMENT_REACTIONS.SHATTER.damageMultiplier);
          // ✅ FIX: 修复碎裂反应状态清理不彻底 - 同时移除FROZEN和FREEZE_DOT
          target.removeStatus('FROZEN');
          target.removeStatus('FREEZE_DOT');
          
          // 立即解冻
          if (game.ui) {
            game.ui.logMessage('冰冻状态被打破！', 'info');
          }
          
          break;
        }
      }
      
      // ========== POISON + PYRO -> Venom Blast ==========
      if (existingElement === ELEMENTS.POISON && status.type === 'POISON') {
        if (incomingElement === ELEMENTS.PYRO) {
          reactionOccurred = true;
          reactionName = '剧毒爆炸';
          
          // 计算毒层数
          const poisonStacks = status.config?.stacks || 1;
          const blastDamage = Math.floor(damageAmount * ELEMENT_REACTIONS.VENOM_BLAST.damagePerStack * poisonStacks);
          const aoeRadius = ELEMENT_REACTIONS.VENOM_BLAST.aoeRadius;
          
          target.removeStatus('POISON');
          
          // AOE 爆炸伤害
          if (game && game.map && game.map.monsters) {
            for (const enemy of game.map.monsters) {
              const distance = Math.abs(enemy.x - target.x) + Math.abs(enemy.y - target.y);
              if (distance <= aoeRadius) {
                enemy.stats.hp -= blastDamage;
                // ✅ FIX: 累加 AOE 伤害到统计（用于排行榜）
                if (game.totalDamageDealt !== undefined) {
                  game.totalDamageDealt += blastDamage;
                }
                // ✅ FIX: 优化飘字显示重叠 - 添加随机偏移
                if (game.floatingTextPool && game.settings && game.settings.showDamageNumbers !== false) {
                  const offsetX = (Math.random() - 0.5) * 15;
                  const offsetY = -10 - Math.random() * 10;
                  const blastText = game.floatingTextPool.create(enemy.visualX + TILE_SIZE / 2 + offsetX, enemy.visualY + offsetY, `-${blastDamage}`, '#00ff00');
                  game.floatingTexts.push(blastText);
                }
                if (enemy.stats.hp <= 0) {
                  game.map.removeMonster(enemy);
                }
              }
            }
          }
          
          // 镜头震动
          if (game.camera) {
            game.camera.shakeTimer = Math.max(game.camera.shakeTimer || 0, 25);
          }
          
          break;
        }
      }
    }
    
    // ✅ FIX: 优化飘字显示重叠 - 反应名称在更上方，并添加随机偏移
    if (reactionOccurred && game.floatingTextPool && game.settings && game.settings.showDamageNumbers !== false) {
      const offsetX = (Math.random() - 0.5) * 20;
      const offsetY = -40 - Math.random() * 10; // 反应名称在更上方
      const reactionText = game.floatingTextPool.create(target.visualX + TILE_SIZE / 2 + offsetX, target.visualY + offsetY, `${reactionName}!`, '#ff00ff');
      game.floatingTexts.push(reactionText);
    }
    
    return {
      reactionOccurred,
      reactionName,
      finalDamage,
      additionalEffects
    };
  }
  
  /**
   * 计算属性共鸣（双重共鸣系统）
   * @param {Object} attackerStats - 攻击者属性
   * @param {Object} defenderStats - 防御者属性
   * @param {boolean} isMagicAttack - 是否为魔法攻击
   * @param {Entity} [attacker] - 攻击者实体（可选，用于检查特殊状态如 Assassinate 穿透）
   * @returns {Object} { effectiveDef, critDmgBonus, penetrationRate }
   */
  static calculateResonance(attackerStats, defenderStats, isMagicAttack, attacker = null) {
    // 1. 攻击端：副属性转化 (Offensive Conversion)
    let penetrationRate = 0;
    let critDmgBonus = 0;

    const pAtk = attackerStats.p_atk || 0;
    const mAtk = attackerStats.m_atk || 0;

    if (!isMagicAttack) {
      // 物理攻击：魔攻转化为护甲穿透 (上限 50%)
      // 公式：穿透率 = min(0.5, (魔攻 / 物攻) * 0.5)
      // ✅ FIX: 修复除以零风险 - 检查分母是否 > 0
      if (pAtk > 0 && mAtk > 0) {
        penetrationRate = Math.min(0.5, (mAtk / pAtk) * 0.5);
      } else {
        penetrationRate = 0; // 分母为0时，穿透率为0
      }
      
      // ✅ FIX: 检查 Assassinate 穿透加成（EDGE 终结技）
      if (attacker && attacker.combatState?.assassinatePenetration) {
        const mastery = WEAPON_MASTERY.EDGE;
        if (mastery && mastery.penBonus) {
          // 将 penBonus 加到穿透率中（加法叠加，上限100%）
          penetrationRate = Math.min(1.0, penetrationRate + mastery.penBonus);
        }
      }
    } else {
      // 魔法攻击：物攻转化为暴击伤害
      // 公式：额外暴伤 = (物攻 / 魔攻) * 1.0
      // ✅ FIX: 修复除以零风险 - 检查分母是否 > 0
      if (mAtk > 0 && pAtk > 0) {
        critDmgBonus = (pAtk / mAtk) * 1.0;
      } else {
        critDmgBonus = 0; // 分母为0时，暴伤加成为0
      }
    }

    // 2. 防御端：协同防御 (Synergistic Defense)
    // 受到物理攻击：物防 + 20% 魔防
    // 受到魔法攻击：魔防 + 20% 物防
    const pDef = defenderStats.p_def || 0;
    const mDef = defenderStats.m_def || 0;
    
    let baseDef = 0;
    if (isMagicAttack) {
      baseDef = mDef + (pDef * 0.2);
    } else {
      baseDef = pDef + (mDef * 0.2);
    }

    // 3. 计算最终有效防御 (应用穿透)
    const effectiveDef = Math.max(0, Math.floor(baseDef * (1 - penetrationRate)));

    return {
      effectiveDef,
      critDmgBonus,
      penetrationRate
    };
  }
  
  static checkInteraction(player, monster) {
    const game = window.game;
    const pTotals = (player.getTotalStats ? player.getTotalStats() : player.stats);
    const dx = player.visualX - monster.visualX;
    const dy = player.visualY - monster.visualY;
    const dist = Math.hypot(dx, dy);
    
    if (dist < 16) {
      // ========== STEP A0: 武器精通系统 - 连击逻辑（必须在早期返回之前执行） ==========
      // ✅ CRITICAL: Combo logic MUST run before early returns (dodge/block)
      // Reason: Even if a monster blocks or dodges, the player is still "attacking",
      // so the combo timer (lastAttackTime) must refresh to prevent unfair combo drop
      
      // Initialize combatState if it doesn't exist
      if (!player.combatState) {
        player.combatState = {
          comboCount: 0,
          maxCombo: 0,
          lastTargetId: null,
          lastAttackTime: 0,
          weaponType: null
        };
      }
      
      // A. Identify Weapon & Target
      const weaponType = player.getWeaponArchetype ? player.getWeaponArchetype() : 'NONE';
      player.combatState.weaponType = weaponType;
      // ✅ FIX: 优先使用 monster.uid（永久唯一ID），避免因怪物移动坐标变化导致连击中断
      // ✅ CRITICAL FIX: 如果怪物没有 uid，使用稳定的标识符（不包含 Date.now()），避免每次攻击都生成新ID
      let monsterId = monster.uid;
      if (!monsterId) {
        // 如果怪物没有 uid，生成一个稳定的标识符（基于类型和坐标，但不包含时间戳）
        // 注意：这只在怪物构造函数未正确生成 uid 时作为后备方案
        monsterId = `${monster.type}_${monster.x}_${monster.y}`;
        // 同时为怪物设置 uid，确保后续攻击使用相同的ID
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
          monster.uid = crypto.randomUUID();
        } else {
          monster.uid = `monster_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        }
        monsterId = monster.uid; // 使用新生成的 uid
        console.warn(`[CombatSystem] 怪物 ${monster.type} 缺少 uid，已生成: ${monster.uid}`);
      }
      const now = Date.now();
      
      // B. Reset Check: If target != lastTarget OR time > COMBO_RESET_TIME, reset combo
      if (player.combatState.lastTargetId !== monsterId || 
          (now - player.combatState.lastAttackTime) > COMBO_RESET_TIME) {
        player.combatState.comboCount = 0;
      }
      
      // C. Update State: Always update lastTargetId and lastAttackTime here (before early returns)
      player.combatState.lastTargetId = monsterId;
      player.combatState.lastAttackTime = now;
      
      // ========== 攻击速度系统：更新攻击计时器 ==========
      // ✅ 更新玩家的 lastAttackTime（用于攻击冷却时间追踪）
      // 注意：即使攻击被闪避或格挡，冷却时间也应该开始计算
      if (player.lastAttackTime !== undefined) {
        player.lastAttackTime = now;
      }
      
      // Set maxCombo based on weapon type
      const mastery = WEAPON_MASTERY[weaponType];
      if (mastery) {
        player.combatState.maxCombo = mastery.maxCombo;
      } else {
        player.combatState.maxCombo = 0;
      }
      
      // ========== STEP A0: 怪物特性检查（最高优先级） ==========
      const monsterTraits = monster.stats.traits || [];
      
      // ========== STEP A0.1: 怪物特性 - 闪避判定 (ECHOLOCATION) ==========
      if (monsterTraits.includes('ECHOLOCATION')) {
        // 蝙蝠：25%固有闪避率
        // ✅ FIX: 使用 RNG（如果存在，每日挑战模式需要确定性）
        const rng = (game.isDailyMode && game.rng) ? game.rng : null;
        const dodgeRoll = rng ? rng.next() : Math.random();
        if (dodgeRoll < 0.25) {
          // ✅ FIX: 清除 Assassinate 状态（如果存在），防止状态残留
          if (player.combatState) {
            player.combatState.forceCrit = false;
            player.combatState.assassinatePenetration = false;
          }
          
          // ✅ FIX: 优化飘字显示重叠 - 添加随机偏移
          if (game.floatingTextPool && game.settings && game.settings.showDamageNumbers !== false) {
            const offsetX = (Math.random() - 0.5) * 15;
            const offsetY = -10 - Math.random() * 10;
            const dodgeText = game.floatingTextPool.create(monster.visualX + TILE_SIZE / 2 + offsetX, monster.visualY + offsetY, '闪避!', '#ffffff');
            game.floatingTexts.push(dodgeText);
          }
          return 'BOUNCE'; // 闪避，不造成伤害
        }
      }
      
      // ========== STEP A0.2: 怪物特性 - 骨盾格挡 (BONE_SHIELD) - 最高优先级 ==========
      if (monsterTraits.includes('BONE_SHIELD') && monster.boneShieldActive) {
        // 骷髅：完全格挡第一次伤害，优先级最高，直接返回不进行后续计算
        monster.boneShieldActive = false;
        
        // ✅ FIX: 清除 Assassinate 状态（如果存在），防止状态残留
        if (player.combatState) {
          player.combatState.forceCrit = false;
          player.combatState.assassinatePenetration = false;
        }
        
        // ✅ FIX: 优化飘字显示重叠 - 添加随机偏移
        if (game.floatingTextPool && game.settings && game.settings.showDamageNumbers !== false) {
          const offsetX = (Math.random() - 0.5) * 15;
          const offsetY = -10 - Math.random() * 10;
          const blockText = game.floatingTextPool.create(monster.visualX + TILE_SIZE / 2 + offsetX, monster.visualY + offsetY, '格挡!', '#ffffff');
          game.floatingTexts.push(blockText);
        }
        if (game.audio) game.audio.playHit(); // 播放金属音效
        
          // ✅ FIX: 检查并清除玩家的技能状态（增强策略性）- 通用清除
          let skillBlocked = false;
          if (player.states) {
            // ✅ FIX: 通用清除所有技能状态
            if (player.skills && player.skills.ACTIVE) {
              const activeSkillId = player.skills.ACTIVE.id;
              if (activeSkillId) {
                const stateKey = `${activeSkillId}Primed`;
                if (player.states[stateKey] || player.states.activeSkillPrimed) {
                  player.states[stateKey] = false;
                  player.states.activeSkillPrimed = false;
                  skillBlocked = true;
                }
              }
            }
            // 兼容旧的特定标记（向后兼容）
            if (player.states.slashPrimed || player.states.scorchPrimed || player.states.freezePrimed) {
              player.states.slashPrimed = false;
              player.states.scorchPrimed = false;
              player.states.freezePrimed = false;
              player.states.activeElement = null;
              player.states.ultElement = null;
              skillBlocked = true;
            }
          }
        
        // 标记为进入战斗状态，但不造成伤害
        monster.inCombat = true;
        monster.lastDamageTime = Date.now();
        
        // 仍然进行怪物反击计算（如果适用）
        const monsterUsesMagic = ((monster.stats.m_atk || 0) > (monster.stats.p_atk || 0));
        const monAtk = monsterUsesMagic ? (monster.stats.m_atk || 0) : (monster.stats.p_atk || 0);
        const playerResonance = this.calculateResonance(monster.stats, pTotals, monsterUsesMagic);
        let dmgToPlay = Math.max(1, monAtk - playerResonance.effectiveDef);
        
        // ✅ 点石成金副作用：受到伤害+10%（在格挡反击时也应用）
        if (player.activeKeystones && Array.isArray(player.activeKeystones) && player.activeKeystones.includes('GOLDEN_TOUCH')) {
          dmgToPlay = Math.ceil(dmgToPlay * 1.1);
        }
        
        if (dmgToPlay > 0) {
          player.takeDamage(dmgToPlay);
          if (game.settings && game.settings.showDamageNumbers !== false) {
            const playerDamageText = game.floatingTextPool.create(player.visualX + TILE_SIZE / 2, player.visualY - 10, `-${dmgToPlay}`, '#ffffff'); // 怪物主动反击飘字为白色
            game.floatingTexts.push(playerDamageText);
          }
          if (dmgToPlay > 10) game.camera.shakeTimer = Math.max(game.camera.shakeTimer || 0, 10);
          if (game.audio) game.audio.playHit();
          
          // ✅ FIX: 修复吸血在反击时失效 - 骨盾格挡时的反击也能触发吸血
          if (monster.isElite && monster.hasAffix && monster.hasAffix('VAMPIRIC') && monster.stats.hp > 0) {
            const healAmount = Math.floor(dmgToPlay * 0.5); // 回复造成伤害的50%
            monster.stats.hp = Math.min(monster.stats.maxHp, monster.stats.hp + healAmount);
            if (game.floatingTextPool && game.settings && game.settings.showDamageNumbers !== false) {
              const healText = game.floatingTextPool.create(monster.visualX + TILE_SIZE / 2, monster.visualY - 30, `+${healAmount}`, '#00ff00');
              game.floatingTexts.push(healText);
            }
            if (monster.eliteVisualEffects) monster.eliteVisualEffects.vampiricTintTimer = 100;
          }
        }
        
        const monsterName = MONSTER_STATS[monster.type]?.cnName || monster.type;
        // ✅ FIX: 根据是否消耗技能显示不同消息
        const blockMsg = skillBlocked ? `${monsterName} 的骨盾格挡了你的技能！` : `${monsterName} 格挡了攻击！`;
        game.ui.logMessage(blockMsg, 'combat');
        
        return 'BLOCK'; // 格挡，不造成伤害但进入战斗
      }

      // ========== Fire Scroll 预处理：双通道元素判定（卷轴先挂火，再结算主攻击） ==========
      // 位置要求：在闪避 / 格挡特性之后，主攻击伤害计算（STEP A）之前，
      // 确保只有真正命中时才消耗卷轴，并且主攻击可以享受卷轴挂上的 BURN 状态带来的元素反应。
      if (player.states && player.states.fireScrollPrimed) {
        const game = window.game;
        // 消耗卷轴预充能状态
        player.states.fireScrollPrimed = false;

        // 读取预充能配置（如果存在），否则使用默认 30 点伤害与 BURN
        const primedConfig =
          player.states._primedEffects &&
          player.states._primedEffects.fireScrollPrimed
            ? player.states._primedEffects.fireScrollPrimed
            : null;

        const baseScrollDamage =
          (primedConfig && primedConfig.damage) || 30;
        const scrollStatus =
          (primedConfig && primedConfig.status) || 'BURN';

        // 按怪物魔防结算：伤害 = 30 - m_def，至少为 1
        const monMDef = monster.stats.m_def || 0;
        const scrollDamage = Math.max(1, baseScrollDamage - monMDef);

        // 扣除怪物生命
        monster.stats.hp -= scrollDamage;

        // 统计总伤害
        if (game && game.totalDamageDealt !== undefined) {
          game.totalDamageDealt += scrollDamage;
        }

        // 施加灼烧状态（可与技能本身的灼烧叠加）
        if (scrollStatus) {
          monster.applyStatus(scrollStatus, player);
        }

        // 飘字显示卷轴附加伤害（红色）
        if (
          game &&
          game.floatingTextPool &&
          game.settings &&
          game.settings.showDamageNumbers !== false
        ) {
          const offsetX = (Math.random() - 0.5) * 15;
          const offsetY = -10 - Math.random() * 10;
          const floatText = game.floatingTextPool.create(
            monster.visualX + TILE_SIZE / 2 + offsetX,
            monster.visualY + offsetY,
            `-${scrollDamage}`,
            '#ff0000'
          );
          game.floatingTexts.push(floatText);
        }

        // 如果卷轴伤害直接击杀怪物，则立即处理死亡并结束本次交互
        if (monster.stats.hp <= 0) {
          if (game && game.combatSystem && game.combatSystem.handleMonsterDeath) {
            game.combatSystem.handleMonsterDeath(monster, player);
          } else if (game && game.map && game.map.removeMonster) {
            game.map.removeMonster(monster);
          }
          return 'WIN';
        }
      }
      
      // ✅ v2.0: Hook - onBeforeAttack（攻击前）
      // ✅ FIX: 通用检查是否有技能就绪状态
      let hasSkillPrimed = false;
      if (player.states) {
        if (player.states.activeSkillPrimed) {
          hasSkillPrimed = true;
        } else if (player.skills && player.skills.ACTIVE && player.skills.ACTIVE.id) {
          const activeStateKey = `${player.skills.ACTIVE.id}Primed`;
          hasSkillPrimed = !!player.states[activeStateKey];
        }
        // 兼容旧的特定标记（向后兼容）
        if (!hasSkillPrimed && (player.states.slashPrimed || player.states.scorchPrimed || player.states.freezePrimed)) {
          hasSkillPrimed = true;
        }
      }
      
      this.processHooks(player, monster, 'onBeforeAttack', {
        damageType: null, // 此时还未确定伤害类型
        isSkill: hasSkillPrimed
      });
      
      // ========== STEP A0: 宝石注灵系统 (Gem Infusion) - 必须在属性共鸣计算之前 ==========
      // ✅ 检查武器第一个孔位的宝石注灵（仅在普通攻击时生效，不覆盖技能元素）
      // ✅ FIX: 通用检查是否有技能就绪状态
      let gemInfusionElement = null;
      let hasActiveSkill = false;
      if (player.states) {
        if (player.states.activeSkillPrimed) {
          hasActiveSkill = true;
        } else if (player.skills && player.skills.ACTIVE && player.skills.ACTIVE.id) {
          const activeStateKey = `${player.skills.ACTIVE.id}Primed`;
          hasActiveSkill = !!player.states[activeStateKey];
        } else if (player.skills && player.skills.ULT && player.skills.ULT.id) {
          const ultStateKey = `${player.skills.ULT.id}Primed`;
          hasActiveSkill = !!player.states[ultStateKey];
        }
        // 兼容旧的特定标记（向后兼容）
        if (!hasActiveSkill && (player.states.slashPrimed || player.states.scorchPrimed || player.states.freezePrimed)) {
          hasActiveSkill = true;
        }
      }
      
      // 只有在没有使用主动技能时，才检查宝石注灵
      if (!hasActiveSkill) {
        const weapon = player.getItemInstance ? player.getItemInstance(player.equipment.WEAPON) : player.equipment.WEAPON;
        
        if (weapon && weapon.meta && weapon.meta.sockets && Array.isArray(weapon.meta.sockets)) {
          // ✅ FIX: 遍历所有孔位，寻找第一个有效的 infuseElement
          // ✅ 设计说明：只取第一个有效的元素注灵（如果多个孔位都镶嵌了元素宝石，只应用第一个）
          // 这样设计是为了避免元素冲突，确保每次攻击只有一个元素类型
          // 如果第一个孔位是空的或没有元素注灵，会继续检查其他孔位
          for (const socket of weapon.meta.sockets) {
            if (socket && socket.status === 'FILLED' && socket.gemId) {
              // 从数据库获取宝石数据
              const gemDef = EQUIPMENT_DB[socket.gemId];
              
              if (gemDef && gemDef.gemEffects && gemDef.gemEffects.weapon) {
                const gemWeaponEffect = gemDef.gemEffects.weapon;
                
                // 检查宝石是否有 infuseElement 属性（Tier 3+ 宝石）
                if (gemWeaponEffect.infuseElement) {
                  // 应用注灵：记录元素类型（稍后在技能状态检查后应用）
                  gemInfusionElement = gemWeaponEffect.infuseElement;
                  break; // ✅ 找到第一个有效的元素注灵后退出循环（只取第一个）
                }
              }
            }
          }
        }
      }
      
      // ========== STEP A: 属性共鸣计算 (Resonance Calculation) ==========
      // ✅ FIX: 重构伤害类型判定 - 引入damageType参数
      // 判断伤害类型：如果使用技能且有元素附魔，或使用火球术卷轴，视为魔法伤害
      // ✅ 注意：宝石注灵不改变 damageType（物理刀依然算物理伤害），只提供元素标签用于触发反应
      let damageType = 'PHYSICAL'; // 默认物理伤害
      const hasElementEnchant = player.states && (player.states.activeElement || player.states.ultElement);
      const isScrollFire = false; // TODO: 如果实现了卷轴系统，在这里检查
      
      if (hasElementEnchant || isScrollFire) {
        damageType = 'MAGICAL'; // 有元素附魔或使用魔法卷轴，视为魔法伤害
      } else {
        // 普通攻击：根据面板属性判断
        // ✅ 宝石注灵不影响 damageType，保持原有逻辑
        damageType = (pTotals.m_atk > pTotals.p_atk) ? 'MAGICAL' : 'PHYSICAL';
      }
      
      const playerUsesMagic = (damageType === 'MAGICAL');
      const atkValue = playerUsesMagic ? pTotals.m_atk : pTotals.p_atk;
      
      // 应用噩梦层级机制：残血加防 (HP<30%时防御+50%)
      // 注意：这里我们先处理怪物的原始防御，calculateResonance 会处理协同防御
      let monPDef = monster.stats.p_def || 0;
      let monMDef = monster.stats.m_def || 0;
      
      if (monster.ascConfig && monster.ascConfig.lowHpDef) {
        const hpPercent = monster.stats.hp / monster.stats.maxHp;
        if (hpPercent < 0.3) {
          monPDef = Math.floor(monPDef * 1.5);
          monMDef = Math.floor(monMDef * 1.5);
        }
      }

      // 构建怪物的防御属性对象
      const monsterDefenseStats = { p_def: monPDef, m_def: monMDef };
      
      // 调用共鸣计算（传递 player 实体以支持 Assassinate 穿透检查）
      const resonance = this.calculateResonance(pTotals, monsterDefenseStats, playerUsesMagic, player);
      
      // ✅ FIX: 玩家暴击时给予30%防御穿透（在计算基础伤害前应用）
      // 注意：这里先不应用，等暴击判定后再应用穿透
      
      // 基础伤害 = 攻击力 - 有效防御 (含协同防御和穿透)
      let dmgToMon = Math.max(1, atkValue - resonance.effectiveDef);
      
      // ========== STEP A0.4: 武器精通系统 - 法杖逻辑（怒气增益和过载） ==========
      // Staff Logic: Add Rage (+5), then check if rage >= 100 for Overload bonus
      // ✅ FIX: 法杖过载机制说明：满怒气时提供额外伤害但不消耗怒气（这是预期行为）
      // 设计意图：过载是"被动增益"，不是"主动消耗"，允许玩家在满怒气时持续获得伤害加成
      // ⚠️ 注意：法杖的怒气获取逻辑在闪避/格挡检查之后，所以如果攻击被闪避或格挡，不会获得怒气
      // 这是设计意图：只有成功命中才能获得怒气奖励
      const masteryForStaff = WEAPON_MASTERY[weaponType];
      if (weaponType === 'STAFF' && masteryForStaff && masteryForStaff.type === 'OVERLOAD') {
        // Add rage (use rageGain from mastery config)
        const rageGain = masteryForStaff.rageGain || 5;
        player.gainRage(rageGain);
        
        // Check if rage >= 100, add bonus Elemental Damage
        // Note: 不消耗怒气，这是预期行为（过载是持续增益，不是一次性消耗）
        if (player.stats.rage >= 100) {
          const bonusElemDmgPct = masteryForStaff.bonusElemDmgPct || 0.2;
          const elementalBonus = Math.floor(dmgToMon * bonusElemDmgPct);
          dmgToMon += elementalBonus;
          
          // Show overload effect
          if (game.floatingTextPool && game.settings && game.settings.showDamageNumbers !== false) {
            const elementText = game.floatingTextPool.create(
              monster.visualX + TILE_SIZE / 2,
              monster.visualY - 40,
              `过载! +${elementalBonus}`,
              '#ff9900'
            );
            game.floatingTexts.push(elementText);
          }
        }
      }
      
      // ========== STEP A0.5: 武器精通系统 - 近战连击递增和终结技 ==========
      // Melee Logic (Blade/Edge/Scythe): Increment combo, check for max combo effects
      if (weaponType === 'BLADE' || weaponType === 'EDGE' || weaponType === 'SCYTHE') {
        player.combatState.comboCount++;
        
        // 检查是否达到最大combo，触发终结技
        if (player.combatState.comboCount >= player.combatState.maxCombo) {
          const mastery = WEAPON_MASTERY[weaponType];
          
          if (mastery && mastery.type === 'CLEAVE' && weaponType === 'BLADE') {
            // CLEAVE: AOE伤害
            const splashPct = mastery.splashPct || 0.3;
            const cleaveRange = mastery.range || 1;
            const cleaveDamage = Math.floor(dmgToMon * splashPct);
            
            // 对周围1格内的其他怪物造成伤害
            if (game && game.map && game.map.monsters) {
              for (const otherMonster of game.map.monsters) {
                if (otherMonster === monster || otherMonster.stats.hp <= 0) continue;
                
                const dist = Math.abs(otherMonster.x - monster.x) + Math.abs(otherMonster.y - monster.y);
                if (dist <= cleaveRange) {
                  // ✅ FIX: 在造成伤害前调用 onHit hook，确保符文（如 Vampire、Thunder）能正确触发
                  this.processHooks(player, otherMonster, 'onHit', {
                    damage: cleaveDamage,
                    isCrit: false,
                    damageType: 'PHYSICAL',
                    isCleave: true // 标记这是顺劈伤害
                  });
                  
                  otherMonster.stats.hp -= cleaveDamage;
                  
                  // 累加伤害统计
                  if (game.totalDamageDealt !== undefined) {
                    game.totalDamageDealt += cleaveDamage;
                  }
                  
                  // 显示伤害数字
                  if (game.floatingTextPool && game.settings && game.settings.showDamageNumbers !== false) {
                    const offsetX = (Math.random() - 0.5) * 15;
                    const offsetY = -10 - Math.random() * 10;
                    const cleaveText = game.floatingTextPool.create(
                      otherMonster.visualX + TILE_SIZE / 2 + offsetX,
                      otherMonster.visualY + offsetY,
                      `顺劈! -${cleaveDamage}`,
                      '#ff6666'
                    );
                    game.floatingTexts.push(cleaveText);
                  }
                  
                  // 触发受击逻辑
                  if (otherMonster.onDamageTaken) {
                    otherMonster.onDamageTaken(cleaveDamage, player);
                  }
                  
                  // 检查是否击杀
                  if (otherMonster.stats.hp <= 0) {
                    // ✅ FIX: 在移除怪物之前，显式调用 processHooks 确保遗物和天赋能正确触发
                    this.processHooks(player, otherMonster, 'onKill', {
                      damage: cleaveDamage,
                      isCrit: false,
                      damageType: 'PHYSICAL'
                    });
                    
                    if (game.combatSystem && game.combatSystem.handleMonsterDeath) {
                      game.combatSystem.handleMonsterDeath(otherMonster, player);
                    } else if (game.map) {
                      game.map.removeMonster(otherMonster);
                    }
                  }
                }
              }
            }
            
            // 显示combo提示
            if (game.floatingTextPool && game.settings && game.settings.showDamageNumbers !== false) {
              const comboText = game.floatingTextPool.create(
                monster.visualX + TILE_SIZE / 2,
                monster.visualY - 30,
                '顺劈!',
                '#ffaa00'
              );
              game.floatingTexts.push(comboText);
            }
            
          } else if (mastery && mastery.type === 'ASSASSINATE' && weaponType === 'EDGE') {
            // ASSASSINATE: 强制暴击 + 增加穿透
            // 标记需要强制暴击（在暴击计算时应用）
            player.combatState.forceCrit = true;
            player.combatState.assassinatePenetration = true;
            
            // ✅ FIX: 重新计算防御（因为ASSASSINATE穿透会影响防御计算）
            // 需要在设置标记后重新计算，确保穿透效果生效
            const monsterDefenseStats = { 
              p_def: monster.stats.p_def || 0, 
              m_def: monster.stats.m_def || 0 
            };
            const updatedResonance = this.calculateResonance(pTotals, monsterDefenseStats, playerUsesMagic, player);
            
            // 重新计算基础伤害（应用ASSASSINATE穿透）
            const updatedEffectiveDef = updatedResonance.effectiveDef;
            dmgToMon = Math.max(1, atkValue - updatedEffectiveDef);
            
            // 更新resonance对象，以便后续使用
            resonance.effectiveDef = updatedEffectiveDef;
            resonance.penetrationRate = updatedResonance.penetrationRate;
            
            // 显示combo提示
            if (game.floatingTextPool && game.settings && game.settings.showDamageNumbers !== false) {
              const comboText = game.floatingTextPool.create(
                monster.visualX + TILE_SIZE / 2,
                monster.visualY - 30,
                '暗杀!',
                '#ff00ff'
              );
              game.floatingTexts.push(comboText);
            }
            
          } else if (mastery && mastery.type === 'EXECUTE' && weaponType === 'SCYTHE') {
            // EXECUTE: Damage multiplier (标记，稍后应用)
            const dmgMult = mastery.dmgMult || 1.5;
            player.combatState.executeMultiplier = dmgMult;
            
            // 显示combo提示
            if (game.floatingTextPool && game.settings && game.settings.showDamageNumbers !== false) {
              const comboText = game.floatingTextPool.create(
                monster.visualX + TILE_SIZE / 2,
                monster.visualY - 30,
                '处决!',
                '#ff0000'
              );
              game.floatingTexts.push(comboText);
            }
          }
          
          // 重置combo计数（终结技触发后）
          player.combatState.comboCount = 0;
        }
      }
      
      // Note: Staff Overload effect is now handled earlier in STEP A0.4 (before melee combo logic)
      
      // ========== STEP A1: 符文效果 - Execute（处决） ==========
      // ✅ v2.1: Execute 的处理移到 onBeforeAttack hook 中，通过 damageMultiplier 修改伤害
      // 这里不再直接处理，由 processRuneHooks 在 onBeforeAttack 中处理
      
      // ========== STEP B: 技能状态 (Active Skills) - 重构为通用处理 ==========
      // ✅ FIX: 统一元素反应流程 - 先汇总所有伤害源和元素源，只调用一次applyElementalReaction
      // ✅ FIX: 重构为通用处理，支持所有职业的技能（不再硬编码特定技能名）
      let incomingElement = null;
      let skillDamageMultiplier = 1.0; // 技能伤害倍率
      let skillUsed = false; // 标记是否使用了技能
      let activeSkillId = null; // 当前使用的主动技能 ID
      let ultSkillId = null; // 当前使用的大招技能 ID
      let gemInfusionApplied = false; // 标记是否应用了宝石注灵
      
      // ✅ FIX: 通用技能状态检查 - 根据 player.skills 动态判断
      // 先检查大招（优先级高于主动技能）
      if (player.states && player.skills && player.skills.ULT) {
        const ultSkill = player.skills.ULT;
        const ultStateKey = ultSkill.id ? `${ultSkill.id}Primed` : 'freezePrimed'; // 兼容旧的 freezePrimed
        
        // 检查是否有大招预备状态
        if (player.states[ultStateKey] || player.states.freezePrimed) { // 兼容旧代码
          ultSkillId = ultSkill.id || 'glacial';
          incomingElement = player.states.ultElement || ELEMENTS.CRYO;
          skillUsed = true;
          // 大招的元素会覆盖主动技能的元素（如果同时存在）
        }
      }
      
      // 检查主动技能（优先级低于大招）
      if (player.states && player.skills && player.skills.ACTIVE && !skillUsed) {
        const activeSkill = player.skills.ACTIVE;
        const activeStateKey = activeSkill.id ? `${activeSkill.id}Primed` : null;
        
        // ✅ FIX: 通用检查 - 支持所有职业的技能状态
        // 检查是否使用了通用标记 activeSkillPrimed，或者根据技能 ID 生成的标记
        let isActiveSkillPrimed = false;
        
        // 方法1: 检查通用标记（如果实现了）
        if (player.states.activeSkillPrimed) {
          isActiveSkillPrimed = true;
          activeSkillId = activeSkill.id;
        }
        // 方法2: 检查技能 ID 对应的状态标记（兼容旧代码和新职业）
        else if (activeStateKey && player.states[activeStateKey]) {
          isActiveSkillPrimed = true;
          activeSkillId = activeSkill.id;
        }
        // 方法3: 兼容旧的特定技能标记（向后兼容）
        else if (player.states.slashPrimed || player.states.scorchPrimed) {
          isActiveSkillPrimed = true;
          // 根据状态推断技能 ID
          if (player.states.slashPrimed) activeSkillId = 'slash';
          else if (player.states.scorchPrimed) activeSkillId = 'scorch';
        }
        
        if (isActiveSkillPrimed) {
          skillUsed = true;
          
          // ✅ FIX: 根据技能 ID 设置元素和伤害倍率（从技能数据中读取）
          // 如果没有大招，主动技能的元素才会生效
          if (!ultSkillId) {
            if (activeSkillId === 'slash') {
              // Slash: 纯物理伤害，无元素
              incomingElement = null;
              skillDamageMultiplier = 1.5; // 从技能描述中读取：150%伤害
            } else if (activeSkillId === 'scorch') {
              // Scorch: 火元素
              incomingElement = ELEMENTS.PYRO;
            } else if (activeSkillId === 'backstab') {
              // Backstab: 纯物理伤害，200%伤害
              incomingElement = null;
              skillDamageMultiplier = 2.0;
            }
            // 其他职业的主动技能可以在这里扩展
            // 如果技能数据中包含元素信息，可以从 player.skills.ACTIVE.element 读取
            // 如果技能数据中包含伤害倍率，可以从 player.skills.ACTIVE.damageMultiplier 读取
            if (player.states.activeElement) {
              incomingElement = player.states.activeElement;
            }
          }
        }
      }
      
      // ========== STEP B0: 宝石注灵系统 (Gem Infusion) - 在技能检查之后应用 ==========
      // ✅ 只有在没有使用技能时，才应用宝石注灵（技能元素优先）
      if (!skillUsed && gemInfusionElement) {
        incomingElement = gemInfusionElement;
        gemInfusionApplied = true;
        
        // 视觉反馈：显示注灵消息
        const elementNames = {
          'PYRO': '火焰',
          'CRYO': '冰霜',
          'ELECTRO': '雷电',
          'POISON': '剧毒',
          'PHYSICAL': '物理'
        };
        const elementName = elementNames[incomingElement] || incomingElement;
        if (game.ui && game.ui.logMessage) {
          game.ui.logMessage(`你的攻击附带了${elementName}伤害！`, 'combat');
        }
      }
      
      // 应用技能伤害倍率（如果设置了倍率）
      if (skillUsed && skillDamageMultiplier > 1.0) {
        dmgToMon = Math.floor(dmgToMon * skillDamageMultiplier);
      }
      
      // 应用SCYTHE的EXECUTE终结技伤害倍率（150%）
      if (player.combatState && player.combatState.executeMultiplier) {
        dmgToMon = Math.floor(dmgToMon * player.combatState.executeMultiplier);
        player.combatState.executeMultiplier = null; // 清除标记
      }
      
      // ✅ FIX: 统一元素反应流程 - 只调用一次applyElementalReaction
      if (incomingElement) {
        const reaction = this.applyElementalReaction(monster, incomingElement, dmgToMon, player);
        if (reaction.reactionOccurred) {
          dmgToMon = reaction.finalDamage;
        } else {
          // 如果没有触发反应，应用基础状态效果
          // ✅ FIX: 通用技能元素状态效果（根据元素类型，而非特定技能）
          if (!monsterTraits.includes('MOLTEN_CORE')) {
            if (incomingElement === ELEMENTS.PYRO) {
              monster.applyStatus('BURN', player);
            } else if (incomingElement === ELEMENTS.CRYO) {
              monster.applyStatus('FREEZE', player);
              monster.applyStatus('FREEZE_DOT', player);
            } else if (incomingElement === ELEMENTS.POISON) {
              monster.applyStatus('POISON', player);
            }
            // ELECTRO 和 PHYSICAL 不应用基础状态
          }
        }
      }
      
      // ✅ FIX: 清除技能状态并触发CD（在造成伤害后）- 重构为通用处理
      if (skillUsed && player.startSkillCooldown && player.skills) {
        // 处理主动技能
        if (activeSkillId && player.skills.ACTIVE) {
          // ✅ FIX: 动态读取冷却时间，而不是硬编码
          const activeCd = player.skills.ACTIVE.cd || 5000; // 默认 5 秒
          
          // ✅ FIX: 清除所有可能的主动技能状态标记（通用清除）
          if (player.states) {
            // 清除通用标记
            player.states.activeSkillPrimed = false;
            // 清除技能 ID 对应的标记
            if (activeSkillId) {
              const stateKey = `${activeSkillId}Primed`;
              player.states[stateKey] = false;
            }
            // 兼容旧的特定标记（向后兼容）
            player.states.slashPrimed = false;
            player.states.scorchPrimed = false;
            player.states.activeElement = null;
          }
          
          // ✅ FIX: 使用动态 CD 值
          player.startSkillCooldown('active', activeCd);
        }
        
        // 处理大招（如果使用了）
        if (ultSkillId && player.skills.ULT) {
          // ✅ FIX: 动态读取冷却时间，而不是硬编码
          const ultCd = player.skills.ULT.cd || 20000; // 默认 20 秒
          
          // ✅ FIX: 清除所有可能的大招状态标记（通用清除）
          if (player.states) {
            // 清除技能 ID 对应的标记
            if (ultSkillId) {
              const stateKey = `${ultSkillId}Primed`;
              player.states[stateKey] = false;
            }
            // 兼容旧的 freezePrimed 标记（向后兼容）
            player.states.freezePrimed = false;
            player.states.ultElement = null;
          }
          
          // ✅ FIX: 使用动态 CD 值
          player.startSkillCooldown('ult', ultCd);
        }
      }
      
      // ========== STEP A2: 符文效果 - Execute（处决）必须在暴击之前应用 ==========
      // ✅ FIX: 修复 Execute 与暴击的乘法顺序 - 将 onBeforeAttack 移到暴击计算之前
      // 创建一个可修改的 context 对象，让 hook 可以修改伤害倍率
      const damageContext = {
        damage: dmgToMon,
        damageMultiplier: 1.0, // 初始倍率为 1.0
        damageType,
        isSkill: skillUsed
      };
      this.processHooks(player, monster, 'onBeforeAttack', damageContext);
      
      // 应用伤害倍率（如果 hook 修改了 damageMultiplier，如 Execute）
      if (damageContext.damageMultiplier && damageContext.damageMultiplier !== 1.0) {
        dmgToMon = Math.floor(dmgToMon * damageContext.damageMultiplier);
      }
      
      // ✅ FIX: 应用每日挑战词缀 - CURSED（诅咒）词缀的伤害乘区
      // 注意：这个乘区应该在所有其他伤害计算之后应用（作为最终乘区）
      if (player.dailyDamageMultiplier && player.dailyDamageMultiplier !== 1.0) {
        dmgToMon = Math.floor(dmgToMon * player.dailyDamageMultiplier);
      }
      
      // ✅ 屠龙者：对Boss/精英怪伤害独立+20%（独立乘区，在最终伤害计算后应用）
      if (player.activeKeystones && Array.isArray(player.activeKeystones) && player.activeKeystones.includes('DRAGON_SLAYER')) {
        if (monster.type === 'BOSS' || monster.isElite) {
          dmgToMon = Math.floor(dmgToMon * 1.2);
        }
      }
      
      // ========== STEP C: 暴击逻辑 (含共鸣暴伤加成) ==========
      let isCrit = false;
      let critChance = pTotals.crit_rate || COMBAT_CONFIG.BASE_CRIT_RATE || 0.2;
      
      // 检查EDGE的ASSASSINATE终结技（强制暴击）
      if (player.combatState && player.combatState.forceCrit) {
        isCrit = true;
        player.combatState.forceCrit = false; // 清除标记
      } else if (player.buffs && player.buffs.berserk && player.buffs.berserk.stacks > 0) {
        isCrit = true;
        player.buffs.berserk.stacks--;
      } else if (Math.random() < critChance) {
        isCrit = true;
      }
      
      // ASSASSINATE: 增加穿透（在暴击穿透基础上额外增加）
      if (player.combatState && player.combatState.assassinatePenetration && isCrit) {
        // 额外的穿透会在后续穿透计算中应用
        // 这里标记即可，实际穿透在calculateResonance中已经计算，这里可以通过修改effectiveDef来实现
        player.combatState.assassinatePenetration = false; // 清除标记
        // 注意：穿透效果已经在暴击穿透中体现，ASSASSINATE主要是强制暴击
      }

      if (isCrit) {
        // ✅ FIX: 玩家暴击时给予30%防御穿透（类似怪物暴击穿透）
        // ✅ FIX: 优化防御穿透的叠加逻辑 - 改为加法叠加并封顶100%
        const critPenetrationRate = 0.3;
        const baseDef = playerUsesMagic ? 
          (monMDef + (monPDef * 0.2)) : 
          (monPDef + (monMDef * 0.2));
        // 加法叠加穿透率，并在100%处截断
        const finalPenetration = Math.min(1.0, resonance.penetrationRate + critPenetrationRate);
        const critEffectiveDef = Math.max(0, Math.floor(baseDef * (1 - finalPenetration)));
        
        // 重新计算基础伤害（使用暴击穿透后的防御）
        dmgToMon = Math.max(1, atkValue - critEffectiveDef);
        
        // ✅ FIX: 使用玩家总属性中的crit_dmg作为基础倍率，而不是常量
        // 基础暴击倍率（来自玩家属性，已包含装备和天赋加成）+ 共鸣带来的额外暴伤
        const baseCritMult = pTotals.crit_dmg || 1.4;
        const finalCritMult = baseCritMult + resonance.critDmgBonus;
        dmgToMon = Math.floor(dmgToMon * finalCritMult);
      }
      
      // ✅ FIX: 防御计算优先级修正
      // 伤害公式：FinalDamage = (BaseAtk * Multipliers - Def * (1 - Penetration)) * ResistanceModifiers
      // 穿透在防御计算前应用，怪物特性（PLATING/ETHEREAL）作为最终乘区（Resistance）
      
      // ========== STEP C1: 怪物特性 - 金属装甲 (PLATING) ==========
      // ✅ FIX: PLATING作为最终乘区，在基础伤害计算后应用
      if (monsterTraits.includes('PLATING')) {
        // 发条骑士：物理抗性+50%，但雷属性伤害+50%
        if (!playerUsesMagic) {
          // 物理攻击：伤害减半（最终乘区）
          dmgToMon = Math.floor(dmgToMon * 0.5);
          // ✅ FIX: 优化飘字显示重叠 - 添加随机偏移
          if (game.floatingTextPool && game.settings && game.settings.showDamageNumbers !== false) {
            const offsetX = (Math.random() - 0.5) * 15;
            const offsetY = -30 - Math.random() * 10;
            const resistText = game.floatingTextPool.create(monster.visualX + TILE_SIZE / 2 + offsetX, monster.visualY + offsetY, '抵抗', '#999999');
            game.floatingTexts.push(resistText);
          }
        } else if (incomingElement === ELEMENTS.ELECTRO) {
          // 雷元素攻击：伤害+50%（最终乘区）
          dmgToMon = Math.floor(dmgToMon * 1.5);
          // ✅ FIX: 优化飘字显示重叠 - 添加随机偏移
          if (game.floatingTextPool && game.settings && game.settings.showDamageNumbers !== false) {
            const offsetX = (Math.random() - 0.5) * 15;
            const offsetY = -30 - Math.random() * 10;
            const weaknessText = game.floatingTextPool.create(monster.visualX + TILE_SIZE / 2 + offsetX, monster.visualY + offsetY, '弱点', '#ff9900');
            game.floatingTexts.push(weaknessText);
          }
        }
      }
      
      // ========== STEP C2: 怪物特性 - 虚无 (ETHEREAL) ==========
      // ✅ FIX: ETHEREAL作为最终乘区，确保逻辑一致性
      if (monsterTraits.includes('ETHEREAL')) {
        // 幽灵：物理伤害减免80%，但受到双倍魔法伤害
        // 通过比较玩家属性判断攻击类型（复用 playerUsesMagic 逻辑）
        if (!playerUsesMagic) {
          // 物理攻击：伤害减少80%（最终乘区）
          dmgToMon = Math.floor(dmgToMon * 0.2);
          // ✅ FIX: 优化飘字显示重叠 - 添加随机偏移
          if (game.floatingTextPool && game.settings && game.settings.showDamageNumbers !== false) {
            const offsetX = (Math.random() - 0.5) * 15;
            const offsetY = -30 - Math.random() * 10;
            const etherealText = game.floatingTextPool.create(monster.visualX + TILE_SIZE / 2 + offsetX, monster.visualY + offsetY, '虚无', '#cc00ff');
            game.floatingTexts.push(etherealText);
          }
        } else {
          // 魔法攻击：伤害翻倍（最终乘区）
          dmgToMon = Math.floor(dmgToMon * 2.0);
          // ✅ FIX: 优化飘字显示重叠 - 添加随机偏移
          if (game.floatingTextPool && game.settings && game.settings.showDamageNumbers !== false) {
            const offsetX = (Math.random() - 0.5) * 15;
            const offsetY = -30 - Math.random() * 10;
            const etherealText = game.floatingTextPool.create(monster.visualX + TILE_SIZE / 2 + offsetX, monster.visualY + offsetY, '魔法弱点', '#cc00ff');
            game.floatingTexts.push(etherealText);
          }
        }
      }
      
      // 播放音效
      if (game.audio) {
        isCrit ? game.audio.playCrit() : game.audio.playAttack();
      }
      
      // ========== STEP D: 怪物反击计算 (协同防御) ==========
      // 怪物攻击玩家时，也应用 calculateResonance 来计算玩家的防御
      const monsterUsesMagic = ((monster.stats.m_atk || 0) > (monster.stats.p_atk || 0));
      const monAtk = monsterUsesMagic ? (monster.stats.m_atk || 0) : (monster.stats.p_atk || 0);
      
      // 计算玩家的共鸣防御
      const playerResonance = this.calculateResonance(monster.stats, pTotals, monsterUsesMagic);
      
      // 玩家受到的伤害
      let dmgToPlay = Math.max(1, monAtk - playerResonance.effectiveDef);
      
      // ✅ 点石成金副作用：受到伤害+10%
      if (player.activeKeystones && Array.isArray(player.activeKeystones) && player.activeKeystones.includes('GOLDEN_TOUCH')) {
        dmgToPlay = Math.ceil(dmgToPlay * 1.1);
      }
      
      // Note: Combo state (lastTargetId, lastAttackTime) is already updated early (before early returns)
      
      // ✅ FIX: 更新 damageContext 中的伤害值和暴击状态（用于 onHit hook）
      damageContext.damage = dmgToMon; // 更新为最终伤害值（已包含 Execute 和暴击）
      damageContext.isCrit = isCrit; // 更新暴击状态
      
      // ✅ v2.0: Hook - onHit（命中后，造成伤害前）
      // ✅ v2.1: 符文系统 hooks 会在这里处理 Thunder 和 Vampire
      // ✅ FIX: 确保 onHit 读取的是最终伤害值（已包含 Execute 和暴击）
      this.processHooks(player, monster, 'onHit', damageContext);
      
      // 应用伤害（使用最终计算后的伤害值）
      monster.stats.hp -= dmgToMon;
      
      // ✅ FIX: 累加实际伤害到统计（用于排行榜）
      if (game.totalDamageDealt !== undefined) {
        game.totalDamageDealt += dmgToMon;
      }
      
      if (game.achievementSystem) {
        game.achievementSystem.check('onDamage', { damage: dmgToMon });
      }
      
      monster.inCombat = true;
      monster.lastDamageTime = Date.now();
      
      // ✅ FIX: 精英怪词缀逻辑 - 使用damageType而非playerUsesMagic
      // ✅ FIX: 荆棘反伤是被动效果，即使怪物死亡也应触发
      // ✅ FIX: 修复荆棘反伤过量伤害计算 - 基于实际造成的伤害（不超过怪物当前HP）来计算反伤
      let thornsDamage = 0;
      if (monster.isElite && monster.hasAffix && monster.hasAffix('THORNS') && damageType === 'PHYSICAL') {
        // 计算实际造成的伤害（不超过怪物当前HP，防止溢出伤害导致过量反伤）
        const actualDamage = Math.min(dmgToMon, monster.stats.hp);
        // ✅ FIX: 优化荆棘反伤逻辑 - 让反伤受到玩家防御减免
        const rawThornsDamage = Math.floor(actualDamage * ELITE_AFFIXES.THORNS.reflectPercent);
        // 将反伤视为物理攻击，应用玩家防御减免
        const thornsEffectiveDef = pTotals.p_def || 0;
        thornsDamage = Math.max(1, rawThornsDamage - thornsEffectiveDef);
        player.takeDamage(thornsDamage);
        if (game.settings && game.settings.showDamageNumbers !== false) {
          // ✅ FIX: 优化飘字显示重叠 - 添加随机偏移
          const offsetX = (Math.random() - 0.5) * 15;
          const offsetY = -20 - Math.random() * 10;
          const reflectText = game.floatingTextPool.create(player.visualX + TILE_SIZE / 2 + offsetX, player.visualY + offsetY, `-${thornsDamage}`, '#ffffff'); // 怪物被动反击飘字为白色
          game.floatingTexts.push(reflectText);
        }
      }
      
      if (monster.isElite && monster.onDamageTaken) {
        monster.onDamageTaken(dmgToMon, player);
      }
      
      // 显示伤害数字 (飘字)
      let damageText = `-${dmgToMon}`;
      let damageColor = '#ff0000'; // 玩家攻击怪物的伤害飘字为红色
      let floatingTextType = 'NORMAL';
      
      // ✅ FIX: 通用技能名称显示（根据技能 ID 显示技能名）
      let critIcon = null; // 暴击图标索引
      if (skillUsed && activeSkillId) {
        const skillName = player.skills?.ACTIVE?.name || activeSkillId;
        if (isCrit) {
          damageText = `${skillName}暴击 -${dmgToMon}`;
          damageColor = '#FF2424'; // 红色
          critIcon = 6; // 暴击图标索引
        } else {
          damageText = `${skillName}！-${dmgToMon}`;
          damageColor = '#ff6b6b';
        }
      } else if (skillUsed && ultSkillId) {
        const ultName = player.skills?.ULT?.name || ultSkillId;
        damageText = `${ultName}! -${dmgToMon}`;
        damageColor = incomingElement === ELEMENTS.CRYO ? '#00bfff' : '#ff6b6b';
      } else if (isCrit) { 
        damageText = `暴击 -${dmgToMon}`; 
        damageColor = '#FF2424'; // 深红色
        floatingTextType = 'CRIT'; // 使用暴击类型
        critIcon = 6; // 暴击图标索引
      }
      
      if (game.settings && game.settings.showDamageNumbers !== false) {
        // ✅ FIX: 优化飘字显示重叠 - 添加随机偏移
        const offsetX = (Math.random() - 0.5) * 15;
        const offsetY = -10 - Math.random() * 10;
        const monsterDamageText = game.floatingTextPool.create(
          monster.visualX + TILE_SIZE / 2 + offsetX, 
          monster.visualY + offsetY, 
          damageText, 
          damageColor,
          critIcon, // 传递图标索引（数字6）或null
          16,
          floatingTextType
        );
        game.floatingTexts.push(monsterDamageText);
      }
      
      // 触发刀光特效
      if (game.vfx) {
        // 计算玩家和怪物的中心点坐标
        const playerCenterX = player.visualX + TILE_SIZE / 2;
        const playerCenterY = player.visualY + TILE_SIZE / 2;
        const centerX = monster.visualX + TILE_SIZE / 2;
        const centerY = monster.visualY + TILE_SIZE / 2;
        
        // 使用中心点计算攻击角度
        const dx = centerX - playerCenterX;
        const dy = centerY - playerCenterY;
        const angle = Math.atan2(dy, dx);
        
        // 在怪物中心触发特效
        game.vfx.triggerSlash(centerX, centerY, angle, isCrit);
      }
      
      if (dmgToMon > 10) game.camera.shakeTimer = Math.max(game.camera.shakeTimer || 0, 10);
      
      // ✅ FIX: 修复死亡反击逻辑 - 如果怪物在受到玩家攻击后HP已经 <= 0，则不应进行普通攻击反击
      // 但THORNS反伤已经在上方处理（被动效果，即使怪物死亡也应触发）
      if (monster.stats.hp > 0) {
        // 怪物还活着，进行反击
        player.takeDamage(dmgToPlay);
        if (dmgToPlay > 0) {
          if (game.settings && game.settings.showDamageNumbers !== false) {
            // ✅ FIX: 优化飘字显示重叠 - 添加随机偏移
            const offsetX = (Math.random() - 0.5) * 15;
            const offsetY = -10 - Math.random() * 10;
            const playerDamageText = game.floatingTextPool.create(player.visualX + TILE_SIZE / 2 + offsetX, player.visualY + offsetY, `-${dmgToPlay}`, '#ffffff'); // 怪物主动反击飘字为白色
            game.floatingTexts.push(playerDamageText);
          }
          if (dmgToPlay > 10) game.camera.shakeTimer = Math.max(game.camera.shakeTimer || 0, 10);
          if (game.audio) game.audio.playHit();
          
          // ✅ FIX: 修复吸血在反击时失效 - 怪物反击时也能触发吸血
          if (monster.isElite && monster.hasAffix && monster.hasAffix('VAMPIRIC') && monster.stats.hp > 0) {
            const healAmount = Math.floor(dmgToPlay * 0.5); // 回复造成伤害的50%
            monster.stats.hp = Math.min(monster.stats.maxHp, monster.stats.hp + healAmount);
            if (game.floatingTextPool && game.settings && game.settings.showDamageNumbers !== false) {
              // ✅ FIX: 优化飘字显示重叠 - 添加随机偏移
              const offsetX = (Math.random() - 0.5) * 15;
              const offsetY = -30 - Math.random() * 10;
              const healText = game.floatingTextPool.create(monster.visualX + TILE_SIZE / 2 + offsetX, monster.visualY + offsetY, `+${healAmount}`, '#00ff00');
              game.floatingTexts.push(healText);
            }
            if (monster.eliteVisualEffects) monster.eliteVisualEffects.vampiricTintTimer = 100;
          }
        }
      }
      
      // 日志
      const logDetails = [];
      if (skillUsed && activeSkillId) {
        const skillName = player.skills?.ACTIVE?.name || activeSkillId;
        logDetails.push(skillName);
      }
      if (skillUsed && ultSkillId) {
        const ultName = player.skills?.ULT?.name || ultSkillId;
        logDetails.push(ultName);
      }
      if (isCrit) logDetails.push('CRIT');
      if (resonance.penetrationRate > 0) logDetails.push(`穿透${Math.round(resonance.penetrationRate*100)}%`);
      
      const logSuffix = logDetails.length > 0 ? ` [${logDetails.join('+')}]` : '';
      const monsterName = MONSTER_STATS[monster.type]?.cnName || monster.type;
      const totalDamageToPlayer = dmgToPlay + thornsDamage;
      
      game.ui.logMessage(`击中 ${monsterName} 造成 ${dmgToMon} 伤害${logSuffix}。受到 ${totalDamageToPlayer} 伤害。`, 'combat');
      
      // ✅ v2.0: Hook - onKill（击杀时）
      if (monster.stats.hp <= 0) {
        this.processHooks(player, monster, 'onKill', {
          damage: dmgToMon,
          isCrit,
          damageType
        });
        // ========== STEP E: 怪物特性 - 能量过载 (OVERLOAD) ==========
        if (monsterTraits.includes('OVERLOAD')) {
          // 虚空晶体：死亡时对周围1格造成200%魔法攻击的自爆伤害
          // 自爆应对周围1格内的所有单位（包括玩家和其他怪物）造成伤害，增加战术趣味性
          const aoeDamage = Math.floor((monster.stats.m_atk || 0) * 2.0);
          const aoeRange = 1; // 1格范围（曼哈顿距离）
          
          let explosionOccurred = false;
          
          // 对玩家造成伤害（如果在范围内）
          const distToPlayer = Math.abs(player.x - monster.x) + Math.abs(player.y - monster.y);
          if (distToPlayer <= aoeRange) {
            player.takeDamage(aoeDamage);
            explosionOccurred = true;
            // ✅ FIX: 优化飘字显示重叠 - 添加随机偏移
            if (game.floatingTextPool && game.settings && game.settings.showDamageNumbers !== false) {
              const offsetX = (Math.random() - 0.5) * 15;
              const offsetY = -10 - Math.random() * 10;
              const explodeText = game.floatingTextPool.create(player.visualX + TILE_SIZE / 2 + offsetX, player.visualY + offsetY, `-${aoeDamage}`, '#ff00ff');
              game.floatingTexts.push(explodeText);
            }
            if (game.ui) {
              game.ui.logMessage(`虚空晶体爆炸！受到 ${aoeDamage} 伤害`, 'combat');
            }
          }
          
          // 对周围所有其他怪物也造成伤害（增加战术趣味性）
          if (game && game.map && game.map.monsters) {
            for (const otherMonster of game.map.monsters) {
              if (otherMonster === monster || otherMonster.stats.hp <= 0) continue; // 跳过自己和已死亡的怪物
              
              const dist = Math.abs(otherMonster.x - monster.x) + Math.abs(otherMonster.y - monster.y);
              if (dist <= aoeRange) {
                otherMonster.stats.hp -= aoeDamage;
                explosionOccurred = true;
                
                // ✅ FIX: 优化飘字显示重叠 - 添加随机偏移
                if (game.floatingTextPool && game.settings && game.settings.showDamageNumbers !== false) {
                  const offsetX = (Math.random() - 0.5) * 15;
                  const offsetY = -10 - Math.random() * 10;
                  const aoeText = game.floatingTextPool.create(otherMonster.visualX + TILE_SIZE / 2 + offsetX, otherMonster.visualY + offsetY, `-${aoeDamage}`, '#ff00ff');
                  game.floatingTexts.push(aoeText);
                }
                
                // 检查其他怪物是否死亡
                if (otherMonster.stats.hp <= 0) {
                  // 如果其他怪物也有 OVERLOAD 特性，也会触发自爆（连锁反应）
                  if (otherMonster.stats.traits && otherMonster.stats.traits.includes('OVERLOAD')) {
                    // 递归触发自爆（但限制深度避免无限循环）
                    const otherAoeDamage = Math.floor((otherMonster.stats.m_atk || 0) * 2.0);
                    const otherDistToPlayer = Math.abs(player.x - otherMonster.x) + Math.abs(player.y - otherMonster.y);
                    if (otherDistToPlayer <= aoeRange) {
                      player.takeDamage(otherAoeDamage);
                      // ✅ FIX: 优化飘字显示重叠 - 添加随机偏移
                      if (game.floatingTextPool && game.settings && game.settings.showDamageNumbers !== false) {
                        const offsetX = (Math.random() - 0.5) * 15;
                        const offsetY = -20 - Math.random() * 10;
                        const chainText = game.floatingTextPool.create(player.visualX + TILE_SIZE / 2 + offsetX, player.visualY + offsetY, `连锁爆炸! -${otherAoeDamage}`, '#ff00ff');
                        game.floatingTexts.push(chainText);
                      }
                    }
                  }
                  
                  // 移除死亡的怪物
                  game.map.removeMonster(otherMonster);
                }
              }
            }
          }
          
          // 如果发生了爆炸，播放镜头震动效果
          if (explosionOccurred && game.camera) {
            game.camera.shakeTimer = Math.max(game.camera.shakeTimer || 0, 30);
          }
        }
        
        if (monster.isElite && monster.hasAffix && monster.hasAffix('VOLATILE')) {
          if (!monster.eliteVisualEffects.volatileExploding) {
            monster.triggerVolatileDeath();
            return 'BOUNCE';
          } else {
            // ✅ FIX: 自爆期间保持 HP 为 1，防止显示负数
            monster.stats.hp = 1;
            return 'BOUNCE';
          }
        }
        game.ui.logMessage('敌人已击败！', 'gain');
        if (game.achievementSystem) game.achievementSystem.check('onCombatEnd', { won: true });
        
        const g = monster.stats.goldYield || monster.stats.gold || 0;
        const xp = monster.stats.xpYield || monster.stats.xp || 0;
        const ry = monster.stats.rageYield || 0;
        
        // ✅ FIX: 优化飘字显示重叠 - 金币和XP使用不同的高度偏移
        if (g > 0) {
          player.stats.gold = (player.stats.gold || 0) + g;
          if (game.settings && game.settings.showDamageNumbers !== false) {
            const offsetX = (Math.random() - 0.5) * 15;
            const goldText = game.floatingTextPool.create(monster.visualX + TILE_SIZE / 2 + offsetX, monster.visualY - 26, `+${g} 金币`, '#ffd700');
            game.floatingTexts.push(goldText);
          }
          if (game.audio) game.audio.playCoins({ forceCategory: 'gameplay' });
        }
        if (xp > 0) {
          game.totalXpGained = (game.totalXpGained || 0) + xp;
          const leveled = player.gainXp(xp);
          // 移除 XP 飘字
          
          if (leveled && game.roguelike && game.roguelike.triggerDraft) {
            game.roguelike.triggerDraft('ELITE', monster, 'LEVEL_UP');
          }
        }
        if (ry > 0) player.gainRage(ry);
        
        // ✅ FIX: 使用 RNG（如果存在，每日挑战模式需要确定性）
        const rng = (game.isDailyMode && game.rng) ? game.rng : null;
        
        // 装备掉落判定
        const equipmentRandom = rng ? rng.next() : Math.random();
        if (equipmentRandom < 0.3) {
          // ✅ 使用程序化生成系统
          // ✅ FIX: 应用每日挑战词缀 - LUCKY（幸运）词缀的魔法发现加成
          const baseMagicFind = player.stats.magicFind || 0;
          const dailyMagicFind = player.dailyMagicFind || 0;
          const totalMagicFind = baseMagicFind + dailyMagicFind;
          
          const drop = getEquipmentDropForFloor(player.stats.floor || 1, {
            monsterTier: monster.tier || 1,
            playerClass: player.classId?.toLowerCase() || null,
            magicFind: totalMagicFind,
            ascensionLevel: game.selectedAscensionLevel || 0,
            game: game // ✅ FIX: 传递 game 对象以支持每日挑战模式的 RNG
          });
          if (drop) {
            // 新系统返回对象，旧系统返回有.id属性的对象
            game.map.addEquipAt(drop.id || drop, monster.x, monster.y);
          }
        }
        
        // 消耗品掉落判定
        const consumableRandom = rng ? rng.next() : Math.random();
        if (consumableRandom < 0.15) {
          const consumable = getRandomConsumable(rng);
          if (consumable) game.map.addConsumableAt(consumable.id, monster.x, monster.y);
        }
        
        // 检查是否是 FallenAdventurer（Ghost），处理特殊掉落
        if (monster.type === 'FALLEN_ADVENTURER' || monster.isFallenAdventurer) {
          const currentPlayerId = localStorage.getItem('leaderboard_user_id');
          const dropResult = monster.getDrop(currentPlayerId);
          
          if (dropResult.isSelf) {
            // 自己的尸体：显示特殊消息
            if (game.ui) {
              game.ui.logMessage('你安息了自己的过往... (获得少量水晶)', 'info');
            }
            // 水晶已在 getDrop 中添加
          } else {
            // 他人的尸体：给予奖励
            // 水晶已在 getDrop 中添加
            
            // 装备掉落
            if (dropResult.equipment) {
              game.map.addEquipAt(dropResult.equipment, monster.x, monster.y);
              if (game.ui) {
                const itemName = dropResult.equipment.nameZh || dropResult.equipment.name || '装备';
                game.ui.logMessage(`获得了 ${itemName}！`, 'gain');
              }
            }
            
            // 属性掠夺
            if (dropResult.statBonus) {
              const { key, value } = dropResult.statBonus;
              const statNames = {
                maxHp: '最大生命',
                hp: '生命',
                p_atk: '物理攻击',
                m_atk: '魔法攻击',
                p_def: '物理防御',
                m_def: '魔法防御'
              };
              const statName = statNames[key] || key;
              
              // 应用属性加成
              if (key === 'maxHp' || key === 'hp') {
                player.stats.maxHp = (player.stats.maxHp || 100) + value;
                player.stats.hp = Math.min(player.stats.hp || 100, player.stats.maxHp);
              } else if (player.stats[key] !== undefined) {
                player.stats[key] = (player.stats[key] || 0) + value;
              }
              
              // 显示浮动文字
              if (game.floatingTextPool && game.settings && game.settings.showDamageNumbers !== false) {
                const bonusText = game.floatingTextPool.create(
                  monster.visualX + TILE_SIZE / 2,
                  monster.visualY - 30,
                  `吸收了 ${monster.nickname || '冒险者'} 的力量！${statName} +${value}`,
                  '#ffaa00'
                );
                game.floatingTexts.push(bonusText);
              }
              
              if (game.ui) {
                game.ui.logMessage(`吸收了 ${monster.nickname || '冒险者'} 的力量！${statName} +${value}`, 'gain');
              }
            }
          }
        }
        
        game.killCount = (game.killCount || 0) + 1;
        if (game.achievementSystem) game.achievementSystem.check('onKill');
        
        // 任务系统：检查击杀事件
        if (game.questSystem) {
          game.questSystem.check('onKill', { monsterType: monster.type });
        }
        
        // 符文强化触发判定 (Draft Trigger) - 概率触发以控制数值膨胀
        if (game.roguelike && game.roguelike.triggerDraft) {
          // 基础概率：普通怪 40%
          let draftChance = 0.4;

          // 精英或 Boss 必定触发
          if (monster.isElite || monster.type === 'BOSS') {
            draftChance = 1.0;
          }

          // 兼容每日挑战固定 RNG；否则使用 Math.random
          const draftRoll = rng ? rng.next() : Math.random();

          if (draftRoll < draftChance) {
            game.roguelike.triggerDraft('NORMAL', monster, 'MONSTER_KILL');
          }
        }
        
        game.map.removeMonster(monster);
        
        // 钥匙掉落判定（FallenAdventurer 不掉落钥匙）
        if (monster.type !== 'FALLEN_ADVENTURER' && !monster.isFallenAdventurer) {
          const keyRandom = rng ? rng.next() : Math.random();
          if (keyRandom < 0.2) game.map.addItem('ITEM_KEY_BRONZE', monster.x, monster.y);
        }
        game.ui.updateStats(player);
        player.pendingCombat = null;
        player.isMoving = false;
        
        return 'WIN';
      } else {
        return 'BOUNCE';
      }
    }
    return 'NONE';
  }

  // 怪物主动攻击玩家（怪物不受伤害）
  static monsterAttackPlayer(player, monster) {
    const game = window.game;
    const pTotals = (player.getTotalStats ? player.getTotalStats() : player.stats);
    
    // 使用"格子"邻接判定
    const gridDist = Math.abs(player.x - monster.x) + Math.abs(player.y - monster.y);
    if (gridDist !== 1) return 'NONE';
    
    monster.inCombat = true;
    monster.lastDamageTime = Date.now();
    
    // 面向玩家
    const dx = player.x - monster.x;
    const dy = player.y - monster.y;
    let direction = 0;
    if (Math.abs(dx) > Math.abs(dy)) direction = dx > 0 ? 3 : 2;
    else direction = dy > 0 ? 0 : 1;
    if (monster.sprite) monster.sprite.setDirection(direction);
    
    // 闪避判定
    // ✅ FIX: 使用 RNG（如果存在，每日挑战模式需要确定性）
    const rng = (game.isDailyMode && game.rng) ? game.rng : null;
    const dodgeRate = pTotals.dodge || 0;
    const dodgeRoll = rng ? rng.next() : Math.random();
    if (dodgeRoll < dodgeRate) {
      if (player.triggerDodgeAnimation) player.triggerDodgeAnimation();
      // ✅ FIX: 优化飘字显示重叠 - 添加随机偏移
      if (game.floatingTextPool && game.settings && game.settings.showDamageNumbers !== false) {
        const offsetX = (Math.random() - 0.5) * 15;
        const offsetY = -10 - Math.random() * 10;
        const missText = game.floatingTextPool.create(player.visualX + TILE_SIZE / 2 + offsetX, player.visualY + offsetY, 'MISS', '#ffffff');
        game.floatingTexts.push(missText);
      }
      return 'DODGED';
    }
    
    // 1. 基础攻击力计算 (含激怒加成)
    const monsterUsesMagic = ((monster.stats.m_atk || 0) > (monster.stats.p_atk || 0));
    let baseAtk = monsterUsesMagic ? (monster.stats.m_atk || 0) : (monster.stats.p_atk || 0);
    
    // 应用激怒加成 (FATIGUE_CONFIG) - 每层+5%攻击力
    const powerMult = monster.getPowerMultiplier ? monster.getPowerMultiplier() : 1.0;
    let effectiveAtk = Math.floor(baseAtk * powerMult);
    
    // 2. 玩家防御力计算 (应用共鸣：协同防御)
    // ✅ 防御减免只应用一次：通过 calculateResonance 计算有效防御
    // 参数：attackerStats(怪物), defenderStats(玩家), isMagic
    // ✅ 注意：属性共鸣的穿透（penetrationRate）已经在 calculateResonance 中应用到 effectiveDef
    // 怪物没有内置穿透属性，只有 FATIGUE_CONFIG 带来的穿透（通过 getPenetrationBonus 应用）
    const resonance = this.calculateResonance(monster.stats, pTotals, monsterUsesMagic);
    let plyDef = resonance.effectiveDef; // 这是唯一一次应用防御减免的地方（已包含属性共鸣穿透）
    
    // ========== 怪物特性 - 斩杀 (EXECUTION) ==========
    // 在计算 baseDamage 之前，先检查玩家 HP 百分比
    const monsterTraits = monster.stats.traits || [];
    let isCrit = false;
    let critMultiplier = CRITICAL_CONFIG.MULTIPLIER || 1.4;
    
    if (monsterTraits.includes('EXECUTION')) {
      // 死神：对生命值低于30%的目标造成双倍暴击伤害
      const hpPercent = player.stats.hp / player.stats.maxHp;
      if (hpPercent < 0.3) {
        isCrit = true; // 强制暴击
        critMultiplier = critMultiplier * 2.0; // 双倍暴击伤害
      }
    }
    
    // 3. 暴击判定 (暴击穿甲)
    // ✅ FIX: 使用 RNG（如果存在，每日挑战模式需要确定性）
    const critRng = (game.isDailyMode && game.rng) ? game.rng : null;
    const critChance = monster.isElite ? CRITICAL_CONFIG.MONSTER_CHANCE * 2 : CRITICAL_CONFIG.MONSTER_CHANCE;
    const critRoll = critRng ? critRng.next() : Math.random();
    
    if (!isCrit && critRoll < critChance) {
      isCrit = true;
      // 暴击穿透：无视一定比例防御 (在协同防御基础上再穿透)
      plyDef = Math.floor(plyDef * (1 - CRITICAL_CONFIG.PIERCE_PERCENT));
    } else if (isCrit) {
      // 如果已经因为EXECUTION特性触发暴击，也需要应用穿透
      plyDef = Math.floor(plyDef * (1 - CRITICAL_CONFIG.PIERCE_PERCENT));
    }
    
    // 4. 穿透伤害计算 (固定穿透机制 + 激怒穿透加成)
    let penRate = PENETRATION_CONFIG.BASE_RATE;
    if (monster.type === 'BOSS') penRate += PENETRATION_CONFIG.BOSS_BONUS;
    else if (monster.isElite) penRate += PENETRATION_CONFIG.ELITE_BONUS;
    
    // ✅ 应用激怒穿透加成 (FATIGUE_CONFIG) - 每层+1%穿透
    if (monster.getPenetrationBonus) {
      penRate += monster.getPenetrationBonus();
    }
    
    const penetrationDamage = Math.ceil(effectiveAtk * penRate);
    
    // 5. 最终伤害公式
    // ✅ 防御减免只应用一次：在计算baseDamage时通过 (effectiveAtk - plyDef) 应用
    // 伤害 = (攻击 - 防御) * 暴击倍率 + 穿透伤害
    let baseDamage = Math.max(0, effectiveAtk - plyDef);
    
    if (isCrit) {
      baseDamage = Math.floor(baseDamage * critMultiplier);
    }
    
    // ✅ Boss激怒层数已正确乘算：
    // - 攻击力加成通过 powerMult 应用到 effectiveAtk
    // - 穿透加成通过 penRate 应用到 penetrationDamage
    // - 最终伤害 = (effectiveAtk - plyDef) * critMult + penetrationDamage
    let finalDamage = baseDamage + penetrationDamage;
    finalDamage = Math.max(1, finalDamage);
    
    // ✅ v2.0: Hook - onDamaged（玩家受到伤害时）
    // ✅ v2.1: 符文系统 hooks 会在这里处理 Cursed（受伤加深）
    // 创建一个可修改的伤害对象，让 hook 可以修改伤害值
    const damageContext = {
      damage: finalDamage,
      isCrit,
      isMonsterAttack: true
    };
    this.processHooks(player, monster, 'onDamaged', damageContext);
    
    // 6. 应用伤害（使用 hook 处理后的伤害值）
    const actualDamage = damageContext.damage || finalDamage;
    player.takeDamage(actualDamage);
    
    // ========== 怪物特性 - 黏液 (STICKY) ==========
    if (monsterTraits.includes('STICKY') && finalDamage > 0) {
      // 史莱姆：攻击时降低玩家30%移动速度，持续2秒
      player.applyStatus('SLOW', monster, { duration: 2000 });
    }
    
    // ========== 怪物特性 - 毒性皮肤 (TOXIC_SKIN) ==========
    if (monsterTraits.includes('TOXIC_SKIN') && finalDamage > 0) {
      // 沼泽居民：攻击时使玩家中毒
      player.applyStatus('POISON', monster);
    }
    
    // 吸血词缀
    if (monster.isElite && monster.hasAffix && monster.hasAffix('VAMPIRIC') && finalDamage > 0) {
      const healAmount = Math.ceil(finalDamage * 0.5);
      monster.stats.hp = Math.min(monster.stats.maxHp, monster.stats.hp + healAmount);
      if (monster.eliteVisualEffects) monster.eliteVisualEffects.vampiricTintTimer = 100;
    }
    
    // 显示伤害
    if (finalDamage > 0) {
      if (game.settings && game.settings.showDamageNumbers !== false) {
        let dmgText = `-${finalDamage}`;
        let color = '#ffffff'; // 怪物主动攻击玩家的伤害飘字为白色
        let type = 'NORMAL';
        let critIcon = null; // 暴击图标索引
        
        if (isCrit) {
          dmgText = `暴击 -${finalDamage}`;
          color = '#FF2424'; // 深红色
          type = 'CRIT'; // 使用暴击类型
          critIcon = 6; // 暴击图标索引
        } else if (baseDamage === 0 && penetrationDamage > 0) {
           color = '#ff8c00';
        }
        
        const damageText = game.floatingTextPool.create(
          player.visualX + TILE_SIZE / 2, 
          player.visualY - 10, 
          dmgText, 
          color,
          critIcon, // 传递图标索引（数字6）或null
          16,
          type
        );
        // 移除旧的 scale 设置（现在由内部动画控制）
        game.floatingTexts.push(damageText);
      }
      
      if (finalDamage > 10) game.camera.shakeTimer = Math.max(game.camera.shakeTimer || 0, 10);
      if (game.audio) {
        if (isCrit) game.audio.playCrit();
        else game.audio.playHit();
      }
    }
    
    // Log
    const monsterName = MONSTER_STATS[monster.type]?.cnName || monster.type;
    let logMsg = `${monsterName} 攻击你！`;
    if (isCrit) logMsg += ' [暴击!]';
    if (monster.enrageStacks > 0) logMsg += ` (激怒 ${monster.enrageStacks})`;
    logMsg += ` 受到 ${finalDamage} 伤害。`;
    
    game.ui.logMessage(logMsg, 'combat');
    
    return 'MONSTER_ATTACK';
  }

  /**
   * 怪物死亡时的通用处理（供闪电链、顺劈等间接击杀调用）
   * 目前主要用于触发视觉特效，并安全移除怪物
   * @param {Entity} monster
   * @param {Entity} attacker
   */
  static handleMonsterDeath(monster, attacker) {
    const game = window.game;
    if (!game || !monster) return;

    // 视觉效果：死亡烟雾粒子
    if (game.vfx) {
      const wx = monster.x * TILE_SIZE + TILE_SIZE / 2;
      const wy = monster.y * TILE_SIZE + TILE_SIZE / 2;
      game.vfx.emitParticles(wx, wy, 'DEATH');
    }

    // 目前保持逻辑最小侵入：只负责移除怪物，避免破坏既有掉落/经验结算流程
    if (game.map && game.map.removeMonster) {
      game.map.removeMonster(monster);
    }
  }
}

