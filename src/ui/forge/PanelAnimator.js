// PanelAnimator.js - 面板动画控制器
// 处理面板的进入和退出动画

/**
 * PanelAnimator - 面板动画控制器
 * 提供各种面板动画效果
 */
export class PanelAnimator {
  constructor() {
    this.animationDuration = 300; // 默认动画时长（毫秒）
  }

  /**
   * 滑入动画（从右侧滑入）
   */
  async slideIn(element) {
    if (!element) return;
    
    // 设置初始状态
    element.style.opacity = '0';
    element.style.transform = 'translateX(100px)';
    element.style.transition = `all ${this.animationDuration}ms cubic-bezier(0.4, 0, 0.2, 1)`;
    
    // 触发重排以确保初始状态被应用
    element.offsetHeight;
    
    // 应用最终状态
    element.style.opacity = '1';
    element.style.transform = 'translateX(0)';
    
    // 等待动画完成
    return new Promise(resolve => {
      setTimeout(resolve, this.animationDuration);
    });
  }

  /**
   * 滑出动画（向右侧滑出）
   */
  async slideOut(element) {
    if (!element) return;
    
    element.style.transition = `all ${this.animationDuration * 0.8}ms cubic-bezier(0.4, 0, 0.2, 1)`;
    element.style.opacity = '0';
    element.style.transform = 'translateX(100px)';
    
    return new Promise(resolve => {
      setTimeout(resolve, this.animationDuration * 0.8);
    });
  }

  /**
   * 淡入动画
   */
  async fadeIn(element) {
    if (!element) return;
    
    element.style.opacity = '0';
    element.style.transition = `opacity ${this.animationDuration}ms ease`;
    
    element.offsetHeight;
    
    element.style.opacity = '1';
    
    return new Promise(resolve => {
      setTimeout(resolve, this.animationDuration);
    });
  }

  /**
   * 淡出动画
   */
  async fadeOut(element) {
    if (!element) return;
    
    element.style.transition = `opacity ${this.animationDuration * 0.8}ms ease`;
    element.style.opacity = '0';
    
    return new Promise(resolve => {
      setTimeout(resolve, this.animationDuration * 0.8);
    });
  }

  /**
   * 缩放进入动画
   */
  async scaleIn(element) {
    if (!element) return;
    
    element.style.opacity = '0';
    element.style.transform = 'scale(0.9)';
    element.style.transition = `all ${this.animationDuration}ms cubic-bezier(0.34, 1.56, 0.64, 1)`;
    
    element.offsetHeight;
    
    element.style.opacity = '1';
    element.style.transform = 'scale(1)';
    
    return new Promise(resolve => {
      setTimeout(resolve, this.animationDuration);
    });
  }

  /**
   * 缩放退出动画
   */
  async scaleOut(element) {
    if (!element) return;
    
    element.style.transition = `all ${this.animationDuration * 0.8}ms cubic-bezier(0.4, 0, 0.2, 1)`;
    element.style.opacity = '0';
    element.style.transform = 'scale(0.9)';
    
    return new Promise(resolve => {
      setTimeout(resolve, this.animationDuration * 0.8);
    });
  }

  /**
   * 从上方滑入
   */
  async slideInFromTop(element) {
    if (!element) return;
    
    element.style.opacity = '0';
    element.style.transform = 'translateY(-50px)';
    element.style.transition = `all ${this.animationDuration}ms cubic-bezier(0.4, 0, 0.2, 1)`;
    
    element.offsetHeight;
    
    element.style.opacity = '1';
    element.style.transform = 'translateY(0)';
    
    return new Promise(resolve => {
      setTimeout(resolve, this.animationDuration);
    });
  }

  /**
   * 向上滑出
   */
  async slideOutToTop(element) {
    if (!element) return;
    
    element.style.transition = `all ${this.animationDuration * 0.8}ms cubic-bezier(0.4, 0, 0.2, 1)`;
    element.style.opacity = '0';
    element.style.transform = 'translateY(-50px)';
    
    return new Promise(resolve => {
      setTimeout(resolve, this.animationDuration * 0.8);
    });
  }

  /**
   * 设置动画时长
   */
  setDuration(duration) {
    this.animationDuration = duration;
  }

  /**
   * 获取动画时长
   */
  getDuration() {
    return this.animationDuration;
  }
}
