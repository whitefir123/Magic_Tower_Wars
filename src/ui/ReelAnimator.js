// ReelAnimator.js - 滚轮动画器
// 处理基于物理的滚轮滚动和渐进减速

/**
 * ReelAnimator - 滚轮动画器
 * 实现 4 阶段动画：加速 → 恒速 → 减速 → 顿挫
 */
export class ReelAnimator {
  constructor(controller) {
    this.controller = controller;
    this.reelStrip = null;
    this.animationFrame = null;
    this.skipRequested = false;
  }

  /**
   * 执行滚轮动画
   * @param {Array} items - 物品数组
   * @param {number} winnerIndex - 获胜物品索引
   * @param {number} duration - 动画持续时间（毫秒）
   * @returns {Promise} 动画完成时解析
   */
  async animate(items, winnerIndex, duration = 4000) {
    const gamblerUI = this.controller.gamblerUI;
    const strip = gamblerUI.elements.reelStrip;
    const container = gamblerUI.elements.reelContainer;
    
    if (!strip || !container) {
      throw new Error('Reel elements not found');
    }

    this.reelStrip = strip;
    this.skipRequested = false;

    // 渲染物品到 DOM
    strip.innerHTML = '';
    items.forEach(item => {
      const el = document.createElement('div');
      el.className = `gambler-item-card quality-${item.quality}`;
      el.textContent = item.icon;
      strip.appendChild(el);
    });

    // 计算最终位置
    const finalPosition = this.calculateFinalPosition(winnerIndex, container.offsetWidth);

    // 重置位置
    strip.style.transition = 'none';
    strip.style.transform = 'translateX(0)';
    strip.style.filter = 'none';
    
    // 强制重排
    void strip.offsetWidth;

    // 执行动画
    return new Promise((resolve) => {
      if (duration <= 500) {
        // 快速模式（跳过）
        strip.style.transition = `transform 500ms ease-out`;
        strip.style.transform = `translateX(${finalPosition}px)`;
        setTimeout(resolve, 500);
      } else {
        // 完整动画：4 阶段
        this.performMultiPhaseAnimation(strip, finalPosition, duration, resolve);
      }
    });
  }

  /**
   * 执行多阶段动画
   * @param {HTMLElement} strip - 滚轮条元素
   * @param {number} finalPosition - 最终位置
   * @param {number} duration - 总持续时间
   * @param {Function} resolve - Promise 解析函数
   */
  performMultiPhaseAnimation(strip, finalPosition, duration, resolve) {
    const phases = [
      { duration: 300, easing: 'cubic-bezier(0.4, 0, 0.2, 1)', progress: 0.1 }, // 加速
      { duration: 2000, easing: 'linear', progress: 0.6 }, // 恒速
      { duration: 1500, easing: 'cubic-bezier(0.1, 0.9, 0.3, 1)', progress: 0.95 }, // 减速
      { duration: 200, easing: 'steps(4)', progress: 1.0 } // 顿挫
    ];

    let currentPhase = 0;
    let elapsedTime = 0;

    const executePhase = () => {
      if (this.skipRequested || currentPhase >= phases.length) {
        // 跳过或完成
        strip.style.transition = 'none';
        strip.style.transform = `translateX(${finalPosition}px)`;
        strip.style.filter = 'none';
        resolve();
        return;
      }

      const phase = phases[currentPhase];
      const targetPosition = finalPosition * phase.progress;

      // 应用运动模糊（仅在高速阶段）
      if (currentPhase === 1) {
        strip.style.filter = 'blur(2px)';
      } else if (currentPhase === 2) {
        strip.style.filter = 'blur(1px)';
      } else {
        strip.style.filter = 'none';
      }

      strip.style.transition = `transform ${phase.duration}ms ${phase.easing}`;
      strip.style.transform = `translateX(${targetPosition}px)`;

      elapsedTime += phase.duration;
      currentPhase++;

      setTimeout(executePhase, phase.duration);
    };

    executePhase();
  }

  /**
   * 计算最终位置
   * @param {number} winnerIndex - 获胜物品索引
   * @param {number} containerWidth - 容器宽度
   * @returns {number} translateX 值
   */
  calculateFinalPosition(winnerIndex, containerWidth) {
    const cardWidth = 100; // 90px + 10px margin
    const targetOffset = (winnerIndex * cardWidth) + (cardWidth / 2) - (containerWidth / 2);
    
    // 添加随机偏移以获得自然感觉
    const randomOffset = (Math.random() - 0.5) * 40; // ±20px
    
    return -(targetOffset + randomOffset);
  }

  /**
   * 应用模糊效果
   * @param {number} intensity - 模糊强度（像素）
   */
  applyBlur(intensity) {
    if (this.reelStrip) {
      this.reelStrip.style.filter = intensity > 0 ? `blur(${intensity}px)` : 'none';
    }
  }

  /**
   * 跳过动画
   */
  skip() {
    this.skipRequested = true;
  }

  /**
   * 清理
   */
  cleanup() {
    this.skipRequested = false;
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
    if (this.reelStrip) {
      this.reelStrip.style.filter = 'none';
    }
  }
}
