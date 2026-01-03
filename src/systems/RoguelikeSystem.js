/**
 * 命运符文系统 2.1 - RoguelikeSystem
 * 
 * 功能：
 * - 基于权重的符文生成（稀有度、类型、标签偏好）
 * - 符文选择、刷新、放弃功能
 * - 符文状态管理和属性更新
 */

import { RUNE_POOL, RUNE_RARITY_WEIGHTS, RUNE_TYPE_WEIGHTS, RUNE_RARITY_MULTIPLIERS } from '../constants.js';

export class RoguelikeSystem {
  constructor(game) {
    this.game = game;
    this.queue = [];
    this.isOpen = false;
    
    // ========== 状态管理 ==========
    // 当前刷新费用（初始50，每次刷新+50）
    this.currentRerollCost = 50;
    
    // 当前显示的符文选项（用于刷新功能）
    this.currentOptions = [];
    
    // ✅ FIX: 添加处理锁，防止重复点击导致的金币透支
    this.isProcessing = false;
  }
  
  /**
   * ✅ v2.1: 重置刷新费用（进入下一层或重开游戏时调用）
   */
  resetRerollCost() {
    this.currentRerollCost = 50;
    console.log('[RoguelikeSystem] 刷新费用已重置为 50G');
  }
  
  /**
   * 计算符文权重（基于稀有度、类型、标签偏好）
   * @param {Object} sourceMonster - 来源怪物（可选，用于标签权重计算）
   * @returns {Map} 符文到权重的映射
   */
  computeRuneWeights(sourceMonster = null) {
    const weights = new Map();
    
    // 标签权重（如果玩家主要加物理，物理系符文权重微调）
    let physBias = 1.0;
    let magBias = 1.0;
    
    if (sourceMonster && sourceMonster.stats) {
      const s = sourceMonster.stats;
      // 如果物理攻击 >= 魔法攻击，物理系权重+0.2
      if ((s.p_atk || 0) >= (s.m_atk || 0)) {
        physBias += 0.2;
      } else {
        magBias += 0.2;
      }
    }
    
    // 也可以基于玩家当前属性计算标签权重（可选）
    if (this.game && this.game.player) {
      const playerStats = this.game.player.getTotalStats ? this.game.player.getTotalStats() : this.game.player.stats;
      if ((playerStats.p_atk || 0) >= (playerStats.m_atk || 0)) {
        physBias += 0.1;
      } else {
        magBias += 0.1;
      }
    }
    
    // 遍历所有符文，计算权重
    for (const rune of RUNE_POOL) {
      let weight = 1.0;
      
      // 1. 稀有度权重
      const rarityWeight = RUNE_RARITY_WEIGHTS[rune.rarity] || 1.0;
      weight *= rarityWeight;
      
      // 2. 类型权重
      const typeWeight = RUNE_TYPE_WEIGHTS[rune.type] || 1.0;
      weight *= typeWeight;
      
      // 3. 标签权重（物理/魔法偏好）
      if (rune.type === 'STAT') {
        // 物理系符文（物攻、物防）
        if (rune.id.includes('might') || rune.id.includes('brutal') || 
            rune.id.includes('iron') || rune.id.includes('fortress')) {
          weight *= physBias;
        }
        // 魔法系符文（魔攻、魔防）
        else if (rune.id.includes('arcana') || rune.id.includes('arcane') || 
                 rune.id.includes('ward') || rune.id.includes('barrier')) {
          weight *= magBias;
        }
      }
      
      weights.set(rune, Math.max(0.1, weight));
    }
    
    return weights;
  }
  
  /**
   * 基于权重抽取 N 个符文（不重复）
   * @param {Map} weights - 符文到权重的映射
   * @param {number} n - 需要抽取的数量
   * @param {SeededRandom} rng - 可选的随机数生成器（如果提供则使用，否则使用 Math.random）
   * @returns {Array} 抽取的符文数组
   */
  weightedPickNRunes(weights, n, rng = null) {
    const picks = [];
    const pool = Array.from(weights.entries());
    
    while (picks.length < n && pool.length > 0) {
      const total = pool.reduce((acc, [, w]) => acc + w, 0);
      if (total <= 0) break;
      
      // ✅ FIX: 使用传入的 RNG 或回退到 Math.random（每日挑战模式需要确定性）
      const randomValue = rng ? rng.next() : Math.random();
      let r = randomValue * total;
      let idx = -1;
      
      for (let i = 0; i < pool.length; i++) {
        r -= pool[i][1];
        if (r <= 0) {
          idx = i;
          break;
        }
      }
      
      if (idx < 0) idx = 0;
      const [rune] = pool.splice(idx, 1)[0];
      picks.push(rune);
    }
    
    return picks;
  }
  
