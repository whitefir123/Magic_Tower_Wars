// ForgeUI.js - 铁匠铺界面
// 独立管理铁匠铺UI的所有渲染和交互逻辑

/**
 * ForgeUI - 铁匠铺界面管理器
 * 负责渲染铁匠铺、装备强化、品质重铸等
 * 完全独立的组件，不依赖外部 DOM 操作
 */
export class ForgeUI {
  constructor(blacksmithSystem, config = {}) {
    this.blacksmithSystem = blacksmithSystem;
    
    // 样式配置对象
    this.style = {
      panelOffsetX: config.panelOffsetX || 0,
      panelOffsetY: config.panelOffsetY || 0,
      panelScale: config.panelScale || 1.0,
      fontSize: config.fontSize || 16,
      titleFontSize: config.titleFontSize || 24,
      ...config.customStyles
    };

    // 内部状态
    this.isOpen = false;
    this.player = null;
    this.selectedItem = null;
    this.selectedSlot = null;
    this.currentMode = 'enhance'; // 'enhance' 或 'socket' (强化/重铸 或 宝石镶嵌)

    // DOM 元素引用
    this.elements = {
      overlay: null,
      itemList: null,
      itemDetails: null,
      enhanceBtn: null,
      reforgeBtn: null,
      closeBtn: null
    };

    // 初始化
    this.init();
  }

  /**
   * 初始化组件
   */
  init() {
    this.createUI();
    this.setupEventListeners();
    console.log('✓ ForgeUI 已初始化', this.style);
  }

  /**
   * 创建UI结构
   */
  createUI() {
    // 检查是否已存在
    let overlay = document.getElementById('forge-overlay');
    
    if (!overlay) {
      // 创建新的 overlay
      overlay = document.createElement('div');
      overlay.id = 'forge-overlay';
      overlay.className = 'modal-overlay hidden';
      overlay.innerHTML = `
        <div class="forge-modal">
          <!-- Header -->
          <div class="forge-header">
            <h2 class="forge-title">铁匠铺</h2>
            <button class="forge-close-btn">✕</button>
          </div>

          <!-- Main Content -->
          <div class="forge-content">
            <!-- Left Panel - Equipment List -->
            <div class="forge-list-panel">
              <div class="forge-item-list" id="forge-item-list">
                <!-- Items will be generated here -->
              </div>
            </div>

            <!-- Right Panel - Item Details -->
            <div class="forge-detail-panel">
              <!-- Tab 切换 -->
              <div class="forge-tabs">
                <button class="forge-tab-btn active" data-mode="enhance">强化/重铸</button>
                <button class="forge-tab-btn" data-mode="socket">宝石镶嵌</button>
              </div>
              
              <div id="forge-item-details" class="forge-item-details">
                <p class="forge-placeholder">选择一件装备来查看详情</p>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div class="forge-footer">
            <button class="btn-core btn-modal-close forge-close-footer">关闭</button>
          </div>
        </div>
      `;
      
      document.body.appendChild(overlay);
      
      // 添加样式
      this.injectStyles();
    }

    // 缓存元素引用
    this.elements.overlay = overlay;
    this.elements.itemList = document.getElementById('forge-item-list');
    this.elements.itemDetails = document.getElementById('forge-item-details');
    this.elements.closeBtn = overlay.querySelector('.forge-close-btn');
    this.elements.closeFooterBtn = overlay.querySelector('.forge-close-footer');
  }

