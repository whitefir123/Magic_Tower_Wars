// InventoryUI.js - 背包和装备栏界面
// 独立管理背包UI的所有渲染和交互逻辑

import { ICON_GRID_COLS, ICON_GRID_ROWS, EQUIPMENT_DB } from '../constants.js';
import { globalTooltipManager } from '../utils/TooltipManager.js';
import { getSetConfig } from '../data/sets.js';

/**
 * InventoryUI - 背包和装备界面管理器
 * 负责渲染背包、装备栏，处理拖拽、点击、提示等交互
 * 完全独立的组件，不依赖外部 DOM 操作
 */
export class InventoryUI {
  constructor(config = {}) {
    // 样式配置对象（允许外部自定义）
    this.style = {
      // 背包格子配置
      slotSize: config.slotSize || 48,
      slotGap: config.slotGap || 4,
      slotBorderRadius: config.slotBorderRadius || 4,
      
      // 装备栏图标配置
      equipmentIconSize: config.equipmentIconSize || 28,
      
      // 面板配置
      panelOffsetX: config.panelOffsetX || 0,
      panelOffsetY: config.panelOffsetY || 0,
      panelScale: config.panelScale || 1.0,
      
      // 提示框配置
      tooltipOffsetX: config.tooltipOffsetX || 12,
      tooltipOffsetY: config.tooltipOffsetY || 12,
      
      // 动画配置
      enableAnimations: config.enableAnimations !== false,
      ...config.customStyles
    };

    // 内部状态
    this.actionMenuState = { visible: false, itemId: null, slotIndex: null };
    this.isOpen = false;
    this.player = null;
    
    // DOM 元素引用（延迟初始化）
    this.elements = {
      overlay: null,
      inventorySlots: null,
      equipmentSockets: null,
      actionMenu: null
    };

    // 使用全局 TooltipManager
    this.tooltipManager = globalTooltipManager;
    // 应用自定义偏移配置
    if (config.tooltipOffsetX || config.tooltipOffsetY) {
      this.tooltipManager.updateConfig({
        offsetX: config.tooltipOffsetX || 12,
        offsetY: config.tooltipOffsetY || 12
      });
    }

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
    console.log('✓ InventoryUI 已初始化', this.style);
  }

  /**
   * 初始化 DOM 元素引用
   */
  initDOMElements() {
    this.elements.overlay = document.getElementById('inventory-overlay');
    this.elements.actionMenu = document.getElementById('item-action-menu');
    
    // 确保action menu元素存在
    if (!this.elements.actionMenu) {
      console.warn('Action menu element not found, creating it');
      const actionMenu = document.createElement('div');
      actionMenu.id = 'item-action-menu';
      actionMenu.className = 'hidden';
      actionMenu.innerHTML = `
        <div class="action-menu-item" data-action="use">使用/装备</div>
        <div class="action-menu-item" data-action="discard">丢弃</div>
        <div class="action-menu-item" data-action="cancel">取消</div>
      `;
      document.body.appendChild(actionMenu);
      this.elements.actionMenu = actionMenu;
    }
    
    // 应用样式配置到面板
    if (this.elements.overlay) {
      const panel = this.elements.overlay.querySelector('.inventory-panel');
      if (panel && this.style.panelScale !== 1.0) {
        panel.style.transform = `scale(${this.style.panelScale})`;
      }
    }
    
    console.log('✓ DOM elements initialized:', {
      overlay: !!this.elements.overlay,
      actionMenu: !!this.elements.actionMenu
    });
  }

  /**
   * 设置事件监听器
   */
  setupEventListeners() {
    // 操作菜单监听器
    this.setupActionMenuListeners();
    
    // 关闭按钮监听器
    if (this.elements.overlay) {
      // 支持两种类名：.inventory-close-btn 或 .btn-modal-close
      const closeBtn = this.elements.overlay.querySelector('.inventory-close-btn, .btn-modal-close');
      if (closeBtn) {
        closeBtn.addEventListener('click', () => this.close());
      }
      
      // 点击 overlay 外部关闭
      this.elements.overlay.addEventListener('click', (e) => {
        if (e.target === this.elements.overlay) {
          this.close();
        }
      });
    }
  }

