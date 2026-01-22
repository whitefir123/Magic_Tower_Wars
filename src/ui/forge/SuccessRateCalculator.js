// SuccessRateCalculator.js - 成功率计算器
// 负责计算强化成功率，并提供可视化显示

/**
 * SuccessRateCalculator - 成功率计算器
 * 计算装备强化成功率，考虑等级、材料加成等因素
 */
export class SuccessRateCalculator {
  constructor(blacksmithSystem) {
    this.blacksmithSystem = blacksmithSystem;
    
    // 基础成功率配置
    this.baseRates = {
      0: 1.0,   // +0 -> +1: 100%
      1: 1.0,   // +1 -> +2: 100%
      2: 1.0,   // +2 -> +3: 100%
      3: 1.0,   // +3 -> +4: 100%
      4: 1.0,   // +4 -> +5: 100%
      5: 1.0,   // +5 -> +6: 100%
      6: 1.0,   // +6 -> +7: 100%
      7: 1.0,   // +7 -> +8: 100%
      8: 1.0,   // +8 -> +9: 100%
      9: 1.0,   // +9 -> +10: 100%
      10: 0.7,  // +10 -> +11: 70%
      11: 0.6,  // +11 -> +12: 60%
      12: 0.5,  // +12 -> +13: 50%
      13: 0.4,  // +13 -> +14: 40%
      14: 0.3   // +14 -> +15: 30%
    };
    
    // 材料加成配置
    this.materialBonuses = {
      blessing_stone: 0.05,  // 每个祝福石 +5%
      lucky_stone: 0.03      // 每个幸运石 +3%
    };
    
    // 容器元素
    this.container = null;
  }

  /**
   * 计算成功率
   * @param {Object} item - 装备对象
   * @param {Object} materials - 材料对象 {blessingStoneCount, luckyStoneCount}
   * @returns {number} 成功率 (0-1)
   */
  calculate(item, materials = {}) {
    if (!item) return 0;

    const currentLevel = item.enhanceLevel || 0;
    
    // 获取基础成功率
    let rate = this.baseRates[currentLevel] || 0;
    
    // 应用祝福石加成
    if (materials.blessingStoneCount) {
      rate += materials.blessingStoneCount * this.materialBonuses.blessing_stone;
    }
    
    // 应用幸运石加成
    if (materials.luckyStoneCount) {
      rate += materials.luckyStoneCount * this.materialBonuses.lucky_stone;
    }
    
    // 限制在 0-1 范围内
    return Math.min(1.0, Math.max(0, rate));
  }

  /**
   * 渲染成功率显示
   * @param {HTMLElement} container - 容器元素
   * @param {Object} item - 装备对象
   * @param {Object} materials - 材料对象
   */
  render(container, item, materials = {}) {
    if (!container) return;

    this.container = container;
    container.innerHTML = '';

    if (!item) {
      container.innerHTML = '<p class="success-rate-placeholder">请选择装备</p>';
      return;
    }

    const rate = this.calculate(item, materials);
    const percentage = (rate * 100).toFixed(1);

    // 创建成功率显示
    const display = document.createElement('div');
    display.className = 'success-rate-display';

    // 成功率数值
    const rateValue = document.createElement('div');
    rateValue.className = `success-rate-value ${this.getRateClass(rate)}`;
    rateValue.textContent = `${percentage}%`;
    display.appendChild(rateValue);

    // 成功率标签
    const rateLabel = document.createElement('div');
    rateLabel.className = 'success-rate-label';
    rateLabel.textContent = this.getRateLabel(rate);
    display.appendChild(rateLabel);

    // 进度条
    const progressBar = this.createProgressBar(rate);
    display.appendChild(progressBar);

    // 详细信息
    const details = this.createDetails(item, materials, rate);
    display.appendChild(details);

    container.appendChild(display);
  }

