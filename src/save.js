// save.js - 存档和读取系统
import { TILE_SIZE, TILE, EQUIPMENT_DB, CHARACTERS } from './constants.js';
import { createStandardizedItem, serializeItem, deserializeItem } from './data/items.js';
import { RUNE_POOL, RUNE_RARITY_MULTIPLIERS } from './data/Runes.js';
import { Player } from './entities.js';

/**
 * ✅ FIX: 根据装备品质生成孔位数量（用于旧存档兼容性）
 * @param {string} quality - 装备品质
 * @returns {number} 孔位数量
 */
function generateSocketsForQuality(quality) {
  const randomValue = Math.random();
  let socketCount = 0;
  
  if (quality === 'COMMON' || quality === 'UNCOMMON') {
    // 10% 几率 1 孔
    if (randomValue < 0.10) {
      socketCount = 1;
    }
  } else if (quality === 'RARE') {
    // 30% 1 孔, 10% 2 孔
    if (randomValue < 0.10) {
      socketCount = 2;
    } else if (randomValue < 0.40) {
      socketCount = 1;
    }
  } else if (quality === 'EPIC') {
    // 50% 1-2 孔
    if (randomValue < 0.50) {
      socketCount = Math.random() < 0.5 ? 1 : 2;
    }
  } else if (quality === 'LEGENDARY' || quality === 'MYTHIC') {
    // 80% 2-3 孔
    if (randomValue < 0.80) {
      socketCount = Math.random() < 0.5 ? 2 : 3;
    }
  }
  
  return socketCount;
}

export class SaveSystem {
  static SAVE_KEY = 'mota_save_data';

