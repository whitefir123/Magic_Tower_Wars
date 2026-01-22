/**
 * BatchOperationPanel - 批量操作面板
 * 
 * 支持批量强化和批量拆解装备
 * 显示预计消耗、实时进度和汇总结果
 */

export class BatchOperationPanel {
  constructor(forgeUI) {
    this.forgeUI = forgeUI;
    this.isProcessing = false;
    this.currentOperation = null;
    this.results = [];
  }

  /**
   * 渲染批量操作面板
   * @param {string} mode - 操作模式 ('enhance' 或 'dismantle')
   * @returns {string} HTML字符串
   */
  render(mode = 'enhance') {
    if (mode === 'enhance') {
      return this.renderBatchEnhancePanel();
    } else if (mode === 'dismantle') {
      return this.renderBatchDismantlePanel();
    }
    return '';
  }

  /**
   * 渲染批量强化面板
   * @returns {string} HTML字符串
   */
  renderBatchEnhancePanel() {
    const player = this.forgeUI.player;
    if (!player) return '';

    // 获取所有可强化的装备
    const enhanceableItems = this.getEnhanceableItems();
    
    if (enhanceableItems.length === 0) {
      return `
        <div class="detail-section">
          <h4>批量强化</h4>
          <p class="forge-placeholder">没有可强化的装备</p>
        </div>
      `;
    }

    // 计算预计消耗
    const estimate = this.calculateEnhanceEstimate(enhanceableItems);

    return `
      <div class="detail-section">
        <h4>批量强化</h4>
        <p style="color: #aaa; font-size: 14px; margin-bottom: 15px;">
          一键强化所有可强化的装备，节省时间。
        </p>
      </div>

      <div class="detail-section">
        <h4>装备列表 <small style="color: #888;">(${enhanceableItems.length} 件)</small></h4>
        <div class="batch-item-list" id="batch-enhance-list">
          ${this.renderBatchItemList(enhanceableItems, 'enhance')}
        </div>
      </div>

      <div class="detail-section">
        <h4>预计消耗</h4>
        <div class="stat-row">
          <span class="stat-label">金币:</span>
          <span class="stat-value" style="color: ${player.stats.gold >= estimate.totalCost ? '#4caf50' : '#e74c3c'};">
            ${estimate.totalCost} / ${player.stats.gold}
          </span>
        </div>
        <div class="stat-row">
          <span class="stat-label">预计时间:</span>
          <span class="stat-value">${estimate.estimatedTime}秒</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">平均成功率:</span>
          <span class="stat-value">${(estimate.avgSuccessRate * 100).toFixed(1)}%</span>
        </div>
      </div>

      <div class="detail-section" id="batch-progress-section" style="display: none;">
        <h4>进度</h4>
        <div class="batch-progress-bar">
          <div class="batch-progress-fill" id="batch-progress-fill" style="width: 0%;"></div>
        </div>
        <div class="batch-progress-text" id="batch-progress-text">0 / ${enhanceableItems.length}</div>
      </div>

      <div class="detail-section" id="batch-result-section" style="display: none;">
        <h4>结果汇总</h4>
        <div id="batch-result-content"></div>
      </div>

      <div class="forge-actions">
        <button class="forge-btn forge-btn-enhance" id="batch-enhance-btn" 
          ${player.stats.gold < estimate.totalCost || this.isProcessing ? 'disabled' : ''}>
          ${this.isProcessing ? '处理中...' : '开始批量强化'}
        </button>
        <button class="forge-btn forge-btn-secondary" id="batch-cancel-btn" 
          ${!this.isProcessing ? 'disabled' : ''}>
          取消
        </button>
      </div>
    `;
  }