  /**
   * 生成符文选项（3张卡片）
   * @param {Object} sourceMonster - 来源怪物（可选）
   * @param {SeededRandom} rng - 可选的随机数生成器（如果提供则使用，否则使用 Math.random）
   * @returns {Array} 符文选项数组
   */
  generateRuneOptions(sourceMonster = null, rng = null) {
    const weights = this.computeRuneWeights(sourceMonster);
    // ✅ FIX: 传递 RNG 给 weightedPickNRunes（每日挑战模式需要确定性）
    // 如果没有传入 rng，尝试从 game 对象获取（每日挑战模式）
    const actualRng = rng || ((this.game && this.game.isDailyMode && this.game.rng) ? this.game.rng : null);
    const selectedRunes = this.weightedPickNRunes(weights, 3, actualRng);
    
    // 为每个符文生成显示数据
    const options = selectedRunes.map(rune => {
      // 计算数值（根据层级和稀有度）
      const floor = (this.game && this.game.player) ? (this.game.player.stats.floor || 1) : 1;
      const multiplier = RUNE_RARITY_MULTIPLIERS[rune.rarity] || 1.0;
      
      // 根据符文类型和稀有度计算数值
      let value = 1;
      if (rune.type === 'STAT') {
        if (rune.id.includes('might') || rune.id.includes('brutal')) {
          value = Math.floor(1 * multiplier * (1 + floor * 0.1));
        } else if (rune.id.includes('iron') || rune.id.includes('fortress')) {
          value = Math.floor(1 * multiplier * (1 + floor * 0.1));
        } else if (rune.id.includes('arcana') || rune.id.includes('arcane')) {
          value = Math.floor(1 * multiplier * (1 + floor * 0.1));
        } else if (rune.id.includes('ward') || rune.id.includes('barrier')) {
          value = Math.floor(1 * multiplier * (1 + floor * 0.1));
        } else if (rune.id.includes('vitality') || rune.id.includes('life')) {
          value = Math.floor(10 * multiplier * (1 + floor * 0.1));
        } else if (rune.id.includes('precision') || rune.id.includes('deadly') || rune.id.includes('assassin')) {
          value = Math.floor(5 * multiplier);
        } else if (rune.id.includes('agility') || rune.id.includes('phantom')) {
          value = Math.floor(5 * multiplier);
        }
      }
      
      // 生成描述文本（替换占位符）
      let description = rune.description || '';
      description = description.replace(/\{\{value\}\}/g, value);
      
      // 特殊占位符替换
      if (rune.id === 'glass_cannon') {
        description = description.replace(/\{\{hpLoss\}\}/g, '30');
      } else if (rune.id === 'greed') {
        description = description.replace(/\{\{damageIncrease\}\}/g, '30');
      } else if (rune.id === 'thunder') {
        description = description.replace(/\{\{value\}\}/g, '15');
        description = description.replace(/\{\{chainDamage\}\}/g, '50');
      } else if (rune.id === 'vampire') {
        description = description.replace(/\{\{value\}\}/g, '15');
      } else if (rune.id === 'execute') {
        description = description.replace(/\{\{value\}\}/g, '30');
        description = description.replace(/\{\{executeDamage\}\}/g, '50');
      } else if (rune.id === 'multicast') {
        description = description.replace(/\{\{value\}\}/g, '25');
      }
      
      return {
        rune,
        value,
        name: rune.nameZh || rune.name,
        description,
        rarity: rune.rarity,
        type: rune.type
      };
    });
    
    return options;
  }
  
