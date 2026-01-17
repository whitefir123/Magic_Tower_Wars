// ResultEffectRenderer.js - 结果效果渲染器
// 根据品质渲染相应的庆祝效果

/**
 * ResultEffectRenderer - 结果效果渲染器
 * 为不同品质的奖励显示相应的视觉效果
 */
export class ResultEffectRenderer {
  constructor(controller) {
    this.controller = controller;
    this.particleSystem = null; // 将在 GamblerUI 初始化时设置
  }

  /**
   * 播放结果效果
   * @param {string} quality - 品质等级
   * @param {boolean} abbreviated - 是否播放缩略版本
   * @returns {Promise} 效果完成时解析
   */
  async playResultEffect(quality, abbreviated = false) {
    if (abbreviated) {
      return this.playSimpleFade();
    }

    switch (quality) {
      case 'COMMON':
      case 'UNCOMMON':
        return this.playSimpleFade();
      case 'RARE':
        return this.playBluePulse();
      case 'EPIC':
        return this.playPurpleExplosion();
      case 'LEGENDARY':
        return this.playLegendaryEffect();
      case 'JACKPOT':
        return this.playJackpotEffect();
      default:
        return this.playSimpleFade();
    }
  }

  /**
   * 简单淡入效果
   */
  async playSimpleFade() {
    const gamblerUI = this.controller.gamblerUI;
    const resultDisplay = gamblerUI.elements.resultDisplay;
    
    if (resultDisplay) {
      resultDisplay.style.transition = 'opacity 300ms ease-in';
      resultDisplay.style.opacity = '0';
      
      // 强制重排
      void resultDisplay.offsetWidth;
      
      resultDisplay.style.opacity = '1';
    }

    return this.sleep(300);
  }

  /**
   * 蓝色脉冲效果（稀有）
   */
  async playBluePulse() {
    const gamblerUI = this.controller.gamblerUI;
    const resultDisplay = gamblerUI.elements.resultDisplay;
    
    if (resultDisplay) {
      resultDisplay.style.animation = 'blue-pulse 1s ease-out';
      
      // 播放音效
      const game = window.game;
      if (game && game.audio) {
        game.audio.playCrit({ volume: 0.4 });
      }
    }

    await this.sleep(1000);
    
    if (resultDisplay) {
      resultDisplay.style.animation = 'none';
    }
  }

  /**
   * 紫色爆炸效果（史诗）
   */
  async playPurpleExplosion() {
    const gamblerUI = this.controller.gamblerUI;
    const resultDisplay = gamblerUI.elements.resultDisplay;
    const container = gamblerUI.elements.reelContainer;
    
    // 播放音效
    const game = window.game;
    if (game && game.audio) {
      game.audio.playCrit({ volume: 0.6 });
    }

    // 粒子爆炸
    if (this.particleSystem && container) {
      const rect = container.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      this.particleSystem.emitExplosion(centerX, centerY, 'rgba(163, 53, 238, 0.8)', 25);
    }

    // 结果显示动画
    if (resultDisplay) {
      resultDisplay.style.animation = 'epic-reveal 1.5s ease-out';
    }

    await this.sleep(1500);
    
    if (resultDisplay) {
      resultDisplay.style.animation = 'none';
    }
  }

  /**
   * 传说效果（橙色闪光 + 闪光粒子）
   */
  async playLegendaryEffect() {
    const gamblerUI = this.controller.gamblerUI;
    const resultDisplay = gamblerUI.elements.resultDisplay;
    const container = gamblerUI.elements.reelContainer;
    const overlay = gamblerUI.elements.overlay;
    
    // 播放音效
    const game = window.game;
    if (game && game.audio) {
      game.audio.playLevelUp();
    }

    // 屏幕闪光
    if (overlay) {
      const flash = document.createElement('div');
      flash.style.position = 'fixed';
      flash.style.top = '0';
      flash.style.left = '0';
      flash.style.width = '100%';
      flash.style.height = '100%';
      flash.style.background = 'rgba(255, 128, 0, 0.3)';
      flash.style.pointerEvents = 'none';
      flash.style.zIndex = '9999';
      flash.style.animation = 'flash-fade 200ms ease-out';
      overlay.appendChild(flash);
      
      setTimeout(() => flash.remove(), 200);
    }

    // 闪光粒子
    if (this.particleSystem && container) {
      const rect = container.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      this.particleSystem.emitSparkles(centerX, centerY, 60);
    }

    // 结果显示动画
    if (resultDisplay) {
      resultDisplay.style.animation = 'legendary-reveal 2s ease-out';
    }

    await this.sleep(2000);
    
    if (resultDisplay) {
      resultDisplay.style.animation = 'none';
    }
  }

