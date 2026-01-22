// EnhancementPanel.js - 强化功能面板
// 负责渲染装备强化界面，包括装备详情、强化按钮、材料槽位等

/**
 * EnhancementPanel - 强化功能面板
 * 提供完整的装备强化UI，包括按钮、材料槽位、成功率、属性对比等
 */
export class EnhancementPanel {
  constructor(blacksmithSystem, player) {
    this.blacksmithSystem = blacksmithSystem;
    this.player = player;
    
    // 当前选中的装备
    this.selectedItem = null;
    
    // 子组件（将在后续任务中创建）
    this.materialSlotManager = null;
    this.successRateCalculator = null;
    this.statComparisonRenderer = null;
    
    // DOM元素引用
    this.container = null;
    this.elements = {};
  }

  /**
   * 渲染面板
   * @param {HTMLElement} container - 容器元素
   * @param {Object} item - 装备对象
   */
  render(container, item) {
    this.container = container;
    this.selectedItem = item;
    
    if (!container || !item) {
      this.renderPlaceholder();
      return;
    }

    container.innerHTML = '';

    // 创建面板结构
    const panel = document.createElement('div');
    panel.className = 'enhancement-panel';

    // 1. 装备详情区域
    const detailsSection = this.createDetailsSection(item);
    panel.appendChild(detailsSection);

    // 2. 材料槽位区域（占位，将在任务3.3中实现）
    const materialsSection = this.createMaterialsSection();
    panel.appendChild(materialsSection);

    // 3. 成功率显示区域（占位，将在任务3.4中实现）
    const successRateSection = this.createSuccessRateSection();
    panel.appendChild(successRateSection);

    // 4. 属性对比区域（占位，将在任务3.6中实现）
    const statsSection = this.createStatsSection(item);
    panel.appendChild(statsSection);

    // 5. 操作按钮区域
    const actionsSection = this.createActionsSection(item);
    panel.appendChild(actionsSection);

    container.appendChild(panel);
    
    // 缓存元素引用
    this.cacheElements();
  }

  /**
   * 创建装备详情区域
   * @param {Object} item - 装备对象
   * @returns {HTMLElement}
   */
  createDetailsSection(item) {
    const section = document.createElement('div');
    section.className = 'enhancement-section enhancement-details';

    const title = document.createElement('h4');
    title.textContent = '装备详情';
    section.appendChild(title);

    // 装备名称
    const name = document.createElement('div');
    name.className = 'equipment-name';
    name.textContent = this.blacksmithSystem.getItemDisplayName(item);
    name.style.color = this.blacksmithSystem.getItemQualityColor(item);
    section.appendChild(name);

    // 装备类型和等级
    const info = document.createElement('div');
    info.className = 'equipment-info';
    info.innerHTML = `
      <span class="equipment-type">${this.getItemTypeText(item.type)}</span>
      <span class="equipment-level">强化等级: +${item.enhanceLevel || 0}</span>
    `;
    section.appendChild(info);

    // 当前属性
    const currentStats = document.createElement('div');
    currentStats.className = 'equipment-current-stats';
    currentStats.innerHTML = '<strong>当前属性：</strong>';
    
    const statsList = document.createElement('div');
    statsList.className = 'stats-list';
    
    if (item.stats) {
      for (const [key, value] of Object.entries(item.stats)) {
        const statRow = document.createElement('div');
        statRow.className = 'stat-row';
        statRow.innerHTML = `
          <span class="stat-label">${this.getStatLabel(key)}:</span>
          <span class="stat-value">${this.formatStatValue(key, value)}</span>
        `;
        statsList.appendChild(statRow);
      }
    }
    
    currentStats.appendChild(statsList);
    section.appendChild(currentStats);

    return section;
  }

  /**
   * 创建材料槽位区域（占位）
   * @returns {HTMLElement}
   */
  createMaterialsSection() {
    const section = document.createElement('div');
    section.className = 'enhancement-section enhancement-materials';
    section.id = 'enhancement-materials-section';

    const title = document.createElement('h4');
    title.textContent = '强化材料';
    section.appendChild(title);

    const placeholder = document.createElement('div');
    placeholder.className = 'materials-placeholder';
    placeholder.textContent = '材料槽位将在任务3.3中实现';
    section.appendChild(placeholder);

    return section;
  }

  /**
   * 创建成功率显示区域（占位）
   * @returns {HTMLElement}
   */
  createSuccessRateSection() {
    const section = document.createElement('div');
    section.className = 'enhancement-section enhancement-success-rate';
    section.id = 'enhancement-success-rate-section';

    const title = document.createElement('h4');
    title.textContent = '成功率';
    section.appendChild(title);

    const placeholder = document.createElement('div');
    placeholder.className = 'success-rate-placeholder';
    placeholder.textContent = '成功率计算将在任务3.4中实现';
    section.appendChild(placeholder);

    return section;
  }

  /**
   * 创建属性对比区域（占位）
   * @param {Object} item - 装备对象
   * @returns {HTMLElement}
   */
  createStatsSection(item) {
    const section = document.createElement('div');
    section.className = 'enhancement-section enhancement-stats-comparison';
    section.id = 'enhancement-stats-section';

    const title = document.createElement('h4');
    title.textContent = '属性预览';
    section.appendChild(title);

    const placeholder = document.createElement('div');
    placeholder.className = 'stats-comparison-placeholder';
    placeholder.textContent = '属性对比将在任务3.6中实现';
    section.appendChild(placeholder);

    return section;
  }

