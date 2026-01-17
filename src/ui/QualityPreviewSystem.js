// QualityPreviewSystem.js - 品质预告系统
// 在不透露具体物品的情况下提供视觉提示

/**
 * QualityPreviewSystem - 品质预告系统
 * 根据即将到来的物品品质显示视觉提示
 */
export class QualityPreviewSystem {
  constructor(controller) {
    this.controller = controller;
    this.previewActive = false;
    this.previewTimeout = null;
  }

  /**
   * 显示品质预告
   * @param {string} quality - 品质等级
   * @param {number} duration - 持续时间（毫秒）
   * @returns {Promise} 预告完成时解析
   */
  async showPreview(quality, duration = 2000) {
    // 品质预告已禁用 - 用户只想要物品边框，不要容器背景效果
    // 直接返回，不应用任何视觉效果
    return Promise.resolve();
  }

  /**
   * 清除预告效果
   */
  clearPreview() {
    if (!this.previewActive) return;

    const gamblerUI = this.controller.gamblerUI;
    const container = gamblerUI.elements.reelContainer;
    
    if (container) {
      container.style.transition = 'all 300ms ease-out';
      container.style.background = 'transparent';
      container.style.boxShadow = 'none';
      container.style.animation = 'none';
    }

    if (this.previewTimeout) {
      clearTimeout(this.previewTimeout);
      this.previewTimeout = null;
    }

    this.previewActive = false;
  }
}

// 注入 CSS 动画
if (typeof document !== 'undefined' && !document.getElementById('quality-preview-animations')) {
  const style = document.createElement('style');
  style.id = 'quality-preview-animations';
  style.textContent = `
    @keyframes quality-pulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.02); }
    }
    
    @keyframes quality-shake {
      0%, 100% { transform: translateX(0); }
      25% { transform: translateX(-2px); }
      75% { transform: translateX(2px); }
    }
  `;
  document.head.appendChild(style);
}
