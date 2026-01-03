/**
 * DevModeManager - 开发者模式管理器
 * 负责管理开发者模式的激活、UI显示和基础功能
 */
export class DevModeManager {
  constructor() {
    this.isEnabled = false;
    this.isActive = false; // 工具栏是否展开
    this.isSelectModeActive = false; // 选择模式是否激活
    this.isDragging = false; // 是否正在拖拽（移动模式）
    this.isResizing = false; // 是否正在缩放
    
    this.elements = {
      floatingButton: null,
      toolbar: null,
      overlay: null,
      infoDisplay: null,
      exportModal: null,
      selectionBox: null,
      resizeHandle: null
    };
    
    // 元素选择与拖拽相关
    this.selectedElement = null;
    this.highlightedElement = null;
    this.dragStartX = 0;
    this.dragStartY = 0;
    this.elementStartTransform = { x: 0, y: 0 };
    
    // 缩放相关
    this.startScaleX = 1;
    this.startScaleY = 1;
    this.originalRect = null; // 元素原始尺寸（无缩放时）
    
    // 存储修改的元素 (Map<selector, {transform: string}>)
    this.modifiedElements = new Map();
    
    // 撤销历史栈
    this.historyStack = [];
    this.tempState = null; // 用于在拖拽/缩放开始时暂存状态
    this.maxHistorySize = 50; // 最大历史记录数
    
    // 检查 localStorage 中是否已启用开发者模式
    if (localStorage.getItem('devModeEnabled') === 'true') {
      this.isEnabled = true;
      this.init();
    }
    
    // 加载并应用保存的 UI 修改
    this.loadChanges();
  }

  /**
   * 启用开发者模式
   */
  enable() {
    if (this.isEnabled) return;
    
    this.isEnabled = true;
    localStorage.setItem('devModeEnabled', 'true');
    this.init();
    this.updateStatusDisplay();
    console.log('[DevMode] 开发者模式已启用');
  }

  /**
   * 禁用开发者模式
   */
  disable() {
    this.isEnabled = false;
    localStorage.setItem('devModeEnabled', 'false');
    this.destroy();
    console.log('[DevMode] 开发者模式已禁用');
  }

  /**
   * 初始化开发者模式 UI
   */
  init() {
    if (!this.isEnabled) return;
    
    this.injectStyles();
    this.createFloatingButton();
    this.createToolbar();
    this.updateStatusDisplay();
    this.applySavedChanges();
    this.setupKeyboardListeners();
  }

  /**
   * 更新设置面板中的状态显示
   */
  updateStatusDisplay() {
    const statusEl = document.getElementById('dev-mode-status');
    if (statusEl && this.isEnabled) {
      statusEl.textContent = '✓ 开发者模式已开启';
      statusEl.style.color = '#4caf50';
      statusEl.style.display = 'block';
    }
  }

