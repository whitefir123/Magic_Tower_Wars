// MaterialSlotManager.js - 材料槽位管理器
// 负责管理强化材料槽位，支持拖拽、点击放置、移除等操作

import { spriteManager } from './SpriteManager.js';

/**
 * MaterialSlotManager - 材料槽位管理器
 * 提供3个材料槽位，支持放置幸运石、保护卷轴等强化材料
 */
export class MaterialSlotManager {
  constructor(player) {
    this.player = player;
    
    // 槽位数量
    this.slotCount = 3;
    
    // 槽位数据
    this.slots = [];
    for (let i = 0; i < this.slotCount; i++) {
      this.slots.push({
        index: i,
        material: null,
        element: null
      });
    }
    
    // 容器元素
    this.container = null;
    
    // 可用材料类型
    this.materialTypes = {
      'blessing_stone': {
        name: '祝福石',
        icon: '✨',
        effect: '提升成功率',
        stackable: true,
        maxStack: 5
      },
      'protection_scroll': {
        name: '保护卷轴',
        icon: '📜',
        effect: '失败时保护等级',
        stackable: false,
        maxStack: 1
      },
      'lucky_stone': {
        name: '幸运石',
        icon: '🍀',
        effect: '额外提升成功率',
        stackable: true,
        maxStack: 3
      }
    };
  }

  /**
   * 渲染材料槽位
   * @param {HTMLElement} container - 容器元素
   */
  render(container) {
    if (!container) return;

    this.container = container;
    container.innerHTML = '';

    // 创建槽位网格
    const slotsGrid = document.createElement('div');
    slotsGrid.className = 'material-slots-grid';

    for (let i = 0; i < this.slotCount; i++) {
      const slot = this.createSlot(i);
      slotsGrid.appendChild(slot);
      this.slots[i].element = slot;
    }

    container.appendChild(slotsGrid);

    // 创建可用材料列表
    const materialsList = this.createMaterialsList();
    container.appendChild(materialsList);
  }

  /**
   * 创建单个槽位
   * @param {number} index - 槽位索引
   * @returns {HTMLElement}
   */
  createSlot(index) {
    const slot = document.createElement('div');
    slot.className = 'material-slot empty';
    slot.dataset.index = index;

    // 槽位标签
    const label = document.createElement('div');
    label.className = 'material-slot-label';
    label.textContent = `槽位 ${index + 1}`;
    slot.appendChild(label);

    // 槽位内容（空时显示提示）
    const content = document.createElement('div');
    content.className = 'material-slot-content';
    content.innerHTML = '<span class="material-slot-empty-hint">点击放置材料</span>';
    slot.appendChild(content);

    // 点击事件
    slot.addEventListener('click', () => this.handleSlotClick(index));

    // 拖拽事件
    slot.addEventListener('dragover', (e) => {
      e.preventDefault();
      slot.classList.add('drag-over');
    });

    slot.addEventListener('dragleave', () => {
      slot.classList.remove('drag-over');
    });

    slot.addEventListener('drop', (e) => {
      e.preventDefault();
      slot.classList.remove('drag-over');
      
      const materialType = e.dataTransfer.getData('material-type');
      if (materialType) {
        this.placeMaterial(index, materialType);
      }
    });

    return slot;
  }

  /**
   * 创建可用材料列表
   * @returns {HTMLElement}
   */
  createMaterialsList() {
    const section = document.createElement('div');
    section.className = 'materials-list-section';

    const title = document.createElement('h5');
    title.textContent = '可用材料';
    section.appendChild(title);

    const list = document.createElement('div');
    list.className = 'materials-list';

    // 遍历材料类型
    for (const [type, config] of Object.entries(this.materialTypes)) {
      const count = this.getMaterialCount(type);
      
      const item = document.createElement('div');
      item.className = 'material-list-item';
      if (count === 0) {
        item.classList.add('disabled');
      }
      item.dataset.materialType = type;

      // 材料图标
      const icon = document.createElement('div');
      icon.className = 'material-icon';
      icon.textContent = config.icon;
      item.appendChild(icon);

      // 材料信息
      const info = document.createElement('div');
      info.className = 'material-info';
      
      const name = document.createElement('div');
      name.className = 'material-name';
      name.textContent = config.name;
      info.appendChild(name);

      const effect = document.createElement('div');
      effect.className = 'material-effect';
      effect.textContent = config.effect;
      info.appendChild(effect);

      item.appendChild(info);

      // 数量
      const countLabel = document.createElement('div');
      countLabel.className = 'material-count';
      countLabel.textContent = `×${count}`;
      item.appendChild(countLabel);

      // 点击事件
      if (count > 0) {
        item.addEventListener('click', () => this.handleMaterialClick(type));
        
        // 拖拽事件
        item.draggable = true;
        item.addEventListener('dragstart', (e) => {
          e.dataTransfer.setData('material-type', type);
          item.classList.add('dragging');
        });
        
        item.addEventListener('dragend', () => {
          item.classList.remove('dragging');
        });
      }

      list.appendChild(item);
    }

    section.appendChild(list);
    return section;
  }

