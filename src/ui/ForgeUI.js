// ForgeUI.js - 铁匠铺界面
// 独立管理铁匠铺UI的所有渲染和交互逻辑

import AudioManager from '../audio/AudioManager.js';
import { InventoryBinder } from './forge/InventoryBinder.js';
import { spriteManager } from './forge/SpriteManager.js';
import { ForgeHistoryTracker } from './forge/ForgeHistoryTracker.js';
import { ForgeSoundManager } from './forge/ForgeSoundManager.js';
import { MaterialInventoryDisplay } from './forge/MaterialInventoryDisplay.js';
import { EquipmentSlotDisplay } from './forge/EquipmentSlotDisplay.js';
import { PerformanceOptimizer } from './forge/PerformanceOptimizer.js';
import { ForgeAutoSave } from './forge/ForgeAutoSave.js';
import { ForgeErrorHandler } from './forge/ForgeErrorHandler.js';
import { BatchOperationPanel } from './forge/BatchOperationPanel.js';
import { FeatureUnlockManager } from './forge/FeatureUnlockManager.js';
import { BlacksmithLevelDisplay } from './forge/BlacksmithLevelDisplay.js';
import { InitialView } from './forge/InitialView.js';
import { DynamicPanelManager } from './forge/DynamicPanelManager.js';

/**
 * ForgeUI - 铁匠铺界面管理器
 * 负责渲染铁匠铺、装备强化、品质重铸等
 * 完全独立的组件，不依赖外部 DOM 操作
 */
export class ForgeUI {
  constructor(blacksmithSystem, config = {}) {
    this.blacksmithSystem = blacksmithSystem;
    
    // 精灵图管理器
    this.spriteManager = spriteManager;
    
    // 火花特效动画帧ID
    this.sparkleAnimationFrame = null;
    
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

    // 初始界面管理器
    this.initialView = null;
    
    // 动态面板管理器
    this.dynamicPanelManager = null;
    
    // 背包绑定器
    this.inventoryBinder = null;
    
    // NPC渲染器
    this.npcRenderer = null;
    
    // 历史记录追踪器
    this.historyTracker = null;
    
    // 音效管理器
    this.soundManager = null;
    
    // 材料库存显示器
    this.materialInventory = null;
    
    // 装备槽位显示器
    this.equipmentSlotDisplay = null;
    
    // 性能优化器
    this.performanceOptimizer = null;
    
    // 自动保存系统
    this.autoSave = null;
    
    // 错误处理系统
    this.errorHandler = null;
    
    // 批量操作面板
    this.batchOperationPanel = null;
    
    // 功能解锁管理器
    this.featureUnlockManager = null;
    
    // 铁匠等级显示
    this.blacksmithLevelDisplay = null;

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
      
      document.body.appendChild(overlay);
      
      // 添加样式
      this.injectStyles();
    }

    // 缓存元素引用
    this.elements.overlay = overlay;
    
    // 初始化InitialView
    if (!this.initialView) {
      this.initialView = new InitialView(this);
    }
    
    // 初始化DynamicPanelManager
    if (!this.dynamicPanelManager) {
      this.dynamicPanelManager = new DynamicPanelManager(this);
    }
    
    // 渲染初始界面
    this.initialView.render();
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
      /* ForgeUI内联样式 - 最小化，主要样式在forge.css中 */
      
