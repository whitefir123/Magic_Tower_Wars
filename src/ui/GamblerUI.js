// GamblerUI.js - 赌徒界面
// 管理赌博机制的所有渲染和交互逻辑

import { 
  GAMBLE_TIERS, 
  GAMBLER_CONFIG,
  ITEM_QUALITY, 
  EQUIPMENT_DB, 
  BUFF_POOL,
  getEquipmentDropForFloor, 
  getRandomConsumable 
} from '../constants.js';

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
      reelContainer: null,
      reelStrip: null,
      jackpotDisplay: null,
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
    this.injectStyles(); // 注入 CSS 样式
    console.log('✓ GamblerUI 已初始化 (v2.0 Visual Upgrade)', this.style);
  }

  /**
   * 注入自定义样式
   */
  injectStyles() {
    if (document.getElementById('gambler-ui-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'gambler-ui-styles';
    style.textContent = `
      .gambler-reel-container {
        width: 100%;
        height: 100px;
        background: #000;
        border: 4px solid #d4af37;
        border-radius: 8px;
        overflow: hidden;
        position: relative;
        margin: 20px 0;
        box-shadow: inset 0 0 20px rgba(0,0,0,0.8);
      }
      
      .gambler-reel-strip {
        display: flex;
        height: 100%;
        align-items: center;
        /* 初始位置 */
        transform: translateX(0);
        will-change: transform;
      }
      
      .gambler-item-card {
        min-width: 90px;
        height: 90px;
        margin: 0 5px;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        background: #222;
        border: 2px solid #444;
        border-radius: 6px;
        font-size: 32px;
        color: #fff;
        position: relative;
        box-sizing: border-box;
      }
      
      /* 中心指针 */
      .gambler-pointer {
        position: absolute;
        top: 0;
        left: 50%;
        transform: translateX(-50%);
        width: 4px;
        height: 100%;
        background: rgba(255, 215, 0, 0.5);
        z-index: 10;
        pointer-events: none;
      }
      .gambler-pointer::before {
        content: '▼';
        position: absolute;
        top: -15px;
        left: 50%;
        transform: translateX(-50%);
        color: #ffd700;
        font-size: 20px;
      }

      /* 品质颜色边框 */
      .quality-COMMON { border-color: #a0a0a0; box-shadow: 0 0 5px #a0a0a0; }
      .quality-UNCOMMON { border-color: #5eff00; box-shadow: 0 0 8px #5eff00; }
      .quality-RARE { border-color: #0070dd; box-shadow: 0 0 10px #0070dd; }
      .quality-EPIC { border-color: #a335ee; box-shadow: 0 0 15px #a335ee; }
      .quality-LEGENDARY { border-color: #ff8000; box-shadow: 0 0 20px #ff8000; }
      .quality-JACKPOT { border-color: #ff0000; box-shadow: 0 0 30px #ff0000; animation: rainbow-border 1s infinite; }
      
      @keyframes rainbow-border {
        0% { border-color: #ff0000; }
        20% { border-color: #ffff00; }
        40% { border-color: #00ff00; }
        60% { border-color: #00ffff; }
        80% { border-color: #0000ff; }
        100% { border-color: #ff00ff; }
      }

      .jackpot-counter {
        font-family: 'Courier New', monospace;
        color: #ff4444;
        font-weight: bold;
        text-shadow: 0 0 5px #ff0000;
        font-size: 24px;
        margin-top: 5px;
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * 获取赌徒界面的完整 HTML 字符串
   * @returns {string} HTML 字符串
   */
  getHTML() {
    return `
    <div class="gambler-panel" style="width: 500px; max-width: 95%;">
      <h2 class="modal-title-shop" style="margin-bottom: 10px;">🎰 命运的老虎机 🎰</h2>
      
      <!-- Jackpot 显示 -->
      <div style="text-align: center; margin-bottom: 15px; background: rgba(0,0,0,0.5); padding: 5px; border-radius: 5px;">
        <div style="color: #aaa; font-size: 14px;">当前累积奖池 (JACKPOT)</div>
        <div id="gambler-jackpot" class="jackpot-counter">0 G</div>
      </div>
      
      <!-- 赌徒消息 -->
      <p id="gambler-message" style="font-size: 16px; color: #ffcc00; text-align: center; margin-bottom: 15px; font-style: italic; min-height: 24px;">
        试试手气吧...
      </p>
      
      <!-- 滚动动画区域 (CS:GO Style) -->
      <div id="gambler-reel-container" class="gambler-reel-container">
        <div class="gambler-pointer"></div>
        <div id="gambler-reel-strip" class="gambler-reel-strip">
          <!-- JS 动态填充图标 -->
          <div class="gambler-item-card quality-COMMON">?</div>
          <div class="gambler-item-card quality-COMMON">?</div>
          <div class="gambler-item-card quality-COMMON">?</div>
          <div class="gambler-item-card quality-COMMON">?</div>
          <div class="gambler-item-card quality-COMMON">?</div>
        </div>
      </div>
      
      <!-- 结果显示区域 -->
      <div id="gambler-result" class="hidden" style="font-size: 22px; text-align: center; margin: 15px 0; font-weight: bold; text-shadow: 2px 2px 4px rgba(0,0,0,0.8); min-height: 30px;">
        获得：[物品名称]
      </div>
      
      <!-- 按钮组 -->
      <div class="flex-center" style="flex-direction: row; gap: 15px; justify-content: space-around;">
        <button id="gambler-btn-standard" class="btn-core btn-transaction" style="background: linear-gradient(135deg, #3498db 0%, #2980b9 100%); width: 45%;">
          <div>标准旋转</div>
          <div style="font-size: 12px; opacity: 0.8;">50 G</div>
        </button>
        <button id="gambler-btn-high-roller" class="btn-core btn-transaction" style="background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%); width: 45%;">
          <div>豪赌旋转</div>
          <div style="font-size: 12px; opacity: 0.8;">200 G</div>
        </button>
      </div>
      
      <button id="gambler-btn-leave" class="btn-core btn-modal-close" style="margin-top: 15px; width: 100%;">
        离开
      </button>
    </div>
    `;
  }

  /**
   * 初始化 DOM 元素引用
   */
  initDOMElements() {
    this.elements.overlay = document.getElementById('gambler-overlay');
    
    if (!this.elements.overlay) {
      const overlay = document.createElement('div');
      overlay.id = 'gambler-overlay';
      overlay.className = 'modal-overlay hidden';
      overlay.innerHTML = this.getHTML();
      document.body.appendChild(overlay);
      this.elements.overlay = overlay;
    }
    
    this.elements.messageText = document.getElementById('gambler-message');
    this.elements.reelContainer = document.getElementById('gambler-reel-container');
    this.elements.reelStrip = document.getElementById('gambler-reel-strip');
    this.elements.jackpotDisplay = document.getElementById('gambler-jackpot');
    this.elements.resultDisplay = document.getElementById('gambler-result');
    this.elements.standardBtn = document.getElementById('gambler-btn-standard');
    this.elements.highRollerBtn = document.getElementById('gambler-btn-high-roller');
    this.elements.leaveBtn = document.getElementById('gambler-btn-leave');
  }

  /**
   * 设置事件监听器
   */
  setupEventListeners() {
    if (!this.elements.overlay) return;
    if (this.elements.overlay._listenersInitialized) return;
    this.elements.overlay._listenersInitialized = true;

    // 关闭逻辑
    const closeAction = () => { if (!this.isSpinning) this.close(); };
    
    const closeBtn = this.elements.overlay.querySelector('.gambler-close-btn, .btn-gambler-close');
    if (closeBtn) closeBtn.addEventListener('click', closeAction);

    this.elements.overlay.addEventListener('click', (e) => {
      if (e.target === this.elements.overlay) closeAction();
    });

    if (this.elements.leaveBtn) {
      this.elements.leaveBtn.addEventListener('click', closeAction);
    }

    // 旋转逻辑
    if (this.elements.standardBtn) {
      this.elements.standardBtn.addEventListener('click', () => this.spin('STANDARD'));
    }
    if (this.elements.highRollerBtn) {
      this.elements.highRollerBtn.addEventListener('click', () => this.spin('HIGH_ROLLER'));
    }
  }

  /**
   * 打开赌博界面
   */
  open() {
    if (!this.elements.overlay) this.initDOMElements();

    if (this.elements.overlay) {
      const game = window.game;
      if (game) {
        game.isPaused = true;
        game.inputStack = [];
        this.player = game.player;
        
        // 初始化 Jackpot 和 Pity 数据 (如果不存在)
        if (!this.player.stats.gamblerJackpotPool) {
          this.player.stats.gamblerJackpotPool = GAMBLER_CONFIG.JACKPOT.BASE_POOL;
        }
        if (typeof this.player.stats.gamblerPityCount === 'undefined') {
          this.player.stats.gamblerPityCount = 0;
        }
      }

      this.elements.overlay.classList.remove('hidden');
      this.elements.overlay.style.setProperty('display', 'flex', 'important');
      this.isOpen = true;
      this.isSpinning = false;
      this.spinStage = 0;

      // 重置滚轮位置
      if (this.elements.reelStrip) {
        this.elements.reelStrip.style.transition = 'none';
        this.elements.reelStrip.style.transform = 'translateX(0)';
        this.renderPlaceholderReel();
      }
      if (this.elements.resultDisplay) {
        this.elements.resultDisplay.classList.add('hidden');
      }

      this.render();
      console.log('✓ GamblerUI 已打开');
    }
  }

  close() {
    if (this.elements.overlay) {
      this.elements.overlay.classList.add('hidden');
      this.elements.overlay.classList.remove('overlay-fade-in');
      this.elements.overlay.style.setProperty('display', 'none', 'important');
      this.isOpen = false;

      const game = window.game;
      if (game) game.isPaused = false;
    }
  }

  render() {
    this.updateButtonStates();
    this.updateMessage();
    this.updatePriceDisplay();
    this.updateJackpotDisplay();
  }

  updateJackpotDisplay() {
    if (this.elements.jackpotDisplay && this.player) {
      const pool = Math.floor(this.player.stats.gamblerJackpotPool || 0);
      this.elements.jackpotDisplay.textContent = `${pool.toLocaleString()} G`;
    }
  }

  updateMessage() {
    if (this.elements.messageText) {
      if (this.spinStage === 0) {
        const pity = this.player?.stats?.gamblerPityCount || 0;
        if (pity > 5) {
          this.elements.messageText.textContent = '我感觉到你的运气正在积聚...';
          this.elements.messageText.style.color = '#ff6600';
        } else {
          this.elements.messageText.textContent = '手气不错，陌生人？老虎机知道你的命运...';
          this.elements.messageText.style.color = '#ffcc00';
        }
      } else if (this.spinStage === 1) {
        this.elements.messageText.textContent = '祝你好运...';
      }
    }
  }

  updatePriceDisplay() {
    if (this.elements.standardBtn) {
      const btn = this.elements.standardBtn;
      // 保持按钮内部 HTML 结构
      const costDiv = btn.querySelector('div:last-child');
      if (costDiv) costDiv.textContent = `${GAMBLE_TIERS.STANDARD.cost} G`;
    }
    if (this.elements.highRollerBtn) {
      const btn = this.elements.highRollerBtn;
      const costDiv = btn.querySelector('div:last-child');
      if (costDiv) costDiv.textContent = `${GAMBLE_TIERS.HIGH_ROLLER.cost} G`;
    }
  }

  updateButtonStates() {
    if (!this.player) return;
    const playerGold = this.player.stats.gold ?? 0;

    const updateBtn = (btn, cost) => {
      if (btn) {
        const canAfford = playerGold >= cost;
        btn.disabled = !canAfford || this.isSpinning;
        btn.style.opacity = (canAfford && !this.isSpinning) ? '1' : '0.5';
        btn.style.cursor = (canAfford && !this.isSpinning) ? 'pointer' : 'not-allowed';
      }
    };

    updateBtn(this.elements.standardBtn, GAMBLE_TIERS.STANDARD.cost);
    updateBtn(this.elements.highRollerBtn, GAMBLE_TIERS.HIGH_ROLLER.cost);
    if (this.elements.leaveBtn) {
      this.elements.leaveBtn.disabled = this.isSpinning;
      this.elements.leaveBtn.style.opacity = this.isSpinning ? '0.5' : '1';
    }
  }

  /**
   * 渲染占位符滚轮 (初始状态)
   */
  renderPlaceholderReel() {
    if (!this.elements.reelStrip) return;
    this.elements.reelStrip.innerHTML = '';
    // 填充一些随机初始图标
    for (let i = 0; i < 5; i++) {
      const el = document.createElement('div');
      el.className = 'gambler-item-card quality-COMMON';
      el.textContent = ['⚔️', '🛡️', '💍', '💊', '💰'][i % 5];
      this.elements.reelStrip.appendChild(el);
    }
  }

  /**
   * 执行旋转
   */
  async spin(tierKey) {
    if (this.isSpinning) return;
    if (!this.player) return;

    const tier = GAMBLE_TIERS[tierKey];
    if (this.player.stats.gold < tier.cost) return;

    // 1. 扣费 & Jackpot 贡献
    this.player.stats.gold -= tier.cost;
    const contrib = Math.floor(tier.cost * GAMBLER_CONFIG.JACKPOT.CONTRIBUTION_RATE);
    this.player.stats.gamblerJackpotPool += contrib;
    
    // 更新 UI
    const game = window.game;
    if (game.ui && game.ui.updateStats) game.ui.updateStats(this.player);
    this.render();

    // 2. 锁定状态
    this.isSpinning = true;
    this.spinStage = 1;
    this.updateMessage();
    if (this.elements.resultDisplay) this.elements.resultDisplay.classList.add('hidden');

    // 3. 播放音效
    if (game.audio) game.audio.playBookFlip(); // 暂用翻书声模拟启动

    // 4. 决定结果 (后端逻辑)
    const reward = this.determineReward(tier);

    // 5. 执行视觉动画 (前端展示)
    await this.performReelAnimation(reward);

    // 6. 显示结果 & 发放奖励
    await this.showResult(reward);

    // 7. 解锁
    this.isSpinning = false;
    this.spinStage = 0;
    this.render();
  }

  /**
   * 决定奖励内容 (包含保底和 Jackpot 逻辑)
   */
  determineReward(tier) {
    // 1. 检查 Jackpot (极低概率)
    if (Math.random() < GAMBLER_CONFIG.JACKPOT.CHANCE) {
      return {
        type: 'jackpot',
        name: 'JACKPOT!',
        nameEn: 'JACKPOT!',
        quality: 'JACKPOT',
        value: Math.floor(this.player.stats.gamblerJackpotPool)
      };
    }

    // 2. 检查保底 (Pity System)
    const pityThreshold = tier.id === 'HIGH_ROLLER' 
      ? GAMBLER_CONFIG.PITY.THRESHOLD_HIGH_ROLLER 
      : GAMBLER_CONFIG.PITY.THRESHOLD_STANDARD;
    
    let chances = { ...tier.chances };
    
    if (this.player.stats.gamblerPityCount >= pityThreshold) {
      console.log('Gambler Pity Triggered!');
      // 应用保底权重：移除垃圾，大幅提升稀有度
      chances = GAMBLER_CONFIG.PITY.WEIGHT_MODIFIER;
    }

    // 3. 滚动品质
    const quality = this.rollQuality(chances);

    // 4. 更新保底计数
    if (quality === 'COMMON') {
      this.player.stats.gamblerPityCount++;
    } else {
      // 获得优秀以上，重置保底
      this.player.stats.gamblerPityCount = 0;
    }

    // 5. 根据品质生成具体物品
    return this.generateItemByQuality(quality, tier);
  }

  generateItemByQuality(quality, tier) {
    const floor = this.player.stats.floor || 1;
    
    // 如果是 COMMON，50% 概率是垃圾
    if (quality === 'COMMON' && Math.random() < 0.5) {
      return {
        type: 'trash',
        name: '幸运石',
        nameEn: 'Lucky Rock',
        quality: 'COMMON',
        value: 1,
        icon: '🪨'
      };
    }

    // 决定物品类型 (Equipment / Consumable / Buff / Soul Crystal)
    // 根据配置权重随机
    const typeRoll = Math.random() * 100;
    let currentWeight = 0;
    let selectedType = 'EQUIPMENT';
    
    for (const [type, weight] of Object.entries(GAMBLER_CONFIG.REWARD_WEIGHTS)) {
      currentWeight += weight;
      if (typeRoll < currentWeight) {
        selectedType = type;
        break;
      }
    }

    // 特殊限制：Soul Crystal 只能在 RARE 以上出现
    if (selectedType === 'SOUL_CRYSTAL' && ['COMMON', 'UNCOMMON'].includes(quality)) {
      selectedType = 'CONSUMABLE'; // 降级
    }

    switch (selectedType) {
      case 'SOUL_CRYSTAL':
        const amount = quality === 'LEGENDARY' ? 50 : (quality === 'EPIC' ? 20 : 5);
        return {
          type: 'soul_crystal',
          name: `${amount} 灵魂水晶`,
          quality: quality,
          value: amount,
          icon: '💎'
        };

      case 'BUFF':
        const buff = BUFF_POOL[Math.floor(Math.random() * BUFF_POOL.length)];
        return {
          type: 'buff',
          name: `Buff: ${buff.name}`,
          quality: quality,
          data: buff,
          icon: '⚡'
        };

      case 'CONSUMABLE':
        const cons = getRandomConsumable();
        if (cons) return {
          type: 'consumable',
          itemId: cons.id,
          name: cons.nameZh || cons.name,
          quality: quality,
          data: cons,
          icon: '💊'
        };
        // Fallthrough if null

      case 'EQUIPMENT':
      default:
        const equip = getEquipmentDropForFloor(floor);
        if (equip) {
          // 根据装备类型分配图标
          let icon = '⚔️';
          if (equip.type === 'ARMOR') icon = '🛡️';
          if (equip.type === 'ACCESSORY') icon = '💍';
          
          return {
            type: 'equipment',
            itemId: equip.id,
            name: equip.nameZh || equip.name,
            quality: quality,
            data: equip,
            icon: icon
          };
        }
        // Fallback to gold
        const gold = Math.floor(10 + Math.random() * 50);
        return {
          type: 'gold',
          name: `${gold} 金币`,
          quality: quality,
          value: gold,
          icon: '💰'
        };
    }
  }

  rollQuality(chances) {
    const total = Object.values(chances).reduce((sum, c) => sum + c, 0);
    if (total === 0) return 'COMMON';
    
    let roll = Math.random() * total;
    for (const [q, c] of Object.entries(chances)) {
      roll -= c;
      if (roll <= 0) return q;
    }
    return 'COMMON';
  }

  /**
   * 执行横向滚动动画 (CS:GO Style)
   */
  async performReelAnimation(finalReward) {
    const strip = this.elements.reelStrip;
    const container = this.elements.reelContainer;
    if (!strip || !container) return;

    // 1. 生成滚动序列 (例如 50 个物品，第 45 个是结果)
    const totalItems = 50;
    const winnerIndex = 45;
    const items = [];

    // 生成随机填充项
    for (let i = 0; i < totalItems; i++) {
      if (i === winnerIndex) {
        items.push(finalReward);
      } else {
        // 随机生成一些假数据用于展示
        const randomQ = Math.random() < 0.8 ? 'COMMON' : (Math.random() < 0.9 ? 'UNCOMMON' : 'RARE');
        items.push({
          icon: ['⚔️', '🛡️', '💍', '💊', '💰', '🪨'][Math.floor(Math.random() * 6)],
          quality: randomQ
        });
      }
    }

    // 2. 渲染 DOM
    strip.innerHTML = '';
    items.forEach(item => {
      const el = document.createElement('div');
      el.className = `gambler-item-card quality-${item.quality}`;
      el.textContent = item.icon;
      strip.appendChild(el);
    });

    // 3. 计算位移
    // 每个卡片宽 90px + 10px margin = 100px
    // 容器宽 ~490px，中心在 245px
    // 目标卡片中心应在 245px
    // 目标卡片左边缘 = winnerIndex * 100 + 5
    // 目标卡片中心 = winnerIndex * 100 + 50
    // 需要移动距离 = 目标中心 - 容器中心
    const cardWidth = 100; // 90 + 10
    const containerWidth = container.offsetWidth;
    const targetOffset = (winnerIndex * cardWidth) + (cardWidth / 2) - (containerWidth / 2);
    
    // 增加一点随机偏移，模拟指针停在卡片的不同位置
    const randomOffset = (Math.random() - 0.5) * 40; // ±20px
    const finalTransform = -(targetOffset + randomOffset);

    // 4. 执行动画
    // 先重置位置
    strip.style.transition = 'none';
    strip.style.transform = 'translateX(0)';
    
    // 强制重排
    void strip.offsetWidth;

    // 开始滚动
    // 使用 cubic-bezier 模拟物理减速
    const duration = 4000; // 4秒
    strip.style.transition = `transform ${duration}ms cubic-bezier(0.1, 0.9, 0.3, 1)`;
    strip.style.transform = `translateX(${finalTransform}px)`;

    // 5. 等待动画结束
    await this.sleep(duration);
    
    // 播放"叮"的一声
    const game = window.game;
    if (game && game.audio) game.audio.playCoinDrop(); // 或其他提示音
  }

  /**
   * 显示结果并发放奖励
   */
  async showResult(reward) {
    const game = window.game;

    // 1. 播放音效
    if (game && game.audio) {
      if (reward.quality === 'JACKPOT') {
        game.audio.playLevelUp(); // 暂用升级音效代替大奖音效
      } else if (['RARE', 'EPIC', 'LEGENDARY'].includes(reward.quality)) {
        game.audio.playCrit({ volume: 0.6 });
      } else if (reward.type === 'trash') {
        game.audio.playCloth({ volume: 0.5 });
      } else {
        game.audio.playCoins({ forceCategory: 'ui' });
      }
    }

    // 2. 显示文本
    if (this.elements.resultDisplay) {
      const color = reward.quality === 'JACKPOT' ? '#ff0000' : (ITEM_QUALITY[reward.quality]?.color || '#fff');
      this.elements.resultDisplay.classList.remove('hidden');
      this.elements.resultDisplay.style.color = color;
      
      let text = `获得：${reward.name}`;
      if (reward.quality === 'JACKPOT') text = `🎉 JACKPOT! 赢得 ${reward.value} 金币! 🎉`;
      this.elements.resultDisplay.textContent = text;
      
      // 添加震动动画
      if (['EPIC', 'LEGENDARY', 'JACKPOT'].includes(reward.quality)) {
        this.elements.resultDisplay.style.animation = 'pulse 0.2s infinite';
        setTimeout(() => this.elements.resultDisplay.style.animation = '', 1000);
      }
    }

    // 3. 应用奖励
    this.applyReward(reward);

    // 4. 成就检测
    if (game.achievementSystem) {
      if (reward.type === 'trash') {
        game.achievementSystem.check('onGamble', reward);
      } else {
        game.achievementSystem.resetConsecutiveTrashGambles();
      }
    }
    
    // 5. 记录日志
    if (game.ui && game.ui.logMessage) {
      game.ui.logMessage(`获得 [${reward.quality}] ${reward.name}！`, 'gain');
    }
  }

  applyReward(reward) {
    const game = window.game;
    if (!game || !game.player) return;

    switch (reward.type) {
      case 'jackpot':
        // 清空奖池给玩家
        game.player.stats.gold += reward.value;
        game.player.stats.gamblerJackpotPool = GAMBLER_CONFIG.JACKPOT.MIN_POOL;
        this.updateJackpotDisplay();
        break;

      case 'soul_crystal':
        if (game.metaSaveSystem) {
          game.metaSaveSystem.addSoulCrystals(reward.value);
        }
        break;

      case 'buff':
        // 简单实现：直接加属性，或者添加临时状态
        // 这里暂时直接永久加属性（简化版），或者应该加到 temporaryBuffs
        if (reward.data && reward.data.effect) {
           reward.data.effect(game.player, 5); // 稍微强力一点的效果
           game.ui.logMessage(`${reward.name} 生效！`, 'upgrade');
        }
        break;

      case 'gold':
      case 'trash': // 垃圾也给1金币
        game.player.stats.gold += (reward.value || 0);
        break;

      case 'consumable':
        if (reward.itemId) {
          const success = game.player.addToInventory(reward.itemId);
          if (!success && game.map) {
            game.map.addConsumableAt(reward.itemId, game.player.x, game.player.y);
          }
        }
        break;

      case 'equipment':
        if (reward.itemId && reward.data) {
          const qualityMultiplier = ITEM_QUALITY[reward.quality]?.multiplier || 1.0;
          const itemInstance = {
            itemId: reward.itemId,
            uid: `${reward.itemId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            quality: reward.quality,
            enhanceLevel: 0,
            stats: {},
            baseStats: reward.data.stats ? { ...reward.data.stats } : {},
            ...reward.data
          };
          
          if (itemInstance.baseStats) {
            for (const [stat, value] of Object.entries(itemInstance.baseStats)) {
              itemInstance.stats[stat] = Math.floor(value * qualityMultiplier);
            }
          }
          
          const success = game.player.addToInventory(itemInstance);
          if (!success && game.map) {
            game.map.addEquipAt(reward.itemId, game.player.x, game.player.y);
          }
        }
        break;
    }

    if (game.ui && game.ui.updateStats) game.ui.updateStats(game.player);
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  destroy() {
    this.close();
    this.player = null;
  }
}
