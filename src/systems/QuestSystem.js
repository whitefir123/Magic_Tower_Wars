/**
 * QuestSystem.js
 * 
 * 任务系统核心逻辑
 * 负责管理任务数据、状态流转、事件监听
 * 
 * 平衡性公式说明：
 * - 楼层任务奖励公式：
 *   金币：baseGold * (1 + floorIndex * 0.3)
 *   经验：baseXp * (1 + floorIndex * 0.2)
 * - 怪物筛选：根据怪物的 maxHp 和攻击力判断是否适合当前楼层
 *   公式：maxHp <= floorIndex * 150 + 200（可根据实际游戏数据微调）
 */

import { DailyChallengeSystem } from './DailyChallengeSystem.js';
import { SeededRandom } from '../utils/SeededRandom.js';
import { MONSTER_STATS } from '../data/monsters.js';
import { CONSUMABLE_IDS } from '../data/items.js';

// 任务数据库
export const QUEST_DATABASE = {
  "quest_001": {
    id: "quest_001",
    title: "初入迷宫",
    description: "击杀3个任意怪物，证明你的勇气",
    category: "MAIN", // 主线任务
    // 向后兼容：如果存在 objective，转换为 objectives 数组
    objective: {
      type: "KILL",
      target: "ANY",
      count: 3
    },
    objectives: [
      { id: 1, type: "KILL", target: "ANY", count: 3, current: 0, description: "击杀任意怪物" }
    ],
    prerequisites: [], // 无前置任务
    nextQuest: "quest_chain_01", // 完成后自动接取任务链
    reward: {
      gold: 50
    },
    autoComplete: false // 手动领取奖励
  },
  "quest_002": {
    id: "quest_002",
    title: "生存法则",
    description: "收集1个药水，为冒险做好准备",
    category: "SIDE", // 支线任务
    objective: {
      type: "COLLECT",
      target: "POTION",
      count: 1
    },
    objectives: [
      { id: 1, type: "COLLECT", target: "POTION", count: 1, current: 0, description: "收集药水" }
    ],
    prerequisites: [],
    nextQuest: null,
    reward: {
      xp: 100
    },
    autoComplete: false // 手动领取奖励
  },
  // 示例任务链
  "quest_chain_01": {
    id: "quest_chain_01",
    title: "深入探索",
    description: "完成初步训练后，你需要同时完成两个挑战：击杀史莱姆并收集药水",
    category: "MAIN",
    objectives: [
      { id: 1, type: "KILL", target: "SLIME", count: 5, current: 0, description: "击杀史莱姆" },
      { id: 2, type: "COLLECT", target: "POTION_HP_S", count: 1, current: 0, description: "收集小型药水" }
    ],
    prerequisites: ["quest_001"], // 需要先完成 quest_001
    nextQuest: "quest_chain_02",
    reward: {
      gold: 100,
      xp: 150
    },
    autoComplete: false
  },
  "quest_chain_02": {
    id: "quest_chain_02",
    title: "进阶挑战",
    description: "继续你的冒险，击败更强的敌人",
    category: "MAIN",
    objectives: [
      { id: 1, type: "KILL", target: "BAT", count: 3, current: 0, description: "击杀蝙蝠" },
      { id: 2, type: "KILL", target: "SKELETON", count: 2, current: 0, description: "击杀骷髅战士" }
    ],
    prerequisites: ["quest_chain_01"],
    nextQuest: null,
    reward: {
      gold: 150,
      xp: 200
    },
    autoComplete: false
  },
  // 示例：带限制条件的任务
  "quest_condition_demo": {
    id: "quest_condition_demo",
    title: "生存挑战",
    description: "在保持生命值不低于50%的情况下，击杀5个怪物",
    category: "SIDE",
    objectives: [
      { id: 1, type: "KILL", target: "ANY", count: 5, current: 0, description: "击杀任意怪物" }
    ],
    prerequisites: [],
    nextQuest: null,
    conditions: {
      minHpPercent: 50, // 生命值必须保持在50%以上
      minGold: 0 // 金币无要求（示例）
    },
    reward: {
      gold: 200,
      xp: 150
    },
    autoComplete: false
  }
};

// 记录静态任务ID集合，用于判断任务是否为运行时动态生成
const STATIC_QUEST_IDS = new Set(Object.keys(QUEST_DATABASE));

/**
 * 判断任务是否为动态任务（运行时生成）
 * - 不在初始 QUEST_DATABASE 定义中
 * - 或者 ID 以 floor_ / daily_ 开头
 */
function isDynamicQuestId(questId) {
  if (!questId) return false;
  if (questId.startsWith('floor_') || questId.startsWith('daily_')) return true;
  return !STATIC_QUEST_IDS.has(questId);
}

export class QuestSystem {
  constructor(game, gameSeed = null) {
    this.game = game;
    // activeQuests 现在存储完整的任务副本（包含实时的 objectives 状态）
    this.activeQuests = new Map(); // Map<questId, questData>
    this.completedQuests = new Set(); // Set<questId> - 已完成但未领取奖励的任务
    this.claimedQuests = new Set(); // Set<questId> - 已领取奖励的任务
    this.dailyQuestsGenerated = false; // 标记是否已生成今日每日任务
    this.autoSubmit = false; // 自动提交奖励
    this.floorQuests = new Map(); // Map<floorIndex, questId> - 每层随机任务

    // 每局游戏的随机种子，用于保证同一局内随机一致，不同局之间不同
    this.gameSeed = gameSeed;
    
    console.log('[QuestSystem] 任务系统已初始化');
  }