  /**
   * 注入开发者工具栏样式
   */
  injectStyles() {
    // 检查样式是否已注入
    if (document.getElementById('dev-mode-styles')) return;

    const style = document.createElement('style');
    style.id = 'dev-mode-styles';
    style.textContent = `
      /* 开发者模式悬浮按钮 */
      #dev-mode-floating-btn {
        position: fixed;
        top: 10px;
        right: 10px;
        width: 60px;
        height: 60px;
        background: rgba(0, 0, 0, 0.8);
        border: 2px solid #ffd700;
        border-radius: 50%;
        color: #ffd700;
        font-size: 24px;
        cursor: pointer;
        z-index: 999999;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.3s ease;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
      }

      #dev-mode-floating-btn:hover {
        background: rgba(255, 215, 0, 0.2);
        transform: scale(1.1);
        box-shadow: 0 6px 16px rgba(255, 215, 0, 0.4);
      }

      #dev-mode-floating-btn.active {
        background: rgba(255, 215, 0, 0.3);
        border-color: #fff;
      }

      /* 开发者工具栏 */
      #dev-mode-toolbar {
        position: fixed;
        top: 80px;
        right: 10px;
        background: rgba(0, 0, 0, 0.9);
        border: 2px solid #ffd700;
        border-radius: 8px;
        padding: 15px;
        z-index: 999998;
        display: none;
        grid-template-columns: repeat(2, 1fr);
        gap: 8px;
        min-width: 240px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.8);
      }

      #dev-mode-toolbar.active {
        display: grid;
        animation: slideDown 0.3s ease-out;
      }

      @keyframes slideDown {
        from {
          opacity: 0;
          transform: translateY(-10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      /* 工具栏按钮 */
      .dev-toolbar-btn {
        background: rgba(255, 215, 0, 0.1);
        border: 1px solid #ffd700;
        color: #fff;
        padding: 8px 12px;
        border-radius: 4px;
        cursor: pointer;
        font-family: 'Arial', sans-serif;
        font-size: 13px;
        transition: all 0.2s ease;
        text-align: center;
        white-space: nowrap;
      }

      .dev-toolbar-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .dev-toolbar-btn:disabled:hover {
        background: rgba(255, 215, 0, 0.1);
        transform: none;
        box-shadow: none;
      }

      .dev-toolbar-btn:hover {
        background: rgba(255, 215, 0, 0.3);
        transform: translateY(-2px);
        box-shadow: 0 2px 8px rgba(255, 215, 0, 0.3);
      }

      .dev-toolbar-btn:active {
        transform: translateY(0);
      }

      .dev-toolbar-btn.danger {
        background: rgba(255, 0, 0, 0.1);
        border-color: #ff4444;
      }

      .dev-toolbar-btn.danger:hover {
        background: rgba(255, 0, 0, 0.3);
        box-shadow: 0 2px 8px rgba(255, 0, 0, 0.3);
      }

      /* 选择模式遮罩层 */
      #dev-mode-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: transparent;
        z-index: 99990;
        cursor: crosshair;
        pointer-events: auto;
      }

      /* 元素高亮样式（保留用于悬停提示） */
      .dev-mode-highlight {
        outline: 2px dashed red !important;
        outline-offset: 2px !important;
      }

      /* 虚拟选中框 */
      #dev-mode-selection-box {
        position: absolute;
        background: transparent;
        border: 2px solid #00bfff;
        pointer-events: none;
        display: none;
        box-sizing: border-box;
        z-index: 1;
      }

      #dev-mode-selection-box.active {
        display: block;
      }

      /* 调整大小手柄 */
      .dev-resize-handle {
        position: absolute;
        bottom: -5px;
        right: -5px;
        width: 10px;
        height: 10px;
        background: #fff;
        border: 1px solid #000;
        cursor: nwse-resize;
        pointer-events: auto;
        box-sizing: border-box;
      }

      .dev-resize-handle:hover {
        background: #00bfff;
        border-color: #fff;
      }

      /* 信息显示区域 */
      #dev-mode-info {
        position: fixed;
        top: 150px;
        right: 10px;
        background: rgba(0, 0, 0, 0.9);
        border: 2px solid #ffd700;
        border-radius: 8px;
        padding: 15px;
        z-index: 999997;
        display: none;
        flex-direction: column;
        gap: 8px;
        min-width: 250px;
        max-width: 400px;
        font-family: 'Arial', sans-serif;
        font-size: 12px;
        color: #fff;
      }

      #dev-mode-info.active {
        display: flex;
      }

      #dev-mode-info .info-item {
        display: flex;
        justify-content: space-between;
        padding: 4px 0;
        border-bottom: 1px solid rgba(255, 215, 0, 0.2);
      }

      #dev-mode-info .info-label {
        color: #8c8273;
        font-weight: bold;
      }

      #dev-mode-info .info-value {
        color: #ffd700;
        word-break: break-all;
        text-align: right;
        max-width: 60%;
      }

      /* 导出模态框 */
      #dev-mode-export-modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(0, 0, 0, 0.85);
        z-index: 9999999;
        display: none;
        justify-content: center;
        align-items: center;
        -webkit-backdrop-filter: blur(4px);
        backdrop-filter: blur(4px);
      }

      #dev-mode-export-modal.active {
        display: flex;
      }

      #dev-mode-export-content {
        background: linear-gradient(135deg, #1a1410 0%, #0f0d0a 100%);
        border: 2px solid #ffd700;
        border-radius: 8px;
        padding: 30px;
        max-width: 800px;
        width: 90%;
        max-height: 80vh;
        display: flex;
        flex-direction: column;
        box-shadow: 0 0 50px rgba(0, 0, 0, 0.95), inset 0 0 30px rgba(255, 215, 0, 0.05);
      }

      #dev-mode-export-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
        padding-bottom: 15px;
        border-bottom: 1px solid rgba(255, 215, 0, 0.3);
      }

      #dev-mode-export-title {
        font-family: 'Arial', sans-serif;
        font-size: 24px;
        color: #ffd700;
        margin: 0;
      }

      #dev-mode-export-close {
        background: transparent;
        border: 1px solid #ffd700;
        color: #ffd700;
        width: 32px;
        height: 32px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 18px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
      }

      #dev-mode-export-close:hover {
        background: rgba(255, 215, 0, 0.2);
      }

      #dev-mode-export-textarea {
        flex: 1;
        min-height: 400px;
        background: rgba(0, 0, 0, 0.6);
        border: 1px solid rgba(255, 215, 0, 0.3);
        border-radius: 4px;
        padding: 15px;
        color: #fff;
        font-family: 'Courier New', monospace;
        font-size: 13px;
        line-height: 1.6;
        resize: vertical;
        margin-bottom: 15px;
        white-space: pre;
        overflow-wrap: normal;
        overflow-x: auto;
      }

      #dev-mode-export-textarea:focus {
        outline: 2px solid #ffd700;
        outline-offset: 2px;
      }

      #dev-mode-export-actions {
        display: flex;
        gap: 10px;
        justify-content: flex-end;
      }

      .dev-export-btn {
        padding: 10px 20px;
        border-radius: 4px;
        cursor: pointer;
        font-family: 'Arial', sans-serif;
        font-size: 14px;
        transition: all 0.2s ease;
        border: 1px solid;
      }

      .dev-export-btn-primary {
        background: rgba(255, 215, 0, 0.2);
        border-color: #ffd700;
        color: #ffd700;
      }

      .dev-export-btn-primary:hover {
        background: rgba(255, 215, 0, 0.3);
        transform: translateY(-2px);
        box-shadow: 0 2px 8px rgba(255, 215, 0, 0.3);
      }

      .dev-export-btn-secondary {
        background: rgba(255, 255, 255, 0.1);
        border-color: rgba(255, 255, 255, 0.3);
        color: #fff;
      }

      .dev-export-btn-secondary:hover {
        background: rgba(255, 255, 255, 0.2);
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * 创建悬浮按钮
   */
  createFloatingButton() {
    if (this.elements.floatingButton) return;

    const btn = document.createElement('button');
    btn.id = 'dev-mode-floating-btn';
    btn.textContent = '🛠️ Dev';
    btn.title = '开发者工具栏';
    btn.addEventListener('click', () => this.toggleToolbar());
    
    document.body.appendChild(btn);
    this.elements.floatingButton = btn;
  }

  /**
   * 创建工具栏
   */
  createToolbar() {
    if (this.elements.toolbar) return;

    const toolbar = document.createElement('div');
    toolbar.id = 'dev-mode-toolbar';
    
    // 创建工具栏按钮
    const buttons = [
      { id: 'dev-btn-select', text: '开启选择', action: () => this.handleSelectMode() },
      { id: 'dev-btn-undo', text: '↩️ 撤销', action: () => this.undo(), disabled: true },
      { id: 'dev-btn-parent', text: '⬆️ 父级', action: () => this.selectParent() },
      { id: 'dev-btn-reset-current', text: '↺ 重置当前', action: () => this.resetCurrent() },
      { id: 'dev-btn-reset', text: '重置全部', action: () => this.handleReset(), className: 'danger' },
      { id: 'dev-btn-export', text: '导出数据', action: () => this.handleExport() },
      { id: 'dev-btn-close', text: '关闭', action: () => this.toggleToolbar() }
    ];

    buttons.forEach(btnConfig => {
      const btn = document.createElement('button');
      btn.className = `dev-toolbar-btn ${btnConfig.className || ''}`;
      btn.id = btnConfig.id;
      btn.textContent = btnConfig.text;
      if (btnConfig.disabled) {
        btn.disabled = true;
      }
      btn.addEventListener('click', btnConfig.action);
      toolbar.appendChild(btn);
    });

    document.body.appendChild(toolbar);
    this.elements.toolbar = toolbar;
    
    // 创建信息显示区域
    this.createInfoDisplay();
  }

  /**
   * 创建信息显示区域
   */
  createInfoDisplay() {
    if (this.elements.infoDisplay) return;

    const info = document.createElement('div');
    info.id = 'dev-mode-info';
    
    const infoContent = document.createElement('div');
    infoContent.innerHTML = `
      <div class="info-item">
        <span class="info-label">选中元素:</span>
        <span class="info-value" id="dev-info-element">无</span>
      </div>
      <div class="info-item">
        <span class="info-label">ID:</span>
        <span class="info-value" id="dev-info-id">-</span>
      </div>
      <div class="info-item">
        <span class="info-label">Class:</span>
        <span class="info-value" id="dev-info-class">-</span>
      </div>
      <div class="info-item">
        <span class="info-label">Transform:</span>
        <span class="info-value" id="dev-info-transform">-</span>
      </div>
    `;
    
    info.appendChild(infoContent);
    document.body.appendChild(info);
    this.elements.infoDisplay = info;
  }

  /**
   * 切换工具栏显示/隐藏
   */
  toggleToolbar() {
    this.isActive = !this.isActive;
    
    if (this.elements.toolbar) {
      if (this.isActive) {
        this.elements.toolbar.classList.add('active');
      } else {
        this.elements.toolbar.classList.remove('active');
      }
    }

    if (this.elements.floatingButton) {
      if (this.isActive) {
        this.elements.floatingButton.classList.add('active');
      } else {
        this.elements.floatingButton.classList.remove('active');
      }
    }
  }

  /**
   * 处理开启选择模式
   */
  handleSelectMode() {
    this.isSelectModeActive = !this.isSelectModeActive;
    const btn = document.getElementById('dev-btn-select');
    
    if (this.isSelectModeActive) {
      // 开启选择模式
      this.createOverlay();
      if (btn) btn.textContent = '关闭选择';
      if (this.elements.infoDisplay) {
        this.elements.infoDisplay.classList.add('active');
      }
      console.log('[DevMode] 选择模式已开启');
    } else {
      // 关闭选择模式
      this.removeOverlay();
      if (btn) btn.textContent = '开启选择';
      if (this.elements.infoDisplay) {
        this.elements.infoDisplay.classList.remove('active');
      }
      this.clearHighlight();
      this.clearSelection();
      console.log('[DevMode] 选择模式已关闭');
    }
  }

  /**
   * 创建全屏遮罩层
   */
  createOverlay() {
    if (this.elements.overlay) return;

    const overlay = document.createElement('div');
    overlay.id = 'dev-mode-overlay';
    
    // 创建虚拟选中框
    const selectionBox = document.createElement('div');
    selectionBox.id = 'dev-mode-selection-box';
    
    // 创建调整大小手柄
    const resizeHandle = document.createElement('div');
    resizeHandle.className = 'dev-resize-handle';
    
    // 将手柄添加到选中框
    selectionBox.appendChild(resizeHandle);
    
    // 将选中框添加到遮罩层
    overlay.appendChild(selectionBox);
    
    // 鼠标移动事件：高亮元素
    overlay.addEventListener('mousemove', (e) => this.onOverlayMouseMove(e));
    
    // 鼠标点击事件：选中元素
    overlay.addEventListener('mousedown', (e) => this.onOverlayMouseDown(e));
    
    // 鼠标抬起事件：结束拖拽
    overlay.addEventListener('mouseup', (e) => this.onOverlayMouseUp(e));
    
    document.body.appendChild(overlay);
    this.elements.overlay = overlay;
    this.elements.selectionBox = selectionBox;
    this.elements.resizeHandle = resizeHandle;
  }

  /**
   * 移除遮罩层
   */
  removeOverlay() {
    if (this.elements.overlay) {
      this.elements.overlay.remove();
      this.elements.overlay = null;
    }
  }

  /**
   * 遮罩层鼠标移动事件
   */
  onOverlayMouseMove(e) {
    if (this.isResizing && this.selectedElement) {
      // 缩放模式
      this.onResize(e);
      return;
    }

    if (this.isDragging && this.selectedElement) {
      // 拖拽模式（移动）
      this.onDrag(e);
      return;
    }

    // 选择模式：高亮元素
    const elements = document.elementsFromPoint(e.clientX, e.clientY);
    
    // 排除遮罩层、工具栏、悬浮按钮、信息显示区域、选中框、手柄
    const excludeIds = ['dev-mode-overlay', 'dev-mode-toolbar', 'dev-mode-floating-btn', 'dev-mode-info', 'dev-mode-selection-box'];
    const excludeClasses = ['dev-mode-highlight', 'dev-resize-handle'];
    
    let targetElement = null;
    for (const el of elements) {
      if (el.id && excludeIds.includes(el.id)) continue;
      if (excludeClasses.some(cls => el.classList.contains(cls))) continue;
      if (el === this.elements.overlay) continue;
      
      targetElement = el;
      break;
    }

    if (targetElement && targetElement !== this.highlightedElement) {
      this.clearHighlight();
      this.highlightElement(targetElement);
    }
  }

  /**
   * 遮罩层鼠标按下事件
   */
  onOverlayMouseDown(e) {
    // 如果点击的是调整大小手柄，进入缩放模式
    if (e.target && e.target.classList.contains('dev-resize-handle')) {
      if (!this.selectedElement) return;
      e.preventDefault();
      e.stopPropagation();
      this.startResize(e);
      return;
    }

    if (!this.highlightedElement) return;

    e.preventDefault();
    e.stopPropagation();

    // 选中元素
    this.selectElement(this.highlightedElement);

    // 开始拖拽（移动模式）
    this.startDrag(e);
  }

  /**
   * 遮罩层鼠标抬起事件
   */
  onOverlayMouseUp(e) {
    if (this.isResizing) {
      this.endResize();
    } else if (this.isDragging) {
      this.endDrag();
    }
  }

  /**
   * 高亮元素
   */
  highlightElement(element) {
    if (!element) return;
    
    this.highlightedElement = element;
    element.classList.add('dev-mode-highlight');
  }

  /**
   * 清除高亮
   */
  clearHighlight() {
    if (this.highlightedElement) {
      this.highlightedElement.classList.remove('dev-mode-highlight');
      this.highlightedElement = null;
    }
  }

  /**
   * 选中元素
   */
  selectElement(element) {
    if (!element) return;

    // 清除之前的选中状态
    this.clearSelection();

    this.selectedElement = element;

    // 使用虚拟选中框覆盖元素
    this.updateSelectionBox(element);

    // 更新信息显示
    this.updateInfoDisplay(element);
  }

  /**
   * 更新选中框位置和大小
   */
  updateSelectionBox(element) {
    if (!this.elements.selectionBox || !element) return;

    // 获取元素的位置和尺寸
    const rect = element.getBoundingClientRect();
    
    // 获取 overlay 的位置（用于计算相对位置）
    const overlayRect = this.elements.overlay.getBoundingClientRect();

    // 计算相对于 overlay 的位置
    const top = rect.top - overlayRect.top;
    const left = rect.left - overlayRect.left;
    const width = rect.width;
    const height = rect.height;

    // 设置选中框的位置和大小
    this.elements.selectionBox.style.top = `${top}px`;
    this.elements.selectionBox.style.left = `${left}px`;
    this.elements.selectionBox.style.width = `${width}px`;
    this.elements.selectionBox.style.height = `${height}px`;

    // 显示选中框
    this.elements.selectionBox.classList.add('active');
  }

  /**
   * 清除选中
   */
  clearSelection() {
    if (this.selectedElement) {
      this.selectedElement = null;
    }

    // 隐藏选中框
    if (this.elements.selectionBox) {
      this.elements.selectionBox.classList.remove('active');
    }

    this.updateInfoDisplay(null);
  }

  /**
   * 更新信息显示
   */
  updateInfoDisplay(element) {
    if (!this.elements.infoDisplay) return;

    const elementEl = document.getElementById('dev-info-element');
    const idEl = document.getElementById('dev-info-id');
    const classEl = document.getElementById('dev-info-class');
    const transformEl = document.getElementById('dev-info-transform');

    if (!element) {
      if (elementEl) elementEl.textContent = '无';
      if (idEl) idEl.textContent = '-';
      if (classEl) classEl.textContent = '-';
      if (transformEl) transformEl.textContent = '-';
      return;
    }

    // 生成选择器
    const selector = this.generateSelector(element);
    
    if (elementEl) {
      elementEl.textContent = element.tagName.toLowerCase() + (element.id ? '#' + element.id : '');
    }
    if (idEl) {
      idEl.textContent = element.id || '-';
    }
    if (classEl) {
      classEl.textContent = element.className ? element.className.split(' ').slice(0, 3).join(' ') : '-';
    }
    if (transformEl) {
      const transform = element.style.transform || 'none';
      transformEl.textContent = transform;
    }
  }

  /**
   * 生成元素选择器
   */
  generateSelector(element) {
    if (!element) return '';
    
    if (element.id) {
      return `#${element.id}`;
    }
    
