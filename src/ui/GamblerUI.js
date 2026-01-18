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
import { RUNE_POOL } from '../data/Runes.js';
import { ParticleSystem } from './ParticleSystem.js';
import { AnimationController } from './AnimationController.js';
import { HistoryTracker } from './HistoryTracker.js';
import { GamblerNPC } from './GamblerNPC.js';
import { AccessibilityManager } from './AccessibilityManager.js';

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
    
    // 防抖和错误处理
    this.lastSpinTime = 0;
    this.spinDebounceMs = 300; // 防止快速点击
    this.backgroundImageLoaded = false;
    this.backgroundImageError = false

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

    // 新系统
    this.particleSystem = null;
    this.animationController = null;
    this.historyTracker = new HistoryTracker(30); // 增加到30，可以显示3次十连的完整记录
    this.gamblerNPC = new GamblerNPC();
    this.accessibilityManager = null;

    // 成就追踪
    this.achievementTracking = {
      consecutiveRare: 0, // 连续史诗+次数
      totalPityTriggers: 0, // 总保底触发次数（从元存档加载）
      lastSpinWasHighRoller: false // 上次是否豪赌
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
    this.initSystems(); // 初始化新系统
    console.log('✓ GamblerUI 已初始化 (v3.0 Enhanced Animation)', this.style);
  }

  /**
   * 初始化新系统（粒子系统和动画控制器）
   */
  initSystems() {
    // 初始化粒子系统 - 使用slot-machine-container作为容器
    if (!this.particleSystem) {
      const container = document.getElementById('slot-machine-bg');
      if (container) {
        // 确保容器有正确的定位
        container.style.position = 'relative';
        this.particleSystem = new ParticleSystem(container);
      } else if (this.elements.overlay) {
        // 回退到overlay
        this.particleSystem = new ParticleSystem(this.elements.overlay);
      }
    }

    // 初始化动画控制器
    if (!this.animationController) {
      this.animationController = new AnimationController(this);
      // 设置粒子系统引用
      if (this.animationController.resultEffects) {
        this.animationController.resultEffects.particleSystem = this.particleSystem;
      }
    }

    // 初始化无障碍管理器
    if (!this.accessibilityManager) {
      this.accessibilityManager = new AccessibilityManager(this);
    }
  }

  /**
   * 注入自定义样式
   */
  injectStyles() {
    if (document.getElementById('gambler-ui-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'gambler-ui-styles';
    style.textContent = `
      .slot-machine-container {
        position: relative;
        box-shadow: 0 8px 32px rgba(0,0,0,0.6);
        border-radius: 12px;
        backdrop-filter: blur(5px);
        /* 回退渐变背景（如果图片加载失败） */
        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
        display: flex;
        flex-direction: column;
        overflow: visible;
        min-height: 700px;
      }
      
      .slot-machine-container.image-loaded {
        background-image: var(--slot-bg-image);
        background-size: contain;
        background-repeat: no-repeat;
        background-position: center center;
      }
      
      /* 奖品卡片样式（带品质边框） */
      .gambler-item-card {
        min-width: 90px;
        height: 90px;
        margin: 0 5px;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        background: transparent !important;
        border-radius: 6px;
        font-size: 32px;
        color: #fff;
        position: relative;
        box-sizing: border-box;
        transition: transform 0.2s ease, opacity 0.3s ease;
      }
      
      .gambler-item-card:hover {
        transform: scale(1.05);
      }
      
      @keyframes pulse {
        0%, 100% { 
          transform: scale(1.2); 
          filter: drop-shadow(0 0 10px currentColor);
        }
        50% { 
          transform: scale(1.4); 
          filter: drop-shadow(0 0 20px currentColor);
        }
      }

      /* 品质颜色 - 仅文字颜色，无边框 */
      .quality-COMMON { color: #a0a0a0; }
      .quality-UNCOMMON { color: #5eff00; }
      .quality-RARE { color: #0070dd; }
      .quality-EPIC { color: #a335ee; }
      .quality-LEGENDARY { color: #ff8000; }

      /* 历史记录容器滚动条隐藏 */
      #gambler-history-container::-webkit-scrollbar {
        width: 0;
        height: 0;
        display: none;
      }
      
      #gambler-history-container {
        scrollbar-width: none; /* Firefox */
        -ms-overflow-style: none; /* IE and Edge */
      }
      .quality-JACKPOT { color: #ff0000; }

      .jackpot-counter {
        font-family: 'Courier New', monospace;
        color: #ff4444;
        font-weight: bold;
        text-shadow: 0 0 5px #ff0000;
        font-size: 24px;
        margin-top: 5px;
      }
      
      .skip-hint {
        animation: pulse-hint 1.5s infinite;
      }
      
      @keyframes pulse-hint {
        0%, 100% { opacity: 0.6; transform: translateX(-50%) scale(1); }
        50% { opacity: 1; transform: translateX(-50%) scale(1.1); }
      }
      
      /* 粒子样式 */
      .particle {
        position: absolute;
        pointer-events: none;
      }
      
      /* 按钮点击反馈动画 */
      @keyframes buttonPress {
        0% { transform: scale(1); }
        50% { transform: scale(0.90); }
        100% { transform: scale(1); }
      }
      
      .button-press-animation {
        animation: buttonPress 0.9s ease-out;
      }
      
      /* 模式显示区域点击动画 */
      .mode-display-press {
        animation: buttonPress 0.2s ease-out;
      }
      
      /* 响应式布局 */
      @media (max-width: 768px) {
        .gambler-panel {
          width: 95% !important;
          max-width: 95% !important;
        }
        
        .slot-machine-container {
          padding: 30px 20px 20px 20px !important;
          min-height: 500px !important;
        }
        
        .modal-title-shop {
          font-size: 18px !important;
        }
        
        .gambler-item-card {
          min-width: 75px !important;
          height: 75px !important;
          font-size: 26px !important;
        }
        
        #gambler-result {
          font-size: 14px !important;
        }
        
        .jackpot-counter {
          font-size: 18px !important;
        }
        
        .btn-core {
          height: 36px !important;
          font-size: 11px !important;
        }
      }
      
      @media (max-width: 480px) {
        .gambler-panel {
          width: 98% !important;
        }
        
        .slot-machine-container {
          padding: 25px 15px 15px 15px !important;
          min-height: 470px !important;
          flex-direction: column !important;
        }
        
        .modal-title-shop {
          font-size: 16px !important;
        }
        
        .gambler-item-card {
          min-width: 65px !important;
          height: 65px !important;
          font-size: 22px !important;
        }
        
        #gambler-result {
          font-size: 13px !important;
        }
        
        .jackpot-counter {
          font-size: 16px !important;
        }
        
        .btn-core {
          font-size: 10px !important;
          height: 34px !important;
        }
      }
      
      @media (min-width: 1920px) {
        .gambler-panel {
          width: 900px !important;
        }
        
        .slot-machine-container {
          padding: 50px 50px 40px 50px !important;
          min-height: 650px !important;
        }
        
        .gambler-item-card {
          min-width: 110px !important;
          height: 110px !important;
          font-size: 38px !important;
        }
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
    <div class="gambler-panel" style="width: 900px; max-width: 95%; background: transparent; border: none; padding: 0;">
      <!-- 老虎机背景容器 -->
      <div class="slot-machine-container" id="slot-machine-bg" style="position: relative; background-size: contain; background-repeat: no-repeat; background-position: center center; padding: 0; min-height: 700px; display: block; overflow: visible;">
        
        <!-- 标题 -->
        <h2 class="modal-title-shop" style="position: absolute; left: 8px; top: 14px; width: 900px; text-align: center; text-shadow: 2px 2px 4px rgba(0,0,0,0.8); font-size: 22px; color: #ffd700; margin: 0;">赌徒的游戏</h2>
        
        <!-- Jackpot 显示 -->
        <div style="position: absolute; left: 155px; top: 140px; width: 620px; text-align: center;">
          <div style="color: #d4af37; font-size: 11px; font-weight: bold; text-shadow: 1px 1px 2px rgba(0,0,0,0.8);">累积奖池 JACKPOT</div>
          <div id="gambler-jackpot" class="jackpot-counter" style="font-size: 20px;">0 G</div>
        </div>
        
        <!-- 赌徒消息 -->
        <p id="gambler-message" style="position: absolute; left: -470px; top: 157px; width: 820px; font-size: 14px; color: #ffcc00; text-align: center; font-style: italic; text-shadow: 1px 1px 2px rgba(0,0,0,0.8); margin: 0;">
          试试手气吧...
        </p>
    
        <!-- 奖品显示区域（无框） -->
        <div id="gambler-reel-container" style="position: absolute; left: 297px; top: 234px; width: 350px; height: 150px; display: flex; align-items: center; justify-content: center; overflow: hidden;">
          <div id="gambler-reel-strip" style="display: flex; align-items: center; justify-content: center; gap: 10px; flex-wrap: nowrap; max-width: 100%;">
            <!-- JS 动态填充奖品图标 - 初始显示提示 -->
            <div style="width: 100%; text-align: center; color: #888; font-size: 14px; padding: 20px;">
              点击按钮开始旋转...
            </div>
          </div>
          <!-- 快速跳过提示 -->
          <div id="gambler-skip-hint" class="skip-hint hidden" style="position: absolute; bottom: -25px; left: 50%; transform: translateX(-50%); color: #ffcc00; font-size: 11px; text-shadow: 1px 1px 2px rgba(0,0,0,0.8);">
            点击跳过
          </div>
        </div>
        
        <!-- 结果显示区域（与"点击跳过"位置一致） -->
        <div id="gambler-result" class="hidden" style="position: absolute; left: 297px; top: 409px; width: 350px; font-size: 14px; text-align: center; font-weight: bold; text-shadow: 2px 2px 4px rgba(0,0,0,0.8);">
          获得：[物品名称]
        </div>
        
        <!-- 右侧信息区域（带背景图） -->
        <div style="position: absolute; left: 800px; top: 0px; width: 480px; height: 745px; background-image: url('https://i.postimg.cc/65XdSvXQ/dutukuang2.png'); background-size: contain; background-repeat: no-repeat; background-position: center; display: flex; flex-direction: column; justify-content: flex-start; align-items: center; padding-top: 150px; box-sizing: border-box;">
          <!-- 内容容器（保持原始大小） -->
          <div style="width: 180px; display: flex; flex-direction: column; padding: 15px 10px; box-sizing: border-box;">
            <!-- 保底进度条 -->
            <div style="background: transparent; padding: 8px 10px; border-radius: 6px; width: 100%; box-sizing: border-box; margin-bottom: 10px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                <div style="color: #5c4033; font-size: 11px; font-weight: bold;">保底进度</div>
                <div id="gambler-pity-count" style="color: #ff6600; font-size: 11px; font-weight: bold;">0/8</div>
              </div>
              <div style="width: 100%; height: 6px; background: rgba(0,0,0,0.5); border-radius: 3px; overflow: hidden;">
                <div id="gambler-pity-bar" style="height: 100%; background: linear-gradient(90deg, #ff6600, #ffaa00); width: 0%; transition: width 0.3s ease-out;"></div>
              </div>
              <div id="gambler-pity-hint" style="color: #888; font-size: 9px; margin-top: 2px; text-align: center; min-height: 10px;"></div>
            </div>
            
            <!-- 历史记录显示 -->
            <div id="gambler-history-container" style="background: transparent; padding: 8px 10px; border-radius: 6px; min-height: 150px; max-height: 350px; width: 100%; box-sizing: border-box; overflow-y: auto; overflow-x: hidden;">
              <div style="color: #5c4033; font-size: 11px; text-align: center; margin-bottom: 6px; font-weight: bold;">最近结果</div>
              <div id="gambler-history" style="min-height: 50px;"></div>
            </div>
          </div>
        </div>
        
        <!-- 抽奖模式选择器（往右移动并缩小） -->
        <div style="position: absolute; left: 540px; top: 433px; display: flex; align-items: center; justify-content: center; gap: 8px;">
          <!-- 左箭头 -->
          <button id="gambler-mode-prev" style="background: transparent; border: none; color: #ffd700; font-size: 18px; cursor: pointer; padding: 0; line-height: 1; width: 25px; height: 25px; display: flex; align-items: center; justify-content: center;">
            ◀
          </button>
          
          <!-- 中间文本区域（可点击） -->
          <div id="gambler-mode-display" style="text-align: center; cursor: pointer; padding: 4px 8px;">
            <div id="gambler-mode-name" style="color: #ffd700; font-size: 16px; font-weight: bold; text-shadow: 2px 2px 4px rgba(0,0,0,0.8); margin-bottom: 4px; white-space: nowrap;">
              标准
            </div>
            <div id="gambler-mode-price" style="color: #ffcc00; font-size: 13px; text-shadow: 1px 1px 2px rgba(0,0,0,0.8); white-space: nowrap;">
              50G
            </div>
          </div>
          
          <!-- 右箭头 -->
          <button id="gambler-mode-next" style="background: transparent; border: none; color: #ffd700; font-size: 18px; cursor: pointer; padding: 0; line-height: 1; width: 25px; height: 25px; display: flex; align-items: center; justify-content: center;">
            ▶
          </button>
        </div>
        
        <!-- 离开按钮（仅文本） -->
        <button id="gambler-btn-leave" style="position: absolute; left: 225px; top: 570px; width: 499px; height: 38px; padding: 0; font-size: 14px; background: transparent; border: none; color: #95a5a6; font-weight: bold; text-shadow: 1px 1px 2px rgba(0,0,0,0.8); cursor: pointer;">
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
    
    // 将 messageText 元素传递给 GamblerNPC
    if (this.gamblerNPC && this.elements.messageText) {
      this.gamblerNPC.setMessageElement(this.elements.messageText);
      console.log('[GamblerUI] GamblerNPC 已绑定 messageText 元素');
    }
    
    this.elements.reelContainer = document.getElementById('gambler-reel-container');
    this.elements.reelStrip = document.getElementById('gambler-reel-strip');
    this.elements.jackpotDisplay = document.getElementById('gambler-jackpot');
    this.elements.resultDisplay = document.getElementById('gambler-result');
    this.elements.leaveBtn = document.getElementById('gambler-btn-leave');
    this.elements.skipHint = document.getElementById('gambler-skip-hint');
    this.elements.historyContainer = document.getElementById('gambler-history');
    this.elements.pityCount = document.getElementById('gambler-pity-count');
    this.elements.pityBar = document.getElementById('gambler-pity-bar');
    this.elements.pityHint = document.getElementById('gambler-pity-hint');
    
    // 新的模式选择器元素
    this.elements.modePrevBtn = document.getElementById('gambler-mode-prev');
    this.elements.modeNextBtn = document.getElementById('gambler-mode-next');
    this.elements.modeDisplay = document.getElementById('gambler-mode-display');
    this.elements.modeName = document.getElementById('gambler-mode-name');
    this.elements.modePrice = document.getElementById('gambler-mode-price');
    
    // 当前选择的模式
    this.currentMode = 0; // 0: 标准, 1: 10连, 2: 豪赌
    this.modes = [
      { name: '标准', tier: 'STANDARD', price: 50 },
      { name: '10连', tier: 'BATCH', price: 450 },
      { name: '豪赌', tier: 'HIGH_ROLLER', price: 200 }
    ];
  }

  /**
   * 设置事件监听器
   */
  setupEventListeners() {
    if (!this.elements.overlay) return;
    if (this.elements.overlay._listenersInitialized) return;
    this.elements.overlay._listenersInitialized = true;

    // 关闭逻辑
    const closeAction = () => { 
      if (!this.isSpinning) {
        // 触发离开按钮动画
        this.triggerButtonAnimation(this.elements.leaveBtn);
        this.close();
      }
    };
    
    const closeBtn = this.elements.overlay.querySelector('.gambler-close-btn, .btn-gambler-close');
    if (closeBtn) closeBtn.addEventListener('click', (e) => {
      this.triggerButtonAnimation(closeBtn);
      closeAction();
    });

    this.elements.overlay.addEventListener('click', (e) => {
      if (e.target === this.elements.overlay) closeAction();
    });

    if (this.elements.leaveBtn) {
      this.elements.leaveBtn.addEventListener('click', (e) => {
        this.triggerButtonAnimation(this.elements.leaveBtn);
        closeAction();
      });
    }

    // 模式切换逻辑
    if (this.elements.modePrevBtn) {
      this.elements.modePrevBtn.addEventListener('click', () => {
        this.triggerButtonAnimation(this.elements.modePrevBtn);
        this.switchMode(-1);
      });
    }
    if (this.elements.modeNextBtn) {
      this.elements.modeNextBtn.addEventListener('click', () => {
        this.triggerButtonAnimation(this.elements.modeNextBtn);
        this.switchMode(1);
      });
    }
    
    // 点击中间文本区域进行抽奖
    if (this.elements.modeDisplay) {
      this.elements.modeDisplay.addEventListener('click', () => {
        this.triggerButtonAnimation(this.elements.modeDisplay);
        this.confirmSpin();
      });
    }

    // 快速跳过逻辑（点击和滑动）
    if (this.elements.reelContainer) {
      // 点击跳过
      this.elements.reelContainer.addEventListener('click', () => {
        if (this.isSpinning && this.animationController) {
          this.animationController.requestSkip();
          if (this.elements.skipHint) {
            this.elements.skipHint.classList.add('hidden');
          }
        }
      });

      // 触摸滑动跳过
      let touchStartX = 0;
      let touchStartY = 0;
      let touchStartTime = 0;

      this.elements.reelContainer.addEventListener('touchstart', (e) => {
        if (!this.isSpinning) return;
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        touchStartTime = Date.now();
      }, { passive: true });

      this.elements.reelContainer.addEventListener('touchend', (e) => {
        if (!this.isSpinning || !this.animationController) return;
        
        const touchEndX = e.changedTouches[0].clientX;
        const touchEndY = e.changedTouches[0].clientY;
        const touchEndTime = Date.now();
        
        const deltaX = touchEndX - touchStartX;
        const deltaY = touchEndY - touchStartY;
        const deltaTime = touchEndTime - touchStartTime;
        
        // 检测快速滑动（任意方向，距离>50px，时间<300ms）
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        if (distance > 50 && deltaTime < 300) {
          this.animationController.requestSkip();
          if (this.elements.skipHint) {
            this.elements.skipHint.classList.add('hidden');
          }
        }
      }, { passive: true });
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
        
        // 验证和清理状态
        this.validateAndCleanState();
        
        // 加载成就追踪数据
        this.loadAchievementTracking();
      }

      this.elements.overlay.classList.remove('hidden');
      this.elements.overlay.classList.add('overlay-fade-in');
      this.elements.overlay.style.setProperty('display', 'flex', 'important');
      this.isOpen = true;
      this.isSpinning = false;
      this.spinStage = 0;

      // 加载背景图片（带错误处理）
      this.loadBackgroundImage();

      // 重置滚轮位置
      if (this.elements.reelStrip) {
        this.elements.reelStrip.style.transition = 'none';
        this.elements.reelStrip.style.transform = 'translateX(0)';
        this.renderPlaceholderReel();
      }
      if (this.elements.resultDisplay) {
        this.elements.resultDisplay.classList.add('hidden');
      }

      // 延迟显示 NPC 欢迎语，等待淡入动画完成
      setTimeout(() => {
        if (this.gamblerNPC && this.isOpen) {
          this.gamblerNPC.showWelcome();
        }
      }, 300); // 等待淡入动画完成

      this.render();
      this.renderHistory();
      console.log('✓ GamblerUI 已打开');
    }
  }

  /**
   * 加载成就追踪数据
   */
  loadAchievementTracking() {
    const game = window.game;
    if (game && game.metaSaveSystem) {
      // 从元存档加载总保底触发次数
      const stats = game.metaSaveSystem.achievementStats || {};
      this.achievementTracking.totalPityTriggers = stats.gamblerPityTriggers || 0;
    }
  }

  /**
   * 保存成就追踪数据
   */
  saveAchievementTracking() {
    const game = window.game;
    if (game && game.metaSaveSystem) {
      if (!game.metaSaveSystem.achievementStats) {
        game.metaSaveSystem.achievementStats = {};
      }
      game.metaSaveSystem.achievementStats.gamblerPityTriggers = this.achievementTracking.totalPityTriggers;
      game.metaSaveSystem.save();
    }
  }

  /**
   * 验证和清理玩家状态
   */
  validateAndCleanState() {
    if (!this.player || !this.player.stats) return;

    // 验证 Jackpot 池
    if (typeof this.player.stats.gamblerJackpotPool !== 'number' || 
        isNaN(this.player.stats.gamblerJackpotPool) ||
        this.player.stats.gamblerJackpotPool < 0) {
      console.warn('Invalid jackpot pool, resetting to base');
      this.player.stats.gamblerJackpotPool = GAMBLER_CONFIG.JACKPOT.BASE_POOL;
    }

    // 验证保底计数
    if (typeof this.player.stats.gamblerPityCount !== 'number' ||
        isNaN(this.player.stats.gamblerPityCount) ||
        this.player.stats.gamblerPityCount < 0) {
      console.warn('Invalid pity count, resetting to 0');
      this.player.stats.gamblerPityCount = 0;
    }

    // 限制保底计数上限
    if (this.player.stats.gamblerPityCount > 20) {
      console.warn('Pity count too high, capping at 20');
      this.player.stats.gamblerPityCount = 20;
    }
  }

  /**
   * 加载背景图片（带错误处理）
   */
  loadBackgroundImage() {
    const bgUrl = 'https://i.postimg.cc/XYVXxV9N/dutuji.png';
    const container = document.getElementById('slot-machine-bg');
    
    if (!container || this.backgroundImageLoaded) return;

    const img = new Image();
    img.onload = () => {
      container.style.setProperty('--slot-bg-image', `url('${bgUrl}')`);
      container.classList.add('image-loaded');
      this.backgroundImageLoaded = true;
      console.log('✓ 背景图片加载成功');
    };
    img.onerror = () => {
      console.warn('背景图片加载失败，使用回退渐变');
      this.backgroundImageError = true;
      // 容器已经有回退渐变，无需额外操作
    };
    img.src = bgUrl;
  }

  /**
   * 渲染历史记录
   */
  renderHistory() {
    if (this.elements.historyContainer && this.historyTracker) {
      this.historyTracker.renderHistory(this.elements.historyContainer);
    }
  }

  close() {
    if (this.elements.overlay) {
      // 先移除淡入类，添加淡出动画
      this.elements.overlay.classList.remove('overlay-fade-in');
      this.elements.overlay.style.transition = 'opacity 300ms ease-out';
      this.elements.overlay.style.opacity = '0';

      // 清理 NPC（立即停止催促，但不影响淡出动画）
      if (this.gamblerNPC) {
        this.gamblerNPC.stopUrging();
        this.gamblerNPC.hide();
        this.gamblerNPC.resetWelcome();
      }

      // 等待淡出动画完成后再隐藏
      setTimeout(() => {
        this.elements.overlay.classList.add('hidden');
        this.elements.overlay.style.setProperty('display', 'none', 'important');
        this.elements.overlay.style.opacity = '1'; // 重置透明度供下次使用
        this.isOpen = false;

        // 清理粒子系统
        if (this.particleSystem) {
          this.particleSystem.clear();
        }

        // 清理动画控制器
        if (this.animationController) {
          this.animationController.cleanup();
        }

        // 重置状态
        this.isSpinning = false;
        this.spinStage = 0;
        this.lastSpinTime = 0;

        // 清理滚轮
        if (this.elements.reelStrip) {
          this.elements.reelStrip.style.transition = 'none';
          this.elements.reelStrip.style.transform = 'translateX(0)';
          this.elements.reelStrip.style.filter = 'none';
        }

        const game = window.game;
        if (game) game.isPaused = false;
        
        console.log('✓ GamblerUI 已关闭并清理资源');
      }, 300); // 等待淡出动画完成
    }
  }

  /**
   * 切换抽奖模式
   */
  switchMode(direction) {
    this.currentMode = (this.currentMode + direction + this.modes.length) % this.modes.length;
    this.updateModeDisplay();
    this.updateButtonStates();
  }

  /**
   * 更新模式显示
   */
  updateModeDisplay() {
    const mode = this.modes[this.currentMode];
    if (this.elements.modeName) {
      this.elements.modeName.textContent = mode.name;
    }
    if (this.elements.modePrice) {
      this.elements.modePrice.textContent = `${mode.price}G`;
    }
  }

  /**
   * 触发按钮点击动画
   * @param {HTMLElement} element - 要添加动画的元素
   */
  triggerButtonAnimation(element) {
    if (!element) return;
    
    // 移除旧的动画类（如果存在）
    element.classList.remove('button-press-animation');
    
    // 强制重排以重启动画
    void element.offsetWidth;
    
    // 添加动画类
    element.classList.add('button-press-animation');
    
    // 动画结束后移除类
    setTimeout(() => {
      element.classList.remove('button-press-animation');
    }, 200);
  }

  /**
   * 确认抽奖
   */
  confirmSpin() {
    if (this.isSpinning) return;
    if (!this.player) return;
    
    const mode = this.modes[this.currentMode];
    const playerGold = this.player.stats.gold ?? 0;
    
    // 检查是否有足够金币
    if (playerGold < mode.price) {
      console.log('金币不足');
      return;
    }
    
    if (mode.tier === 'BATCH') {
      this.batchSpin();
    } else {
      this.spin(mode.tier);
    }
  }

  render() {
    this.updateButtonStates();
    this.updateMessage();
    this.updateModeDisplay();
    this.updateJackpotDisplay();
    this.updatePityDisplay();
  }

  /**
   * 更新保底显示
   */
  updatePityDisplay() {
    if (!this.player) return;

    const pityCount = this.player.stats.gamblerPityCount || 0;
    const pityThreshold = 8; // 标准保底阈值
    
    // 更新计数
    if (this.elements.pityCount) {
      this.elements.pityCount.textContent = `${pityCount}/${pityThreshold}`;
      
      // 接近保底时变色
      if (pityCount >= 6) {
        this.elements.pityCount.style.color = '#ff3300';
        this.elements.pityCount.style.animation = 'pulse-hint 1s infinite';
      } else if (pityCount >= 4) {
        this.elements.pityCount.style.color = '#ff6600';
        this.elements.pityCount.style.animation = 'none';
      } else {
        this.elements.pityCount.style.color = '#ffaa00';
        this.elements.pityCount.style.animation = 'none';
      }
    }

    // 更新进度条
    if (this.elements.pityBar) {
      const progress = Math.min((pityCount / pityThreshold) * 100, 100);
      this.elements.pityBar.style.width = `${progress}%`;
      
      // 接近保底时改变颜色
      if (pityCount >= 6) {
        this.elements.pityBar.style.background = 'linear-gradient(90deg, #ff0000, #ff6600)';
      } else {
        this.elements.pityBar.style.background = 'linear-gradient(90deg, #ff6600, #ffaa00)';
      }
    }

    // 更新提示文本
    if (this.elements.pityHint) {
      if (pityCount >= pityThreshold) {
        this.elements.pityHint.textContent = '保底已触发！下次必出好货！';
        this.elements.pityHint.style.color = '#ff3300';
      } else if (pityCount >= 6) {
        this.elements.pityHint.textContent = `还差 ${pityThreshold - pityCount} 次触发保底`;
        this.elements.pityHint.style.color = '#ff6600';
      } else if (pityCount >= 3) {
        this.elements.pityHint.textContent = '运气正在积累...';
        this.elements.pityHint.style.color = '#888';
      } else {
        this.elements.pityHint.textContent = '';
      }
    }
  }

  updateJackpotDisplay() {
    if (this.elements.jackpotDisplay && this.player) {
      const pool = Math.floor(this.player.stats.gamblerJackpotPool || 0);
      this.elements.jackpotDisplay.textContent = `${pool.toLocaleString()} G`;
    }
  }

  /**
   * 显示"抽取完毕"浮现文字
   */
  showCompletionMessage() {
    // 添加动画样式（如果还没有）
    if (!document.getElementById('gambler-completion-animation')) {
      const style = document.createElement('style');
      style.id = 'gambler-completion-animation';
      style.textContent = `
        @keyframes gamblerFadeInOut {
          0% { opacity: 0; transform: translate(-50%, 0); }
          20% { opacity: 1; transform: translate(-50%, -10px); }
          80% { opacity: 1; transform: translate(-50%, -10px); }
          100% { opacity: 0; transform: translate(-50%, -20px); }
        }
        .gambler-completion-msg {
          position: absolute !important;
          left: 52% !important;
          top: 190px !important;
          transform: translate(-50%, 0) !important;
          color: #ffd700 !important;
          font-size: 18px !important;
          font-weight: bold !important;
          text-shadow: 2px 2px 4px rgba(0,0,0,0.8) !important;
          pointer-events: none !important;
          z-index: 10000 !important;
          animation: gamblerFadeInOut 2s ease-in-out !important;
          white-space: nowrap !important;
        }
      `;
      document.head.appendChild(style);
    }

    // 创建浮现文字元素
    const completionMsg = document.createElement('div');
    completionMsg.className = 'gambler-completion-msg';
    completionMsg.textContent = '抽取完毕';

    // 添加到 slot-machine-container 内部
    const container = document.getElementById('slot-machine-bg');
    if (container) {
      container.appendChild(completionMsg);
      
      console.log('[GamblerUI] 显示完成消息');
      
      // 2秒后移除
      setTimeout(() => {
        if (completionMsg && completionMsg.parentNode) {
          completionMsg.parentNode.removeChild(completionMsg);
          console.log('[GamblerUI] 移除完成消息');
        }
      }, 2000);
    } else {
      console.warn('[GamblerUI] slot-machine-bg 元素不存在，无法显示完成消息');
    }
  }

  updateMessage() {
    // 消息现在由 GamblerNPC 系统控制，不在这里更新
    // 保留此方法以防其他地方调用
  }

  updateButtonStates() {
    if (!this.player) return;
    const playerGold = this.player.stats.gold ?? 0;

    // 更新模式显示区域状态
    const mode = this.modes[this.currentMode];
    const canAfford = playerGold >= mode.price;
    
    if (this.elements.modeDisplay) {
      this.elements.modeDisplay.style.opacity = (canAfford && !this.isSpinning) ? '1' : '0.5';
      this.elements.modeDisplay.style.cursor = (canAfford && !this.isSpinning) ? 'pointer' : 'not-allowed';
    }
    
    // 更新箭头按钮状态
    if (this.elements.modePrevBtn) {
      this.elements.modePrevBtn.disabled = this.isSpinning;
      this.elements.modePrevBtn.style.opacity = this.isSpinning ? '0.5' : '1';
      this.elements.modePrevBtn.style.cursor = this.isSpinning ? 'not-allowed' : 'pointer';
    }
    if (this.elements.modeNextBtn) {
      this.elements.modeNextBtn.disabled = this.isSpinning;
      this.elements.modeNextBtn.style.opacity = this.isSpinning ? '0.5' : '1';
      this.elements.modeNextBtn.style.cursor = this.isSpinning ? 'not-allowed' : 'pointer';
    }
    
    // 更新离开按钮
    if (this.elements.leaveBtn) {
      this.elements.leaveBtn.disabled = this.isSpinning;
      this.elements.leaveBtn.style.opacity = this.isSpinning ? '0.5' : '1';
      this.elements.leaveBtn.style.cursor = this.isSpinning ? 'not-allowed' : 'pointer';
    }
  }

  /**
   * 渲染占位符滚轮 (初始状态)
   */
  renderPlaceholderReel() {
    if (!this.elements.reelStrip) return;
    this.elements.reelStrip.innerHTML = '';
    // 显示提示文字
    const placeholder = document.createElement('div');
    placeholder.style.cssText = 'width: 100%; text-align: center; color: #888; font-size: 14px; padding: 20px;';
    placeholder.textContent = '点击按钮开始旋转...';
    this.elements.reelStrip.appendChild(placeholder);
  }

  /**
   * 执行旋转
   */
  async spin(tierKey) {
    if (this.isSpinning) return;
    if (!this.player) return;

    // 停止催促系统
    if (this.gamblerNPC) {
      this.gamblerNPC.stopUrging();
    }

    // 防抖检查
    const now = Date.now();
    if (now - this.lastSpinTime < this.spinDebounceMs) {
      console.log('Spin debounced - too fast');
      return;
    }
    this.lastSpinTime = now;

    const tier = GAMBLE_TIERS[tierKey];
    if (this.player.stats.gold < tier.cost) return;

    // 成就检测：破产边缘（金币<100时赌博）
    const game = window.game;
    if (this.player.stats.gold < 100 && game.achievementSystem) {
      game.achievementSystem.unlockAchievement('ACH_BROKE_GAMBLER');
    }

    // 记录是否豪赌
    this.achievementTracking.lastSpinWasHighRoller = (tierKey === 'HIGH_ROLLER');

    // 1. 扣费 & Jackpot 贡献
    this.player.stats.gold -= tier.cost;
    const contrib = Math.floor(tier.cost * GAMBLER_CONFIG.JACKPOT.CONTRIBUTION_RATE);
    this.player.stats.gamblerJackpotPool += contrib;
    
    // 更新 UI
    if (game.ui && game.ui.updateStats) game.ui.updateStats(this.player);
    this.render();

    // 2. 锁定状态
    this.isSpinning = true;
    this.spinStage = 1;
    
    // 显示等待语
    if (this.gamblerNPC) {
      this.gamblerNPC.showSpinning();
    }
    
    if (this.elements.resultDisplay) this.elements.resultDisplay.classList.add('hidden');
    
    // 显示跳过提示
    if (this.elements.skipHint) {
      this.elements.skipHint.classList.remove('hidden');
    }

    // 3. 播放音效（带错误处理）
    try {
      if (game.audio) game.audio.playBookFlip();
    } catch (error) {
      console.warn('Audio playback failed:', error);
    }

    // 4. 决定结果 (后端逻辑)
    const reward = this.determineReward(tier);

    // 5. 执行视觉动画 (前端展示) - 带错误处理
    let actualReward = reward; // 默认使用预设奖励
    try {
      const animationResult = await this.performReelAnimation(reward);
      // 如果动画返回了实际奖励，使用它；否则使用预设奖励
      if (animationResult) {
        actualReward = animationResult;
      }
    } catch (error) {
      console.error('Animation failed, showing result immediately:', error);
      // 回退：立即显示结果，使用预设奖励
    }

    // 隐藏跳过提示
    if (this.elements.skipHint) {
      this.elements.skipHint.classList.add('hidden');
    }

    // 6. 显示结果 & 发放奖励（使用实际获得的物品）
    await this.showResult(actualReward);

    // 7. 成就检测（使用实际获得的物品）
    this.checkAchievements(actualReward);

    // 8. 解锁
    this.isSpinning = false;
    this.spinStage = 0;
    this.render();
  }

  /**
   * 批量抽取（10连抽）
   */
  async batchSpin() {
    if (this.isSpinning) return;
    if (!this.player) return;

    // 停止催促系统
    if (this.gamblerNPC) {
      this.gamblerNPC.stopUrging();
    }

    const batchCost = 450;
    const batchCount = 10;

    if (this.player.stats.gold < batchCost) return;

    // 扣费
    this.player.stats.gold -= batchCost;
    const game = window.game;
    if (game.ui && game.ui.updateStats) game.ui.updateStats(this.player);

    // 锁定状态
    this.isSpinning = true;
    this.spinStage = 1;
    
    // 显示等待语
    if (this.gamblerNPC) {
      this.gamblerNPC.showSpinning();
    }

    // 存储所有结果
    const results = [];

    // 执行 10 次抽取
    for (let i = 0; i < batchCount; i++) {
      const tier = GAMBLE_TIERS.STANDARD;
      
      // 更新进度提示
      if (this.gamblerNPC && this.gamblerNPC.messageElement) {
        this.gamblerNPC.messageElement.textContent = `正在抽取... (${i + 1}/10)`;
      }
      
      // Jackpot 贡献
      const contrib = Math.floor((batchCost / batchCount) * GAMBLER_CONFIG.JACKPOT.CONTRIBUTION_RATE);
      this.player.stats.gamblerJackpotPool += contrib;

      // 决定结果
      const reward = this.determineReward(tier);
      results.push(reward);

      // 如果是稀有以上，暂停展示
      if (['EPIC', 'LEGENDARY', 'JACKPOT'].includes(reward.quality)) {
        // 快速动画，获取实际奖励
        const actualReward = await this.performReelAnimation(reward);
        const finalReward = actualReward || reward;
        
        // 更新results数组中的奖励
        results[i] = finalReward;
        
        // 显示结果但不启动催促（十连抽中）
        await this.showResultWithoutUrge(finalReward);
        
        // 添加到历史记录
        const totalItems = 50;
        const winnerIndex = 45;
        const items = [];
        for (let j = 0; j < totalItems; j++) {
          if (j === winnerIndex) {
            items.push(finalReward);
          } else {
            const randomQ = Math.random() < 0.8 ? 'COMMON' : 'UNCOMMON';
            items.push({ icon: '?', quality: randomQ });
          }
        }
        const nearMissResult = this.historyTracker.detectNearMiss(winnerIndex, items);
        this.historyTracker.addResult(finalReward, nearMissResult.isNearMiss, nearMissResult.missedItem?.quality);
        
        await this.sleep(800); // 短暂暂停
      } else {
        // 直接应用奖励，不显示动画
        this.applyReward(reward);
        
        // 添加到历史
        const totalItems = 50;
        const winnerIndex = 45;
        const items = [];
        for (let j = 0; j < totalItems; j++) {
          if (j === winnerIndex) {
            items.push(reward);
          } else {
            const randomQ = Math.random() < 0.8 ? 'COMMON' : 'UNCOMMON';
            items.push({ icon: '?', quality: randomQ });
          }
        }
        const nearMissResult = this.historyTracker.detectNearMiss(winnerIndex, items);
        this.historyTracker.addResult(reward, nearMissResult.isNearMiss, nearMissResult.missedItem?.quality);
      }
      
      // 短暂延迟，让玩家感受到抽取过程
      await this.sleep(100);
    }

    // 解锁状态（在更新显示之前）
    this.isSpinning = false;
    this.spinStage = 0;

    // 显示汇总
    this.showBatchSummary(results);

    // 更新显示（在状态解锁之后）
    this.render();
    this.renderHistory();
    
    console.log('[GamblerUI] 十连抽完成，状态已解锁');
  }

  /**
   * 显示批量抽取汇总
   * @param {Array} results - 结果数组
   */
  showBatchSummary(results) {
    // 统计各品质数量
    const stats = {};
    results.forEach(r => {
      stats[r.quality] = (stats[r.quality] || 0) + 1;
    });

    // 在累计奖池下方显示"抽取完毕"文字
    this.showCompletionMessage();

    // NPC 评论
    const hasLegendary = stats.LEGENDARY || stats.JACKPOT;
    const hasEpic = stats.EPIC;

    // NPC 对话 - 使用 showJudgement 方法，保持一致性
    if (this.gamblerNPC) {
      // 构建一个虚拟的上下文，用于生成评判语
      let quality = 'COMMON';
      if (hasLegendary) {
        quality = 'LEGENDARY';
      } else if (hasEpic) {
        quality = 'EPIC';
      } else if (stats.RARE) {
        quality = 'RARE';
      }
      
      const context = {
        result: { quality: quality, type: 'batch' },
        pityCount: this.player?.stats?.gamblerPityCount || 0,
        isNearMiss: false,
        playerGold: this.player?.stats?.gold || 0
      };
      
      // 显示评判语，5秒后开始催促
      this.gamblerNPC.showJudgement(context);
    }
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
    let pityTriggered = false;
    
    if (this.player.stats.gamblerPityCount >= pityThreshold) {
      console.log('Gambler Pity Triggered!');
      pityTriggered = true;
      // 应用保底权重：移除垃圾，大幅提升稀有度
      chances = GAMBLER_CONFIG.PITY.WEIGHT_MODIFIER;
      
      // 成就追踪：保底触发
      this.achievementTracking.totalPityTriggers++;
      this.saveAchievementTracking();
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
    const reward = this.generateItemByQuality(quality, tier);
    reward.pityTriggered = pityTriggered;
    return reward;
  }

  /**
   * 检测成就
   * @param {Object} reward - 奖励对象
   */
  checkAchievements(reward) {
    const game = window.game;
    if (!game || !game.achievementSystem) return;

    // 1. 欧皇成就：连续3次史诗+
    if (['EPIC', 'LEGENDARY', 'JACKPOT'].includes(reward.quality)) {
      this.achievementTracking.consecutiveRare++;
      if (this.achievementTracking.consecutiveRare >= 3) {
        game.achievementSystem.unlockAchievement('ACH_LUCKY_EMPEROR');
      }
    } else {
      // 重置连续计数
      this.achievementTracking.consecutiveRare = 0;
    }

    // 2. 非酋之王成就：累计触发保底10次
    if (this.achievementTracking.totalPityTriggers >= 10) {
      game.achievementSystem.unlockAchievement('ACH_UNLUCKY_SOUL');
    }

    // 3. 梭哈王成就：豪赌获得传说
    if (this.achievementTracking.lastSpinWasHighRoller && reward.quality === 'LEGENDARY') {
      game.achievementSystem.unlockAchievement('ACH_HIGH_ROLLER');
    }

    // 重置豪赌标记
    this.achievementTracking.lastSpinWasHighRoller = false;
  }

  generateItemByQuality(quality, tier) {
    const floor = this.player.stats.floor || 1;
    
    // 幸运石生成逻辑 - 根据品质生成不同等级的幸运石
    const shouldGenerateLuckyStone = (
      (quality === 'COMMON' && Math.random() < 0.5) ||
      (quality === 'UNCOMMON' && Math.random() < 0.3) ||
      (quality === 'RARE' && Math.random() < 0.2) ||
      (quality === 'EPIC' && Math.random() < 0.15) ||
      (quality === 'LEGENDARY' && Math.random() < 0.1)
    );
    
    if (shouldGenerateLuckyStone) {
      // 根据品质生成不同的幸运石数据
      const luckyStoneData = {
        COMMON: {
          name: '幸运石',
          nameEn: 'Lucky Rock',
          value: 1,
          successRateBonus: 0.0005, // 0.05%
          desc: '普通的幸运石，可作为强化底料使用，提升0.05%的强化成功率。虽然效果微弱，但总比一无所获要好。'
        },
        UNCOMMON: {
          name: '优质幸运石',
          nameEn: 'Quality Lucky Rock',
          value: 2,
          successRateBonus: 0.002, // 0.2%
          desc: '优质的幸运石，蕴含更多的幸运之力，可作为强化底料使用，提升0.2%的强化成功率。'
        },
        RARE: {
          name: '稀有幸运石',
          nameEn: 'Rare Lucky Rock',
          value: 5,
          successRateBonus: 0.005, // 0.5%
          desc: '稀有的幸运石，散发着淡淡的光芒，可作为强化底料使用，提升0.5%的强化成功率。'
        },
        EPIC: {
          name: '史诗幸运石',
          nameEn: 'Epic Lucky Rock',
          value: 10,
          successRateBonus: 0.008, // 0.8%
          desc: '史诗级的幸运石，闪耀着迷人的光辉，可作为强化底料使用，提升0.8%的强化成功率。'
        },
        LEGENDARY: {
          name: '传说幸运石',
          nameEn: 'Legendary Lucky Rock',
          value: 20,
          successRateBonus: 0.01, // 1%
          desc: '传说中的幸运石，蕴含着命运女神的祝福，可作为强化底料使用，提升1%的强化成功率。'
        }
      };
      
      const data = luckyStoneData[quality] || luckyStoneData.COMMON;
      
      return {
        type: 'trash',
        name: data.name,
        nameEn: data.nameEn,
        quality: quality,
        value: data.value,
        icon: '🪨',
        desc: data.desc,
        successRateBonus: data.successRateBonus
      };
    }

    // 决定物品类型 (Equipment / Consumable / Rune / Buff / Soul Crystal)
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
    
    // 特殊限制：符文只能在 UNCOMMON 以上出现
    if (selectedType === 'RUNE' && quality === 'COMMON') {
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

      case 'RUNE':
        // 根据品质筛选符文
        let runeRarity = 'COMMON';
        if (quality === 'LEGENDARY') runeRarity = 'LEGENDARY';
        else if (quality === 'EPIC') runeRarity = 'RARE';
        else if (quality === 'RARE') runeRarity = 'RARE';
        else if (quality === 'UNCOMMON') runeRarity = 'COMMON';
        
        // 筛选符文池（只选择STAT类型的符文）
        const availableRunes = RUNE_POOL.filter(r => 
          r.rarity === runeRarity && r.type === 'STAT'
        );
        
        if (availableRunes.length > 0) {
          const selectedRune = availableRunes[Math.floor(Math.random() * availableRunes.length)];
          
          // 计算符文数值（根据品质）
          const multiplier = ITEM_QUALITY[quality]?.multiplier || 1.0;
          let runeValue = 2; // 默认值
          
          // 根据符文类型计算数值
          if (selectedRune.id.includes('strength') || selectedRune.id.includes('power')) {
            runeValue = Math.floor(5 * multiplier);
          } else if (selectedRune.id.includes('vitality') || selectedRune.id.includes('life')) {
            runeValue = Math.floor(10 * multiplier);
          } else if (selectedRune.id.includes('precision') || selectedRune.id.includes('deadly') || selectedRune.id.includes('assassin')) {
            runeValue = Math.floor(5 * multiplier);
          } else if (selectedRune.id.includes('agility') || selectedRune.id.includes('phantom')) {
            runeValue = Math.floor(5 * multiplier);
          } else if (selectedRune.id.includes('fortune') || selectedRune.id.includes('greed')) {
            runeValue = Math.floor(20 * multiplier);
          } else {
            runeValue = Math.floor(3 * multiplier);
          }
          
          // 替换描述中的占位符
          let runeDescription = selectedRune.description || '';
          runeDescription = runeDescription.replace(/\{\{value\}\}/g, runeValue);
          
          // 根据品质生成描述
          let desc = '';
          if (quality === 'LEGENDARY') {
            desc = `传说级符文，蕴含强大的力量。${runeDescription}`;
          } else if (quality === 'EPIC') {
            desc = `史诗级符文，效果显著。${runeDescription}`;
          } else if (quality === 'RARE') {
            desc = `稀有符文，具有不错的效果。${runeDescription}`;
          } else {
            desc = `普通符文，提供基础属性加成。${runeDescription}`;
          }
          
          return {
            type: 'rune',
            runeId: selectedRune.id,
            name: selectedRune.nameZh || selectedRune.name,
            quality: quality,
            data: selectedRune,
            icon: '📜',
            desc: desc,
            runeValue: runeValue // 保存计算的数值
          };
        }
        // Fallthrough if no runes available

      case 'BUFF':
        const buff = BUFF_POOL[Math.floor(Math.random() * BUFF_POOL.length)];
        
        // 根据品质计算Buff数值（临时增益，数值更高）
        let buffValue = 1;
        let buffDesc = '';
        
        // 根据Buff类型和品质计算数值
        if (buff.id === 'str' || buff.id === 'iron' || buff.id === 'arc' || buff.id === 'ward') {
          // 攻击/防御类Buff（临时增益，数值提高3-5点）
          if (quality === 'LEGENDARY') buffValue = 10;
          else if (quality === 'EPIC') buffValue = 8;
          else if (quality === 'RARE') buffValue = 6;
          else if (quality === 'UNCOMMON') buffValue = 5;
          else buffValue = 4;
          
          const statName = buff.id === 'str' ? '物理攻击' : 
                          buff.id === 'iron' ? '物理防御' :
                          buff.id === 'arc' ? '魔法攻击' : '魔法防御';
          buffDesc = `本层临时提升 ${buffValue} 点${statName}（进入下一层后消失）`;
        } else if (buff.id === 'vit') {
          // 生命类Buff（临时增益，数值提高）
          if (quality === 'LEGENDARY') buffValue = 80;
          else if (quality === 'EPIC') buffValue = 60;
          else if (quality === 'RARE') buffValue = 40;
          else if (quality === 'UNCOMMON') buffValue = 30;
          else buffValue = 20;
          
          buffDesc = `本层临时提升 ${buffValue} 点最大生命值并立即回复等量生命（进入下一层后消失）`;
        } else if (buff.id === 'fury') {
          // 怒气类Buff（立即生效，不受层级影响）
          if (quality === 'LEGENDARY') buffValue = 50;
          else if (quality === 'EPIC') buffValue = 40;
          else if (quality === 'RARE') buffValue = 30;
          else if (quality === 'UNCOMMON') buffValue = 25;
          else buffValue = 20;
          
          buffDesc = `立即获得 ${buffValue} 点怒气`;
        } else if (buff.id === 'fortune') {
          // 金币类Buff（立即生效，不受层级影响）
          if (quality === 'LEGENDARY') buffValue = 300;
          else if (quality === 'EPIC') buffValue = 250;
          else if (quality === 'RARE') buffValue = 200;
          else if (quality === 'UNCOMMON') buffValue = 150;
          else buffValue = 100;
          
          buffDesc = `立即获得 ${buffValue} 金币`;
        }
        
        return {
          type: 'buff',
          name: `Buff: ${buff.name}`,
          quality: quality,
          data: buff,
          buffValue: buffValue,
          buffDesc: buffDesc,
          isTemporary: (buff.id === 'str' || buff.id === 'iron' || buff.id === 'arc' || buff.id === 'ward' || buff.id === 'vit'), // 标记临时buff
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
   * 执行横向滚动动画 (CS:GO Style) - 使用新动画系统
   */
  async performReelAnimation(finalReward) {
    // 确保系统已初始化
    if (!this.animationController) {
      this.initSystems();
    }

    // 检查减少动画模式
    const skipAnimation = this.accessibilityManager && this.accessibilityManager.shouldSkipAnimation();

    // 1. 生成滚动序列 (例如 50 个物品，第 45 个是结果)
    const totalItems = 50;
    const winnerIndex = 45;
    const items = [];

    // 生成真实物品填充项
    for (let i = 0; i < totalItems; i++) {
      if (i === winnerIndex) {
        items.push(finalReward);
      } else {
        // 生成真实的随机物品用于展示
        const randomQ = Math.random() < 0.8 ? 'COMMON' : (Math.random() < 0.9 ? 'UNCOMMON' : 'RARE');
        const randomTier = Math.random() < 0.5 ? 'STANDARD' : 'HIGH_ROLLER';
        const fakeReward = this.generateItemByQuality(randomQ, randomTier);
        
        // 确保生成的物品有效
        if (fakeReward && fakeReward.icon) {
          items.push(fakeReward);
        } else {
          // 如果生成失败，使用简单的金币作为后备
          items.push({
            type: 'gold',
            name: '10 金币',
            quality: randomQ,
            value: 10,
            icon: '💰'
          });
        }
      }
    }

    // 2. 检测差一点情况（先不添加到历史，等获得实际奖励后再添加）
    const nearMissResult = this.historyTracker.detectNearMiss(winnerIndex, items);

    // 3. 使用新动画控制器执行动画（带错误处理和减少动画支持）
    let actualReward = finalReward; // 默认使用预设奖励
    
    try {
      if (skipAnimation) {
        // 减少动画模式：立即显示结果
        if (this.elements.reelStrip) {
          // 渲染最终结果
          this.elements.reelStrip.innerHTML = '';
          this.elements.reelStrip.style.display = 'flex';
          this.elements.reelStrip.style.alignItems = 'center';
          this.elements.reelStrip.style.justifyContent = 'center';
          
          const el = document.createElement('div');
          el.className = `gambler-item-card quality-${finalReward.quality}`;
          el.textContent = finalReward.icon || '?';
          el.style.background = 'transparent';
          el.style.border = 'none';
          el.style.opacity = '1';
          el.style.transform = 'scale(1.3)';
          this.elements.reelStrip.appendChild(el);
        }
        // 短暂延迟以显示结果
        await this.sleep(500);
        
        // 跳过动画模式下，使用预设奖励
        actualReward = finalReward;
      } else {
        // 正常动画，获取实际获得的物品
        const animationResult = await this.animationController.playSpinAnimation(finalReward, items, winnerIndex);
        
        // 使用动画返回的实际奖励
        if (animationResult) {
          actualReward = animationResult;
        }
      }
    } catch (error) {
      console.error('Animation controller error:', error);
      // 回退：立即显示结果
      if (this.elements.reelStrip) {
        this.elements.reelStrip.style.transition = 'none';
        this.elements.reelStrip.style.transform = 'translateX(0)';
      }
      // 错误情况下使用预设奖励
      actualReward = finalReward;
    }
    
    // 4. 添加实际获得的物品到历史记录
    this.historyTracker.addResult(
      actualReward,
      nearMissResult.isNearMiss,
      nearMissResult.missedItem?.quality
    );
    
    // 5. 更新历史显示
    this.renderHistory();
    
    // 播放"叮"的一声（带错误处理）
    try {
      const game = window.game;
      if (game && game.audio) game.audio.playCoinDrop();
    } catch (error) {
      console.warn('Coin drop sound failed:', error);
    }
    
    // 返回实际获得的物品
    return actualReward;
  }

  /**
   * 显示结果并发放奖励
   */
  async showResult(reward) {
    await this.showResultWithoutUrge(reward);
    
    // 启动催促系统
    const lastHistory = this.historyTracker.getHistory()[0];
    const npcContext = {
      result: reward,
      pityCount: this.player?.stats?.gamblerPityCount || 0,
      isNearMiss: lastHistory?.wasNearMiss || false,
      consecutiveRare: 0,
      playerGold: this.player?.stats?.gold || 0
    };
    this.gamblerNPC.showJudgement(npcContext);
  }

  /**
   * 显示结果但不启动催促（用于十连抽）
   */
  async showResultWithoutUrge(reward) {
    const game = window.game;

    // 1. 播放音效（带错误处理）
    try {
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
    } catch (error) {
      console.warn('Audio playback error:', error);
      // 继续执行，不中断流程
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

    // 3. 屏幕阅读器公告
    if (this.accessibilityManager) {
      let announcement = `获得 ${reward.quality} 品质物品：${reward.name}`;
      if (reward.quality === 'JACKPOT') {
        announcement = `大奖！赢得 ${reward.value} 金币！`;
      }
      this.accessibilityManager.announceResult(announcement);
    }

    // 4. 应用奖励
    this.applyReward(reward);

    // 5. 成就检测
    if (game.achievementSystem) {
      if (reward.type === 'trash') {
        game.achievementSystem.check('onGamble', reward);
      } else {
        game.achievementSystem.resetConsecutiveTrashGambles();
      }
    }
    
    // 6. 记录日志
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
        // 应用Buff效果，使用计算好的buffValue
        if (reward.data && reward.data.effect) {
          const value = reward.buffValue || 1; // 使用计算好的数值
          reward.data.effect(game.player, value);
          
          // 如果是临时buff，记录到玩家状态中
          if (reward.isTemporary) {
            if (!game.player.temporaryBuffs) {
              game.player.temporaryBuffs = [];
            }
            game.player.temporaryBuffs.push({
              buffId: reward.data.id,
              value: value,
              appliedFloor: game.player.stats.floor
            });
          }
          
          // 显示详细的效果消息
          const effectMsg = reward.buffDesc || `${reward.name} 生效！`;
          game.ui.logMessage(effectMsg, 'upgrade');
        }
        break;

      case 'gold':
      case 'trash': // 垃圾也给1金币
        game.player.stats.gold += (reward.value || 0);
        break;

      case 'consumable':
        if (reward.itemId) {
          const success = game.player.addToInventory(reward.itemId);
          if (!success && game.map && typeof game.map.addConsumableAt === 'function') {
            game.map.addConsumableAt(reward.itemId, game.player.x, game.player.y);
          }
        }
        break;

      case 'rune':
        // 添加符文到玩家
        if (reward.runeId && game.roguelikeSystem) {
          game.roguelikeSystem.addRune(reward.runeId);
          if (game.ui && game.ui.logMessage) {
            game.ui.logMessage(`获得符文: ${reward.name}`, 'gain');
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
          if (!success && game.map && typeof game.map.addEquipAt === 'function') {
            game.map.addEquipAt(itemInstance, game.player.x, game.player.y);
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
    
    // 销毁粒子系统
    if (this.particleSystem) {
      this.particleSystem.destroy();
      this.particleSystem = null;
    }

    // 清理动画控制器
    if (this.animationController) {
      this.animationController.cleanup();
      this.animationController = null;
    }

    // 销毁 NPC
    if (this.gamblerNPC) {
      this.gamblerNPC.destroy();
      this.gamblerNPC = null;
    }

    // 销毁无障碍管理器
    if (this.accessibilityManager) {
      this.accessibilityManager.destroy();
      this.accessibilityManager = null;
    }

    this.player = null;
  }
}
