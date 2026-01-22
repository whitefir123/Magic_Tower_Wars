/**
 * GemSelectionModal - 宝石选择弹窗
 * 
 * 显示背包中的可用宝石，按品质和类型分组显示
 * 实现宝石选择和镶嵌功能
 */

export class GemSelectionModal {
  constructor(gemSocketManager) {
    this.gemSocketManager = gemSocketManager;
    this.forgeUI = gemSocketManager.forgeUI;
    this.modalElement = null;
    this.selectedItem = null;
    this.socketIndex = -1;
  }

  /**
   * 显示宝石选择模态框
   * @param {Object} item - 装备对象
   * @param {number} socketIndex - 槽位索引
   */
  show(item, socketIndex) {
    this.selectedItem = item;
    this.socketIndex = socketIndex;
    
    const player = this.forgeUI.player;
    if (!player) return;
    
    // 获取背包中的宝石
    const gems = this.getAvailableGems(player);
    
    if (gems.length === 0) {
      this.forgeUI.showMessage('背包中没有宝石', 'error');
      return;
    }
    
    // 创建模态框
    this.createModal(gems);
  }

  /**
   * 获取可用的宝石
   * @param {Object} player - 玩家对象
   * @returns {Array} 宝石数组
   */
  getAvailableGems(player) {
    if (!player.inventory) return [];
    
    return player.inventory
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => item && item.type === 'GEM');
  }

  /**
   * 创建模态框
   * @param {Array} gems - 宝石数组
   */
  createModal(gems) {
    // 移除已存在的模态框
    if (this.modalElement) {
      this.hide();
    }
    
    // 按品质分组
    const gemsByQuality = this.groupGemsByQuality(gems);
    
    // 创建模态框元素
    this.modalElement = document.createElement('div');
    this.modalElement.className = 'gem-select-modal';
    this.modalElement.innerHTML = `
      <div class="gem-select-header">
        <h3 class="gem-select-title">选择宝石</h3>
        <button class="gem-select-close">×</button>
      </div>
      <div class="gem-select-content">
        ${this.renderGemGroups(gemsByQuality)}
      </div>
    `;
    
    document.body.appendChild(this.modalElement);
    
    // 绑定事件
    this.bindEvents(gems);
    
    // 渲染宝石图标
    this.renderGemIcons(gems);
  }

  /**
   * 按品质分组宝石
   * @param {Array} gems - 宝石数组
   * @returns {Object} 分组后的宝石
   */
  groupGemsByQuality(gems) {
    const groups = {};
    const qualityOrder = ['MYTHIC', 'LEGENDARY', 'EPIC', 'RARE', 'UNCOMMON', 'COMMON'];
    
    gems.forEach(({ item, index }) => {
      const quality = item.quality || 'COMMON';
      if (!groups[quality]) {
        groups[quality] = [];
      }
      groups[quality].push({ item, index });
    });
    
    // 按品质排序
    const sorted = {};
    qualityOrder.forEach(quality => {
      if (groups[quality]) {
        sorted[quality] = groups[quality];
      }
    });
    
    return sorted;
  }

  /**
   * 渲染宝石分组
   * @param {Object} gemsByQuality - 按品质分组的宝石
   * @returns {string} HTML字符串
   */
  renderGemGroups(gemsByQuality) {
    const qualityNames = {
      'MYTHIC': '神话',
      'LEGENDARY': '传说',
      'EPIC': '史诗',
      'RARE': '稀有',
      'UNCOMMON': '优秀',
      'COMMON': '普通'
    };
    
    let html = '';
    
    for (const [quality, gems] of Object.entries(gemsByQuality)) {
      const qualityName = qualityNames[quality] || quality;
      const qualityColor = this.getQualityColor(quality);
      
      html += `
        <div class="gem-quality-group">
          <h4 class="gem-quality-title" style="color: ${qualityColor};">
            ${qualityName} (${gems.length})
          </h4>
          <div class="gem-list">
            ${gems.map(({ item, index }) => this.renderGemItem(item, index)).join('')}
          </div>
        </div>
      `;
    }
    
    return html;
  }

  /**
   * 渲染单个宝石项
   * @param {Object} gem - 宝石对象
   * @param {number} index - 背包索引
   * @returns {string} HTML字符串
   */
  renderGemItem(gem, index) {
    const gemName = gem.nameZh || gem.name || '未知宝石';
    const quality = gem.quality || 'COMMON';
    const qualityColor = this.getQualityColor(quality);
    
    // 获取宝石属性加成
    const statsHtml = this.renderGemStats(gem);
    
    return `
      <div class="gem-item quality-${quality}" 
           data-gem-index="${index}"
           title="${gemName}\n${statsHtml}">
        <div class="gem-icon-wrapper">
          <canvas class="gem-icon" width="60" height="60" data-gem-index="${index}"></canvas>
        </div>
        <div class="gem-item-name" style="color: ${qualityColor};">
          ${gemName}
        </div>
        <div class="gem-item-stats">
          ${statsHtml}
        </div>
      </div>
    `;
  }

  /**
   * 渲染宝石属性
   * @param {Object} gem - 宝石对象
   * @returns {string} 属性HTML
   */
  renderGemStats(gem) {
    if (!gem.stats || Object.keys(gem.stats).length === 0) {
      return '<span style="color: #666; font-size: 11px;">无属性</span>';
    }
    
    const statNames = {
      'p_atk': '物攻',
      'm_atk': '魔攻',
      'p_def': '物防',
      'm_def': '魔防',
      'hp': '生命',
      'maxHp': '生命',
      'critRate': '暴击',
      'critDamage': '暴伤',
      'dodge': '闪避',
      'accuracy': '命中'
    };
    
    const stats = Object.entries(gem.stats)
      .map(([key, value]) => {
        const name = statNames[key] || key;
        return `<span style="font-size: 11px; color: #4caf50;">+${value} ${name}</span>`;
      })
      .slice(0, 2) // 只显示前2个属性
      .join('<br>');
    
    return stats;
  }

  /**
   * 渲染宝石图标
   * @param {Array} gems - 宝石数组
   */
  renderGemIcons(gems) {
    const game = window.game;
    const loader = game?.loader;
    const gemImg = loader?.getImage('ICONS_GEMS');
    
    if (!gemImg) return;
    
    const render = () => {
      gems.forEach(({ item, index }) => {
        const canvas = this.modalElement.querySelector(`canvas.gem-icon[data-gem-index="${index}"]`);
        if (!canvas) return;
        
        const iconIndex = item.iconIndex || 0;
        const cols = 5;
        const rows = 4;
        const cellW = Math.floor(gemImg.width / cols);
        const cellH = Math.floor(gemImg.height / rows);
        const col = iconIndex % cols;
        const row = Math.floor(iconIndex / cols);
        
        const sx = Math.round(col * cellW);
        const sy = Math.round(row * cellH);
        
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;
        ctx.clearRect(0, 0, 60, 60);
        ctx.drawImage(gemImg, sx, sy, cellW, cellH, 0, 0, 60, 60);
      });
    };
    
    if (gemImg.complete) {
      render();
    } else {
      gemImg.onload = render;
    }
  }

  /**
   * 绑定事件
   * @param {Array} gems - 宝石数组
   */
  bindEvents(gems) {
    // 关闭按钮
    const closeBtn = this.modalElement.querySelector('.gem-select-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.hide());
    }
    
    // 点击背景关闭
    this.modalElement.addEventListener('click', (e) => {
      if (e.target === this.modalElement) {
        this.hide();
      }
    });
    
    // 宝石点击事件
    const gemItems = this.modalElement.querySelectorAll('.gem-item');
    gemItems.forEach(gemElement => {
      gemElement.addEventListener('click', () => {
        const gemIndex = parseInt(gemElement.dataset.gemIndex);
        const gemData = gems.find(g => g.index === gemIndex);
        
        if (gemData) {
          this.selectGem(gemData.item);
        }
      });
    });
  }

  /**
   * 选择宝石
   * @param {Object} gemItem - 宝石对象
   */
  selectGem(gemItem) {
    // 调用 GemSocketManager 的镶嵌方法
    this.gemSocketManager.handleSocket(this.selectedItem, this.socketIndex, gemItem);
    
    // 关闭模态框
    this.hide();
  }

  /**
   * 获取品质颜色
   * @param {string} quality - 品质
   * @returns {string} 颜色代码
   */
  getQualityColor(quality) {
    const colors = {
      'COMMON': '#a0a0a0',
      'UNCOMMON': '#5eff00',
      'RARE': '#0070dd',
      'EPIC': '#a335ee',
      'LEGENDARY': '#ff8000',
      'MYTHIC': '#e91e63'
    };
    return colors[quality] || '#ffffff';
  }

  /**
   * 隐藏模态框
   */
  hide() {
    if (this.modalElement) {
      this.modalElement.remove();
      this.modalElement = null;
    }
    
    this.selectedItem = null;
    this.socketIndex = -1;
  }
}
