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
    if (quality === 'COMMON' || quality === 'UNCOMMON') {
      return; // 普通和优秀不显示预告
    }

    const gamblerUI = this.controller.gamblerUI;
    const container = gamblerUI.elements.reelContainer;
    
    if (!container) return;

    this.previewActive = true;

    // 根据品质设置效果
    const effects = {
      RARE: {
        background: 'linear-gradient(135deg, rgba(0, 112, 221, 0.3), rgba(0, 112, 221, 0.1))',
        boxShadow: '0 0 20px rgba(0, 112, 221, 0.5)',
        sound: 'tension_low'
      },
      EPIC: {
        background: 'linear-gradient(135deg, rgba(163, 53, 238, 0.4), rgba(163, 53, 238, 0.1))',
        boxShadow: '0 0 30px rgba(163, 53, 238, 0.7), inset 0 0 20px rgba(163, 53, 238, 0.3)',
        sound: 'tension_medium'
      },
      LEGENDARY: {
        background: 'linear-gradient(135deg, rgba(255, 128, 0, 0.5), rgba(255, 128, 0, 0.1))',
        boxShadow: '0 0 40px rgba(255, 128, 0, 0.9), inset 0 0 30px rgba(255, 128, 0, 0.4)',
        sound: 'tension_high',
        pulse: true
      },
      JACKPOT: {
        background: 'linear-gradient(135deg, rgba(255, 0, 0, 0.6), rgba(255, 215, 0, 0.3))',
        boxShadow: '0 0 50px rgba(255, 0, 0, 1), inset 0 0 40px rgba(255, 215, 0, 0.5)',
        sound: 'tension_extreme',
        pulse: true,
        shake: true
      }
    };

    const effect = effects[quality];
    if (!effect) return;

    // 应用视觉效果
    container.style.transition = 'all 500ms ease-out';
    container.style.background = effect.background;
    container.style.boxShadow = effect.boxShadow;

    // 脉冲效果
    if (effect.pulse) {
      container.style.animation = 'quality-pulse 1s infinite';
    }

    // 震动效果（仅 JACKPOT）
    if (effect.shake) {
      container.style.animation = 'quality-pulse 1s infinite, quality-shake 0.5s infinite';
    }

    // 播放音效
    const game = window.game;
    if (game && game.audio) {
      // 使用现有音效模拟紧张感
      if (quality === 'LEGENDARY' || quality === 'JACKPOT') {
        game.audio.playBookFlip(); // 暂用，之后可以添加专门的紧张音效
      }
    }

    // 等待持续时间
    return new Promise((resolve) => {
      this.previewTimeout = setTimeout(() => {
        this.clearPreview();
        resolve();
      }, duration);
    });
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
      container.style.background = '#000';
      container.style.boxShadow = 'inset 0 0 20px rgba(0,0,0,0.8)';
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