  /**
   * 保存游戏数据到 localStorage
   * @param {Game} game - 游戏实例
   * @returns {boolean} - 是否保存成功
   */
  static save(game) {
    try {
      // ✅ CRITICAL FIX: 每日挑战模式绝对禁止保存，防止覆盖主线进度存档
      if (game && game.isDailyMode === true) {
        console.warn('SaveSystem: 每日挑战模式禁止保存');
        return false;
      }
      
      if (!game || !game.player || !game.map) {
        console.error('SaveSystem: 无法保存 - 游戏数据不完整');
        return false;
      }

      const player = game.player;
      const saveData = {
        // 角色ID（用于读档时重新创建正确的角色实例）
        charId: player.charConfig ? player.charConfig.id : 'WARRIOR', // 保存角色ID
        // 玩家属性
        stats: {
          hp: player.stats.hp ?? 100,
          maxHp: player.stats.maxHp ?? 100,
          p_atk: player.stats.p_atk ?? 15,
          p_def: player.stats.p_def ?? 5,
          m_atk: player.stats.m_atk ?? 0,
          m_def: player.stats.m_def ?? 0,
          rage: player.stats.rage ?? 0,
          mp: player.stats.mp ?? 0,
          maxMp: player.stats.maxMp ?? 0,
          mp_regen: player.stats.mp_regen ?? 0,
          mp_on_hit: player.stats.mp_on_hit ?? 0,
          lvl: player.stats.lvl ?? 1,
          xp: player.stats.xp ?? 0,
          nextLevelXp: player.stats.nextLevelXp ?? 50,
          keys: player.stats.keys ?? 1,
          floor: player.stats.floor ?? 1,
          gold: player.stats.gold ?? 0,
          // ✅ FIX: soulCrystals是元进度数据，已由MetaSaveSystem独立接管，不再在此保存
        },
        // ✅ FIX: 保存玩家状态效果（Buff/Debuff）
        statuses: player.statuses ? player.statuses.map(status => ({
          type: status.type,
          duration: status.duration,
          timer: status.timer,
          tickTimer: status.tickTimer,
          config: status.config || {}
        })) : [],
        // ✅ FIX: 保存玩家技能预备状态（如slashPrimed等）
        states: player.states ? {
          slashPrimed: player.states.slashPrimed || false,
          scorchPrimed: player.states.scorchPrimed || false,
          freezePrimed: player.states.freezePrimed || false,
          activeElement: player.states.activeElement || null,
          ultElement: player.states.ultElement || null
        } : {},
        // ✅ FIX: 保存玩家activeDoTs（精简数据，不保存函数引用）
        // ✅ FIX: 统一使用sourceId字段，而不是sourceType
        activeDoTs: player.activeDoTs ? player.activeDoTs.map(dot => ({
          type: dot.type,
          damage: dot.damage,
          duration: dot.duration,
          tickInterval: dot.tickInterval,
          elapsedTime: dot.elapsedTime || 0,
          nextTickTime: dot.nextTickTime || dot.tickInterval,
          tetherRadius: dot.tetherRadius || null,
          sourceId: dot.sourceId || (dot.source ? (dot.source === player ? 'player' : null) : null) // 统一使用sourceId
        })) : [],
        // 背包（使用新的序列化系统）
        inventory: player.inventory.map(item => serializeItem(item)),
        // 装备（使用新的序列化系统）
        equipment: Object.fromEntries(
          Object.entries(player.equipment || {}).map(([slot, item]) => [slot, serializeItem(item)])
        ),
        // ✅ v2.1: 保存符文状态
        runeState: player.runeState ? {
          effects: player.runeState.effects || {},
          bonusStats: player.runeState.bonusStats || {
            p_atk: 0, m_atk: 0, p_def: 0, m_def: 0,
            hp: 0, crit_rate: 0, dodge: 0, gold_rate: 0
          }
        } : null,
        // ✅ v2.1: 保存符文运行时数据（用于机制类符文）
        runes: player.runes ? JSON.parse(JSON.stringify(player.runes)) : null,
        // ✅ 遗物系统：保存遗物ID数组（Map不能直接序列化）
        relics: player.relics && player.relics.size > 0 
          ? Array.from(player.relics.keys()) 
          : [],
        // ✅ FIX: 保存战斗状态（连击系统）
        combatState: player.combatState ? {
          comboCount: 0, // 读档后重置连击（因为怪物会重新生成）
          maxCombo: player.combatState.maxCombo || 0,
          lastTargetId: null, // 读档后重置目标ID（因为怪物会重新生成）
          lastAttackTime: 0, // 读档后重置攻击时间
          weaponType: player.combatState.weaponType || null
        } : null,
        // 游戏状态
        gameState: {
          killCount: game.killCount || 0,
          totalXpGained: game.totalXpGained || 0,
          playTime: Date.now() - (game.startTime || Date.now()),
          currentFloor: player.stats.floor,
        },
        // 噩梦层级（1-25）
        ascensionLevel: game.selectedAscensionLevel ?? 1,
        // ✅ 动态任务定义：保存运行时生成的楼层/每日任务模板，防止读档后丢失
        // 注意：此字段保留用于向后兼容，新版本优先使用 questData.customQuestDefinitions
        dynamicQuestDefinitions: game.questSystem ? game.questSystem.getDynamicQuests() : [],
        // ✅ 任务系统：保存任务数据（包含 customQuestDefinitions 字段）
        questData: game.questSystem ? game.questSystem.getQuestData() : null,
        // 时间戳
        timestamp: Date.now(),
      };

      // ⚠️ 地图状态说明：
      // 当前设计仅保存玩家状态和楼层数，读档会重置当前层地图布局。
      // 这是 Roguelike 游戏的常见机制：每次读档时重新生成当前楼层的地图，
      // 但保留玩家的进度（楼层、属性、装备等）。怪物、物品、地图布局会在读档时重新生成。
      // 如需保存完整地图状态，需要额外保存 map.grid、map.monsters、map.items 等数据（数据量较大）。

      // 保存到 localStorage
      localStorage.setItem(this.SAVE_KEY, JSON.stringify(saveData));
      console.log('SaveSystem: 游戏已保存', saveData);
      return true;
    } catch (e) {
      console.error('SaveSystem: 保存失败', e);
      return false;
    }
  }

  /**
   * 从 localStorage 读取游戏数据
   * @returns {Object|null} - 保存的数据，如果不存在则返回 null
   */
  static load() {
    try {
      const data = localStorage.getItem(this.SAVE_KEY);
      if (!data) {
        console.log('SaveSystem: 未找到保存的数据');
        return null;
      }

      const saveData = JSON.parse(data);
      console.log('SaveSystem: 已读取保存的数据', saveData);
      return saveData;
    } catch (e) {
      console.error('SaveSystem: 读取失败', e);
      return null;
    }
  }

