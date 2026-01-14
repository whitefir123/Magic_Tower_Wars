// GamblerUI.js - 赌徒界面
// 管理赌博机制的所有渲染和交互逻辑

import { GAMBLE_TIERS, ITEM_QUALITY, EQUIPMENT_DB, getEquipmentDropForFloor, getRandomConsumable } from '../constants.js';

/**
 * GamblerUI - 赌博界面管理器
 * 负责渲染赌博界面、处理旋转动画和奖励生成
 */
export class GamblerUI {
  constructor(config = {}) {
    // 样式配置
    this.style = {
      panelOffsetX: config.panelOffsetX || 0,
      panelOffsetY: config.panelOffsetY || 0,
      panelScale: config.panelScale || 1.0,
      
      buttonHeight: config.buttonHeight || 50,
      buttonGap: config.buttonGap || 10,
      
      fontSize: config.fontSize || 16,
      titleFontSize: config.titleFontSize || 20,
      
      priceColor: config.priceColor || '#ffd700',
      disabledColor: config.disabledColor || '#666',
      
      enableAnimations: config.enableAnimations !== false,
      transitionDuration: config.transitionDuration || 200,
      
      ...config.customStyles
    };

    // 内部状态
    this.isOpen = false;
    this.player = null;
    this.isSpinning = false;
    this.spinStage = 0; // 0: idle, 1: spinning, 2: result

    // DOM 元素引用
    this.elements = {
      overlay: null,
      messageText: null,
      spinAnimation: null,
      resultDisplay: null,
      standardBtn: null,
      highRollerBtn: null,
      leaveBtn: null
    };

    // 初始化
    this.init();
  }

  /**
   * 初始化组件
   */
  init() {
    this.initDOMElements();
    this.setupEventListeners();
    console.log('✓ GamblerUI 已初始化', this.style);
  }

  /**
   * 获取赌徒界面的完整 HTML 字符串
   * @returns {string} HTML 字符串
   */
  getHTML() {
    return `
    <div class="gambler-panel">
      <h2 class="modal-title-shop" style="margin-bottom: 20px;">🎰 命运的老虎机 🎰</h2>
      
      <!-- 赌徒消息 -->
      <p id="gambler-message" style="font-size: 18px; color: #ffcc00; text-align: center; margin-bottom: 25px; font-style: italic;">
        手气不错，陌生人？老虎机知道你的命运...
      </p>
      
      <!-- 旋转动画区域 -->
      <div id="gambler-spin-animation" class="hidden" style="font-size: 24px; color: #ff6600; text-align: center; margin: 20px 0; font-weight: bold; animation: pulse 0.5s infinite;">
        旋转中...
      </div>
      
      <!-- 结果显示区域 -->
      <div id="gambler-result" class="hidden" style="font-size: 22px; text-align: center; margin: 20px 0; font-weight: bold; text-shadow: 2px 2px 4px rgba(0,0,0,0.8);">
        获得：[物品名称]
      </div>
      
      <!-- 按钮组 -->
      <div class="flex-center" style="flex-direction: column; gap: 15px;">
        <button id="gambler-btn-standard" class="btn-core btn-transaction" data-shop-item="standard" style="background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);">
          标准旋转 (50 G)
        </button>
        <button id="gambler-btn-high-roller" class="btn-core btn-transaction" data-shop-item="high-roller" style="background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);">
          豪赌旋转 (200 G)
        </button>
        <button id="gambler-btn-leave" class="btn-core btn-modal-close" style="margin-top: 15px;">
          离开
        </button>
      </div>
    </div>
    `;
  }