  /**
   * 设置操作菜单监听器
   */
  setupActionMenuListeners() {
    // FIX: 防止重复初始化（避免重复绑定监听器导致的多次触发）
    if (this.menuListenersInitialized) {
      console.log('✓ Action menu listeners already initialized, skipping');
      return;
    }
    
    // 使用更可靠的初始化方式
    const initializeMenuListeners = () => {
      if (!this.elements.actionMenu) {
        this.elements.actionMenu = document.getElementById('item-action-menu');
      }
      
      const menu = this.elements.actionMenu;
      if (!menu) {
        console.warn('Action menu element not found during setup, will retry');
        // 如果菜单元素还没有准备好，等待一下再试
        setTimeout(initializeMenuListeners, 100);
        return;
      }
      
      // FIX: 检查是否已经初始化（防止 setTimeout 重复触发）
      if (this.menuListenersInitialized) {
        return;
      }

      console.log('✓ Setting up action menu listeners');

      // 防止重复绑定
      if (menu._listenersInitialized) {
        console.log('Action menu listeners already initialized');
        return;
      }
      menu._listenersInitialized = true;

      // 点击外部关闭菜单
      const outsideClickHandler = (e) => {
        if (this.actionMenuState.visible && menu && !menu.contains(e.target)) {
          console.log('Closing action menu (clicked outside)');
          this.hideActionMenu();
        }
      };
      document.addEventListener('click', outsideClickHandler);
      // 保存引用以便清理
      menu._outsideClickHandler = outsideClickHandler;

      // 菜单项点击处理
      const items = menu.querySelectorAll('.action-menu-item');
      console.log(`Found ${items.length} action menu items`);
      
      items.forEach(item => {
        const clickHandler = (e) => {
          e.stopPropagation();
          const action = item.dataset.action;
          console.log('Action menu item clicked:', action);
          this.handleMenuAction(action);
        };
        item.addEventListener('click', clickHandler);
        // 保存引用以便清理
        item._clickHandler = clickHandler;
      });
      
      // FIX: 标记为已初始化（防止重复调用 setupActionMenuListeners）
      this.menuListenersInitialized = true;
      console.log('✓ Action menu listeners setup complete');
    };

    // 立即尝试初始化
    initializeMenuListeners();
  }