  /**
   * 检查是否存在保存的数据
   * @returns {boolean}
   */
  static hasSave() {
    try {
      return localStorage.getItem(this.SAVE_KEY) !== null;
    } catch (e) {
      return false;
    }
  }

  /**
   * 删除保存的数据
   * @returns {boolean}
   */
  static deleteSave() {
    try {
      localStorage.removeItem(this.SAVE_KEY);
      console.log('SaveSystem: 保存的数据已删除');
      return true;
    } catch (e) {
      console.error('SaveSystem: 删除失败', e);
      return false;
    }
  }

  /**
   * 恢复游戏数据
   * @param {Game} game - 游戏实例
   * @param {Object} saveData - 保存的数据
   * @returns {boolean} - 是否恢复成功
   */
  static restore(game, saveData) {
    try {
      if (!game || !game.map || !saveData) {
        console.error('SaveSystem: 无法恢复 - 参数不完整');
        return false;
      }

      // 1. 根据存档的角色ID重新创建玩家实例 (确保技能和配置正确)
      const charId = saveData.charId || 'WARRIOR'; // 兼容旧存档，默认 WARRIOR
      const charConfig = CHARACTERS[charId];
      if (charConfig) {
        // 重新实例化 Player，这会重置技能、基础属性等
        game.player = new Player(game.map, game.loader, charConfig);
        console.log(`[SaveSystem] Re-created player instance as ${charId}`);
      } else {
        console.warn(`[SaveSystem] Character config not found for ${charId}, using default WARRIOR`);
        const defaultCharConfig = CHARACTERS['WARRIOR'];
        if (defaultCharConfig) {
          game.player = new Player(game.map, game.loader, defaultCharConfig);
        } else {
          console.error('[SaveSystem] Default WARRIOR config not found!');
          return false;
        }
      }

      // 更新本地引用
      const player = game.player;
      if (!player) {
        console.error('SaveSystem: 无法恢复 - 玩家实例创建失败');
        return false;
      }

      // 恢复玩家属性
      // ✅ FIX: 添加字段迁移逻辑，处理旧存档缺少新字段的情况
      if (saveData.stats) {
        player.stats = {
          hp: saveData.stats.hp ?? 100,
          maxHp: saveData.stats.maxHp ?? 100,
          p_atk: saveData.stats.p_atk ?? 15,
          p_def: saveData.stats.p_def ?? 5,
          m_atk: saveData.stats.m_atk ?? 0,
          m_def: saveData.stats.m_def ?? 0,
          rage: saveData.stats.rage ?? 0,
          mp: saveData.stats.mp ?? 0,
          maxMp: saveData.stats.maxMp ?? 0,
          mp_regen: saveData.stats.mp_regen ?? 0,
          mp_on_hit: saveData.stats.mp_on_hit ?? 0,
          lvl: saveData.stats.lvl ?? 1,
          xp: saveData.stats.xp ?? 0,
          nextLevelXp: saveData.stats.nextLevelXp ?? 50,
          keys: saveData.stats.keys ?? 1,
          floor: saveData.stats.floor ?? 1,
          gold: saveData.stats.gold ?? 0,
          // ✅ FIX: soulCrystals是元进度数据，已由MetaSaveSystem独立接管，不再从此处恢复
        };
      }
      
      // ✅ FIX: 恢复玩家状态效果（Buff/Debuff）
      if (saveData.statuses && Array.isArray(saveData.statuses)) {
        player.statuses = saveData.statuses.map(status => ({
          type: status.type,
          duration: status.duration || 0,
          timer: status.timer || 0,
          tickTimer: status.tickTimer || 0,
          config: status.config || {},
          source: null // 状态来源在恢复时设为null（避免序列化问题）
        }));
      } else {
        // 旧存档兼容：如果没有状态效果数据，初始化为空数组
        player.statuses = [];
      }
      
      // ✅ FIX: 恢复玩家技能预备状态
      if (saveData.states && typeof saveData.states === 'object') {
        if (!player.states) player.states = {};
        player.states.slashPrimed = saveData.states.slashPrimed || false;
        player.states.scorchPrimed = saveData.states.scorchPrimed || false;
        player.states.freezePrimed = saveData.states.freezePrimed || false;
        player.states.activeElement = saveData.states.activeElement || null;
        player.states.ultElement = saveData.states.ultElement || null;
      } else {
        // 旧存档兼容：如果没有技能状态数据，初始化为空对象
        if (!player.states) player.states = {};
      }
      
      // ✅ FIX: 恢复玩家activeDoTs（数据驱动，不重建onTick函数）
      // 由于DoT系统已重构为数据驱动，只需恢复数据，CombatSystem.handleDoTTick会处理逻辑
      if (saveData.activeDoTs && Array.isArray(saveData.activeDoTs)) {
        player.activeDoTs = saveData.activeDoTs.map(dotData => {
          // 只恢复数据，不包含函数
          // ✅ FIX: 统一使用sourceId字段，兼容旧存档的sourceType字段
          const sourceId = dotData.sourceId || dotData.sourceType || null;
          return {
            type: dotData.type,
            sourceId: sourceId, // 统一使用sourceId
            damage: dotData.damage || 0,
            duration: dotData.duration || 3000,
            tickInterval: dotData.tickInterval || 500,
            tetherRadius: dotData.tetherRadius || 2,
            elapsedTime: dotData.elapsedTime || 0,
            nextTickTime: dotData.nextTickTime || dotData.tickInterval || 500
            // ✅ FIX: 不再包含onTick函数，Entity.updateStatuses会调用CombatSystem.handleDoTTick
          };
        }).filter(dot => dot && dot.type); // 过滤无效数据
      } else {
        // 旧存档兼容：如果没有DoT数据，初始化为空数组
        player.activeDoTs = [];
      }

      // 恢复背包（使用新的反序列化系统）
      if (saveData.inventory && Array.isArray(saveData.inventory)) {
        player.inventory = saveData.inventory.map(itemData => {
          if (!itemData) return null;
          
          // 使用新的反序列化函数
          const restored = deserializeItem(itemData);
          
          // 关键：还原对象后，必须立即调用 recalculateStats 来生成运行时的 stats 属性
          if (restored && game.blacksmithSystem) {
            game.blacksmithSystem.recalculateStats(restored);
          }
          
          return restored;
        });
      }

      // 恢复装备（使用新的反序列化系统）
      if (saveData.equipment && typeof saveData.equipment === 'object') {
        const restoredEquipment = {};
        for (const [slot, itemData] of Object.entries(saveData.equipment)) {
          if (!itemData) {
            restoredEquipment[slot] = null;
          } else {
            // 使用新的反序列化函数
            const restored = deserializeItem(itemData);
            
            // 关键：还原对象后，必须立即调用 recalculateStats 来生成运行时的 stats 属性
            if (restored && game.blacksmithSystem) {
              game.blacksmithSystem.recalculateStats(restored);
            }
            
            restoredEquipment[slot] = restored;
          }
        }
        player.equipment = restoredEquipment;
        
        // ✅ v2.1: 恢复符文状态
        if (saveData.runeState) {
          player.runeState = {
            effects: saveData.runeState.effects || {},
            bonusStats: saveData.runeState.bonusStats || {
              p_atk: 0, m_atk: 0, p_def: 0, m_def: 0,
              hp: 0, crit_rate: 0, dodge: 0, gold_rate: 0
            }
          };
        } else {
          // 旧存档兼容：如果没有 runeState，初始化为空状态
          player.runeState = {
            effects: {},
            bonusStats: {
              p_atk: 0, m_atk: 0, p_def: 0, m_def: 0,
              hp: 0, crit_rate: 0, dodge: 0, gold_rate: 0
            }
          };
        }
        
        // ✅ v2.1: 恢复符文运行时数据（用于机制类符文）
        if (saveData.runes) {
          player.runes = saveData.runes;
        } else {
          // 旧存档兼容：如果没有 runes，初始化为空对象
          player.runes = {};
        }
      }
      
      // ✅ 遗物系统：恢复遗物（避免重复触发 onObtain hook）
      if (saveData.relics && Array.isArray(saveData.relics)) {
        // 先清空现有遗物
        player.relics.clear();
        
        // 直接导入遗物数据，不调用 addRelic（避免触发 onObtain）
        import('./data/artifacts.js').then(({ ARTIFACTS }) => {
          for (const relicId of saveData.relics) {
            const relic = ARTIFACTS[relicId];
            if (relic) {
              // 直接添加到 Map，不触发 onObtain hook
              player.relics.set(relicId, relic);
            }
          }
          
          // 恢复完成后更新 UI
          if (window.game && window.game.ui && window.game.ui.updateRelicBar) {
            window.game.ui.updateRelicBar(player.relics);
          }
          
          // ✅ FIX: 确保遗物加载完成后再次更新 UI，特别是像【贪婪戒指】这种可能影响属性显示的遗物
          if (window.game && window.game.ui && window.game.ui.updateStats) {
            window.game.ui.updateStats(player);
          }
        }).catch(err => {
          console.error('[SaveSystem] 恢复遗物时出错:', err);
        });
      } else {
        // 旧存档兼容：如果没有遗物数据，初始化为空 Map
        if (!player.relics) {
          player.relics = new Map();
        } else {
          player.relics.clear();
        }
      }
      
      // ✅ FIX: 恢复战斗状态（连击系统）
      // 注意：读档后重置连击相关状态，因为怪物会重新生成，无法保持连击
      if (saveData.combatState && typeof saveData.combatState === 'object') {
        player.combatState = {
          comboCount: 0, // 读档后重置连击
          maxCombo: saveData.combatState.maxCombo || 0,
          lastTargetId: null, // 读档后重置目标ID
          lastAttackTime: 0, // 读档后重置攻击时间
          weaponType: saveData.combatState.weaponType || null
        };
      } else {
        // 旧存档兼容：如果没有战斗状态数据，初始化为默认值
        if (!player.combatState) {
          player.combatState = {
            comboCount: 0,
            maxCombo: 0,
            lastTargetId: null,
            lastAttackTime: 0,
            weaponType: null
          };
        }
      }

      // ✅ v2.1: 恢复符文状态（统一处理，避免重复）
      // ✅ CRITICAL FIX: 先保存存档中的符文状态，但 bonusStats 需要清零后重新计算
      const savedRuneEffects = saveData.runeState ? (saveData.runeState.effects || {}) : {};
      const savedRunes = saveData.runes || {};
      
      // 初始化 runeState（bonusStats 先清零）
      player.runeState = {
        effects: savedRuneEffects,
        bonusStats: {
          p_atk: 0, m_atk: 0, p_def: 0, m_def: 0,
          hp: 0, crit_rate: 0, dodge: 0, gold_rate: 0
        }
      };
      
      // 初始化 runes 对象（机制类符文需要）
      player.runes = savedRunes;
      
      // ✅ CRITICAL FIX: 修复双重叠加风险 - 在重新应用符文之前，先恢复基础属性
      // 对于直接修改 player.stats 的符文（如 glass_cannon），需要先恢复基础 maxHp
      if (Object.keys(savedRuneEffects).length > 0) {
        // ✅ FIX 1: 保存存档时的楼层（用于数值计算，确保一致性）
        const savedFloor = player.stats.floor || 1;
        
        // ✅ FIX 2: 对于 glass_cannon 等直接修改 maxHp 的符文，需要反向计算基础 maxHp
        // 方法：如果存档中有 glass_cannon，我们需要知道存档时的 maxHp 是否已经扣过了
        // 由于 glass_cannon 扣除 30%，如果存档中有它，说明存档时的 maxHp 已经扣过了
        // 我们需要恢复"扣之前的 maxHp"，然后重新应用扣除
        
        // 检查是否有 glass_cannon
        const hasGlassCannon = savedRuneEffects['glass_cannon'] > 0;
        let baseMaxHp = player.stats.maxHp || 100;
        let baseHp = player.stats.hp || 100;
        
        if (hasGlassCannon) {
          // 如果存档中有 glass_cannon，说明存档时的 maxHp 已经扣过了 30%
          // 我们需要恢复扣之前的 maxHp：maxHp_after = maxHp_before * 0.7
          // 所以：maxHp_before = maxHp_after / 0.7
          const hpLossPercent = 0.3;
          baseMaxHp = Math.ceil(baseMaxHp / (1 - hpLossPercent));
          // 保持 hp 比例
          const hpRatio = (player.stats.maxHp || 100) > 0 ? baseHp / (player.stats.maxHp || 100) : 1.0;
          baseHp = Math.floor(baseMaxHp * hpRatio);
        }
        
        // 恢复基础 maxHp（不包含 glass_cannon 的扣除）
        player.stats.maxHp = baseMaxHp;
        player.stats.hp = Math.min(baseMaxHp, baseHp);
        
        // ✅ FIX 3: 重新应用所有符文（bonusStats 已清零，不会双重叠加）
        // 对于直接修改 player.stats 的符文，建立"仅应用一次"的保护机制
        const directModifyRunes = ['glass_cannon']; // 直接修改 player.stats 的符文列表
        
        for (const [runeId, runeLevel] of Object.entries(savedRuneEffects)) {
          if (!runeId || runeLevel <= 0) continue;
          
          const runeDef = RUNE_POOL.find(r => r.id === runeId);
          if (!runeDef || !runeDef.onObtain) continue;
          
          // ✅ FIX 2: 使用存档时的楼层计算数值，确保一致性
          const multiplier = RUNE_RARITY_MULTIPLIERS[runeDef.rarity] || 1.0;
          let value = 1;
          
          if (runeDef.type === 'STAT') {
            if (runeId.includes('might') || runeId.includes('brutal')) {
              value = Math.floor(1 * multiplier * (1 + savedFloor * 0.1));
            } else if (runeId.includes('iron') || runeId.includes('fortress')) {
              value = Math.floor(1 * multiplier * (1 + savedFloor * 0.1));
            } else if (runeId.includes('arcana') || runeId.includes('arcane')) {
              value = Math.floor(1 * multiplier * (1 + savedFloor * 0.1));
            } else if (runeId.includes('ward') || runeId.includes('barrier')) {
              value = Math.floor(1 * multiplier * (1 + savedFloor * 0.1));
            } else if (runeId.includes('vitality') || runeId.includes('life')) {
              value = Math.floor(10 * multiplier * (1 + savedFloor * 0.1));
            } else if (runeId.includes('precision') || runeId.includes('deadly') || runeId.includes('assassin')) {
              value = Math.floor(5 * multiplier);
            } else if (runeId.includes('agility') || runeId.includes('phantom')) {
              value = Math.floor(5 * multiplier);
            }
          } else if (runeId === 'glass_cannon') {
            value = 5; // 固定值
          }
          
          // ✅ FIX 1: 对于直接修改 player.stats 的符文，只应用一次（最高层级）
          // 因为 glass_cannon 的扣除是百分比，多次应用会导致错误
          if (directModifyRunes.includes(runeId)) {
            if (runeId === 'glass_cannon') {
              // glass_cannon 只应用一次，因为它是百分比扣除
              try {
                runeDef.onObtain(player, value);
              } catch (err) {
                console.error(`[SaveSystem] 重新应用符文 ${runeId} 时出错:`, err);
              }
            }
          } else {
            // 其他符文正常应用（根据层数调用多次）
            for (let i = 0; i < runeLevel; i++) {
              try {
                runeDef.onObtain(player, value);
              } catch (err) {
                console.error(`[SaveSystem] 重新应用符文 ${runeId} 时出错:`, err);
              }
            }
          }
        }
        
        // ✅ FIX 3: 重新计算最终 maxHp（通过 getTotalStats）
        // 对于 vitality 等符文，它们会通过 getTotalStats 累加 bonusStats.hp 到 maxHp
        // 我们需要确保 player.stats.maxHp 与 getTotalStats().maxHp 同步
        const finalTotalStats = player.getTotalStats ? player.getTotalStats() : player.stats;
        const finalMaxHp = finalTotalStats.maxHp;
        const oldMaxHp = player.stats.maxHp || 100;
        const hpIncrease = finalMaxHp - oldMaxHp;
        
        // 更新 maxHp 和 hp（保持比例）
        player.stats.maxHp = finalMaxHp;
        if (hpIncrease > 0) {
          // 如果 maxHp 增加了，按比例增加 hp
          player.stats.hp = Math.min(finalMaxHp, player.stats.hp + hpIncrease);
        } else if (hpIncrease < 0) {
          // 如果 maxHp 减少了（如 glass_cannon），按比例减少 hp，但不能超过新的 maxHp
          const hpRatio = oldMaxHp > 0 ? player.stats.hp / oldMaxHp : 1.0;
          player.stats.hp = Math.min(finalMaxHp, Math.floor(finalMaxHp * hpRatio));
        }
        
        console.log('[SaveSystem] 符文状态已重新计算，确保版本兼容性和数值一致性');
      }

      // 恢复游戏状态
      if (saveData.gameState) {
        game.killCount = saveData.gameState.killCount || 0;
        game.totalXpGained = saveData.gameState.totalXpGained || 0;
        // 调整 startTime 以保持 playTime 的连续性
        if (saveData.gameState.playTime !== undefined) {
          game.startTime = Date.now() - saveData.gameState.playTime;
        }
      }

      // 关键：重新生成当前楼层的地图
      const currentFloor = player.stats.floor;
      
      // ✅ FIX: 安全恢复噩梦层级（防止NaN和非法值）
      const parseAscensionLevel = (value) => {
        // 处理 undefined/null
        if (value === undefined || value === null) return 1;
        
        // 尝试转换为数字
        const parsed = typeof value === 'number' ? value : parseInt(value, 10);
        
        // 检查是否为有效数字
        if (isNaN(parsed)) {
          console.warn(`⚠️ SaveSystem: Invalid ascensionLevel in save data: ${value}, using default 1`);
          return 1;
        }
        
        // 限制在有效范围内 (1-25)
        return Math.max(1, Math.min(25, parsed));
      };
      
      const savedAscensionLevel = parseAscensionLevel(saveData.ascensionLevel);
      game.selectedAscensionLevel = savedAscensionLevel;
      console.log(`[SaveSystem] Restored ascensionLevel: ${savedAscensionLevel}`);
      
      // ✅ 任务系统：先恢复动态任务定义，再恢复任务数据
      if (game.questSystem) {
        // 优先使用 questData.customQuestDefinitions（新版本），向后兼容 dynamicQuestDefinitions（旧版本）
        // 注意：loadQuestData 内部也会处理 customQuestDefinitions，但为了确保顺序正确，我们先在这里恢复
        if (saveData.questData && saveData.questData.customQuestDefinitions && Array.isArray(saveData.questData.customQuestDefinitions)) {
          // 新版本：使用 questData 中的 customQuestDefinitions（更完整，包含所有动态任务）
          game.questSystem.restoreDynamicQuests(saveData.questData.customQuestDefinitions);
          console.log(`[SaveSystem] Restored ${saveData.questData.customQuestDefinitions.length} custom quest definitions from questData`);
        } else if (saveData.dynamicQuestDefinitions && Array.isArray(saveData.dynamicQuestDefinitions)) {
          // 旧版本兼容：使用独立的 dynamicQuestDefinitions 字段
          game.questSystem.restoreDynamicQuests(saveData.dynamicQuestDefinitions);
          console.log(`[SaveSystem] Restored ${saveData.dynamicQuestDefinitions.length} dynamic quest definitions (legacy format)`);
        }

        if (saveData.questData) {
          // loadQuestData 内部会再次检查 customQuestDefinitions，但此时已经通过上面的 restoreDynamicQuests 恢复了
          // 这样可以确保即使 loadQuestData 内部逻辑有变化，也能正确恢复
          game.questSystem.loadQuestData(saveData.questData);
          console.log('[SaveSystem] Quest data restored');
        } else {
          // 如果没有任务数据，初始化任务系统（新存档兼容）
          game.questSystem.init();
          console.log('[SaveSystem] Quest system initialized (no saved data)');
        }
      }
      
      game.map.generateLevel(currentFloor, game.selectedAscensionLevel);

      // 将玩家放在楼梯位置
      for (let y = 0; y < game.map.height; y++) {
        for (let x = 0; x < game.map.width; x++) {
          if (game.map.grid[y][x] === TILE.STAIRS_UP) {
            player.x = x;
            player.y = y;
            player.visualX = x * TILE_SIZE;
            player.visualY = y * TILE_SIZE;
            player.destX = player.visualX;
            player.destY = player.visualY;
            player.isMoving = false;
            break;
          }
        }
      }

      // 刷新 UI
      if (game.ui) {
        game.ui.updateStats(player);
        game.ui.renderInventory?.(player);
        game.ui.updateEquipmentSockets?.(player);
      }

      console.log('SaveSystem: 游戏数据已恢复');
      return true;
    } catch (e) {
      console.error('SaveSystem: 恢复失败', e);
      return false;
    }
  }
}

