/**
 * GemSocketManager - 宝石槽位管理器
 * 
 * 渲染装备的宝石槽位，显示空槽位和已镶嵌槽位状态
 * 使用精灵图渲染宝石图标，显示宝石信息
 */

export class GemSocketManager {
  constructor(gemPanel) {
    this.gemPanel = gemPanel;
    this.forgeUI = gemPanel.forgeUI;
    this.selectedItem = null;
  }

  /**
   * 渲染宝石槽位管理界面
   * @param {HTMLElement} containerElement - 容器元素
   * @param {Object} item - 装备对象
   */
  render(containerElement, item) {
    if (!item) {
      containerElement.innerHTML = '<p class="forge-placeholder">选择一件装备来镶嵌宝石</p>';
      return;
    }
    
    this.selectedItem = item;
    
    const game = window.game;
    const loader = game?.loader;
    const sockets = item.meta?.sockets || [];
    
    // 获取装备图标
    let itemIconHtml = this.renderEquipmentIcon(item, loader);
    
    const itemName = this.forgeUI.blacksmithSystem.getItemDisplayName(item);
    const itemColor = this.forgeUI.blacksmithSystem.getItemQualityColor(item);
    
    // 渲染槽位列表
    let socketHtml = '';
    if (sockets.length === 0) {
      socketHtml = '<p class="forge-placeholder">该装备没有镶嵌槽</p>';
    } else {
      socketHtml = '<div class="socket-list">';
      sockets.forEach((socket, index) => {
        socketHtml += this.renderSocketSlot(socket, index, loader);
      });
      socketHtml += '</div>';
    }
    
    // 打孔功能
    const unlockHtml = this.renderUnlockSection(item, sockets.length);
    
    containerElement.innerHTML = `
      <div class="detail-section">
        <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 15px;">
          ${itemIconHtml}
          <div>
            <h4 style="color: ${itemColor}; margin: 0;">${itemName}</h4>
            <div style="font-size: 12px; color: #aaa; margin-top: 5px;">
              镶嵌槽: ${sockets.length} 个
            </div>
          </div>
        </div>
      </div>

      <div class="detail-section socket-panel">
        <h4>镶嵌槽位</h4>
        ${socketHtml}
      </div>
      
      ${unlockHtml}
    `;
    
    // 绑定事件
    this.bindSocketEvents(item);
  }

  /**
   * 渲染装备图标
   * @param {Object} item - 装备对象
   * @param {Object} loader - 资源加载器
   * @returns {string} 图标HTML
   */
  renderEquipmentIcon(item, loader) {
    if (!loader) return '';
    
    const equipImg = loader.getImage('ICONS_EQUIP');
    if (!equipImg || !equipImg.complete) return '';
    
    const iconIndex = item.iconIndex || 0;
    const cols = 4;
    const cellW = equipImg.width / cols;
    const cellH = equipImg.height / 4;
    const col = iconIndex % cols;
    const row = Math.floor(iconIndex / cols);
    
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(equipImg, col * cellW, row * cellH, cellW, cellH, 0, 0, 64, 64);
    
    return canvas.outerHTML;
  }

  /**
   * 渲染单个槽位
   * @param {Object} socket - 槽位对象
   * @param {number} index - 槽位索引
   * @param {Object} loader - 资源加载器
   * @returns {string} 槽位HTML
   */
  renderSocketSlot(socket, index, loader) {
    // 渲染槽位背景
    const socketImg = loader?.getImage('UI_SOCKET');
    let socketBgHtml = '';
    
    if (socketImg && socketImg.complete) {
      const canvas = document.createElement('canvas');
      canvas.width = 80;
      canvas.height = 80;
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(socketImg, 0, 0, 80, 80);
      socketBgHtml = canvas.outerHTML;
    }
    
    if (socket.status === 'FILLED' && socket.gemId) {
      // 已镶嵌宝石
      return this.renderFilledSocket(socket, index, socketBgHtml, loader);
    } else {
      // 空槽位
      return this.renderEmptySocket(index, socketBgHtml);
    }
  }

  /**
   * 渲染已镶嵌的槽位
   * @param {Object} socket - 槽位对象
   * @param {number} index - 槽位索引
   * @param {string} socketBgHtml - 背景HTML
   * @param {Object} loader - 资源加载器
   * @returns {string} 槽位HTML
   */
  renderFilledSocket(socket, index, socketBgHtml, loader) {
    const gemImg = loader?.getImage('ICONS_GEMS');
    let gemIconHtml = '<canvas class="gem-icon" width="60" height="60"></canvas>';
    
    // 异步渲染宝石图标
    if (gemImg) {
      this.renderGemIcon(gemImg, socket.gemId, index);
    }
    
    // 获取宝石信息
    const gemInfo = this.getGemInfo(socket.gemId);
    const gemQuality = socket.gemQuality || gemInfo.quality || 'COMMON';
    const removalCost = this.calculateRemovalCost(gemQuality);
    
    return `
      <div class="socket-slot filled quality-${gemQuality}" 
           data-socket-index="${index}" 
           data-gem-id="${socket.gemId}"
           title="${gemInfo.name}\n${gemInfo.description}\n\n点击查看详情">
        ${socketBgHtml}
        ${gemIconHtml}
        <button class="socket-unsocket-btn" 
                data-socket-index="${index}"
                title="移除宝石 (费用: ${removalCost} 金币)">×</button>
        <div class="socket-slot-label">
          <div style="font-size: 10px; color: #aaa;">槽位 ${index + 1}</div>
          <div style="font-size: 11px; color: ${this.getQualityColor(gemQuality)};">
            ${gemInfo.name}
          </div>
        </div>
      </div>
    `;
  }

