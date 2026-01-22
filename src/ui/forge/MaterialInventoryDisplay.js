/**
 * MaterialInventoryDisplay - 材料库存显示器
 * 
 * 显示所有强化材料的库存数量
 * 支持实时更新和材料获取途径提示
 */

export class MaterialInventoryDisplay {
  constructor(forgeUI) {
    this.forgeUI = forgeUI;
    this.player = null;
    
    // 材料定义（与MaterialSystem保持一致）
    this.materials = [
      {
        id: 'ITEM_WHETSTONE',
        name: '磨刀石',
        icon: '🪨',
        description: '提高强化成功率 +5%',
        source: '击败怪物掉落'
      },
      {
        id: 'ITEM_BLESSING_SCROLL',
        name: '祝福卷轴',
        icon: '📜',
        description: '提高强化成功率 +10%',
        source: '商店购买、宝箱获得'
      },
      {
        id: 'ITEM_PROTECTION_CHARM',
        name: '保护符',
        icon: '🛡️',
        description: '强化失败时保护装备不降级',
        source: '稀有怪物掉落'
      }
    ];
  }

  /**
   * 渲染材料库存面板
   * @param {Object} player - 玩家对象
   * @returns {string} HTML字符串
   */
  render(player) {
    this.player = player;
    
    const materialsHtml = this.materials.map(material => {
      const count = this.getMaterialCount(material.id);
      const isEmpty = count === 0;
      
      return `
        <div class="material-inventory-item ${isEmpty ? 'empty' : ''}" 
             data-material-id="${material.id}"
             title="${material.description}\n获取途径: ${material.source}">
          <div class="material-icon">${material.icon}</div>
          <div class="material-info">
            <div class="material-name">${material.name}</div>
            <div class="material-count ${isEmpty ? 'zero' : ''}">${count}</div>
          </div>
          ${isEmpty ? '<div class="material-missing-label">缺少</div>' : ''}
        </div>
      `;
    }).join('');
    
    return `
      <div class="material-inventory-panel">
        <h4>材料库存</h4>
        <div class="material-inventory-grid">
          ${materialsHtml}
        </div>
        <div class="material-inventory-hint">
          <small>💡 提示：将鼠标悬停在材料上查看获取途径</small>
        </div>
      </div>
    `;
  }

  /**
   * 获取材料数量
   * @param {string} materialId - 材料ID
   * @returns {number} 材料数量
   */
  getMaterialCount(materialId) {
    if (!this.player || !this.player.inventory) return 0;
    
    let count = 0;
    this.player.inventory.forEach(item => {
      if (item && (item.itemId === materialId || item.id === materialId)) {
        count += (item.count || 1);
      }
    });
    
    return count;
  }

  /**
   * 更新材料库存显示
   * 在材料使用后调用此方法刷新显示
   */
  update() {
    const panel = document.querySelector('.material-inventory-panel');
    if (!panel || !this.player) return;
    
    // 更新每个材料的数量显示
    this.materials.forEach(material => {
      const count = this.getMaterialCount(material.id);
      const isEmpty = count === 0;
      
      const itemElement = panel.querySelector(`[data-material-id="${material.id}"]`);
      if (itemElement) {
        // 更新数量
        const countElement = itemElement.querySelector('.material-count');
        if (countElement) {
          countElement.textContent = count;
          countElement.classList.toggle('zero', isEmpty);
        }
        
        // 更新空状态
        itemElement.classList.toggle('empty', isEmpty);
        
        // 更新缺少标签
        const missingLabel = itemElement.querySelector('.material-missing-label');
        if (isEmpty && !missingLabel) {
          const label = document.createElement('div');
          label.className = 'material-missing-label';
          label.textContent = '缺少';
          itemElement.appendChild(label);
        } else if (!isEmpty && missingLabel) {
          missingLabel.remove();
        }
      }
    });
  }

  /**
   * 获取材料信息
   * @param {string} materialId - 材料ID
   * @returns {Object|null} 材料信息
   */
  getMaterialInfo(materialId) {
    return this.materials.find(m => m.id === materialId) || null;
  }

  /**
   * 检查是否有足够的材料
   * @param {string} materialId - 材料ID
   * @param {number} required - 需要的数量
   * @returns {boolean} 是否有足够的材料
   */
  hasSufficientMaterial(materialId, required = 1) {
    return this.getMaterialCount(materialId) >= required;
  }

  /**
   * 获取所有材料的库存状态
   * @returns {Object} 材料库存状态
   */
  getInventoryStatus() {
    const status = {};
    this.materials.forEach(material => {
      status[material.id] = {
        count: this.getMaterialCount(material.id),
        name: material.name,
        icon: material.icon
      };
    });
    return status;
  }
}