  /**
   * 注入样式
   */
  injectStyles() {
    // 检查是否已经注入过样式
    if (document.getElementById('forge-ui-styles')) return;

    const style = document.createElement('style');
    style.id = 'forge-ui-styles';
    style.textContent = `
      .forge-modal {
        position: relative;
        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
        border: 3px solid #d4af37;
        border-radius: 12px;
        width: 90%;
        max-width: 900px;
        max-height: 80vh;
        display: flex;
        flex-direction: column;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.8);
      }

      .forge-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 20px 30px;
        border-bottom: 2px solid #d4af37;
        background: rgba(212, 175, 55, 0.1);
      }

      .forge-title {
        font-family: 'Cinzel', serif;
        font-size: 28px;
        font-weight: 700;
        color: #d4af37;
        margin: 0;
        text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
      }

      .forge-close-btn {
        background: rgba(255, 255, 255, 0.1);
        border: 2px solid #d4af37;
        color: #d4af37;
        font-size: 24px;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        cursor: pointer;
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .forge-close-btn:hover {
        background: #d4af37;
        color: #1a1a2e;
        transform: rotate(90deg);
      }

      .forge-content {
        display: flex;
        gap: 20px;
        padding: 20px;
        flex: 1;
        overflow: hidden;
      }

      .forge-list-panel {
        flex: 1;
        min-width: 300px;
        display: flex;
        flex-direction: column;
        background: rgba(0, 0, 0, 0.3);
        border: 2px solid rgba(212, 175, 55, 0.3);
        border-radius: 8px;
        padding: 15px;
      }

      .forge-detail-panel {
        flex: 1.5;
        display: flex;
        flex-direction: column;
        background: rgba(0, 0, 0, 0.3);
        border: 2px solid rgba(212, 175, 55, 0.3);
        border-radius: 8px;
        padding: 20px;
      }

      .panel-subtitle {
        font-family: 'Cinzel', serif;
        font-size: 18px;
        color: #d4af37;
        margin: 15px 0;
        text-align: center;
      }

      .forge-list-divider {
        height: 2px;
        background: linear-gradient(90deg, transparent, rgba(212, 175, 55, 0.5), transparent);
        margin: 15px 0;
      }

      .forge-item-list {
        display: flex;
        flex-direction: column;
        gap: 10px;
        overflow-y: auto;
        max-height: 400px;
      }

      .forge-item-card {
        background: rgba(255, 255, 255, 0.05);
        border: 2px solid rgba(212, 175, 55, 0.3);
        border-radius: 6px;
        padding: 12px;
        cursor: pointer;
        transition: all 0.3s ease;
      }

      .forge-item-card:hover {
        background: rgba(212, 175, 55, 0.2);
        border-color: #d4af37;
        transform: translateX(5px);
      }

      .forge-item-card.selected {
        background: rgba(212, 175, 55, 0.3);
        border-color: #d4af37;
        box-shadow: 0 0 15px rgba(212, 175, 55, 0.5);
      }

      .forge-item-name {
        font-size: 16px;
        font-weight: 600;
        margin-bottom: 5px;
      }

      .forge-item-type {
        font-size: 12px;
        color: #aaa;
        text-transform: uppercase;
      }

      .forge-item-details {
        display: flex;
        flex-direction: column;
        gap: 20px;
      }

      .forge-placeholder {
        text-align: center;
        color: #888;
        font-size: 16px;
        margin-top: 50px;
      }

      .detail-section {
        background: rgba(0, 0, 0, 0.3);
        border: 1px solid rgba(212, 175, 55, 0.3);
        border-radius: 6px;
        padding: 15px;
      }

      .detail-section h4 {
        font-family: 'Cinzel', serif;
        font-size: 18px;
        color: #d4af37;
        margin: 0 0 10px 0;
      }

      .stat-row {
        display: flex;
        justify-content: space-between;
        padding: 5px 0;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      }

      .stat-row:last-child {
        border-bottom: none;
      }

      .stat-label {
        color: #aaa;
      }

      .stat-value {
        color: #fff;
        font-weight: 600;
      }

      .forge-actions {
        display: flex;
        gap: 10px;
        margin-top: 20px;
      }

      .forge-btn {
        flex: 1;
        padding: 12px 20px;
        font-size: 16px;
        font-weight: 600;
        border: 2px solid #d4af37;
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.3s ease;
        text-transform: uppercase;
      }

      .forge-btn-enhance {
        background: linear-gradient(135deg, #4a90e2 0%, #357abd 100%);
        color: #fff;
      }

      .forge-btn-enhance:hover:not(:disabled) {
        background: linear-gradient(135deg, #357abd 0%, #2868a8 100%);
        transform: translateY(-2px);
        box-shadow: 0 5px 15px rgba(74, 144, 226, 0.4);
      }

      .forge-btn-reforge {
        background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
        color: #fff;
      }

      .forge-btn-reforge {
        background: linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%);
        color: #fff;
      }

      .forge-btn-reforge:hover:not(:disabled) {
        background: linear-gradient(135deg, #8e44ad 0%, #7d3c98 100%);
        transform: translateY(-2px);
        box-shadow: 0 5px 15px rgba(155, 89, 182, 0.4);
      }

      .forge-btn-dismantle {
        background: linear-gradient(135deg, #c0392b 0%, #e74c3c 100%);
        color: #fff;
      }

      .forge-btn-dismantle:hover:not(:disabled) {
        background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
        transform: translateY(-2px);
        box-shadow: 0 5px 15px rgba(231, 76, 60, 0.4);
      }

      .forge-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
        transform: none;
      }

      .forge-footer {
        display: flex;
        justify-content: center;
        padding: 20px;
        border-top: 2px solid #d4af37;
        background: rgba(212, 175, 55, 0.1);
      }

      .forge-close-footer {
        padding: 12px 40px;
      }

      /* 滚动条样式 */
      .forge-item-list::-webkit-scrollbar {
        width: 8px;
      }

      .forge-item-list::-webkit-scrollbar-track {
        background: rgba(0, 0, 0, 0.3);
        border-radius: 4px;
      }

      .forge-item-list::-webkit-scrollbar-thumb {
        background: rgba(212, 175, 55, 0.5);
        border-radius: 4px;
      }

      .forge-item-list::-webkit-scrollbar-thumb:hover {
        background: rgba(212, 175, 55, 0.8);
      }

      /* Tab 切换样式 */
      .forge-tabs {
        display: flex;
        gap: 10px;
        margin-bottom: 20px;
        border-bottom: 2px solid rgba(212, 175, 55, 0.3);
      }

      .forge-tab-btn {
        flex: 1;
        padding: 12px 20px;
        font-size: 16px;
        font-weight: 600;
        background: rgba(0, 0, 0, 0.3);
        border: 2px solid rgba(212, 175, 55, 0.3);
        border-bottom: none;
        border-radius: 6px 6px 0 0;
        color: #aaa;
        cursor: pointer;
        transition: all 0.3s ease;
        text-transform: uppercase;
      }

      .forge-tab-btn:hover {
        background: rgba(212, 175, 55, 0.1);
        color: #d4af37;
      }

      .forge-tab-btn.active {
        background: rgba(212, 175, 55, 0.2);
        border-color: #d4af37;
        color: #d4af37;
        border-bottom: 2px solid rgba(0, 0, 0, 0.3);
        margin-bottom: -2px;
      }

      /* 宝石镶嵌面板样式 */
      .socket-panel {
        display: flex;
        flex-direction: column;
        gap: 15px;
      }

      .socket-list {
        display: flex;
        flex-wrap: wrap;
        gap: 15px;
        margin-top: 10px;
      }

      .socket-slot {
        position: relative;
        width: 80px;
        height: 80px;
        background: rgba(0, 0, 0, 0.5);
        border: 2px solid rgba(212, 175, 55, 0.5);
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.3s ease;
      }

      .socket-slot:hover {
        border-color: #d4af37;
        background: rgba(212, 175, 55, 0.1);
        transform: scale(1.05);
      }

      .socket-slot.empty {
        border-style: dashed;
      }

      .socket-slot.filled {
        border-style: solid;
      }

      .socket-slot img {
        width: 60px;
        height: 60px;
        image-rendering: pixelated;
      }

      .socket-slot-label {
        position: absolute;
        bottom: 2px;
        left: 50%;
        transform: translateX(-50%);
        font-size: 10px;
        color: #aaa;
        background: rgba(0, 0, 0, 0.7);
        padding: 2px 4px;
        border-radius: 3px;
      }

      .socket-unsocket-btn {
        position: absolute;
        top: -8px;
        right: -8px;
        width: 24px;
        height: 24px;
        background: rgba(231, 76, 60, 0.9);
        border: 2px solid #e74c3c;
        border-radius: 50%;
        color: #fff;
        font-size: 14px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.3s ease;
      }

      .socket-unsocket-btn:hover {
        background: #e74c3c;
        transform: scale(1.1);
      }

      /* 宝石选择模态框 */
      .gem-select-modal {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
        border: 3px solid #d4af37;
        border-radius: 12px;
        padding: 20px;
        z-index: 10001;
        max-width: 500px;
        max-height: 70vh;
        overflow-y: auto;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.8);
      }

      .gem-select-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 15px;
        padding-bottom: 10px;
        border-bottom: 2px solid rgba(212, 175, 55, 0.3);
      }

      .gem-select-title {
        font-family: 'Cinzel', serif;
        font-size: 20px;
        color: #d4af37;
        margin: 0;
      }

      .gem-select-close {
        background: rgba(255, 255, 255, 0.1);
        border: 2px solid #d4af37;
        color: #d4af37;
        font-size: 20px;
        width: 30px;
        height: 30px;
        border-radius: 50%;
        cursor: pointer;
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .gem-select-close:hover {
        background: #d4af37;
        color: #1a1a2e;
      }

      .gem-list {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
        gap: 10px;
      }

      .gem-item {
        position: relative;
        width: 80px;
        height: 80px;
        background: rgba(0, 0, 0, 0.5);
        border: 2px solid rgba(212, 175, 55, 0.5);
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.3s ease;
      }

      .gem-item:hover {
        border-color: #d4af37;
        background: rgba(212, 175, 55, 0.1);
        transform: scale(1.1);
      }

      .gem-item img {
        width: 60px;
        height: 60px;
        image-rendering: pixelated;
      }

      .gem-item-name {
        position: absolute;
        bottom: -20px;
        left: 50%;
        transform: translateX(-50%);
        font-size: 10px;
        color: #aaa;
        white-space: nowrap;
      }
    `;
    
    document.head.appendChild(style);
  }

