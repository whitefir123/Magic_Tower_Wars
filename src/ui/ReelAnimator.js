// ReelAnimator.js - 滚轮动画器
// CS:GO风格的横向滚动抽奖动画

import { globalTooltipManager } from '../utils/TooltipManager.js';

/**
 * ReelAnimator - 滚轮动画器
 * 实现CS:GO风格的横向滚动动画
 */
export class ReelAnimator {
  constructor(controller) {
    this.controller = controller;
    this.reelStrip = null;
    this.animationFrame = null;
    this.skipRequested = false;
  }

  /**
   * 创建物品图标canvas（参考ShopUI实现）
   * @param {Image} img - sprite sheet图片
   * @param {Object} item - 物品对象
   * @param {number} size - 图标大小
   * @returns {HTMLCanvasElement|null}
   */
  createItemIcon(img, item, size = 80) {
    if (!img) {
      return null;
    }
    
    // 检查图片是否加载完成
    if (img.complete === false || img.naturalWidth === 0) {
      return null;
    }

    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    let currentCols = 4;
    let currentRows = 4;

    // 根据物品类型确定网格布局
    if (item.type === 'gem') {
      currentCols = 5;
      currentRows = 4;
    } else if (item.type === 'consumable') {
      const iconIndex = item.data?.iconIndex || 0;
      if (iconIndex >= 16) {
        currentCols = 5;
        currentRows = 5;
      }
    }

    const idxIcon = item.data?.iconIndex || 0;
    const col = idxIcon % currentCols;
    const row = Math.floor(idxIcon / currentCols);
    
    const natW = img.naturalWidth || img.width;
    const natH = img.naturalHeight || img.height;
    const cellW = natW / currentCols;
    const cellH = natH / currentRows;

    // 使用整数像素切割
    const sx = Math.round(col * cellW);
    const sy = Math.round(row * cellH);
    const sw = Math.round(cellW);
    const sh = Math.round(cellH);

    ctx.imageSmoothingEnabled = false;

    // 保持宽高比并居中显示
    const cellAspect = sw / sh;
    let destW = size;
    let destH = size;

    if (cellAspect > 1) {
      destH = size;
      destW = size * cellAspect;
    } else if (cellAspect < 1) {
      destW = size;
      destH = size / cellAspect;
    }

    const offsetX = Math.round((size - destW) / 2);
    const offsetY = Math.round((size - destH) / 2);

    try {
      ctx.drawImage(img, sx, sy, sw, sh, offsetX, offsetY, destW, destH);
      return canvas;
    } catch (e) {
      console.error('ReelAnimator: Failed to draw image for item:', item, 'error:', e);
      return null;
    }
  }

  /**
   * 渲染物品图标（使用sprite sheet）
   * @param {HTMLElement} container - 容器元素
   * @param {Object} item - 物品对象
   * @returns {boolean} 是否成功渲染
   */
  renderItemIcon(container, item) {
    const game = window.game;
    if (!game || !game.loader) {
      return false;
    }

    // 获取对应的sprite sheet
    let img = null;

    if (item.type === 'equipment') {
      img = game.loader.getImage('ICONS_EQUIP');
    } else if (item.type === 'consumable') {
      img = game.loader.getImage('ICONS_CONSUMABLES');
    } else if (item.type === 'gem') {
      img = game.loader.getImage('ICONS_GEMS');
    } else {
      // 金币、buff等使用emoji
      return false;
    }

    if (!img) {
      return false;
    }

    // 创建canvas
    const canvas = this.createItemIcon(img, item, 80);
    
    if (canvas) {
      container.appendChild(canvas);
      return true;
    }

    return false;
  }