  /**
   * 处理菜单操作
   * @param {string} action - 操作类型（'use'、'discard' 或 'cancel'）
   */
  handleMenuAction(action) {
    console.log('Handling menu action:', action);
    
    const game = window.game;
    if (!game || !game.player) {
      console.warn('Game or player not available');
      return;
    }

    const { itemId, slotIndex, isFromEquipment } = this.actionMenuState;
    
    // 如果是取消操作，直接关闭菜单
    if (action === 'cancel') {
      this.hideActionMenu();
      return;
    }
    
    // FIX: 支持物品对象和字符串ID
    let item = null;
    if (typeof itemId === 'string') {
      item = EQUIPMENT_DB[itemId];
    } else if (typeof itemId === 'object') {
      item = itemId;
      // 如果对象缺少某些属性，从数据库补充
      const dbId = item.itemId || item.id;
      if (dbId && EQUIPMENT_DB[dbId]) {
        item = { ...EQUIPMENT_DB[dbId], ...item };
      }
    }
    
    if (!item) {
      console.warn('Item definition not found:', itemId);
      return;
    }

    // 获取物品的中文名称
    const itemName = item.nameZh || item.name;

    if (action === 'use') {
      console.log('Using item:', itemName);
      
      if (isFromEquipment) {
        // 从装备栏卸下
        const firstEmptySlot = game.player.inventory.findIndex(item => item === null);
        if (firstEmptySlot !== -1) {
          // FIX: 支持物品对象比较
          for (const [slotType, equippedItem] of Object.entries(game.player.equipment)) {
            const equippedId = typeof equippedItem === 'string' ? equippedItem : (equippedItem?.itemId || equippedItem?.id);
            const compareId = typeof itemId === 'string' ? itemId : (itemId?.itemId || itemId?.id);
            if (equippedId === compareId) {
              game.player.unequipToSlot(slotType, firstEmptySlot);
              break;
            }
          }
          if (game.ui) game.ui.logMessage(`卸下了 ${itemName}`, 'info');
        } else {
          if (game.ui) game.ui.logMessage('背包已满，无法卸下', 'info');
        }
      } else if (item.type === 'CONSUMABLE') {
        game.player.useItem(slotIndex);
      } else {
        game.equipFromInventory(slotIndex);
      }
    } else if (action === 'discard') {
      console.log('Discarding item:', itemName);
      
      if (isFromEquipment) {
        // FIX: 支持物品对象比较
        for (const [slotType, equippedItem] of Object.entries(game.player.equipment)) {
          const equippedId = typeof equippedItem === 'string' ? equippedItem : (equippedItem?.itemId || equippedItem?.id);
          const compareId = typeof itemId === 'string' ? itemId : (itemId?.itemId || itemId?.id);
          if (equippedId === compareId) {
            game.player.equipment[slotType] = null;
            break;
          }
        }
      } else {
        game.player.removeFromInventory(slotIndex);
      }
      if (game.ui) game.ui.logMessage(`丢弃了 ${itemName || '物品'}`, 'info');
    }

    // 更新所有相关 UI
    this.update(game.player);
    if (game.ui && game.ui.updateStats) {
      game.ui.updateStats(game.player);
    }
    this.hideActionMenu();
  }

  /**
   * 显示操作菜单
   * @param {Event} e - 鼠标事件
   * @param {string} itemId - 物品ID
   * @param {number|null} slotIndex - 背包槽位索引（装备槽为null）
   * @param {HTMLElement} slotElement - 槽位元素
   */
  showActionMenu(e, itemId, slotIndex, slotElement) {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('showActionMenu called:', { itemId, slotIndex, hasElement: !!slotElement });

    // 确保menu元素存在
    if (!this.elements.actionMenu) {
      this.elements.actionMenu = document.getElementById('item-action-menu');
      console.log('Fetching action menu element:', !!this.elements.actionMenu);
    }
    
    const menu = this.elements.actionMenu;
    if (!menu) {
      console.error('Action menu element not found!');
      // 尝试动态创建
      const newMenu = document.createElement('div');
      newMenu.id = 'item-action-menu';
      newMenu.className = '';
      newMenu.innerHTML = `
        <div class="action-menu-item" data-action="use">使用/装备</div>
        <div class="action-menu-item" data-action="discard">丢弃</div>
        <div class="action-menu-item" data-action="cancel">取消</div>
      `;
      document.body.appendChild(newMenu);
      this.elements.actionMenu = newMenu;
      // 重新设置监听器
      this.setupActionMenuListeners();
      console.log('Action menu created dynamically');
      return this.showActionMenu(e, itemId, slotIndex, slotElement);
    }

    const isFromEquipment = slotIndex === null;
    this.actionMenuState = { visible: true, itemId, slotIndex, currentSlot: slotElement, isFromEquipment };
    
    // FIX: 根据物品类型动态更新菜单文本 - 支持物品对象
    let item = null;
    if (typeof itemId === 'string') {
      item = EQUIPMENT_DB[itemId];
    } else if (typeof itemId === 'object') {
      item = itemId;
      const dbId = item.itemId || item.id;
      if (dbId && EQUIPMENT_DB[dbId]) {
        item = { ...EQUIPMENT_DB[dbId], ...item };
      }
    }
    
    if (item) {
      const useItem = menu.querySelector('[data-action="use"]');
      if (useItem) {
        if (isFromEquipment) {
          useItem.textContent = '卸下';
        } else if (item.type === 'CONSUMABLE') {
          useItem.textContent = '使用';
        } else {
          useItem.textContent = '装备';
        }
      }
    }
    
    // 移除hidden类并设置样式
    menu.classList.remove('hidden');
    menu.style.display = 'block';
    menu.style.position = 'fixed';
    menu.style.zIndex = '1000001'; // 确保在最上层（在tooltip之上）
    menu.style.pointerEvents = 'auto'; // 确保可以点击
    
    // 计算菜单位置，确保不会超出屏幕边界
    const menuWidth = menu.offsetWidth || 160;
    const menuHeight = menu.offsetHeight || 100;
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    
    let left = e.clientX;
    let top = e.clientY;
    
    // 如果菜单会超出右边界，则显示在鼠标左侧
    if (left + menuWidth > windowWidth) {
      left = e.clientX - menuWidth;
    }
    
    // 如果菜单会超出下边界，则显示在鼠标上方
    if (top + menuHeight > windowHeight) {
      top = e.clientY - menuHeight;
    }
    
    // 确保不会超出左边界和上边界
    left = Math.max(0, Math.min(left, windowWidth - menuWidth));
    top = Math.max(0, Math.min(top, windowHeight - menuHeight));
    
    menu.style.left = `${left}px`;
    menu.style.top = `${top}px`;
    
    console.log('Action menu shown:', {
      itemId,
      slotIndex,
      position: { left, top },
      menuSize: { width: menuWidth, height: menuHeight },
      isVisible: menu.style.display === 'block'
    });
  }