  /**
   * 处理槽位点击
   * @param {number} index - 槽位索引
   */
  handleSlotClick(index) {
    const slot = this.slots[index];
    
    if (slot.material) {
      // 已有材料，移除
      this.removeMaterial(index);
    } else {
      // 空槽位，显示材料选择
      this.showMaterialSelection(index);
    }
  }

  /**
   * 处理材料点击
   * @param {string} materialType - 材料类型
   */
  handleMaterialClick(materialType) {
    // 查找第一个空槽位
    const emptySlot = this.slots.find(s => !s.material);
    
    if (emptySlot) {
      this.placeMaterial(emptySlot.index, materialType);
    } else {
      alert('所有槽位已满，请先移除材料');
    }
  }

  /**
   * 放置材料到槽位
   * @param {number} index - 槽位索引
   * @param {string} materialType - 材料类型
   */
  placeMaterial(index, materialType) {
    const slot = this.slots[index];
    const config = this.materialTypes[materialType];
    
    if (!config) {
      console.error('未知材料类型:', materialType);
      return;
    }

    // 检查是否有材料
    const count = this.getMaterialCount(materialType);
    if (count === 0) {
      alert(`${config.name} 数量不足`);
      return;
    }

    // 检查是否已经放置了相同材料
    if (!config.stackable) {
      const existing = this.slots.find(s => s.material?.type === materialType);
      if (existing) {
        alert(`${config.name} 不可叠加，已在槽位 ${existing.index + 1}`);
        return;
      }
    }

    // 放置材料
    slot.material = {
      type: materialType,
      config: config,
      count: 1
    };

    // 更新槽位显示
    this.updateSlotDisplay(index);
    
    // 触发变化回调
    this.onMaterialsChange();
  }

  /**
   * 移除槽位中的材料
   * @param {number} index - 槽位索引
   */
  removeMaterial(index) {
    const slot = this.slots[index];
    
    if (!slot.material) return;

    slot.material = null;
    this.updateSlotDisplay(index);
    
    // 触发变化回调
    this.onMaterialsChange();
  }

  /**
   * 更新槽位显示
   * @param {number} index - 槽位索引
   */
  updateSlotDisplay(index) {
    const slot = this.slots[index];
    const element = slot.element;
    
    if (!element) return;

    const content = element.querySelector('.material-slot-content');
    
    if (slot.material) {
      // 有材料
      element.classList.remove('empty');
      element.classList.add('filled');
      
      content.innerHTML = `
        <div class="material-slot-icon">${slot.material.config.icon}</div>
        <div class="material-slot-name">${slot.material.config.name}</div>
        <button class="material-slot-remove" onclick="event.stopPropagation()">×</button>
      `;
      
      // 移除按钮事件
      const removeBtn = content.querySelector('.material-slot-remove');
      removeBtn.addEventListener('click', () => this.removeMaterial(index));
    } else {
      // 空槽位
      element.classList.remove('filled');
      element.classList.add('empty');
      
      content.innerHTML = '<span class="material-slot-empty-hint">点击放置材料</span>';
    }
  }

  /**
   * 显示材料选择（简化版，使用原生prompt）
   * @param {number} index - 槽位索引
   */
  showMaterialSelection(index) {
    const availableMaterials = [];
    
    for (const [type, config] of Object.entries(this.materialTypes)) {
      const count = this.getMaterialCount(type);
      if (count > 0) {
        availableMaterials.push(`${config.name} (×${count})`);
      }
    }
    
    if (availableMaterials.length === 0) {
      alert('没有可用的材料');
      return;
    }
    
    // 简化版：直接放置第一个可用材料
    const firstType = Object.keys(this.materialTypes).find(type => 
      this.getMaterialCount(type) > 0
    );
    
    if (firstType) {
      this.placeMaterial(index, firstType);
    }
  }

  /**
   * 获取材料数量
   * @param {string} materialType - 材料类型
   * @returns {number}
   */
  getMaterialCount(materialType) {
    // TODO: 从玩家背包中获取材料数量
    // 暂时返回模拟数据
    const mockCounts = {
      'blessing_stone': 10,
      'protection_scroll': 3,
      'lucky_stone': 5
    };
    return mockCounts[materialType] || 0;
  }

  /**
   * 获取当前放置的材料
   * @returns {Object} {blessingStoneCount, useProtectionScroll, luckyStoneCount}
   */
  getMaterials() {
    const result = {
      blessingStoneCount: 0,
      useProtectionScroll: false,
      luckyStoneCount: 0
    };

    for (const slot of this.slots) {
      if (slot.material) {
        switch (slot.material.type) {
          case 'blessing_stone':
            result.blessingStoneCount += slot.material.count;
            break;
          case 'protection_scroll':
            result.useProtectionScroll = true;
            break;
          case 'lucky_stone':
            result.luckyStoneCount += slot.material.count;
            break;
        }
      }
    }

    return result;
  }

  /**
   * 清空所有槽位
   */
  clearAll() {
    for (let i = 0; i < this.slotCount; i++) {
      this.removeMaterial(i);
    }
  }

  /**
   * 材料变化回调（可被外部覆盖）
   */
  onMaterialsChange() {
    // 默认空实现，由外部设置
  }

  /**
   * 销毁管理器
   */
  destroy() {
    this.slots = [];
    this.container = null;
  }
}