  /**
   * 执行滚轮动画
   * @param {Array} items - 物品数组
   * @param {number} winnerIndex - 获胜物品索引
   * @param {number} duration - 动画持续时间（毫秒）
   * @returns {Promise} 动画完成时解析
   */
  async animate(items, winnerIndex, duration = 5500) {
    const gamblerUI = this.controller.gamblerUI;
    const strip = gamblerUI.elements.reelStrip;
    const container = gamblerUI.elements.reelContainer;
    
    if (!strip || !container) {
      throw new Error('Reel elements not found');
    }

    this.reelStrip = strip;
    this.skipRequested = false;

    // 清空并设置为横向滚动布局
    strip.innerHTML = '';
    strip.style.display = 'flex';
    strip.style.alignItems = 'center';
    strip.style.justifyContent = 'flex-start';
    strip.style.gap = '15px';
    strip.style.flexWrap = 'nowrap';
    strip.style.position = 'relative';
    strip.style.transition = 'none';
    strip.style.transform = 'translateX(0)';
    
    // 创建足够多的物品用于滚动效果
    // 需要足够的物品来支持平滑滚动和正确的视觉效果
    const displayItems = [];
    const minItems = 150; // 增加到150个，确保有足够的滚动空间
    
    // 复制物品数组直到有足够的物品
    while (displayItems.length < minItems) {
      displayItems.push(...items);
    }
    
    // 计算获胜物品在displayItems中的新位置（大约在2/3处）
    const winnerPosition = Math.floor(displayItems.length * 0.65);
    const actualWinner = items[winnerIndex];
    
    // 将真实的获胜物品放在winnerPosition位置
    displayItems[winnerPosition] = actualWinner;
    
    // 决定是否触发"差一点"效果（30%概率，且仅在获得普通/优秀品质时）
    const shouldNearMiss = Math.random() < 0.3 && 
                          (actualWinner.quality === 'COMMON' || actualWinner.quality === 'UNCOMMON');
    
    // 如果触发"差一点"，在获胜物品前面放一个高品质物品
    if (shouldNearMiss && winnerPosition > 0) {
      // 从items数组中找一个高品质物品（现在都是真实物品了）
      const betterQualities = ['RARE', 'EPIC', 'LEGENDARY'];
      const betterItem = items.find(item => betterQualities.includes(item.quality));
      
      if (betterItem) {
        displayItems[winnerPosition - 1] = betterItem;
      }
    }
    
    // 渲染所有物品
    displayItems.forEach((item, index) => {
      const el = document.createElement('div');
      el.className = `gambler-item-card quality-${item.quality}`;
      el.style.minWidth = '90px';
      el.style.height = '90px';
      el.style.display = 'flex';
      el.style.alignItems = 'center';
      el.style.justifyContent = 'center';
      el.style.fontSize = '32px';
      el.style.background = 'transparent';
      el.style.flexShrink = '0';
      el.style.transition = 'transform 0.2s ease';
      el.style.borderRadius = '6px';
      el.style.position = 'relative';
      
      // 调试：记录卡片索引
      el.dataset.index = index;
      
      // 根据品质设置边框
      const qualityBorders = {
        'COMMON': '2px solid #a0a0a0',
        'UNCOMMON': '2px solid #5eff00',
        'RARE': '2px solid #0070dd',
        'EPIC': '2px solid #a335ee',
        'LEGENDARY': '2px solid #ff8000',
        'JACKPOT': '2px solid #ff0000'
      };
      el.style.border = qualityBorders[item.quality] || '2px solid #666';
      
      // 尝试渲染真实物品图标
      const iconRendered = this.renderItemIcon(el, item);
      
      // 如果无法渲染真实图标，使用emoji作为后备
      if (!iconRendered) {
        el.textContent = item.icon;
      }
      
      // 标记获胜物品
      if (index === winnerPosition) {
        el.dataset.winner = 'true';
      }
      
      // 添加 tooltip 事件
      el.addEventListener('mouseenter', (e) => {
        // 优先使用完整的物品对象，而不仅仅是data字段
        const tooltipItem = item.data ? item : (item.type ? item : null);
        if (tooltipItem) {
          globalTooltipManager.show(tooltipItem, e.clientX, e.clientY);
        }
      });
      
      el.addEventListener('mousemove', (e) => {
        globalTooltipManager.updatePosition(e.clientX, e.clientY);
      });
      
      el.addEventListener('mouseleave', () => {
        globalTooltipManager.hide();
      });
      
      strip.appendChild(el);
    });

    // 添加中间指示器
    this.addCenterIndicator(container);

    // 执行动画
    return new Promise((resolve) => {
      if (this.skipRequested || duration <= 500) {
        // 快速模式
        this.scrollToWinner(winnerPosition, 500, resolve, false, displayItems);
      } else {
        // 完整动画，传递是否触发"差一点"效果
        this.scrollToWinner(winnerPosition, duration, resolve, shouldNearMiss, displayItems);
      }
    });
  }