  /**
   * 创建进度条
   * @param {number} rate - 成功率 (0-1)
   * @returns {HTMLElement}
   */
  createProgressBar(rate) {
    const container = document.createElement('div');
    container.className = 'success-rate-progress-container';

    const bar = document.createElement('div');
    bar.className = 'success-rate-progress-bar';

    const fill = document.createElement('div');
    fill.className = `success-rate-progress-fill ${this.getRateClass(rate)}`;
    fill.style.width = `${rate * 100}%`;

    bar.appendChild(fill);
    container.appendChild(bar);

    return container;
  }

  /**
   * 创建详细信息
   * @param {Object} item - 装备对象
   * @param {Object} materials - 材料对象
   * @param {number} finalRate - 最终成功率
   * @returns {HTMLElement}
   */
  createDetails(item, materials, finalRate) {
    const details = document.createElement('div');
    details.className = 'success-rate-details';

    const currentLevel = item.enhanceLevel || 0;
    const baseRate = this.baseRates[currentLevel] || 0;

    // 基础成功率
    const baseRow = document.createElement('div');
    baseRow.className = 'success-rate-detail-row';
    baseRow.innerHTML = `
      <span class="detail-label">基础成功率:</span>
      <span class="detail-value">${(baseRate * 100).toFixed(1)}%</span>
    `;
    details.appendChild(baseRow);

    // 祝福石加成
    if (materials.blessingStoneCount > 0) {
      const bonus = materials.blessingStoneCount * this.materialBonuses.blessing_stone;
      const blessingRow = document.createElement('div');
      blessingRow.className = 'success-rate-detail-row bonus';
      blessingRow.innerHTML = `
        <span class="detail-label">祝福石加成 (×${materials.blessingStoneCount}):</span>
        <span class="detail-value positive">+${(bonus * 100).toFixed(1)}%</span>
      `;
      details.appendChild(blessingRow);
    }

    // 幸运石加成
    if (materials.luckyStoneCount > 0) {
      const bonus = materials.luckyStoneCount * this.materialBonuses.lucky_stone;
      const luckyRow = document.createElement('div');
      luckyRow.className = 'success-rate-detail-row bonus';
      luckyRow.innerHTML = `
        <span class="detail-label">幸运石加成 (×${materials.luckyStoneCount}):</span>
        <span class="detail-value positive">+${(bonus * 100).toFixed(1)}%</span>
      `;
      details.appendChild(luckyRow);
    }

    // 分割线
    if (materials.blessingStoneCount > 0 || materials.luckyStoneCount > 0) {
      const divider = document.createElement('div');
      divider.className = 'success-rate-divider';
      details.appendChild(divider);
    }

    // 最终成功率
    const finalRow = document.createElement('div');
    finalRow.className = 'success-rate-detail-row final';
    finalRow.innerHTML = `
      <span class="detail-label">最终成功率:</span>
      <span class="detail-value ${this.getRateClass(finalRate)}">${(finalRate * 100).toFixed(1)}%</span>
    `;
    details.appendChild(finalRow);

    // 保护卷轴提示
    if (materials.useProtectionScroll) {
      const protectionHint = document.createElement('div');
      protectionHint.className = 'success-rate-hint protection';
      protectionHint.innerHTML = '📜 使用保护卷轴：失败时不会降级';
      details.appendChild(protectionHint);
    }

    return details;
  }

  /**
   * 获取成功率对应的CSS类
   * @param {number} rate - 成功率 (0-1)
   * @returns {string}
   */
  getRateClass(rate) {
    if (rate >= 0.8) return 'rate-high';
    if (rate >= 0.5) return 'rate-medium';
    if (rate >= 0.3) return 'rate-low';
    return 'rate-very-low';
  }

  /**
   * 获取成功率标签
   * @param {number} rate - 成功率 (0-1)
   * @returns {string}
   */
  getRateLabel(rate) {
    if (rate >= 0.8) return '成功率很高';
    if (rate >= 0.5) return '成功率中等';
    if (rate >= 0.3) return '成功率较低';
    return '成功率很低';
  }

  /**
   * 更新显示
   * @param {Object} item - 装备对象
   * @param {Object} materials - 材料对象
   */
  update(item, materials = {}) {
    if (this.container) {
      this.render(this.container, item, materials);
    }
  }

  /**
   * 销毁计算器
   */
  destroy() {
    this.container = null;
  }
}
