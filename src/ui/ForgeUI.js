// ForgeUI.js - 铁匠铺界面
// 独立管理铁匠铺UI的所有渲染和交互逻辑

import AudioManager from '../audio/AudioManager.js';

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
                <button class="forge-tab-btn" data-mode="synthesis">宝石合成</button>
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

      /* 合成列表样式 */
      .gem-synthesis-list {
        display: flex;
        flex-direction: column;
        gap: 10px;
        max-height: 400px;
        overflow-y: auto;
      }

      .synthesis-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(212, 175, 55, 0.3);
        border-radius: 6px;
        padding: 10px;
        transition: all 0.3s ease;
      }

      .synthesis-row:hover {
        background: rgba(212, 175, 55, 0.1);
        border-color: #d4af37;
      }

      .synthesis-gem-info {
        display: flex;
        align-items: center;
        gap: 15px;
      }

      .synthesis-icon-wrapper {
        position: relative;
        width: 60px;
        height: 60px;
      }

      .synthesis-count {
        position: absolute;
        bottom: 0;
        right: 0;
        background: rgba(0, 0, 0, 0.7);
        color: #fff;
        font-size: 12px;
        padding: 2px 4px;
        border-radius: 4px;
      }

      .synthesis-details {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .synthesis-name {
        font-weight: 600;
        font-size: 16px;
      }

      .synthesis-tier {
        font-size: 12px;
        color: #aaa;
      }

      .synthesis-action {
        min-width: 100px;
        display: flex;
        justify-content: flex-end;
      }

      .synthesis-btn {
        padding: 8px 12px;
        font-size: 14px;
      }

      .max-level-text {
        color: #d4af37;
        font-size: 14px;
        font-weight: 600;
      }

      /* 幸运石槽位样式 */
      .lucky-stone-section {
        background: rgba(76, 175, 80, 0.1);
        border-color: rgba(76, 175, 80, 0.3);
      }

      .lucky-stone-slots-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
        gap: 10px;
        margin-bottom: 10px;
      }

      .lucky-stone-slot {
        position: relative;
        background: rgba(0, 0, 0, 0.5);
        border: 2px solid rgba(255, 255, 255, 0.2);
        border-radius: 6px;
        padding: 10px;
        text-align: center;
        transition: all 0.3s ease;
      }

      .lucky-stone-slot.filled {
        background: rgba(76, 175, 80, 0.2);
        border-color: #4caf50;
      }

      .lucky-stone-slot.quality-COMMON { border-color: #a0a0a0; }
      .lucky-stone-slot.quality-UNCOMMON { border-color: #5eff00; }
      .lucky-stone-slot.quality-RARE { border-color: #0070dd; }
      .lucky-stone-slot.quality-EPIC { border-color: #a335ee; }
      .lucky-stone-slot.quality-LEGENDARY { border-color: #ff8000; }

      .stone-icon {
        font-size: 32px;
        margin-bottom: 5px;
      }

      .stone-name {
        font-size: 12px;
        color: #fff;
        margin-bottom: 3px;
      }

      .stone-bonus {
        font-size: 11px;
        color: #4caf50;
        font-weight: 600;
      }

      .stone-remove-btn {
        position: absolute;
        top: 2px;
        right: 2px;
        background: rgba(231, 76, 60, 0.8);
        color: #fff;
        border: none;
        border-radius: 50%;
        width: 20px;
        height: 20px;
        font-size: 12px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
      }

      .stone-remove-btn:hover {
        background: #e74c3c;
        transform: scale(1.1);
      }

      .lucky-stone-list {
        display: flex;
        flex-direction: column;
        gap: 5px;
        max-height: 150px;
        overflow-y: auto;
      }

      .lucky-stone-inv-item {
        display: flex;
        align-items: center;
        gap: 10px;
        background: rgba(0, 0, 0, 0.3);
        border: 2px solid rgba(255, 255, 255, 0.2);
        border-radius: 4px;
        padding: 8px;
        cursor: pointer;
        transition: all 0.3s ease;
      }

      .lucky-stone-inv-item:not(.disabled):hover {
        background: rgba(76, 175, 80, 0.2);
        border-color: #4caf50;
        transform: translateX(5px);
      }

      .lucky-stone-inv-item.disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .lucky-stone-inv-item .stone-icon {
        font-size: 24px;
        margin: 0;
      }

      .lucky-stone-inv-item .stone-info {
        flex: 1;
      }

      .lucky-stone-inv-item .stone-name {
        font-size: 13px;
        margin: 0;
      }

      .lucky-stone-inv-item .stone-bonus {
        font-size: 11px;
      }

      .lucky-stone-inv-item .stone-count {
        font-size: 14px;
        color: #aaa;
        font-weight: 600;
      }

      .forge-btn-secondary {
        background: linear-gradient(135deg, #95a5a6 0%, #7f8c8d 100%);
        color: #fff;
      }

      .forge-btn-secondary:hover:not(:disabled) {
        background: linear-gradient(135deg, #7f8c8d 0%, #6c7a7b 100%);
        transform: translateY(-2px);
        box-shadow: 0 5px 15px rgba(149, 165, 166, 0.4);
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
        // ✅ 第一步：标签页切换音效
        if (AudioManager && typeof AudioManager.playBookFlip === 'function') {
          AudioManager.playBookFlip();
        }
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

    // 打开铁匠铺时播放柔和的 UI 打开音效
    if (AudioManager && typeof AudioManager.playUIOpen === 'function') {
      AudioManager.playUIOpen();
    }

    this.elements.overlay.classList.remove('hidden');
    this.elements.overlay.classList.add('overlay-fade-in');
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
      this.elements.overlay.classList.remove('overlay-fade-in');
      this.elements.overlay.style.display = 'none';
      this.isOpen = false;

      // 关闭铁匠铺时播放 UI 关闭音效
      if (AudioManager && typeof AudioManager.playUIClose === 'function') {
        AudioManager.playUIClose();
      }

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
    
    // ✅ FIX: 检查是否为当前选中的物品，如果是则添加 selected 类
    if (this.selectedItem) {
      const selectedUid = this.selectedItem.uid || this.selectedItem.id;
      const currentUid = itemInstance.uid || itemInstance.id;
      if (selectedUid === currentUid || this.selectedItem === itemInstance) {
        itemCard.classList.add('selected');
      }
    }
    
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
    this.renderItemDetails(this.selectedItem);
  }

  /**
   * 渲染装备详情
   */
  renderItemDetails(item) {
    if (!this.elements.itemDetails) return;

    // 宝石合成模式 (不需要选中装备)
    if (this.currentMode === 'synthesis') {
      this.renderSynthesisPanel();
      return;
    }

    // 其他模式如果没有选中装备，显示占位符
    if (!item) {
      this.elements.itemDetails.innerHTML = '<p class="forge-placeholder">选择一件装备来查看详情</p>';
      return;
    }

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
    
    // 获取玩家背包中的幸运石
    const luckyStones = this.getLuckyStones();
    
    // 初始化幸运石槽位（如果不存在）
    if (!item.luckyStoneSlots) {
      item.luckyStoneSlots = [];
    }
    
    // 计算总成功率加成
    let totalLuckyBonus = 0;
    item.luckyStoneSlots.forEach(stone => {
      totalLuckyBonus += stone.successRateBonus || 0;
    });
    
    // 计算最终成功率
    const baseSuccessRate = details.successRate || 1.0;
    const finalSuccessRate = Math.min(baseSuccessRate + totalLuckyBonus, 0.95); // 上限95%
    
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
        <div class="stat-row">
          <span class="stat-label">成功率:</span>
          <span class="stat-value" style="color: ${finalSuccessRate >= 0.7 ? '#4caf50' : finalSuccessRate >= 0.4 ? '#ff9800' : '#e74c3c'};">
            ${(finalSuccessRate * 100).toFixed(2)}%
            ${totalLuckyBonus > 0 ? `<small style="color: #4caf50;">(+${(totalLuckyBonus * 100).toFixed(2)}%)</small>` : ''}
          </span>
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

      <!-- 幸运石槽位区域 -->
      <div class="detail-section lucky-stone-section">
        <h4>幸运石槽位 <small style="color: #888; font-size: 12px;">(同品质可叠加)</small></h4>
        <div class="lucky-stone-slots" id="lucky-stone-slots">
          ${this.renderLuckyStoneSlots(item)}
        </div>
        <div class="lucky-stone-inventory" style="margin-top: 10px;">
          <div style="color: #888; font-size: 12px; margin-bottom: 5px;">背包中的幸运石:</div>
          <div class="lucky-stone-list" id="lucky-stone-list">
            ${this.renderLuckyStoneInventory(luckyStones, item)}
          </div>
        </div>
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
    
    // 幸运石相关事件监听器
    this.setupLuckyStoneListeners(item);
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
    
    // 检查是否可以打孔
    // V2.2: 钻头打孔无上限
    const currentSockets = sockets.length;
    const canUnlock = true; 
    const unlockCost = currentSockets + 1; // 消耗钻头数量
    
    // 检查玩家拥有的钻头数量
    let drillCount = 0;
    if (this.player.inventory) {
      this.player.inventory.forEach(invItem => {
        if (invItem && (invItem.itemId === 'ITEM_STARDUST_DRILL' || invItem.id === 'ITEM_STARDUST_DRILL')) {
          drillCount += (invItem.count || 1);
        }
      });
    }

    if (canUnlock) {
      socketHtml += `
        <div class="socket-unlock-section" style="margin-top: 15px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 15px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
            <span style="color: #aaa;">解锁第 ${currentSockets + 1} 个槽位</span>
            <span style="color: ${drillCount >= unlockCost ? '#4caf50' : '#e74c3c'};">
              钻头: ${drillCount} / ${unlockCost}
            </span>
          </div>
          <button class="forge-btn forge-btn-enhance" id="btn-unlock-socket" ${drillCount < unlockCost ? 'disabled' : ''}>
            使用钻头打孔
          </button>
        </div>
      `;
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
    
    // 绑定打孔按钮事件
    const unlockBtn = document.getElementById('btn-unlock-socket');
    if (unlockBtn) {
      unlockBtn.addEventListener('click', () => this.handleUnlockSocket(item));
    }
  }

  /**
   * 处理打孔
   */
  handleUnlockSocket(item) {
    if (!this.player || !item) return;
    
    // 播放音效
    if (AudioManager && typeof AudioManager.playForge === 'function') {
      AudioManager.playForge();
    }
    
    const result = this.blacksmithSystem.unlockSocket(item, this.player);
    
    if (result.success) {
      this.showMessage(result.message, 'success');
      // 刷新详情
      this.renderItemDetails(item);
      // 刷新左侧列表（可能显示变化）
      this.renderItemList();
      
      // 更新游戏UI
      const game = window.game;
      if (game && game.ui) {
        game.ui.renderInventory?.(this.player);
      }
    } else {
      this.showMessage(result.message, 'error');
    }
  }

  /**
   * 渲染宝石合成面板
   */
  renderSynthesisPanel() {
    if (!this.elements.itemDetails || !this.player) return;

    // 获取背包中的所有宝石
    const inventory = this.player.inventory || [];
    const gems = inventory.filter(item => item && item.type === 'GEM');
    
    // 统计每种宝石的数量
    const gemCounts = {};
    gems.forEach(gem => {
      const id = gem.itemId || gem.id;
      if (!gemCounts[id]) {
        gemCounts[id] = {
          item: gem,
          count: 0
        };
      }
      gemCounts[id].count += (gem.count || 1);
    });

    // 筛选出可以合成的宝石 (数量 >= 3 且不是最高级)
    const synthesizableGems = Object.values(gemCounts).filter(entry => {
      const tier = entry.item.tier || 1;
      return entry.count >= 3 && tier < 5;
    });

    let contentHtml = '';
    
    if (synthesizableGems.length === 0) {
      contentHtml = `
        <div class="forge-placeholder">
          <p>没有可合成的宝石</p>
          <small style="color: #666;">需要 3 颗相同的宝石才能合成更高一级的宝石</small>
        </div>
      `;
    } else {
      contentHtml = '<div class="gem-synthesis-list">';
      
      // 排序：按等级、品质、名称
      synthesizableGems.sort((a, b) => {
        const tierA = a.item.tier || 1;
        const tierB = b.item.tier || 1;
        if (tierA !== tierB) return tierA - tierB;
        return 0;
      });

      synthesizableGems.forEach(entry => {
        const gem = entry.item;
        const count = entry.count;
        const tier = gem.tier || 1;
        const nextTier = tier + 1;
        
        // 模拟下一级宝石名称
        const baseName = gem.nameZh || gem.name;
        // 假设名称中有 "I", "II" 等罗马数字，或者只是简单显示 "下一级"
        // 这里简单处理：显示当前宝石名称和 T(x) -> T(x+1)
        
        contentHtml += `
          <div class="synthesis-row">
            <div class="synthesis-gem-info">
              <!-- 图标占位，实际需要 canvas 渲染 -->
              <div class="synthesis-icon-wrapper" data-gem-id="${gem.itemId || gem.id}">
                <div style="width: 60px; height: 60px; background: rgba(0,0,0,0.5); border-radius: 4px;"></div>
                <div class="synthesis-count">${count}</div>
              </div>
              <div class="synthesis-details">
                <span class="synthesis-name" style="color: ${this.blacksmithSystem.getItemQualityColor(gem)}">${baseName}</span>
                <span class="synthesis-tier">等级 ${tier} ➤ <span style="color: #4caf50">等级 ${nextTier}</span></span>
              </div>
            </div>
            <div class="synthesis-action">
              <button class="forge-btn forge-btn-enhance synthesis-btn" 
                data-gem-id="${gem.itemId || gem.id}">
                合成 (3合1)
              </button>
            </div>
          </div>
        `;
      });
      
      contentHtml += '</div>';
    }

    this.elements.itemDetails.innerHTML = `
      <div class="detail-section">
        <h4>宝石合成</h4>
        <p style="color: #aaa; font-size: 14px; margin-bottom: 15px;">
          消耗 3 颗相同的宝石，合成 1 颗更高等级的宝石。
          <br>最高可合成至 5 级 (Mythic)。
        </p>
        ${contentHtml}
      </div>
    `;

    // 绑定合成按钮事件
    const synthesisBtns = this.elements.itemDetails.querySelectorAll('.synthesis-btn');
    synthesisBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const gemId = btn.dataset.gemId;
        const gemEntry = gemCounts[gemId];
        if (gemEntry) {
          this.handleSynthesis(gemEntry.item);
        }
      });
    });
    
    // 渲染图标
    this.renderSynthesisIcons(synthesizableGems);
  }

  /**
   * 渲染合成列表中的图标
   */
  renderSynthesisIcons(gemEntries) {
    const game = window.game;
    const loader = game?.loader;
    const gemImg = loader?.getImage('ICONS_GEMS');
    
    if (!gemImg) return;

    const render = () => {
      gemEntries.forEach(entry => {
        const gem = entry.item;
        const gemId = gem.itemId || gem.id;
        const wrapper = this.elements.itemDetails.querySelector(`.synthesis-icon-wrapper[data-gem-id="${gemId}"]`);
        
        if (wrapper) {
          const placeholder = wrapper.querySelector('div:first-child');
          
          const iconIndex = gem.iconIndex || 0;
          const cols = 5;
          const rows = 4;
          const cellW = Math.floor(gemImg.width / cols);
          const cellH = Math.floor(gemImg.height / rows);
          const col = iconIndex % cols;
          const row = Math.floor(iconIndex / cols);
          
          const sx = Math.round(col * cellW);
          const sy = Math.round(row * cellH);
          
          const canvas = document.createElement('canvas');
          canvas.width = 60;
          canvas.height = 60;
          const ctx = canvas.getContext('2d');
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(gemImg, sx, sy, cellW, cellH, 0, 0, 60, 60);
          
          if (placeholder) {
            placeholder.replaceWith(canvas);
          }
        }
      });
    };

    if (gemImg.complete) {
      render();
    } else {
      gemImg.onload = render;
    }
  }

  /**
   * 处理宝石合成
   */
  handleSynthesis(gemItem) {
    if (!this.player || !gemItem) return;

    // 播放音效
    if (AudioManager && typeof AudioManager.playForge === 'function') {
      AudioManager.playForge();
    }

    const result = this.blacksmithSystem.synthesizeGem(gemItem, this.player);

    if (result.success) {
      this.showMessage(result.message, 'success');
      // 刷新合成面板
      this.renderSynthesisPanel();
      // 刷新左侧列表（宝石数量变化）
      this.renderItemList();
      
      // 更新游戏UI
      const game = window.game;
      if (game && game.ui) {
        game.ui.renderInventory?.(this.player);
      }
    } else {
      this.showMessage(result.message, 'error');
    }
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
      // ✅ 刷新左侧列表和右侧详情
      this.renderItemList();
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
      // ✅ FIX: 拆除宝石后立即刷新左侧列表，确保拆下来的宝石能立即显示
      this.renderItemList();
      // ✅ 刷新右侧详情
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
   * 获取玩家背包中的幸运石
   */
  getLuckyStones() {
    if (!this.player || !this.player.inventory) return [];
    
    return this.player.inventory.filter(item => 
      item && item.type === 'trash' && item.name && item.name.includes('幸运石')
    );
  }

  /**
   * 设置幸运石相关的事件监听器
   */
  setupLuckyStoneListeners(item) {
    // 移除单个幸运石
    const removeButtons = document.querySelectorAll('.stone-remove-btn');
    removeButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const slotIndex = parseInt(btn.dataset.slotIndex);
        this.removeLuckyStone(item, slotIndex);
      });
    });
    
    // 清空所有幸运石
    const clearAllBtn = document.getElementById('clear-all-stones');
    if (clearAllBtn) {
      clearAllBtn.addEventListener('click', () => {
        this.clearAllLuckyStones(item);
      });
    }
    
    // 添加幸运石
    const invItems = document.querySelectorAll('.lucky-stone-inv-item:not(.disabled)');
    invItems.forEach(invItem => {
      invItem.addEventListener('click', () => {
        const quality = invItem.dataset.stoneQuality;
        this.addLuckyStone(item, quality);
      });
    });
  }

  /**
   * 添加幸运石到槽位
   */
  addLuckyStone(item, quality) {
    if (!this.player || !this.player.inventory) return;
    
    // 检查是否已有不同品质的幸运石
    if (item.luckyStoneSlots && item.luckyStoneSlots.length > 0) {
      const existingQuality = item.luckyStoneSlots[0].quality;
      if (existingQuality !== quality) {
        this.showMessage('只能添加相同品质的幸运石！', 'error');
        return;
      }
    }
    
    // 从背包中找到该品质的幸运石
    const stoneIndex = this.player.inventory.findIndex(invItem => 
      invItem && invItem.type === 'trash' && 
      invItem.name && invItem.name.includes('幸运石') &&
      (invItem.quality || 'COMMON') === quality
    );
    
    if (stoneIndex === -1) {
      this.showMessage('背包中没有该品质的幸运石！', 'error');
      return;
    }
    
    const stone = this.player.inventory[stoneIndex];
    
    // 添加到槽位
    if (!item.luckyStoneSlots) {
      item.luckyStoneSlots = [];
    }
    
    item.luckyStoneSlots.push({
      name: stone.name,
      quality: stone.quality || 'COMMON',
      successRateBonus: stone.successRateBonus || 0.0005,
      uid: stone.uid
    });
    
    // 从背包移除
    this.player.inventory.splice(stoneIndex, 1);
    
    // 刷新显示
    this.renderItemDetails(item);
    this.showMessage(`添加了 ${stone.name}`, 'success');
  }

  /**
   * 从槽位移除幸运石
   */
  removeLuckyStone(item, slotIndex) {
    if (!item.luckyStoneSlots || slotIndex < 0 || slotIndex >= item.luckyStoneSlots.length) {
      return;
    }
    
    const stone = item.luckyStoneSlots[slotIndex];
    
    // 返还到背包
    if (this.player && this.player.inventory) {
      this.player.inventory.push({
        type: 'trash',
        name: stone.name,
        quality: stone.quality,
        successRateBonus: stone.successRateBonus,
        uid: stone.uid || `stone_${Date.now()}_${Math.random()}`,
        icon: '🪨'
      });
    }
    
    // 从槽位移除
    item.luckyStoneSlots.splice(slotIndex, 1);
    
    // 刷新显示
    this.renderItemDetails(item);
    this.showMessage(`移除了 ${stone.name}`, 'info');
  }

  /**
   * 清空所有幸运石
   */
  clearAllLuckyStones(item) {
    if (!item.luckyStoneSlots || item.luckyStoneSlots.length === 0) {
      return;
    }
    
    // 返还所有幸运石到背包
    if (this.player && this.player.inventory) {
      item.luckyStoneSlots.forEach(stone => {
        this.player.inventory.push({
          type: 'trash',
          name: stone.name,
          quality: stone.quality,
          successRateBonus: stone.successRateBonus,
          uid: stone.uid || `stone_${Date.now()}_${Math.random()}`,
          icon: '🪨'
        });
      });
    }
    
    // 清空槽位
    item.luckyStoneSlots = [];
    
    // 刷新显示
    this.renderItemDetails(item);
    this.showMessage('已清空所有幸运石', 'info');
  }

  /**
   * 渲染幸运石槽位
   */
  renderLuckyStoneSlots(item) {
    const slots = item.luckyStoneSlots || [];
    
    if (slots.length === 0) {
      return '<div style="color: #888; font-size: 14px; padding: 10px; text-align: center;">暂无幸运石</div>';
    }
    
    return `
      <div class="lucky-stone-slots-grid">
        ${slots.map((stone, index) => `
          <div class="lucky-stone-slot filled quality-${stone.quality}" data-slot-index="${index}">
            <div class="stone-icon">🪨</div>
            <div class="stone-name">${stone.name}</div>
            <div class="stone-bonus">+${(stone.successRateBonus * 100).toFixed(2)}%</div>
            <button class="stone-remove-btn" data-slot-index="${index}" title="移除">✕</button>
          </div>
        `).join('')}
      </div>
      <button class="forge-btn forge-btn-secondary" id="clear-all-stones" style="margin-top: 10px; width: 100%;">
        清空所有幸运石
      </button>
    `;
  }

  /**
   * 渲染背包中的幸运石列表
   */
  renderLuckyStoneInventory(luckyStones, item) {
    if (luckyStones.length === 0) {
      return '<div style="color: #888; font-size: 12px; padding: 5px;">背包中没有幸运石</div>';
    }
    
    // 按品质分组
    const stonesByQuality = {};
    luckyStones.forEach(stone => {
      const quality = stone.quality || 'COMMON';
      if (!stonesByQuality[quality]) {
        stonesByQuality[quality] = [];
      }
      stonesByQuality[quality].push(stone);
    });
    
    // 检查当前槽位中的品质
    const currentQuality = item.luckyStoneSlots && item.luckyStoneSlots.length > 0 
      ? item.luckyStoneSlots[0].quality 
      : null;
    
    return Object.entries(stonesByQuality).map(([quality, stones]) => {
      const canAdd = !currentQuality || currentQuality === quality;
      const count = stones.length;
      const stone = stones[0];
      
      return `
        <div class="lucky-stone-inv-item quality-${quality} ${!canAdd ? 'disabled' : ''}" 
             data-stone-quality="${quality}"
             data-stone-uid="${stone.uid}"
             title="${canAdd ? '点击添加' : '只能添加相同品质的幸运石'}">
          <div class="stone-icon">🪨</div>
          <div class="stone-info">
            <div class="stone-name">${stone.name}</div>
            <div class="stone-bonus">+${(stone.successRateBonus * 100).toFixed(2)}%</div>
          </div>
          <div class="stone-count">×${count}</div>
        </div>
      `;
    }).join('');
  }

  /**
   * 处理强化
   */
  handleEnhance() {
    if (!this.selectedItem || !this.player) return;

    // 强化/锻造按钮点击时，播放锻造音效
    if (AudioManager && typeof AudioManager.playForge === 'function') {
      AudioManager.playForge();
    }

    // 计算幸运石加成
    let luckyStoneBonus = 0;
    if (this.selectedItem.luckyStoneSlots && this.selectedItem.luckyStoneSlots.length > 0) {
      this.selectedItem.luckyStoneSlots.forEach(stone => {
        luckyStoneBonus += stone.successRateBonus || 0;
      });
    }

    // 传递幸运石加成给强化系统
    const options = {
      luckyStoneBonus: luckyStoneBonus
    };

    const result = this.blacksmithSystem.enhanceItem(this.selectedItem, this.player, options);

    if (result.success) {
      // 强化成功，消耗所有幸运石
      if (this.selectedItem.luckyStoneSlots) {
        this.selectedItem.luckyStoneSlots = [];
      }
      
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
      // 强化失败，也消耗所有幸运石
      if (this.selectedItem.luckyStoneSlots) {
        this.selectedItem.luckyStoneSlots = [];
      }
      
      // 显示失败消息
      this.showMessage(result.message, 'error');
      
      // 刷新UI以显示幸运石已被消耗
      this.renderItemDetails(this.selectedItem);
    }
  }

  /**
   * 处理重铸
   */
  handleReforge() {
    if (!this.selectedItem || !this.player) return;

    const result = this.blacksmithSystem.reforgeItem(this.selectedItem, this.player);

    if (result.success) {
      // ✅ 重铸成功后播放锻造音效
      if (AudioManager && typeof AudioManager.playForge === 'function') {
        AudioManager.playForge();
      }
      
      // 显示成功消息
      this.showMessage(result.message, 'success');
      
      // 更新UI（确保重铸后的属性变化能立即直观地展示）
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

