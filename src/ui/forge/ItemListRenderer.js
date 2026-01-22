// ItemListRenderer.js - 装备列表渲染器
// 使用InventoryBinder渲染装备列表，支持图标显示和强化等级标识

import { spriteManager } from './SpriteManager.js';

/**
 * ItemListRenderer - 装备列表渲染器
 * 负责渲染装备列表，包括图标、强化等级等
 */
export class ItemListRenderer {
  constructor(inventoryBinder, blacksmithSystem) {
    this.inventoryBinder = inventoryBinder;
    this.blacksmithSystem = blacksmithSystem;
  }

  /**
   * 渲染装备列表
   * @param {HTMLElement} container - 容器元素
   * @param {Function} onItemClick - 点击回调
   */
  async render(container, onItemClick) {
    if (!container) return;

    container.innerHTML = '';

    // 获取所有装备
    const equippedItems = this.inventoryBinder.getEquippedItems();
    const inventoryItems = this.inventoryBinder.getInventoryEquipment();

    // 渲染已装备物品
    if (equippedItems.length > 0) {
      const equippedTitle = document.createElement('h3');
      equippedTitle.className = 'panel-subtitle';
      equippedTitle.textContent = '已装备物品';
      container.appendChild(equippedTitle);

      for (const data of equippedItems) {
        const card = await this.createItemCard(data, onItemClick);
        container.appendChild(card);
      }
    }

    // 渲染背包物品
    if (inventoryItems.length > 0) {
      // 添加分割线
      const divider = document.createElement('div');
      divider.className = 'forge-list-divider';
      container.appendChild(divider);

      const inventoryTitle = document.createElement('h3');
      inventoryTitle.className = 'panel-subtitle';
      inventoryTitle.textContent = '背包物品';
      container.appendChild(inventoryTitle);

      for (const data of inventoryItems) {
        const card = await this.createItemCard(data, onItemClick);
        container.appendChild(card);
      }
    }

    // 如果没有装备
    if (equippedItems.length === 0 && inventoryItems.length === 0) {
      const placeholder = document.createElement('p');
      placeholder.className = 'forge-placeholder';
      placeholder.textContent = '没有可操作的装备';
      container.appendChild(placeholder);
    }
  }

  /**
   * 创建装备卡片
   * @param {Object} data - 装备数据 {uid, item, slot/index, source}
   * @param {Function} onItemClick - 点击回调
   * @returns {Promise<HTMLElement>} 卡片元素
   */
  async createItemCard(data, onItemClick) {
    const { item, source, slot, index } = data;

    const card = document.createElement('div');
    card.className = 'forge-item-card';
    card.dataset.uid = item.uid || item.id;
    card.dataset.source = source;
    if (slot) card.dataset.slot = slot;
    if (index !== undefined) card.dataset.index = index;

    // 创建卡片内容容器
    const content = document.createElement('div');
    content.className = 'forge-item-card-content';

    // 左侧：装备图标
    const iconContainer = document.createElement('div');
    iconContainer.className = 'forge-item-icon-container';

    try {
      // 尝试使用精灵图渲染图标
      const icon = await this.renderItemIcon(item);
      iconContainer.appendChild(icon);
    } catch (error) {
      // 回退到emoji图标
      const fallbackIcon = this.createFallbackIcon(item);
      iconContainer.appendChild(fallbackIcon);
    }

    // 添加强化等级标识
    if (item.enhanceLevel && item.enhanceLevel > 0) {
      const enhanceLabel = document.createElement('div');
      enhanceLabel.className = 'forge-item-enhance-label';
      enhanceLabel.textContent = `+${item.enhanceLevel}`;
      iconContainer.appendChild(enhanceLabel);
    }

    content.appendChild(iconContainer);

    // 右侧：装备信息
    const info = document.createElement('div');
    info.className = 'forge-item-info';

    const name = document.createElement('div');
    name.className = 'forge-item-name';
    name.textContent = this.blacksmithSystem.getItemDisplayName(item);
    name.style.color = this.blacksmithSystem.getItemQualityColor(item);

    const type = document.createElement('div');
    type.className = 'forge-item-type';
    type.textContent = this.getItemTypeText(item.type);

    // 添加来源标识
    const sourceLabel = document.createElement('div');
    sourceLabel.className = 'forge-item-source';
    sourceLabel.textContent = source === 'equipped' ? `[${this.getSlotName(slot)}]` : '[背包]';

    info.appendChild(name);
    info.appendChild(type);
    info.appendChild(sourceLabel);

    content.appendChild(info);
    card.appendChild(content);

    // 点击事件
    card.addEventListener('click', () => {
      if (onItemClick) {
        onItemClick(item, data);
      }
    });

    return card;
  }

  /**
   * 渲染装备图标（使用精灵图）
   * @param {Object} item - 装备对象
   * @returns {Promise<HTMLElement>} 图标元素
   */
  async renderItemIcon(item) {
    // TODO: 根据装备类型和ID确定精灵图帧索引
    // 这里需要一个映射表，将装备ID映射到精灵图帧
    
    // 暂时使用回退方案
    throw new Error('精灵图映射未实现');
  }

  /**
   * 创建回退图标（使用emoji）
   * @param {Object} item - 装备对象
   * @returns {HTMLElement} 图标元素
   */
  createFallbackIcon(item) {
    const icon = document.createElement('div');
    icon.className = 'forge-item-icon-fallback';
    icon.textContent = this.getItemEmoji(item.type);
    return icon;
  }

  /**
   * 获取装备类型对应的emoji
   * @param {string} type - 装备类型
   * @returns {string} emoji
   */
  getItemEmoji(type) {
    const emojiMap = {
      'WEAPON': '⚔️',
      'ARMOR': '🛡️',
      'HELM': '⛑️',
      'BOOTS': '👢',
      'RING': '💍',
      'AMULET': '📿',
      'ACCESSORY': '✨'
    };
    return emojiMap[type] || '❓';
  }

  /**
   * 获取装备类型文本
   * @param {string} type - 装备类型
   * @returns {string} 类型文本
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
   * 获取槽位名称
   * @param {string} slot - 槽位
   * @returns {string} 槽位名称
   */
  getSlotName(slot) {
    return this.getItemTypeText(slot);
  }
}
