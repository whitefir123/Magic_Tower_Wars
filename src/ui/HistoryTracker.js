// HistoryTracker.js - 历史追踪器
// 管理旋转历史记录和差一点检测

/**
 * HistoryTracker - 历史追踪器
 * 追踪最近的旋转结果，检测"差一点"情况
 */
export class HistoryTracker {
  constructor(maxHistory = 5) {
    this.history = [];
    this.maxHistory = maxHistory;
  }

  /**
   * 添加结果到历史
   * @param {Object} reward - 奖励对象
   * @param {boolean} wasNearMiss - 是否差一点
   * @param {string} missedQuality - 错过的品质
   */
  addResult(reward, wasNearMiss = false, missedQuality = null) {
    const entry = {
      reward,
      timestamp: Date.now(),
      wasNearMiss,
      missedQuality
    };

    // 添加到历史开头
    this.history.unshift(entry);

    // 保持最大数量限制（FIFO）
    if (this.history.length > this.maxHistory) {
      this.history.pop();
    }

    return this.history;
  }

  /**
   * 检测差一点情况
   * @param {number} finalIndex - 最终停止的索引
   * @param {Array} items - 所有物品数组
   * @returns {Object} { isNearMiss: boolean, missedItem: object }
   */
  detectNearMiss(finalIndex, items) {
    if (!items || items.length === 0) {
      return { isNearMiss: false, missedItem: null };
    }

    // 检查前后 2 个位置是否有传说或大奖
    const checkRange = 2;
    const highQualityItems = ['LEGENDARY', 'JACKPOT'];

    for (let offset = -checkRange; offset <= checkRange; offset++) {
      if (offset === 0) continue; // 跳过当前位置

      const checkIndex = finalIndex + offset;
      if (checkIndex >= 0 && checkIndex < items.length) {
        const item = items[checkIndex];
        if (highQualityItems.includes(item.quality)) {
          return {
            isNearMiss: true,
            missedItem: item,
            distance: Math.abs(offset)
          };
        }
      }
    }

    return { isNearMiss: false, missedItem: null };
  }

  /**
   * 渲染历史记录
   * @param {HTMLElement} containerElement - 容器元素
   */
  renderHistory(containerElement) {
    if (!containerElement) return;

    containerElement.innerHTML = '';

    if (this.history.length === 0) {
      containerElement.innerHTML = '<div style="color: #666; font-size: 12px; text-align: center;">暂无历史记录</div>';
      return;
    }

    // 创建历史卡片容器
    const historyContainer = document.createElement('div');
    historyContainer.style.display = 'flex';
    historyContainer.style.gap = '6px';
    historyContainer.style.justifyContent = 'center';
    historyContainer.style.flexWrap = 'wrap';
    historyContainer.style.padding = '4px 0';

    this.history.forEach((entry, index) => {
      const card = this.createHistoryCard(entry, index);
      historyContainer.appendChild(card);
    });

    containerElement.appendChild(historyContainer);
  }

  /**
   * 创建历史卡片
   * @param {Object} entry - 历史条目
   * @param {number} index - 索引
   * @returns {HTMLElement} 卡片元素
   */
  createHistoryCard(entry) {
    const card = document.createElement('div');
    card.className = 'history-card';
    card.style.cssText = `
      width: 45px;
      height: 45px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      background: linear-gradient(135deg, rgba(0, 0, 0, 0.7) 0%, rgba(20, 20, 20, 0.7) 100%);
      border: 2px solid ${this.getQualityColor(entry.reward.quality)};
      border-radius: 6px;
      font-size: 18px;
      position: relative;
      box-shadow: 0 0 8px ${this.getQualityColor(entry.reward.quality)};
      transition: transform 0.2s, box-shadow 0.2s;
      cursor: pointer;
    `;

    // 尝试渲染真实图标
    const iconRendered = this.renderItemIcon(card, entry.reward);
    
    // 如果无法渲染真实图标，使用emoji
    if (!iconRendered) {
      card.textContent = entry.reward.icon || '?';
    }

    // 差一点标记
    if (entry.wasNearMiss) {
      const nearMissIndicator = document.createElement('div');
      nearMissIndicator.textContent = '!';
      nearMissIndicator.style.cssText = `
        position: absolute;
        top: -6px;
        right: -6px;
        width: 14px;
        height: 14px;
        background: linear-gradient(135deg, #ff6600 0%, #ff3300 100%);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 9px;
        font-weight: bold;
        color: white;
        box-shadow: 0 0 4px rgba(255, 102, 0, 0.8);
      `;
      card.appendChild(nearMissIndicator);
    }

    // 悬停效果
    card.addEventListener('mouseenter', () => {
      card.style.transform = 'scale(1.15)';
      card.style.boxShadow = `0 0 12px ${this.getQualityColor(entry.reward.quality)}`;
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = 'scale(1)';
      card.style.boxShadow = `0 0 8px ${this.getQualityColor(entry.reward.quality)}`;
    });

    // 点击显示详情
    card.addEventListener('click', () => {
      this.showEntryDetails(entry);
    });

    return card;
  }

