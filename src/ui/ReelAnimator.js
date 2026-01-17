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

    // 清空并设置为flex布局
    strip.innerHTML = '';
    strip.style.display = 'flex';
    strip.style.alignItems = 'center';
    strip.style.justifyContent = 'center';
    strip.style.gap = '10px';
    strip.style.flexWrap = 'nowrap';
    strip.style.overflow = 'hidden';
    
    // 只显示少量物品（5-7个）进行动画
    const displayCount = 7;
    const startIndex = Math.max(0, winnerIndex - 3);
    const displayItems = items.slice(startIndex, startIndex + displayCount);
    
    // 渲染物品到 DOM
    displayItems.forEach((item, index) => {
      const el = document.createElement('div');
      el.className = `gambler-item-card quality-${item.quality}`;
      el.textContent = item.icon;
      el.style.background = 'transparent';
      el.style.border = 'none';
      el.style.opacity = '0';
      el.style.transform = 'scale(0.5)';
      el.style.transition = 'all 0.3s ease';
      strip.appendChild(el);
    });

    // 执行动画
    return new Promise((resolve) => {
      if (duration <= 500) {
        // 快速模式（跳过）
        this.showFinalResult(displayItems, winnerIndex - startIndex);
        setTimeout(resolve, 500);
      } else {
        // 完整动画：依次显示物品
        this.performSequentialAnimation(displayItems, winnerIndex - startIndex, duration, resolve);
      }
    });
  }

  /**
   * 执行顺序动画
   * @param {Array} items - 显示的物品数组
   * @param {number} winnerLocalIndex - 获胜物品在显示数组中的索引
   * @param {number} duration - 总持续时间
   * @param {Function} resolve - Promise 解析函数
   */
  performSequentialAnimation(items, winnerLocalIndex, duration, resolve) {
    const cards = this.reelStrip.querySelectorAll('.gambler-item-card');
    let currentIndex = 0;
    const intervalTime = Math.min(200, duration / items.length);

    const showNext = () => {
      if (this.skipRequested || currentIndex >= cards.length) {
        this.showFinalResult(items, winnerLocalIndex);
        resolve();
        return;
      }

      // 隐藏之前的卡片
      if (currentIndex > 0) {
        cards[currentIndex - 1].style.opacity = '0.3';
        cards[currentIndex - 1].style.transform = 'scale(0.8)';
      }

      // 显示当前卡片
      cards[currentIndex].style.opacity = '1';
      cards[currentIndex].style.transform = 'scale(1.2)';
      
      // 添加闪烁效果
      if (currentIndex === winnerLocalIndex) {
        cards[currentIndex].style.animation = 'pulse 0.5s ease-in-out 3';
      }

      currentIndex++;
      setTimeout(showNext, intervalTime);
    };

    showNext();
  }

  /**
   * 显示最终结果
   * @param {Array} items - 物品数组
   * @param {number} winnerIndex - 获胜物品索引
   */
  showFinalResult(items, winnerIndex) {
    const cards = this.reelStrip.querySelectorAll('.gambler-item-card');
    cards.forEach((card, index) => {
      if (index === winnerIndex) {
        card.style.opacity = '1';
        card.style.transform = 'scale(1.3)';
        card.style.filter = 'drop-shadow(0 0 10px currentColor)';
      } else {
        card.style.opacity = '0.2';
        card.style.transform = 'scale(0.7)';
      }
    });
  }

  /**
   * 应用模糊效果（已废弃，保留接口兼容性）
   * @param {number} intensity - 模糊强度（像素）
   */
  applyBlur(intensity) {
    // 新动画不使用模糊效果
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
      // 重置所有卡片
      const cards = this.reelStrip.querySelectorAll('.gambler-item-card');
      cards.forEach(card => {
        card.style.opacity = '1';
        card.style.transform = 'scale(1)';
        card.style.filter = 'none';
        card.style.animation = 'none';
      });
    }
  }
}