  /**
   * 应用符文效果
   * @param {Object} option - 符文选项
   */
  applyRune(option) {
    const { rune, value } = option;
    const player = this.game.player;
    
    if (!player) {
      console.error('[RoguelikeSystem] 玩家对象不存在');
      return;
    }
    
    try {
      // ✅ FIX: 防御性初始化 - 确保所有相关对象都已正确初始化
      if (!player.runeState) {
        player.runeState = {
          effects: {},
          bonusStats: {
            p_atk: 0, m_atk: 0, p_def: 0, m_def: 0,
            hp: 0, crit_rate: 0, dodge: 0, gold_rate: 0
          }
        };
      }
      if (!player.runeState.effects) {
        player.runeState.effects = {};
      }
      if (!player.runeState.bonusStats) {
        player.runeState.bonusStats = {
          p_atk: 0, m_atk: 0, p_def: 0, m_def: 0,
          hp: 0, crit_rate: 0, dodge: 0, gold_rate: 0
        };
      }
      if (!player.runes) {
        player.runes = {};
      }
      
      // 增加符文层数
      if (!player.runeState.effects[rune.id]) {
        player.runeState.effects[rune.id] = 0;
      }
      player.runeState.effects[rune.id]++;
      
      // 2. 执行 onObtain 效果
      if (rune.onObtain) {
        rune.onObtain(player, value);
      }
      
      // 3. bonusStats 已经在 onObtain 中更新，这里不需要再次更新
      // ✅ FIX: 移除此处的重复更新，避免双重叠加
      
      // 4. 更新UI
      // ✅ FIX: 优化 UI 更新逻辑 - updateStats 会自动调用 updateRuneStats，无需重复调用
      if (this.game.ui && this.game.ui.updateStats) {
        this.game.ui.updateStats(player);
      }
      
      // 5. 显示消息
      if (this.game.ui && this.game.ui.logMessage) {
        this.game.ui.logMessage(`获得符文: ${option.name}`, 'gain');
      }
      
      console.log(`[RoguelikeSystem] 应用符文: ${rune.id}, 层数: ${player.runeState.effects[rune.id]}`);
    } catch (err) {
      console.error('[RoguelikeSystem] 应用符文效果错误:', err);
    }
  }
  
  /**
   * 刷新符文选项（重新生成3张卡片）
   */
  reroll() {
    // ✅ FIX: 添加处理锁，防止重复点击导致的金币透支
    if (this.isProcessing) {
      console.warn('[RoguelikeSystem] 刷新操作正在进行中，忽略重复请求');
      return;
    }
    
    const player = this.game.player;
    if (!player) {
      console.error('[RoguelikeSystem] 玩家对象不存在');
      return;
    }
    
    // ✅ FIX: 检查是否拥有【贪婪戒指】，如果有则免费刷新
    const hasMerchantsRing = player.hasRelic && player.hasRelic('MERCHANTS_RING');
    const actualRerollCost = hasMerchantsRing ? 0 : this.currentRerollCost;
    
    // 检查金币是否足够（如果免费则跳过检查）
    const currentGold = player.stats.gold || 0;
    if (!hasMerchantsRing && currentGold < this.currentRerollCost) {
      if (this.game.ui && this.game.ui.logMessage) {
        this.game.ui.logMessage(`金币不足！需要 ${this.currentRerollCost}G`, 'error');
      }
      return;
    }
    
    // ✅ FIX: 设置处理锁，防止重复点击
    this.isProcessing = true;
    
    try {
      // 扣除金币（如果有贪婪戒指则免费）
      if (!hasMerchantsRing) {
        player.stats.gold = Math.max(0, currentGold - this.currentRerollCost);
      }
      
      // 增加下一次刷新费用
      this.currentRerollCost += 50;
      
      // 重新生成符文选项
      const sourceMonster = this.currentSourceMonster || null;
      // ✅ FIX: 传递 RNG 给 generateRuneOptions（每日挑战模式需要确定性）
      const rng = (this.game && this.game.isDailyMode && this.game.rng) ? this.game.rng : null;
      this.currentOptions = this.generateRuneOptions(sourceMonster, rng);
      
      // 更新UI显示
      this.renderCards();
      
      // 更新UI（显示金币变化）
      if (this.game.ui && this.game.ui.updateStats) {
        this.game.ui.updateStats(player);
      }
      
      // 显示消息
      if (this.game.ui && this.game.ui.logMessage) {
        if (hasMerchantsRing) {
          this.game.ui.logMessage(`刷新符文选项（[贪婪戒指] 免费刷新）`, 'info');
        } else {
          this.game.ui.logMessage(`刷新符文选项（花费 ${this.currentRerollCost - 50}G）`, 'info');
        }
      }
      
      console.log(`[RoguelikeSystem] 刷新符文选项，当前刷新费用: ${this.currentRerollCost}`);
    } finally {
      // ✅ FIX: 释放处理锁（使用 setTimeout 确保 UI 更新完成后再释放）
      setTimeout(() => {
        this.isProcessing = false;
      }, 100);
    }
  }
  