  /**
   * 获取当前楼层可用的怪物类型
   * 根据怪物的生命值和攻击力判断是否适合当前楼层
   * @param {number} floorIndex - 楼层索引（从1开始）
   * @returns {Array<string>} 可用的怪物类型ID数组
   */
  getAvailableMonstersForFloor(floorIndex) {
    const availableMonsters = [];
    
    // 计算当前楼层的最大允许生命值
    // 公式：maxHp <= floorIndex * 150 + 200
    // 例如：第1层 <= 350, 第5层 <= 950, 第10层 <= 1700
    const maxAllowedHp = floorIndex * 150 + 200;
    
    // 计算当前楼层的最大允许攻击力（物理+魔法取较大值）
    // 公式：maxAtk <= floorIndex * 3 + 10
    const maxAllowedAtk = floorIndex * 3 + 10;
    
    // 遍历所有怪物，筛选适合的
    for (const [monsterType, monster] of Object.entries(MONSTER_STATS)) {
      // 排除BOSS
      if (monsterType === 'BOSS') continue;
      
      // 获取怪物的生命值（优先使用 maxHp，否则使用 hp）
      const monsterHp = monster.maxHp || monster.hp || 0;
      
      // 获取怪物的攻击力（物理和魔法取较大值）
      const monsterAtk = Math.max(monster.p_atk || 0, monster.m_atk || 0);
      
      // 判断是否适合当前楼层
      // 使用更宽松的条件：只要生命值或攻击力不超过太多即可
      // 允许稍微超出，因为玩家可能已经有一定装备和等级
      if (monsterHp <= maxAllowedHp * 1.2 && monsterAtk <= maxAllowedAtk * 1.2) {
        availableMonsters.push(monsterType);
      }
    }
    
    // 如果筛选后没有怪物，使用动态分层逻辑作为后备方案
    if (availableMonsters.length === 0) {
      console.warn(`[QuestSystem] 楼层 ${floorIndex} 没有通过公式筛选的怪物，使用动态分层逻辑`);
      
      // 获取所有非BOSS怪物类型
      const allNonBossMonsters = Object.keys(MONSTER_STATS).filter(type => type !== 'BOSS');
      
      if (allNonBossMonsters.length === 0) {
        console.error('[QuestSystem] 没有可用的怪物类型');
        return [];
      }
      
      if (floorIndex <= 3) {
        // 1-3层：返回前几个低强度怪物（按生命值排序）
        const sortedMonsters = allNonBossMonsters
          .map(type => ({ type, hp: (MONSTER_STATS[type].maxHp || MONSTER_STATS[type].hp || 0) }))
          .sort((a, b) => a.hp - b.hp)
          .slice(0, Math.min(3, allNonBossMonsters.length))
          .map(item => item.type);
        return sortedMonsters.length > 0 ? sortedMonsters : allNonBossMonsters.slice(0, 2);
      } else if (floorIndex <= 6) {
        // 4-6层：返回中等强度怪物（排除最弱的几个）
        const sortedMonsters = allNonBossMonsters
          .map(type => ({ type, hp: (MONSTER_STATS[type].maxHp || MONSTER_STATS[type].hp || 0) }))
          .sort((a, b) => a.hp - b.hp);
        const startIndex = Math.min(1, sortedMonsters.length - 1);
        const endIndex = Math.min(startIndex + 5, sortedMonsters.length);
        return sortedMonsters.slice(startIndex, endIndex).map(item => item.type);
      } else if (floorIndex <= 9) {
        // 7-9层：返回中高强度怪物
        const sortedMonsters = allNonBossMonsters
          .map(type => ({ 
            type, 
            hp: (MONSTER_STATS[type].maxHp || MONSTER_STATS[type].hp || 0),
            atk: Math.max(MONSTER_STATS[type].p_atk || 0, MONSTER_STATS[type].m_atk || 0)
          }))
          .filter(item => item.hp >= 150 || item.atk >= 10)
          .sort((a, b) => (b.hp + b.atk) - (a.hp + a.atk))
          .slice(0, Math.min(5, allNonBossMonsters.length))
          .map(item => item.type);
        return sortedMonsters.length > 0 ? sortedMonsters : allNonBossMonsters.slice(Math.floor(allNonBossMonsters.length / 2));
      } else {
        // 10层及以上：优先返回高强度怪物
        const highTierMonsters = allNonBossMonsters
          .map(type => ({ 
            type, 
            hp: (MONSTER_STATS[type].maxHp || MONSTER_STATS[type].hp || 0),
            atk: Math.max(MONSTER_STATS[type].p_atk || 0, MONSTER_STATS[type].m_atk || 0)
          }))
          .filter(item => item.hp >= 220 || item.atk >= 14)
          .sort((a, b) => (b.hp + b.atk) - (a.hp + a.atk))
          .map(item => item.type);

        if (highTierMonsters.length > 0) {
          return highTierMonsters;
        }

        // 兜底：如果高强度怪物列表为空，则返回所有非BOSS怪物（排除最弱的几个）
        const sortedAll = allNonBossMonsters
          .map(type => ({ type, hp: (MONSTER_STATS[type].maxHp || MONSTER_STATS[type].hp || 0) }))
          .sort((a, b) => b.hp - a.hp)
          .slice(0, Math.max(1, Math.floor(allNonBossMonsters.length * 0.7)))
          .map(item => item.type);
        return sortedAll.length > 0 ? sortedAll : allNonBossMonsters;
      }
    }
    
    return availableMonsters;
  }

  /**
   * 初始化任务系统（新游戏开始时调用）
   */
  init() {
    // 如果当前还没有 gameSeed，则在新游戏开始时生成一个
    if (!this.gameSeed) {
      this.gameSeed = Date.now();
    }

    // 清空所有任务状态
    this.activeQuests.clear();
    this.completedQuests.clear();
    this.claimedQuests.clear();
    this.dailyQuestsGenerated = false;
    
    // 接取初始主线/支线任务
    const initialQuestIds = ['quest_001', 'quest_002'];
    initialQuestIds.forEach(questId => {
      const quest = QUEST_DATABASE[questId];
      if (quest) {
        this.acceptQuest(questId);
      }
    });
    
    // 生成并添加每日任务
    this.generateDailyQuests();
    
    console.log('[QuestSystem] 任务系统已初始化，已接取初始任务');
  }

  /**
   * 检查任务的前置条件是否满足
   * @param {string} questId - 任务ID
   * @returns {boolean} 是否满足前置条件
   */
  checkPrerequisites(questId) {
    const quest = QUEST_DATABASE[questId];
    if (!quest) return false;

    // 如果没有前置任务，直接返回 true
    if (!quest.prerequisites || quest.prerequisites.length === 0) {
      return true;
    }

    // 检查所有前置任务是否都已完成并已领取奖励
    return quest.prerequisites.every(prereqId => {
      return this.claimedQuests.has(prereqId);
    });
  }

  /**
   * 规范化任务数据（将旧格式转换为新格式）
   * @param {object} quest - 任务数据
   * @returns {object} 规范化后的任务数据
   */
  normalizeQuest(quest) {
    // 如果已经有 objectives 数组，直接返回
    if (quest.objectives && Array.isArray(quest.objectives)) {
      return quest;
    }

    // 向后兼容：将旧的 objective 转换为 objectives 数组
    if (quest.objective) {
      const objective = quest.objective;
      quest.objectives = [{
        id: 1,
        type: objective.type,
        target: objective.target,
        count: objective.count || 1,
        current: 0,
        description: this.getObjectiveDescription(objective)
      }];
    }

    // 确保 prerequisites 和 nextQuest 存在
    if (!quest.prerequisites) quest.prerequisites = [];
    if (!quest.nextQuest) quest.nextQuest = null;

    return quest;
  }

  /**
   * 获取目标描述
   * @param {object} objective - 目标对象
   * @returns {string} 描述文本
   */
  getObjectiveDescription(objective) {
    if (objective.type === 'KILL') {
      if (objective.target === 'ANY') {
        return `击杀${objective.count}个任意怪物`;
      }
      const monster = MONSTER_STATS[objective.target];
      const monsterName = monster ? (monster.cnName || monster.name) : objective.target;
      return `击杀${objective.count}个${monsterName}`;
    } else if (objective.type === 'COLLECT') {
      return `收集${objective.count}个${objective.target}`;
    } else if (objective.type === 'REACH_FLOOR') {
      return `到达第${objective.target}层`;
    } else if (objective.type === 'INTERACT') {
      return `与${objective.target}交互${objective.count}次`;
    }
    return `完成目标: ${objective.type}`;
  }

  /**
   * 接取任务
   * @param {string} questId - 任务ID
   * @param {boolean} skipPrerequisites - 是否跳过前置检查（用于自动接取）
   */
  acceptQuest(questId, skipPrerequisites = false) {
    const quest = QUEST_DATABASE[questId];
    if (!quest) {
      console.warn(`[QuestSystem] 任务不存在: ${questId}`);
      return false;
    }

    // 规范化任务数据
    const normalizedQuest = this.normalizeQuest(JSON.parse(JSON.stringify(quest)));

    // 检查是否已经接取或已完成
    if (this.activeQuests.has(questId) || this.completedQuests.has(questId) || this.claimedQuests.has(questId)) {
      console.warn(`[QuestSystem] 任务已存在: ${questId}`);
      return false;
    }

    // 检查前置条件（除非跳过检查）
    if (!skipPrerequisites && !this.checkPrerequisites(questId)) {
      console.warn(`[QuestSystem] 任务前置条件未满足: ${questId}`);
      return false;
    }

    // 初始化 objectives 的 current 值
    const questData = {
      ...normalizedQuest,
      objectives: normalizedQuest.objectives.map(obj => ({
        ...obj,
        current: 0
      }))
    };

    // 添加到活跃任务
    this.activeQuests.set(questId, questData);

    console.log(`[QuestSystem] 已接取任务: ${quest.title}`);
    
    // 显示 Toast 通知
    this.showToast(`已接取任务: ${quest.title}`);

    return true;
  }