  /**
   * 大奖效果（金币雨 + 屏幕震动 + 慢动作）
   */
  async playJackpotEffect() {
    const gamblerUI = this.controller.gamblerUI;
    const resultDisplay = gamblerUI.elements.resultDisplay;
    const overlay = gamblerUI.elements.overlay;
    
    // 播放音效
    const game = window.game;
    if (game && game.audio) {
      game.audio.playLevelUp();
      setTimeout(() => {
        if (game.audio) game.audio.playCoins({ forceCategory: 'ui' });
      }, 300);
    }

    // 全屏金色闪光
    if (overlay) {
      const flash = document.createElement('div');
      flash.style.position = 'fixed';
      flash.style.top = '0';
      flash.style.left = '0';
      flash.style.width = '100%';
      flash.style.height = '100%';
      flash.style.background = 'rgba(255, 215, 0, 0.5)';
      flash.style.pointerEvents = 'none';
      flash.style.zIndex = '9999';
      flash.style.animation = 'flash-fade 300ms ease-out';
      overlay.appendChild(flash);
      
      setTimeout(() => flash.remove(), 300);
    }

    // 屏幕震动
    if (overlay) {
      overlay.style.animation = 'screen-shake 500ms ease-out';
      setTimeout(() => {
        overlay.style.animation = 'none';
      }, 500);
    }

    // 金币雨
    if (this.particleSystem && overlay) {
      const rect = overlay.getBoundingClientRect();
      this.particleSystem.emitCoinRain(0, 0, rect.width, 100);
    }

    // 结果显示动画
    if (resultDisplay) {
      resultDisplay.style.animation = 'jackpot-reveal 4s ease-out';
    }

    await this.sleep(4000);
    
    if (resultDisplay) {
      resultDisplay.style.animation = 'none';
    }
  }

  /**
   * 清理
   */
  cleanup() {
    // 清理任何残留的动画
  }

  /**
   * 辅助函数：延迟
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 注入 CSS 动画
if (typeof document !== 'undefined' && !document.getElementById('result-effect-animations')) {
  const style = document.createElement('style');
  style.id = 'result-effect-animations';
  style.textContent = `
    @keyframes blue-pulse {
      0%, 100% { 
        transform: scale(1); 
        box-shadow: 0 0 10px rgba(0, 112, 221, 0.5);
      }
      50% { 
        transform: scale(1.1); 
        box-shadow: 0 0 30px rgba(0, 112, 221, 1);
      }
    }
    
    @keyframes epic-reveal {
      0% { 
        transform: scale(0.5); 
        opacity: 0;
      }
      50% { 
        transform: scale(1.2); 
      }
      100% { 
        transform: scale(1); 
        opacity: 1;
      }
    }
    
    @keyframes legendary-reveal {
      0% { 
        transform: scale(0) rotate(-180deg); 
        opacity: 0;
      }
      60% { 
        transform: scale(1.3) rotate(10deg); 
      }
      100% { 
        transform: scale(1) rotate(0deg); 
        opacity: 1;
      }
    }
    
    @keyframes jackpot-reveal {
      0% { 
        transform: scale(0); 
        opacity: 0;
      }
      20% { 
        transform: scale(1.5); 
      }
      40% { 
        transform: scale(0.9); 
      }
      60% { 
        transform: scale(1.2); 
      }
      80% { 
        transform: scale(0.95); 
      }
      100% { 
        transform: scale(1); 
        opacity: 1;
      }
    }
    
    @keyframes flash-fade {
      0% { opacity: 1; }
      100% { opacity: 0; }
    }
    
    @keyframes screen-shake {
      0%, 100% { transform: translate(0, 0); }
      10%, 30%, 50%, 70%, 90% { transform: translate(-10px, 0); }
      20%, 40%, 60%, 80% { transform: translate(10px, 0); }
    }
  `;
  document.head.appendChild(style);
}
