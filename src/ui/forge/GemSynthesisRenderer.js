/**
 * GemSynthesisRenderer - 宝石合成渲染器
 * 
 * 显示所有可合成的宝石组合
 * 显示所需材料、成功率和结果
 * 使用精灵图渲染宝石图标
 */

export class GemSynthesisRenderer {
  constructor(gemPanel) {
    this.gemPanel = gemPanel;
    this.forgeUI = gemPanel.forgeUI;
  }

  /**
   * 渲染宝石合成界面
   * @param {HTMLElement} containerElement - 容器元素
   */
  render(containerElement) {
    const player = this.forgeUI.player;
    if (!player) {
      containerElement.innerHTML = '<p class="forge-placeholder">无法获取玩家数据</p>';
      return;
    }
    
    // 获取背包中的所有宝石
    const gems = this.getPlayerGems(player);
    
    // 统计每种宝石的数量
    const gemCounts = this.countGems(gems);
    
    // 筛选出可以合成的宝石
    const synthesizableGems = this.getSynthesizableGems(gemCounts);
    
    // 渲染界面
    containerElement.innerHTML = `
      <div class="detail-section">
        <h4>宝石合成</h4>
        <p style="color: #aaa; font-size: 14px; margin-bottom: 15px;">
          消耗 3 颗相同的宝石，合成 1 颗更高等级的宝石。
          <br>最高可合成至 5 级 (Mythic)。
        </p>
        ${this.renderSynthesisList(synthesizableGems, gemCounts)}
      </div>
    `;
    
    // 绑定事件
    this.bindEvents(synthesizableGems);
    
    // 渲染图标
    this.renderGemIcons(synthesizableGems);
  }

  /**
   * 获取玩家的宝石
   * @param {Object} player - 玩家对象
   * @returns {Array} 宝石数组
   */
  getPlayerGems(player) {
    if (!player.inventory) return [];
    
    return player.inventory.filter(item => item && item.type === 'GEM');
  }

  /**
   * 统计宝石数量
   * @param {Array} gems - 宝石数组
   * @returns {Object} 宝石数量统计
   */
  countGems(gems) {
    const counts = {};
    
    gems.forEach(gem => {
      const id = gem.itemId || gem.id;
      if (!counts[id]) {
        counts[id] = {
          item: gem,
          count: 0
        };
      }
      counts[id].count += (gem.count || 1);
    });
    
    return counts;
  }

  /**
   * 获取可合成的宝石
   * @param {Object} gemCounts - 宝石数量统计
   * @returns {Array} 可合成的宝石数组
   */
  getSynthesizableGems(gemCounts) {
    return Object.values(gemCounts).filter(entry => {
      const tier = entry.item.tier || 1;
      return entry.count >= 3 && tier < 5; // 需要3颗且不是最高级
    });
  }

  /**
   * 渲染合成列表
   * @param {Array} synthesizableGems - 可合成的宝石数组
   * @param {Object} gemCounts - 宝石数量统计
   * @returns {string} HTML字符串
   */
  renderSynthesisList(synthesizableGems, gemCounts) {
    if (synthesizableGems.length === 0) {
      return `
        <div class="forge-placeholder">
          <p>没有可合成的宝石</p>
          <small style="color: #666;">需要 3 颗相同的宝石才能合成更高一级的宝石</small>
        </div>
      `;
    }
    
    // 排序：按等级、品质
    synthesizableGems.sort((a, b) => {
      const tierA = a.item.tier || 1;
      const tierB = b.item.tier || 1;
      if (tierA !== tierB) return tierA - tierB;
      
      const qualityOrder = { 'COMMON': 0, 'UNCOMMON': 1, 'RARE': 2, 'EPIC': 3, 'LEGENDARY': 4, 'MYTHIC': 5 };
      const qualityA = qualityOrder[a.item.quality] || 0;
      const qualityB = qualityOrder[b.item.quality] || 0;
      return qualityA - qualityB;
    });
    
    let html = '<div class="gem-synthesis-list">';
    
    synthesizableGems.forEach(entry => {
      html += this.renderSynthesisRow(entry);
    });
    
    html += '</div>';
    
    return html;
  }