      /* 确保旧的header、content、footer等元素不显示 */
      .forge-header,
      .forge-content,
      .forge-footer,
      .forge-navigation,
      .forge-list-panel,
      .forge-detail-panel {
        display: none !important;
      }
    `;
    
    document.head.appendChild(style);
  }

  /**
   * 设置事件监听器
   */
  setupEventListeners() {
    if (!this.elements.overlay) return;

    // 点击 overlay 外部关闭
    this.elements.overlay.addEventListener('click', (e) => {
      if (e.target === this.elements.overlay) {
        this.close();
      }
    });
    
    // 注意：其他事件监听器由InitialView和DynamicPanelManager管理
  }

  /**
   * 显示功能面板
   */
  showFunctionPanel(panelId) {
    if (this.dynamicPanelManager) {
      this.dynamicPanelManager.showPanel(panelId);
    }
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

    // 初始化背包绑定器
    if (this.player && !this.inventoryBinder) {
      try {
        this.inventoryBinder = new InventoryBinder(this.player);
        this.inventoryBinder.initialize();
        
        // 监听背包变化（使用防抖优化）
        const debouncedUpdate = this.performanceOptimizer ? 
          this.performanceOptimizer.debounce(() => {
            this.renderItemList();
            // 更新材料库存显示
            if (this.materialInventory) {
              this.materialInventory.update();
            }
            // 更新装备槽位显示
            if (this.equipmentSlotDisplay) {
              this.equipmentSlotDisplay.update();
            }
          }, 100) : 
          () => {
            this.renderItemList();
            if (this.materialInventory) {
              this.materialInventory.update();
            }
            if (this.equipmentSlotDisplay) {
              this.equipmentSlotDisplay.update();
            }
          };
        
        this.inventoryBinder.on('onAnyChange', debouncedUpdate);
      } catch (error) {
        if (this.errorHandler) {
          this.errorHandler.handleInventoryDataError(error);
        }
      }
    }
    
    // 初始化历史记录追踪器
    if (!this.historyTracker) {
      this.historyTracker = new ForgeHistoryTracker(this);
    }
    
    // 初始化音效管理器
    if (!this.soundManager) {
      this.soundManager = new ForgeSoundManager(AudioManager);
    }
    
    // 初始化材料库存显示器
    if (!this.materialInventory) {
      this.materialInventory = new MaterialInventoryDisplay(this);
    }
    
    // 初始化装备槽位显示器
    if (!this.equipmentSlotDisplay) {
      this.equipmentSlotDisplay = new EquipmentSlotDisplay(this);
    }
    
    // 初始化性能优化器
    if (!this.performanceOptimizer) {
      this.performanceOptimizer = new PerformanceOptimizer(this);
    }
    
    // 初始化自动保存系统
    if (!this.autoSave) {
      this.autoSave = new ForgeAutoSave(this);
    }
    
    // 初始化错误处理系统
    if (!this.errorHandler) {
      this.errorHandler = new ForgeErrorHandler(this);
    }
    
    // 初始化批量操作面板
    if (!this.batchOperationPanel) {
      this.batchOperationPanel = new BatchOperationPanel(this);
    }
    
    // 初始化功能解锁管理器
    if (!this.featureUnlockManager) {
      this.featureUnlockManager = new FeatureUnlockManager(this);
      // 更新解锁状态
      const game = window.game;
      const blacksmithLevel = game?.blacksmithNPC?.level || 1;
      this.featureUnlockManager.updateUnlockStatus(blacksmithLevel);
    }
    
    // 初始化铁匠等级显示
    if (!this.blacksmithLevelDisplay) {
      this.blacksmithLevelDisplay = new BlacksmithLevelDisplay(this);
      const game = window.game;
      const blacksmithLevel = game?.blacksmithNPC?.level || 1;
      this.blacksmithLevelDisplay.lastLevel = blacksmithLevel;
    }
    
    // 启动自动保存
    this.autoSave.start();

    // 打开铁匠铺时播放柔和的 UI 打开音效
    if (this.soundManager) {
      this.soundManager.playOpen();
    }

    this.elements.overlay.classList.remove('hidden');
    this.elements.overlay.classList.add('overlay-fade-in');
    this.elements.overlay.style.display = 'flex';
    this.isOpen = true;

    console.log('✓ ForgeUI 已打开');
    
    // 在 DOM 更新后启动火花特效（使用 setTimeout 确保布局已完成）
    setTimeout(() => {
      this.startSparkleEffect();
    }, 100);
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
      if (this.soundManager) {
        this.soundManager.playClose();
      }
      
      // 停止自动保存
      if (this.autoSave) {
        this.autoSave.stop();
      }
      
      // 停止火花特效
      this.stopSparkleEffect();

      // 恢复游戏
      const game = window.game;
      if (game) {
        game.isPaused = false;
      }

      // 清理背包绑定器
      if (this.inventoryBinder) {
        this.inventoryBinder.destroy();
        this.inventoryBinder = null;
      }
      
      // 不清理NPC渲染器，保持引用以便下次使用
      // NPC渲染器会在下次打开时继续使用
      
      // 清理历史记录追踪器
      if (this.historyTracker) {
        this.historyTracker.cleanup();
        this.historyTracker = null;
      }
      
      // 清理性能优化器
      if (this.performanceOptimizer) {
        this.performanceOptimizer.cleanup();
        // 不设置为null，保持引用以便下次使用
      }
      
      // 音效管理器不需要清理（保持引用）

      // 清除选中状态
      this.selectedItem = null;
      this.selectedSlot = null;

      console.log('✓ ForgeUI 已关闭');
    }
  }

  /**
   * 渲染装备列表（包括已装备和背包中的装备）
   * @param {string} containerId - 可选的容器ID，如果不提供则使用默认的itemList
   */
  renderItemList(containerId = null) {
    console.log('[ForgeUI] renderItemList 被调用, containerId:', containerId);
    
    if (!this.player) {
      console.log('[ForgeUI] ✗ player 不存在');
      return;
    }
    
    console.log('[ForgeUI] ✓ player 存在');
    
    // 确定要渲染到哪个容器
    const container = containerId ? document.getElementById(containerId) : this.elements.itemList;
    console.log('[ForgeUI] 容器查找结果:', container ? '找到' : '未找到', containerId || 'itemList');
    
    if (!container) {
      console.log('[ForgeUI] ✗ 容器不存在，退出渲染');
      return;
    }

    console.log('[ForgeUI] ✓ 开始渲染物品列表');
    container.innerHTML = '';
    
    // 添加装备槽位状态显示
    if (this.equipmentSlotDisplay) {
      const slotDisplayHtml = this.equipmentSlotDisplay.render(this.player);
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = slotDisplayHtml;
      const slotPanel = tempDiv.firstElementChild;
      if (slotPanel) {
        container.appendChild(slotPanel);
        
        // 绑定槽位点击事件
        this.equipmentSlotDisplay.bindSlotClickEvents((slotId, isEmpty, itemUid) => {
          if (isEmpty) {
            // 点击空槽位，显示提示
            this.showMessage(`${this.equipmentSlotDisplay.getSlotInfo(slotId)?.name || slotId} 槽位为空`, 'info');
          } else {
            // 点击已装备槽位，选中该装备
            const equipment = this.player.equipment[slotId];
            if (equipment) {
              // 找到对应的装备卡片并触发点击
              const itemCard = container.querySelector(`[data-slot="${slotId}"]`);
              if (itemCard) {
                itemCard.click();
              }
            }
          }
        });
      }
    }

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
      container.appendChild(equippedTitle);

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
            container.appendChild(itemCard);
          }
        }
      });

      // === 第二部分：背包物品 ===
      const inventory = this.player.inventory || [];
      const inventoryItems = [];
      
      console.log('[ForgeUI] 背包物品总数:', inventory.length);
      console.log('[ForgeUI] 背包内容:', inventory);
      
      inventory.forEach((item, index) => {
        console.log(`[ForgeUI] 检查物品 ${index}:`, item);
        if (item && typeof item === 'object' && item.type !== 'CONSUMABLE') {
          console.log(`[ForgeUI] ✓ 物品 ${index} 符合条件:`, item.name || item.nameZh);
          inventoryItems.push({ item, index });
        } else {
          console.log(`[ForgeUI] ✗ 物品 ${index} 不符合条件:`, {
            exists: !!item,
            isObject: typeof item === 'object',
            type: item?.type,
            isNotConsumable: item?.type !== 'CONSUMABLE'
          });
        }
      });
      
      console.log('[ForgeUI] 符合条件的背包物品数:', inventoryItems.length);

      if (inventoryItems.length > 0) {
        // 添加分割线和标题
        const divider = document.createElement('div');
        divider.className = 'forge-list-divider';
        container.appendChild(divider);
        
        const inventoryTitle = document.createElement('h3');
        inventoryTitle.className = 'panel-subtitle';
        inventoryTitle.textContent = '背包物品';
        container.appendChild(inventoryTitle);

        inventoryItems.forEach(({ item, index }) => {
          hasItems = true;
          
          // 初始化装备（如果需要）
          this.blacksmithSystem.initializeItem(item);
          
          const itemCard = this.createItemCard(item, `inventory_${index}`, 'inventory');
          container.appendChild(itemCard);
        });
      }

      if (!hasItems) {
        container.innerHTML = '<p class="forge-placeholder">没有可操作的装备</p>';
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
    const quality = itemInstance.quality || 'COMMON';
    
    const slotLabel = source === 'equipped' 
      ? this.getSlotName(slot)
      : '背包';
    
    // 创建物品图标
    const iconCanvas = this.createItemIcon(itemInstance);
    
    itemCard.innerHTML = `
      <div class="forge-item-icon-wrapper quality-${quality}" style="border-color: ${itemColor};">
        ${iconCanvas ? iconCanvas.outerHTML : '<div class="forge-item-icon-placeholder">?</div>'}
      </div>
      <div class="forge-item-info">
        <div class="forge-item-name" style="color: ${itemColor};">${itemName}</div>
        <div class="forge-item-type">${slotLabel}</div>
      </div>
    `;
    
    itemCard.addEventListener('click', () => this.selectItem(itemInstance, slot, itemCard));
    
    return itemCard;
  }

  /**
   * 创建物品图标（Canvas渲染）
   * @param {Object} item - 物品对象
   * @returns {HTMLCanvasElement|null} Canvas元素
   */
  createItemIcon(item) {
    const loader = window.game?.loader;
    if (!loader) return null;
    
    // 根据物品类型选择精灵图
    let spriteImage = null;
    let iconIndex = item.iconIndex || 0;
    
    if (item.type === 'GEM') {
      spriteImage = loader.getImage('ICONS_GEMS');
    } else if (item.type === 'CONSUMABLE' || item.type === 'MATERIAL') {
      spriteImage = loader.getImage('ICONS_CONSUMABLES');
    } else {
      // 装备类型
      spriteImage = loader.getImage('ICONS_EQUIP');
    }
    
    if (!spriteImage) return null;
    
    // 创建Canvas
    const canvas = document.createElement('canvas');
    canvas.width = 48;
    canvas.height = 48;
    canvas.className = 'forge-item-icon-canvas';
    
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    
    // 计算精灵图中的位置
    const cols = 4; // 假设精灵图是4列
    const natW = spriteImage.naturalWidth || spriteImage.width;
    const natH = spriteImage.naturalHeight || spriteImage.height;
    const cellW = natW / cols;
    const cellH = natH / 4; // 假设4行
    
    const col = iconIndex % cols;
    const row = Math.floor(iconIndex / cols);
    
    const sx = col * cellW;
    const sy = row * cellH;
    
    // 绘制图标
    try {
      ctx.drawImage(
        spriteImage,
        sx, sy, cellW, cellH,
        0, 0, canvas.width, canvas.height
      );
    } catch (error) {
      console.warn('[ForgeUI] 绘制物品图标失败:', error);
      return null;
    }
    
    return canvas;
  }

  /**
   * 选择装备
   */
  selectItem(item, slot, cardElement) {
    this.selectedItem = item;
    this.selectedSlot = slot;

    // 更新选中状态 - 查找卡片所在的容器
    const container = cardElement.closest('.equipment-list') || this.elements.itemList;
    if (container) {
      const allCards = container.querySelectorAll('.forge-item-card');
      allCards.forEach(card => card.classList.remove('selected'));
    }
    cardElement.classList.add('selected');

    // 渲染装备详情 - 根据当前面板确定详情容器
    const detailsContainer = this.getDetailsContainer();
    if (detailsContainer) {
      this.renderItemDetailsToContainer(item, detailsContainer);
    } else {
      // 兼容旧系统
      this.renderItemDetails(item);
    }
  }

  /**
   * 获取当前详情容器
   */
  getDetailsContainer() {
    // 尝试从动态面板中获取详情容器
    const enhanceDetails = document.getElementById('enhance-equipment-details');
    if (enhanceDetails) return enhanceDetails;
    
    const socketSlots = document.getElementById('socket-slots');
    if (socketSlots) return socketSlots;
    
    const dismantleDetails = document.getElementById('dismantle-equipment-details');
    if (dismantleDetails) return dismantleDetails;
    
    // 返回旧系统的详情容器
    return this.elements.itemDetails;
  }

  /**
   * 切换模式（强化/重铸 或 宝石镶嵌）
   */
  switchMode(mode) {
    this.currentMode = mode;
    
    // 更新导航按钮状态
    const navButtons = this.elements.overlay.querySelectorAll('.forge-nav-btn');
    navButtons.forEach(btn => {
      if (btn.dataset.page === mode) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
    
    // 添加页面切换动画
    const detailsPanel = this.elements.itemDetails;
    if (detailsPanel) {
      detailsPanel.classList.add('page-transition');
      setTimeout(() => {
        detailsPanel.classList.remove('page-transition');
      }, 300);
    }
    
    // 重新渲染详情面板
    this.renderItemDetails(this.selectedItem);
  }

  /**
   * 渲染装备详情
   */
  renderItemDetails(item) {
    if (!this.elements.itemDetails) return;

    // 批量操作模式
    if (this.currentMode === 'batch') {
      this.renderBatchPanel();
      return;
    }

    // 宝石合成模式 (不需要选中装备)
    if (this.currentMode === 'synthesis') {
      this.renderSynthesisPanel();
      return;
    }
    
    // 装备拆解模式
    if (this.currentMode === 'dismantle') {
      this.renderDismantlePanel(item);
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
   * 渲染装备详情到指定容器（新面板系统）
   */
  renderItemDetailsToContainer(item, container) {
    if (!container) return;

    // 根据容器ID判断当前面板类型
    const containerId = container.id;
    
    if (containerId === 'enhance-equipment-details') {
      // 强化面板
      this.renderEnhancePanelToContainer(item, container);
    } else if (containerId === 'socket-slots') {
      // 宝石镶嵌面板
      this.renderSocketPanelToContainer(item, container);
    } else if (containerId === 'dismantle-equipment-details') {
      // 拆解面板
      this.renderDismantlePanelToContainer(item, container);
    } else {
      // 默认显示装备信息
      if (!item) {
        container.innerHTML = '<p class="panel-placeholder">请选择一件装备</p>';
      } else {
        this.renderEnhancePanelToContainer(item, container);
      }
    }
  }

  /**
   * 渲染强化面板到指定容器
   */
  renderEnhancePanelToContainer(item, container) {
    if (!item) {
      container.innerHTML = '<p class="panel-placeholder">请选择一件装备</p>';
      return;
    }

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
    
    container.innerHTML = `
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
    const enhanceBtn = container.querySelector('#forge-enhance-btn');
    const reforgeBtn = container.querySelector('#forge-reforge-btn');
    const dismantleBtn = container.querySelector('#forge-dismantle-btn');

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
   * 渲染宝石镶嵌面板到指定容器
   */
  renderSocketPanelToContainer(item, container) {
    if (!item) {
      container.innerHTML = '<p class="panel-placeholder">请选择一件装备</p>';
      return;
    }

    const game = window.game;
    const loader = game?.loader;
    const sockets = item.meta?.sockets || [];
    
    const itemName = this.blacksmithSystem.getItemDisplayName(item);
    const itemColor = this.blacksmithSystem.getItemQualityColor(item);
    
    let socketHtml = '';
    if (sockets.length === 0) {
      socketHtml = '<p class="panel-placeholder">该装备没有镶嵌槽</p>';
    } else {
      socketHtml = '<div class="socket-list">';
      sockets.forEach((socket, index) => {
        socketHtml += this.renderSocketSlot(socket, index, loader);
      });
      socketHtml += '</div>';
    }
    
    // 检查是否可以打孔
    const currentSockets = sockets.length;
    const canUnlock = true; 
    const unlockCost = currentSockets + 1;
    
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
    
    container.innerHTML = `
      <div class="detail-section">
        <h4 style="color: ${itemColor}; margin: 0;">${itemName}</h4>
        <div style="font-size: 12px; color: #aaa; margin-top: 5px;">
          镶嵌槽: ${sockets.length} 个
        </div>
      </div>

      <div class="detail-section socket-panel">
        ${socketHtml}
      </div>
    `;
    
    // 绑定 socket 点击事件
    this.bindSocketEvents(item);
    
    // 绑定打孔按钮事件
    const unlockBtn = container.querySelector('#btn-unlock-socket');
    if (unlockBtn) {
      unlockBtn.addEventListener('click', () => this.handleUnlockSocket(item));
    }
  }

