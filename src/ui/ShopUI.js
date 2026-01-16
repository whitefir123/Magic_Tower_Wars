// ShopUI.js - 商店界面
// 独立管理商店UI的所有渲染和交互逻辑

import AudioManager from '../audio/AudioManager.js';

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

    // 商店基础服务价格
    this.shopPrices = { 
      atk: 200, 
      def: 200, 
      hp: 100, 
      key: 500 
    };

    // 随机商品列表
    this.goods = [];
    this.lastRefreshFloor = -1;
    this.refreshCount = 0;

    // 内部状态
    this.isOpen = false;
    this.player = null;

    // DOM 元素引用（延迟初始化）
    this.elements = {
      overlay: null,
      priceElements: {},
      goodsContainer: null,
      refreshBtn: null,
      refreshPrice: null
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
   * 获取商店界面的完整 HTML 字符串
   * @returns {string} HTML 字符串
   */
  getHTML() {
    return `
    <div class="shop-panel" style="background: rgba(0,0,0,0.9); padding: 20px; border: 2px solid #666; border-radius: 10px; max-width: 800px; width: 90%; display: flex; flex-direction: column; gap: 15px;">
      <h2 class="modal-title-shop" style="color: #ffd700; text-align: center; margin: 0 0 10px 0;">地精商店</h2>
      
      <!-- 基础服务区域 -->
      <div style="display: flex; justify-content: space-around; flex-wrap: wrap; gap: 10px; border-bottom: 1px solid #444; padding-bottom: 15px;">
        <button class="btn-core btn-transaction" data-shop-item="atk" style="flex: 1; min-width: 120px;">
          <div style="font-weight: bold;">攻击 +3</div>
          <div style="font-size: 0.9em; color: #aaa;">价格: <span id="price-atk">200</span></div>
        </button>
        <button class="btn-core btn-transaction" data-shop-item="def" style="flex: 1; min-width: 120px;">
          <div style="font-weight: bold;">防御 +3</div>
          <div style="font-size: 0.9em; color: #aaa;">价格: <span id="price-def">200</span></div>
        </button>
        <button class="btn-core btn-transaction" data-shop-item="hp" style="flex: 1; min-width: 120px;">
          <div style="font-weight: bold;">治疗 +200HP</div>
          <div style="font-size: 0.9em; color: #aaa;">价格: <span id="price-hp">100</span></div>
        </button>
        <button class="btn-core btn-transaction" data-shop-item="key" style="flex: 1; min-width: 120px;">
          <div style="font-weight: bold;">钥匙 +1</div>
          <div style="font-size: 0.9em; color: #aaa;">价格: <span id="price-key">500</span></div>
        </button>
      </div>

      <!-- 限时货物区域 -->
      <div style="display: flex; flex-direction: column; gap: 5px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <h3 style="color: #fff; margin: 0; font-size: 16px;">限时货物</h3>
          <div style="font-size: 12px; color: #888;">每天自动刷新</div>
        </div>
        <div id="shop-goods-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 10px; min-height: 200px;">
          <!-- 动态生成的商品将在这里 -->
        </div>
      </div>

      <!-- 底部操作栏 -->
      <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #444; padding-top: 15px;">
        <button id="btn-shop-refresh" class="btn-core" style="background: #4a3b18; border-color: #ffd700;">
          刷新货物 (<span id="price-refresh">100</span> G)
        </button>
        <button class="btn-core btn-modal-close" style="background: #333;">离开商店</button>
      </div>
    </div>
    `;
  }

  /**
   * 初始化 DOM 元素引用
   */
  initDOMElements() {
    // 检查是否存在 shop-overlay 元素
    this.elements.overlay = document.getElementById('shop-overlay');
    
    // 如果不存在，创建新的 overlay 元素
    if (!this.elements.overlay) {
      console.log('Creating shop-overlay element dynamically');
      const overlay = document.createElement('div');
      overlay.id = 'shop-overlay';
      overlay.className = 'modal-overlay hidden';
      overlay.style.display = 'none';
      overlay.style.justifyContent = 'center';
      overlay.style.alignItems = 'center';
      overlay.style.zIndex = '1000';
      
      // 注入 HTML 内容
      overlay.innerHTML = this.getHTML();
      
      // 将 overlay 添加到 body（确保全屏覆盖）
      document.body.appendChild(overlay);
      this.elements.overlay = overlay;
    }
    
    // 缓存价格显示元素
    this.elements.priceElements = {
      atk: document.getElementById('price-atk'),
      def: document.getElementById('price-def'),
      hp: document.getElementById('price-hp'),
      key: document.getElementById('price-key')
    };
    this.elements.goodsContainer = document.getElementById('shop-goods-grid');
    this.elements.refreshBtn = document.getElementById('btn-shop-refresh');
    this.elements.refreshPrice = document.getElementById('price-refresh');

    // 应用样式配置
    if (this.elements.overlay && this.style.panelScale !== 1.0) {
      const panel = this.elements.overlay.querySelector('.shop-panel');
      if (panel) {
        panel.style.transform = `scale(${this.style.panelScale})`;
      }
    }
  }

  /**
   * 设置事件监听器
   */
  setupEventListeners() {
    if (!this.elements.overlay) return;

    if (this.elements.overlay._listenersInitialized) return;
    this.elements.overlay._listenersInitialized = true;

    // 关闭按钮
    const closeBtn = this.elements.overlay.querySelector('.btn-modal-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.close());
    }

    // 点击外部关闭
    this.elements.overlay.addEventListener('click', (e) => {
      if (e.target === this.elements.overlay) {
        this.close();
      }
    });

    // 基础服务购买
    const buyButtons = this.elements.overlay.querySelectorAll('[data-shop-item]');
    buyButtons.forEach(btn => {
      const itemType = btn.dataset.shopItem;
      btn.addEventListener('click', () => this.buyService(itemType));
    });

    // 刷新按钮
    if (this.elements.refreshBtn) {
      this.elements.refreshBtn.addEventListener('click', () => this.refreshGoods());
    }

    // 商品点击委托（动态生成的按钮）
    if (this.elements.goodsContainer) {
      this.elements.goodsContainer.addEventListener('click', (e) => {
        const btn = e.target.closest('.shop-good-item');
        if (btn && !btn.disabled) {
          const index = parseInt(btn.dataset.index, 10);
          this.buyGood(index);
        }
      });
    }
  }

  /**
   * 打开商店界面
   */
  open() {
    if (!this.elements.overlay) {
      this.initDOMElements();
    }

    if (this.elements.overlay) {
      // 播放音效
      if (AudioManager && typeof AudioManager.playCoins === 'function') {
        AudioManager.playCoins({ forceCategory: 'ui' });
      }

      // 暂停游戏
      const game = window.game;
      if (game) {
        game.isPaused = true;
        game.inputStack = [];
        this.player = game.player;
        
        // 检查是否需要生成新货物
        const currentFloor = game.player.floor || 1;
        if (this.lastRefreshFloor !== currentFloor) {
          this.initGoods(currentFloor);
          this.lastRefreshFloor = currentFloor;
          this.refreshCount = 0; // 重置刷新次数
        }
      }

      // 显示界面
      this.elements.overlay.classList.remove('hidden');
      this.elements.overlay.style.display = 'flex';
      this.isOpen = true;

      // 渲染
      this.render();
    }
  }

  /**
   * 关闭商店界面
   */
  close() {
    if (this.elements.overlay) {
      if (AudioManager && typeof AudioManager.playBookClose === 'function') {
        AudioManager.playBookClose();
      }
      
      this.elements.overlay.classList.add('hidden');
      this.elements.overlay.classList.remove('overlay-fade-in');
      this.elements.overlay.style.display = 'none';
      this.isOpen = false;

      // 恢复游戏
      const game = window.game;
      if (game) {
        game.isPaused = false;
      }
    }
  }

  /**
   * 初始化商品列表
   */
  initGoods(floor) {
    if (window.__lootGenerator) {
      // 生成 6 个商品
      this.goods = window.__lootGenerator.generateShopGoods(floor, 6);
      console.log('商店货物已刷新:', this.goods);
    } else {
      console.warn('LootGenerator not found');
      this.goods = [];
    }
  }

  /**
   * 刷新货物逻辑
   */
  refreshGoods() {
    const game = window.game;
    if (!game || !game.player) return;

    const refreshCost = this.getRefreshCost();
    
    if (game.player.stats.gold < refreshCost) {
      if (game.ui) game.ui.logMessage('金币不足，无法刷新！', 'info');
      return;
    }

    // 扣费
    game.player.stats.gold -= refreshCost;
    if (AudioManager && typeof AudioManager.playCoins === 'function') {
      AudioManager.playCoins({ forceCategory: 'ui' });
    }

    // 重新生成
    this.initGoods(game.player.floor || 1);
    this.refreshCount++;

    // 更新界面
    this.render();
    if (game.ui) game.ui.logMessage('商店货物已刷新', 'gain');
  }

  /**
   * 获取刷新价格
   */
  getRefreshCost() {
    const game = window.game;
    const floor = (game && game.player) ? game.player.floor : 1;
    // 基础 50，每层 +10，每次刷新 +50% (防止无限刷)
    const base = 50 + (floor * 10);
    return Math.floor(base * Math.pow(1.5, this.refreshCount));
  }

  /**
   * 计算商品价格
   */
  calculateItemPrice(item) {
    if (!item) return 0;

    const game = window.game;
    const floor = (game && game.player) ? game.player.floor : 1;
    
    let price = 0;

    // 1. 消耗品
    if (item.type === 'CONSUMABLE') {
      const rarityMultipliers = {
        'COMMON': 1, 'UNCOMMON': 2, 'RARE': 5, 'EPIC': 10, 'LEGENDARY': 20, 'MYTHIC': 50
      };
      const mult = rarityMultipliers[item.rarity || item.quality] || 1;
      price = 50 * mult;
    }
    // 2. 宝石
    else if (item.type === 'GEM') {
      const tierPrices = { 1: 200, 2: 500, 3: 1500, 4: 5000 };
      price = tierPrices[item.tier] || 200;
    }
    // 3. 装备
    else {
      const iPwr = item.itemPower || (floor * 5);
      const rarityMultipliers = {
        'COMMON': 1, 'UNCOMMON': 1.5, 'RARE': 3, 'EPIC': 8, 'LEGENDARY': 20, 'MYTHIC': 50
      };
      const mult = rarityMultipliers[item.rarity || item.quality] || 1;
      
      // 基础公式：(100 + iPwr * 10) * 品质系数
      price = Math.floor((100 + iPwr * 10) * mult);
    }

    // 应用折扣 (遗物/每日词缀)
    return this.applyPriceModifiers(price);
  }

  /**
   * 应用价格修正 (折扣等)
   */
  applyPriceModifiers(basePrice) {
    const game = window.game;
    let finalPrice = basePrice;

    // 每日挑战通胀
    if (game && game.dailyShopPriceMultiplier) {
      finalPrice = Math.floor(finalPrice * game.dailyShopPriceMultiplier);
    }

    // 贪婪戒指折扣
    if (game && game.player && game.player.hasRelic && game.player.hasRelic('MERCHANTS_RING')) {
      finalPrice = Math.floor(finalPrice * 0.8);
    }

    return Math.max(1, finalPrice);
  }

  /**
   * 渲染界面
   */
  render() {
    this.renderServicePrices();
    this.renderGoods();
    this.renderRefreshButton();
    this.updateButtonStates();
  }

  /**
   * 渲染基础服务价格
   */
  renderServicePrices() {
    for (const [type, basePrice] of Object.entries(this.shopPrices)) {
      const el = this.elements.priceElements[type];
      if (el) {
        const actualPrice = this.applyPriceModifiers(basePrice);
        el.innerText = actualPrice;
        // 简单删除线效果略，保持清晰
      }
    }
  }

  /**
   * 渲染商品网格
   */
  renderGoods() {
    const container = this.elements.goodsContainer;
    if (!container) return;

    container.innerHTML = '';

    const game = window.game;
    const playerGold = game && game.player ? game.player.stats.gold : 0;

    this.goods.forEach((item, index) => {
      if (!item) return; // 已购买的可能是 null

      const price = this.calculateItemPrice(item);
      const canAfford = playerGold >= price;
      
      // 稀有度颜色
      const rarityColors = {
        'COMMON': '#ffffff', 'UNCOMMON': '#00ff00', 'RARE': '#0070dd', 
        'EPIC': '#a335ee', 'LEGENDARY': '#ff8000', 'MYTHIC': '#ff0000'
      };
      const color = rarityColors[item.rarity || item.quality] || '#ffffff';
      
      const itemEl = document.createElement('div');
      itemEl.className = 'shop-good-item btn-core';
      itemEl.dataset.index = index;
      itemEl.style.cssText = `
        display: flex; flex-direction: column; align-items: center; justify-content: space-between;
        padding: 10px; background: #222; border: 1px solid ${canAfford ? '#444' : '#333'};
        border-radius: 5px; cursor: ${canAfford ? 'pointer' : 'not-allowed'};
        opacity: ${canAfford ? 1 : 0.6}; transition: all 0.2s;
        min-height: 120px; position: relative;
      `;
      
      // 图标 (简单用首字母或 Emoji 替代，如果有 iconIndex 更好)
      // 这里简化处理，显示名称
      let icon = '📦';
      if (item.type === 'WEAPON') icon = '⚔️';
      else if (item.type === 'ARMOR') icon = '🛡️';
      else if (item.type === 'CONSUMABLE') icon = '🧪';
      else if (item.type === 'GEM') icon = '💎';

      itemEl.innerHTML = `
        <div style="font-size: 24px; margin-bottom: 5px;">${icon}</div>
        <div style="color: ${color}; font-weight: bold; text-align: center; font-size: 14px; margin-bottom: 5px;">
          ${item.nameZh || item.name}
        </div>
        ${item.type === 'GEM' ? `<div style="font-size:12px; color:#aaa;">Tier ${item.tier}</div>` : ''}
        <div style="color: #ffd700; font-size: 14px;">💰 ${price}</div>
      `;
      
      // Tooltip (简单 title 属性，或自定义 tooltip)
      const statsStr = this.formatItemStats(item);
      itemEl.title = `${item.nameZh || item.name}\n${item.descZh || item.desc || ''}\n\n${statsStr}`;

      if (!canAfford) {
        itemEl.disabled = true;
      }

      container.appendChild(itemEl);
    });

    if (this.goods.every(g => g === null)) {
      container.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: #666; padding: 20px;">货物已售罄</div>';
    }
  }

  /**
   * 格式化物品属性用于显示
   */
  formatItemStats(item) {
    if (!item.stats) return '';
    return Object.entries(item.stats)
      .map(([k, v]) => {
        if (v === 0) return null;
        // 简单映射
        const map = { p_atk: '攻击', p_def: '防御', m_atk: '魔攻', m_def: '魔防', maxHp: '生命', crit_rate: '暴击' };
        const label = map[k] || k;
        return `${label}: +${v}`;
      })
      .filter(Boolean)
      .join('\n');
  }

  /**
   * 渲染刷新按钮
   */
  renderRefreshButton() {
    if (this.elements.refreshPrice) {
      this.elements.refreshPrice.innerText = this.getRefreshCost();
    }
    
    if (this.elements.refreshBtn) {
      const game = window.game;
      const cost = this.getRefreshCost();
      const canAfford = game && game.player && game.player.stats.gold >= cost;
      
      this.elements.refreshBtn.style.opacity = canAfford ? '1' : '0.5';
      this.elements.refreshBtn.style.cursor = canAfford ? 'pointer' : 'not-allowed';
    }
  }

  /**
   * 更新基础服务按钮状态
   */
  updateButtonStates() {
    const game = window.game;
    if (!game || !game.player) return;

    const playerGold = game.player.stats.gold;

    for (const [type, basePrice] of Object.entries(this.shopPrices)) {
      const buttons = this.elements.overlay.querySelectorAll(`[data-shop-item="${type}"]`);
      const actualPrice = this.applyPriceModifiers(basePrice);
      const canAfford = playerGold >= actualPrice;
      
      buttons.forEach(btn => {
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
   * 购买基础服务
   */
  buyService(type) {
    const game = window.game;
    if (!game || !game.player) return;
    
    const basePrice = this.shopPrices[type];
    const actualPrice = this.applyPriceModifiers(basePrice);
    
    if (game.player.stats.gold < actualPrice) {
      if (game.ui) game.ui.logMessage('金币不足！', 'info');
      return;
    }
    
    // 扣费
    game.player.stats.gold -= actualPrice;
    if (AudioManager && typeof AudioManager.playCoins === 'function') {
      AudioManager.playCoins({ forceCategory: 'ui' });
    }
    
    // 效果
    if (type === 'atk') game.player.stats.p_atk += 3;
    else if (type === 'def') game.player.stats.p_def += 3;
    else if (type === 'hp') game.player.heal(200);
    else if (type === 'key') game.player.stats.keys += 1;
    
    // 通胀
    if (type === 'hp') this.shopPrices.hp = Math.ceil(this.shopPrices.hp * 1.2);
    else this.shopPrices[type] = Math.ceil(this.shopPrices[type] * 1.25);
    
    this.render();
    if (game.ui) game.ui.logMessage('购买成功！', 'gain');
  }

  /**
   * 购买随机商品
   */
  buyGood(index) {
    const item = this.goods[index];
    if (!item) return;

    const game = window.game;
    if (!game || !game.player) return;

    const price = this.calculateItemPrice(item);
    if (game.player.stats.gold < price) {
      if (game.ui) game.ui.logMessage('金币不足！', 'info');
      return;
    }

    // 尝试添加到背包
    const success = game.player.addToInventory(item);
    if (!success) {
      if (game.ui) game.ui.logMessage('背包已满！', 'warn');
      return;
    }

    // 购买成功
    game.player.stats.gold -= price;
    this.goods[index] = null; // 标记为已售出
    
    if (AudioManager && typeof AudioManager.playCoins === 'function') {
      AudioManager.playCoins({ forceCategory: 'ui' });
    }

    this.render();
    if (game.ui) game.ui.logMessage(`购买了 ${item.nameZh || item.name}`, 'gain');
    
    // 更新背包UI
    if (game.ui.renderInventory) {
      game.ui.renderInventory(game.player);
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

    // 应用新样式
    if (this.elements.overlay && newStyles.panelScale) {
      const panel = this.elements.overlay.querySelector('.shop-panel');
      if (panel) {
        panel.style.transform = `scale(${newStyles.panelScale})`;
      }
    }

    // 重新渲染
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
  // 向后兼容
  // ========================================================================
  openShop() { this.open(); }
  closeShop() { this.close(); }
  updateShopPricesUI() { this.render(); }
  resetPrices() {
    this.shopPrices = { atk: 200, def: 200, hp: 100, key: 500 };
    this.lastRefreshFloor = -1;
    if (this.isOpen) this.render();
  }
}
