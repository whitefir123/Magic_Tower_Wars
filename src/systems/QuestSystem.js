/**
 * QuestSystem.js
 * 
 * 任务系统核心逻辑
 * 负责管理任务数据、状态流转、事件监听
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
    objective: {
      type: "KILL",
      target: "ANY",
      count: 3
    },
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
    reward: {
      xp: 100
    },
    autoComplete: false // 手动领取奖励
  }
};

export class QuestSystem {
  constructor(game) {
    this.game = game;
    this.activeQuests = new Map(); // Map<questId, questProgress>
    this.completedQuests = new Set(); // Set<questId> - 已完成但未领取奖励的任务
    this.claimedQuests = new Set(); // Set<questId> - 已领取奖励的任务
    this.dailyQuestsGenerated = false; // 标记是否已生成今日每日任务
    
    console.log('[QuestSystem] 任务系统已初始化');
  }

  /**
   * 初始化任务系统（新游戏开始时调用）
   */
  init() {
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
   * 接取任务
   * @param {string} questId - 任务ID
   */
  acceptQuest(questId) {
    const quest = QUEST_DATABASE[questId];
    if (!quest) {
      console.warn(`[QuestSystem] 任务不存在: ${questId}`);
      return false;
    }

    // 检查是否已经接取或已完成
    if (this.activeQuests.has(questId) || this.completedQuests.has(questId) || this.claimedQuests.has(questId)) {
      console.warn(`[QuestSystem] 任务已存在: ${questId}`);
      return false;
    }

    // 添加到活跃任务
    this.activeQuests.set(questId, {
      questId: questId,
      progress: 0,
      target: quest.objective.count
    });

    console.log(`[QuestSystem] 已接取任务: ${quest.title}`);
    return true;
  }

  /**
   * 检查并更新任务进度
   * @param {string} eventType - 事件类型 ('onKill', 'onLoot', 'onReachFloor', 'onInteract')
   * @param {object} data - 事件数据
   */
  check(eventType, data = {}) {
    // 遍历所有活跃任务
    for (const [questId, questProgress] of this.activeQuests.entries()) {
      const quest = QUEST_DATABASE[questId];
      if (!quest) continue;

      const objective = quest.objective;
      
      // 检查任务目标类型是否匹配
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
        if (currentFloor >= objective.target && questProgress.progress < questProgress.target) {
          // 到达目标层数，直接完成
          questProgress.progress = questProgress.target;
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
          questProgress.progress = Math.min(questProgress.progress + 1, questProgress.target);
        }
        
        console.log(`[QuestSystem] 任务进度更新: ${quest.title} (${questProgress.progress}/${questProgress.target})`);
        
        // 检查是否完成
        if (questProgress.progress >= questProgress.target) {
          this.completeQuest(questId);
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
    const quest = QUEST_DATABASE[questId];
    if (!quest) return;

    // 从活跃任务移除
    if (this.activeQuests.has(questId)) {
      this.activeQuests.delete(questId);
    }

    // 添加到已完成列表（待领取奖励）
    this.completedQuests.add(questId);

    console.log(`[QuestSystem] 任务完成: ${quest.title}`);

    // 通知UI更新
    if (this.game && this.game.ui && this.game.ui.questUI) {
      this.game.ui.questUI.update();
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
    return true;
  }

  /**
   * 获取任务数据（用于存档）
   * @returns {object} 任务数据
   */
  getQuestData() {
    return {
      activeQuests: Array.from(this.activeQuests.entries()).map(([questId, progress]) => ({
        questId,
        progress: progress.progress,
        target: progress.target
      })),
      completedQuests: Array.from(this.completedQuests),
      claimedQuests: Array.from(this.claimedQuests)
    };
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

    // 恢复活跃任务
    if (data.activeQuests && Array.isArray(data.activeQuests)) {
      data.activeQuests.forEach(item => {
        if (item.questId && QUEST_DATABASE[item.questId]) {
          this.activeQuests.set(item.questId, {
            questId: item.questId,
            progress: item.progress || 0,
            target: item.target || QUEST_DATABASE[item.questId].objective.count
          });
        }
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

    console.log('[QuestSystem] 任务数据已加载', {
      active: this.activeQuests.size,
      completed: this.completedQuests.size,
      claimed: this.claimedQuests.size
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
    return Array.from(this.activeQuests.keys()).map(questId => {
      const quest = QUEST_DATABASE[questId];
      const progress = this.activeQuests.get(questId);
      return {
        ...quest,
        progress: progress.progress,
        target: progress.target
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
   * @returns {object|null} 任务进度对象 {progress, target}
   */
  getQuestProgress(questId) {
    if (this.activeQuests.has(questId)) {
      const progress = this.activeQuests.get(questId);
      return {
        progress: progress.progress,
        target: progress.target
      };
    }
    return null;
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
      const monsterTypes = Object.keys(MONSTER_STATS).filter(type => type !== 'BOSS');
      
      // 可用消耗品列表
      const consumableIds = CONSUMABLE_IDS || ['POTION_HP_S', 'POTION_RAGE'];

      // 每日任务模板池
      const questTemplates = [
        // 击杀特定怪物任务
        {
          type: 'KILL',
          generate: (index) => {
            const monsterType = rng.choice(monsterTypes);
            const monster = MONSTER_STATS[monsterType];
            const count = rng.nextInt(5, 15); // 5-15只
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
                  reward.items = [rng.choice(consumableIds)]; // 30%概率奖励药水
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
            const itemId = rng.choice(consumableIds);
            const count = rng.nextInt(2, 5); // 2-5个
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
                  reward.items = [rng.choice(consumableIds)]; // 40%概率奖励药水
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