  /**
   * 渲染拆解面板到指定容器
   */
  renderDismantlePanelToContainer(item, container) {
    if (!item) {
      container.innerHTML = '<p class="panel-placeholder">请选择要拆解的装备</p>';
      return;
    }

    const details = this.blacksmithSystem.getItemDetails(item);
    
    container.innerHTML = `
      <div class="detail-section">
        <h4 style="color: ${details.qualityColor};">${details.name}</h4>
        <div class="stat-row">
          <span class="stat-label">品质:</span>
          <span class="stat-value" style="color: ${details.qualityColor};">${details.quality}</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">强化等级:</span>
          <span class="stat-value">+${details.enhanceLevel}</span>
        </div>
      </div>

      <div class="detail-section">
        <h4>拆解收益</h4>
        <div class="stat-row">
          <span class="stat-label">金币:</span>
          <span class="stat-value" style="color: #ffd700;">${details.dismantleValue}</span>
        </div>
      </div>

      <div class="forge-actions">
        <button class="forge-btn forge-btn-dismantle" id="forge-dismantle-btn">
          确认拆解
        </button>
      </div>
    `;

    // 添加按钮事件监听器
    const dismantleBtn = container.querySelector('#forge-dismantle-btn');
    if (dismantleBtn) {
      dismantleBtn.addEventListener('click', () => this.handleDismantle());
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
    
    // 渲染材料库存
    const materialInventoryHtml = this.materialInventory ? this.materialInventory.render(this.player) : '';
    
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
      
      <!-- 材料库存显示 -->
      ${materialInventoryHtml}

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
    if (this.soundManager) {
      this.soundManager.playForge();
    }
    
    const result = this.blacksmithSystem.unlockSocket(item, this.player);
    
    if (result.success) {
      // 触发自动保存
      if (this.autoSave) {
        this.autoSave.save();
      }
      
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
    if (this.soundManager) {
      this.soundManager.playSynthesis();
    }

    const result = this.blacksmithSystem.synthesizeGem(gemItem, this.player);

    if (result.success) {
      // 记录历史
      if (this.historyTracker && result.resultGem) {
        this.historyTracker.recordSynthesis(gemItem, result.resultGem, 3);
      }
      
      // 触发自动保存
      if (this.autoSave) {
        this.autoSave.save();
      }
      
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
      // 播放镶嵌音效
      if (this.soundManager) {
        this.soundManager.playSocketGem();
      }
      
      // 记录历史
      if (this.historyTracker) {
        this.historyTracker.recordSocket(item, gemItem, socketIndex, 0);
      }
      
      // 触发自动保存
      if (this.autoSave) {
        this.autoSave.save();
      }
      
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
    
    // 获取宝石信息用于记录历史
    const socket = item.meta?.sockets?.[socketIndex];
    let gemInfo = null;
    if (socket && socket.gemId) {
      import('../constants.js').then(module => {
        const EQUIPMENT_DB = module.EQUIPMENT_DB;
        gemInfo = EQUIPMENT_DB[socket.gemId];
      });
    }
    
    const result = this.blacksmithSystem.unsocketGem(item, socketIndex, this.player, unsocketCost);
    
    if (result.success) {
      // 播放拆除音效
      if (this.soundManager) {
        this.soundManager.playUnsocketGem();
      }
      
      // 记录历史
      if (this.historyTracker && gemInfo) {
        this.historyTracker.recordUnsocket(item, gemInfo, socketIndex, unsocketCost);
      }
      
      // 触发自动保存
      if (this.autoSave) {
        this.autoSave.save();
      }
      
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
    
    // 触发自动保存
    if (this.autoSave) {
      this.autoSave.save();
    }
    
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
    
    // 触发自动保存
    if (this.autoSave) {
      this.autoSave.save();
    }
    
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
    
    // 触发自动保存
    if (this.autoSave) {
      this.autoSave.save();
    }
    
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

    try {
      // 强化/锻造按钮点击时，播放锻造音效
      if (this.soundManager) {
        this.soundManager.playForge();
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
      
      // 记录强化前的等级
      const fromLevel = this.selectedItem.enhanceLevel || 0;
      const details = this.blacksmithSystem.getItemDetails(this.selectedItem);
      const cost = details.enhanceCost || 0;

      const result = this.blacksmithSystem.enhanceItem(this.selectedItem, this.player, options);

      // 播放强化特效（成功或失败）
      const game = window.game;
      if (game && game.enhancementEffects) {
        try {
          const canvas = game.canvas;
          const centerX = canvas.width / 2;
          const centerY = canvas.height / 2;
          
          if (result.success) {
            // 播放成功特效（金色闪光）
            game.enhancementEffects.playSuccessEffect(centerX, centerY);
          } else {
            // 播放失败特效（红色烟雾）
            game.enhancementEffects.playFailureEffect(centerX, centerY);
          }
        } catch (animError) {
          if (this.errorHandler) {
            this.errorHandler.handleAnimationError('enhance', animError);
          }
        }
      }

      if (result.success) {
        // 强化成功，消耗所有幸运石
        if (this.selectedItem.luckyStoneSlots) {
          this.selectedItem.luckyStoneSlots = [];
        }
        
        // 记录历史
        const toLevel = this.selectedItem.enhanceLevel || 0;
        if (this.historyTracker) {
          this.historyTracker.recordEnhance(this.selectedItem, true, cost, fromLevel, toLevel);
        }
        
        // 添加经验
        if (this.blacksmithLevelDisplay) {
          this.blacksmithLevelDisplay.addExperience(5, '强化装备');
        }
        
        // 触发自动保存
        if (this.autoSave) {
          try {
            this.autoSave.save();
          } catch (saveError) {
            if (this.errorHandler) {
              this.errorHandler.handleSyncError('enhance', saveError);
            }
          }
        }
        
        // 播放成功音效
        if (this.soundManager) {
          this.soundManager.playEnhanceSuccess();
        }
        
        // 显示成功消息
        this.showMessage(result.message, 'success');
        
        // 更新UI
        this.renderItemList();
        this.renderItemDetails(this.selectedItem);
        
        // 更新游戏UI
        if (game && game.ui) {
          game.ui.updateStats(this.player);
        }
      } else {
        // 强化失败，也消耗所有幸运石
        if (this.selectedItem.luckyStoneSlots) {
          this.selectedItem.luckyStoneSlots = [];
        }
        
        // 记录历史
        if (this.historyTracker) {
          this.historyTracker.recordEnhance(this.selectedItem, false, cost, fromLevel, fromLevel);
        }
        
        // 触发自动保存
        if (this.autoSave) {
          try {
            this.autoSave.save();
          } catch (saveError) {
            if (this.errorHandler) {
              this.errorHandler.handleSyncError('enhance', saveError);
            }
          }
        }
        
        // 播放失败音效
        if (this.soundManager) {
          this.soundManager.playEnhanceFailure();
        }
        
        // 显示失败消息
        this.showMessage(result.message, 'error');
        
        // 刷新UI以显示幸运石已被消耗
        this.renderItemDetails(this.selectedItem);
      }
    } catch (error) {
      if (this.errorHandler) {
        this.errorHandler.logError('ENHANCE_ERROR', '强化操作失败', error);
        this.errorHandler.showErrorMessage('强化失败', '执行强化操作时发生错误，请重试。', 'error');
      }
    }
  }

  /**
   * 处理重铸
   */
  handleReforge() {
    if (!this.selectedItem || !this.player) return;
    
    // 记录重铸前的品质
    const fromQuality = this.selectedItem.quality || 'COMMON';
    const details = this.blacksmithSystem.getItemDetails(this.selectedItem);
    const cost = details.reforgeCost || 0;

    const result = this.blacksmithSystem.reforgeItem(this.selectedItem, this.player);

    if (result.success) {
      // ✅ 重铸成功后播放锻造音效
      if (this.soundManager) {
        this.soundManager.playReforge();
      }
      
      // 记录历史
      const toQuality = this.selectedItem.quality || 'COMMON';
      if (this.historyTracker) {
        this.historyTracker.recordReforge(this.selectedItem, cost, fromQuality, toQuality);
      }
      
      // 添加经验
      if (this.blacksmithLevelDisplay) {
        this.blacksmithLevelDisplay.addExperience(3, '重铸品质');
      }
      
      // 触发自动保存
      if (this.autoSave) {
        this.autoSave.save();
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
   * 渲染装备拆解面板
   */
  renderDismantlePanel(item) {
    if (!item) {
      this.elements.itemDetails.innerHTML = '<p class="forge-placeholder">选择一件装备来拆解</p>';
      return;
    }
    
    const itemName = this.blacksmithSystem.getItemDisplayName(item);
    const itemColor = this.blacksmithSystem.getItemQualityColor(item);
    const dismantleValue = this.blacksmithSystem.calculateDismantleValue(item);
    const enhanceLevel = item.enhanceLevel || 0;
    const quality = item.quality || 'COMMON';
    
    this.elements.itemDetails.innerHTML = `
      <div class="detail-section">
        <h4 style="color: ${itemColor};">${itemName}</h4>
        <div class="stat-row">
          <span class="stat-label">品质:</span>
          <span class="stat-value" style="color: ${itemColor};">${quality}</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">强化等级:</span>
          <span class="stat-value">+${enhanceLevel}</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">拆解价值:</span>
          <span class="stat-value" style="color: #ffd700;">${dismantleValue} 金币</span>
        </div>
      </div>
      
      <div class="detail-section">
        <h4>拆解说明</h4>
        <p style="color: #aaa; font-size: 14px; line-height: 1.6;">
          拆解装备将永久销毁该装备，并获得金币。<br>
          拆解价值基于装备品质和强化等级计算。<br>
          <span style="color: #ff5722;">此操作无法撤销！</span>
        </p>
      </div>
      
      <div class="forge-actions">
        <button class="forge-btn forge-btn-dismantle" id="forge-dismantle-btn">
          确认拆解<br>
          <small>获得: ${dismantleValue} 金币</small>
        </button>
      </div>
    `;
    
    // 添加按钮事件监听器
    const dismantleBtn = document.getElementById('forge-dismantle-btn');
    if (dismantleBtn) {
      dismantleBtn.addEventListener('click', () => this.handleDismantle());
    }
  }
  
  /**
   * 渲染批量操作面板
   */
  renderBatchPanel() {
    if (!this.elements.itemDetails || !this.batchOperationPanel) return;

    // 默认显示批量强化面板
    const mode = 'enhance'; // 可以扩展为支持切换
    
    this.elements.itemDetails.innerHTML = this.batchOperationPanel.render(mode);
    
    // 绑定事件
    this.batchOperationPanel.bindEvents();
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
      if (this.soundManager) {
        this.soundManager.playDismantle();
        this.soundManager.playCoins();
      }
      
      // 记录历史
      if (this.historyTracker) {
        this.historyTracker.recordDismantle(this.selectedItem, result.value || dismantleValue);
      }
      
      // 触发自动保存
      if (this.autoSave) {
        this.autoSave.save();
      }
      
      // 显示浮动文字
      const game = window.game;
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
   * 渲染铁匠NPC头像
   * 从 FORGE_BLACKSMITH_NPC 精灵图（2行3列，6帧）中提取第一帧
   */
  renderBlacksmithAvatar() {
    const game = window.game;
    const loader = game?.loader;
    const blacksmithImg = loader?.getImage('FORGE_BLACKSMITH_NPC');
    
    const canvas = document.getElementById('blacksmith-avatar-canvas');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    
    if (!blacksmithImg || !blacksmithImg.complete) {
      // 降级方案：显示占位符
      ctx.fillStyle = '#333';
      ctx.fillRect(0, 0, 64, 64);
      ctx.fillStyle = '#d4af37';
      ctx.font = '20px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('NPC', 32, 32);
      
      // 图片加载完成后重新渲染
      if (blacksmithImg) {
        blacksmithImg.onload = () => this.renderBlacksmithAvatar();
      }
      return;
    }
    
    // 精灵图布局：2行3列，共6帧
    // 显示第一帧（待机动作）：row=0, col=0
    const totalRows = 2;
    const totalCols = 3;
    const cellW = Math.floor(blacksmithImg.width / totalCols);
    const cellH = Math.floor(blacksmithImg.height / totalRows);
    
    const row = 0; // 第一行
    const col = 0; // 第一列
    const sx = col * cellW;
    const sy = row * cellH;
    
    // 清空画布
    ctx.clearRect(0, 0, 64, 64);
    
    // 绘制铁匠头像
    ctx.drawImage(blacksmithImg, sx, sy, cellW, cellH, 0, 0, 64, 64);
  }
  
  /**
   * 更新铁匠等级显示
   */
  updateBlacksmithLevel() {
    const game = window.game;
    const blacksmithNPC = game?.blacksmithNPC;
    
    const levelText = document.getElementById('blacksmith-level-text');
    if (levelText && blacksmithNPC) {
      levelText.textContent = blacksmithNPC.level || 1;
    }
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
  
  /**
   * 初始化NPC渲染器
   */
  async initializeNPCRenderer() {
    try {
      // 动态导入BlacksmithNPCRenderer
      const { BlacksmithNPCRenderer } = await import('./forge/BlacksmithNPCRenderer.js');
      
      // 创建NPC渲染器实例
      this.npcRenderer = new BlacksmithNPCRenderer(this);
      
      // 找到forge-modal容器
      const forgeModal = this.elements.overlay.querySelector('.forge-modal');
      if (!forgeModal) {
        console.warn('找不到forge-modal容器');
        return;
      }
      
      // 初始化NPC渲染器
      this.npcRenderer.initialize(forgeModal);
      
      console.log('✓ NPC渲染器已初始化');
    } catch (error) {
      console.error('✗ NPC渲染器初始化失败:', error);
    }
  }
  
  /**
   * 启动火花特效（使用Canvas绘制，类似主菜单）
   */
  startSparkleEffect() {
    // 创建Canvas用于绘制火花
    const forgeModal = this.elements.overlay.querySelector('.forge-modal');
    if (!forgeModal) {
      console.warn('[ForgeUI] 找不到 forge-modal，无法启动火花特效');
      return;
    }
    
    // 检查是否已存在canvas
    let sparkleCanvas = forgeModal.querySelector('#forge-sparkle-canvas');
    if (!sparkleCanvas) {
      sparkleCanvas = document.createElement('canvas');
      sparkleCanvas.id = 'forge-sparkle-canvas';
      sparkleCanvas.style.position = 'absolute';
      sparkleCanvas.style.top = '0';
      sparkleCanvas.style.left = '0';
      sparkleCanvas.style.width = '100%';
      sparkleCanvas.style.height = '100%';
      sparkleCanvas.style.pointerEvents = 'none';
      sparkleCanvas.style.zIndex = '2'; // 在遮罩层之上，但在交互元素之下
      forgeModal.appendChild(sparkleCanvas);
    }
    
    // 设置canvas尺寸
    const rect = forgeModal.getBoundingClientRect();
    sparkleCanvas.width = rect.width;
    sparkleCanvas.height = rect.height;
    
    const ctx = sparkleCanvas.getContext('2d');
    
    // 初始化火星粒子
    const emberCount = 40;
    const embers = [];
    
    console.log(`[ForgeUI] 初始化 ${emberCount} 个粒子...`);
    
    for (let i = 0; i < emberCount; i++) {
      embers.push({
        x: Math.random() * sparkleCanvas.width,
        y: Math.random() * sparkleCanvas.height,
        vx: (Math.random() - 0.5) * 1,
        vy: -0.5 - Math.random() * 1,
        size: 2 + Math.random() * 3,
        opacity: 0.6 + Math.random() * 0.4,
        life: 0,
        maxLife: 2.5 + Math.random() * 2,
        swayFreq: 1 + Math.random(),
        swayAmp: 15 + Math.random() * 15,
        phase: Math.random() * Math.PI * 2
      });
    }
    
    let lastTime = performance.now();
    let totalTime = 0;
    
    // 重置粒子函数
    const resetParticle = (particle) => {
      particle.life = 0;
      particle.maxLife = 2.5 + Math.random() * 2;
      particle.x = Math.random() * sparkleCanvas.width;
      particle.vx = (Math.random() - 0.5) * 1;
      particle.vy = -0.5 - Math.random() * 1;
      particle.size = 2 + Math.random() * 3;
      particle.opacity = 0.6 + Math.random() * 0.4;
      particle.swayFreq = 1 + Math.random();
      particle.swayAmp = 15 + Math.random() * 15;
      particle.phase = Math.random() * Math.PI * 2;
      
      if (Math.random() < 0.8) {
        particle.y = sparkleCanvas.height + particle.size;
      } else {
        const lowerRegionStart = sparkleCanvas.height * 0.4;
        particle.y = lowerRegionStart + Math.random() * (sparkleCanvas.height - lowerRegionStart);
      }
    };
    
    // 动画循环
    const animate = () => {
      if (!this.isOpen) return;
      
      const currentTime = performance.now();
      const dt = Math.min((currentTime - lastTime) / 1000, 0.1);
      lastTime = currentTime;
      totalTime += dt;
      
      // 更新粒子
      for (let particle of embers) {
        particle.life += dt;
        
        if (particle.life > particle.maxLife) {
          resetParticle(particle);
          continue;
        }
        
        // 湍流效果
        const offset = Math.sin(totalTime * particle.swayFreq + particle.phase) * particle.swayAmp * dt;
        particle.x += offset;
        
        // 基础移动
        particle.x += particle.vx * dt * 40;
        particle.y += particle.vy * dt * 40;
        
        // 边界处理
        if (particle.y < -particle.size) {
          resetParticle(particle);
          continue;
        }
        
        if (particle.x < -particle.size * 2) {
          particle.x = sparkleCanvas.width + particle.size * 2;
        } else if (particle.x > sparkleCanvas.width + particle.size * 2) {
          particle.x = -particle.size * 2;
        }
        
        // 随机速度变化
        particle.vx += (Math.random() - 0.5) * 0.2 * dt;
        particle.vx = Math.max(-2, Math.min(2, particle.vx));
      }
      
      // 绘制
      ctx.clearRect(0, 0, sparkleCanvas.width, sparkleCanvas.height);
      ctx.globalCompositeOperation = 'lighter';
      
      for (let particle of embers) {
        if (particle.x < -particle.size * 2 || particle.x > sparkleCanvas.width + particle.size * 2 ||
            particle.y < -particle.size * 2 || particle.y > sparkleCanvas.height + particle.size * 2) {
          continue;
        }
        
        const lifeProgress = particle.life / particle.maxLife;
        let r, g, b, alpha;
        
        if (lifeProgress <= 0.2) {
          r = 255; g = 240; b = 150;
          alpha = particle.opacity;
        } else if (lifeProgress <= 0.6) {
          const t = (lifeProgress - 0.2) / 0.4;
          r = 255;
          g = Math.round(240 * (1 - t) + 100 * t);
          b = Math.round(150 * (1 - t) + 50 * t);
          alpha = particle.opacity;
        } else {
          const t = (lifeProgress - 0.6) / 0.4;
          r = Math.round(255 * (1 - t) + 150 * t);
          g = Math.round(100 * (1 - t) + 50 * t);
          b = Math.round(50 * (1 - t) + 50 * t);
          alpha = particle.opacity * (1 - t);
        }
        
        ctx.globalAlpha = alpha;
        
        const gradient = ctx.createRadialGradient(
          particle.x, particle.y, 0,
          particle.x, particle.y, particle.size
        );
        
        gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${alpha})`);
        gradient.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, ${alpha * 0.6})`);
        gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();
      }
      
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1.0;
      
      this.sparkleAnimationFrame = requestAnimationFrame(animate);
    };
    
    animate();
  }
  
  /**
   * 停止火花特效
   */
  stopSparkleEffect() {
    if (this.sparkleAnimationFrame) {
      cancelAnimationFrame(this.sparkleAnimationFrame);
      this.sparkleAnimationFrame = null;
    }
    
    // 移除canvas
    const forgeModal = this.elements.overlay?.querySelector('.forge-modal');
    if (forgeModal) {
      const sparkleCanvas = forgeModal.querySelector('#forge-sparkle-canvas');
      if (sparkleCanvas) {
        sparkleCanvas.remove();
      }
    }
  }
}