  /**
   * 隐藏操作菜单
   */
  hideActionMenu() {
    const menu = this.elements.actionMenu;
    if (menu) {
      menu.style.display = 'none';
      menu.classList.add('hidden');
    }
    this.actionMenuState = { visible: false, itemId: null, slotIndex: null, currentSlot: null };
    console.log('Action menu hidden');
  }

  /**
   * 打开背包界面
   */
  open() {
    console.log('🎒 Opening inventory...');
    
    if (!this.elements.overlay) {
      console.log('🎒 Initializing DOM elements...');
      this.initDOMElements();
    }
    
    if (this.elements.overlay) {
      // 使用平滑过渡显示
      this.elements.overlay.classList.remove('hidden');
      this.elements.overlay.style.display = 'flex';
      this.elements.overlay.style.pointerEvents = 'auto'; // 恢复交互能力
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
      
      // 渲染当前数据
      if (this.player) {
        console.log('🎒 Rendering inventory for player...');
        this.render(this.player);
      } else {
        console.warn('No player data to render');
      }
      
      // Apply smooth transition animation
      const layout = this.elements.overlay.querySelector('.inventory-layout');
      if (layout) {
        // Remove animation class to restart animation on re-open
        layout.classList.remove('modal-animate-enter');
        // Force reflow to restart animation
        void layout.offsetWidth;
        // Add animation class
        layout.classList.add('modal-animate-enter');
      }
      
      console.log('✓ InventoryUI 已打开');
    } else {
      console.error('Inventory overlay element not found!');
    }
  }

  /**
   * 关闭背包界面
   */
  close() {
    console.log('🎒 Closing inventory...');
    
    if (this.elements.overlay) {
      // 使用平滑过渡隐藏
      this.elements.overlay.classList.remove('overlay-fade-in');
      this.elements.overlay.classList.add('overlay-fade-out');
      // 等待过渡完成后隐藏
      setTimeout(() => {
        this.elements.overlay.classList.add('hidden');
        this.elements.overlay.style.display = 'none';
        this.elements.overlay.classList.remove('overlay-fade-out');
      }, 300);
      this.isOpen = false;
      this.hideActionMenu();
      console.log('✓ InventoryUI 已关闭');
    } else {
      console.warn('Inventory overlay element not found when closing');
    }
  }

