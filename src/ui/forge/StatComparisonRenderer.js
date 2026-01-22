// StatComparisonRenderer.js - 属性对比渲染器
// 负责渲染装备强化前后的属性对比，使用红色/绿色箭头标识变化

/**
 * StatComparisonRenderer - 属性对比渲染器
 * 显示当前属性和预期属性，用箭头和颜色标识变化
 */
export class StatComparisonRenderer {
  constructor(blacksmithSystem) {
    this.blacksmithSystem = blacksmithSystem;
    this.container = null;
  }

  /**
   * 渲染属性对比
   * @param {HTMLElement} container - 容器元素
   * @param {Object} item - 装备对象
   */
  render(container, item) {
    if (!container) return;

    this.container = container;
    container.innerHTML = '';

    if (!item) {
      container.innerHTML = '<p class="stats-comparison-placeholder">请选择装备</p>';
      return;
    }

    // 获取当前属性和下一级属性
    const currentStats = item.stats || {};
    const nextLevelStats = this.calculateNextLevelStats(item);

    // 创建对比表格
    const comparison = document.createElement('div');
    comparison.className = 'stats-comparison';

    // 标题行
    const header = document.createElement('div');
    header.className = 'stats-comparison-header';
    header.innerHTML = `
      <div class="stats-comparison-title">
        <span class="current-title">当前 (+${item.enhanceLevel || 0})</span>
        <span class="arrow-separator">→</span>
        <span class="next-title">下一级 (+${(item.enhanceLevel || 0) + 1})</span>
      </div>
    `;
    comparison.appendChild(header);

    // 属性行
    const statsContainer = document.createElement('div');
    statsContainer.className = 'stats-comparison-rows';

    // 遍历所有属性
    const allStats = new Set([
      ...Object.keys(currentStats),
      ...Object.keys(nextLevelStats)
    ]);

    for (const statKey of allStats) {
      const currentValue = currentStats[statKey] || 0;
      const nextValue = nextLevelStats[statKey] || 0;
      const difference = nextValue - currentValue;

      const row = this.createStatRow(statKey, currentValue, nextValue, difference);
      statsContainer.appendChild(row);
    }

    comparison.appendChild(statsContainer);

    // 总结信息
    const summary = this.createSummary(item);
    comparison.appendChild(summary);

    container.appendChild(comparison);
  }

  /**
   * 计算下一级属性
   * @param {Object} item - 装备对象
   * @returns {Object} 下一级属性
   */
  calculateNextLevelStats(item) {
    if (!item || !item.stats) return {};

    // 强化提升10%
    const multiplier = 1.1;
    const nextStats = {};

    for (const [key, value] of Object.entries(item.stats)) {
      if (this.isPercentageStat(key)) {
        // 百分比属性保留2位小数
        nextStats[key] = Math.round(value * multiplier * 100) / 100;
      } else {
        // 整数属性向下取整
        nextStats[key] = Math.floor(value * multiplier);
      }
    }

    return nextStats;
  }