  /**
   * 添加中间指示器
   */
  addCenterIndicator(container) {
    // 移除旧的指示器
    const oldIndicator = container.querySelector('.reel-indicator');
    if (oldIndicator) {
      oldIndicator.remove();
    }

    const indicator = document.createElement('div');
    indicator.className = 'reel-indicator';
    indicator.style.cssText = `
      position: absolute;
      left: 50%;
      top: 0;
      bottom: 0;
      width: 3px;
      background: linear-gradient(to bottom, transparent, #ffd700, transparent);
      transform: translateX(-50%);
      z-index: 10;
      pointer-events: none;
      box-shadow: 0 0 10px rgba(255, 215, 0, 0.8);
    `;
    container.appendChild(indicator);
  }

  /**
   * 滚动到获胜物品
   */
  scrollToWinner(winnerPosition, duration, resolve, shouldNearMiss = false, displayItems = []) {
    const cards = this.reelStrip.querySelectorAll('.gambler-item-card');
    const winnerCard = cards[winnerPosition];
    
    if (!winnerCard) {
      resolve();
      return;
    }

    // 计算需要滚动的距离
    const containerWidth = this.reelStrip.parentElement.offsetWidth;
    const centerOffset = containerWidth / 2; // 容器中心位置（指针位置）
    
    // 使用实际的 offsetLeft 而不是理论计算
    // 目标：让卡片中心对准容器中心（指针位置）
    const cardCenterPosition = winnerCard.offsetLeft + winnerCard.offsetWidth / 2;
    let baseOffset = -(cardCenterPosition - centerOffset);
    const randomOffset = (Math.random() - 0.5) * 40; // -20 到 +20 像素
    let targetOffset = baseOffset + randomOffset;
    
    // 如果触发"差一点"效果，先停在前一个物品
    const cardWidth = winnerCard.offsetWidth + 15; // 实际卡片宽度 + gap
    const nearMissOffset = shouldNearMiss ? targetOffset + cardWidth : targetOffset;
    
    // 保存信息供后续使用
    this.finalStopInfo = {
      targetOffset,
      cardWidth,
      centerOffset,
      containerWidth,
      displayItems,
      winnerPosition,
      cards: Array.from(cards) // 保存所有卡片的引用
    };

    // 使用完全平滑的单一曲线
    const startTime = Date.now();
    const startOffset = 0;
    
    const animate = () => {
      if (this.skipRequested) {
        // 跳过动画，直接到结束位置
        this.reelStrip.style.transition = 'transform 0.3s ease-out';
        this.reelStrip.style.transform = `translateX(${targetOffset}px)`;
        setTimeout(() => {
          this.highlightWinner(winnerCard);
          resolve();
        }, 300);
        return;
      }

      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // 全程减速：使用 ease-out-cubic
      // 开始快，逐渐变慢，最后非常慢
      const eased = 1 - Math.pow(1 - progress, 3);
      
      const currentOffset = startOffset + (nearMissOffset - startOffset) * eased;
      
      this.reelStrip.style.transform = `translateX(${currentOffset}px)`;
      
      if (progress < 1) {
        this.animationFrame = requestAnimationFrame(animate);
      } else {
        // 第一阶段动画结束
        if (shouldNearMiss) {
          // 触发"差一点"效果：短暂停顿后滑到真正的获胜物品
          setTimeout(() => {
            this.slideToActualWinner(nearMissOffset, targetOffset, winnerCard, resolve);
          }, 500); // 停顿500ms增加紧张感
        } else {
          // 停顿一下再高亮，增加紧张感
          setTimeout(() => {
            this.highlightWinner(winnerCard);
            resolve();
          }, 400);
        }
      }
    };

    this.animationFrame = requestAnimationFrame(animate);
  }