  /**
   * 初始化 DOM 元素引用
   */
  initDOMElements() {
    // 检查是否存在 gambler-overlay 元素
    this.elements.overlay = document.getElementById('gambler-overlay');
    
    // 如果不存在，创建新的 overlay 元素
    if (!this.elements.overlay) {
      console.log('Creating gambler-overlay element dynamically');
      const overlay = document.createElement('div');
      overlay.id = 'gambler-overlay';
      overlay.className = 'modal-overlay hidden';
      
      // 注入 HTML 内容
      overlay.innerHTML = this.getHTML();
      
      // 将 overlay 添加到 body（确保全屏覆盖）
      document.body.appendChild(overlay);
      this.elements.overlay = overlay;
    }
    
    // 在 overlay 创建后获取所有元素引用
    this.elements.messageText = document.getElementById('gambler-message');
    this.elements.spinAnimation = document.getElementById('gambler-spin-animation');
    this.elements.resultDisplay = document.getElementById('gambler-result');
    this.elements.standardBtn = document.getElementById('gambler-btn-standard');
    this.elements.highRollerBtn = document.getElementById('gambler-btn-high-roller');
    this.elements.leaveBtn = document.getElementById('gambler-btn-leave');
    
    console.log('✓ GamblerUI DOM elements initialized:', {
      overlay: !!this.elements.overlay,
      messageText: !!this.elements.messageText,
      spinAnimation: !!this.elements.spinAnimation,
      resultDisplay: !!this.elements.resultDisplay,
      standardBtn: !!this.elements.standardBtn,
      highRollerBtn: !!this.elements.highRollerBtn,
      leaveBtn: !!this.elements.leaveBtn
    });
  }

  /**
   * 设置事件监听器
   */
  setupEventListeners() {
    if (!this.elements.overlay) return;

    // 防止重复初始化
    if (this.elements.overlay._listenersInitialized) {
      console.log('GamblerUI event listeners already initialized, skipping');
      return;
    }
    this.elements.overlay._listenersInitialized = true;

    // 关闭按钮
    const closeBtn = this.elements.overlay.querySelector('.gambler-close-btn, .btn-gambler-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.close());
    }

    // 点击 overlay 外部关闭
    this.elements.overlay.addEventListener('click', (e) => {
      if (e.target === this.elements.overlay) {
        this.close();
      }
    });

    // 标准旋转按钮
    if (this.elements.standardBtn) {
      this.elements.standardBtn.addEventListener('click', () => {
        const game = window.game;
        if (game && game.audio && typeof game.audio.playGamble === 'function') {
          game.audio.playGamble();
        }
        this.spin('STANDARD');
      });
    }

    // 豪赌旋转按钮
    if (this.elements.highRollerBtn) {
      this.elements.highRollerBtn.addEventListener('click', () => {
        const game = window.game;
        if (game && game.audio && typeof game.audio.playGamble === 'function') {
          game.audio.playGamble();
        }
        this.spin('HIGH_ROLLER');
      });
    }

    // 离开按钮
    if (this.elements.leaveBtn) {
      this.elements.leaveBtn.addEventListener('click', () => this.close());
    }
    
    console.log('✓ GamblerUI event listeners setup complete');
  }