  /**
   * 渲染批量拆解面板
   * @returns {string} HTML字符串
   */
  renderBatchDismantlePanel() {
    const player = this.forgeUI.player;
    if (!player) return '';

    // 获取所有可拆解的装备（背包中的装备）
    const dismantleableItems = this.getDismantleableItems();
    
    if (dismantleableItems.length === 0) {
      return `
        <div class="detail-section">
          <h4>批量拆解</h4>
          <p class="forge-placeholder">背包中没有可拆解的装备</p>
        </div>
      `;
    }

    // 计算预计收益
    const estimate = this.calculateDismantleEstimate(dismantleableItems);

    return `
      <div class="detail-section">
        <h4>批量拆解</h4>
        <p style="color: #aaa; font-size: 14px; margin-bottom: 15px;">
          一键拆解背包中的装备，快速获取金币。
          <br><span style="color: #ff5722;">警告：此操作无法撤销！</span>
        </p>
      </div>

      <div class="detail-section">
        <h4>装备列表 <small style="color: #888;">(${dismantleableItems.length} 件)</small></h4>
        <div class="batch-item-list" id="batch-dismantle-list">
          ${this.renderBatchItemList(dismantleableItems, 'dismantle')}
        </div>
      </div>

      <div class="detail-section">
        <h4>预计收益</h4>
        <div class="stat-row">
          <span class="stat-label">总金币:</span>
          <span class="stat-value" style="color: #ffd700;">${estimate.totalValue}</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">预计时间:</span>
          <span class="stat-value">${estimate.estimatedTime}秒</span>
        </div>
      </div>

      <div class="detail-section" id="batch-progress-section" style="display: none;">
        <h4>进度</h4>
        <div class="batch-progress-bar">
          <div class="batch-progress-fill" id="batch-progress-fill" style="width: 0%;"></div>
        </div>
        <div class="batch-progress-text" id="batch-progress-text">0 / ${dismantleableItems.length}</div>
      </div>

      <div class="detail-section" id="batch-result-section" style="display: none;">
        <h4>结果汇总</h4>
        <div id="batch-result-content"></div>
      </div>

      <div class="forge-actions">
        <button class="forge-btn forge-btn-dismantle" id="batch-dismantle-btn" 
          ${this.isProcessing ? 'disabled' : ''}>
          ${this.isProcessing ? '处理中...' : '开始批量拆解'}
        </button>
        <button class="forge-btn forge-btn-secondary" id="batch-cancel-btn" 
          ${!this.isProcessing ? 'disabled' : ''}>
          取消
        </button>
      </div>
    `;
  }

  /**
   * 渲染批量操作装备列表
   * @param {Array} items - 装备列表
   * @param {string} mode - 操作模式
   * @returns {string} HTML字符串
   */
  renderBatchItemList(items, mode) {
    return items.map((item, index) => {
      const itemName = this.forgeUI.blacksmithSystem.getItemDisplayName(item);
      const itemColor = this.forgeUI.blacksmithSystem.getItemQualityColor(item);
      const enhanceLevel = item.enhanceLevel || 0;
      
      let infoText = '';
      if (mode === 'enhance') {
        const details = this.forgeUI.blacksmithSystem.getItemDetails(item);
        infoText = `+${enhanceLevel} → +${enhanceLevel + 1} (${details.enhanceCost} 金币)`;
      } else {
        const value = this.forgeUI.blacksmithSystem.calculateDismantleValue(item);
        infoText = `+${enhanceLevel} (${value} 金币)`;
      }
      
      return `
        <div class="batch-item-card" data-index="${index}">
          <div class="batch-item-name" style="color: ${itemColor};">${itemName}</div>
          <div class="batch-item-info">${infoText}</div>
        </div>
      `;
    }).join('');
  }

  /**
   * 获取所有可强化的装备
   * @returns {Array} 装备列表
   */
  getEnhanceableItems() {
    const player = this.forgeUI.player;
    if (!player) return [];

    const items = [];
    
    // 已装备的装备
    if (player.equipment) {
      Object.values(player.equipment).forEach(item => {
        if (item && this.canEnhance(item)) {
          items.push(item);
        }
      });
    }
    
    // 背包中的装备
    if (player.inventory) {
      player.inventory.forEach(item => {
        if (item && item.type !== 'CONSUMABLE' && this.canEnhance(item)) {
          items.push(item);
        }
      });
    }
    
    return items;
  }