    let selector = element.tagName.toLowerCase();
    if (element.className) {
      const classes = element.className.split(' ').filter(c => c && !c.includes('dev-mode'));
      if (classes.length > 0) {
        selector += '.' + classes[0];
      }
    }
    
    // 如果有父元素，尝试添加路径
    if (element.parentElement) {
      const parent = element.parentElement;
      if (parent.id) {
        return `${parent.id} > ${selector}`;
      }
    }
    
    return selector;
  }

  /**
   * 开始拖拽
   */
  startDrag(e) {
    if (!this.selectedElement) return;

    // 记录快照
    this.recordSnapshot();

    this.isDragging = true;
    this.dragStartX = e.clientX;
    this.dragStartY = e.clientY;

    // 解析当前 transform
    const currentTransform = this.parseTransform(this.selectedElement);
    this.elementStartTransform = {
      x: currentTransform.x,
      y: currentTransform.y
    };

    // 改变鼠标样式
    if (this.elements.overlay) {
      this.elements.overlay.style.cursor = 'grabbing';
    }
  }

  /**
   * 拖拽中
   */
  onDrag(e) {
    if (!this.selectedElement || !this.isDragging) return;

    const deltaX = e.clientX - this.dragStartX;
    const deltaY = e.clientY - this.dragStartY;

    const newX = this.elementStartTransform.x + deltaX;
    const newY = this.elementStartTransform.y + deltaY;

    // 应用 transform
    this.applyTransform(this.selectedElement, newX, newY);

    // 更新选中框位置（实时跟随元素）
    this.updateSelectionBox(this.selectedElement);

    // 更新信息显示
    this.updateInfoDisplay(this.selectedElement);
  }

  /**
   * 结束拖拽
   */
  endDrag() {
    if (!this.isDragging) return;

    this.isDragging = false;

    // 恢复鼠标样式
    if (this.elements.overlay) {
      this.elements.overlay.style.cursor = 'crosshair';
    }

    // 提交历史
    this.commitHistory();

    // 保存修改
    if (this.selectedElement) {
      // 确保选中框位置与元素同步
      this.updateSelectionBox(this.selectedElement);
      this.saveElementTransform(this.selectedElement);
      this.saveChanges();
    }
  }

  /**
   * 开始缩放
   */
  startResize(e) {
    if (!this.selectedElement) return;

    // 记录快照
    this.recordSnapshot();

    this.isResizing = true;
    this.dragStartX = e.clientX;
    this.dragStartY = e.clientY;

    // 获取元素当前的 transform
    const currentTransform = this.parseTransform(this.selectedElement);
    this.startScaleX = currentTransform.scaleX;
    this.startScaleY = currentTransform.scaleY;

    // 获取元素原始尺寸（无缩放时的尺寸）
    // 需要先移除 scale 才能获取原始尺寸
    const tempTransform = this.selectedElement.style.transform || '';
    
    // 临时移除 scale 获取原始尺寸
    let tempTransformWithoutScale = tempTransform
      .replace(/scale\([^)]+\)/g, '')
      .replace(/scaleX\([^)]+\)/g, '')
      .replace(/scaleY\([^)]+\)/g, '')
      .trim();
    
    // 保存当前 transform
    const savedTransform = this.selectedElement.style.transform;
    
    // 临时应用无 scale 的 transform 来获取原始尺寸
    this.selectedElement.style.transform = tempTransformWithoutScale || 'none';
    
    const rect = this.selectedElement.getBoundingClientRect();
    this.originalRect = {
      width: rect.width,
      height: rect.height,
      left: rect.left,
      top: rect.top
    };

    // 恢复原始 transform
    this.selectedElement.style.transform = savedTransform;

    // 改变鼠标样式
    if (this.elements.overlay) {
      this.elements.overlay.style.cursor = 'nwse-resize';
    }
  }

  /**
   * 缩放中
   */
  onResize(e) {
    if (!this.selectedElement || !this.isResizing || !this.originalRect) return;

    // 计算鼠标相对于元素左上角的距离
    const newWidth = e.clientX - this.originalRect.left;
    const newHeight = e.clientY - this.originalRect.top;

    // 计算缩放比
    let newScaleX = newWidth / this.originalRect.width;
    let newScaleY = newHeight / this.originalRect.height;

    // 限制最小 Scale 为 0.1（防止反向）
    newScaleX = Math.max(0.1, newScaleX);
    newScaleY = Math.max(0.1, newScaleY);

    // 获取当前的 translate 值
    const currentTransform = this.parseTransform(this.selectedElement);

    // 应用新的 transform（保持 translate，更新 scale）
    this.applyTransform(
      this.selectedElement,
      currentTransform.x,
      currentTransform.y,
      newScaleX,
      newScaleY
    );

    // 更新选中框位置和尺寸（实时跟随元素）
    this.updateSelectionBox(this.selectedElement);

    // 更新信息显示
    this.updateInfoDisplay(this.selectedElement);
  }

  /**
   * 结束缩放
   */
  endResize() {
    if (!this.isResizing) return;

    this.isResizing = false;

    // 恢复鼠标样式
    if (this.elements.overlay) {
      this.elements.overlay.style.cursor = 'crosshair';
    }

    // 提交历史
    this.commitHistory();

    // 保存修改
    if (this.selectedElement) {
      // 确保选中框位置与元素同步
      this.updateSelectionBox(this.selectedElement);
      this.saveElementTransform(this.selectedElement);
      this.saveChanges();
    }

    // 清除原始尺寸记录
    this.originalRect = null;
  }

  /**
   * 解析元素的 transform 值（包括 translate 和 scale）
   */
  parseTransform(element) {
    if (!element) return { x: 0, y: 0, scaleX: 1, scaleY: 1 };

    const transform = element.style.transform || '';
    
    // 解析 translate
    let x = 0, y = 0;
    const translateMatch = transform.match(/translate\(([^)]+)\)/);
    if (translateMatch) {
      const values = translateMatch[1].split(',').map(v => v.trim().replace(/px/g, ''));
      x = parseFloat(values[0]) || 0;
      y = parseFloat(values[1]) || 0;
    } else {
      // 匹配 translateX 和 translateY
      const translateXMatch = transform.match(/translateX\(([^)]+)\)/);
      const translateYMatch = transform.match(/translateY\(([^)]+)\)/);
      x = translateXMatch ? parseFloat(translateXMatch[1].replace(/px/g, '')) : 0;
      y = translateYMatch ? parseFloat(translateYMatch[1].replace(/px/g, '')) : 0;
    }

    // 解析 scale
    let scaleX = 1, scaleY = 1;
    const scaleMatch = transform.match(/scale\(([^)]+)\)/);
    if (scaleMatch) {
      const values = scaleMatch[1].split(',').map(v => v.trim());
      scaleX = parseFloat(values[0]) || 1;
      scaleY = parseFloat(values[1]) || scaleX; // 如果只有一个值，x 和 y 相同
    } else {
      // 匹配 scaleX 和 scaleY
      const scaleXMatch = transform.match(/scaleX\(([^)]+)\)/);
      const scaleYMatch = transform.match(/scaleY\(([^)]+)\)/);
      scaleX = scaleXMatch ? parseFloat(scaleXMatch[1]) : 1;
      scaleY = scaleYMatch ? parseFloat(scaleYMatch[1]) : 1;
    }

    return { x, y, scaleX, scaleY };
  }

  /**
   * 应用 transform（支持 translate 和 scale）
   */
  applyTransform(element, x, y, scaleX = null, scaleY = null) {
    if (!element) return;

    // 如果 scaleX 和 scaleY 未提供，从当前 transform 中获取
    let currentScaleX = 1, currentScaleY = 1;
    if (scaleX === null || scaleY === null) {
      const current = this.parseTransform(element);
      currentScaleX = current.scaleX;
      currentScaleY = current.scaleY;
    }

    // 使用提供的值或当前值
    const finalScaleX = scaleX !== null ? scaleX : currentScaleX;
    const finalScaleY = scaleY !== null ? scaleY : currentScaleY;

    // 获取原有的 transform（排除 translate 和 scale）
    let baseTransform = element.style.transform || '';
    
    // 移除所有 translate 和 scale 相关的 transform
    baseTransform = baseTransform
      .replace(/translate\([^)]+\)/g, '')
      .replace(/translateX\([^)]+\)/g, '')
      .replace(/translateY\([^)]+\)/g, '')
      .replace(/scale\([^)]+\)/g, '')
      .replace(/scaleX\([^)]+\)/g, '')
      .replace(/scaleY\([^)]+\)/g, '')
      .trim();

    // 构建新的 transform
    const parts = [];
    if (x !== 0 || y !== 0) {
      parts.push(`translate(${x}px, ${y}px)`);
    }
    if (finalScaleX !== 1 || finalScaleY !== 1) {
      if (finalScaleX === finalScaleY) {
        parts.push(`scale(${finalScaleX})`);
      } else {
        parts.push(`scale(${finalScaleX}, ${finalScaleY})`);
      }
    }

    // 合并所有 transform
    const newTransform = baseTransform 
      ? `${baseTransform} ${parts.join(' ')}`.trim()
      : parts.join(' ');

    element.style.transform = newTransform || 'none';
  }

  /**
   * 记录快照（在拖拽/缩放开始时调用）
   */
  recordSnapshot() {
    if (!this.selectedElement) return;

    const selector = this.generateSelector(this.selectedElement);
    const previousTransform = this.selectedElement.style.transform || '';

    this.tempState = {
      selector,
      previousTransform
    };
  }

  /**
   * 提交历史（在拖拽/缩放结束时调用）
   */
  commitHistory() {
    if (!this.tempState || !this.selectedElement) {
      this.tempState = null;
      return;
    }

    const newTransform = this.selectedElement.style.transform || '';

    // 如果 transform 没有变化，不记录历史
    if (newTransform === this.tempState.previousTransform) {
      this.tempState = null;
      return;
    }

    // 创建历史记录
    const record = {
      selector: this.tempState.selector,
      previousTransform: this.tempState.previousTransform,
      newTransform: newTransform
    };

    // 推入历史栈
    this.historyStack.push(record);

    // 限制栈大小
    if (this.historyStack.length > this.maxHistorySize) {
      this.historyStack.shift(); // 移除最早的记录
    }

    // 启用撤销按钮
    this.updateUndoButton();

    // 重置临时状态
    this.tempState = null;
  }

  /**
   * 撤销上一步操作
   */
  undo() {
    if (this.historyStack.length === 0) return;

    // 弹出栈顶记录
    const record = this.historyStack.pop();

    try {
      // 根据 selector 找到 DOM 元素
      const elements = document.querySelectorAll(record.selector);
      
      if (elements.length === 0) {
        console.warn(`[DevMode] 撤销时未找到元素: ${record.selector}`);
        this.updateUndoButton();
        return;
      }

      // 恢复 transform
      elements.forEach(el => {
        el.style.transform = record.previousTransform || '';
      });

      // 同步数据：更新内存中的 Map
      const firstElement = elements[0];
      this.saveElementTransform(firstElement);
      this.saveChanges();

      // 视觉同步：如果当前选中的正是该元素，更新选中框和信息面板
      if (this.selectedElement && this.generateSelector(this.selectedElement) === record.selector) {
        this.updateSelectionBox(this.selectedElement);
        this.updateInfoDisplay(this.selectedElement);
      }

      console.log('[DevMode] 已撤销操作', record);
    } catch (e) {
      console.error('[DevMode] 撤销操作失败', e);
    }

    // 更新撤销按钮状态
    this.updateUndoButton();
  }

  /**
   * 更新撤销按钮的启用/禁用状态
   */
  updateUndoButton() {
    const undoBtn = document.getElementById('dev-btn-undo');
    if (undoBtn) {
      undoBtn.disabled = this.historyStack.length === 0;
    }
  }

  /**
   * 设置键盘监听器
   */
  setupKeyboardListeners() {
    // 键盘微调防抖定时器
    this.nudgeDebounceTimer = null;
    this.nudgeStartState = null;

    // 键盘按下事件
    document.addEventListener('keydown', (e) => {
      if (!this.isEnabled || !this.selectedElement) return;

      // 只处理方向键
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();

        // 如果是第一次按下，记录快照
        if (!this.nudgeStartState) {
          this.nudgeStartState = {
            selector: this.generateSelector(this.selectedElement),
            previousTransform: this.selectedElement.style.transform || ''
          };
        }

        // 计算步长
        const step = e.shiftKey ? 10 : 1;

        // 解析当前 transform
        const currentTransform = this.parseTransform(this.selectedElement);
        let newX = currentTransform.x;
        let newY = currentTransform.y;

        // 根据方向键更新坐标
        switch (e.key) {
          case 'ArrowUp':
            newY -= step;
            break;
          case 'ArrowDown':
            newY += step;
            break;
          case 'ArrowLeft':
            newX -= step;
            break;
          case 'ArrowRight':
            newX += step;
            break;
        }

        // 应用新的 transform
        this.applyTransform(this.selectedElement, newX, newY, currentTransform.scaleX, currentTransform.scaleY);

        // 更新选中框位置
        this.updateSelectionBox(this.selectedElement);

        // 更新信息显示
        this.updateInfoDisplay(this.selectedElement);

        // 防抖：延迟提交历史记录
        if (this.nudgeDebounceTimer) {
          clearTimeout(this.nudgeDebounceTimer);
        }

        this.nudgeDebounceTimer = setTimeout(() => {
          this.commitNudgeHistory();
        }, 300); // 300ms 无操作后提交历史
      }
    });

    // 键盘抬起事件
    document.addEventListener('keyup', (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        // 立即提交历史（如果还在防抖期内）
        if (this.nudgeDebounceTimer) {
          clearTimeout(this.nudgeDebounceTimer);
          this.commitNudgeHistory();
        }
      }
    });
  }

  /**
   * 提交键盘微调的历史记录
   */
  commitNudgeHistory() {
    if (!this.nudgeStartState || !this.selectedElement) {
      this.nudgeStartState = null;
      return;
    }

    const newTransform = this.selectedElement.style.transform || '';

    // 如果 transform 没有变化，不记录历史
    if (newTransform === this.nudgeStartState.previousTransform) {
      this.nudgeStartState = null;
      return;
    }

    // 创建历史记录
    const record = {
      selector: this.nudgeStartState.selector,
      previousTransform: this.nudgeStartState.previousTransform,
      newTransform: newTransform
    };

    // 推入历史栈
    this.historyStack.push(record);

    // 限制栈大小
    if (this.historyStack.length > this.maxHistorySize) {
      this.historyStack.shift();
    }

    // 启用撤销按钮
    this.updateUndoButton();

    // 同步数据
    this.saveElementTransform(this.selectedElement);
    this.saveChanges();

    // 重置状态
    this.nudgeStartState = null;
  }

  /**
   * 选择父级元素
   */
  selectParent() {
    if (!this.selectedElement) return;

    const parent = this.selectedElement.parentElement;
    
    // 检查父元素是否有效（不是 body 或 html）
    if (!parent || parent === document.body || parent === document.documentElement) {
      console.log('[DevMode] 已到达顶层元素');
      return;
    }

    // 选中父元素
    this.selectElement(parent);
    console.log('[DevMode] 已切换到父级元素', parent);
  }

  /**
   * 重置当前选中元素
   */
  resetCurrent() {
    if (!this.selectedElement) return;

    // 记录快照（用于撤销）
    const selector = this.generateSelector(this.selectedElement);
    const previousTransform = this.selectedElement.style.transform || '';

    // 清空 transform
    this.selectedElement.style.transform = '';

    // 创建历史记录
    const record = {
      selector: selector,
      previousTransform: previousTransform,
      newTransform: ''
    };

    // 推入历史栈
    this.historyStack.push(record);

    // 限制栈大小
    if (this.historyStack.length > this.maxHistorySize) {
      this.historyStack.shift();
    }

    // 启用撤销按钮
    this.updateUndoButton();

    // 更新数据
    this.saveElementTransform(this.selectedElement);
    this.saveChanges();

    // 更新视觉
    this.updateSelectionBox(this.selectedElement);
    this.updateInfoDisplay(this.selectedElement);

    console.log('[DevMode] 已重置当前元素', this.selectedElement);
  }

  /**
   * 保存元素的 transform
   */
  saveElementTransform(element) {
    if (!element) return;

    const selector = this.generateSelector(element);
    const transform = element.style.transform || '';

    if (transform) {
      this.modifiedElements.set(selector, { transform });
    } else {
      this.modifiedElements.delete(selector);
    }
  }

  /**
   * 保存所有修改到 localStorage
   */
  saveChanges() {
    const changes = {};
    this.modifiedElements.forEach((value, key) => {
      changes[key] = value;
    });
    
    localStorage.setItem('devUIChanges', JSON.stringify(changes));
    console.log('[DevMode] UI 修改已保存', changes);
  }

  /**
   * 从 localStorage 加载修改
   */
  loadChanges() {
    try {
      const saved = localStorage.getItem('devUIChanges');
      if (saved) {
        const changes = JSON.parse(saved);
        this.modifiedElements = new Map(Object.entries(changes));
        console.log('[DevMode] 已加载保存的 UI 修改', changes);
      }
    } catch (e) {
      console.error('[DevMode] 加载 UI 修改失败', e);
    }
  }

  /**
   * 应用保存的修改
   */
  applySavedChanges() {
    if (this.modifiedElements.size === 0) return;

    // 延迟应用，确保 DOM 已完全加载
    setTimeout(() => {
      this.modifiedElements.forEach((value, selector) => {
        try {
          const elements = document.querySelectorAll(selector);
          if (elements.length === 0) {
            console.warn(`[DevMode] 未找到元素: ${selector}`);
            return;
          }

          elements.forEach(el => {
            if (value.transform && value.transform !== 'none') {
              // 直接应用保存的完整 transform 字符串
              // 这样可以保留所有 transform 值（translate, scale 等）
              el.style.transform = value.transform;
            }
          });
        } catch (e) {
          console.warn(`[DevMode] 无法应用选择器 "${selector}":`, e);
        }
      });

      console.log('[DevMode] 已应用保存的 UI 修改');
    }, 100);
  }

  /**
   * 从 transform 字符串解析 translate 和 scale 值
   */
  parseTransformFromString(transformStr) {
    if (!transformStr) return { x: 0, y: 0, scaleX: 1, scaleY: 1 };

    // 解析 translate
    let x = 0, y = 0;
    const translateMatch = transformStr.match(/translate\(([^)]+)\)/);
    if (translateMatch) {
      const values = translateMatch[1].split(',').map(v => v.trim().replace(/px/g, ''));
      x = parseFloat(values[0]) || 0;
      y = parseFloat(values[1]) || 0;
    } else {
      // 匹配 translateX 和 translateY
      const translateXMatch = transformStr.match(/translateX\(([^)]+)\)/);
      const translateYMatch = transformStr.match(/translateY\(([^)]+)\)/);
      x = translateXMatch ? parseFloat(translateXMatch[1].replace(/px/g, '')) : 0;
      y = translateYMatch ? parseFloat(translateYMatch[1].replace(/px/g, '')) : 0;
    }

    // 解析 scale
    let scaleX = 1, scaleY = 1;
    const scaleMatch = transformStr.match(/scale\(([^)]+)\)/);
    if (scaleMatch) {
      const values = scaleMatch[1].split(',').map(v => v.trim());
      scaleX = parseFloat(values[0]) || 1;
      scaleY = parseFloat(values[1]) || scaleX; // 如果只有一个值，x 和 y 相同
    } else {
      // 匹配 scaleX 和 scaleY
      const scaleXMatch = transformStr.match(/scaleX\(([^)]+)\)/);
      const scaleYMatch = transformStr.match(/scaleY\(([^)]+)\)/);
      scaleX = scaleXMatch ? parseFloat(scaleXMatch[1]) : 1;
      scaleY = scaleYMatch ? parseFloat(scaleYMatch[1]) : 1;
    }

    return { x, y, scaleX, scaleY };
  }

  /**
   * 处理重置当前
   */
  handleReset() {
    if (confirm('确定要重置所有 UI 位置修改吗？此操作将清除所有布局调整并刷新页面！')) {
      // 清除所有 transform
      this.modifiedElements.forEach((value, selector) => {
        try {
          const elements = document.querySelectorAll(selector);
          elements.forEach(el => {
            // 移除 translate 和 scale，保留其他 transform
            let transform = el.style.transform || '';
            transform = transform
              .replace(/translate\([^)]+\)/g, '')
              .replace(/translateX\([^)]+\)/g, '')
              .replace(/translateY\([^)]+\)/g, '')
              .replace(/scale\([^)]+\)/g, '')
              .replace(/scaleX\([^)]+\)/g, '')
              .replace(/scaleY\([^)]+\)/g, '')
              .trim();
            el.style.transform = transform || '';
          });
        } catch (e) {
          console.warn(`[DevMode] 无法重置选择器 "${selector}":`, e);
        }
      });

      // 清除记录和 localStorage
      this.modifiedElements.clear();
      localStorage.removeItem('devUIChanges');
      
      // 清除选中状态
      this.clearSelection();
      this.clearHighlight();
      
      console.log('[DevMode] 所有 UI 位置已重置，即将刷新页面');
      
      // 刷新页面以恢复原状
      setTimeout(() => {
        window.location.reload();
      }, 500);
    }
  }

  /**
   * 处理导出数据
   */
  handleExport() {
    if (this.modifiedElements.size === 0) {
      alert('没有可导出的 UI 修改数据');
      return;
    }

    const cssCode = this.exportChanges();
    this.showExportModal(cssCode);
  }

  /**
   * 导出修改为 CSS 代码（Markdown 格式）
   */
  exportChanges() {
    if (this.modifiedElements.size === 0) {
      return '没有 UI 修改数据';
    }

    let markdown = '请根据以下 CSS 调整更新项目样式：\n\n';

    this.modifiedElements.forEach((value, selector) => {
      // 解析 transform 获取 translate 和 scale 值
      const transform = this.parseTransformFromString(value.transform);
      
      // 获取元素信息（用于注释）
      let elementInfo = selector;
      try {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          const el = elements[0];
          if (el.id) {
            elementInfo = `#${el.id}`;
          } else if (el.className) {
            const classes = el.className.split(' ').filter(c => c && !c.includes('dev-mode'));
            if (classes.length > 0) {
              elementInfo = `.${classes[0]}`;
            }
          }
        }
      } catch (e) {
        // 忽略错误，使用原始选择器
      }

      // 生成更精确的选择器
      const preciseSelector = this.generatePreciseSelector(selector);

      // 构建 transform 字符串
      const transformParts = [];
      if (transform.x !== 0 || transform.y !== 0) {
        transformParts.push(`translate(${transform.x}px, ${transform.y}px)`);
      }
      if (transform.scaleX !== 1 || transform.scaleY !== 1) {
        if (transform.scaleX === transform.scaleY) {
          transformParts.push(`scale(${transform.scaleX})`);
        } else {
          transformParts.push(`scale(${transform.scaleX}, ${transform.scaleY})`);
        }
      }

      const transformValue = transformParts.length > 0 
        ? transformParts.join(' ')
        : 'none';

      markdown += `/* ${elementInfo} */\n`;
      markdown += `${preciseSelector} {\n`;
      markdown += `    transform: ${transformValue} !important;\n`;
      markdown += `    position: relative; /* 确保 z-index 生效 */\n`;
      markdown += `    z-index: 100; /* 可选，防止被遮挡 */\n`;
      markdown += `}\n\n`;
    });

    return markdown;
  }

  /**
   * 生成更精确的选择器
   */
  generatePreciseSelector(selector) {
    try {
      const elements = document.querySelectorAll(selector);
      if (elements.length === 0) return selector;

      const el = elements[0];
      
      // 优先使用 ID（最精确）
      if (el.id) {
        return `#${el.id}`;
      }

      // 使用完整的 class 组合（提高特异性）
      if (el.className) {
        const classes = el.className.split(' ')
          .filter(c => c && !c.includes('dev-mode') && !c.includes('hidden'));
        
        if (classes.length > 0) {
          const tagName = el.tagName.toLowerCase();
          
          // 如果有多个 class，使用组合选择器提高特异性
          if (classes.length > 1) {
            return `${tagName}.${classes.join('.')}`;
          }
          
          // 单个 class，加上标签名提高特异性
          return `${tagName}.${classes[0]}`;
        }
      }

      // 如果有父元素 ID，使用后代选择器
      if (el.parentElement) {
        const tagName = el.tagName.toLowerCase();
        
        // 优先使用父元素 ID
        if (el.parentElement.id) {
          return `#${el.parentElement.id} > ${tagName}`;
        }
        
        // 如果父元素有 class，使用 class 选择器
        if (el.parentElement.className) {
          const parentClasses = el.parentElement.className.split(' ')
            .filter(c => c && !c.includes('dev-mode'));
          if (parentClasses.length > 0) {
            return `.${parentClasses[0]} > ${tagName}`;
          }
        }
      }

      // 回退到原始选择器
      return selector;
    } catch (e) {
      console.warn('[DevMode] 生成精确选择器失败，使用原始选择器', e);
      return selector;
    }
  }

  /**
   * 显示导出模态框
   */
  showExportModal(cssCode) {
    if (!this.elements.exportModal) {
      this.createExportModal();
    }

    const modal = this.elements.exportModal;
    const textarea = modal.querySelector('#dev-mode-export-textarea');
    
    if (textarea) {
      textarea.value = cssCode;
    }

    modal.classList.add('active');
  }

  /**
   * 创建导出模态框
   */
  createExportModal() {
    if (this.elements.exportModal) return;

    const modal = document.createElement('div');
    modal.id = 'dev-mode-export-modal';

    modal.innerHTML = `
      <div id="dev-mode-export-content">
        <div id="dev-mode-export-header">
          <h3 id="dev-mode-export-title">导出 CSS 配置</h3>
          <button id="dev-mode-export-close" aria-label="关闭">×</button>
        </div>
        <textarea id="dev-mode-export-textarea" readonly></textarea>
        <div id="dev-mode-export-actions">
          <button class="dev-export-btn dev-export-btn-secondary" id="dev-export-copy">复制到剪贴板</button>
          <button class="dev-export-btn dev-export-btn-primary" id="dev-export-close-btn">关闭</button>
        </div>
      </div>
    `;

    // 关闭按钮事件
    const closeBtn = modal.querySelector('#dev-mode-export-close');
    const closeBtn2 = modal.querySelector('#dev-export-close-btn');
    const copyBtn = modal.querySelector('#dev-export-copy');

    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.hideExportModal());
    }

    if (closeBtn2) {
      closeBtn2.addEventListener('click', () => this.hideExportModal());
    }

    // 点击模态框背景关闭
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        this.hideExportModal();
      }
    });

    // 复制到剪贴板
    if (copyBtn) {
      copyBtn.addEventListener('click', () => this.copyToClipboard());
    }

    // ESC 键关闭
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal.classList.contains('active')) {
        this.hideExportModal();
      }
    });

    document.body.appendChild(modal);
    this.elements.exportModal = modal;
  }

  /**
   * 隐藏导出模态框
   */
  hideExportModal() {
    if (this.elements.exportModal) {
      this.elements.exportModal.classList.remove('active');
    }
  }

  /**
   * 复制到剪贴板
   */
  async copyToClipboard() {
    const textarea = this.elements.exportModal?.querySelector('#dev-mode-export-textarea');
    if (!textarea) return;

    try {
      await navigator.clipboard.writeText(textarea.value);
      
      const copyBtn = this.elements.exportModal?.querySelector('#dev-export-copy');
      if (copyBtn) {
        const originalText = copyBtn.textContent;
        copyBtn.textContent = '✓ 已复制';
        copyBtn.style.background = 'rgba(76, 175, 80, 0.2)';
        copyBtn.style.borderColor = '#4caf50';
        copyBtn.style.color = '#4caf50';
        
        setTimeout(() => {
          copyBtn.textContent = originalText;
          copyBtn.style.background = '';
          copyBtn.style.borderColor = '';
          copyBtn.style.color = '';
        }, 2000);
      }

      console.log('[DevMode] CSS 代码已复制到剪贴板');
      
      if (window.game && window.game.ui && window.game.ui.logMessage) {
        window.game.ui.logMessage('CSS 代码已复制到剪贴板', 'info');
      }
    } catch (e) {
      console.error('[DevMode] 复制失败', e);
      
      // 降级方案：使用传统方法
      textarea.select();
      textarea.setSelectionRange(0, 99999);
      try {
        document.execCommand('copy');
        alert('代码已复制到剪贴板');
      } catch (err) {
        alert('复制失败，请手动选择并复制');
      }
    }
  }

  /**
   * 销毁开发者模式 UI
   */
  destroy() {
    // 关闭选择模式
    if (this.isSelectModeActive) {
      this.handleSelectMode();
    }

    // 清理键盘监听相关的定时器
    if (this.nudgeDebounceTimer) {
      clearTimeout(this.nudgeDebounceTimer);
      this.nudgeDebounceTimer = null;
    }
    this.nudgeStartState = null;

    if (this.elements.floatingButton) {
      this.elements.floatingButton.remove();
      this.elements.floatingButton = null;
    }

    if (this.elements.toolbar) {
      this.elements.toolbar.remove();
      this.elements.toolbar = null;
    }

    if (this.elements.infoDisplay) {
      this.elements.infoDisplay.remove();
      this.elements.infoDisplay = null;
    }

    if (this.elements.exportModal) {
      this.elements.exportModal.remove();
      this.elements.exportModal = null;
    }

    this.removeOverlay();
    this.clearSelection();
    this.clearHighlight();

    // 移除样式（可选，保留样式以便下次快速启用）
    // const style = document.getElementById('dev-mode-styles');
    // if (style) style.remove();

    this.isActive = false;
    this.isSelectModeActive = false;
  }
}

// 导出单例实例
let devModeManagerInstance = null;

export function getDevModeManager() {
  if (!devModeManagerInstance) {
    devModeManagerInstance = new DevModeManager();
  }
  return devModeManagerInstance;
}