  /**
   * 切换背包界面开关
   */
  toggle() {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  /**
   * 完整渲染背包和装备栏（初次打开时调用）
   * @param {Player} player - 玩家对象
   */
  render(player) {
    this.player = player;
    this.renderInventory(player);
    this.renderEquipmentSockets(player);
  }

  /**
   * 更新背包和装备栏（数据变化时调用）
   * @param {Player} player - 玩家对象
   */
  update(player) {
    this.player = player;
    if (this.isOpen) {
      this.render(player);
    }
  }

  /**
   * 渲染背包格子
   * @param {Player} player - 玩家对象
   */
  renderInventory(player) {
    try {
      const slots = document.querySelectorAll('.inv-slot');
      if (!slots || slots.length === 0) return;

      const loader = window.game?.loader;
      const imgEquip = loader?.getImage('ICONS_EQUIP');
      const imgCons = loader?.getImage('ICONS_CONSUMABLES');
      const cols = ICON_GRID_COLS || 4;

      // 计算图标尺寸
      const natWEquip = imgEquip ? (imgEquip.naturalWidth || imgEquip.width) : 0;
      const natHEquip = imgEquip ? (imgEquip.naturalHeight || imgEquip.height) : 0;
      const cellWEquip = imgEquip ? (natWEquip / cols) : 0;
      const cellHEquip = imgEquip ? (natHEquip / ICON_GRID_ROWS) : 0;

      const natWCons = imgCons ? (imgCons.naturalWidth || imgCons.width) : 0;
      const natHCons = imgCons ? (imgCons.naturalHeight || imgCons.height) : 0;
      const cellWCons = imgCons ? (natWCons / cols) : 0;
      const cellHCons = imgCons ? (natHCons / ICON_GRID_ROWS) : 0;

      // 拖拽辅助函数
      const setDragOver = (el, on) => {
        if (!el) return;
        if (on) el.classList.add('drag-over');
        else el.classList.remove('drag-over');
      };

      const setDragData = (e, payload) => {
        try {
          e.dataTransfer.setData('application/json', JSON.stringify(payload));
        } catch {
          e.dataTransfer.setData('text/plain', JSON.stringify(payload));
        }
        e.dataTransfer.effectAllowed = 'move';
      };

      const getDragData = (e) => {
        let t = e.dataTransfer.getData('application/json') || e.dataTransfer.getData('text/plain');
        try {
          return JSON.parse(t || '{}');
        } catch {
          return {};
        }
      };

      // 渲染每个格子
      slots.forEach((slot, idx) => {
        slot.innerHTML = '';
        
        // 应用样式配置
        if (this.style.slotBorderRadius) {
          slot.style.borderRadius = `${this.style.slotBorderRadius}px`;
        }

        // 设置拖拽目标
        slot.ondragover = (ev) => { ev.preventDefault(); setDragOver(slot, true); };
        slot.ondragleave = () => setDragOver(slot, false);
        slot.ondrop = (ev) => {
          ev.preventDefault();
          setDragOver(slot, false);
          const data = getDragData(ev);
          const game = window.game;
          if (!game) return;

          if (data.source === 'inv' && typeof data.index === 'number') {
            // 背包内交换
            game.player.swapInventory(data.index, idx);
            this.update(game.player);
            if (game.ui) game.ui.updateStats(game.player);
          } else if (data.source === 'equip') {
            // 从装备栏卸下
            if (game.player.unequipToSlot(data.slot, idx)) {
              this.update(game.player);
              if (game.ui) game.ui.updateStats(game.player);
            }
          }
        };

        // FIX: 渲染物品图标 - 支持物品对象和字符串ID
        const itemOrId = player.inventory[idx];
        if (!itemOrId) {
          // 空格子
          slot.onclick = null;
          slot.removeAttribute('draggable');
          this.tooltipManager.unbind(slot);
          return;
        }
        
        // 获取物品ID和物品定义
        let itemId = null;
        let item = null;
        
        if (typeof itemOrId === 'string') {
          // 旧代码兼容：字符串ID
          itemId = itemOrId;
          item = EQUIPMENT_DB[itemId];
        } else if (typeof itemOrId === 'object') {
          // 新代码：物品对象
          itemId = itemOrId.itemId || itemOrId.id;
          item = itemOrId;
          // 如果对象缺少某些属性，从数据库补充
          if (itemId && EQUIPMENT_DB[itemId]) {
            const dbItem = EQUIPMENT_DB[itemId];
            // 合并，实例属性优先
            item = { ...dbItem, ...itemOrId };
          }
        }
        
        if (!item || !itemId) {
          // 无效物品
          slot.onclick = null;
          slot.removeAttribute('draggable');
          this.tooltipManager.unbind(slot);
          return;
        }
        
        const isConsumable = item.type === 'CONSUMABLE';
        const img = isConsumable ? imgCons : imgEquip;
        const cellW = isConsumable ? cellWCons : cellWEquip;
        const cellH = isConsumable ? cellHCons : cellHEquip;

        if (img) {
          const canvas = this.createItemIcon(img, item, cellW, cellH, this.style.slotSize, cols);
          if (canvas) slot.appendChild(canvas);
        }

        // 绑定点击事件 - 左键单击显示操作菜单
        slot.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log('Inventory slot clicked:', idx, itemId);
          this.showActionMenu(e, itemId, idx, slot);
        };
        
        // 右键也显示操作菜单
        slot.oncontextmenu = (e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log('Inventory slot right-clicked:', idx, itemId);
          this.showActionMenu(e, itemId, idx, slot);
          return false;
        };

        // FIX: 绑定提示框 - 传递物品对象或ID
        this.tooltipManager.bind(slot, itemOrId);

        // 设置拖拽（装备可拖拽，消耗品不可）
        if (!isConsumable) {
          slot.setAttribute('draggable', 'true');
          slot.ondragstart = (ev) => setDragData(ev, { source: 'inv', index: idx, itemId: itemId });
        } else {
          slot.removeAttribute('draggable');
        }
      });
    } catch (e) {
      console.warn('renderInventory failed', e);
    }
  }

