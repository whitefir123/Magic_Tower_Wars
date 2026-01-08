// OverlayManager.js - 统一管理全屏弹窗
// 确保同一时间只有一个弹窗打开，处理 ESC 关闭逻辑

/**
 * Z-Index 层级常量定义
 * 用于统一管理所有 UI 元素的层级关系
 */
export const Z_INDEX_LAYERS = {
  // 游戏层（最底层）
  GAME: 0,
  
  // HUD 层（游戏界面上的 UI 元素）
  HUD: 10,
  
  // 面板层（背包、商店、图鉴等主要界面）
  PANEL: 10000,
  
  // 对话框层（确认框、提示框等）
  DIALOG: 20000,
  
  // 系统层（加载界面、系统提示等）
  SYSTEM: 100000,
  
  // 工具层（工具提示、右键菜单等，最高层）
  TOOLTIP: 1000000
};

/**
 * 弹窗类型到基础 z-index 的映射
 * 定义每个弹窗类型应该使用的基础层级
 */
const OVERLAY_BASE_Z_INDEX = {
  // 面板类弹窗（使用 PANEL 层）
  inventory: Z_INDEX_LAYERS.PANEL,
  shop: Z_INDEX_LAYERS.PANEL,
  gambler: Z_INDEX_LAYERS.PANEL,
  bestiary: Z_INDEX_LAYERS.PANEL,
  settings: Z_INDEX_LAYERS.PANEL,
  forge: Z_INDEX_LAYERS.PANEL,
  
  // 对话框类弹窗（使用 DIALOG 层）
  achievement: Z_INDEX_LAYERS.DIALOG,
  patchnotes: Z_INDEX_LAYERS.DIALOG,
  leaderboard: Z_INDEX_LAYERS.DIALOG,
  
  // 系统类弹窗（使用 SYSTEM 层）
  loading: Z_INDEX_LAYERS.SYSTEM
};

/**
 * 弹窗栈的 z-index 增量
 * 当多个弹窗叠加时，每个新弹窗的 z-index 会在此基础上递增
 */
const STACK_INCREMENT = 10;

/**
 * OverlayManager - 全屏弹窗管理器
 * 负责管理所有全屏弹窗（背包、商店、图鉴、设置等）
 * 确保同一时间只有一个弹窗打开，统一处理键盘事件
 * 自动管理 z-index 层级，防止层级混乱
 */
export class OverlayManager {
  constructor() {
    // 注册的弹窗组件
    this.overlays = new Map();
    // 当前打开的弹窗栈（支持嵌套弹窗）
    this.activeStack = [];
    // 弹窗的 z-index 映射（用于恢复）
    this.overlayZIndexMap = new Map();
    // ESC 键监听器
    this.setupKeyboardListeners();
  }

  /**
   * 注册一个弹窗组件
   * @param {string} name - 弹窗名称（如 'inventory', 'bestiary'）
   * @param {object} component - 弹窗组件实例（必须有 open() 和 close() 方法）
   */
  register(name, component) {
    if (!component || typeof component.open !== 'function' || typeof component.close !== 'function') {
      console.error(`OverlayManager: 组件 ${name} 必须有 open() 和 close() 方法`);
      return;
    }
    this.overlays.set(name, component);
    console.log(`✓ OverlayManager: 已注册弹窗 ${name}`);
  }