  /**
   * 获取所有可拆解的装备（仅背包）
   * @returns {Array} 装备列表
   */
  getDismantleableItems() {
    const player = this.forgeUI.player;
    if (!player || !player.inventory) return [];

    return player.inventory.filter(item => 
      item && item.type !== 'CONSUMABLE' && item.type !== 'GEM'
    );
  }

  /**
   * 检查装备是否可强化
   * @param {Object} item - 装备对象
   * @returns {boolean} 是否可强化
   */
  canEnhance(item) {
    const details = this.forgeUI.blacksmithSystem.getItemDetails(item);
    return details.canEnhance;
  }

  /**
   * 计算批量强化预估
   * @param {Array} items - 装备列表
   * @returns {Object} 预估数据
   */
  calculateEnhanceEstimate(items) {
    let totalCost = 0;
    let totalSuccessRate = 0;
    
    items.forEach(item => {
      const details = this.forgeUI.blacksmithSystem.getItemDetails(item);
      totalCost += details.enhanceCost || 0;
      totalSuccessRate += details.successRate || 0;
    });
    
    const avgSuccessRate = items.length > 0 ? totalSuccessRate / items.length : 0;
    const estimatedTime = Math.ceil(items.length * 0.5); // 每件装备0.5秒
    
    return {
      totalCost,
      avgSuccessRate,
      estimatedTime
    };
  }

  /**
   * 计算批量拆解预估
   * @param {Array} items - 装备列表
   * @returns {Object} 预估数据
   */
  calculateDismantleEstimate(items) {
    let totalValue = 0;
    
    items.forEach(item => {
      totalValue += this.forgeUI.blacksmithSystem.calculateDismantleValue(item);
    });
    
    const estimatedTime = Math.ceil(items.length * 0.3); // 每件装备0.3秒
    
    return {
      totalValue,
      estimatedTime
    };
  }

  /**
   * 执行批量强化
   */
  async executeBatchEnhance() {
    if (this.isProcessing) return;
    
    const items = this.getEnhanceableItems();
    if (items.length === 0) return;
    
    this.isProcessing = true;
    this.currentOperation = 'enhance';
    this.results = [];
    
    // 显示进度区域
    const progressSection = document.getElementById('batch-progress-section');
    const resultSection = document.getElementById('batch-result-section');
    if (progressSection) progressSection.style.display = 'block';
    if (resultSection) resultSection.style.display = 'none';
    
    // 逐个处理装备
    for (let i = 0; i < items.length; i++) {
      if (!this.isProcessing) break; // 用户取消
      
      const item = items[i];
      const result = this.forgeUI.blacksmithSystem.enhanceItem(item, this.forgeUI.player);
      
      this.results.push({
        item,
        success: result.success,
        message: result.message
      });
      
      // 更新进度
      this.updateProgress(i + 1, items.length);
      
      // 延迟以显示动画
      await this.delay(500);
    }
    
    // 显示结果
    this.showBatchResults();
    
    // 刷新UI
    this.forgeUI.renderItemList();
    
    // 触发自动保存
    if (this.forgeUI.autoSave) {
      this.forgeUI.autoSave.save();
    }
    
    this.isProcessing = false;
  }

