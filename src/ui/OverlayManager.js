// OverlayManager.js - 统一管理全屏弹窗
// 确保同一时间只有一个弹窗打开，处理 ESC 关闭逻辑

/**
 * OverlayManager - 全屏弹窗管理器
 * 负责管理所有全屏弹窗（背包、商店、图鉴、设置等）
 * 确保同一时间只有一个弹窗打开，统一处理键盘事件
 */
export class OverlayManager {
  constructor() {
    // 注册的弹窗组件
    this.overlays = new Map();
    // 当前打开的弹窗栈（支持嵌套弹窗）
    this.activeStack = [];
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
    this.activeStack.push(name);
    console.log(`✓ OverlayManager: 打开弹窗 ${name}`);
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

    console.log(`✓ OverlayManager: 关闭弹窗 ${name}`);
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
   * 销毁管理器（清理资源）
   */
  destroy() {
    this.closeAll();
    this.overlays.clear();
    this.activeStack = [];
  }
}