  /**
   * 打开赌博界面
   */
  open() {
    if (!this.elements.overlay) {
      this.initDOMElements();
    }

    if (this.elements.overlay) {
      // 暂停游戏
      const game = window.game;
      if (game) {
        game.isPaused = true;
        game.inputStack = [];
      }

      // 使用平滑过渡显示
      this.elements.overlay.classList.remove('hidden');
      this.elements.overlay.style.setProperty('display', 'flex', 'important');
      // 强制重排以应用初始状态
      void this.elements.overlay.offsetWidth;
      // 使用 requestAnimationFrame 确保平滑过渡
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          this.elements.overlay.classList.remove('overlay-fade-out');
          this.elements.overlay.classList.add('overlay-fade-in');
        });
      });
      this.isOpen = true;

      // 重置状态
      this.isSpinning = false;
      this.spinStage = 0;

      // 渲染界面
      if (game && game.player) {
        this.player = game.player;
        this.render();
      }

      // Apply smooth transition animation
      const panel = this.elements.overlay.querySelector('.gambler-panel, .gambler-content, .gambler-modal');
      const targetElement = panel || this.elements.overlay.querySelector('[class*="gambler"]');
      if (targetElement) {
        // Remove animation class to restart animation on re-open
        targetElement.classList.remove('modal-animate-enter');
        // Force reflow to restart animation
        void targetElement.offsetWidth;
        // Add animation class
        targetElement.classList.add('modal-animate-enter');
      }

      console.log('✓ GamblerUI 已打开');
    }
  }

  /**
   * 关闭赌博界面
   */
  close() {
    if (this.elements.overlay) {
      // 使用平滑过渡隐藏
      this.elements.overlay.classList.remove('overlay-fade-in');
      this.elements.overlay.classList.add('overlay-fade-out');
      // 等待过渡完成后隐藏
      setTimeout(() => {
        this.elements.overlay.classList.add('hidden');
        this.elements.overlay.style.setProperty('display', 'none', 'important');
        this.elements.overlay.classList.remove('overlay-fade-out');
      }, 300);
      this.isOpen = false;

      // 恢复游戏
      const game = window.game;
      if (game) {
        game.isPaused = false;
      }

      console.log('✓ GamblerUI 已关闭');
    }
  }

  /**
   * 渲染界面
   */
  render() {
    this.updateButtonStates();
    this.updateMessage();
    this.updatePriceDisplay();
  }

  /**
   * 更新消息文本
   */
  updateMessage() {
    if (this.elements.messageText) {
      if (this.spinStage === 0) {
        this.elements.messageText.textContent = '手气不错，陌生人？老虎机知道你的命运...';
      } else if (this.spinStage === 1) {
        this.elements.messageText.textContent = '旋转中...';
      }
    }
  }

  /**
   * 更新价格显示
   */
  updatePriceDisplay() {
    if (this.elements.standardBtn) {
      const standardCost = GAMBLE_TIERS.STANDARD.cost;
      const standardText = `标准旋转 (${standardCost} G)`;
      this.elements.standardBtn.textContent = standardText;
    }

    if (this.elements.highRollerBtn) {
      const highRollerCost = GAMBLE_TIERS.HIGH_ROLLER.cost;
      const highRollerText = `豪赌旋转 (${highRollerCost} G)`;
      this.elements.highRollerBtn.textContent = highRollerText;
    }
  }

  /**
   * 更新按钮状态
   */
  updateButtonStates() {
    const game = window.game;
    if (!game || !game.player) return;

    const playerGold = game.player.stats.gold ?? 0;

    // 标准旋转按钮
    if (this.elements.standardBtn) {
      const canAfford = playerGold >= GAMBLE_TIERS.STANDARD.cost;
      this.elements.standardBtn.disabled = !canAfford || this.isSpinning;
      this.elements.standardBtn.style.opacity = (canAfford && !this.isSpinning) ? '1' : '0.5';
    }

    // 豪赌旋转按钮
    if (this.elements.highRollerBtn) {
      const canAfford = playerGold >= GAMBLE_TIERS.HIGH_ROLLER.cost;
      this.elements.highRollerBtn.disabled = !canAfford || this.isSpinning;
      this.elements.highRollerBtn.style.opacity = (canAfford && !this.isSpinning) ? '1' : '0.5';
    }

    // 离开按钮
    if (this.elements.leaveBtn) {
      this.elements.leaveBtn.disabled = this.isSpinning;
    }
  }

  /**
   * 执行旋转
   * @param {string} tierKey - 'STANDARD' 或 'HIGH_ROLLER'
   */
  async spin(tierKey) {
    if (this.isSpinning) return;

    const game = window.game;
    if (!game || !game.player) return;

    const tier = GAMBLE_TIERS[tierKey];
    if (!tier) return;

    // 检查金币
    const playerGold = game.player.stats.gold ?? 0;
    if (playerGold < tier.cost) {
      if (game.ui && game.ui.logMessage) {
        game.ui.logMessage('金币不足！', 'info');
      }
      return;
    }

    // 扣除金币
    game.player.stats.gold -= tier.cost;
    if (game.ui && game.ui.updateStats) {
      game.ui.updateStats(game.player);
    }

    // 开始旋转
    this.isSpinning = true;
    this.spinStage = 1;
    this.render();

    // 显示旋转动画
    await this.showSpinAnimation();

    // 生成奖励
    const reward = this.generateReward(tier);

    // 显示结果
    await this.showResult(reward);

    // 结束旋转
    this.isSpinning = false;
    this.spinStage = 0;
    this.render();
  }

  /**
   * 显示旋转动画
   */
  async showSpinAnimation() {
    const game = window.game;
    
    // 播放旋转音效（模拟拉杆或滚轮声）
    if (game && game.audio) {
      game.audio.playBookFlip();
    }
    
    if (this.elements.spinAnimation) {
      this.elements.spinAnimation.classList.remove('hidden');
      this.elements.spinAnimation.textContent = '旋转中...';
    }

    // 模拟旋转过程
    const spinDuration = 1500;
    const steps = ['...', '......', '.........'];
    let stepIndex = 0;

    const interval = setInterval(() => {
      if (this.elements.spinAnimation) {
        this.elements.spinAnimation.textContent = `旋转中${steps[stepIndex % steps.length]}`;
        stepIndex++;
      }
    }, 300);

    await this.sleep(spinDuration);
    clearInterval(interval);

    if (this.elements.spinAnimation) {
      this.elements.spinAnimation.textContent = 'DING!';
    }

    await this.sleep(500);

    if (this.elements.spinAnimation) {
      this.elements.spinAnimation.classList.add('hidden');
    }
  }

  /**
   * 生成奖励
   * @param {object} tier - 赌博层级配置
   * @returns {object} 奖励对象
   */
  generateReward(tier) {
    const game = window.game;
    const floor = game && game.player ? game.player.stats.floor : 1;

    // 首先根据概率选择品质
    const quality = this.rollQuality(tier.chances);

    // 如果是普通品质，有 50% 概率给垃圾（幸运石）
    if (quality === 'COMMON' && Math.random() < 0.5) {
      return {
        type: 'trash',
        name: '幸运石',
        nameEn: 'Lucky Rock',
        quality: 'COMMON',
        value: 1
      };
    }

    // 否则生成装备或消耗品
    const isEquipment = Math.random() < 0.7; // 70% 装备，30% 消耗品

    if (isEquipment) {
      // 生成装备
      const equipment = getEquipmentDropForFloor(floor);
      if (equipment) {
        return {
          type: 'equipment',
          itemId: equipment.id,
          name: equipment.nameZh || equipment.name,
          nameEn: equipment.name,
          quality: quality,
          data: equipment
        };
      }
    }

    // 生成消耗品
    // ✅ FIX: 使用 RNG（如果存在，每日挑战模式需要确定性）
    const rng = (game && game.isDailyMode && game.rng) ? game.rng : null;
    const consumable = getRandomConsumable(rng);
    if (consumable) {
      return {
        type: 'consumable',
        itemId: consumable.id,
        name: consumable.nameZh || consumable.name,
        nameEn: consumable.name,
        quality: quality,
        data: consumable
      };
    }

    // 保底：给金币
    const goldAmount = Math.floor(10 + Math.random() * 20);
    return {
      type: 'gold',
      name: `${goldAmount} 金币`,
      nameEn: `${goldAmount} Gold`,
      quality: quality,
      value: goldAmount
    };
  }

  /**
   * 根据概率表滚动品质
   * @param {object} chances - 品质概率表
   * @returns {string} 品质ID
   */
  rollQuality(chances) {
    const total = Object.values(chances).reduce((sum, chance) => sum + chance, 0);
    let roll = Math.random() * total;

    for (const [qualityKey, chance] of Object.entries(chances)) {
      roll -= chance;
      if (roll <= 0) {
        return qualityKey;
      }
    }

    return 'COMMON'; // 保底
  }

  /**
   * 显示结果
   * @param {object} reward - 奖励对象
   */
  async showResult(reward) {
    const game = window.game;
    if (!game) return;

    // 播放结果音效
    if (game.audio) {
      if (reward.type === 'trash') {
        // 垃圾：播放布料音效
        game.audio.playCloth({ volume: 0.5 });
      } else {
        // 检查是否为稀有品质（RARE/EPIC/LEGENDARY）
        const isRareQuality = reward.quality === 'RARE' || reward.quality === 'EPIC' || reward.quality === 'LEGENDARY';
        if (isRareQuality) {
          // 稀有/史诗/传说：播放暴击音效增加惊喜感
          game.audio.playCrit({ volume: 0.4 });
        } else {
          // 普通/优秀：播放金币音效（UI 逻辑）
          game.audio.playCoins({ forceCategory: 'ui' });
        }
      }
    }

    // 获取品质颜色
    const qualityColor = ITEM_QUALITY[reward.quality]?.color || '#ffffff';

    // 显示结果文本
    if (this.elements.resultDisplay) {
      this.elements.resultDisplay.classList.remove('hidden');
      this.elements.resultDisplay.style.color = qualityColor;
      this.elements.resultDisplay.textContent = `获得：${reward.name}`;
    }

    // 应用奖励
    this.applyReward(reward);

    // 成就系统：检测赌博结果
    if (game.achievementSystem) {
      if (reward.type === 'trash') {
        // 垃圾：触发非酋检测
        game.achievementSystem.check('onGamble', reward);
      } else {
        // 非垃圾：重置连续垃圾计数
        game.achievementSystem.resetConsecutiveTrashGambles();
      }
    }

    // 显示浮动文本
    if (game.player && game.floatingTextPool && game.settings && game.settings.showDamageNumbers !== false) {
      const text = game.floatingTextPool.create(
        game.player.visualX,
        game.player.visualY - 30,
        reward.name,
        qualityColor
      );
      game.floatingTexts.push(text);
    }

    // 记录日志
    if (game.ui && game.ui.logMessage) {
      const qualityName = ITEM_QUALITY[reward.quality]?.name || '';
      game.ui.logMessage(`获得 [${qualityName}] ${reward.name}！`, 'gain');
    }

    await this.sleep(2000);

    if (this.elements.resultDisplay) {
      this.elements.resultDisplay.classList.add('hidden');
    }
  }

  /**
   * 应用奖励到玩家
   * @param {object} reward - 奖励对象
   */
  applyReward(reward) {
    const game = window.game;
    if (!game || !game.player) return;

    switch (reward.type) {
      case 'trash':
        // 垃圾：给 1 金币
        game.player.stats.gold = (game.player.stats.gold || 0) + 1;
        break;

      case 'equipment':
        // 装备：创建新物品实例并添加到背包（不修改EQUIPMENT_DB）
        if (reward.itemId && reward.data) {
          // 应用品质倍率到装备属性
          const qualityMultiplier = ITEM_QUALITY[reward.quality]?.multiplier || 1.0;
          
          // 创建物品实例对象（不修改EQUIPMENT_DB）
          const itemInstance = {
            itemId: reward.itemId,
            uid: `${reward.itemId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, // 唯一ID
            quality: reward.quality,
            enhanceLevel: 0,
            stats: {},
            baseStats: reward.data.stats ? { ...reward.data.stats } : {},
            ...reward.data // 保留其他属性
          };
          
          // 应用品质倍率到属性
          if (itemInstance.baseStats) {
            for (const [stat, value] of Object.entries(itemInstance.baseStats)) {
              itemInstance.stats[stat] = Math.floor(value * qualityMultiplier);
            }
          }
          
          // 添加到背包（传入物品实例对象）
          const success = game.player.addToInventory(itemInstance);
          if (!success) {
            // 背包满了，掉落到地上（使用itemId）
            if (game.map) {
              game.map.addEquipAt(reward.itemId, game.player.x, game.player.y);
            }
          }
        }
        break;

      case 'consumable':
        // 消耗品：添加到背包
        if (reward.itemId) {
          const success = game.player.addToInventory(reward.itemId);
          if (!success && game.map) {
            game.map.addConsumableAt(reward.itemId, game.player.x, game.player.y);
          }
        }
        break;

      case 'gold':
        // 金币
        game.player.stats.gold = (game.player.stats.gold || 0) + (reward.value || 0);
        break;

      default:
        console.warn('未知的奖励类型:', reward.type);
    }

    // 更新 UI
    if (game.ui && game.ui.updateStats) {
      game.ui.updateStats(game.player);
    }
    if (game.ui && game.ui.renderInventory) {
      game.ui.renderInventory(game.player);
    }
  }

  /**
   * 睡眠函数
   * @param {number} ms - 毫秒数
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 销毁组件
   */
  destroy() {
    this.close();
    this.player = null;
    console.log('✓ GamblerUI 已销毁');
  }
}