  /**
   * 设置事件监听器
   */
  setupEventListeners() {
    if (!this.elements.overlay) return;

    // 关闭按钮
    if (this.elements.closeBtn) {
      this.elements.closeBtn.addEventListener('click', () => this.close());
    }
    
    if (this.elements.closeFooterBtn) {
      this.elements.closeFooterBtn.addEventListener('click', () => this.close());
    }

    // 点击 overlay 外部关闭
    this.elements.overlay.addEventListener('click', (e) => {
      if (e.target === this.elements.overlay) {
        this.close();
      }
    });

    // Tab 切换事件
    const tabButtons = this.elements.overlay.querySelectorAll('.forge-tab-btn');
    tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const mode = btn.dataset.mode;
        this.switchMode(mode);
      });
    });
  }

  /**
   * 打开铁匠铺界面
   */
  open() {
    if (!this.elements.overlay) {
      this.createUI();
    }

    const game = window.game;
    if (game) {
      game.isPaused = true;
      game.inputStack = [];
      this.player = game.player;
    }

    this.elements.overlay.classList.remove('hidden');
    this.elements.overlay.style.display = 'flex';
    this.isOpen = true;
    
    // 重置模式为强化/重铸
    this.currentMode = 'enhance';
    this.switchMode('enhance');

    // 渲染装备列表
    this.renderItemList();

    console.log('✓ ForgeUI 已打开');
  }

  /**
   * 关闭铁匠铺界面
   */
  close() {
    if (this.elements.overlay) {
      this.elements.overlay.classList.add('hidden');
      this.elements.overlay.style.display = 'none';
      this.isOpen = false;

      // 恢复游戏
      const game = window.game;
      if (game) {
        game.isPaused = false;
      }

      // 清除选中状态
      this.selectedItem = null;
      this.selectedSlot = null;

      console.log('✓ ForgeUI 已关闭');
    }
  }

  /**
   * 渲染装备列表（包括已装备和背包中的装备）
   */
  renderItemList() {
    if (!this.elements.itemList || !this.player) return;

    this.elements.itemList.innerHTML = '';

    // 导入装备数据库
    import('../constants.js').then(module => {
      const EQUIPMENT_DB = module.EQUIPMENT_DB;
      
      let hasItems = false;

      // === 第一部分：已装备物品 ===
      const equippedItems = this.player.equipment || {};
      const slots = ['WEAPON', 'ARMOR', 'HELM', 'BOOTS', 'RING', 'AMULET', 'ACCESSORY'];
      
      // 添加标题
      const equippedTitle = document.createElement('h3');
      equippedTitle.className = 'panel-subtitle';
      equippedTitle.textContent = '已装备物品';
      this.elements.itemList.appendChild(equippedTitle);

      slots.forEach(slot => {
        const equippedItem = equippedItems[slot];
        if (equippedItem) {
          // 获取物品实例对象（兼容旧代码）
          let itemInstance = null;
          
          if (typeof equippedItem === 'string') {
            // 旧代码：从数据库获取并创建实例
            const itemDef = EQUIPMENT_DB[equippedItem];
            if (!itemDef) return;
            
            itemInstance = {
              itemId: equippedItem,
              uid: `${equippedItem}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              quality: itemDef.quality || 'COMMON',
              enhanceLevel: itemDef.enhanceLevel || 0,
              stats: itemDef.stats ? { ...itemDef.stats } : {},
              baseStats: itemDef.baseStats || (itemDef.stats ? { ...itemDef.stats } : {}),
              ...itemDef
            };
            
            // 更新装备栏中的引用为实例对象
            this.player.equipment[slot] = itemInstance;
          } else if (typeof equippedItem === 'object') {
            // 新代码：直接使用实例对象
            itemInstance = equippedItem;
          }
          
          if (itemInstance) {
            hasItems = true;
            
            // 初始化装备（如果需要）
            this.blacksmithSystem.initializeItem(itemInstance);
            
            const itemCard = this.createItemCard(itemInstance, slot, 'equipped');
            this.elements.itemList.appendChild(itemCard);
          }
        }
      });

      // === 第二部分：背包物品 ===
      const inventory = this.player.inventory || [];
      const inventoryItems = [];
      
      inventory.forEach((item, index) => {
        if (item && typeof item === 'object' && item.type !== 'CONSUMABLE') {
          inventoryItems.push({ item, index });
        }
      });

      if (inventoryItems.length > 0) {
        // 添加分割线和标题
        const divider = document.createElement('div');
        divider.className = 'forge-list-divider';
        this.elements.itemList.appendChild(divider);
        
        const inventoryTitle = document.createElement('h3');
        inventoryTitle.className = 'panel-subtitle';
        inventoryTitle.textContent = '背包物品';
        this.elements.itemList.appendChild(inventoryTitle);

        inventoryItems.forEach(({ item, index }) => {
          hasItems = true;
          
          // 初始化装备（如果需要）
          this.blacksmithSystem.initializeItem(item);
          
          const itemCard = this.createItemCard(item, `inventory_${index}`, 'inventory');
          this.elements.itemList.appendChild(itemCard);
        });
      }

      if (!hasItems) {
        this.elements.itemList.innerHTML = '<p class="forge-placeholder">没有可操作的装备</p>';
      }
    });
  }

  /**
   * 创建物品卡片
   * @param {Object} itemInstance - 物品实例对象
   * @param {string} slot - 槽位标识
   * @param {string} source - 来源 ('equipped' 或 'inventory')
   * @returns {HTMLElement} 物品卡片元素
   */
  createItemCard(itemInstance, slot, source) {
    const itemCard = document.createElement('div');
    itemCard.className = 'forge-item-card';
    itemCard.dataset.slot = slot;
    itemCard.dataset.source = source;
    itemCard.dataset.itemId = itemInstance.itemId || itemInstance.id;
    itemCard.dataset.uid = itemInstance.uid || itemInstance.id;
    
    const itemName = this.blacksmithSystem.getItemDisplayName(itemInstance);
    const itemColor = this.blacksmithSystem.getItemQualityColor(itemInstance);
    
    const slotLabel = source === 'equipped' 
      ? this.getSlotName(slot)
      : '背包';
    
    itemCard.innerHTML = `
      <div class="forge-item-name" style="color: ${itemColor};">${itemName}</div>
      <div class="forge-item-type">${slotLabel}</div>
    `;
    
    itemCard.addEventListener('click', () => this.selectItem(itemInstance, slot, itemCard));
    
    return itemCard;
  }

  /**
   * 选择装备
   */
  selectItem(item, slot, cardElement) {
    this.selectedItem = item;
    this.selectedSlot = slot;

    // 更新选中状态
    const allCards = this.elements.itemList.querySelectorAll('.forge-item-card');
    allCards.forEach(card => card.classList.remove('selected'));
    cardElement.classList.add('selected');

    // 渲染装备详情
    this.renderItemDetails(item);
  }

  /**
   * 切换模式（强化/重铸 或 宝石镶嵌）
   */
  switchMode(mode) {
    this.currentMode = mode;
    
    // 更新 Tab 按钮状态
    const tabButtons = this.elements.overlay.querySelectorAll('.forge-tab-btn');
    tabButtons.forEach(btn => {
      if (btn.dataset.mode === mode) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
    
    // 重新渲染详情面板
    if (this.selectedItem) {
      this.renderItemDetails(this.selectedItem);
    }
  }

  /**
   * 渲染装备详情
   */
  renderItemDetails(item) {
    if (!this.elements.itemDetails || !item) return;

    if (this.currentMode === 'socket') {
      this.renderSocketPanel(item);
    } else {
      this.renderEnhancePanel(item);
    }
  }

  /**
   * 渲染强化/重铸面板
   */
  renderEnhancePanel(item) {
    const details = this.blacksmithSystem.getItemDetails(item);
    
    this.elements.itemDetails.innerHTML = `
      <div class="detail-section">
        <h4 style="color: ${details.qualityColor};">${details.name}</h4>
        <div class="stat-row">
          <span class="stat-label">品质:</span>
          <span class="stat-value" style="color: ${details.qualityColor};">${details.quality}</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">强化等级:</span>
          <span class="stat-value">+${details.enhanceLevel} / +${details.maxLevel}</span>
        </div>
      </div>

      <div class="detail-section">
        <h4>当前属性</h4>
        ${this.renderStats(details.stats)}
      </div>

      <div class="detail-section">
        <h4>基础属性</h4>
        ${this.renderStats(details.baseStats)}
      </div>

      <div class="forge-actions">
        <button class="forge-btn forge-btn-enhance" id="forge-enhance-btn" ${!details.canEnhance ? 'disabled' : ''}>
          强化 (+${details.enhanceLevel + 1})<br>
          <small>费用: ${details.enhanceCost} 金币</small>
        </button>
        <button class="forge-btn forge-btn-reforge" id="forge-reforge-btn">
          重铸品质<br>
          <small>费用: ${details.reforgeCost} 金币</small>
        </button>
        <button class="forge-btn forge-btn-dismantle" id="forge-dismantle-btn">
          分解<br>
          <small>获得: ${details.dismantleValue} 金币</small>
        </button>
      </div>
    `;

    // 添加按钮事件监听器
    const enhanceBtn = document.getElementById('forge-enhance-btn');
    const reforgeBtn = document.getElementById('forge-reforge-btn');
    const dismantleBtn = document.getElementById('forge-dismantle-btn');

    if (enhanceBtn) {
      enhanceBtn.addEventListener('click', () => this.handleEnhance());
    }

    if (reforgeBtn) {
      reforgeBtn.addEventListener('click', () => this.handleReforge());
    }

    if (dismantleBtn) {
      dismantleBtn.addEventListener('click', () => this.handleDismantle());
    }
  }

  /**
   * 渲染宝石镶嵌面板
   */
  renderSocketPanel(item) {
    const game = window.game;
    const loader = game?.loader;
    const sockets = item.meta?.sockets || [];
    
    // 获取装备图标
    let itemIconHtml = '';
    if (loader) {
      const equipImg = loader.getImage('ICONS_EQUIP');
      if (equipImg && equipImg.complete) {
        const iconIndex = item.iconIndex || 0;
        const cols = 4; // 装备图标图集列数
        const cellW = equipImg.width / cols;
        const cellH = equipImg.height / 4; // 假设4行
        const col = iconIndex % cols;
        const row = Math.floor(iconIndex / cols);
        
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(equipImg, col * cellW, row * cellH, cellW, cellH, 0, 0, 64, 64);
        itemIconHtml = canvas.outerHTML;
      }
    }
    
    const itemName = this.blacksmithSystem.getItemDisplayName(item);
    const itemColor = this.blacksmithSystem.getItemQualityColor(item);
    
    let socketHtml = '';
    if (sockets.length === 0) {
      socketHtml = '<p class="forge-placeholder">该装备没有镶嵌槽</p>';
    } else {
      socketHtml = '<div class="socket-list">';
      sockets.forEach((socket, index) => {
        socketHtml += this.renderSocketSlot(socket, index, loader);
      });
      socketHtml += '</div>';
    }
    
    this.elements.itemDetails.innerHTML = `
      <div class="detail-section">
        <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 15px;">
          ${itemIconHtml}
          <div>
            <h4 style="color: ${itemColor}; margin: 0;">${itemName}</h4>
            <div style="font-size: 12px; color: #aaa; margin-top: 5px;">
              镶嵌槽: ${sockets.length} 个
            </div>
          </div>
        </div>
      </div>

      <div class="detail-section socket-panel">
        <h4>镶嵌槽位</h4>
        ${socketHtml}
      </div>
    `;
    
    // 绑定 socket 点击事件
    this.bindSocketEvents(item);
  }

  /**
   * 渲染单个 socket 槽位
   */
  renderSocketSlot(socket, index, loader) {
    const socketImg = loader?.getImage('UI_SOCKET');
    let socketBgHtml = '';
    
    if (socketImg && socketImg.complete) {
      const canvas = document.createElement('canvas');
      canvas.width = 80;
      canvas.height = 80;
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(socketImg, 0, 0, 80, 80);
      socketBgHtml = canvas.outerHTML;
    }
    
    if (socket.status === 'FILLED' && socket.gemId) {
      // 已镶嵌：显示宝石图标
      const gemImg = loader?.getImage('ICONS_GEMS');
      let gemIconHtml = '<canvas class="gem-icon" width="60" height="60"></canvas>';
      
      // 异步加载宝石图标（在渲染后更新）
      if (gemImg && gemImg.complete) {
        import('../constants.js').then(module => {
          const EQUIPMENT_DB = module.EQUIPMENT_DB;
          const gemDef = EQUIPMENT_DB[socket.gemId];
          if (gemDef) {
            const iconIndex = gemDef.iconIndex || 0;
            const cols = 5; // ✅ 宝石图集5列（与 items.js 中的定义一致）
            const rows = 4; // ✅ 宝石图集4行
            const cellW = Math.floor(gemImg.width / cols); // ✅ 使用整数像素，保持清晰度
            const cellH = Math.floor(gemImg.height / rows);
            const col = iconIndex % cols; // ✅ 计算列索引（0-4）
            const row = Math.floor(iconIndex / cols); // ✅ 计算行索引（0-3）
            
            // ✅ 使用整数像素坐标，防止模糊
            const sx = Math.round(col * cellW);
            const sy = Math.round(row * cellH);
            const sw = cellW;
            const sh = cellH;
            
            const canvas = document.createElement('canvas');
            canvas.width = 60;
            canvas.height = 60;
            const ctx = canvas.getContext('2d');
            ctx.imageSmoothingEnabled = false; // ✅ 确保像素风格清晰
            ctx.drawImage(gemImg, sx, sy, sw, sh, 0, 0, 60, 60);
            
            const socketElement = document.querySelector(`[data-socket-index="${index}"]`);
            if (socketElement) {
              const gemIcon = socketElement.querySelector('.gem-icon');
              if (gemIcon) {
                gemIcon.replaceWith(canvas);
              }
            }
          }
        });
      } else if (gemImg) {
        // 图片未加载完成，等待加载
        gemImg.onload = () => {
          import('../constants.js').then(module => {
            const EQUIPMENT_DB = module.EQUIPMENT_DB;
            const gemDef = EQUIPMENT_DB[socket.gemId];
            if (gemDef) {
              const iconIndex = gemDef.iconIndex || 0;
              const cols = 5;
              const rows = 4;
              const cellW = Math.floor(gemImg.width / cols);
              const cellH = Math.floor(gemImg.height / rows);
              const col = iconIndex % cols;
              const row = Math.floor(iconIndex / cols);
              
              const sx = Math.round(col * cellW);
              const sy = Math.round(row * cellH);
              const sw = cellW;
              const sh = cellH;
              
              const canvas = document.createElement('canvas');
              canvas.width = 60;
              canvas.height = 60;
              const ctx = canvas.getContext('2d');
              ctx.imageSmoothingEnabled = false;
              ctx.drawImage(gemImg, sx, sy, sw, sh, 0, 0, 60, 60);
              
              const socketElement = document.querySelector(`[data-socket-index="${index}"]`);
              if (socketElement) {
                const gemIcon = socketElement.querySelector('.gem-icon');
                if (gemIcon) {
                  gemIcon.replaceWith(canvas);
                }
              }
            }
          });
        };
      }
      
      return `
        <div class="socket-slot filled" data-socket-index="${index}" data-gem-id="${socket.gemId}">
          ${socketBgHtml}
          ${gemIconHtml}
          <button class="socket-unsocket-btn" data-socket-index="${index}">×</button>
          <div class="socket-slot-label">槽位 ${index + 1}</div>
        </div>
      `;
    } else {
      // 空槽位
      return `
        <div class="socket-slot empty" data-socket-index="${index}">
          ${socketBgHtml}
          <div style="text-align: center; color: #888; font-size: 12px;">空槽位</div>
          <div class="socket-slot-label">槽位 ${index + 1}</div>
        </div>
      `;
    }
  }

  /**
   * 绑定 socket 事件
   */
  bindSocketEvents(item) {
    const game = window.game;
    const tooltipManager = game?.tooltipManager;
    
    // 空槽位点击事件
    const emptySockets = this.elements.itemDetails.querySelectorAll('.socket-slot.empty');
    emptySockets.forEach(socket => {
      socket.addEventListener('click', () => {
        const index = parseInt(socket.dataset.socketIndex);
        this.showGemSelectModal(item, index);
      });
    });
    
    // 已镶嵌槽位的拆除按钮
    const unsocketBtns = this.elements.itemDetails.querySelectorAll('.socket-unsocket-btn');
    unsocketBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation(); // 阻止事件冒泡
        const index = parseInt(btn.dataset.socketIndex);
        this.handleUnsocket(item, index);
      });
    });
    
    // 已镶嵌槽位的 tooltip
    const filledSockets = this.elements.itemDetails.querySelectorAll('.socket-slot.filled');
    filledSockets.forEach(socket => {
      const gemId = socket.dataset.gemId;
      if (gemId && tooltipManager) {
        tooltipManager.bind(socket, gemId);
      }
    });
  }

  /**
   * 显示宝石选择模态框
   */
  showGemSelectModal(item, socketIndex) {
    if (!this.player) return;
    
    // 获取背包中的宝石
    const gems = this.player.inventory.filter(invItem => 
      invItem && invItem.type === 'GEM'
    );
    
    if (gems.length === 0) {
      this.showMessage('背包中没有宝石', 'error');
      return;
    }
    
    // 创建模态框
    const modal = document.createElement('div');
    modal.className = 'gem-select-modal';
    modal.innerHTML = `
      <div class="gem-select-header">
        <h3 class="gem-select-title">选择宝石</h3>
        <button class="gem-select-close">×</button>
      </div>
      <div class="gem-list" id="gem-list">
        ${this.renderGemList(gems)}
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // 关闭按钮
    const closeBtn = modal.querySelector('.gem-select-close');
    closeBtn.addEventListener('click', () => {
      document.body.removeChild(modal);
    });
    
    // 点击外部关闭
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        document.body.removeChild(modal);
      }
    });
    
    // 宝石点击事件
    const gemItemElements = modal.querySelectorAll('.gem-item');
    gemItemElements.forEach(gemElement => {
      gemElement.addEventListener('click', () => {
        const gemIndex = parseInt(gemElement.dataset.gemIndex);
        const selectedGem = gems[gemIndex];
        this.handleSocket(item, socketIndex, selectedGem);
        document.body.removeChild(modal);
      });
    });
  }

  /**
   * 渲染宝石列表
   */
  renderGemList(gems) {
    const game = window.game;
    const loader = game?.loader;
    const gemImg = loader?.getImage('ICONS_GEMS');
    
    return gems.map((gem, index) => {
      let gemIconHtml = '<div style="width: 60px; height: 60px; background: rgba(255,255,255,0.1); border-radius: 4px;"></div>';
      
      if (gemImg && gemImg.complete) {
        const iconIndex = gem.iconIndex || 0;
        const cols = 5; // ✅ 宝石图集5列（与 items.js 中的定义一致）
        const rows = 4; // ✅ 宝石图集4行
        const cellW = Math.floor(gemImg.width / cols); // ✅ 使用整数像素
        const cellH = Math.floor(gemImg.height / rows);
        const col = iconIndex % cols; // ✅ 计算列索引（0-4）
        const row = Math.floor(iconIndex / cols); // ✅ 计算行索引（0-3）
        
        // ✅ 使用整数像素坐标，防止模糊
        const sx = Math.round(col * cellW);
        const sy = Math.round(row * cellH);
        const sw = cellW;
        const sh = cellH;
        
        const canvas = document.createElement('canvas');
        canvas.width = 60;
        canvas.height = 60;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = false; // ✅ 确保像素风格清晰
        ctx.drawImage(gemImg, sx, sy, sw, sh, 0, 0, 60, 60);
        gemIconHtml = canvas.outerHTML;
      } else if (gemImg) {
        // 图片未加载完成，等待加载
        gemImg.onload = () => {
          const iconIndex = gem.iconIndex || 0;
          const cols = 5;
          const rows = 4;
          const cellW = Math.floor(gemImg.width / cols);
          const cellH = Math.floor(gemImg.height / rows);
          const col = iconIndex % cols;
          const row = Math.floor(iconIndex / cols);
          
          const sx = Math.round(col * cellW);
          const sy = Math.round(row * cellH);
          const sw = cellW;
          const sh = cellH;
          
          const canvas = document.createElement('canvas');
          canvas.width = 60;
          canvas.height = 60;
          const ctx = canvas.getContext('2d');
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(gemImg, sx, sy, sw, sh, 0, 0, 60, 60);
          
          const gemElement = document.querySelector(`[data-gem-index="${index}"]`);
          if (gemElement) {
            const placeholder = gemElement.querySelector('div');
            if (placeholder) {
              placeholder.replaceWith(canvas);
            }
          }
        };
      }
      
      const gemName = gem.nameZh || gem.name || '未知宝石';
      
      return `
        <div class="gem-item" data-gem-index="${index}">
          ${gemIconHtml}
          <div class="gem-item-name">${gemName}</div>
        </div>
      `;
    }).join('');
  }

  /**
   * 处理镶嵌
   */
  handleSocket(item, socketIndex, gemItem) {
    if (!this.player || !item || !gemItem) return;
    
    const result = this.blacksmithSystem.socketGem(item, socketIndex, gemItem, this.player);
    
    if (result.success) {
      this.showMessage(result.message, 'success');
      this.renderItemDetails(item);
      
      // 更新游戏UI
      const game = window.game;
      if (game && game.ui) {
        game.ui.updateStats(this.player);
        game.ui.updateEquipmentSockets(this.player);
      }
    } else {
      this.showMessage(result.message, 'error');
    }
  }

  /**
   * 处理拆除
   */
  handleUnsocket(item, socketIndex) {
    if (!this.player || !item) return;
    
    const unsocketCost = 200; // 拆除费用
    
    if (this.player.stats.gold < unsocketCost) {
      this.showMessage(`金币不足！需要 ${unsocketCost} 金币`, 'error');
      return;
    }
    
    if (!confirm(`确定要拆除宝石吗？\n费用: ${unsocketCost} 金币`)) {
      return;
    }
    
    const result = this.blacksmithSystem.unsocketGem(item, socketIndex, this.player, unsocketCost);
    
    if (result.success) {
      this.showMessage(result.message, 'success');
      this.renderItemDetails(item);
      
      // 更新游戏UI
      const game = window.game;
      if (game && game.ui) {
        game.ui.updateStats(this.player);
        game.ui.updateEquipmentSockets(this.player);
        game.ui.renderInventory?.(this.player);
      }
    } else {
      this.showMessage(result.message, 'error');
    }
  }

  /**
   * 渲染属性列表
   */
  renderStats(stats) {
    if (!stats || Object.keys(stats).length === 0) {
      return '<p class="forge-placeholder">无属性</p>';
    }

    const statNames = {
      p_atk: '物理攻击',
      m_atk: '魔法攻击',
      p_def: '物理防御',
      m_def: '魔法防御',
      hp: '生命值',
      maxHp: '最大生命值'
    };

    return Object.entries(stats)
      .map(([key, value]) => `
        <div class="stat-row">
          <span class="stat-label">${statNames[key] || key}:</span>
          <span class="stat-value">+${value}</span>
        </div>
      `)
      .join('');
  }

  /**
   * 处理强化
   */
  handleEnhance() {
    if (!this.selectedItem || !this.player) return;

    const result = this.blacksmithSystem.enhanceItem(this.selectedItem, this.player);

    if (result.success) {
      // 显示成功消息
      this.showMessage(result.message, 'success');
      
      // 更新UI
      this.renderItemList();
      this.renderItemDetails(this.selectedItem);
      
      // 更新游戏UI
      const game = window.game;
      if (game && game.ui) {
        game.ui.updateStats(this.player);
      }
    } else {
      // 显示失败消息
      this.showMessage(result.message, 'error');
    }
  }

  /**
   * 处理重铸
   */
  handleReforge() {
    if (!this.selectedItem || !this.player) return;

    const result = this.blacksmithSystem.reforgeItem(this.selectedItem, this.player);

    if (result.success) {
      // 显示成功消息
      this.showMessage(result.message, 'success');
      
      // 更新UI
      this.renderItemList();
      this.renderItemDetails(this.selectedItem);
      
      // 更新游戏UI
      const game = window.game;
      if (game && game.ui) {
        game.ui.updateStats(this.player);
      }
    } else {
      // 显示失败消息
      this.showMessage(result.message, 'error');
    }
  }

  /**
   * 处理分解
   */
  handleDismantle() {
    if (!this.selectedItem || !this.player) return;

    const itemName = this.blacksmithSystem.getItemDisplayName(this.selectedItem);
    const dismantleValue = this.blacksmithSystem.calculateDismantleValue(this.selectedItem);
    
    // 检查是否为高价值装备，使用更醒目的提示
    const enhanceLevel = this.selectedItem.enhanceLevel || 0;
    const quality = this.selectedItem.quality || 'COMMON';
    const isHighValue = enhanceLevel >= 10 || quality === 'LEGENDARY' || quality === 'MYTHIC';
    
    let confirmMessage = '';
    if (isHighValue) {
      confirmMessage = `⚠️ 警告：确定要分解 [${itemName}] 吗？\n\n将获得 ${dismantleValue} 金币。\n\n此操作无法撤销！`;
    } else {
      confirmMessage = `确定要分解 [${itemName}] 吗？\n\n将获得 ${dismantleValue} 金币。\n\n此操作无法撤销！`;
    }
    
    if (!confirm(confirmMessage)) {
      return;
    }

    const result = this.blacksmithSystem.dismantleItem(this.selectedItem, this.player);

    if (result.success) {
      // 播放音效
      const game = window.game;
      if (game && game.audio) {
        if (game.audio.playCoins) {
          game.audio.playCoins();
        } else if (game.audio.playMetalClick) {
          game.audio.playMetalClick();
        }
      }
      
      // 显示浮动文字
      if (game && game.floatingTextPool) {
        const canvas = game.canvas;
        const text = game.floatingTextPool.create(
          canvas.width / 2,
          canvas.height / 2,
          `+${result.value} 金币`,
          '#ffd700', // 黄色
          null,
          0
        );
        if (game.floatingTexts) {
          game.floatingTexts.push(text);
        }
      }
      
      // 显示成功消息
      this.showMessage(result.message, 'success');
      
      // 刷新UI
      this.selectedItem = null;
      this.selectedSlot = null;
      this.renderItemList();
      this.renderItemDetails(null);
      
      // 更新游戏UI
      if (game && game.ui) {
        game.ui.updateStats(this.player);
      }
    } else {
      // 显示失败消息
      this.showMessage(result.message, 'error');
    }
  }

  /**
   * 显示消息
   */
  showMessage(message, type = 'info') {
    const game = window.game;
    if (game && game.ui && game.ui.logMessage) {
      game.ui.logMessage(message, type === 'success' ? 'gain' : type);
    } else {
      console.log(`[ForgeUI] ${type}: ${message}`);
    }
  }

  /**
   * 获取装备槽位名称
   */
  getSlotName(slot) {
    const slotNames = {
      WEAPON: '武器',
      ARMOR: '护甲',
      HELM: '头盔',
      BOOTS: '靴子',
      RING: '戒指',
      AMULET: '护身符'
    };
    return slotNames[slot] || slot;
  }

  /**
   * 销毁组件
   */
  destroy() {
    this.close();
    this.player = null;
    this.selectedItem = null;
    this.selectedSlot = null;
    console.log('✓ ForgeUI 已销毁');
  }
}