  /**
   * 重新检查条件任务（Passive Check）
   * 遍历所有活跃任务，如果所有目标已完成但任务尚未完成，则重新检查条件
   * 用于解决玩家在达成目标后通过其他方式（如喝药）满足条件，但因为没有触发事件而导致任务无法结算的问题
   */
  recheckConditionQuests() {
    for (const [questId, questData] of this.activeQuests.entries()) {
      if (!questData || !questData.objectives) continue;

      // 检查所有 objectives 是否均已完成
      const allObjectivesCompleted = questData.objectives.every(obj => obj.current >= obj.count);

      if (allObjectivesCompleted) {
        // 所有目标已完成，但任务尚未移入 completedQuests
        // 重新检查条件
        const conditionCheck = this.checkConditions(questData);

        if (conditionCheck.satisfied) {
          // 条件满足，完成任务
          this.completeQuest(questId);
        }
      }
    }
  }

  /**
   * 检查任务限制条件是否满足
   * @param {object} questData - 任务数据
   * @returns {object} { satisfied: boolean, failedConditions: Array<string> }
   */
  checkConditions(questData) {
    if (!questData || !questData.conditions) {
      // 没有限制条件，直接返回满足
      return { satisfied: true, failedConditions: [] };
    }

    const player = this.game && this.game.player;
    if (!player || !player.stats) {
      console.warn('[QuestSystem] 玩家对象不存在，无法检查条件');
      return { satisfied: false, failedConditions: ['玩家状态不可用'] };
    }

    const conditions = questData.conditions;
    const failedConditions = [];

    // 检查生命值百分比
    if (conditions.minHpPercent !== undefined) {
      const currentHp = player.stats.hp || 0;
      const maxHp = player.stats.maxHp || 1;
      const hpPercent = (currentHp / maxHp) * 100;
      
      if (hpPercent < conditions.minHpPercent) {
        failedConditions.push(`生命值保持 ${conditions.minHpPercent}% 以上 (当前: ${Math.floor(hpPercent)}%)`);
      }
    }

    // 检查金币
    if (conditions.minGold !== undefined) {
      const currentGold = player.stats.gold || 0;
      
      if (currentGold < conditions.minGold) {
        failedConditions.push(`金币达到 ${conditions.minGold} (当前: ${currentGold})`);
      }
    }

    // 可扩展其他条件...
    // 例如：minLevel, minFloor, hasItem, etc.

    return {
      satisfied: failedConditions.length === 0,
      failedConditions: failedConditions
    };
  }

  /**
   * 检查并更新任务进度
   * @param {string} eventType - 事件类型 ('onKill', 'onLoot', 'onReachFloor', 'onInteract')
   * @param {object} data - 事件数据
   */
  check(eventType, data = {}) {
    const delta = (typeof data.count === 'number' && data.count > 0) ? data.count : 1;

    // 遍历所有活跃任务
    for (const [questId, questData] of this.activeQuests.entries()) {
      if (!questData || !questData.objectives) continue;

      let hasUpdate = false;

      // 遍历任务的所有子目标
      questData.objectives.forEach(objective => {
        let shouldUpdate = false;

        if (eventType === 'onKill' && objective.type === 'KILL') {
          // 击杀任务
          if (objective.target === 'ANY' || data.monsterType === objective.target) {
            shouldUpdate = true;
          }
        } else if (eventType === 'onLoot' && objective.type === 'COLLECT') {
          // 收集任务
          if (data.itemType === objective.target || data.itemId === objective.target) {
            shouldUpdate = true;
          }
        } else if (eventType === 'onReachFloor' && objective.type === 'REACH_FLOOR') {
          // 到达层数任务（一次性完成，不累积进度）
          const currentFloor = data.floor || (this.game && this.game.player ? this.game.player.stats.floor : 0);
          if (currentFloor >= objective.target && objective.current < objective.count) {
            objective.current = objective.count;
            shouldUpdate = true;
          }
        } else if (eventType === 'onInteract' && objective.type === 'INTERACT') {
          // 交互任务
          if (objective.target === 'ANY' || data.interactType === objective.target) {
            shouldUpdate = true;
          }
        }

        // 更新进度
        if (shouldUpdate) {
          // REACH_FLOOR 任务已经在上面直接设置了进度，不需要再增加
          if (objective.type !== 'REACH_FLOOR') {
            objective.current = Math.min(objective.current + delta, objective.count);
          }
          hasUpdate = true;
        }
      });

      // 如果有更新，检查任务是否完成
      if (hasUpdate) {
        // 检查所有子目标是否都完成
        const allCompleted = questData.objectives.every(obj => obj.current >= obj.count);
        
        if (allCompleted) {
          // 目标已完成，检查限制条件
          const conditionCheck = this.checkConditions(questData);
          
          if (conditionCheck.satisfied) {
            // 条件满足，完成任务
            this.completeQuest(questId);
          } else {
            // 目标完成但条件未满足，显示提示
            const conditionText = conditionCheck.failedConditions.join('、');
            this.showToast(`目标已达成，但未满足完成条件: ${conditionText}`, 'warning');
          }
        } else {
          // 显示进度更新 Toast
          const completedCount = questData.objectives.filter(obj => obj.current >= obj.count).length;
          const totalCount = questData.objectives.length;
          if (completedCount > 0) {
            this.showToast(`${questData.title}: ${completedCount}/${totalCount} 目标完成`);
          }
        }
      }
    }

    // 如果有UI，更新显示
    if (this.game && this.game.ui && this.game.ui.questUI) {
      this.game.ui.questUI.update();
    }

    // 如果有任务追踪器，更新显示
    if (this.game && this.game.questTracker) {
      this.game.questTracker.update();
    }
  }

  /**
   * 完成任务（进度达到目标）
   * @param {string} questId - 任务ID
   */
  completeQuest(questId) {
    let questData = this.activeQuests.get(questId);
    if (!questData) {
      // 尝试从数据库获取
      const quest = QUEST_DATABASE[questId];
      if (!quest) return;
      // 规范化任务数据
      questData = this.normalizeQuest(JSON.parse(JSON.stringify(quest)));
    }

    // 从活跃任务移除
    if (this.activeQuests.has(questId)) {
      this.activeQuests.delete(questId);
    }

    // 添加到已完成列表（待领取奖励）
    this.completedQuests.add(questId);

    console.log(`[QuestSystem] 任务完成: ${questData.title}`);
    
    // 显示完成 Toast
    this.showToast(`任务完成: ${questData.title}`, 'success');

    // 自动提交：如果开启了自动提交，立即领取奖励
    if (this.autoSubmit) {
      this.claimReward(questId);
    }

    // 通知UI更新
    if (this.game && this.game.ui && this.game.ui) {
      if (this.game.ui.questUI) {
        this.game.ui.questUI.update();
      }
    }
  }

