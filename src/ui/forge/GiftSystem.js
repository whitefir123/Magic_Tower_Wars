/**
 * GiftSystem - 送礼系统
 * 
 * 处理向铁匠NPC送礼的功能
 */

export class GiftSystem {
  constructor(npcRenderer) {
    this.npcRenderer = npcRenderer;
    this.giftModal = null;
  }

  /**
   * 显示礼物选择界面
   */
  showGiftSelection() {
    this.createGiftModal();
    this.renderGiftList();
  }

  /**
   * 创建礼物选择模态框
   */
  createGiftModal() {
    // 如果已存在，先移除
    if (this.giftModal) {
      this.giftModal.remove();
    }
    
    this.giftModal = document.createElement('div');
    this.giftModal.className = 'gift-selection-modal';
    this.giftModal.innerHTML = `
      <div class="gift-modal-content">
        <div class="gift-modal-header">
          <h3>选择礼物</h3>
          <button class="gift-modal-close">×</button>
        </div>
        <div class="gift-list"></div>
      </div>
    `;
    
    // 添加到forge-overlay中，确保在正确的层级
    const forgeOverlay = document.getElementById('forge-overlay');
    if (forgeOverlay) {
      forgeOverlay.appendChild(this.giftModal);
    } else {
      document.body.appendChild(this.giftModal);
    }
    
    // 绑定关闭按钮
    const closeBtn = this.giftModal.querySelector('.gift-modal-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.hideGiftSelection());
    }
    
    // 点击背景关闭
    this.giftModal.addEventListener('click', (e) => {
      if (e.target === this.giftModal) {
        this.hideGiftSelection();
      }
    });
    
    // 添加淡入动画
    setTimeout(() => {
      if (this.giftModal) {
        this.giftModal.classList.add('modal-fade-in');
      }
    }, 10);
  }

  /**
   * 渲染礼物列表
   */
  renderGiftList() {
    if (!this.giftModal) return;
    
    const listEl = this.giftModal.querySelector('.gift-list');
    if (!listEl) return;
    
    const player = this.getPlayer();
    if (!player) {
      listEl.innerHTML = '<p class="no-gifts">玩家数据未找到</p>';
      return;
    }
    
    const giftableItems = this.getGiftableItems(player);
    
    if (giftableItems.length === 0) {
      listEl.innerHTML = '<p class="no-gifts">没有可赠送的物品</p>';
      return;
    }
    
    listEl.innerHTML = '';
    giftableItems.forEach(item => {
      const itemEl = this.createGiftItemElement(item);
      listEl.appendChild(itemEl);
    });
  }

  /**
   * 获取可赠送的物品
   * @param {Object} player - 玩家对象
   * @returns {Array} 可赠送物品列表
   */
  getGiftableItems(player) {
    const giftable = [];
    
    if (!player.inventory || !Array.isArray(player.inventory)) {
      return giftable;
    }
    
    // 从背包中筛选可赠送物品
    player.inventory.forEach((itemOrId, index) => {
      if (!itemOrId) return;
      
      // 获取物品对象
      let item = null;
      if (typeof itemOrId === 'string') {
        // 如果是字符串ID，从EQUIPMENT_DB获取
        const EQUIPMENT_DB = window.EQUIPMENT_DB || {};
        item = EQUIPMENT_DB[itemOrId];
        if (item) {
          item = { ...item, id: itemOrId };
        }
      } else if (typeof itemOrId === 'object') {
        // 如果已经是对象
        item = itemOrId;
      }
      
      if (item && this.isGiftable(item)) {
        giftable.push({ item, index });
      }
    });
    
    return giftable;
  }

  /**
   * 判断物品是否可赠送
   * @param {Object} item - 物品对象
   * @returns {boolean} 是否可赠送
   */
  isGiftable(item) {
    if (!item || typeof item !== 'object') {
      return false;
    }
    
    // 装备、消耗品、材料都可以赠送
    const giftableTypes = ['WEAPON', 'ARMOR', 'HELM', 'BOOTS', 'RING', 'AMULET', 'ACCESSORY', 'CONSUMABLE', 'MATERIAL'];
    return giftableTypes.includes(item.type);
  }

  /**
   * 创建礼物物品元素
   * @param {Object} giftData - 礼物数据 { item, index }
   * @returns {HTMLElement} 礼物元素
   */
  createGiftItemElement(giftData) {
    const { item, index } = giftData;
    const affinityGain = this.calculateAffinityGain(item);
    
    const itemEl = document.createElement('div');
    itemEl.className = 'gift-item';
    
    // 获取品质类名和颜色
    const quality = item.quality || 'COMMON';
    const qualityClass = `quality-${quality}`;
    const qualityColor = this.getQualityColor(quality);
    
    // 创建物品图标（使用Canvas渲染，与背包一致）
    const iconCanvas = this.createItemIcon(item);
    
    itemEl.innerHTML = `
      <div class="gift-item-icon-wrapper ${qualityClass}" style="border-color: ${qualityColor};">
        ${iconCanvas ? iconCanvas.outerHTML : '<div class="gift-item-icon-placeholder">?</div>'}
      </div>
      <div class="gift-item-info">
        <div class="gift-item-name ${qualityClass}">
          ${item.displayName || item.name || '未知物品'}
        </div>
        <div class="gift-item-affinity">好感度 +${affinityGain}</div>
      </div>
      <button class="gift-item-btn">赠送</button>
    `;
    
    // 绑定赠送按钮
    const btn = itemEl.querySelector('.gift-item-btn');
    if (btn) {
      btn.addEventListener('click', () => this.giveGift(item, index, affinityGain));
    }
    
    return itemEl;
  }