  /**
   * 渲染空槽位
   * @param {number} index - 槽位索引
   * @param {string} socketBgHtml - 背景HTML
   * @returns {string} 槽位HTML
   */
  renderEmptySocket(index, socketBgHtml) {
    return `
      <div class="socket-slot empty" 
           data-socket-index="${index}"
           title="点击镶嵌宝石">
        ${socketBgHtml}
        <div style="text-align: center; color: #888; font-size: 12px;">空槽位</div>
        <div class="socket-slot-label">槽位 ${index + 1}</div>
      </div>
    `;
  }

  /**
   * 渲染打孔功能区域
   * @param {Object} item - 装备对象
   * @param {number} currentSockets - 当前槽位数量
   * @returns {string} 打孔区域HTML
   */
  renderUnlockSection(item, currentSockets) {
    const player = this.forgeUI.player;
    if (!player) return '';
    
    // 检查钻头数量
    let drillCount = 0;
    if (player.inventory) {
      player.inventory.forEach(invItem => {
        if (invItem && (invItem.itemId === 'ITEM_STARDUST_DRILL' || invItem.id === 'ITEM_STARDUST_DRILL')) {
          drillCount += (invItem.count || 1);
        }
      });
    }
    
    const unlockCost = currentSockets + 1;
    const canUnlock = drillCount >= unlockCost;
    
    return `
      <div class="detail-section" style="margin-top: 15px;">
        <h4>打孔功能</h4>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
          <span style="color: #aaa;">解锁第 ${currentSockets + 1} 个槽位</span>
          <span style="color: ${canUnlock ? '#4caf50' : '#e74c3c'};">
            钻头: ${drillCount} / ${unlockCost}
          </span>
        </div>
        <button class="forge-btn forge-btn-enhance" 
                id="btn-unlock-socket" 
                ${!canUnlock ? 'disabled' : ''}>
          使用钻头打孔
        </button>
        <div style="font-size: 12px; color: #666; margin-top: 10px;">
          💡 提示：钻头可以从商店购买或通过击败敌人获得
        </div>
      </div>
    `;
  }

  /**
   * 渲染宝石图标
   * @param {Image} gemImg - 宝石精灵图
   * @param {string} gemId - 宝石ID
   * @param {number} socketIndex - 槽位索引
   */
  renderGemIcon(gemImg, gemId, socketIndex) {
    const render = () => {
      import('../../constants.js').then(module => {
        const EQUIPMENT_DB = module.EQUIPMENT_DB;
        const gemDef = EQUIPMENT_DB[gemId];
        
        if (!gemDef) return;
        
        const iconIndex = gemDef.iconIndex || 0;
        const cols = 5;
        const rows = 4;
        const cellW = Math.floor(gemImg.width / cols);
        const cellH = Math.floor(gemImg.height / rows);
        const col = iconIndex % cols;
        const row = Math.floor(iconIndex / cols);
        
        const sx = Math.round(col * cellW);
        const sy = Math.round(row * cellH);
        
        const canvas = document.createElement('canvas');
        canvas.width = 60;
        canvas.height = 60;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(gemImg, sx, sy, cellW, cellH, 0, 0, 60, 60);
        
        const socketElement = document.querySelector(`[data-socket-index="${socketIndex}"]`);
        if (socketElement) {
          const gemIcon = socketElement.querySelector('.gem-icon');
          if (gemIcon) {
            gemIcon.replaceWith(canvas);
          }
        }
      });
    };
    
    if (gemImg.complete) {
      render();
    } else {
      gemImg.onload = render;
    }
  }

  /**
   * 获取宝石信息
   * @param {string} gemId - 宝石ID
   * @returns {Object} 宝石信息
   */
  getGemInfo(gemId) {
    // 动态导入常量
    const defaultInfo = {
      name: '未知宝石',
      description: '',
      quality: 'COMMON',
      stats: {}
    };
    
    // 这里应该从 EQUIPMENT_DB 获取，但为了避免循环依赖，使用简化版本
    return defaultInfo;
  }