  /**
   * 创建操作按钮区域
   * @param {Object} item - 装备对象
   * @returns {HTMLElement}
   */
  createActionsSection(item) {
    const section = document.createElement('div');
    section.className = 'enhancement-section enhancement-actions';

    // 强化按钮
    const enhanceBtn = document.createElement('button');
    enhanceBtn.className = 'forge-btn forge-btn-enhance';
    enhanceBtn.id = 'enhance-button';
    enhanceBtn.textContent = '强化装备';
    
    // 检查是否可以强化
    const canEnhance = this.canEnhance(item);
    if (!canEnhance.can) {
      enhanceBtn.disabled = true;
      enhanceBtn.title = canEnhance.reason;
    }
    
    enhanceBtn.addEventListener('click', () => this.handleEnhance());
    section.appendChild(enhanceBtn);

    // 重铸按钮
    const reforgeBtn = document.createElement('button');
    reforgeBtn.className = 'forge-btn forge-btn-reforge';
    reforgeBtn.id = 'reforge-button';
    reforgeBtn.textContent = '重铸品质';
    
    reforgeBtn.addEventListener('click', () => this.handleReforge());
    section.appendChild(reforgeBtn);

    // 拆解按钮
    const dismantleBtn = document.createElement('button');
    dismantleBtn.className = 'forge-btn forge-btn-dismantle';
    dismantleBtn.id = 'dismantle-button';
    dismantleBtn.textContent = '拆解装备';
    
    dismantleBtn.addEventListener('click', () => this.handleDismantle());
    section.appendChild(dismantleBtn);

    return section;
  }

  /**
   * 渲染占位符（未选中装备时）
   */
  renderPlaceholder() {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="enhancement-placeholder">
        <p>请从左侧选择一件装备</p>
      </div>
    `;
  }

  /**
   * 检查是否可以强化
   * @param {Object} item - 装备对象
   * @returns {Object} {can: boolean, reason: string}
   */
  canEnhance(item) {
    if (!item) {
      return { can: false, reason: '未选择装备' };
    }

    const maxLevel = 15; // 从FORGE_CONFIG获取
    if (item.enhanceLevel >= maxLevel) {
      return { can: false, reason: `已达到最大强化等级 +${maxLevel}` };
    }

    const cost = this.blacksmithSystem.calculateEnhanceCost(item);
    if (this.player.stats.gold < cost) {
      return { can: false, reason: `金币不足（需要 ${cost} 金币）` };
    }

    return { can: true, reason: '' };
  }

  /**
   * 处理强化操作
   */
  handleEnhance() {
    if (!this.selectedItem) return;

    // 获取材料选项（将在任务3.3中从MaterialSlotManager获取）
    const options = {
      useProtectionScroll: false,
      blessingStoneCount: 0
    };

    // 执行强化
    const result = this.blacksmithSystem.enhanceItem(
      this.selectedItem,
      this.player,
      options
    );

    // 显示结果
    this.showResult(result);

    // 刷新面板
    if (result.success || result.enhanceResult) {
      this.render(this.container, this.selectedItem);
    }
  }

  /**
   * 处理重铸操作
   */
  handleReforge() {
    if (!this.selectedItem) return;

    const result = this.blacksmithSystem.reforgeItem(
      this.selectedItem,
      this.player
    );

    this.showResult(result);

    if (result.success) {
      this.render(this.container, this.selectedItem);
    }
  }

  /**
   * 处理拆解操作
   */
  handleDismantle() {
    if (!this.selectedItem) return;

    if (!confirm(`确定要拆解 ${this.blacksmithSystem.getItemDisplayName(this.selectedItem)} 吗？`)) {
      return;
    }

    const result = this.blacksmithSystem.dismantleItem(
      this.selectedItem,
      this.player
    );

    this.showResult(result);

    if (result.success) {
      // 清空选中
      this.selectedItem = null;
      this.renderPlaceholder();
    }
  }

  /**
   * 显示操作结果
   * @param {Object} result - 操作结果
   */
  showResult(result) {
    if (result.message) {
      alert(result.message);
    }
  }

  /**
   * 缓存DOM元素引用
   */
  cacheElements() {
    this.elements = {
      enhanceBtn: document.getElementById('enhance-button'),
      reforgeBtn: document.getElementById('reforge-button'),
      dismantleBtn: document.getElementById('dismantle-button'),
      materialsSection: document.getElementById('enhancement-materials-section'),
      successRateSection: document.getElementById('enhancement-success-rate-section'),
      statsSection: document.getElementById('enhancement-stats-section')
    };
  }

  /**
   * 更新按钮状态
   */
  updateButtonStates() {
    if (!this.selectedItem || !this.elements.enhanceBtn) return;

    const canEnhance = this.canEnhance(this.selectedItem);
    this.elements.enhanceBtn.disabled = !canEnhance.can;
    this.elements.enhanceBtn.title = canEnhance.reason;
  }

  /**
   * 获取装备类型文本
   * @param {string} type - 装备类型
   * @returns {string}
   */
  getItemTypeText(type) {
    const typeMap = {
      'WEAPON': '武器',
      'ARMOR': '护甲',
      'HELM': '头盔',
      'BOOTS': '靴子',
      'RING': '戒指',
      'AMULET': '项链',
      'ACCESSORY': '饰品'
    };
    return typeMap[type] || type;
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
      'lifesteal': '生命偷取'
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
    if (key.includes('rate') || key.includes('dodge') || key.includes('lifesteal')) {
      return `${(value * 100).toFixed(1)}%`;
    }
    return Math.floor(value).toString();
  }

  /**
   * 销毁面板
   */
  destroy() {
    this.selectedItem = null;
    this.elements = {};
    if (this.container) {
      this.container.innerHTML = '';
    }
  }
}
