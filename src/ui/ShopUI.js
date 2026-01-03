// ShopUI.js - 商店界面
// 独立管理商店UI的所有渲染和交互逻辑

/**
 * ShopUI - 商店界面管理器
 * 负责渲染商店、价格显示、购买逻辑等
 * 完全独立的组件，不依赖外部 DOM 操作
 */
export class ShopUI {
  constructor(config = {}) {
    // 样式配置对象（允许外部自定义）
    this.style = {
      // 面板配置
      panelOffsetX: config.panelOffsetX || 0,
      panelOffsetY: config.panelOffsetY || 0,
      panelScale: config.panelScale || 1.0,
      
      // 按钮配置
      buttonHeight: config.buttonHeight || 50,
      buttonGap: config.buttonGap || 10,
      
      // 字体配置
      fontSize: config.fontSize || 16,
      titleFontSize: config.titleFontSize || 20,
      
      // 颜色配置
      priceColor: config.priceColor || '#ffd700',
      disabledColor: config.disabledColor || '#666',
      
      // 动画配置
      enableAnimations: config.enableAnimations !== false,
      transitionDuration: config.transitionDuration || 200,
      
      ...config.customStyles
    };

    // 商店价格
    this.shopPrices = { 
      atk: 200, 
      def: 200, 
      hp: 100, 
      key: 500 
    };

    // 内部状态
    this.isOpen = false;
    this.player = null;

    // DOM 元素引用（延迟初始化）
    this.elements = {
      overlay: null,
      priceElements: {},
      buyButtons: {}
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
    this.setupResizeHandler();
    console.log('✓ ShopUI 已初始化', this.style);
  }

  /**
   * 初始化 DOM 元素引用
   */
  initDOMElements() {
    this.elements.overlay = document.getElementById('shop-overlay');
    
    // 缓存价格显示元素
    this.elements.priceElements = {
      atk: document.getElementById('price-atk'),
      def: document.getElementById('price-def'),
      hp: document.getElementById('price-hp'),
      key: document.getElementById('price-key')
    };

    // 应用样式配置到面板（如果存在 .shop-panel，否则应用到 overlay 本身）
    if (this.elements.overlay && this.style.panelScale !== 1.0) {
      const panel = this.elements.overlay.querySelector('.shop-panel');
      const target = panel || this.elements.overlay;
      target.style.transform = `scale(${this.style.panelScale})`;
    }
  }

  /**
   * 设置事件监听器
   */
  setupEventListeners() {
    if (!this.elements.overlay) return;

    // 关闭按钮监听器（支持多种选择器）
    const closeBtn = this.elements.overlay.querySelector('.shop-close-btn, .btn-modal-close');
    if (closeBtn && !closeBtn.hasAttribute('onclick')) {
      // 只在按钮没有 onclick 属性时添加监听器（避免重复）
      closeBtn.addEventListener('click', () => this.close());
    }

    // 点击 overlay 外部关闭（仅当 overlay 是模态时）
    this.elements.overlay.addEventListener('click', (e) => {
      if (e.target === this.elements.overlay) {
        this.close();
      }
    });

    // 购买按钮监听器（支持 data-shop-item 属性）
    const buyButtons = this.elements.overlay.querySelectorAll('[data-shop-item]');
    buyButtons.forEach(btn => {
      const itemType = btn.dataset.shopItem;
      btn.addEventListener('click', () => this.buy(itemType));
    });
  }

  /**
   * 打开商店界面
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

      this.elements.overlay.classList.remove('hidden');
      this.elements.overlay.style.setProperty('display', 'flex', 'important');
      this.isOpen = true;

      // 渲染当前数据
      if (game && game.player) {
        this.player = game.player;
        this.render();
      }

      // Apply smooth transition animation
      const shopPanel = this.elements.overlay.querySelector('.shop-panel, .shop-content, .shop-modal');
      const targetElement = shopPanel || this.elements.overlay.querySelector('[class*="shop"]');
      if (targetElement) {
        // Remove animation class to restart animation on re-open
        targetElement.classList.remove('modal-animate-enter');
        // Force reflow to restart animation
        void targetElement.offsetWidth;
        // Add animation class
        targetElement.classList.add('modal-animate-enter');
      }

      console.log('✓ ShopUI 已打开');
    }
  }

  /**
   * 关闭商店界面
   */
  close() {
    if (this.elements.overlay) {
      this.elements.overlay.classList.add('hidden');
      this.elements.overlay.style.setProperty('display', 'none', 'important');
      this.isOpen = false;

      // 恢复游戏
      const game = window.game;
      if (game) {
        game.isPaused = false;
      }

      console.log('✓ ShopUI 已关闭');
    }
  }

  /**
   * 切换商店界面开关
   */
  toggle() {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  /**
   * 完整渲染商店界面
   */
  render() {
    this.renderPrices();
    this.updateButtonStates();
  }

  /**
   * 更新商店界面（数据变化时调用）
   */
  update() {
    if (this.isOpen) {
      this.render();
    }
  }

  /**
   * 获取实际价格（考虑遗物折扣和每日词缀）
   * @param {string} type - 商品类型
   * @param {number} basePrice - 基础价格
   * @returns {number} 实际价格
   */
  getPrice(type, basePrice) {
    const game = window.game;
    if (!game || !game.player) return basePrice;
    
    let finalPrice = basePrice;
    
    // ✅ 检查每日挑战词缀：通胀（商店价格 x2）
    if (game.dailyShopPriceMultiplier && game.dailyShopPriceMultiplier !== 1.0) {
      finalPrice = Math.floor(finalPrice * game.dailyShopPriceMultiplier);
    }
    
    // ✅ 检查贪婪戒指遗物效果（在每日词缀之后应用，降低价格）
    if (game.player.hasRelic && game.player.hasRelic('MERCHANTS_RING')) {
      // 贪婪戒指：价格降低 20%
      finalPrice = Math.floor(finalPrice * 0.8);
    }
    
    return finalPrice;
  }
  
  /**
   * 渲染价格显示
   */
  renderPrices() {
    const priceElements = this.elements.priceElements;
    const game = window.game;
    
    for (const [type, basePrice] of Object.entries(this.shopPrices)) {
      const el = priceElements[type];
      if (el) {
        // ✅ 使用动态价格（考虑遗物折扣）
        const actualPrice = this.getPrice(type, basePrice);
        el.innerText = actualPrice;
        
        // 如果有折扣，显示原价（删除线）和折扣价
        if (actualPrice < basePrice && game && game.player && game.player.hasRelic && game.player.hasRelic('MERCHANTS_RING')) {
          el.innerHTML = `<span style="text-decoration: line-through; opacity: 0.5;">${basePrice}</span> ${actualPrice}`;
        }
        
        // 应用样式配置
        if (this.style.priceColor) {
          el.style.color = this.style.priceColor;
        }
        if (this.style.fontSize) {
          el.style.fontSize = `${this.style.fontSize}px`;
        }
      }
    }

    // 更新玩家属性显示
    if (game && game.ui && game.ui.updateStats && game.player) {
      game.ui.updateStats(game.player);
    }
  }

  /**
   * 更新购买按钮状态（根据玩家金币）
   */
  updateButtonStates() {
    const game = window.game;
    if (!game || !game.player) return;

    const playerGold = game.player.stats.gold ?? 0;

    for (const [type, basePrice] of Object.entries(this.shopPrices)) {
      const buttons = this.elements.overlay?.querySelectorAll(`[data-shop-item="${type}"]`);
      buttons?.forEach(btn => {
        // ✅ 使用动态价格（考虑遗物折扣）
        const actualPrice = this.getPrice(type, basePrice);
        const canAfford = playerGold >= actualPrice;
        
        if (canAfford) {
          btn.removeAttribute('disabled');
          btn.style.opacity = '1';
          btn.style.cursor = 'pointer';
        } else {
          btn.setAttribute('disabled', 'true');
          btn.style.opacity = '0.5';
          btn.style.cursor = 'not-allowed';
        }
      });
    }
  }

  /**
   * 购买商品
   * @param {string} type - 商品类型 ('atk', 'def', 'hp', 'key')
   */
  buy(type) {
    const game = window.game;
    if (!game || !game.player) return;
    
    const basePrice = this.shopPrices[type];
    if (basePrice == null) return;
    
    // ✅ 使用动态价格（考虑遗物折扣）
    const actualPrice = this.getPrice(type, basePrice);
    
    // 检查金币是否足够
    if ((game.player.stats.gold ?? 0) < actualPrice) {
      if (game.ui && game.ui.logMessage) {
        game.ui.logMessage('金币不足！', 'info');
      }
      return;
    }
    
    // 扣除金币（使用实际价格）
    game.player.stats.gold -= actualPrice;
    
    // 应用购买效果
    if (type === 'atk') {
      game.player.stats.p_atk += 3;
    } else if (type === 'def') {
      game.player.stats.p_def += 3;
    } else if (type === 'hp') {
      game.player.heal(200);
    } else if (type === 'key') {
      game.player.stats.keys += 1;
    }
    
    // 提高价格（下次购买更贵）
    if (type === 'hp') {
      this.shopPrices.hp = Math.ceil(this.shopPrices.hp * 1.2);
    } else {
      this.shopPrices[type] = Math.ceil(this.shopPrices[type] * 1.25);
    }
    
    // 更新 UI
    this.render();
    
    if (game.ui && game.ui.logMessage) {
      game.ui.logMessage('购买成功！', 'gain');
    }
  }

  /**
   * 设置 resize 事件处理（响应窗口大小变化）
   */
  setupResizeHandler() {
    window.addEventListener('resize', () => {
      if (this.isOpen) {
        // 窗口大小变化时重新渲染
        this.render();
      }
    });
  }

  /**
   * 更新样式配置（运行时修改样式）
   * @param {object} newStyles - 新的样式配置
   */
  updateStyle(newStyles) {
    this.style = { ...this.style, ...newStyles };

    // 应用新样式（如果存在 .shop-panel，否则应用到 overlay 本身）
    if (this.elements.overlay && newStyles.panelScale) {
      const panel = this.elements.overlay.querySelector('.shop-panel');
      const target = panel || this.elements.overlay;
      target.style.transform = `scale(${newStyles.panelScale})`;
    }

    // 重新渲染
    if (this.isOpen) {
      this.render();
    }

    console.log('✓ ShopUI 样式已更新', this.style);
  }

  /**
   * 重置商店价格（新游戏时调用）
   */
  resetPrices() {
    this.shopPrices = { 
      atk: 200, 
      def: 200, 
      hp: 100, 
      key: 500 
    };
    
    if (this.isOpen) {
      this.render();
    }
  }

  /**
   * 销毁组件（清理资源）
   */
  destroy() {
    this.close();
    this.player = null;
    console.log('✓ ShopUI 已销毁');
  }

  // ========================================================================
  // 向后兼容的方法（保留旧接口）
  // ========================================================================

  /**
   * @deprecated 使用 open() 代替
   */
  openShop() {
    this.open();
  }

  /**
   * @deprecated 使用 close() 代替
   */
  closeShop() {
    this.close();
  }

  /**
   * @deprecated 使用 render() 代替
   */
  updateShopPricesUI() {
    this.render();
  }
}