  /**
   * 显示 Toast 通知
   * @param {string} message - 消息内容
   * @param {string} type - 类型 ('info', 'success', 'warning', 'error')
   */
  showToast(message, type = 'info') {
    // 如果 UI 有 showToast 方法，使用它
    if (this.game && this.game.ui && this.game.ui.questUI && this.game.ui.questUI.showToast) {
      this.game.ui.questUI.showToast(message, type);
      return;
    }

    // 否则使用 logMessage（如果存在）
    if (this.game && this.game.ui && this.game.ui.logMessage) {
      this.game.ui.logMessage(message, type === 'success' ? 'gain' : 'info');
    }
  }

  /**
   * 领取任务奖励
   * @param {string} questId - 任务ID
   */
  claimReward(questId) {
    const quest = QUEST_DATABASE[questId];
    if (!quest) {
      console.warn(`[QuestSystem] 任务不存在: ${questId}`);
      return false;
    }

    // 检查任务是否已完成
    if (!this.completedQuests.has(questId)) {
      console.warn(`[QuestSystem] 任务尚未完成: ${questId}`);
      return false;
    }

    // 检查是否已领取
    if (this.claimedQuests.has(questId)) {
      console.warn(`[QuestSystem] 任务奖励已领取: ${questId}`);
      return false;
    }

    // 发放奖励
    const reward = quest.reward;
    const player = this.game && this.game.player;
    
    if (!player) {
      console.error('[QuestSystem] 玩家对象不存在');
      return false;
    }

    let rewardText = [];
    
    // 发放金币
    if (reward.gold && reward.gold > 0) {
      player.stats.gold = (player.stats.gold || 0) + reward.gold;
      rewardText.push(`${reward.gold} 金币`);
      
      // 播放金币音效
      if (this.game.audio && this.game.audio.playCoins) {
        this.game.audio.playCoins({ forceCategory: 'gameplay' });
      }
    }

    // 发放经验
    if (reward.xp && reward.xp > 0) {
      const leveled = player.gainXp ? player.gainXp(reward.xp) : false;
      rewardText.push(`${reward.xp} 经验`);
      
      // 播放升级音效（如果升级了）
      if (leveled && this.game.audio && this.game.audio.playLevelUp) {
        this.game.audio.playLevelUp();
      }
    }

    // 发放物品（预留）
    if (reward.items && Array.isArray(reward.items)) {
      reward.items.forEach(itemId => {
        const added = player.addToInventory ? player.addToInventory(itemId) : false;
        if (added) {
          const itemDef = this.game.getItemDefinition ? this.game.getItemDefinition(itemId) : null;
          const itemName = itemDef ? (itemDef.nameZh || itemDef.name) : itemId;
          rewardText.push(itemName);
        }
      });
    }

    // 从已完成列表移除，添加到已领取列表
    this.completedQuests.delete(questId);
    this.claimedQuests.add(questId);

    // 显示奖励获得提示
    const rewardStr = rewardText.join('、');
    if (this.game.ui && this.game.ui.logMessage) {
      this.game.ui.logMessage(`任务完成！获得: ${rewardStr}`, 'gain');
    }

    // 显示浮动文字
    if (this.game.floatingTextPool && this.game.floatingTexts && this.game.player) {
      rewardText.forEach((text, index) => {
        const floatingText = this.game.floatingTextPool.create(
          this.game.player.visualX,
          this.game.player.visualY - 30 - (index * 20),
          `+${text}`,
          '#ffd700'
        );
        this.game.floatingTexts.push(floatingText);
      });
    }

    // 更新UI
    if (this.game.ui) {
      if (this.game.ui.updateStats) {
        this.game.ui.updateStats(player);
      }
      if (this.game.ui.questUI) {
        this.game.ui.questUI.update();
      }
    }

    console.log(`[QuestSystem] 任务奖励已领取: ${quest.title} (${rewardStr})`);
    
    // 领取奖励成功后，尝试接取后续任务
    if (quest.nextQuest) {
      const delay = this.autoSubmit ? 500 : 1000;
      setTimeout(() => {
        // 逻辑调整：
        // 1. 若 autoSubmit === true，则保持原逻辑，跳过前置检查（因为奖励已领，前置自然满足）
        // 2. 若 autoSubmit === false，则不再无条件跳过前置条件，
        //    而是通过正常的 checkPrerequisites 逻辑来判断是否可以接取后续任务，
        //    确保「必须已领取(claimed)」这类前置在领取奖励后才真正生效。
        const skipPrerequisites = this.autoSubmit === true;
        if (this.acceptQuest(quest.nextQuest, skipPrerequisites)) {
          this.showToast(`自动接取后续任务: ${QUEST_DATABASE[quest.nextQuest]?.title || quest.nextQuest}`, 'info');
        }
      }, delay);
    }

    return true;
  }

  /**
   * 设置自动提交状态
   * @param {boolean} enabled - 是否启用自动提交
   */
  setAutoSubmit(enabled) {
    this.autoSubmit = enabled;
    
    // 如果启用自动提交，立即处理已完成的任务
    if (enabled) {
      // 创建副本以避免迭代时修改集合
      const completedQuestsArray = Array.from(this.completedQuests);
      completedQuestsArray.forEach(questId => {
        this.claimReward(questId);
      });
    }
  }

  /**
   * 获取任务数据（用于存档）
   * @returns {object} 任务数据
   */
  getQuestData() {
    // 自定义任务定义集合（以 questId 去重）
    const customQuestDefinitionMap = new Map();

    const activeQuests = Array.from(this.activeQuests.entries()).map(([questId, questData]) => {
      // 判断是否为动态任务：
      // - ID 不在初始静态 QUEST_DATABASE 中
      // - 或者分类为 FLOOR / DAILY（运行时生成）
      const isDynamicById = isDynamicQuestId(questId);
      const isDynamicByCategory = questData && (questData.category === 'FLOOR' || questData.category === 'DAILY');
      const shouldPersistDefinition = isDynamicById || isDynamicByCategory;

      let definition;
      let staticData; // 向后兼容旧字段名称

      if (shouldPersistDefinition) {
        // 优先从 QUEST_DATABASE 读取模板，否则退回到当前 questData
        const baseQuest = QUEST_DATABASE[questId] || questData || {};
        const normalized = this.normalizeQuest(JSON.parse(JSON.stringify(baseQuest)));

        // 只保存任务的结构性定义，不强依赖 current 进度
        const defPayload = {
          id: normalized.id || questId,
          title: normalized.title,
          description: normalized.description,
          category: normalized.category,
          reward: normalized.reward,
          prerequisites: normalized.prerequisites || [],
          nextQuest: normalized.nextQuest || null,
          autoComplete: normalized.autoComplete || false,
          conditions: normalized.conditions || undefined,
          objective: normalized.objective || undefined,
          objectives: normalized.objectives || undefined
        };

        definition = JSON.parse(JSON.stringify(defPayload));
        staticData = JSON.parse(JSON.stringify(defPayload));

        // 记录到自定义任务定义集合（用于全局恢复）
        customQuestDefinitionMap.set(defPayload.id, JSON.parse(JSON.stringify(defPayload)));
      }

      return {
        questId,
        objectives: questData.objectives ? questData.objectives.map(obj => ({
          id: obj.id,
          type: obj.type,
          target: obj.target,
          count: obj.count,
          current: obj.current,
          description: obj.description
        })) : [],
        // 向后兼容：保留 progress 和 target
        progress: questData.objectives ? questData.objectives.reduce((sum, obj) => sum + obj.current, 0) : 0,
        target: questData.objectives ? questData.objectives.reduce((sum, obj) => sum + obj.count, 0) : 0,
        // 仅对动态/随机任务持久化任务定义，避免读档后丢失
        definition,
        // 旧存档兼容字段
        staticData
      };
    });

    // 进一步遍历「已完成任务 / 已领取任务 / 楼层任务记录」，为其中的动态任务补充定义
    const extraQuestIds = new Set();
    this.completedQuests.forEach(id => extraQuestIds.add(id));
    this.claimedQuests.forEach(id => extraQuestIds.add(id));
    this.floorQuests.forEach((questId) => {
      if (questId) extraQuestIds.add(questId);
    });

    extraQuestIds.forEach(questId => {
      if (!isDynamicQuestId(questId)) return;
      if (customQuestDefinitionMap.has(questId)) return;
      const baseQuest = QUEST_DATABASE[questId];
      if (!baseQuest) return;

      const normalized = this.normalizeQuest(JSON.parse(JSON.stringify(baseQuest)));
      const defPayload = {
        id: normalized.id || questId,
        title: normalized.title,
        description: normalized.description,
        category: normalized.category,
        reward: normalized.reward,
        prerequisites: normalized.prerequisites || [],
        nextQuest: normalized.nextQuest || null,
        autoComplete: normalized.autoComplete || false,
        conditions: normalized.conditions || undefined,
        objective: normalized.objective || undefined,
        objectives: normalized.objectives || undefined
      };

      customQuestDefinitionMap.set(defPayload.id, JSON.parse(JSON.stringify(defPayload)));
    });

    return {
      activeQuests,
      completedQuests: Array.from(this.completedQuests),
      claimedQuests: Array.from(this.claimedQuests),
      autoSubmit: this.autoSubmit,
      floorQuests: Array.from(this.floorQuests.entries()),
      // 保存本局游戏的随机种子，保证读档后随机任务一致
      gameSeed: this.gameSeed,
      // 新字段：自定义任务定义（动态生成的任务，如 FLOOR / DAILY）
      customQuestDefinitions: Array.from(customQuestDefinitionMap.values())
    };
  }