  /**
   * 渲染单个合成行
   * @param {Object} entry - 宝石条目
   * @returns {string} HTML字符串
   */
  renderSynthesisRow(entry) {
    const gem = entry.item;
    const count = entry.count;
    const tier = gem.tier || 1;
    const nextTier = tier + 1;
    const gemId = gem.itemId || gem.id;
    
    const baseName = gem.nameZh || gem.name || '未知宝石';
    const quality = gem.quality || 'COMMON';
    const qualityColor = this.getQualityColor(quality);
    
    // 计算可合成次数
    const maxSynthesis = Math.floor(count / 3);
    
    // 获取下一级宝石的品质（通常提升一级）
    const nextQuality = this.getNextQuality(quality);
    const nextQualityColor = this.getQualityColor(nextQuality);
    
    return `
      <div class="synthesis-row">
        <div class="synthesis-gem-info">
          <div class="synthesis-icon-wrapper" data-gem-id="${gemId}">
            <canvas class="synthesis-icon" width="60" height="60" data-gem-id="${gemId}"></canvas>
            <div class="synthesis-count">×${count}</div>
          </div>
          <div class="synthesis-details">
            <span class="synthesis-name" style="color: ${qualityColor};">
              ${baseName}
            </span>
            <span class="synthesis-tier" style="font-size: 12px; color: #aaa;">
              等级 ${tier} ➤ <span style="color: ${nextQualityColor};">等级 ${nextTier}</span>
            </span>
            <span class="synthesis-info" style="font-size: 11px; color: #666;">
              可合成 ${maxSynthesis} 次
            </span>
          </div>
        </div>
        <div class="synthesis-action">
          <button class="forge-btn forge-btn-enhance synthesis-btn" 
                  data-gem-id="${gemId}"
                  title="消耗 3 颗 ${baseName}，合成 1 颗更高等级的宝石">
            合成 (3→1)
          </button>
        </div>
      </div>
    `;
  }

  /**
   * 渲染宝石图标
   * @param {Array} synthesizableGems - 可合成的宝石数组
   */
  renderGemIcons(synthesizableGems) {
    const game = window.game;
    const loader = game?.loader;
    const gemImg = loader?.getImage('ICONS_GEMS');
    
    if (!gemImg) return;
    
    const render = () => {
      synthesizableGems.forEach(entry => {
        const gem = entry.item;
        const gemId = gem.itemId || gem.id;
        const canvas = document.querySelector(`canvas.synthesis-icon[data-gem-id="${gemId}"]`);
        
        if (!canvas) return;
        
        const iconIndex = gem.iconIndex || 0;
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
   * @param {Array} synthesizableGems - 可合成的宝石数组
   */
  bindEvents(synthesizableGems) {
    const synthesisBtns = document.querySelectorAll('.synthesis-btn');
    
    synthesisBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const gemId = btn.dataset.gemId;
        const entry = synthesizableGems.find(e => (e.item.itemId || e.item.id) === gemId);
        
        if (entry) {
          this.handleSynthesis(entry.item);
        }
      });
    });
  }

  /**
   * 处理宝石合成
   * @param {Object} gemItem - 宝石对象
   */
  handleSynthesis(gemItem) {
    const player = this.forgeUI.player;
    if (!player || !gemItem) return;
    
    // 播放音效
    const game = window.game;
    if (game && game.audio && typeof game.audio.playForge === 'function') {
      game.audio.playForge();
    }
    
    const result = this.forgeUI.blacksmithSystem.synthesizeGem(gemItem, player);
    
    if (result.success) {
      this.forgeUI.showMessage(result.message, 'success');
      
      // 刷新合成面板
      const containerElement = this.gemPanel.forgeUI.elements.itemDetails;
      if (containerElement) {
        this.render(containerElement);
      }
      
      // 刷新左侧列表（宝石数量变化）
      this.forgeUI.renderItemList();
      
      // 更新游戏UI
      if (game && game.ui) {
        game.ui.renderInventory?.(player);
      }
    } else {
      this.forgeUI.showMessage(result.message, 'error');
    }
  }

  /**
   * 获取下一级品质
   * @param {string} quality - 当前品质
   * @returns {string} 下一级品质
   */
  getNextQuality(quality) {
    const qualityProgression = {
      'COMMON': 'UNCOMMON',
      'UNCOMMON': 'RARE',
      'RARE': 'EPIC',
      'EPIC': 'LEGENDARY',
      'LEGENDARY': 'MYTHIC',
      'MYTHIC': 'MYTHIC'
    };
    return qualityProgression[quality] || quality;
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
}