  /**
   * 渲染装备栏
   * @param {Player} player - 玩家对象
   */
  renderEquipmentSockets(player) {
    try {
      const slotTypes = ['HELM', 'WEAPON', 'ARMOR', 'BOOTS', 'RING', 'AMULET'];
      const img = window.game?.loader?.getImage('ICONS_EQUIP');
      const cols = ICON_GRID_COLS || 4;
      const natW = img ? (img.naturalWidth || img.width) : 0;
      const natH = img ? (img.naturalHeight || img.height) : 0;
      const cellW = img ? (natW / cols) : 0;
      const cellH = img ? (natH / ICON_GRID_ROWS) : 0;

      const setDragOver = (el, on) => {
        if (!el) return;
        if (on) el.classList.add('drag-over');
        else el.classList.remove('drag-over');
      };

      const setDragData = (e, payload) => {
        try {
          e.dataTransfer.setData('application/json', JSON.stringify(payload));
        } catch {
          e.dataTransfer.setData('text/plain', JSON.stringify(payload));
        }
        e.dataTransfer.effectAllowed = 'move';
      };

      const getDragData = (e) => {
        let t = e.dataTransfer.getData('application/json') || e.dataTransfer.getData('text/plain');
        try {
          return JSON.parse(t || '{}');
        } catch {
          return {};
        }
      };

      slotTypes.forEach((slotType) => {
        const sockets = document.querySelectorAll(`.equip-socket[data-slot="${slotType}"]`);
        // FIX: 支持物品对象和字符串ID
        const itemOrId = player.equipment?.[slotType];
        
        // 获取物品ID和物品定义
        let itemId = null;
        let item = null;
        
        if (!itemOrId) {
          // 空槽位
          sockets.forEach((socket) => {
            socket.innerHTML = '';
            socket.title = slotType;
            this.tooltipManager.unbind(socket);
            socket.removeAttribute('draggable');
            socket.onclick = null;
            socket.ondragover = (ev) => { ev.preventDefault(); setDragOver(socket, true); };
            socket.ondragleave = () => setDragOver(socket, false);
            socket.ondrop = (ev) => {
              ev.preventDefault();
              setDragOver(socket, false);
              const data = getDragData(ev);
              const game = window.game;
              if (!game) return;
              if (data.source === 'inv' && data.itemId && typeof data.index === 'number') {
                const def = EQUIPMENT_DB[data.itemId];
                if (def && def.type === slotType) {
                  game.equipFromInventory(data.index);
                  this.update(game.player);
                  if (game.ui) game.ui.updateStats(game.player);
                }
              }
            };
          });
          return;
        }
        
        if (typeof itemOrId === 'string') {
          // 旧代码兼容：字符串ID
          itemId = itemOrId;
          item = EQUIPMENT_DB[itemId];
        } else if (typeof itemOrId === 'object') {
          // 新代码：物品对象
          itemId = itemOrId.itemId || itemOrId.id;
          item = itemOrId;
          // 如果对象缺少某些属性，从数据库补充
          if (itemId && EQUIPMENT_DB[itemId]) {
            const dbItem = EQUIPMENT_DB[itemId];
            // 合并，实例属性优先
            item = { ...dbItem, ...itemOrId };
          }
        }
        
        if (!item || !itemId) {
          // 无效物品
          sockets.forEach((socket) => {
            socket.innerHTML = '';
            socket.title = slotType;
            this.tooltipManager.unbind(socket);
            socket.removeAttribute('draggable');
            socket.onclick = null;
          });
          return;
        }

        sockets.forEach((socket) => {
          socket.innerHTML = '';

          // 拖拽放置监听
          socket.ondragover = (ev) => { ev.preventDefault(); setDragOver(socket, true); };
          socket.ondragleave = () => setDragOver(socket, false);
          socket.ondrop = (ev) => {
            ev.preventDefault();
            setDragOver(socket, false);
            const data = getDragData(ev);
            const game = window.game;
            if (!game) return;

            if (data.source === 'inv' && data.itemId) {
              const def = EQUIPMENT_DB[data.itemId];
              if (def && def.type === slotType && typeof data.index === 'number') {
                game.equipFromInventory(data.index);
                this.update(game.player);
                if (game.ui) game.ui.updateStats(game.player);
              }
            }
          };

          const itemName = item.nameZh || item.name;
          // 使用中文属性名称
          const statName = { p_atk: '物攻', m_atk: '魔攻', p_def: '物防', m_def: '魔防' };
          // FIX: 优先使用实例对象的stats（可能包含强化后的属性）
          const statsToShow = item.stats || {};
          const statsText = Object.entries(statsToShow)
            .map(([k, v]) => `${statName[k] || k}+${v}`)
            .join(', ');
          socket.title = `${itemName} | ${statsText}`;
          
          if (img) {
            const canvas = this.createItemIcon(img, item, cellW, cellH, this.style.equipmentIconSize, cols);
            if (canvas) socket.appendChild(canvas);
          }

          // v2.0: 检查套装效果，添加流光边框动画
          // 移除之前的套装类
          socket.classList.remove('set-active-2', 'set-active-4');
          
          if (item.meta && item.meta.setId) {
            const setId = item.meta.setId;
            const setConfig = getSetConfig(setId);
            
            if (setConfig) {
              // 计算玩家当前装备的套装件数
              let setCount = 0;
              if (player.equipment) {
                for (const [slot, equippedItem] of Object.entries(player.equipment)) {
                  if (equippedItem && typeof equippedItem === 'object' && equippedItem.meta && equippedItem.meta.setId === setId) {
                    setCount++;
                  }
                }
              }
              
              // 检查是否激活了2件套或4件套效果
              const pieceCounts = Object.keys(setConfig.pieces).map(Number).sort((a, b) => a - b);
              let maxActivePieces = 0;
              
              for (const pieceCount of pieceCounts) {
                if (setCount >= pieceCount) {
                  maxActivePieces = pieceCount;
                }
              }
              
              // 如果激活了2件套或4件套，添加流光边框效果
              if (maxActivePieces >= 2) {
                socket.classList.add('set-active-2');
              }
              if (maxActivePieces >= 4) {
                socket.classList.add('set-active-4');
              }
            }
          }
          
          // FIX: 绑定提示框 - 传递物品对象或ID
          this.tooltipManager.bind(socket, itemOrId);
          socket.setAttribute('draggable', 'true');
          socket.ondragstart = (ev) => setDragData(ev, { source: 'equip', slot: slotType, itemId: itemId });
          
          // 左键单击装备槽显示操作菜单
          socket.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Equipment socket clicked:', slotType, itemId);
            this.showActionMenu(e, itemId, null, socket);
          };
          
          // 右键也显示操作菜单
          socket.oncontextmenu = (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Equipment socket right-clicked:', slotType, itemId);
            this.showActionMenu(e, itemId, null, socket);
            return false;
          };
        });
      });
    } catch (e) {
      console.warn('renderEquipmentSockets failed', e);
    }
  }

  /**
   * 创建物品图标 canvas
   * @param {Image} img - 图标图片
   * @param {object} item - 物品数据
   * @param {number} cellW - 图标单元格宽度
   * @param {number} cellH - 图标单元格高度
   * @param {number} size - 目标尺寸
   * @param {number} cols - 图标列数
   * @returns {HTMLCanvasElement}
   */
  createItemIcon(img, item, cellW, cellH, size, cols) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    const idxIcon = item.iconIndex || 0;
    const col = idxIcon % cols;
    const row = Math.floor(idxIcon / cols);
    
    // 使用整数像素切割，防止边缘模糊和偏移
    // 使用 Math.round 确保切割坐标是整数
    const sx = Math.round(col * cellW);
    const sy = Math.round(row * cellH);
    // 计算实际切割宽度和高度（确保不会超出边界）
    const sw = Math.round(cellW);
    const sh = Math.round(cellH);

    ctx.imageSmoothingEnabled = false;

    // 保持宽高比并居中显示
    const cellAspect = sw / sh;
    let destW = size;
    let destH = size;

    if (cellAspect > 1) {
      // 图标更宽，按高度适配
      destH = size;
      destW = size * cellAspect;
    } else if (cellAspect < 1) {
      // 图标更高，按宽度适配
      destW = size;
      destH = size / cellAspect;
    }

    // 居中对齐
    const offsetX = Math.round((size - destW) / 2);
    const offsetY = Math.round((size - destH) / 2);

    ctx.drawImage(img, sx, sy, sw, sh, offsetX, offsetY, destW, destH);
    return canvas;
  }

  /**
   * 设置 resize 事件处理（响应窗口大小变化）
   */
  setupResizeHandler() {
    window.addEventListener('resize', () => {
      if (this.isOpen && this.player) {
        // 窗口大小变化时重新渲染
        this.render(this.player);
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
      const panel = this.elements.overlay.querySelector('.inventory-panel');
      if (panel) {
        panel.style.transform = `scale(${newStyles.panelScale})`;
      }
    }

    // 重新渲染
    if (this.isOpen && this.player) {
      this.render(this.player);
    }

    console.log('✓ InventoryUI 样式已更新', this.style);
  }

  /**
   * 销毁组件（清理资源）
   */
  destroy() {
    this.close();
    this.hideActionMenu();
    this.player = null;
    console.log('✓ InventoryUI 已销毁');
  }
}