  /**
   * 计算移除费用
   * @param {string} quality - 宝石品质
   * @returns {number} 移除费用
   */
  calculateRemovalCost(quality) {
    const costs = {
      'COMMON': 100,
      'UNCOMMON': 200,
      'RARE': 500,
      'EPIC': 1000,
      'LEGENDARY': 2000,
      'MYTHIC': 5000
    };
    return costs[quality] || 100;
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
   * 绑定槽位事件
   * @param {Object} item - 装备对象
   */
  bindSocketEvents(item) {
    const game = window.game;
    const tooltipManager = game?.tooltipManager;
    
    // 空槽位点击事件 - 打开宝石选择
    const emptySockets = document.querySelectorAll('.socket-slot.empty');
    emptySockets.forEach(socket => {
      socket.addEventListener('click', () => {
        const index = parseInt(socket.dataset.socketIndex);
        this.openGemSelection(item, index);
      });
    });
    
    // 已镶嵌槽位的移除按钮
    const unsocketBtns = document.querySelectorAll('.socket-unsocket-btn');
    unsocketBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const index = parseInt(btn.dataset.socketIndex);
        this.handleUnsocket(item, index);
      });
    });
    
    // 已镶嵌槽位的 tooltip
    const filledSockets = document.querySelectorAll('.socket-slot.filled');
    filledSockets.forEach(socket => {
      const gemId = socket.dataset.gemId;
      if (gemId && tooltipManager) {
        tooltipManager.bind(socket, gemId);
      }
    });
    
    // 打孔按钮
    const unlockBtn = document.getElementById('btn-unlock-socket');
    if (unlockBtn) {
      unlockBtn.addEventListener('click', () => this.handleUnlockSocket(item));
    }
  }

  /**
   * 打开宝石选择模态框
   * @param {Object} item - 装备对象
   * @param {number} socketIndex - 槽位索引
   */
  openGemSelection(item, socketIndex) {
    // 延迟加载 GemSelectionModal
    import('./GemSelectionModal.js').then(module => {
      const modal = new module.GemSelectionModal(this);
      modal.show(item, socketIndex);
    });
  }

  /**
   * 处理宝石镶嵌
   * @param {Object} item - 装备对象
   * @param {number} socketIndex - 槽位索引
   * @param {Object} gemItem - 宝石对象
   */
  handleSocket(item, socketIndex, gemItem) {
    const player = this.forgeUI.player;
    if (!player || !item || !gemItem) return;
    
    const result = this.forgeUI.blacksmithSystem.socketGem(item, socketIndex, gemItem, player);
    
    if (result.success) {
      this.forgeUI.showMessage(result.message, 'success');
      
      // 刷新UI
      this.forgeUI.renderItemList();
      this.render(this.gemPanel.forgeUI.elements.itemDetails, item);
      
      // 更新游戏UI
      const game = window.game;
      if (game && game.ui) {
        game.ui.updateStats(player);
        game.ui.updateEquipmentSockets(player);
      }
    } else {
      this.forgeUI.showMessage(result.message, 'error');
    }
  }

  /**
   * 处理宝石移除
   * @param {Object} item - 装备对象
   * @param {number} socketIndex - 槽位索引
   */
  handleUnsocket(item, socketIndex) {
    const player = this.forgeUI.player;
    if (!player || !item) return;
    
    const socket = item.meta?.sockets?.[socketIndex];
    if (!socket || socket.status !== 'FILLED') {
      this.forgeUI.showMessage('该槽位没有宝石', 'error');
      return;
    }
    
    const gemQuality = socket.gemQuality || 'COMMON';
    const unsocketCost = this.calculateRemovalCost(gemQuality);
    
    if (player.stats.gold < unsocketCost) {
      this.forgeUI.showMessage(`金币不足！需要 ${unsocketCost} 金币`, 'error');
      return;
    }
    
    if (!confirm(`确定要移除宝石吗？\n费用: ${unsocketCost} 金币`)) {
      return;
    }
    
    const result = this.forgeUI.blacksmithSystem.unsocketGem(item, socketIndex, player, unsocketCost);
    
    if (result.success) {
      this.forgeUI.showMessage(result.message, 'success');
      
      // 刷新UI
      this.forgeUI.renderItemList();
      this.render(this.gemPanel.forgeUI.elements.itemDetails, item);
      
      // 更新游戏UI
      const game = window.game;
      if (game && game.ui) {
        game.ui.updateStats(player);
        game.ui.updateEquipmentSockets(player);
        game.ui.renderInventory?.(player);
      }
    } else {
      this.forgeUI.showMessage(result.message, 'error');
    }
  }

  /**
   * 处理打孔
   * @param {Object} item - 装备对象
   */
  handleUnlockSocket(item) {
    const player = this.forgeUI.player;
    if (!player || !item) return;
    
    // 播放音效
    const game = window.game;
    if (game && game.audio && typeof game.audio.playForge === 'function') {
      game.audio.playForge();
    }
    
    const result = this.forgeUI.blacksmithSystem.unlockSocket(item, player);
    
    if (result.success) {
      this.forgeUI.showMessage(result.message, 'success');
      
      // 刷新UI
      this.forgeUI.renderItemList();
      this.render(this.gemPanel.forgeUI.elements.itemDetails, item);
      
      // 更新游戏UI
      if (game && game.ui) {
        game.ui.renderInventory?.(player);
      }
    } else {
      this.forgeUI.showMessage(result.message, 'error');
    }
  }
}
