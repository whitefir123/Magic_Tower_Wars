// ShopUI.js - 商店界面
// 独立管理商店UI的所有渲染和交互逻辑

import AudioManager from '../audio/AudioManager.js';
import { globalTooltipManager } from '../utils/TooltipManager.js';
import { ICON_GRID_COLS, ICON_GRID_ROWS } from '../constants.js';

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
      matk: 200, // 新增
      mdef: 200, // 新增
      hp: 100, 
      key: 500,
      drill: 500 // 新增
    };

    // 随机商品列表
    this.goods = [];
    
    // 商品位置配置 (存储格式: { services: [{left, top}, ...], goods: [{left, top}, ...] })
    this.itemPositions = {
      services: [
        { left: "-11.97%", top: "-39.54%" },
        { left: "19.34%", top: "-34.09%" },
        { left: "49.35%", top: "-29.99%" },
        { left: "79.08%", top: "-26.54%" },
        { left: "-12.05%", top: "0.03%" },
        { left: "19.24%", top: "3.98%" },
        { left: "50.07%", top: "6.13%" }
      ],
      goods: [
        { left: "-9.37%", top: "-25.88%" },
        { left: "20.35%", top: "-30.33%" },
        { left: "50.07%", top: "-33.79%" },
        { left: "80.33%", top: "-39.54%" },
        { left: "-10.15%", top: "7.61%" },
        { left: "19.64%", top: "4.98%" },
        { left: "50.21%", top: "2.83%" },
        { left: "79.93%", top: "0.87%" },
        { left: "-9.76%", top: "42.09%" },
        { left: "19.65%", top: "41.44%" },
        { left: "50.5%", top: "41.12%" },
        { left: "80.26%", top: "39.95%" }
      ]
    };
    
    this.lastRefreshFloor = -1;
    this.refreshCount = 0;

    // 内部状态
    this.isOpen = false;
    this.player = null;

    // DOM 元素引用（延迟初始化）
    this.elements = {
      overlay: null,
      priceElements: {},
      leftShelf: null,
      rightShelf: null,
      refreshBtn: null,
      refreshPrice: null
    };
    
    // 引用全局 TooltipManager
    this.tooltipManager = globalTooltipManager;

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
    <div class="shop-panel">
      <!-- 标题 (可选，已在CSS中定位或隐藏) -->
      <h2 class="modal-title-shop">地精商店</h2>
      
      <!-- 左侧货架：基础服务 -->
      <div id="shop-left-shelf" class="shop-shelf">
        <!-- 基础服务将动态生成在这里 -->
      </div>

      <!-- 右侧货架：随机商品 -->
      <div id="shop-right-shelf" class="shop-shelf">
        <!-- 随机商品将动态生成在这里 -->
      </div>

      <!-- 柜台操作区：按钮 -->
      <div id="shop-counter-surface">
        <button id="btn-shop-refresh" class="btn-core" style="background: #4a3b18; border-color: #ffd700;">
          刷新 (<span id="price-refresh">100</span> G)
        </button>
        <button class="btn-core btn-modal-close" style="background: #333;">离开</button>
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
      overlay.style.zIndex = '1000';
      
      // 注入 HTML 内容
      overlay.innerHTML = this.getHTML();
      
      // 将 overlay 添加到 body（确保全屏覆盖）
      document.body.appendChild(overlay);
      this.elements.overlay = overlay;
    }
    
    // 缓存元素引用
    this.elements.leftShelf = document.getElementById('shop-left-shelf');
    this.elements.rightShelf = document.getElementById('shop-right-shelf');
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

    // 刷新按钮
    if (this.elements.refreshBtn) {
      this.elements.refreshBtn.addEventListener('click', () => this.refreshGoods());
    }

    // 事件委托：基础服务购买
    if (this.elements.leftShelf) {
      this.elements.leftShelf.addEventListener('click', (e) => {
        const itemEl = e.target.closest('.shop-good-item');
        if (itemEl && !itemEl.disabled && itemEl.dataset.serviceType) {
          this.buyService(itemEl.dataset.serviceType);
        }
      });
    }

    // 事件委托：商品购买
    if (this.elements.rightShelf) {
      this.elements.rightShelf.addEventListener('click', (e) => {
        const itemEl = e.target.closest('.shop-good-item');
        if (itemEl && !itemEl.disabled && itemEl.dataset.index !== undefined) {
          const index = parseInt(itemEl.dataset.index, 10);
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
      this.elements.overlay.classList.add('overlay-fade-in');
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
      // 生成 12 个商品 (3x4)
      this.goods = window.__lootGenerator.generateShopGoods(floor, 12);
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
    this.renderServiceItems();
    this.renderGoods();
    this.renderRefreshButton();
  }

  /**
   * 创建物品图标 canvas
   * @param {Image} img - 图标图片
   * @param {object} item - 物品数据
   * @param {number} size - 目标尺寸
   * @returns {HTMLCanvasElement}
   */
  createItemIcon(img, item, size = 64) {
    if (!img) return null;
    
    // 检查图片是否加载完成
    if (img.complete === false || img.naturalWidth === 0) {
      // 尝试添加加载监听器，以便加载完成后刷新
      if (!img.hasLoadListener) {
          img.hasLoadListener = true;
          const originalOnLoad = img.onload;
          img.onload = () => {
              if (originalOnLoad) originalOnLoad();
              // 图片加载完成后，尝试重新渲染商店
              if (window.game && window.game.shopUI && window.game.shopUI.isVisible) {
                  window.game.shopUI.renderShopGoods();
              }
          };
      }
      return null;
    }

    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    canvas.className = 'shop-good-icon';
    const ctx = canvas.getContext('2d');

    const defaultCols = ICON_GRID_COLS || 4;
    const defaultRows = ICON_GRID_ROWS || 4;
    
    let currentCols = defaultCols;
    let currentRows = defaultRows;

    // 根据物品类型确定网格布局
    if (item.type === 'GEM') {
      currentCols = 5;
      currentRows = 4;
    } else if (item.type === 'CONSUMABLE') {
      // 启发式：如果 index >= 16，假设是大网格 (e.g. 5x5)
      if (item.iconIndex >= 16) {
        currentCols = 5;
        currentRows = 5;
      }
    }

    const idxIcon = item.iconIndex || 0;
    const col = idxIcon % currentCols;
    const row = Math.floor(idxIcon / currentCols);
    
    const natW = img.naturalWidth || img.width;
    const natH = img.naturalHeight || img.height;
    const cellW = natW / currentCols;
    const cellH = natH / currentRows;

    // 使用整数像素切割
    const sx = Math.round(col * cellW);
    const sy = Math.round(row * cellH);
    const sw = Math.round(cellW);
    const sh = Math.round(cellH);

    ctx.imageSmoothingEnabled = false;

    // 保持宽高比并居中显示
    const cellAspect = sw / sh;
    let destW = size;
    let destH = size;

    if (cellAspect > 1) {
      destH = size;
      destW = size * cellAspect;
    } else if (cellAspect < 1) {
      destW = size;
      destH = size / cellAspect;
    }

    const offsetX = Math.round((size - destW) / 2);
    const offsetY = Math.round((size - destH) / 2);

    try {
        ctx.drawImage(img, sx, sy, sw, sh, offsetX, offsetY, destW, destH);
    } catch (e) {
        console.error('ShopUI: Failed to draw image', e);
        return null;
    }

    return canvas;
  }

  /**
   * 获取商品位置样式
   */
  getPositionStyle(index, type = 'services') {
      let pos = null;
      if (this.itemPositions[type] && this.itemPositions[type][index]) {
          pos = this.itemPositions[type][index];
      } else {
          // 默认 3x4 网格逻辑
          const cols = 4; // 4列
          // const rows = 3; 
          const col = index % cols;
          const row = Math.floor(index / cols);
          
          // 简单估算百分比，留有间隙
          // 宽度 ~25%
          pos = {
              left: (col * 25) + '%',
              top: (row * 33) + '%' // 3行，每行 ~33%
          };
      }
      return `left: ${pos.left}; top: ${pos.top};`;
  }

  /**
   * 渲染左货架（基础服务）
   */
  renderServiceItems() {
    const container = this.elements.leftShelf;
    if (!container) return;
    
    container.innerHTML = '';
    
    const game = window.game;
    const playerGold = game && game.player ? game.player.stats.gold : 0;
    const loader = game?.loader;
    
    // 获取图标资源 - 确保资源存在
    const imgEquip = loader?.getImage('ICONS_EQUIP');
    const imgCons = loader?.getImage('ICONS_CONSUMABLES');
    const imgGems = loader?.getImage('ICONS_GEMS'); // 新增引用
    
    if (!imgEquip || !imgCons) {
        console.warn('ShopUI: Icons not loaded yet');
    }

    // 定义基础服务元数据 (现在有7个)
    const services = [
      { 
        type: 'atk', 
        name: '攻击提升', 
        desc: '永久增加3点物理攻击力', 
        basePrice: this.shopPrices.atk,
        iconType: 'EQUIP',
        iconIndex: 0, // Sword
        stats: { p_atk: 3 }
      },
      { 
        type: 'def', 
        name: '防御提升', 
        desc: '永久增加3点物理防御力', 
        basePrice: this.shopPrices.def,
        iconType: 'EQUIP',
        iconIndex: 6, // Plate
        stats: { p_def: 3 }
      },
      { 
        type: 'matk', 
        name: '魔攻提升', 
        desc: '永久增加3点魔法攻击力', 
        basePrice: this.shopPrices.matk,
        iconType: 'EQUIP',
        iconIndex: 2, // Staff (WEAPON_STAFF_T1)
        stats: { m_atk: 3 }
      },
      { 
        type: 'mdef', 
        name: '魔防提升', 
        desc: '永久增加3点魔法防御力', 
        basePrice: this.shopPrices.mdef,
        iconType: 'EQUIP',
        iconIndex: 7, // Robe (ARMOR_ROBE_T1) - 修正为使用 EQUIP 表中的 Robe
        stats: { m_def: 3 }
      },
      { 
        type: 'hp', 
        name: '生命恢复', 
        desc: '立即恢复200点生命值', 
        basePrice: this.shopPrices.hp,
        iconType: 'CONSUMABLE',
        iconIndex: 0, // POTION_HP_S
        stats: { heal: 200 }
      },
      { 
        type: 'key', 
        name: '神秘钥匙', 
        desc: '一把通用的钥匙，用于开启宝箱或门', 
        basePrice: this.shopPrices.key,
        iconType: 'CONSUMABLE', 
        iconIndex: 20, // Drill位置? 不，Key通常没有特定图标，先用 Drill占位或查找
        // 修正：钥匙图标通常在 ITEMS 或特殊位置。
        // 暂时保持原样，或者如果没有 Key 图标，使用 drill 图标
        // 假设 Consumables index 3 是 Key (常见RPG设置)，如果没有，保持 20
        iconIndex: 3, 
        stats: { key: 1 }
      },
      {
        type: 'drill',
        name: '钻头', // 修正名称
        desc: '可以给装备打孔的工具', // 修正描述
        quality: 'COMMON', // ✅ Explicitly set quality
        basePrice: this.shopPrices.drill,
        iconType: 'CONSUMABLE',
        iconIndex: 20, // ITEM_STARDUST_DRILL
        stats: { item: 'ITEM_STARDUST_DRILL' }
      }
    ];

    services.forEach((service, index) => {
      const price = this.applyPriceModifiers(service.basePrice);
      const canAfford = playerGold >= price;
      
      const itemEl = document.createElement('div');
      itemEl.className = 'shop-good-item';
      itemEl.dataset.serviceType = service.type;
      itemEl.dataset.index = index; // 用于定位
      
      // 应用绝对定位样式
      itemEl.style.cssText = this.getPositionStyle(index, 'services');

      if (!canAfford) {
        itemEl.classList.add('disabled');
      }
      
      // 创建图标
      let img = null;
      if (service.iconType === 'EQUIP') img = imgEquip;
      else if (service.iconType === 'CONSUMABLE') img = imgCons;
      else if (service.iconType === 'GEM') img = imgGems;
      
      // ... (绘图逻辑)
      let canvas = null;
      if (img) {
        const tempItem = { 
          iconIndex: service.iconIndex, 
          type: service.iconType === 'CONSUMABLE' ? 'CONSUMABLE' : 'WEAPON' 
        };
        canvas = this.createItemIcon(img, tempItem, 64);
      }
      
      if (canvas) {
        itemEl.appendChild(canvas);
      } else {
        const placeholder = document.createElement('div');
        placeholder.style.fontSize = '32px';
        placeholder.innerText = '❓';
        itemEl.appendChild(placeholder);
      }
      
      // 价格标签
      const priceEl = document.createElement('div');
      priceEl.className = 'shop-good-price';
      priceEl.innerText = price;
      itemEl.appendChild(priceEl);
      
      container.appendChild(itemEl);
      
      // 绑定 Tooltip
      const tooltipItem = {
        nameZh: service.name,
        type: 'CONSUMABLE', 
        quality: service.quality || 'COMMON',
        rarity: service.quality || 'COMMON',
        description: service.desc,
        stats: service.stats
      };
      this.tooltipManager.bind(itemEl, tooltipItem);
    });
  }

  /**
   * 渲染右货架（随机商品）
   */
  renderGoods() {
    const container = this.elements.rightShelf;
    if (!container) return;

    container.innerHTML = '';

    const game = window.game;
    const playerGold = game && game.player ? game.player.stats.gold : 0;
    const loader = game?.loader;
    
    const imgEquip = loader?.getImage('ICONS_EQUIP');
    const imgCons = loader?.getImage('ICONS_CONSUMABLES');
    const imgGems = loader?.getImage('ICONS_GEMS');

    this.goods.forEach((item, index) => {
      if (!item) {
        // 已售出的格子，显示空占位 (不再显示“已售”文字)
        const emptyEl = document.createElement('div');
        emptyEl.className = 'shop-good-item disabled';
        emptyEl.style.cssText = this.getPositionStyle(index, 'goods') + 'opacity: 0; pointer-events: none;';
        container.appendChild(emptyEl);
        return;
      }

      const price = this.calculateItemPrice(item);
      const canAfford = playerGold >= price;
      
      const itemEl = document.createElement('div');
      itemEl.className = 'shop-good-item';
      itemEl.dataset.index = index;
      
      // 应用绝对定位样式
      itemEl.style.cssText = this.getPositionStyle(index, 'goods');
      
      if (!canAfford) {
        itemEl.classList.add('disabled');
      }

      // 确定使用的图片资源
      let img = imgEquip;
      if (item.type === 'GEM') img = imgGems;
      else if (item.type === 'CONSUMABLE') img = imgCons;
      
      // 绘制图标
      let canvas = null;
      if (img) {
        canvas = this.createItemIcon(img, item, 64);
      }
      
      if (canvas) {
        itemEl.appendChild(canvas);
      } else {
        const placeholder = document.createElement('div');
        placeholder.innerText = item.nameZh ? item.nameZh[0] : '?';
        itemEl.appendChild(placeholder);
      }
      
      // 价格标签
      const priceEl = document.createElement('div');
      priceEl.className = 'shop-good-price';
      priceEl.innerText = price;
      itemEl.appendChild(priceEl);
      
      container.appendChild(itemEl);
      
      // 绑定 Tooltip
      this.tooltipManager.bind(itemEl, item);
    });
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
    else if (type === 'matk') game.player.stats.m_atk += 3;
    else if (type === 'mdef') game.player.stats.m_def += 3;
    else if (type === 'hp') game.player.heal(200);
    else if (type === 'key') game.player.stats.keys += 1;
    else if (type === 'drill') {
        const drillItem = { 
            id: 'ITEM_STARDUST_DRILL', 
            name: '钻头', 
            type: 'CONSUMABLE', 
            iconIndex: 20,
            desc: '可以给装备打孔的工具'
        };
        // 尝试添加到背包，这里可能需要从 ItemDB 获取完整数据，但为了简化先构造
        // 最好通过 ID 查找
        // 假设 player.addToInventory 支持对象
        game.player.addToInventory(drillItem);
    }
    
    // 通胀
    if (type === 'hp') this.shopPrices.hp = Math.ceil(this.shopPrices.hp * 1.2);
    else this.shopPrices[type] = Math.ceil(this.shopPrices[type] * 1.25);
    
    // 隐藏提示框（防止点击后提示框残留）
    if (this.tooltipManager) {
      this.tooltipManager.hide();
    }

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

    // 隐藏提示框（防止点击后提示框残留）
    if (this.tooltipManager) {
      this.tooltipManager.hide();
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