  /**
   * 获取当前内存中的动态任务定义（用于存档）
   * 仅返回 ID 以 floor_ 或 daily_ 开头的任务
   * @returns {Array<object>} 动态任务定义列表
   */
  getDynamicQuests() {
    const dynamicQuests = [];
    for (const [questId, questDef] of Object.entries(QUEST_DATABASE)) {
      if (typeof questId === 'string' && (questId.startsWith('floor_') || questId.startsWith('daily_'))) {
        // 返回深拷贝，避免外部修改影响数据库
        dynamicQuests.push(JSON.parse(JSON.stringify(questDef)));
      }
    }
    return dynamicQuests;
  }

  /**
   * 恢复动态任务定义（用于读档）
   * 仅写回 ID 以 floor_ 或 daily_ 开头的任务，避免污染静态任务
   * @param {Array<object>} quests - 动态任务定义列表
   */
  restoreDynamicQuests(quests) {
    if (!quests || !Array.isArray(quests)) return;

    quests.forEach(quest => {
      if (!quest || !quest.id || typeof quest.id !== 'string') return;
      if (!quest.id.startsWith('floor_') && !quest.id.startsWith('daily_')) return;

      // 使用深拷贝写回数据库，避免共享引用
      QUEST_DATABASE[quest.id] = JSON.parse(JSON.stringify(quest));
    });
  }

  /**
   * 加载任务数据（用于读档）
   * @param {object} data - 任务数据
   */
  loadQuestData(data) {
    if (!data) return;

    // 清空当前状态
    this.activeQuests.clear();
    this.completedQuests.clear();
    this.claimedQuests.clear();
    this.floorQuests.clear();

    // 恢复自动提交设置
    this.autoSubmit = data.autoSubmit || false;

    // 在恢复任务前，优先恢复所有「自定义任务定义」（例如楼层任务 / 每日任务）
    // 这样可以确保 QUEST_DATABASE 中已经包含这些动态任务的静态结构
    if (Array.isArray(data.customQuestDefinitions) && data.customQuestDefinitions.length > 0) {
      // 仅写回 ID 以 floor_ / daily_ 开头的任务，避免污染静态任务
      this.restoreDynamicQuests(data.customQuestDefinitions);
    }

    // 恢复本局随机种子（如果旧存档中没有，则生成一个新的）
    this.gameSeed = data.gameSeed || this.gameSeed || Date.now();

    // 恢复活跃任务
    if (data.activeQuests && Array.isArray(data.activeQuests)) {
      data.activeQuests.forEach(item => {
        if (!item.questId) return;

        // 尝试从数据库获取任务
        let quest = QUEST_DATABASE[item.questId];
        if (!quest) {
          // 对于动态/随机任务，优先尝试从存档中的定义重建
          const definition = item.definition || item.staticData;
          if (definition) {
            const rebuilt = JSON.parse(JSON.stringify(definition));
            // 确保 ID 存在
            rebuilt.id = rebuilt.id || item.questId;
            QUEST_DATABASE[item.questId] = rebuilt;
            quest = rebuilt;
            console.warn(`[QuestSystem] 已从存档数据中重建动态任务: ${item.questId}`);
          } else {
            // 此时应当已经在外部（如 SaveSystem.restore）通过 restoreDynamicQuests 尝试恢复动态任务定义
            console.warn(`[QuestSystem] 存档中的任务不存在于数据库且没有静态定义: ${item.questId}`);
            return;
          }
        }

        // 规范化任务数据
        const normalizedQuest = this.normalizeQuest(JSON.parse(JSON.stringify(quest)));

        // 恢复 objectives 状态
        if (item.objectives && Array.isArray(item.objectives)) {
          // 新格式：使用 objectives 数组
          normalizedQuest.objectives = item.objectives.map(savedObj => {
            // 找到对应的目标
            const originalObj = normalizedQuest.objectives.find(obj => obj.id === savedObj.id);
            if (originalObj) {
              return {
                ...originalObj,
                current: savedObj.current || 0
              };
            }
            // 如果找不到，使用保存的数据
            return {
              id: savedObj.id,
              type: savedObj.type,
              target: savedObj.target,
              count: savedObj.count || 1,
              current: savedObj.current || 0,
              description: savedObj.description || this.getObjectiveDescription(savedObj)
            };
          });
        } else {
          // 向后兼容：使用旧的 progress 和 target
          if (normalizedQuest.objectives && normalizedQuest.objectives.length > 0) {
            // 如果有多个目标，平均分配进度（简化处理）
            const totalProgress = item.progress || 0;
            const totalTarget = item.target || normalizedQuest.objectives.reduce((sum, obj) => sum + obj.count, 0);
            const progressPerObjective = Math.floor(totalProgress / normalizedQuest.objectives.length);
            
            normalizedQuest.objectives.forEach((obj, index) => {
              if (index < normalizedQuest.objectives.length - 1) {
                obj.current = Math.min(progressPerObjective, obj.count);
              } else {
                // 最后一个目标分配剩余进度
                obj.current = Math.min(totalProgress - (progressPerObjective * (normalizedQuest.objectives.length - 1)), obj.count);
              }
            });
          }
        }

        this.activeQuests.set(item.questId, normalizedQuest);
      });
    }

    // 恢复已完成任务
    if (data.completedQuests && Array.isArray(data.completedQuests)) {
      data.completedQuests.forEach(questId => {
        if (QUEST_DATABASE[questId]) {
          this.completedQuests.add(questId);
        }
      });
    }

    // 恢复已领取任务
    if (data.claimedQuests && Array.isArray(data.claimedQuests)) {
      data.claimedQuests.forEach(questId => {
        if (QUEST_DATABASE[questId]) {
          this.claimedQuests.add(questId);
        }
      });
    }

    // 恢复楼层任务记录
    if (data.floorQuests && Array.isArray(data.floorQuests)) {
      data.floorQuests.forEach(([floorIndex, questId]) => {
        this.floorQuests.set(floorIndex, questId);
      });
    }

    console.log('[QuestSystem] 任务数据已加载', {
      active: this.activeQuests.size,
      completed: this.completedQuests.size,
      claimed: this.claimedQuests.size,
      floorQuests: this.floorQuests.size
    });

    // 更新UI
    if (this.game && this.game.ui && this.game.ui.questUI) {
      this.game.ui.questUI.update();
    }
  }

