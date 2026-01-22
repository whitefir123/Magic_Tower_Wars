/**
 * ForgeHistoryTracker - 铁匠铺操作历史记录器
 * 
 * 记录所有强化、重铸、镶嵌、拆解等操作的历史
 * 支持筛选、搜索和导出功能
 */

export class ForgeHistoryTracker {
  constructor(forgeUI) {
    this.forgeUI = forgeUI;
    this.history = [];
    this.maxRecords = 100; // 最多保留100条记录
    this.historyPanel = null;
    
    // 从localStorage加载历史记录
    this.loadHistory();
  }

  /**
   * 记录操作
   * @param {string} type - 操作类型 (enhance, reforge, socket, unsocket, synthesis, dismantle)
   * @param {Object} data - 操作数据
   */
  record(type, data) {
    const record = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: type,
      timestamp: Date.now(),
      date: new Date().toLocaleString('zh-CN'),
      ...data
    };
    
    // 添加到历史记录开头
    this.history.unshift(record);
    
    // 限制记录数量
    if (this.history.length > this.maxRecords) {
      this.history = this.history.slice(0, this.maxRecords);
    }
    
    // 保存到localStorage
    this.saveHistory();
    
    console.log('✓ 记录操作:', record);
  }

  /**
   * 记录强化操作
   */
  recordEnhance(item, success, cost, fromLevel, toLevel) {
    this.record('enhance', {
      itemName: item.displayName || item.name,
      itemId: item.itemId || item.id,
      quality: item.quality,
      success: success,
      cost: cost,
      fromLevel: fromLevel,
      toLevel: toLevel
    });
  }

  /**
   * 记录重铸操作
   */
  recordReforge(item, cost, fromQuality, toQuality) {
    this.record('reforge', {
      itemName: item.displayName || item.name,
      itemId: item.itemId || item.id,
      cost: cost,
      fromQuality: fromQuality,
      toQuality: toQuality
    });
  }

  /**
   * 记录宝石镶嵌操作
   */
  recordSocket(item, gem, socketIndex, cost) {
    this.record('socket', {
      itemName: item.displayName || item.name,
      itemId: item.itemId || item.id,
      gemName: gem.nameZh || gem.name,
      gemId: gem.itemId || gem.id,
      socketIndex: socketIndex,
      cost: cost || 0
    });
  }

  /**
   * 记录宝石拆除操作
   */
  recordUnsocket(item, gem, socketIndex, cost) {
    this.record('unsocket', {
      itemName: item.displayName || item.name,
      itemId: item.itemId || item.id,
      gemName: gem.nameZh || gem.name,
      gemId: gem.itemId || gem.id,
      socketIndex: socketIndex,
      cost: cost
    });
  }

  /**
   * 记录宝石合成操作
   */
  recordSynthesis(fromGem, toGem, count) {
    this.record('synthesis', {
      fromGemName: fromGem.nameZh || fromGem.name,
      fromGemId: fromGem.itemId || fromGem.id,
      toGemName: toGem.nameZh || toGem.name,
      toGemId: toGem.itemId || toGem.id,
      count: count
    });
  }

  /**
   * 记录装备拆解操作
   */
  recordDismantle(item, value) {
    this.record('dismantle', {
      itemName: item.displayName || item.name,
      itemId: item.itemId || item.id,
      quality: item.quality,
      enhanceLevel: item.enhanceLevel || 0,
      value: value
    });
  }

  /**
   * 获取历史记录
   * @param {Object} filters - 筛选条件
   * @returns {Array} 筛选后的历史记录
   */
  getHistory(filters = {}) {
    let filtered = [...this.history];
    
    // 按类型筛选
    if (filters.type && filters.type !== 'all') {
      filtered = filtered.filter(record => record.type === filters.type);
    }
    
    // 按装备筛选
    if (filters.itemId) {
      filtered = filtered.filter(record => record.itemId === filters.itemId);
    }
    
    // 按时间范围筛选
    if (filters.startDate) {
      const startTime = new Date(filters.startDate).getTime();
      filtered = filtered.filter(record => record.timestamp >= startTime);
    }
    
    if (filters.endDate) {
      const endTime = new Date(filters.endDate).getTime();
      filtered = filtered.filter(record => record.timestamp <= endTime);
    }
    
    // 按成功/失败筛选（仅强化）
    if (filters.success !== undefined && filters.type === 'enhance') {
      filtered = filtered.filter(record => record.success === filters.success);
    }
    
    return filtered;
  }

  /**
   * 显示历史记录面板
   */
  showHistoryPanel() {
    if (this.historyPanel) {
      this.historyPanel.remove();
    }
    
    this.historyPanel = document.createElement('div');
    this.historyPanel.className = 'history-panel-modal';
    this.historyPanel.innerHTML = `
      <div class="history-panel-content">
        <div class="history-panel-header">
          <h3>操作历史</h3>
          <button class="history-panel-close">×</button>
        </div>
        
        <div class="history-filters">
          <select id="history-type-filter" class="history-filter-select">
            <option value="all">全部操作</option>
            <option value="enhance">强化</option>
            <option value="reforge">重铸</option>
            <option value="socket">镶嵌</option>
            <option value="unsocket">拆除</option>
            <option value="synthesis">合成</option>
            <option value="dismantle">拆解</option>
          </select>
          
          <button id="history-clear-btn" class="history-action-btn">清空历史</button>
          <button id="history-export-btn" class="history-action-btn">导出</button>
        </div>
        
        <div class="history-list" id="history-list">
          ${this.renderHistoryList()}
        </div>
        
        <div class="history-stats">
          <div class="history-stat-item">
            <span class="stat-label">总操作数:</span>
            <span class="stat-value">${this.history.length}</span>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(this.historyPanel);
    
    // 绑定事件
    this.bindHistoryPanelEvents();
  }

  /**
   * 渲染历史记录列表
   */
  renderHistoryList(filters = {}) {
    const records = this.getHistory(filters);
    
    if (records.length === 0) {
      return '<div class="history-empty">暂无历史记录</div>';
    }
    
    return records.map(record => this.renderHistoryRecord(record)).join('');
  }

  /**
   * 渲染单条历史记录
   */
  renderHistoryRecord(record) {
    const typeLabels = {
      enhance: '强化',
      reforge: '重铸',
      socket: '镶嵌',
      unsocket: '拆除',
      synthesis: '合成',
      dismantle: '拆解'
    };
    
    const typeIcons = {
      enhance: '⚒️',
      reforge: '🔄',
      socket: '💎',
      unsocket: '🔓',
      synthesis: '🔮',
      dismantle: '🔨'
    };
    
    const typeLabel = typeLabels[record.type] || record.type;
    const typeIcon = typeIcons[record.type] || '📝';
    
    let detailsHtml = '';
    
    switch (record.type) {
      case 'enhance':
        const statusClass = record.success ? 'success' : 'failure';
        const statusText = record.success ? '成功' : '失败';
        detailsHtml = `
          <div class="record-item-name">${record.itemName}</div>
          <div class="record-details">
            <span class="record-status ${statusClass}">${statusText}</span>
            <span>+${record.fromLevel} → +${record.toLevel}</span>
            <span class="record-cost">-${record.cost} 金币</span>
          </div>
        `;
        break;
        
      case 'reforge':
        detailsHtml = `
          <div class="record-item-name">${record.itemName}</div>
          <div class="record-details">
            <span>${record.fromQuality} → ${record.toQuality}</span>
            <span class="record-cost">-${record.cost} 金币</span>
          </div>
        `;
        break;
        
      case 'socket':
        detailsHtml = `
          <div class="record-item-name">${record.itemName}</div>
          <div class="record-details">
            <span>镶嵌 ${record.gemName}</span>
            <span>槽位 ${record.socketIndex + 1}</span>
            ${record.cost > 0 ? `<span class="record-cost">-${record.cost} 金币</span>` : ''}
          </div>
        `;
        break;
        
      case 'unsocket':
        detailsHtml = `
          <div class="record-item-name">${record.itemName}</div>
          <div class="record-details">
            <span>拆除 ${record.gemName}</span>
            <span>槽位 ${record.socketIndex + 1}</span>
            <span class="record-cost">-${record.cost} 金币</span>
          </div>
        `;
        break;
        
      case 'synthesis':
        detailsHtml = `
          <div class="record-item-name">${record.fromGemName} × ${record.count}</div>
          <div class="record-details">
            <span>合成 → ${record.toGemName}</span>
          </div>
        `;
        break;
        
      case 'dismantle':
        detailsHtml = `
          <div class="record-item-name">${record.itemName}</div>
          <div class="record-details">
            <span>${record.quality} +${record.enhanceLevel}</span>
            <span class="record-gain">+${record.value} 金币</span>
          </div>
        `;
        break;
    }
    
    return `
      <div class="history-record" data-record-id="${record.id}">
        <div class="record-icon">${typeIcon}</div>
        <div class="record-content">
          <div class="record-header">
            <span class="record-type">${typeLabel}</span>
            <span class="record-date">${record.date}</span>
          </div>
          ${detailsHtml}
        </div>
      </div>
    `;
  }

  /**
   * 绑定历史面板事件
   */
  bindHistoryPanelEvents() {
    // 关闭按钮
    const closeBtn = this.historyPanel.querySelector('.history-panel-close');
    closeBtn.addEventListener('click', () => this.hideHistoryPanel());
    
    // 点击背景关闭
    this.historyPanel.addEventListener('click', (e) => {
      if (e.target === this.historyPanel) {
        this.hideHistoryPanel();
      }
    });
    
    // 类型筛选
    const typeFilter = this.historyPanel.querySelector('#history-type-filter');
    typeFilter.addEventListener('change', () => {
      const filters = { type: typeFilter.value };
      const listEl = this.historyPanel.querySelector('#history-list');
      listEl.innerHTML = this.renderHistoryList(filters);
    });
    
    // 清空历史
    const clearBtn = this.historyPanel.querySelector('#history-clear-btn');
    clearBtn.addEventListener('click', () => {
      if (confirm('确定要清空所有历史记录吗？此操作无法撤销！')) {
        this.clearHistory();
        this.hideHistoryPanel();
      }
    });
    
    // 导出历史
    const exportBtn = this.historyPanel.querySelector('#history-export-btn');
    exportBtn.addEventListener('click', () => this.exportHistory());
  }

  /**
   * 隐藏历史面板
   */
  hideHistoryPanel() {
    if (this.historyPanel) {
      this.historyPanel.remove();
      this.historyPanel = null;
    }
  }

  /**
   * 清空历史记录
   */
  clearHistory() {
    this.history = [];
    this.saveHistory();
    console.log('✓ 历史记录已清空');
  }

  /**
   * 导出历史记录
   */
  exportHistory() {
    const data = JSON.stringify(this.history, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `forge_history_${Date.now()}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
    
    console.log('✓ 历史记录已导出');
  }

  /**
   * 保存历史记录到localStorage
   */
  saveHistory() {
    try {
      localStorage.setItem('forge_history', JSON.stringify(this.history));
    } catch (error) {
      console.error('保存历史记录失败:', error);
    }
  }

  /**
   * 从localStorage加载历史记录
   */
  loadHistory() {
    try {
      const saved = localStorage.getItem('forge_history');
      if (saved) {
        this.history = JSON.parse(saved);
        console.log(`✓ 加载了 ${this.history.length} 条历史记录`);
      }
    } catch (error) {
      console.error('加载历史记录失败:', error);
      this.history = [];
    }
  }

  /**
   * 获取统计信息
   */
  getStats() {
    const stats = {
      total: this.history.length,
      byType: {},
      enhanceSuccess: 0,
      enhanceFailure: 0,
      totalGoldSpent: 0,
      totalGoldGained: 0
    };
    
    this.history.forEach(record => {
      // 按类型统计
      if (!stats.byType[record.type]) {
        stats.byType[record.type] = 0;
      }
      stats.byType[record.type]++;
      
      // 强化成功率统计
      if (record.type === 'enhance') {
        if (record.success) {
          stats.enhanceSuccess++;
        } else {
          stats.enhanceFailure++;
        }
      }
      
      // 金币统计
      if (record.cost) {
        stats.totalGoldSpent += record.cost;
      }
      if (record.value) {
        stats.totalGoldGained += record.value;
      }
    });
    
    return stats;
  }

  /**
   * 清理资源
   */
  cleanup() {
    this.hideHistoryPanel();
  }
}

