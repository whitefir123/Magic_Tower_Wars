// DynamicPanelManager.js - 动态面板管理器
// 管理功能面板的显示、隐藏和切换

import { PanelAnimator } from './PanelAnimator.js';

/**
 * DynamicPanelManager - 动态面板管理器
 * 负责管理功能面板的生命周期和动画
 */
export class DynamicPanelManager {
  constructor(forgeUI) {
    this.forgeUI = forgeUI;
    this.currentPanel = null;
    this.panelAnimator = new PanelAnimator();
    this.panels = {
      enhance: null,
      socket: null,
      synthesis: null,
      dismantle: null,
      batch: null,
      history: null
    };
  }

  /**
   * 显示指定功能面板
   */
  async showPanel(panelId) {
    console.log(`[DynamicPanelManager] showPanel 被调用: ${panelId}`);
    
    const container = document.getElementById('forge-dynamic-panel');
    if (!container) {
      console.error('[DynamicPanelManager] 找不到动态面板容器 #forge-dynamic-panel');
      return;
    }
    
    console.log(`[DynamicPanelManager] 找到容器:`, container);
    
    // 如果已有面板显示，先关闭
    if (this.currentPanel) {
      console.log(`[DynamicPanelManager] 关闭当前面板: ${this.currentPanel}`);
      await this.closePanel();
    }
    
    // 创建新面板
    console.log(`[DynamicPanelManager] 创建面板: ${panelId}`);
    const panel = this.createPanel(panelId);
    if (!panel) {
      console.error(`[DynamicPanelManager] 无法创建面板: ${panelId}`);
      return;
    }
    
    // 添加到容器
    container.innerHTML = '';
    container.appendChild(panel);
    console.log(`[DynamicPanelManager] 面板已添加到容器`);
    
    // 播放进入动画
    await this.panelAnimator.slideIn(panel);
    
    this.currentPanel = panelId;
    this.panels[panelId] = panel;
    
    console.log(`[DynamicPanelManager] 面板已显示: ${panelId}`);
  }

  /**
   * 关闭当前面板
   */
  async closePanel() {
    if (!this.currentPanel) return;
    
    const panel = this.panels[this.currentPanel];
    if (!panel) return;
    
    // 播放退出动画
    await this.panelAnimator.slideOut(panel);
    
    // 移除面板
    const container = document.getElementById('forge-dynamic-panel');
    if (container) {
      container.innerHTML = '';
    }
    
    console.log(`面板已关闭: ${this.currentPanel}`);
    
    this.panels[this.currentPanel] = null;
    this.currentPanel = null;
  }