  /**
   * 获取所有活跃任务
   * @returns {Array} 活跃任务列表
   */
  getActiveQuests() {
    return Array.from(this.activeQuests.entries()).map(([questId, questData]) => {
      // 规范化任务数据
      const normalizedQuest = this.normalizeQuest(JSON.parse(JSON.stringify(questData)));
      
      // 计算总进度（向后兼容）
      const totalProgress = normalizedQuest.objectives.reduce((sum, obj) => sum + obj.current, 0);
      const totalTarget = normalizedQuest.objectives.reduce((sum, obj) => sum + obj.count, 0);
      
      return {
        ...normalizedQuest,
        // 向后兼容：保留 progress 和 target
        progress: totalProgress,
        target: totalTarget,
        // 确保 objectives 存在
        objectives: normalizedQuest.objectives
      };
    });
  }

  /**
   * 获取所有已完成任务（待领取奖励）
   * @returns {Array} 已完成任务列表
   */
  getCompletedQuests() {
    return Array.from(this.completedQuests).map(questId => QUEST_DATABASE[questId]);
  }

  /**
   * 获取任务进度
   * @param {string} questId - 任务ID
   * @returns {object|null} 任务进度对象 {progress, target, objectives}
   */
  getQuestProgress(questId) {
    if (this.activeQuests.has(questId)) {
      const questData = this.activeQuests.get(questId);
      const normalizedQuest = this.normalizeQuest(JSON.parse(JSON.stringify(questData)));
      
      // 计算总进度（向后兼容）
      const totalProgress = normalizedQuest.objectives.reduce((sum, obj) => sum + obj.current, 0);
      const totalTarget = normalizedQuest.objectives.reduce((sum, obj) => sum + obj.count, 0);
      
      return {
        progress: totalProgress,
        target: totalTarget,
        objectives: normalizedQuest.objectives
      };
    }
    return null;
  }