  /**
   * 放弃本次选择（获得少量金币，关闭界面）
   */
  recycle() {
    const player = this.game.player;
    if (!player) {
      console.error('[RoguelikeSystem] 玩家对象不存在');
      return;
    }
    
    // 获得少量金币
    const recycleGold = 20;
    player.stats.gold = (player.stats.gold || 0) + recycleGold;
    
    // 更新UI
    if (this.game.ui && this.game.ui.updateStats) {
      this.game.ui.updateStats(player);
    }
    
    // 显示消息
    if (this.game.ui && this.game.ui.logMessage) {
      this.game.ui.logMessage(`放弃选择，获得 ${recycleGold}G`, 'info');
    }
    
    // 关闭界面
    this.closeDraft();
    
    console.log(`[RoguelikeSystem] 放弃符文选择，获得 ${recycleGold}G`);
  }
  
  /**
   * 渲染符文卡片到UI
   */
  renderCards() {
    const cardsContainer = document.getElementById('draft-cards');
    if (!cardsContainer) {
      console.error('[RoguelikeSystem] draft-cards 元素未找到');
      return;
    }
    
    cardsContainer.innerHTML = '';
    
    // 渲染每个符文卡片
    for (const option of this.currentOptions) {
      const cardDiv = document.createElement('div');
      cardDiv.className = 'card';
      
      // 根据稀有度添加样式类（使用标准类名）
      if (option.rarity === 'LEGENDARY') {
        cardDiv.classList.add('rarity-legendary');
      } else if (option.rarity === 'CURSED') {
        cardDiv.classList.add('rarity-cursed');
      } else if (option.rarity === 'RARE') {
        cardDiv.classList.add('rarity-rare');
      } else {
        cardDiv.classList.add('rarity-common');
      }
      
      // 根据类型添加图标或标识（已移除emoji）
      let typeIcon = '';
      if (option.type === 'MECHANIC') {
        typeIcon = '';
      } else if (option.type === 'CURSE') {
        typeIcon = '';
      }
      
      cardDiv.innerHTML = `
        <h3>${typeIcon ? typeIcon + ' ' : ''}${option.name}</h3>
        <p>${option.description}</p>
        <div class="rune-rarity" style="margin-top: 10px; font-size: 0.9rem; color: ${this.getRarityColor(option.rarity)};">
          ${this.getRarityText(option.rarity)}
        </div>
      `;
      
      // 添加点击事件
      cardDiv.onclick = (() => {
        const selectedOption = option;
        return () => {
          this.selectRune(selectedOption);
        };
      })();
      
      cardsContainer.appendChild(cardDiv);
    }
    
    // 更新按钮状态
    this.updateButtons();
  }
  
  /**
   * 获取稀有度文本
   */
  getRarityText(rarity) {
    const texts = {
      'COMMON': '普通',
      'RARE': '稀有',
      'LEGENDARY': '传说',
      'CURSED': '诅咒'
    };
    return texts[rarity] || rarity;
  }
  
  /**
   * 获取稀有度文本颜色
   */
  getRarityColor(rarity) {
    const colors = {
      'COMMON': '#5a3a1a',      // 深棕色
      'RARE': '#2d5016',        // 深绿色
      'LEGENDARY': '#cc6600',   // 深橙色
      'CURSED': '#8b0000'       // 深红色
    };
    return colors[rarity] || '#888';
  }
  
  /**
   * 更新按钮状态（刷新、放弃按钮）
   */
  updateButtons() {
    const player = this.game.player;
    if (!player) return;
    
    // 更新刷新按钮
    const rerollBtn = document.getElementById('draft-reroll-btn');
    if (rerollBtn) {
      const currentGold = player.stats.gold || 0;
      const hasMerchantsRing = player.hasRelic && player.hasRelic('MERCHANTS_RING');
      if (hasMerchantsRing) {
        rerollBtn.textContent = `刷新 - 免费 [贪婪戒指]`;
        // ✅ FIX: 如果有贪婪戒指，免费刷新，只检查处理锁
        rerollBtn.disabled = this.isProcessing;
      } else {
        rerollBtn.textContent = `刷新 - ${this.currentRerollCost}G`;
        // ✅ FIX: 如果正在处理或金币不足，禁用按钮
        rerollBtn.disabled = this.isProcessing || currentGold < this.currentRerollCost;
      }
    }
    
    // 更新放弃按钮
    const recycleBtn = document.getElementById('draft-recycle-btn');
    if (recycleBtn) {
      recycleBtn.textContent = '放弃并回收 (+20G)';
    }
  }
  