  /**
   * 渲染物品图标（使用sprite sheet）
   * @param {HTMLElement} container - 容器元素
   * @param {Object} item - 物品对象
   * @returns {boolean} 是否成功渲染
   */
  renderItemIcon(container, item) {
    console.log('HistoryTracker: 尝试渲染图标', item);
    console.log('  - type:', item.type);
    console.log('  - data:', item.data);
    
    const game = window.game;
    if (!game || !game.loader) {
      console.log('HistoryTracker: game或loader不存在');
      return false;
    }

    // 获取对应的sprite sheet
    let img = null;

    if (item.type === 'equipment') {
      img = game.loader.getImage('ICONS_EQUIP');
      console.log('HistoryTracker: 获取装备图标', img ? '成功' : '失败');
    } else if (item.type === 'consumable') {
      img = game.loader.getImage('ICONS_CONSUMABLES');
      console.log('HistoryTracker: 获取消耗品图标', img ? '成功' : '失败');
    } else if (item.type === 'gem') {
      img = game.loader.getImage('ICONS_GEMS');
      console.log('HistoryTracker: 获取宝石图标', img ? '成功' : '失败');
    } else {
      console.log('HistoryTracker: 物品类型不支持图标渲染:', item.type);
      return false;
    }

    if (!img) {
      console.log('HistoryTracker: 未找到sprite sheet');
      return false;
    }

    // 创建canvas
    const canvas = this.createItemIcon(img, item, 40); // 历史卡片较小，使用40px
    
    if (canvas) {
      container.appendChild(canvas);
      console.log('HistoryTracker: 图标渲染成功');
      return true;
    }

    console.log('HistoryTracker: canvas创建失败');
    return false;
  }

  /**
   * 创建物品图标canvas
   * @param {Image} img - sprite sheet图片
   * @param {Object} item - 物品对象
   * @param {number} size - 图标大小
   * @returns {HTMLCanvasElement|null}
   */
  createItemIcon(img, item, size = 40) {
    if (!img || img.complete === false || img.naturalWidth === 0) {
      return null;
    }

    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    let currentCols = 4;
    let currentRows = 4;

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

    const sx = Math.round(col * cellW);
    const sy = Math.round(row * cellH);
    const sw = Math.round(cellW);
    const sh = Math.round(cellH);

    ctx.imageSmoothingEnabled = false;

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
      return null;
    }
  }

  /**
   * 显示条目详情
   * @param {Object} entry - 历史条目
   */
  showEntryDetails(entry) {
    const timeAgo = this.getTimeAgo(entry.timestamp);
    let message = `${entry.reward.name}\n品质: ${entry.reward.quality}\n时间: ${timeAgo}`;
    
    if (entry.wasNearMiss && entry.missedQuality) {
      message += `\n\n差一点就是 ${entry.missedQuality}！`;
    }

    alert(message);
  }

  /**
   * 获取品质颜色
   * @param {string} quality - 品质
   * @returns {string} 颜色代码
   */
  getQualityColor(quality) {
    const colors = {
      COMMON: '#a0a0a0',
      UNCOMMON: '#5eff00',
      RARE: '#0070dd',
      EPIC: '#a335ee',
      LEGENDARY: '#ff8000',
      JACKPOT: '#ff0000'
    };
    return colors[quality] || '#ffffff';
  }

  /**
   * 获取相对时间
   * @param {number} timestamp - 时间戳
   * @returns {string} 相对时间字符串
   */
  getTimeAgo(timestamp) {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    
    if (seconds < 60) return `${seconds}秒前`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}分钟前`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}小时前`;
    return `${Math.floor(seconds / 86400)}天前`;
  }

  /**
   * 获取历史记录
   * @returns {Array} 历史数组
   */
  getHistory() {
    return [...this.history];
  }

  /**
   * 清除历史
   */
  clear() {
    this.history = [];
  }

  /**
   * 获取统计信息
   * @returns {Object} 统计对象
   */
  getStats() {
    if (this.history.length === 0) {
      return {
        total: 0,
        byQuality: {},
        nearMissCount: 0
      };
    }

    const stats = {
      total: this.history.length,
      byQuality: {},
      nearMissCount: 0
    };

    this.history.forEach(entry => {
      const quality = entry.reward.quality;
      stats.byQuality[quality] = (stats.byQuality[quality] || 0) + 1;
      
      if (entry.wasNearMiss) {
        stats.nearMissCount++;
      }
    });

    return stats;
  }
}