  /**
   * 生成楼层随机任务
   * @param {number} floorIndex - 楼层索引
   * @returns {string|null} 生成的任务ID，如果生成失败返回 null
   * 
   * Note: Call questSystem.generateFloorQuest(floorIndex) in MapSystem.onFloorLoaded() or similar event.
   * Currently called in main.js when player reaches a new floor.
   */
  generateFloorQuest(floorIndex) {
    // 如果该层已经有任务，不重复生成
    if (this.floorQuests.has(floorIndex)) {
      const existingQuestId = this.floorQuests.get(floorIndex);
      // 检查任务是否还存在
      if (this.activeQuests.has(existingQuestId) || this.completedQuests.has(existingQuestId)) {
        return existingQuestId;
      }
      // 如果任务已不存在，清除记录
      this.floorQuests.delete(floorIndex);
    }

    try {
      // 使用 gameSeed + 楼层索引 作为种子的一部分，确保：
      // - 同一局游戏内：同一层任务固定（读档前后一致）
      // - 不同局游戏之间：任务组合不同
      const baseSeed = this.gameSeed || 'no_seed';
      const floorSeed = `${baseSeed}_floor_${floorIndex}`;
      const rng = new SeededRandom(floorSeed);

      // 获取当前楼层可用的怪物类型（根据楼层难度筛选）
      const monsterTypes = this.getAvailableMonstersForFloor(floorIndex);

      if (monsterTypes.length === 0) {
        console.warn(`[QuestSystem] 楼层 ${floorIndex} 没有可用怪物类型`);
        return null;
      }

      // 可用消耗品列表（确保只使用可获取的物品，提供默认值保护）
      const consumableIds = (CONSUMABLE_IDS && Array.isArray(CONSUMABLE_IDS) && CONSUMABLE_IDS.length > 0)
        ? CONSUMABLE_IDS.filter(id => {
            // 确保物品ID在游戏中存在（可以通过检查是否有对应的物品定义）
            // 这里简化处理，直接使用 CONSUMABLE_IDS
            return true;
          })
        : ['POTION_HP_S', 'POTION_RAGE'];

      // 高层楼层奖励的非线性加成，使高层任务更有吸引力
      const floorRewardMultiplier = 1 + Math.log2(floorIndex + 1) * 0.15;

      // 任务模板池
      const questTemplates = [
        // 击杀特定怪物任务
        {
          type: 'KILL',
          generate: () => {
            const monsterType = rng.choice(monsterTypes);
            const monster = MONSTER_STATS[monsterType];
            const count = rng.nextInt(3, 8); // 3-8只
            // 基础奖励（随楼层增长）
            const baseGold = count * rng.nextInt(5, 12);
            const baseXp = count * 10;
            // 应用楼层奖励倍率（线性 + 轻微非线性加成）
            const goldReward = Math.floor(baseGold * (1 + floorIndex * 0.3) * floorRewardMultiplier);
            const xpReward = Math.floor(baseXp * (1 + floorIndex * 0.2) * floorRewardMultiplier);
            
            return {
              id: `floor_quest_${floorIndex}_kill_${rng.nextInt(1000, 9999)}`,
              title: `楼层挑战：${monster.cnName || monster.name}`,
              description: `在第${floorIndex}层击杀${count}只${monster.cnName || monster.name}`,
              category: 'FLOOR',
              objectives: [
                {
                  id: 1,
                  type: 'KILL',
                  target: monsterType,
                  count: count,
                  current: 0,
                  description: `击杀${count}只${monster.cnName || monster.name}`
                }
              ],
              prerequisites: [],
              nextQuest: null,
              reward: {
                gold: goldReward,
                xp: xpReward
              },
              autoComplete: false
            };
          }
        },
        // 收集药水任务
        {
          type: 'COLLECT',
          generate: () => {
            // 确保只使用可获取的物品（优先使用常见物品）
            const commonItems = consumableIds.filter(id => id.includes('POTION_HP_S') || id.includes('POTION_RAGE'));
            const itemPool = commonItems.length > 0 ? commonItems : consumableIds;
            const itemId = rng.choice(itemPool);
            const count = rng.nextInt(1, 3); // 1-3个
            // 基础奖励（随楼层增长）
            const baseGold = count * rng.nextInt(8, 18);
            // 应用楼层奖励倍率（线性 + 轻微非线性加成）
            const goldReward = Math.floor(baseGold * (1 + floorIndex * 0.3) * floorRewardMultiplier);
            
            let itemName = '药水';
            if (itemId.includes('POTION_HP')) itemName = '小型药水';
            else if (itemId.includes('POTION_RAGE')) itemName = '怒气药水';
            else if (itemId.includes('SCROLL_XP')) itemName = '知识卷轴';
            else if (itemId.includes('SCROLL_FIRE')) itemName = '火焰卷轴';
            
            return {
              id: `floor_quest_${floorIndex}_collect_${rng.nextInt(1000, 9999)}`,
              title: `楼层收集：${itemName}`,
              description: `在第${floorIndex}层收集${count}个${itemName}`,
              category: 'FLOOR',
              objectives: [
                {
                  id: 1,
                  type: 'COLLECT',
                  target: itemId,
                  count: count,
                  current: 0,
                  description: `收集${count}个${itemName}`
                }
              ],
              prerequisites: [],
              nextQuest: null,
              reward: {
                gold: goldReward
              },
              autoComplete: false
            };
          }
        },
        // 复合任务：击杀+收集
        {
          type: 'COMPLEX',
          generate: () => {
            const monsterType = rng.choice(monsterTypes);
            const monster = MONSTER_STATS[monsterType];
            const killCount = rng.nextInt(2, 5);
            // 确保只使用可获取的物品
            const commonItems = consumableIds.filter(id => id.includes('POTION_HP_S') || id.includes('POTION_RAGE'));
            const itemPool = commonItems.length > 0 ? commonItems : consumableIds;
            const itemId = rng.choice(itemPool);
            const collectCount = 1;
            
            let itemName = '药水';
            if (itemId.includes('POTION_HP')) itemName = '小型药水';
            else if (itemId.includes('POTION_RAGE')) itemName = '怒气药水';
            
            // 基础奖励（随楼层增长）
            const baseGold = (killCount * 8) + (collectCount * 15);
            const baseXp = killCount * 12;
            // 应用楼层奖励倍率（线性 + 轻微非线性加成）
            const goldReward = Math.floor(baseGold * (1 + floorIndex * 0.3) * floorRewardMultiplier);
            const xpReward = Math.floor(baseXp * (1 + floorIndex * 0.2) * floorRewardMultiplier);
            
            return {
              id: `floor_quest_${floorIndex}_complex_${rng.nextInt(1000, 9999)}`,
              title: `楼层挑战：双重目标`,
              description: `在第${floorIndex}层完成双重挑战：击杀${killCount}只${monster.cnName || monster.name}并收集${collectCount}个${itemName}`,
              category: 'FLOOR',
              objectives: [
                {
                  id: 1,
                  type: 'KILL',
                  target: monsterType,
                  count: killCount,
                  current: 0,
                  description: `击杀${killCount}只${monster.cnName || monster.name}`
                },
                {
                  id: 2,
                  type: 'COLLECT',
                  target: itemId,
                  count: collectCount,
                  current: 0,
                  description: `收集${collectCount}个${itemName}`
                }
              ],
              prerequisites: [],
              nextQuest: null,
              reward: {
                gold: goldReward,
                xp: xpReward
              },
              autoComplete: false
            };
          }
        },
        // 区域清理：任意怪物，数量较多，高经验
        {
          type: 'ZONE_CLEAR',
          generate: () => {
            const count = rng.nextInt(10, 15); // 10-15只
            // 基础奖励（随楼层增长）
            const baseXp = count * rng.nextInt(15, 25); // 较高经验奖励
            const baseGold = count * rng.nextInt(3, 7);
            // 应用楼层奖励倍率（线性 + 轻微非线性加成）
            const xpReward = Math.floor(baseXp * (1 + floorIndex * 0.2) * floorRewardMultiplier);
            const goldReward = Math.floor(baseGold * (1 + floorIndex * 0.3) * floorRewardMultiplier);

            return {
              id: `floor_quest_${floorIndex}_zone_${rng.nextInt(1000, 9999)}`,
              title: `楼层清理：第${floorIndex}层`,
              description: `清理第${floorIndex}层的怪物潮（击败${count}个任意敌人）`,
              category: 'FLOOR',
              objectives: [
                {
                  id: 1,
                  type: 'KILL',
                  target: 'ANY',
                  count: count,
                  current: 0,
                  description: `在本层击败${count}个任意敌人`
                }
              ],
              prerequisites: [],
              nextQuest: null,
              reward: {
                gold: goldReward,
                xp: xpReward
              },
              autoComplete: false
            };
          }
        },
        // 战术考核：保持高生命值击杀指定怪物，高金币+随机药水（高风险高回报）
        {
          type: 'TACTICAL',
          generate: () => {
            const monsterType = rng.choice(monsterTypes);
            const monster = MONSTER_STATS[monsterType];
            const count = 5;
            // 放宽生命值要求：从 80/90% 降低到 60/70%，因为这是高风险任务
            const minHpPercentOptions = [60, 70];
            const minHpPercent = rng.choice(minHpPercentOptions);
            // 基础奖励（随楼层增长），战术任务奖励倍率提升 2.5 倍
            const baseGold = count * rng.nextInt(15, 30);
            const goldReward = Math.floor(baseGold * (1 + floorIndex * 0.3) * floorRewardMultiplier * 2.5);
            // 额外经验奖励
            const baseXp = count * 15;
            const xpReward = Math.floor(baseXp * (1 + floorIndex * 0.2) * floorRewardMultiplier * 1.5);
            // 确保只使用可获取的物品
            const commonItems = consumableIds.filter(id => id.includes('POTION_HP_S') || id.includes('POTION_RAGE'));
            const itemPool = commonItems.length > 0 ? commonItems : consumableIds;
            const potionId = rng.choice(itemPool);

            return {
              id: `floor_quest_${floorIndex}_tactical_${rng.nextInt(1000, 9999)}`,
              title: `战术考核：${monster.cnName || monster.name}`,
              description: `在保持${minHpPercent}%以上生命值的情况下，击杀${count}只${monster.cnName || monster.name}`,
              category: 'FLOOR',
              objectives: [
                {
                  id: 1,
                  type: 'KILL',
                  target: monsterType,
                  count: count,
                  current: 0,
                  description: `保持高生命值击杀${count}只${monster.cnName || monster.name}`
                }
              ],
              prerequisites: [],
              nextQuest: null,
              conditions: {
                minHpPercent
              },
              reward: {
                gold: goldReward,
                xp: xpReward,
                items: [potionId]
              },
              autoComplete: false
            };
          }
        },
        // 生存试炼：在较低血线限制下击杀任意怪物，金币+经验
        {
          type: 'SURVIVAL',
          generate: () => {
            const count = rng.nextInt(6, 10); // 6-10只
            // 基础奖励（随楼层增长）
            const baseGold = count * rng.nextInt(8, 15);
            const baseXp = count * rng.nextInt(10, 18);
            // 应用楼层奖励倍率（线性 + 轻微非线性加成）
            const goldReward = Math.floor(baseGold * (1 + floorIndex * 0.3) * floorRewardMultiplier);
            const xpReward = Math.floor(baseXp * (1 + floorIndex * 0.2) * floorRewardMultiplier);

            return {
              id: `floor_quest_${floorIndex}_survival_${rng.nextInt(1000, 9999)}`,
              title: `生存试炼：第${floorIndex}层`,
              description: `在生命值不低于50%的情况下，击败${count}个敌人`,
              category: 'FLOOR',
              objectives: [
                {
                  id: 1,
                  type: 'KILL',
                  target: 'ANY',
                  count: count,
                  current: 0,
                  description: `在保持生命值不低于50%时击败${count}个敌人`
                }
              ],
              prerequisites: [],
              nextQuest: null,
              conditions: {
                minHpPercent: 50
              },
              reward: {
                gold: goldReward,
                xp: xpReward
              },
              autoComplete: false
            };
          }
        }
      ];

      // 随机选择一个模板
      const template = rng.choice(questTemplates);
      const quest = template.generate();

      // 添加到任务数据库
      QUEST_DATABASE[quest.id] = quest;

      // 自动接取任务
      if (this.acceptQuest(quest.id, true)) {
        // 记录该层的任务
        this.floorQuests.set(floorIndex, quest.id);
        console.log(`[QuestSystem] 已生成并接取楼层 ${floorIndex} 的随机任务: ${quest.title}`);
        return quest.id;
      }

      return null;
    } catch (error) {
      console.error(`[QuestSystem] 生成楼层 ${floorIndex} 任务失败:`, error);
      return null;
    }
  }

