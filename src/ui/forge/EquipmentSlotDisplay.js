/**
 * EquipmentSlotDisplay - 装备槽位状态显示器
 * 
 * 显示所有装备槽位的状态（已装备/空槽位）
 * 帮助玩家了解哪些槽位需要装备
 */

export class EquipmentSlotDisplay {
  constructor(forgeUI) {
    this.forgeUI = forgeUI;
    this.player = null;
    
    // 装备槽位定义
    this.slots = [
      { id: 'WEAPON', name: '武器', icon: '', description: '主要攻击装备' },
      { id: 'ARMOR', name: '护甲', icon: '', description: '提供防御保护' },
      { id: 'HELM', name: '头盔', icon: '', description: '保护头部' },
      { id: 'BOOTS', name: '靴子', icon: '', description: '提升移动速度' },
      { id: 'RING', name: '戒指', icon: '', description: '提供额外属性' },
      { id: 'AMULET', name: '护身符', icon: '', description: '神秘力量加持' },
      { id: 'ACCESSORY', name: '饰品', icon: '', description: '特殊效果装备' }
    ];
  }

  /**
   * 渲染装备槽位面板
   * @param {Object} player - 玩家对象
   * @returns {string} HTML字符串
   */
  render(player) {
    this.player = player;
    
    const slotsHtml = this.slots.map(slot => {
      const equipment = player.equipment?.[slot.id];
      const isEmpty = !equipment;
      
      if (isEmpty) {
        return `
          <div class="equipment-slot empty" 
               data-slot-id="${slot.id}"
               title="${slot.description}\n点击查看可装备的${slot.name}">
            <div class="slot-info">
              <div class="slot-name">${slot.name}</div>
              <div class="slot-status empty-label">空槽位</div>
            </div>
          </div>
        `;
      } else {
        const itemName = equipment.displayName || equipment.name || '未知装备';
        const enhanceLevel = equipment.enhanceLevel || 0;
        const quality = equipment.quality || 'COMMON';
        const qualityColor = this.getQualityColor(quality);
        
        return `
          <div class="equipment-slot filled" 
               data-slot-id="${slot.id}"
               data-item-uid="${equipment.uid || equipment.id}"
               title="${slot.description}">
            <div class="slot-info">
              <div class="slot-name">${slot.name}</div>
              <div class="slot-status filled-label" style="color: ${qualityColor};">
                ${itemName} ${enhanceLevel > 0 ? `+${enhanceLevel}` : ''}
              </div>
            </div>
          </div>
        `;
      }
    }).join('');
    
    return `
      <div class="equipment-slot-panel">
        <h4>装备槽位</h4>
        <div class="equipment-slot-grid">
          ${slotsHtml}
        </div>
        <div class="equipment-slot-hint">
          <small>提示：空槽位表示该位置未装备物品</small>
        </div>
      </div>
    `;
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
   * 获取槽位信息
   * @param {string} slotId - 槽位ID
   * @returns {Object|null} 槽位信息
   */
  getSlotInfo(slotId) {
    return this.slots.find(s => s.id === slotId) || null;
  }

  /**
   * 检查槽位是否为空
   * @param {string} slotId - 槽位ID
   * @returns {boolean} 是否为空
   */
  isSlotEmpty(slotId) {
    if (!this.player || !this.player.equipment) return true;
    return !this.player.equipment[slotId];
  }

  /**
   * 获取空槽位列表
   * @returns {Array} 空槽位列表
   */
  getEmptySlots() {
    if (!this.player || !this.player.equipment) return this.slots;
    
    return this.slots.filter(slot => !this.player.equipment[slot.id]);
  }

  /**
   * 获取已装备槽位列表
   * @returns {Array} 已装备槽位列表
   */
  getFilledSlots() {
    if (!this.player || !this.player.equipment) return [];
    
    return this.slots.filter(slot => this.player.equipment[slot.id]);
  }

  /**
   * 更新槽位显示
   * 在装备变化后调用此方法刷新显示
   */
  update() {
    const panel = document.querySelector('.equipment-slot-panel');
    if (!panel || !this.player) return;
    
    // 重新渲染整个面板
    const newHtml = this.render(this.player);
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = newHtml;
    const newPanel = tempDiv.firstElementChild;
    
    if (newPanel) {
      panel.replaceWith(newPanel);
    }
  }

  /**
   * 绑定槽位点击事件
   * @param {Function} onSlotClick - 槽位点击回调函数
   */
  bindSlotClickEvents(onSlotClick) {
    const slots = document.querySelectorAll('.equipment-slot');
    slots.forEach(slotElement => {
      slotElement.addEventListener('click', () => {
        const slotId = slotElement.dataset.slotId;
        const isEmpty = slotElement.classList.contains('empty');
        const itemUid = slotElement.dataset.itemUid;
        
        if (onSlotClick) {
          onSlotClick(slotId, isEmpty, itemUid);
        }
      });
    });
  }
}