  /**
   * 创建物品图标（Canvas渲染）
   * @param {Object} item - 物品对象
   * @returns {HTMLCanvasElement|null} Canvas元素
   */
  createItemIcon(item) {
    const loader = window.game?.loader;
    if (!loader) return null;
    
    // 根据物品类型选择精灵图
    let spriteImage = null;
    let iconIndex = item.iconIndex || 0;
    
    if (item.type === 'GEM') {
      spriteImage = loader.getImage('ICONS_GEMS');
    } else if (item.type === 'CONSUMABLE' || item.type === 'MATERIAL') {
      spriteImage = loader.getImage('ICONS_CONSUMABLES');
    } else {
      // 装备类型
      spriteImage = loader.getImage('ICONS_EQUIP');
    }
    
    if (!spriteImage) return null;
    
    // 创建Canvas
    const canvas = document.createElement('canvas');
    canvas.width = 48;
    canvas.height = 48;
    canvas.className = 'gift-item-icon-canvas';
    
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    
    // 计算精灵图中的位置
    const cols = 4; // 假设精灵图是4列
    const natW = spriteImage.naturalWidth || spriteImage.width;
    const natH = spriteImage.naturalHeight || spriteImage.height;
    const cellW = natW / cols;
    const cellH = natH / 4; // 假设4行
    
    const col = iconIndex % cols;
    const row = Math.floor(iconIndex / cols);
    
    const sx = col * cellW;
    const sy = row * cellH;
    
    // 绘制图标
    ctx.drawImage(
      spriteImage,
      sx, sy, cellW, cellH,
      0, 0, canvas.width, canvas.height
    );
    
    return canvas;
  }

  /**
   * 获取品质颜色
   * @param {string} quality - 品质
   * @returns {string} 颜色值
   */
  getQualityColor(quality) {
    const ITEM_QUALITY = window.ITEM_QUALITY || {};
    return ITEM_QUALITY[quality]?.color || '#666';
  }

  /**
   * 计算好感度增加值
   * @param {Object} item - 物品对象
   * @returns {number} 好感度增加值
   */
  calculateAffinityGain(item) {
    const qualityMultipliers = {
      'COMMON': 5,
      'UNCOMMON': 10,
      'RARE': 20,
      'EPIC': 40,
      'LEGENDARY': 80,
      'MYTHIC': 150
    };
    
    const baseGain = qualityMultipliers[item.quality] || 5;
    
    // 装备类型额外加成
    const equipmentTypes = ['WEAPON', 'ARMOR', 'HELM', 'BOOTS', 'RING', 'AMULET', 'ACCESSORY'];
    if (equipmentTypes.includes(item.type)) {
      return Math.floor(baseGain * 1.5);
    }
    
    return baseGain;
  }

  /**
   * 赠送礼物
   * @param {Object} item - 物品对象
   * @param {number} inventoryIndex - 背包索引
   * @param {number} affinityGain - 好感度增加值
   */
  giveGift(item, inventoryIndex, affinityGain) {
    const player = this.getPlayer();
    if (!player) {
      console.warn('玩家数据未找到');
      return;
    }
    
    const blacksmithNPC = this.getBlacksmithNPC();
    if (!blacksmithNPC) {
      console.warn('BlacksmithNPC未初始化');
      return;
    }
    
    // 从背包移除物品
    player.inventory.splice(inventoryIndex, 1);
    
    // 增加好感度（飘字由AffinityDisplay自动处理）
    blacksmithNPC.affinity += affinityGain;
    
    // 获取反馈对话
    const dialogue = blacksmithNPC.getDialogue('gift_thanks');
    
    // 显示反馈消息
    this.showMessage(dialogue);
    
    // 更新NPC显示
    if (this.npcRenderer) {
      this.npcRenderer.update();
    }
    
    // 关闭礼物选择
    this.hideGiftSelection();
    
    // 播放音效
    if (window.AudioManager && typeof window.AudioManager.playGift === 'function') {
      window.AudioManager.playGift();
    } else if (window.AudioManager && typeof window.AudioManager.playSuccess === 'function') {
      window.AudioManager.playSuccess();
    }
  }

  /**
   * 显示消息提示
   * @param {string} message - 消息内容
   */
  showMessage(message) {
    if (this.npcRenderer && this.npcRenderer.forgeUI) {
      if (typeof this.npcRenderer.forgeUI.showMessage === 'function') {
        this.npcRenderer.forgeUI.showMessage(message);
      } else {
        console.log(message);
      }
    }
  }

  /**
   * 隐藏礼物选择
   */
  hideGiftSelection() {
    if (this.giftModal) {
      // 添加淡出动画
      this.giftModal.classList.remove('modal-fade-in');
      this.giftModal.classList.add('modal-fade-out');
      
      // 动画结束后移除元素
      setTimeout(() => {
        if (this.giftModal && this.giftModal.parentElement) {
          this.giftModal.parentElement.removeChild(this.giftModal);
        }
        this.giftModal = null;
      }, 300);
    }
  }

  /**
   * 获取玩家对象
   * @returns {Object|null} 玩家对象
   */
  getPlayer() {
    if (!this.npcRenderer || !this.npcRenderer.forgeUI) {
      return null;
    }
    return this.npcRenderer.forgeUI.player;
  }

  /**
   * 获取BlacksmithNPC实例
   * @returns {Object|null} BlacksmithNPC实例
   */
  getBlacksmithNPC() {
    if (!this.npcRenderer || !this.npcRenderer.forgeUI) {
      return null;
    }
    
    const blacksmithSystem = this.npcRenderer.forgeUI.blacksmithSystem;
    if (!blacksmithSystem || !blacksmithSystem.blacksmithNPC) {
      return null;
    }
    
    return blacksmithSystem.blacksmithNPC;
  }

  /**
   * 清理资源
   */
  cleanup() {
    this.hideGiftSelection();
  }
}