  /**
   * 生成每日任务
   * 基于 DailyChallengeSystem 的种子生成 3 个随机每日任务
   */
  generateDailyQuests() {
    // 防止重复生成
    if (this.dailyQuestsGenerated) {
      return;
    }

    try {
      // 获取每日种子
      const dailySeed = DailyChallengeSystem.getDailySeed();
      const rng = new SeededRandom(dailySeed);

      // 生成日期后缀（用于唯一ID）
      const now = new Date();
      const dateStr = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, '0')}${String(now.getUTCDate()).padStart(2, '0')}`;
      const dateSuffix = `_${dateStr}`;

      // 可用怪物类型列表（排除BOSS）
      // 注意：每日任务不限制楼层，使用所有非BOSS怪物
      const monsterTypes = Object.keys(MONSTER_STATS).filter(type => type !== 'BOSS');
      
      // 可用消耗品列表（确保只使用可获取的物品，提供默认值保护）
      const consumableIds = (CONSUMABLE_IDS && Array.isArray(CONSUMABLE_IDS) && CONSUMABLE_IDS.length > 0)
        ? CONSUMABLE_IDS.filter(id => {
            // 确保物品ID在游戏中存在
            return true;
          })
        : ['POTION_HP_S', 'POTION_RAGE'];

      // 每日任务模板池
      const questTemplates = [
        // 击杀特定怪物任务
        {
          type: 'KILL',
          generate: (index) => {
            const monsterType = rng.choice(monsterTypes);
            const monster = MONSTER_STATS[monsterType];
            const count = rng.nextInt(5, 15); // 5-15只
            // 每日任务使用固定奖励（不随楼层变化，因为每日任务可以在任何楼层完成）
            const goldReward = count * rng.nextInt(3, 8); // 金币奖励：每只3-8金币
            
            return {
              id: `daily_kill_${index}${dateSuffix}`,
              title: `每日狩猎：${monster.cnName || monster.name}`,
              description: `击杀${count}只${monster.cnName || monster.name}`,
              category: 'DAILY',
              objective: {
                type: 'KILL',
                target: monsterType,
                count: count
              },
              reward: (() => {
                const reward = { gold: goldReward };
                if (rng.next() < 0.3) {
                  // 确保只使用可获取的物品
                  const commonItems = consumableIds.filter(id => id.includes('POTION_HP_S') || id.includes('POTION_RAGE'));
                  const itemPool = commonItems.length > 0 ? commonItems : consumableIds;
                  reward.items = [rng.choice(itemPool)]; // 30%概率奖励药水
                }
                return reward;
              })(),
              autoComplete: false
            };
          }
        },
        // 收集药水任务
        {
          type: 'COLLECT',
          generate: (index) => {
            // 确保只使用可获取的物品（优先使用常见物品）
            const commonItems = consumableIds.filter(id => id.includes('POTION_HP_S') || id.includes('POTION_RAGE'));
            const itemPool = commonItems.length > 0 ? commonItems : consumableIds;
            const itemId = rng.choice(itemPool);
            const count = rng.nextInt(2, 5); // 2-5个
            // 每日任务使用固定奖励
            const goldReward = count * rng.nextInt(5, 15); // 金币奖励：每个5-15金币
            
            // 根据物品ID确定名称
            let itemName = '药水';
            if (itemId.includes('POTION_HP')) itemName = '小型药水';
            else if (itemId.includes('POTION_RAGE')) itemName = '怒气药水';
            else if (itemId.includes('SCROLL_XP')) itemName = '知识卷轴';
            else if (itemId.includes('SCROLL_FIRE')) itemName = '火焰卷轴';
            
            return {
              id: `daily_collect_${index}${dateSuffix}`,
              title: `每日收集：${itemName}`,
              description: `收集${count}个${itemName}`,
              category: 'DAILY',
              objective: {
                type: 'COLLECT',
                target: itemId,
                count: count
              },
              reward: {
                gold: goldReward
              },
              autoComplete: false
            };
          }
        },
        // 到达层数任务
        {
          type: 'REACH_FLOOR',
          generate: (index) => {
            const targetFloor = rng.nextInt(3, 8); // 3-8层
            // 每日任务使用固定奖励
            const goldReward = targetFloor * rng.nextInt(10, 20); // 金币奖励：每层10-20金币
            
            return {
              id: `daily_floor_${index}${dateSuffix}`,
              title: `每日探索：深入迷宫`,
              description: `到达第${targetFloor}层`,
              category: 'DAILY',
              objective: {
                type: 'REACH_FLOOR',
                target: targetFloor,
                count: 1
              },
              reward: (() => {
                const reward = { gold: goldReward };
                if (rng.next() < 0.4) {
                  // 确保只使用可获取的物品
                  const commonItems = consumableIds.filter(id => id.includes('POTION_HP_S') || id.includes('POTION_RAGE'));
                  const itemPool = commonItems.length > 0 ? commonItems : consumableIds;
                  reward.items = [rng.choice(itemPool)]; // 40%概率奖励药水
                }
                return reward;
              })(),
              autoComplete: false
            };
          }
        },
        // 交互任务（商店/铁匠/赌徒）
        {
          type: 'INTERACT',
          generate: (index) => {
            const interactTypes = ['SHOP', 'FORGE', 'GAMBLER'];
            const interactType = rng.choice(interactTypes);
            const count = rng.nextInt(1, 3); // 1-3次
            const goldReward = count * rng.nextInt(15, 30); // 金币奖励：每次15-30金币
            
            let interactName = '商店';
            if (interactType === 'FORGE') interactName = '铁匠';
            else if (interactType === 'GAMBLER') interactName = '赌徒';
            
            return {
              id: `daily_interact_${index}${dateSuffix}`,
              title: `每日交易：${interactName}`,
              description: `与${interactName}交互${count}次`,
              category: 'DAILY',
              objective: {
                type: 'INTERACT',
                target: interactType,
                count: count
              },
              reward: {
                gold: goldReward
              },
              autoComplete: false
            };
          }
        }
      ];

      // 随机选择3个不同的任务模板生成任务
      const selectedTemplates = [];
      const templatePool = [...questTemplates];
      for (let i = 0; i < 3 && templatePool.length > 0; i++) {
        const index = rng.nextInt(0, templatePool.length - 1);
        selectedTemplates.push(templatePool[index]);
        templatePool.splice(index, 1);
      }

      // 生成任务并添加到数据库
      selectedTemplates.forEach((template, index) => {
        const quest = template.generate(index);
        
        // 添加到任务数据库
        QUEST_DATABASE[quest.id] = quest;
        
        // 自动接取每日任务
        this.acceptQuest(quest.id);
      });

      this.dailyQuestsGenerated = true;
      console.log(`[QuestSystem] 已生成 ${selectedTemplates.length} 个每日任务 (种子: ${dailySeed})`);
    } catch (error) {
      console.error('[QuestSystem] 生成每日任务失败:', error);
    }
  }
}