  /**
   * 平滑显示 overlay（使用 opacity 过渡）
   * @param {HTMLElement} overlay - overlay 元素
   * @private
   */
  _showOverlaySmooth(overlay) {
    if (!overlay) return;
    
    // 确保 overlay 有正确的 display 值
    const computedStyle = window.getComputedStyle(overlay);
    if (computedStyle.display === 'none') {
      overlay.style.display = 'flex';
      // 强制重排以应用初始状态
      void overlay.offsetWidth;
    }
    
    // 移除 hidden 类
    overlay.classList.remove('hidden');
    
    // 使用 requestAnimationFrame 确保平滑过渡
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        overlay.classList.remove('overlay-fade-out');
        overlay.classList.add('overlay-fade-in');
      });
    });
  }

  /**
   * 平滑隐藏 overlay（使用 opacity 过渡）
   * @param {HTMLElement} overlay - overlay 元素
   * @private
   */
  _hideOverlaySmooth(overlay) {
    if (!overlay) return;
    
    // 添加淡出类
    overlay.classList.remove('overlay-fade-in');
    overlay.classList.add('overlay-fade-out');
    
    // 等待过渡完成后隐藏
    setTimeout(() => {
      overlay.classList.add('hidden');
      overlay.style.display = 'none';
      overlay.classList.remove('overlay-fade-out');
    }, 300); // 匹配 CSS 过渡时间
  }

  /**
   * 获取弹窗的 overlay 元素
   * @param {object} component - 弹窗组件实例
   * @returns {HTMLElement|null} overlay 元素
   * @private
   */
  _getOverlayElement(component) {
    // 尝试多种方式获取 overlay 元素
    if (component.elements && component.elements.overlay) {
      return component.elements.overlay;
    }
    
    // 如果组件有 getOverlayElement 方法
    if (typeof component.getOverlayElement === 'function') {
      return component.getOverlayElement();
    }
    
    // 尝试通过常见的 overlay ID 查找
    const overlayId = component.overlayId || `${component.constructor.name.toLowerCase().replace('ui', '')}-overlay`;
    const element = document.getElementById(overlayId);
    if (element) {
      return element;
    }
    
    // 如果组件有 overlay 属性
    if (component.overlay) {
      return component.overlay;
    }
    
    return null;
  }

  /**
   * 设置弹窗的 z-index
   * @param {string} name - 弹窗名称
   * @param {HTMLElement} overlay - overlay 元素
   * @param {number} stackIndex - 在栈中的索引位置
   * @private
   */
  _setOverlayZIndex(name, overlay, stackIndex) {
    if (!overlay) return;
    
    // 获取基础 z-index
    const baseZIndex = OVERLAY_BASE_Z_INDEX[name] || Z_INDEX_LAYERS.PANEL;
    
    // 计算最终的 z-index（基础值 + 栈索引增量）
    const finalZIndex = baseZIndex + (stackIndex * STACK_INCREMENT);
    
    // 保存原始 z-index（如果存在）
    if (!this.overlayZIndexMap.has(name)) {
      const originalZIndex = overlay.style.zIndex || window.getComputedStyle(overlay).zIndex;
      if (originalZIndex && originalZIndex !== 'auto') {
        this.overlayZIndexMap.set(name, originalZIndex);
      }
    }
    
    // 设置新的 z-index
    overlay.style.zIndex = finalZIndex.toString();
    
    console.log(`✓ OverlayManager: 设置弹窗 ${name} 的 z-index 为 ${finalZIndex} (基础: ${baseZIndex}, 栈索引: ${stackIndex})`);
  }

  /**
   * 更新所有打开弹窗的 z-index（当栈发生变化时）
   * @private
   */
  _updateAllZIndices() {
    this.activeStack.forEach((name, index) => {
      const component = this.overlays.get(name);
      if (component) {
        const overlay = this._getOverlayElement(component);
        if (overlay) {
          this._setOverlayZIndex(name, overlay, index);
        }
      }
    });
  }

  /**
   * 打开指定弹窗
   * @param {string} name - 弹窗名称
   * @param {object} options - 传递给弹窗的选项
   */
  open(name, options = {}) {
    const component = this.overlays.get(name);
    if (!component) {
      console.warn(`OverlayManager: 未找到弹窗 ${name}`);
      return false;
    }

    // 关闭当前顶层弹窗（如果不允许嵌套）
    if (!options.allowStack && this.activeStack.length > 0) {
      const current = this.activeStack[this.activeStack.length - 1];
      this.close(current);
    }

    // 打开新弹窗
    component.open(options);
    
    // 将新弹窗添加到栈中
    this.activeStack.push(name);
    
    // 获取 overlay 元素并设置 z-index
    const overlay = this._getOverlayElement(component);
    if (overlay) {
      const stackIndex = this.activeStack.length - 1;
      this._setOverlayZIndex(name, overlay, stackIndex);
    } else {
      console.warn(`OverlayManager: 无法找到弹窗 ${name} 的 overlay 元素`);
    }
    
    // 更新所有弹窗的 z-index（确保层级正确）
    this._updateAllZIndices();
    
    console.log(`✓ OverlayManager: 打开弹窗 ${name} (栈深度: ${this.activeStack.length})`);
    return true;
  }

  /**
   * 关闭指定弹窗
   * @param {string} name - 弹窗名称（如果不指定，关闭顶层弹窗）
   */
  close(name = null) {
    // 如果没有指定名称，关闭顶层弹窗
    if (!name && this.activeStack.length > 0) {
      name = this.activeStack[this.activeStack.length - 1];
    }

    if (!name) return false;

    const component = this.overlays.get(name);
    if (!component) {
      console.warn(`OverlayManager: 未找到弹窗 ${name}`);
      return false;
    }

    // 关闭弹窗
    component.close();
    
    // 从栈中移除
    const index = this.activeStack.indexOf(name);
    if (index !== -1) {
      this.activeStack.splice(index, 1);
    }
    
    // 更新剩余弹窗的 z-index
    this._updateAllZIndices();
    
    // 清理 z-index 映射（如果弹窗已完全关闭）
    if (!this.activeStack.includes(name)) {
      this.overlayZIndexMap.delete(name);
    }

    console.log(`✓ OverlayManager: 关闭弹窗 ${name} (剩余栈深度: ${this.activeStack.length})`);
    return true;
  }

  /**
   * 关闭所有弹窗
   */
  closeAll() {
    // 复制栈避免在循环中修改
    const stack = [...this.activeStack];
    stack.forEach(name => this.close(name));
    console.log('✓ OverlayManager: 关闭所有弹窗');
  }

  /**
   * 检查是否有弹窗打开
   * @returns {boolean}
   */
  hasActiveOverlay() {
    return this.activeStack.length > 0;
  }

  /**
   * 获取当前顶层弹窗名称
   * @returns {string|null}
   */
  getTopOverlay() {
    return this.activeStack.length > 0 
      ? this.activeStack[this.activeStack.length - 1] 
      : null;
  }

  /**
   * 切换指定弹窗的开关状态
   * @param {string} name - 弹窗名称
   * @param {object} options - 传递给弹窗的选项
   */
  toggle(name, options = {}) {
    const component = this.overlays.get(name);
    if (!component) {
      console.warn(`OverlayManager: 未找到弹窗 ${name}`);
      return false;
    }

    // 检查是否已打开
    const isOpen = this.activeStack.includes(name);
    if (isOpen) {
      this.close(name);
    } else {
      this.open(name, options);
    }
    return true;
  }

  /**
   * 设置键盘监听器（ESC 关闭顶层弹窗）
   */
  setupKeyboardListeners() {
    document.addEventListener('keydown', (e) => {
      // ESC 键关闭顶层弹窗
      if (e.key === 'Escape' && this.activeStack.length > 0) {
        e.preventDefault();
        e.stopPropagation();
        this.close(); // 关闭顶层弹窗
      }
    });
  }

  /**
   * 获取指定弹窗的当前 z-index
   * @param {string} name - 弹窗名称
   * @returns {number|null} z-index 值，如果弹窗不存在或未打开则返回 null
   */
  getZIndex(name) {
    const component = this.overlays.get(name);
    if (!component) return null;
    
    const overlay = this._getOverlayElement(component);
    if (!overlay) return null;
    
    const zIndex = window.getComputedStyle(overlay).zIndex;
    return zIndex === 'auto' ? null : parseInt(zIndex, 10);
  }

  /**
   * 手动设置弹窗的 z-index（高级用法）
   * @param {string} name - 弹窗名称
   * @param {number} zIndex - z-index 值
   * @returns {boolean} 是否设置成功
   */
  setZIndex(name, zIndex) {
    const component = this.overlays.get(name);
    if (!component) {
      console.warn(`OverlayManager: 未找到弹窗 ${name}`);
      return false;
    }
    
    const overlay = this._getOverlayElement(component);
    if (!overlay) {
      console.warn(`OverlayManager: 无法找到弹窗 ${name} 的 overlay 元素`);
      return false;
    }
    
    overlay.style.zIndex = zIndex.toString();
    console.log(`✓ OverlayManager: 手动设置弹窗 ${name} 的 z-index 为 ${zIndex}`);
    return true;
  }

  /**
   * 销毁管理器（清理资源）
   */
  destroy() {
    this.closeAll();
    this.overlays.clear();
    this.activeStack = [];
    this.overlayZIndexMap.clear();
  }
}