  /**
   * 选择符文
   */
  selectRune(option) {
    this.applyRune(option);
    this.closeDraft();
  }
  
  /**
   * 关闭符文选择界面
   */
  closeDraft() {
    // 隐藏界面
    const overlay = document.getElementById('draft-overlay');
    if (overlay) {
      overlay.style.setProperty('display', 'none', 'important');
    }
    
    // 重置状态
    this.isOpen = false;
    if (this.game) {
      this.game.isPaused = false;
      // ✅ FIX: 清空输入栈，防止残留输入在界面关闭后立即触发
      this.game.inputStack = [];
    }
    
    // 重置刷新费用（下次打开时重新开始）
    this.currentRerollCost = 50;
    this.currentOptions = [];
    this.currentSourceMonster = null;
    // ✅ FIX: 重置处理锁
    this.isProcessing = false;
    
    // 处理队列中的下一个任务
    setTimeout(() => {
      this.processNext();
    }, 50);
  }
  
  /**
   * 将符文选择任务加入队列
   */
  enqueueDraft(tier, sourceMonster) {
    if (!this.queue) this.queue = [];
    this.queue.push({ tier: tier || 'NORMAL', sourceMonster });
    console.log(`[RoguelikeSystem] 符文选择任务已加入队列: tier=${tier}, isOpen=${this.isOpen}, queue长度=${this.queue.length}`);
    
    if (!this.isOpen) {
      console.log('[RoguelikeSystem] 符文选择界面未打开，立即处理');
      this.processNext();
    } else {
      console.log('[RoguelikeSystem] 符文选择界面已打开，任务已加入队列，等待处理');
    }
  }
  
  /**
   * 处理队列中的下一个符文选择任务
   */
  processNext() {
    try {
      // 检查队列是否为空
      if (!this.queue || this.queue.length === 0) {
        console.log('[RoguelikeSystem] 队列为空，关闭符文选择界面');
        this.isOpen = false;
        if (this.game) {
          this.game.isPaused = false;
        }
        return;
      }
      
      // 标记为打开状态
      this.isOpen = true;
      if (this.game) {
        // ✅ FIX: 暂停游戏并清空输入栈，防止输入穿透
        this.game.isPaused = true;
        this.game.inputStack = [];
      }
      
      // 从队列中取出第一个任务
      const { tier, sourceMonster } = this.queue.shift();
      this.currentSourceMonster = sourceMonster;
      
      // 重置刷新费用
      this.currentRerollCost = 50;
      
      console.log(`[RoguelikeSystem] 处理符文选择: tier=${tier}, queue剩余=${this.queue.length}`);
      
      // 设置标题
      const titleEl = document.getElementById('draft-title');
      if (titleEl) {
        titleEl.innerText = '命运符文选择';
      }
      
      // 生成符文选项
      // ✅ FIX: 传递 RNG 给 generateRuneOptions（每日挑战模式需要确定性）
      const rng = (this.game && this.game.isDailyMode && this.game.rng) ? this.game.rng : null;
      this.currentOptions = this.generateRuneOptions(sourceMonster, rng);
      
      // 渲染卡片
      this.renderCards();
      
      // 更新符文状态面板
      if (this.game.ui && this.game.ui.updateRuneStats) {
        this.game.ui.updateRuneStats(this.game.player);
      }
      
      // 显示界面
      const overlay = document.getElementById('draft-overlay');
      if (overlay) {
        overlay.style.setProperty('display', 'flex', 'important');
        console.log('[RoguelikeSystem] 符文选择界面已显示');
      } else {
        console.error('[RoguelikeSystem] draft-overlay 元素未找到');
        this.isOpen = false;
        if (this.game) {
          this.game.isPaused = false;
        }
      }
    } catch (err) {
      console.error('[RoguelikeSystem] processNext 执行错误:', err);
      this.isOpen = false;
      if (this.game) {
        this.game.isPaused = false;
      }
    }
  }
  
  /**
   * 触发符文选择（兼容旧接口）
   */
  triggerDraft(tier, sourceMonster) {
    this.enqueueDraft(tier, sourceMonster);
  }
  
  /**
   * ✅ v2.1: 重置刷新费用
   * 在进入下一层或重新开始游戏时调用
   */
  resetRerollCost() {
    this.currentRerollCost = 50;
    console.log('[RoguelikeSystem] 刷新费用已重置为 50G');
  }
}
