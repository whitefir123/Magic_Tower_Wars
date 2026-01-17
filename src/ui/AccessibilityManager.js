// AccessibilityManager.js - 无障碍管理器
// 处理减少动画、屏幕阅读器支持和键盘导航

/**
 * AccessibilityManager - 无障碍功能管理器
 * 提供减少动画模式、屏幕阅读器支持和键盘导航
 */
export class AccessibilityManager {
  constructor(gamblerUI) {
    this.gamblerUI = gamblerUI;
    this.reducedMotion = false;
    this.announceElement = null;
    this.keyboardHandlers = new Map();
    
    this.init();
  }

  /**
   * 初始化无障碍功能
   */
  init() {
    // 检测减少动画偏好
    this.detectReducedMotion();
    
    // 创建屏幕阅读器公告区域
    this.createAnnounceElement();
    
    // 设置键盘导航
    this.setupKeyboardNavigation();
    
    console.log('✓ AccessibilityManager 已初始化', {
      reducedMotion: this.reducedMotion
    });
  }

  /**
   * 检测用户的减少动画偏好
   */
  detectReducedMotion() {
    // 检查系统偏好
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.reducedMotion = mediaQuery.matches;
    
    // 监听偏好变化
    mediaQuery.addEventListener('change', (e) => {
      this.reducedMotion = e.matches;
      console.log('减少动画偏好已更改:', this.reducedMotion);
    });
  }

  /**
   * 创建屏幕阅读器公告元素
   */
  createAnnounceElement() {
    if (this.announceElement) return;
    
    this.announceElement = document.createElement('div');
    this.announceElement.id = 'gambler-announce';
    this.announceElement.setAttribute('role', 'status');
    this.announceElement.setAttribute('aria-live', 'polite');
    this.announceElement.setAttribute('aria-atomic', 'true');
    this.announceElement.style.position = 'absolute';
    this.announceElement.style.left = '-10000px';
    this.announceElement.style.width = '1px';
    this.announceElement.style.height = '1px';
    this.announceElement.style.overflow = 'hidden';
    
    document.body.appendChild(this.announceElement);
  }

  /**
   * 向屏幕阅读器公告消息
   * @param {string} message - 要公告的消息
   */
  announceResult(message) {
    if (!this.announceElement) return;
    
    // 清空后重新设置，确保屏幕阅读器读取
    this.announceElement.textContent = '';
    setTimeout(() => {
      this.announceElement.textContent = message;
    }, 100);
  }

  /**
   * 设置键盘导航
   */
  setupKeyboardNavigation() {
    const overlay = this.gamblerUI.elements.overlay;
    if (!overlay) return;

    // 键盘事件处理器
    const keyHandler = (e) => {
      if (!this.gamblerUI.isOpen) return;

      switch (e.key) {
        case 'Escape':
          // ESC 关闭面板
          if (!this.gamblerUI.isSpinning) {
            this.gamblerUI.close();
            e.preventDefault();
          }
          break;
          
        case 'Enter':
        case ' ':
          // Enter/Space 激活聚焦的按钮
          if (document.activeElement && document.activeElement.tagName === 'BUTTON') {
            document.activeElement.click();
            e.preventDefault();
          }
          break;
          
        case 'Tab':
          // Tab 循环聚焦
          this.handleTabNavigation(e);
          break;
          
        case 's':
        case 'S':
          // S 键快速跳过（当动画进行时）
          if (this.gamblerUI.isSpinning && this.gamblerUI.animationController) {
            this.gamblerUI.animationController.requestSkip();
            e.preventDefault();
          }
          break;
      }
    };

    // 移除旧的处理器（如果存在）
    if (this.keyboardHandlers.has('main')) {
      document.removeEventListener('keydown', this.keyboardHandlers.get('main'));
    }

    // 添加新的处理器
    this.keyboardHandlers.set('main', keyHandler);
    document.addEventListener('keydown', keyHandler);
  }

  /**
   * 处理 Tab 键导航
   * @param {KeyboardEvent} e - 键盘事件
   */
  handleTabNavigation(e) {
    const overlay = this.gamblerUI.elements.overlay;
    if (!overlay) return;

    // 获取所有可聚焦元素
    const focusableElements = overlay.querySelectorAll(
      'button:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    
    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    // Shift+Tab（反向）
    if (e.shiftKey) {
      if (document.activeElement === firstElement) {
        lastElement.focus();
        e.preventDefault();
      }
    } 
    // Tab（正向）
    else {
      if (document.activeElement === lastElement) {
        firstElement.focus();
        e.preventDefault();
      }
    }
  }

  /**
   * 获取动画持续时间（考虑减少动画模式）
   * @param {number} normalDuration - 正常持续时间（毫秒）
   * @returns {number} 调整后的持续时间
   */
  getAnimationDuration(normalDuration) {
    if (this.reducedMotion) {
      // 减少动画模式：返回极短时间或0
      return Math.min(normalDuration * 0.1, 500);
    }
    return normalDuration;
  }

  /**
   * 检查是否应该跳过动画
   * @returns {boolean} 是否跳过动画
   */
  shouldSkipAnimation() {
    return this.reducedMotion;
  }

  /**
   * 清理资源
   */
  cleanup() {
    // 移除键盘事件监听器
    for (const [key, handler] of this.keyboardHandlers) {
      document.removeEventListener('keydown', handler);
    }
    this.keyboardHandlers.clear();

    // 移除公告元素
    if (this.announceElement && this.announceElement.parentNode) {
      this.announceElement.parentNode.removeChild(this.announceElement);
      this.announceElement = null;
    }
  }

  /**
   * 销毁管理器
   */
  destroy() {
    this.cleanup();
  }
}