  /**
   * 创建功能面板
   */
  createPanel(panelId) {
    const panel = document.createElement('div');
    panel.className = 'forge-function-panel';
    panel.id = `forge-panel-${panelId}`;
    
    // 添加面板头部
    panel.innerHTML = `
      <div class="panel-header">
        <h3 class="panel-title">${this.getPanelTitle(panelId)}</h3>
        <button class="panel-close-btn" id="panel-close-btn">✕</button>
      </div>
      <div class="panel-content" id="panel-content-${panelId}">
        <!-- 面板内容将在这里渲染 -->
      </div>
    `;
    
    // 绑定关闭按钮
    const closeBtn = panel.querySelector('.panel-close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.closePanel();
      });
    }
    
    // 渲染面板内容
    this.renderPanelContent(panelId, panel);
    
    return panel;
  }

  /**
   * 获取面板标题
   */
  getPanelTitle(panelId) {
    const titles = {
      enhance: '装备强化/重铸',
      socket: '宝石镶嵌',
      synthesis: '宝石合成',
      dismantle: '装备拆解',
      batch: '批量操作',
      history: '操作历史'
    };
    return titles[panelId] || '未知功能';
  }

  /**
   * 渲染面板内容
   */
  renderPanelContent(panelId, panel) {
    const contentArea = panel.querySelector(`#panel-content-${panelId}`);
    if (!contentArea) {
      console.error(`找不到面板内容区域: ${panelId}`);
      return;
    }
    
    switch (panelId) {
      case 'enhance':
        this.renderEnhancePanel(contentArea);
        break;
      case 'socket':
        this.renderSocketPanel(contentArea);
        break;
      case 'synthesis':
        this.renderSynthesisPanel(contentArea);
        break;
      case 'dismantle':
        this.renderDismantlePanel(contentArea);
        break;
      case 'batch':
        this.renderBatchPanel(contentArea);
        break;
      case 'history':
        this.renderHistoryPanel(contentArea);
        break;
      default:
        contentArea.innerHTML = '<p class="panel-placeholder">功能开发中...</p>';
    }
  }

  /**
   * 渲染强化面板
   */
  renderEnhancePanel(container) {
    console.log('[DynamicPanelManager] renderEnhancePanel 被调用');
    
    container.innerHTML = `
      <div class="enhance-panel">
        <div class="panel-section">
          <h4 class="section-title">选择装备</h4>
          <div class="equipment-list" id="enhance-equipment-list">
            <!-- 装备列表将在这里渲染 -->
          </div>
        </div>
        <div class="panel-section">
          <h4 class="section-title">装备详情</h4>
          <div class="equipment-details" id="enhance-equipment-details">
            <p class="panel-placeholder">请选择一件装备</p>
          </div>
        </div>
      </div>
    `;
    
    console.log('[DynamicPanelManager] HTML 已插入');
    
    // 延迟渲染装备列表，确保DOM已更新
    setTimeout(() => {
      console.log('[DynamicPanelManager] 准备渲染装备列表');
      const listContainer = document.getElementById('enhance-equipment-list');
      console.log('[DynamicPanelManager] 装备列表容器:', listContainer);
      
      this.forgeUI.renderItemList('enhance-equipment-list');
    }, 0);
  }

  /**
   * 渲染宝石镶嵌面板
   */
  renderSocketPanel(container) {
    container.innerHTML = `
      <div class="socket-panel">
        <div class="panel-section">
          <h4 class="section-title">选择装备</h4>
          <div class="equipment-list" id="socket-equipment-list">
            <!-- 装备列表 -->
          </div>
        </div>
        <div class="panel-section">
          <h4 class="section-title">宝石槽位</h4>
          <div class="socket-slots" id="socket-slots">
            <p class="panel-placeholder">请选择一件装备</p>
          </div>
        </div>
      </div>
    `;
    
    // 渲染装备列表
    this.forgeUI.renderItemList('socket-equipment-list');
  }

  /**
   * 渲染宝石合成面板
   */
  renderSynthesisPanel(container) {
    container.innerHTML = `
      <div class="synthesis-panel">
        <div class="panel-section">
          <h4 class="section-title">可合成宝石</h4>
          <div class="synthesis-list" id="synthesis-list">
            <p class="panel-placeholder">暂无可合成的宝石</p>
          </div>
        </div>
      </div>
    `;
    
    // 如果有宝石面板，渲染合成列表
    if (this.forgeUI.gemPanel) {
      this.forgeUI.gemPanel.renderSynthesisView(container.querySelector('#synthesis-list'));
    }
  }

  /**
   * 渲染拆解面板
   */
  renderDismantlePanel(container) {
    container.innerHTML = `
      <div class="dismantle-panel">
        <div class="panel-section">
          <h4 class="section-title">选择要拆解的装备</h4>
          <div class="equipment-list" id="dismantle-equipment-list">
            <!-- 装备列表 -->
          </div>
        </div>
        <div class="panel-section">
          <div class="dismantle-actions">
            <button class="forge-btn forge-btn-dismantle" id="dismantle-btn" disabled>
              拆解选中装备
            </button>
          </div>
        </div>
      </div>
    `;
    
    // 渲染装备列表
    this.forgeUI.renderItemList('dismantle-equipment-list');
  }

  /**
   * 渲染批量操作面板
   */
  renderBatchPanel(container) {
    container.innerHTML = `
      <div class="batch-panel">
        <div class="panel-section">
          <h4 class="section-title">批量操作</h4>
          <p class="panel-placeholder">批量操作功能开发中...</p>
        </div>
      </div>
    `;
    
    // 如果有批量操作面板，渲染
    if (this.forgeUI.batchOperationPanel) {
      this.forgeUI.batchOperationPanel.render(container);
    }
  }

  /**
   * 渲染历史记录面板
   */
  renderHistoryPanel(container) {
    container.innerHTML = `
      <div class="history-panel">
        <div class="panel-section">
          <h4 class="section-title">操作历史</h4>
          <p class="panel-placeholder">历史记录功能开发中...</p>
        </div>
      </div>
    `;
    
    // 如果有历史追踪器，显示历史面板
    if (this.forgeUI.historyTracker) {
      // 注意：历史追踪器可能有自己的模态框，这里可以选择嵌入或打开独立窗口
      this.forgeUI.historyTracker.showHistoryPanel();
    }
  }

  /**
   * 获取当前面板ID
   */
  getCurrentPanel() {
    return this.currentPanel;
  }

  /**
   * 检查是否有面板打开
   */
  isPanelOpen() {
    return this.currentPanel !== null;
  }

  /**
   * 清理
   */
  cleanup() {
    if (this.currentPanel) {
      this.closePanel();
    }
    this.panels = {};
  }
}