  /**
   * 执行批量拆解
   */
  async executeBatchDismantle() {
    if (this.isProcessing) return;
    
    const items = this.getDismantleableItems();
    if (items.length === 0) return;
    
    // 确认操作
    if (!confirm(`确定要拆解 ${items.length} 件装备吗？\n此操作无法撤销！`)) {
      return;
    }
    
    this.isProcessing = true;
    this.currentOperation = 'dismantle';
    this.results = [];
    
    // 显示进度区域
    const progressSection = document.getElementById('batch-progress-section');
    const resultSection = document.getElementById('batch-result-section');
    if (progressSection) progressSection.style.display = 'block';
    if (resultSection) resultSection.style.display = 'none';
    
    // 逐个处理装备
    for (let i = 0; i < items.length; i++) {
      if (!this.isProcessing) break; // 用户取消
      
      const item = items[i];
      const result = this.forgeUI.blacksmithSystem.dismantleItem(item, this.forgeUI.player);
      
      this.results.push({
        item,
        success: result.success,
        value: result.value || 0,
        message: result.message
      });
      
      // 更新进度
      this.updateProgress(i + 1, items.length);
      
      // 延迟以显示动画
      await this.delay(300);
    }
    
    // 显示结果
    this.showBatchResults();
    
    // 刷新UI
    this.forgeUI.renderItemList();
    
    // 触发自动保存
    if (this.forgeUI.autoSave) {
      this.forgeUI.autoSave.save();
    }
    
    this.isProcessing = false;
  }

  /**
   * 更新进度显示
   * @param {number} current - 当前进度
   * @param {number} total - 总数
   */
  updateProgress(current, total) {
    const progressFill = document.getElementById('batch-progress-fill');
    const progressText = document.getElementById('batch-progress-text');
    
    if (progressFill) {
      const percentage = (current / total) * 100;
      progressFill.style.width = `${percentage}%`;
    }
    
    if (progressText) {
      progressText.textContent = `${current} / ${total}`;
    }
  }

  /**
   * 显示批量操作结果
   */
  showBatchResults() {
    const resultSection = document.getElementById('batch-result-section');
    const resultContent = document.getElementById('batch-result-content');
    
    if (!resultSection || !resultContent) return;
    
    resultSection.style.display = 'block';
    
    if (this.currentOperation === 'enhance') {
      const successCount = this.results.filter(r => r.success).length;
      const failCount = this.results.length - successCount;
      
      resultContent.innerHTML = `
        <div class="stat-row">
          <span class="stat-label">总计:</span>
          <span class="stat-value">${this.results.length} 件</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">成功:</span>
          <span class="stat-value" style="color: #4caf50;">${successCount} 件</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">失败:</span>
          <span class="stat-value" style="color: #e74c3c;">${failCount} 件</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">成功率:</span>
          <span class="stat-value">${((successCount / this.results.length) * 100).toFixed(1)}%</span>
        </div>
      `;
    } else if (this.currentOperation === 'dismantle') {
      const totalValue = this.results.reduce((sum, r) => sum + (r.value || 0), 0);
      
      resultContent.innerHTML = `
        <div class="stat-row">
          <span class="stat-label">拆解数量:</span>
          <span class="stat-value">${this.results.length} 件</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">获得金币:</span>
          <span class="stat-value" style="color: #ffd700;">${totalValue}</span>
        </div>
      `;
    }
  }

  /**
   * 取消批量操作
   */
  cancelBatchOperation() {
    this.isProcessing = false;
    this.currentOperation = null;
  }

  /**
   * 延迟函数
   * @param {number} ms - 延迟毫秒数
   * @returns {Promise}
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 绑定事件监听器
   */
  bindEvents() {
    const enhanceBtn = document.getElementById('batch-enhance-btn');
    const dismantleBtn = document.getElementById('batch-dismantle-btn');
    const cancelBtn = document.getElementById('batch-cancel-btn');
    
    if (enhanceBtn) {
      enhanceBtn.addEventListener('click', () => this.executeBatchEnhance());
    }
    
    if (dismantleBtn) {
      dismantleBtn.addEventListener('click', () => this.executeBatchDismantle());
    }
    
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => this.cancelBatchOperation());
    }
  }

  /**
   * 清理资源
   */
  cleanup() {
    this.isProcessing = false;
    this.currentOperation = null;
    this.results = [];
  }
}