  /**
   * "差一点"效果：从near miss位置滑到实际获胜位置
   */
  slideToActualWinner(fromOffset, toOffset, winnerCard, resolve) {
    const startTime = Date.now();
    const slideDuration = 1200; // 滑动持续时间增加到1.2秒
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / slideDuration, 1);
      
      // 使用ease-out-cubic让滑动更慢更紧张
      const eased = 1 - Math.pow(1 - progress, 3);
      
      const currentOffset = fromOffset + (toOffset - fromOffset) * eased;
      this.reelStrip.style.transform = `translateX(${currentOffset}px)`;
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        // 滑动结束，停顿后再高亮
        setTimeout(() => {
          this.highlightWinner(winnerCard);
          resolve();
        }, 300);
      }
    };
    
    requestAnimationFrame(animate);
  }

  /**
   * 根据最终停止位置计算实际获得的物品
   * @returns {Object} 实际停在指针位置的物品
   */
  getActualWinnerByPointer() {
    if (!this.finalStopInfo) {
      console.warn('ReelAnimator: finalStopInfo not found');
      return null;
    }
    
    const { targetOffset, centerOffset, displayItems, cards } = this.finalStopInfo;
    
    // 计算指针在滚轮条中的绝对位置
    const pointerPositionInStrip = centerOffset - targetOffset;
    
    // 遍历所有卡片，找到最接近指针的那个
    let closestCard = null;
    let closestDistance = Infinity;
    let closestIndex = -1;
    
    cards.forEach((card, index) => {
      const cardLeft = card.offsetLeft;
      const cardRight = cardLeft + card.offsetWidth;
      const cardCenter = cardLeft + card.offsetWidth / 2;
      
      // 计算卡片中心到指针的距离
      const distance = Math.abs(cardCenter - pointerPositionInStrip);
      
      if (distance < closestDistance) {
        closestDistance = distance;
        closestCard = card;
        closestIndex = index;
      }
    });
    
    if (closestIndex >= 0 && closestIndex < displayItems.length) {
      const actualWinner = displayItems[closestIndex];
      return actualWinner;
    }
    
    console.warn('ReelAnimator: 未找到最接近的卡片');
    return null;
  }

  /**
   * 高亮获胜物品
   */
  highlightWinner(winnerCard) {
    // 淡化其他卡片
    const cards = this.reelStrip.querySelectorAll('.gambler-item-card');
    cards.forEach(card => {
      if (card !== winnerCard) {
        card.style.opacity = '0.3';
        card.style.transform = 'scale(0.9)';
      }
    });

    // 高亮获胜卡片
    winnerCard.style.transform = 'scale(1.2)';
    winnerCard.style.filter = 'drop-shadow(0 0 15px currentColor)';
    winnerCard.style.animation = 'pulse 0.6s ease-in-out 3';
  }

  /**
   * 应用模糊效果（已废弃，保留接口兼容性）
   */
  applyBlur(intensity) {
    // CS:GO风格不使用模糊效果
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
      this.reelStrip.style.transform = 'translateX(0)';
      this.reelStrip.style.transition = 'none';
      
      // 移除指示器
      const container = this.reelStrip.parentElement;
      if (container) {
        const indicator = container.querySelector('.reel-indicator');
        if (indicator) {
          indicator.remove();
        }
      }
      
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