  /**
   * 创建属性行
   * @param {string} statKey - 属性键
   * @param {number} currentValue - 当前值
   * @param {number} nextValue - 下一级值
   * @param {number} difference - 差值
   * @returns {HTMLElement}
   */
  createStatRow(statKey, currentValue, nextValue, difference) {
    const row = document.createElement('div');
    row.className = 'stat-comparison-row';

    // 属性名称
    const label = document.createElement('div');
    label.className = 'stat-comparison-label';
    label.textContent = this.getStatLabel(statKey);
    row.appendChild(label);

    // 当前值
    const current = document.createElement('div');
    current.className = 'stat-comparison-current';
    current.textContent = this.formatStatValue(statKey, currentValue);
    row.appendChild(current);

    // 箭头和变化
    const arrow = document.createElement('div');
    arrow.className = 'stat-comparison-arrow';
    
    if (difference > 0) {
      arrow.classList.add('positive');
      arrow.innerHTML = `
        <span class="arrow-icon">↑</span>
        <span class="arrow-value">+${this.formatStatValue(statKey, difference)}</span>
      `;
    } else if (difference < 0) {
      arrow.classList.add('negative');
      arrow.innerHTML = `
        <span class="arrow-icon">↓</span>
        <span class="arrow-value">${this.formatStatValue(statKey, difference)}</span>
      `;
    } else {
      arrow.classList.add('neutral');
      arrow.innerHTML = '<span class="arrow-icon">→</span>';
    }
    
    row.appendChild(arrow);

    // 下一级值
    const next = document.createElement('div');
    next.className = 'stat-comparison-next';
    next.textContent = this.formatStatValue(statKey, nextValue);
    
    if (difference > 0) {
      next.classList.add('positive');
    } else if (difference < 0) {
      next.classList.add('negative');
    }
    
    row.appendChild(next);

    // 变化百分比
    const percentage = this.calculatePercentageChange(currentValue, nextValue);
    const percentageLabel = document.createElement('div');
    percentageLabel.className = 'stat-comparison-percentage';
    
    if (percentage > 0) {
      percentageLabel.classList.add('positive');
      percentageLabel.textContent = `+${percentage.toFixed(1)}%`;
    } else if (percentage < 0) {
      percentageLabel.classList.add('negative');
      percentageLabel.textContent = `${percentage.toFixed(1)}%`;
    } else {
      percentageLabel.textContent = '0%';
    }
    
    row.appendChild(percentageLabel);

    return row;
  }

  /**
   * 创建总结信息
   * @param {Object} item - 装备对象
   * @returns {HTMLElement}
   */
  createSummary(item) {
    const summary = document.createElement('div');
    summary.className = 'stats-comparison-summary';

    const currentLevel = item.enhanceLevel || 0;
    const nextLevel = currentLevel + 1;

    summary.innerHTML = `
      <div class="summary-item">
        <span class="summary-label">强化等级:</span>
        <span class="summary-value">+${currentLevel} → +${nextLevel}</span>
      </div>
      <div class="summary-item">
        <span class="summary-label">属性提升:</span>
        <span class="summary-value positive">+10%</span>
      </div>
      <div class="summary-item">
        <span class="summary-label">强化费用:</span>
        <span class="summary-value">${this.blacksmithSystem.calculateEnhanceCost(item)} 金币</span>
      </div>
    `;

    return summary;
  }

  /**
   * 计算百分比变化
   * @param {number} oldValue - 旧值
   * @param {number} newValue - 新值
   * @returns {number} 百分比变化
   */
  calculatePercentageChange(oldValue, newValue) {
    if (oldValue === 0) return newValue > 0 ? 100 : 0;
    return ((newValue - oldValue) / oldValue) * 100;
  }

  /**
   * 判断是否为百分比属性
   * @param {string} key - 属性键
   * @returns {boolean}
   */
  isPercentageStat(key) {
    return key.includes('rate') || 
           key.includes('dodge') || 
           key.includes('pen') || 
           key.includes('gold') || 
           key.includes('lifesteal');
  }

  /**
   * 获取属性标签
   * @param {string} key - 属性键
   * @returns {string}
   */
  getStatLabel(key) {
    const labelMap = {
      'attack': '攻击力',
      'defense': '防御力',
      'hp': '生命值',
      'crit_rate': '暴击率',
      'crit_damage': '暴击伤害',
      'dodge': '闪避率',
      'lifesteal': '生命偷取',
      'speed': '速度',
      'armor_pen': '护甲穿透'
    };
    return labelMap[key] || key;
  }

  /**
   * 格式化属性值
   * @param {string} key - 属性键
   * @param {number} value - 属性值
   * @returns {string}
   */
  formatStatValue(key, value) {
    if (this.isPercentageStat(key)) {
      return `${(value * 100).toFixed(1)}%`;
    }
    return Math.floor(value).toString();
  }

  /**
   * 更新显示
   * @param {Object} item - 装备对象
   */
  update(item) {
    if (this.container) {
      this.render(this.container, item);
    }
  }

  /**
   * 销毁渲染器
   */
  destroy() {
    this.container = null;
  }
}
