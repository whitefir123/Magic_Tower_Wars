/**
 * GemPanel - 宝石系统主面板
 * 
 * 管理宝石镶嵌和合成的标签页布局和切换
 */

export class GemPanel {
  constructor(forgeUI) {
    this.forgeUI = forgeUI;
    this.currentTab = 'socket'; // 'socket' 或 'synthesis'
    this.selectedItem = null;
    
    // 子组件（延迟初始化）
    this.socketManager = null;
    this.synthesisRenderer = null;
  }

  /**
   * 渲染宝石面板
   * @param {HTMLElement} containerElement - 容器元素
   * @param {Object} item - 选中的装备（可选，合成模式不需要）
   */
  render(containerElement, item = null) {
    this.selectedItem = item;
    
    // 如果是合成模式且没有选中装备，直接渲染合成面板
    if (this.currentTab === 'synthesis') {
      this.renderSynthesisTab(containerElement);
      return;
    }
    
    // 镶嵌模式需要选中装备
    if (!item) {
      containerElement.innerHTML = '<p class="forge-placeholder">选择一件装备来镶嵌宝石</p>';
      return;
    }
    
    this.renderSocketTab(containerElement, item);
  }

  /**
   * 切换标签页
   * @param {string} tab - 标签页名称 ('socket' 或 'synthesis')
   */
  switchTab(tab) {
    if (tab !== 'socket' && tab !== 'synthesis') {
      console.warn(`无效的标签页: ${tab}`);
      return;
    }
    
    this.currentTab = tab;
    
    // 触发重新渲染
    if (this.forgeUI && this.forgeUI.elements.itemDetails) {
      this.render(this.forgeUI.elements.itemDetails, this.selectedItem);
    }
  }

  /**
   * 渲染镶嵌标签页
   * @param {HTMLElement} containerElement - 容器元素
   * @param {Object} item - 装备对象
   */
  renderSocketTab(containerElement, item) {
    // 延迟加载 GemSocketManager
    if (!this.socketManager) {
      import('./GemSocketManager.js').then(module => {
        this.socketManager = new module.GemSocketManager(this);
        this.socketManager.render(containerElement, item);
      });
    } else {
      this.socketManager.render(containerElement, item);
    }
  }

  /**
   * 渲染合成标签页
   * @param {HTMLElement} containerElement - 容器元素
   */
  renderSynthesisTab(containerElement) {
    // 延迟加载 GemSynthesisRenderer
    if (!this.synthesisRenderer) {
      import('./GemSynthesisRenderer.js').then(module => {
        this.synthesisRenderer = new module.GemSynthesisRenderer(this);
        this.synthesisRenderer.render(containerElement);
      });
    } else {
      this.synthesisRenderer.render(containerElement);
    }
  }

  /**
   * 获取当前标签页
   * @returns {string} 当前标签页名称
   */
  getCurrentTab() {
    return this.currentTab;
  }

  /**
   * 清理资源
   */
  cleanup() {
    this.selectedItem = null;
    this.socketManager = null;
    this.synthesisRenderer = null;
  }
}
