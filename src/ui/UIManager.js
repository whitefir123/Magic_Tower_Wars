// UIManager.js - 主 UI 管理器
// 负责协调各个 UI 组件，提供公共接口，不负责具体 DOM 渲染

import { TILE_SIZE, ICON_GRID_COLS, ICON_GRID_ROWS, EQUIPMENT_DB, ASSETS, RUNE_RARITY_MULTIPLIERS } from '../constants.js';
import { FLOOR_ZONES } from '../data/config.js';
import { Mascot } from './Mascot.js';
import { OverlayManager } from './OverlayManager.js';
import { InventoryUI } from './InventoryUI.js';
import { BestiaryUI } from './BestiaryUI.js';
import { ShopUI } from './ShopUI.js';
import { GamblerUI } from './GamblerUI.js';
import { PatchNotesUI } from './PatchNotesUI.js';
import { QuestUI } from './QuestUI.js';
import { globalTooltipManager } from '../utils/TooltipManager.js';
import { DailyChallengeSystem } from '../systems/DailyChallengeSystem.js';
import { supabaseService } from '../services/SupabaseService.js';

/**
 * UIManager - 主 UI 管理器
 * 协调各个 UI 组件，提供统一的公共接口
 * 不包含具体的 DOM 操作，所有渲染逻辑都委托给各个组件
 */
export class UIManager {
  constructor() {
    // ✅ FIX: 检测当前页面环境（index.html 或 game.html）
    this.isGamePage = window.location.pathname.endsWith('game.html') || 
                       window.location.href.includes('game.html');
    this.isIndexPage = !this.isGamePage;
    
    // 日志系统相关 (仅在 game.html 中存在)
    this.logPanel = document.getElementById('log-panel');
    this.relicBar = document.getElementById('relic-bar');
    this.container = document.getElementById('system-log-container');
    this.logTimer = null;
    this.isLogLocked = false;
    
    // ✅ FIX: 验证游戏页面所需元素是否存在
    if (this.isGamePage && (!this.logPanel || !this.container)) {
      console.warn('⚠️ UIManager: 游戏页面缺少必需的DOM元素 (log-panel/system-log-container)');
    }
    
    // 设置日志容器的滚轮事件（仅当在游戏页面时）
    if (this.isGamePage && this.container) {
      this.container.addEventListener('wheel', (e) => {
        // 只有在日志锁定状态下才处理滚轮事件
        if (this.isLogLocked) {
          e.stopPropagation(); // 阻止事件冒泡到 canvas-wrapper，避免触发地图缩放
          // 默认的滚动行为会被浏览器处理，不需要手动滚动
          // 但如果需要更精细的控制，可以手动控制滚动：
          // this.container.scrollTop += e.deltaY;
        }
      }, { passive: true });
    }
    
    // 初始化吉祥物（仅在主菜单页面存在）
    const btnStart = document.getElementById('btn-start-game');
    this.mascot = btnStart ? new Mascot(btnStart) : null;
    
    if (this.isIndexPage && !btnStart) {
      console.warn('⚠️ UIManager: 主菜单页面缺少 btn-start-game 按钮');
    }
    
    // 创建 OverlayManager
    this.overlayManager = new OverlayManager();
    
    // 创建各个 UI 组件（使用独立配置）
    this.inventoryUI = new InventoryUI({
      slotSize: 48,
      equipmentIconSize: 28,
      slotGap: 4,
      enableAnimations: true
    });
    
    this.bestiaryUI = new BestiaryUI({
      listItemHeight: 26,
      fontSize: 14,
      titleFontSize: 18,
      enableAnimations: true
    });
    
    this.shopUI = new ShopUI({
      buttonHeight: 50,
      buttonGap: 10,
      fontSize: 16,
      priceColor: '#ffd700',
      enableAnimations: true
    });
    
    this.gamblerUI = new GamblerUI({
      buttonHeight: 50,
      buttonGap: 10,
      fontSize: 16,
      priceColor: '#ffd700',
      enableAnimations: true
    });
    
    this.patchNotesUI = new PatchNotesUI();
    
    // 注意：QuestUI 需要 game 实例，将在 main.js 中设置
    this.questUI = null;
    
    // 注册弹窗到 OverlayManager
    this.overlayManager.register('inventory', this.inventoryUI);
    this.overlayManager.register('bestiary', this.bestiaryUI);
    this.overlayManager.register('shop', this.shopUI);
    this.overlayManager.register('gambler', this.gamblerUI);
    this.overlayManager.register('patchnotes', this.patchNotesUI);
    
    console.log('✓ UIManager 已初始化（使用独立组件架构）');
  }

  // ========================================================================
  // 公共接口：日志系统
  // ========================================================================

  /**
   * 记录日志消息
   * @param {string} msg - 消息内容
   * @param {string} type - 消息类型（'info', 'warning', 'error'）
   */
  logMessage(msg, type = 'info') {
    // ✅ FIX: 防御性检查 - 如果logPanel不存在（不在游戏页面），输出到控制台并返回
    if (!this.logPanel) {
      console.log(`[Log:${type}] ${msg}`);
      return;
    }
    
    const entry = document.createElement('div');
    entry.className = `log-entry log-${type}`;
    entry.innerHTML = `> ${msg}`;
    this.logPanel.appendChild(entry);

    // 保持列表长度与自动滚动
    requestAnimationFrame(() => {
      try {
        while (this.logPanel.children.length > 20) {
          this.logPanel.firstChild.remove();
        }
      } catch {}
      if (this.container) this.container.scrollTop = this.container.scrollHeight;
    });

    // 显示容器并重置隐藏计时器
    if (this.container) {
      this.container.style.opacity = '1';
      if (this.logTimer) { clearTimeout(this.logTimer); this.logTimer = null; }
      if (!this.isLogLocked) {
        this.logTimer = setTimeout(() => {
          if (!this.isLogLocked && this.container) this.container.style.opacity = '0';
        }, 3000);
      }
    }
  }

  /**
   * 切换日志锁定状态
   */
  toggleLog() {
    // ✅ FIX: 防御性检查 - 如果不在游戏页面，直接返回
    if (!this.container || !this.logPanel) {
      console.log('[Log] Toggle log skipped (not in game page)');
      return;
    }
    
    this.isLogLocked = !this.isLogLocked;
    if (this.container) {
      if (this.isLogLocked) {
        this.container.style.opacity = '1';
        // 启用 pointer-events，允许接收鼠标滚轮事件
        this.container.style.pointerEvents = 'auto';
        if (this.logTimer) { clearTimeout(this.logTimer); this.logTimer = null; }
        const tip = document.createElement('div');
        tip.className = 'log-entry log-info';
        tip.innerHTML = '> 日志已锁定';
        this.logPanel.appendChild(tip);
      } else {
        // 禁用 pointer-events，恢复默认行为
        this.container.style.pointerEvents = 'none';
        if (this.logTimer) { clearTimeout(this.logTimer); this.logTimer = null; }
        this.container.style.opacity = '0';
        const tip = document.createElement('div');
        tip.className = 'log-entry log-info';
        tip.innerHTML = '> 日志自动隐藏';
        this.logPanel.appendChild(tip);
      }
    }
  }

  /**
   * 清空日志内容
   */
  clearLog() {
    if (this.logPanel) {
      this.logPanel.innerHTML = '';
      console.log('[UIManager] 日志已清空');
    }
  }

  /**
   * 隐藏 HUD（死亡子弹时间阶段使用）
   * 隐藏血条、技能栏、遗物栏、日志等界面元素，只保留纯净的游戏画面
   */
  hideHUD() {
    // 隐藏右侧状态栏（包含血条、属性、装备等）
    const rightSidebar = document.getElementById('right-sidebar');
    if (rightSidebar) {
      rightSidebar.style.opacity = '0';
      rightSidebar.style.pointerEvents = 'none';
      rightSidebar.style.transition = 'opacity 1.5s ease-out';
    }
    
    // 隐藏技能栏
    const skillBar = document.getElementById('skill-bar');
    if (skillBar) {
      skillBar.style.opacity = '0';
      skillBar.style.pointerEvents = 'none';
      skillBar.style.transition = 'opacity 1.5s ease-out';
    }
    
    // 隐藏遗物栏
    const relicBar = document.getElementById('relic-bar');
    if (relicBar) {
      relicBar.style.opacity = '0';
      relicBar.style.pointerEvents = 'none';
      relicBar.style.transition = 'opacity 1.5s ease-out';
    }
    
    // 隐藏系统日志
    if (this.container) {
      this.container.style.opacity = '0';
      this.container.style.pointerEvents = 'none';
      this.container.style.transition = 'opacity 1.5s ease-out';
    }
    
    console.log('[UIManager] HUD 已隐藏（死亡子弹时间阶段）');
  }

  /**
   * 显示 HUD（恢复显示所有界面元素）
   */
  showHUD() {
    // 显示右侧状态栏
    const rightSidebar = document.getElementById('right-sidebar');
    if (rightSidebar) {
      rightSidebar.style.opacity = '1';
      rightSidebar.style.pointerEvents = 'auto';
      rightSidebar.style.transition = 'opacity 1.5s ease-out';
    }
    
    // 显示技能栏
    const skillBar = document.getElementById('skill-bar');
    if (skillBar) {
      skillBar.style.opacity = '1';
      skillBar.style.pointerEvents = 'auto';
      skillBar.style.transition = 'opacity 1.5s ease-out';
    }
    
    // 显示遗物栏
    const relicBar = document.getElementById('relic-bar');
    if (relicBar) {
      relicBar.style.opacity = '1';
      relicBar.style.pointerEvents = 'auto';
      relicBar.style.transition = 'opacity 1.5s ease-out';
    }
    
    // 系统日志保持隐藏状态（默认是隐藏的）
    // 不在这里恢复，因为日志有自己的显示逻辑
  }

  // ========================================================================
  // 公共接口：背包系统
  // ========================================================================

  /**
   * 打开背包界面
   */
  openInventory() {
    this.overlayManager.open('inventory');
  }

  /**
   * 关闭背包界面
   */
  closeInventory() {
    this.overlayManager.close('inventory');
  }

  /**
   * 切换背包界面
   */
  toggleInventory() {
    this.overlayManager.toggle('inventory');
  }

  /**
   * 更新背包显示
   * @param {Player} player - 玩家对象
   */
  updateInventory(player) {
    this.inventoryUI.update(player);
  }

  /**
   * 渲染背包界面（初次打开时调用）
   * @param {Player} player - 玩家对象
   */
  renderInventory(player) {
    this.inventoryUI.render(player);
  }

  /**
   * 更新装备栏显示
   * @param {Player} player - 玩家对象
   */
  updateEquipmentSockets(player) {
    this.inventoryUI.renderEquipmentSockets(player);
    // 同时更新右侧栏的装备槽
    this.renderRightSidebarEquipment(player);
  }

  /**
   * 渲染右侧栏装备槽
   * @param {Player} player - 玩家对象
   */
  renderRightSidebarEquipment(player) {
    const slotTypes = ['HELM', 'WEAPON', 'ARMOR', 'BOOTS', 'RING', 'AMULET'];
    const loader = window.game?.loader;
    const img = loader?.getImage('ICONS_EQUIP');
    const cols = ICON_GRID_COLS || 4;
    
    if (!img) return;
    
    const natW = img.naturalWidth || img.width;
    const natH = img.naturalHeight || img.height;
    const cellW = natW / cols;
    const cellH = natH / ICON_GRID_ROWS;
    
    slotTypes.forEach((slotType) => {
      // 只选择右侧栏的装备槽（不包括背包界面的）
      const rightSidebar = document.getElementById('right-sidebar');
      if (!rightSidebar) return;
      
      const socket = rightSidebar.querySelector(`.equip-socket[data-slot="${slotType}"]`);
      if (!socket) return;
      
      const equippedItem = player.equipment?.[slotType];
      
      // 获取物品实例对象（兼容旧代码）
      let itemInstance = null;
      let itemId = null;
      
      if (equippedItem) {
        if (typeof equippedItem === 'string') {
          // 旧代码：字符串ID
          itemId = equippedItem;
          itemInstance = EQUIPMENT_DB[itemId];
        } else if (typeof equippedItem === 'object') {
          // 新代码：物品实例对象
          itemInstance = equippedItem;
          itemId = itemInstance.itemId || itemInstance.id;
        }
      }
      
      // 清空内容
      socket.innerHTML = '';
      
      if (itemInstance && itemId) {
        // 创建图标
        const canvas = this.createItemIcon(img, itemInstance, cellW, cellH, 28, cols);
        if (canvas) socket.appendChild(canvas);
        
        // ✅ FIX: 绑定tooltip - 传递物品对象或ID（优先传递对象以显示强化后的属性）
        this.bindTooltipForSidebar(socket, itemInstance || itemId);
        
        // 绑定点击事件
        socket.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log('Right sidebar equipment socket clicked:', slotType, itemId);
          this.inventoryUI.showActionMenu(e, itemId, null, socket);
        };
        
        socket.oncontextmenu = (e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log('Right sidebar equipment socket right-clicked:', slotType, itemId);
          this.inventoryUI.showActionMenu(e, itemId, null, socket);
          return false;
        };
        
        socket.style.cursor = 'pointer';
      } else {
        socket.title = slotType;
        socket.onclick = null;
        socket.oncontextmenu = null;
        socket.style.cursor = 'default';
      }
    });
  }

  /**
   * 创建物品图标 canvas
   * @param {Image} img - 图标图片
   * @param {object} item - 物品数据
   * @param {number} cellW - 图标单元格宽度
   * @param {number} cellH - 图标单元格高度
   * @param {number} size - 目标尺寸
   * @param {number} cols - 图标列数
   * @returns {HTMLCanvasElement}
   */
  createItemIcon(img, item, cellW, cellH, size, cols) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    const idxIcon = item.iconIndex || 0;
    const col = idxIcon % cols;
    const row = Math.floor(idxIcon / cols);
    
    const sx = Math.round(col * cellW);
    const sy = Math.round(row * cellH);
    const sw = Math.round(cellW);
    const sh = Math.round(cellH);

    ctx.imageSmoothingEnabled = false;

    const cellAspect = sw / sh;
    let destW = size;
    let destH = size;

    if (cellAspect > 1) {
      destH = size;
      destW = size * cellAspect;
    } else if (cellAspect < 1) {
      destW = size;
      destH = size / cellAspect;
    }

    const offsetX = Math.round((size - destW) / 2);
    const offsetY = Math.round((size - destH) / 2);

    ctx.drawImage(img, sx, sy, sw, sh, offsetX, offsetY, destW, destH);
    return canvas;
  }

  /**
   * 为右侧栏元素绑定tooltip（使用统一的 TooltipManager）
   * @param {HTMLElement} el - 元素
   * @param {string|null} itemId - 物品ID
   */
  bindTooltipForSidebar(el, itemId) {
    if (!el) return;
    // 直接使用全局 TooltipManager
    globalTooltipManager.bind(el, itemId);
  }

  // ========================================================================
  // 公共接口：图鉴系统
  // ========================================================================

  /**
   * 打开图鉴界面
   */
  openBestiary() {
    this.overlayManager.open('bestiary');
  }

  /**
   * 关闭图鉴界面
   */
  closeBestiary() {
    this.overlayManager.close('bestiary');
  }

  /**
   * 切换图鉴界面
   */
  toggleBestiary() {
    this.overlayManager.toggle('bestiary');
  }

  /**
   * 设置图鉴的资源加载器
   * @param {object} loader - 资源加载器实例
   */
  setBestiaryLoader(loader) {
    this.bestiaryUI.setLoader(loader);
  }

  // ========================================================================
  // 公共接口：商店系统
  // ========================================================================

  /**
   * 打开商店界面
   */
  openShop() {
    this.overlayManager.open('shop');
  }

  /**
   * 关闭商店界面
   */
  closeShop() {
    this.overlayManager.close('shop');
  }

  /**
   * 切换商店界面
   */
  toggleShop() {
    this.overlayManager.toggle('shop');
  }

  /**
   * 更新商店显示
   */
  updateShop() {
    this.shopUI.update();
  }

  /**
   * 重置商店价格
   */
  resetShopPrices() {
    this.shopUI.resetPrices();
  }

  // ========================================================================
  // 公共接口：玩家属性显示
  // ========================================================================

  /**
   * 更新玩家属性显示
   * @param {Player} player - 玩家对象
   */
  updateStats(player) {
    if (!document.getElementById('ui-hp')) return;
    
    // HP
    document.getElementById('ui-hp').innerText = player.stats.hp;
    document.getElementById('ui-hp-max').innerText = player.stats.maxHp;
    const hpPercent = Math.max(0, (player.stats.hp / player.stats.maxHp) * 100);
    const hpBar = document.getElementById('hp-visual-fill');
    if (hpBar) hpBar.style.width = `${hpPercent}%`;

    // Rage
    const rBar = document.getElementById('rage-fill');
    if (rBar) rBar.style.width = `${player.stats.rage}%`;
    const rageTextEl = document.getElementById('rage-text');
    const rageSection = document.querySelector('.rage-section');
    if (rageTextEl) {
      rageTextEl.innerText = `${player.stats.rage}%`;
      if (player.stats.rage >= 100) {
        rageTextEl.style.color = '#ff0000';
        rageTextEl.style.fontWeight = 'bold';
        if (rageSection) rageSection.classList.add('full');
      } else {
        rageTextEl.style.color = '#ffffff';
        rageTextEl.style.fontWeight = 'normal';
        if (rageSection) rageSection.classList.remove('full');
      }
    }

    // ULT button
    const btnUlt = document.getElementById('btn-ultimate');
    if (player.stats.rage >= 100) { 
      btnUlt?.classList.add('ready'); 
      btnUlt?.removeAttribute('disabled'); 
    } else { 
      btnUlt?.classList.remove('ready'); 
      btnUlt?.setAttribute('disabled', 'true'); 
    }

    // Stats
    const setText = (id, val) => { 
      const el = document.getElementById(id); 
      if (el) el.innerText = val; 
    };
    
    const totals = (player.getTotalStats ? player.getTotalStats() : player.stats);
    setText('ui-patk', totals.p_atk);
    setText('ui-matk', totals.m_atk);
    setText('ui-pdef', totals.p_def);
    setText('ui-mdef', totals.m_def);
    
    // ========== 攻击速度系统：设置攻击速度工具提示 ==========
    // ✅ 为物攻和魔攻添加工具提示，显示攻击速度
    this.setupAttackSpeedTooltips(player);
    setText('ui-keys', player.stats.keys);
    setText('ui-gold', player.stats.gold ?? 0);
    setText('ui-lvl', player.stats.lvl);
    setText('ui-floor', player.stats.floor);

    // Soul Crystals
    const sc = (window.game && window.game.metaSaveSystem && window.game.metaSaveSystem.data) 
      ? (window.game.metaSaveSystem.data.soulCrystals || 0) 
      : 0;
    const scEl = document.getElementById('ui-soul-crystals');
    if (scEl) {
      scEl.innerText = sc;
    } else {
      console.warn('[UIManager] 灵魂水晶元素未找到: ui-soul-crystals');
    }

    // Crit Rate
    const critEl = document.getElementById('ui-crit');
    if (critEl) {
      const critRate = totals.crit_rate || 0.2;
      const critPercent = Math.floor(critRate * 100);
      critEl.innerText = `${critPercent}%`;
      
      const hasCritBuff = player.buffs && player.buffs.berserk && player.buffs.berserk.active;
      if (hasCritBuff) {
        critEl.style.color = '#ff0000';
      } else {
        critEl.style.color = '';
      }
    }

    // XP Bar
    const xpNow = player.stats.xp ?? 0;
    const xpNext = Math.max(1, player.stats.nextLevelXp ?? 1);
    const xpPercent = Math.max(0, Math.min(100, Math.floor((xpNow / xpNext) * 100)));
    const xpFill = document.getElementById('xp-fill');
    if (xpFill) xpFill.style.width = `${xpPercent}%`;
    setText('ui-xp', xpNow);
    setText('ui-xp-max', xpNext);
    
    // ✅ v2.1: 更新符文状态面板
    this.updateRuneStats(player);
  }
  
  /**
   * 设置攻击速度工具提示（当鼠标悬停在物攻/魔攻上时显示）
   * @param {Object} player - 玩家对象
   */
  setupAttackSpeedTooltips(player) {
    // 使用更兼容的方式查找 stat-row 元素
    const patkEl = document.getElementById('ui-patk');
    const matkEl = document.getElementById('ui-matk');
    const patkRow = patkEl?.closest('.stat-row') || patkEl?.parentElement;
    const matkRow = matkEl?.closest('.stat-row') || matkEl?.parentElement;
    
    // 获取攻击速度
    const attackSpeed = player.getAttackSpeed ? player.getAttackSpeed() : 1.0;
    const attackSpeedText = `${attackSpeed.toFixed(2)}/s`;
    
    // 设置物攻工具提示
    if (patkRow) {
      patkRow.title = `物理攻击\n攻击速度: ${attackSpeedText}`;
      patkRow.style.cursor = 'help';
    }
    
    // 设置魔攻工具提示
    if (matkRow) {
      matkRow.title = `魔法攻击\n攻击速度: ${attackSpeedText}`;
      matkRow.style.cursor = 'help';
    }
  }
  
  /**
   * ✅ v2.1: 更新符文状态面板（显示累计属性加成）
   * @param {Object} player - 玩家对象
   */
  updateRuneStats(player) {
    // 获取或创建符文状态面板
    let statsPanel = document.getElementById('rune-stats-panel');
    if (!statsPanel) {
      // 创建面板元素
      statsPanel = document.createElement('div');
      statsPanel.id = 'rune-stats-panel';
      statsPanel.className = 'rune-stats-panel';
      
      // 添加到 draft-overlay 中
      const draftOverlay = document.getElementById('draft-overlay');
      if (draftOverlay) {
        draftOverlay.appendChild(statsPanel);
      } else {
        // 如果 draft-overlay 不存在，添加到 body
        document.body.appendChild(statsPanel);
      }
    }
    
    // 检查玩家是否有符文状态
    if (!player.runeState || !player.runeState.bonusStats) {
      statsPanel.style.display = 'none';
      return;
    }
    
    const bonus = player.runeState.bonusStats;
    
    // 构建显示文本
    const stats = [];
    if (bonus.p_atk > 0) stats.push(`物攻+${bonus.p_atk}`);
    if (bonus.m_atk > 0) stats.push(`魔攻+${bonus.m_atk}`);
    if (bonus.p_def > 0) stats.push(`物防+${bonus.p_def}`);
    if (bonus.m_def > 0) stats.push(`魔防+${bonus.m_def}`);
    if (bonus.hp > 0) stats.push(`生命+${bonus.hp}`);
    if (bonus.crit_rate > 0) stats.push(`暴击+${Math.floor(bonus.crit_rate * 100)}%`);
    if (bonus.dodge > 0) stats.push(`闪避+${Math.floor(bonus.dodge * 100)}%`);
    if (bonus.gold_rate > 0) stats.push(`金币+${Math.floor(bonus.gold_rate * 100)}%`);
    
    if (stats.length === 0) {
      statsPanel.style.display = 'none';
      return;
    }
    
    // 更新面板内容
    statsPanel.innerHTML = `
      <div class="rune-stats-title">本局强化</div>
      <div class="rune-stats-content">${stats.join(', ')}</div>
    `;
    
    // 显示面板
    statsPanel.style.display = 'block';
  }

  // ========================================================================
  // 公共接口：技能栏系统
  // ========================================================================

  /**
   * 初始化技能栏
   * @param {Player} player - 玩家对象
   */
  initSkillBar(player) {
    const skillBar = document.getElementById('skill-bar');
    console.log('🎯 [UIManager] initSkillBar called', { skillBar, player, game: window.game });
    
    if (!skillBar) {
      console.error('❌ [UIManager] Skill bar element not found');
      return;
    }
    
    if (!player) {
      console.error('❌ [UIManager] Player object is null');
      return;
    }
    
    if (!player.skills) {
      console.error('❌ [UIManager] Player skills not initialized', player);
      return;
    }
    
    // 清空现有槽位（防止重复绑定）
    skillBar.innerHTML = '';
    console.log('✅ [UIManager] Skill bar cleared');
    
    // 创建 3 个技能槽：被动、主动、大招
    const skillTypes = ['PASSIVE', 'ACTIVE', 'ULT'];
    
    let slotsCreated = 0;
    skillTypes.forEach((skillType, index) => {
      const skillData = player.skills[skillType];
      if (!skillData) {
        console.warn(`⚠️ [UIManager] Skill data not found for ${skillType}`);
        return;
      }
      
      console.log(`📝 [UIManager] Creating skill slot for ${skillType}`, skillData);
      
      const slot = document.createElement('div');
      slot.className = 'skill-slot';
      slot.dataset.skillType = skillType;
      slot.id = `skill-slot-${skillType.toLowerCase()}`;
      
      // ✅ 强制开启交互，防止 CSS 层级遮挡
      slot.style.pointerEvents = 'all';
      slot.style.cursor = skillType === 'PASSIVE' ? 'default' : 'pointer';
      slot.style.position = 'relative';
      slot.style.zIndex = '1001'; // 确保在 canvas 之上
      
      console.log(`🔧 [UIManager] Skill slot style set for ${skillType}:`, {
        pointerEvents: slot.style.pointerEvents,
        cursor: slot.style.cursor,
        zIndex: slot.style.zIndex
      });
      
      // ✅ 1. 绑定 Tooltip
      try {
        globalTooltipManager.bind(slot, {
          type: 'SKILL',
          category: skillType,
          data: skillData
        });
        console.log(`✅ [UIManager] Tooltip bound for ${skillType}`, skillData);
      } catch (error) {
        console.error(`❌ [UIManager] Failed to bind tooltip for ${skillType}:`, error);
      }
      
      // ✅ 2. 绑定点击事件（被动技能除外）
      if (skillType !== 'PASSIVE') {
        // 使用 addEventListener 而不是 onclick，方便调试和清理
        const clickHandler = (e) => {
          e.stopPropagation(); // 防止事件穿透到 canvas
          e.preventDefault();
          
          console.log(`🖱️ [UIManager] 点击技能: ${skillType}`, {
            skillData,
            player: player ? 'exists' : 'null',
            game: window.game ? 'exists' : 'null',
            event: e,
            cooldowns: player.cooldowns
          });
          
          // ✅ [新增] 1. 冷却检查：如果技能正在冷却，直接拦截
          let onCooldown = false;
          if (player.cooldowns) {
            if (skillType === 'ACTIVE' && player.cooldowns.active > 0) {
              onCooldown = true;
              console.log(`⏳ [UIManager] 技能 ${skillType} 冷却中，剩余: ${(player.cooldowns.active / 1000).toFixed(1)}秒`);
            }
            if (skillType === 'ULT' && player.cooldowns.ult > 0) {
              onCooldown = true;
              console.log(`⏳ [UIManager] 技能 ${skillType} 冷却中，剩余: ${(player.cooldowns.ult / 1000).toFixed(1)}秒`);
            }
          }

          if (onCooldown) {
            console.warn(`⚠️ [UIManager] 技能 ${skillType} 冷却中，无法使用`);
            // 添加拒绝操作的视觉反馈：抖动动画
            slot.classList.add('shake');
            setTimeout(() => slot.classList.remove('shake'), 200);
            // 可选：显示提示消息
            if (window.game && window.game.ui) {
              const remainingTime = skillType === 'ACTIVE' 
                ? (player.cooldowns.active / 1000).toFixed(1)
                : (player.cooldowns.ult / 1000).toFixed(1);
              window.game.ui.logMessage(`技能冷却中，还需 ${remainingTime} 秒`, 'warning');
            }
            return; // ⛔️ 阻止后续施法逻辑
          }
          
          // ✅ [新增] 2. 状态检查：如果已经准备了技能（如斩击已就绪），可以继续执行
          // 注意：这里不阻止重复触发，因为有些技能可能需要连续点击（如某些需要二次确认的技能）
          
          // 添加点击视觉反馈
          slot.classList.add('clicked');
          setTimeout(() => slot.classList.remove('clicked'), 100);
          
          // 执行原有施法逻辑
          if (skillType === 'ACTIVE') {
            // 检查是否被冰冻
            if (player.hasStatus && player.hasStatus('FROZEN')) {
              console.warn('⚠️ [UIManager] 冰冻状态下无法使用技能！');
              if (window.game && window.game.ui) {
                window.game.ui.logMessage('冰冻状态下无法使用技能！', 'warning');
              }
              return;
            }
            
            // 调用主动技能
            if (player.castActiveSkill) {
              console.log('✅ [UIManager] Calling player.castActiveSkill()');
              player.castActiveSkill();
            } else {
              console.error('❌ [UIManager] player.castActiveSkill is not a function');
            }
          } else if (skillType === 'ULT') {
            // 调用终极技能
            if (window.game && window.game.activateUltimate) {
              console.log('✅ [UIManager] Calling window.game.activateUltimate()');
              window.game.activateUltimate();
            } else if (player.castUltimateSkill) {
              console.log('✅ [UIManager] Calling player.castUltimateSkill()');
              // 如果没有 game.activateUltimate，直接调用 player 方法（需要手动检查）
              if (player.hasStatus && player.hasStatus('FROZEN')) {
                console.warn('⚠️ [UIManager] 冰冻状态下无法使用必杀技！');
                if (window.game && window.game.ui) {
                  window.game.ui.logMessage('冰冻状态下无法使用必杀技！', 'warning');
                }
                return;
              }
              
              if (player.stats.rage < 100) {
                console.warn('⚠️ [UIManager] 怒气不足！需要100%怒气才能使用终极技能。');
                if (window.game && window.game.ui) {
                  window.game.ui.logMessage('怒气不足！需要100%怒气才能使用终极技能。', 'warning');
                }
                return;
              }
              
              player.castUltimateSkill();
              player.stats.rage = 0;
              if (window.game && window.game.ui) {
                window.game.ui.updateStats(player);
              }
            } else {
              console.error('❌ [UIManager] Neither game.activateUltimate nor player.castUltimateSkill exists');
            }
          }
        };
        
        slot.addEventListener('click', clickHandler);
        
        // 保存处理器引用以便后续清理（如果需要）
        slot._clickHandler = clickHandler;
        
        console.log(`✅ [UIManager] Click handler bound for ${skillType}`);
      }
      
      // 创建技能图标
      const icon = document.createElement('div');
      icon.className = 'skill-icon';
      icon.id = `skill-icon-${index}`; // ✅ 分配 ID (0=Passive, 1=Active, 2=Ult)
      
      // 根据 iconIndex 设置背景位置（3x3 网格 = 300%）
      if (skillData.iconIndex !== undefined) {
        const col = skillData.iconIndex % 3;
        const row = Math.floor(skillData.iconIndex / 3);
        const pos = ['0%', '50%', '100%'];
        icon.style.backgroundPosition = `${pos[col]} ${pos[row]}`;
        icon.style.backgroundSize = '300% 300%';
        icon.style.backgroundImage = `url('${ASSETS.ICONS_SKILLS.url}')`;
        console.log(`  📍 [UIManager] Icon position: ${pos[col]} ${pos[row]} (index: ${skillData.iconIndex})`);
      }
      
      // 创建冷却遮罩
      const cooldownOverlay = document.createElement('div');
      cooldownOverlay.className = 'cooldown-overlay';
      
      // 创建按键提示
      const keyHint = document.createElement('div');
      keyHint.className = 'skill-key-hint';
      if (skillData.key) {
        keyHint.innerText = skillData.key === 'SPACE' ? 'SPC' : skillData.key;
      }
      
      // 添加装饰边框（在图标后面）
      const frame = document.createElement('div');
      frame.className = 'skill-frame';
      slot.appendChild(frame);
      
      // 添加图标（在边框上面）
      slot.appendChild(icon);
      
      // 添加冷却遮罩（在图标上面）
      slot.appendChild(cooldownOverlay);
      
      // 添加按键提示（最上层）
      slot.appendChild(keyHint);
      
      skillBar.appendChild(slot);
      slotsCreated++;
      console.log(`✅ [UIManager] Skill slot created for ${skillType}`, slot);
    });
    
    console.log(`🎉 [UIManager] Skill bar initialized with ${slotsCreated} slots`);
    console.log('📊 [UIManager] Skill bar element:', skillBar);
    console.log('📊 [UIManager] Skill bar children:', skillBar.children.length);
    if (skillBar.children.length > 0) {
      console.log('📊 [UIManager] First slot computed style:', window.getComputedStyle(skillBar.children[0]));
      console.log('📊 [UIManager] First slot pointer-events:', window.getComputedStyle(skillBar.children[0]).pointerEvents);
    }
    console.log('✅ [UIManager] Skill bar initialization complete - Tooltip and click interactions ready');
  }

  /**
   * 更新技能栏显示（冷却时间等）
   * @param {Player} player - 玩家对象
   */
  updateSkillBar(player) {
    if (!player || !player.skills || !player.cooldowns) return;
    
    const slots = document.querySelectorAll('.skill-slot');
    const skillTypes = ['PASSIVE', 'ACTIVE', 'ULT'];
    
    slots.forEach((slot, index) => {
      const skillType = skillTypes[index];
      if (!skillType) return;
      
      // ✅ 被动技能不需要更新冷却
      if (skillType === 'PASSIVE') return;
      
      const skillData = player.skills[skillType];
      if (!skillData) return;
      
      // 获取冷却数据
      let currentCd = 0;
      let maxCd = 0;
      
      if (skillType === 'ACTIVE') {
        currentCd = Math.max(0, player.cooldowns.active || 0);
        maxCd = player.cooldowns.maxActive || player.skills.ACTIVE?.cd || 5000;
      } else if (skillType === 'ULT') {
        currentCd = Math.max(0, player.cooldowns.ult || 0);
        maxCd = player.cooldowns.maxUlt || player.skills.ULT?.cd || 20000;
      }
      
      // ✅ 更新遮罩高度（从底部向上填充）
      // 计算百分比 (0% = 冷却完毕, 100% = 刚开始冷却)
      const cooldownPercent = maxCd > 0 ? (currentCd / maxCd) * 100 : 0;
      const overlay = slot.querySelector('.cooldown-overlay');
      
      if (overlay) {
        // 确保遮罩从底部开始
        overlay.style.bottom = '0';
        overlay.style.top = 'auto';
        overlay.style.height = `${cooldownPercent}%`;
        
        // ✅ 调试日志（如果发现遮罩不动，可以解开这行注释）
        // if (currentCd > 0 && index === 1) { // 只打印主动技能
        //   console.log(`[UIManager] ${skillType} CD: ${currentCd.toFixed(0)}ms / ${maxCd}ms = ${cooldownPercent.toFixed(1)}%`);
        // }
      } else {
        console.warn(`⚠️ [UIManager] updateSkillBar: 找不到 ${skillType} 的冷却遮罩元素`);
      }

      // ✅ 更新冷却状态样式类和鼠标样式
      if (currentCd > 0) {
        slot.classList.add('on-cooldown');
        // 冷却中时，鼠标变成禁止符号（但被动技能保持默认）
        if (skillType !== 'PASSIVE') {
          slot.style.cursor = 'not-allowed';
        }
      } else {
        slot.classList.remove('on-cooldown');
        // 冷却完毕时，恢复手指指针（但被动技能保持默认）
        if (skillType !== 'PASSIVE') {
          slot.style.cursor = 'pointer';
        }
      }
    });
  }

  // ========================================================================
  // 公共接口：遗物栏系统
  // ========================================================================

  /**
   * 添加遗物到遗物栏（旧方法，保留以兼容）
   * @param {string} relicName - 遗物名称
   */
  addRelic(relicName) {
    const slots = this.relicBar?.querySelectorAll('.relic-slot');
    if (!slots) return;
    let targetSlot = null;
    for (let slot of slots) { 
      if (slot.innerText === '') { 
        targetSlot = slot; 
        break; 
      } 
    }
    if (targetSlot) {
      targetSlot.innerText = relicName.substring(0, 1).toUpperCase();
      targetSlot.title = relicName;
      targetSlot.classList.add('filled');
    }
  }
  
  /**
   * 更新遗物栏显示
   * @param {Map} relicsMap - 玩家的遗物 Map
   */
  updateRelicBar(relicsMap) {
    const relicBar = document.getElementById('relic-bar');
    if (!relicBar) return;
    
    // 清空当前内容
    relicBar.innerHTML = '';
    
    // 重新渲染所有遗物
    if (relicsMap && relicsMap.size > 0) {
      relicsMap.forEach(relic => {
        const slot = document.createElement('div');
        slot.className = `relic-slot ${relic.rarity ? relic.rarity.toLowerCase() : ''}`;
        
        // 创建图片
        const img = document.createElement('img');
        img.src = relic.icon;
        img.alt = relic.name;
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'contain';
        
        // 添加 Tooltip 支持
        slot.title = `${relic.name}\n${relic.desc}`;
        
        slot.appendChild(img);
        relicBar.appendChild(slot);
      });
    }
    
    // 补充空槽位以保持布局美观 (保持总共 6 个槽位)
    const totalSlots = 6;
    const currentCount = relicsMap ? relicsMap.size : 0;
    for (let i = currentCount; i < totalSlots; i++) {
      const emptySlot = document.createElement('div');
      emptySlot.className = 'relic-slot empty';
      relicBar.appendChild(emptySlot);
    }
  }

  // ========================================================================
  // 公共接口：任务系统
  // ========================================================================

  /**
   * 设置任务UI实例（由main.js调用）
   * @param {QuestUI} questUI - 任务UI实例
   */
  setQuestUI(questUI) {
    this.questUI = questUI;
    if (questUI) {
      this.overlayManager.register('quest', questUI);
    }
  }

  /**
   * 打开任务日志
   */
  openQuestLog() {
    this.overlayManager.open('quest');
  }

  /**
   * 关闭任务日志
   */
  closeQuestLog() {
    this.overlayManager.close('quest');
  }

  /**
   * 切换任务日志
   */
  toggleQuestLog() {
    this.overlayManager.toggle('quest');
  }

  // ========================================================================
  // 公共接口：Overlay 管理
  // ========================================================================

  /**
   * 关闭所有弹窗
   */
  closeAllOverlays() {
    this.overlayManager.closeAll();
  }

  /**
   * 检查是否有弹窗打开
   * @returns {boolean}
   */
  hasActiveOverlay() {
    return this.overlayManager.hasActiveOverlay();
  }

  /**
   * 获取当前顶层弹窗名称
   * @returns {string|null}
   */
  getTopOverlay() {
    return this.overlayManager.getTopOverlay();
  }

  // ========================================================================
  // 公共接口：样式配置
  // ========================================================================

  /**
   * 更新背包样式配置
   * @param {object} newStyles - 新的样式配置
   */
  updateInventoryStyle(newStyles) {
    this.inventoryUI.updateStyle(newStyles);
  }

  /**
   * 更新图鉴样式配置
   * @param {object} newStyles - 新的样式配置
   */
  updateBestiaryStyle(newStyles) {
    this.bestiaryUI.updateStyle(newStyles);
  }

  /**
   * 更新商店样式配置
   * @param {object} newStyles - 新的样式配置
   */
  updateShopStyle(newStyles) {
    this.shopUI.updateStyle(newStyles);
  }

  // ========================================================================
  // 销毁与清理
  // ========================================================================

  // ========================================================================
  // 公共接口：角色选择界面
  // ========================================================================

  /**
   * 显示角色选择界面
   * @param {string} mode - 模式：'normal' 或 'daily'
   */
  showCharacterSelect(mode = 'normal') {
    const charSelectScreen = document.getElementById('char-select-screen');
    if (!charSelectScreen) {
      console.warn('[UIManager] 角色选择界面元素不存在');
      return;
    }

    if (mode === 'daily') {
      // 每日挑战模式
      charSelectScreen.classList.add('mode-daily');
      
      // 获取每日挑战配置
      const config = DailyChallengeSystem.getDailyConfig();
      if (!config) {
        console.error('[UIManager] 无法获取每日挑战配置');
        return;
      }

      // 渲染每日挑战信息
      this.renderDailyModeInfo(config);

      // 强制选中今日限定角色
      if (window.game && window.game.selectCharacter) {
        window.game.selectCharacter(config.character);
      }

      // ✅ 根据每日配置设置战争迷雾和动态光照（禁用但显示随机规则）
      const fogCheckbox = document.getElementById('chk-fog');
      const lightingCheckbox = document.getElementById('chk-lighting');
      
      if (fogCheckbox) {
        fogCheckbox.checked = config.enableFog || false;
        fogCheckbox.disabled = true; // 保持禁用，确保玩家无法手动更改
      }
      
      if (lightingCheckbox) {
        lightingCheckbox.checked = config.enableLighting || false;
        lightingCheckbox.disabled = true; // 保持禁用，确保玩家无法手动更改
      }

      console.log('[UIManager] 每日挑战模式：已锁定英雄选择和设置');
    } else {
      // 普通模式
      charSelectScreen.classList.remove('mode-daily');
      
      // 恢复所有角色的交互能力（CSS 会自动处理）
      const charIcons = document.querySelectorAll('.ror-char-icon');
      charIcons.forEach(icon => {
        icon.style.pointerEvents = '';
        icon.style.cursor = '';
        icon.style.filter = '';
        icon.style.opacity = '';
      });

      // 隐藏每日挑战信息面板
      const dailyInfo = document.querySelector('.daily-run-info');
      if (dailyInfo) {
        dailyInfo.classList.add('hidden');
      }

      // ✅ 恢复设置区复选框的可交互状态和用户偏好
      const fogCheckbox = document.getElementById('chk-fog');
      const lightingCheckbox = document.getElementById('chk-lighting');
      
      if (fogCheckbox) {
        fogCheckbox.disabled = false;
        // 从 sessionStorage 读取用户偏好，如果没有则默认为 true
        const enableFogPref = sessionStorage.getItem('enableFog');
        if (enableFogPref !== null) {
          fogCheckbox.checked = enableFogPref === 'true';
        } else {
          fogCheckbox.checked = true; // 默认开启
        }
      }
      
      if (lightingCheckbox) {
        lightingCheckbox.disabled = false;
        // 从 sessionStorage 读取用户偏好，如果没有则默认为 true
        const enableLightingPref = sessionStorage.getItem('enableLighting');
        if (enableLightingPref !== null) {
          lightingCheckbox.checked = enableLightingPref === 'true';
        } else {
          lightingCheckbox.checked = true; // 默认开启
        }
      }
      
      // ✅ 恢复无限层数挑战设置
      const infiniteCheckbox = document.getElementById('chk-infinite');
      if (infiniteCheckbox) {
        infiniteCheckbox.disabled = false;
        // 从 sessionStorage 读取用户偏好，如果没有则默认为 false
        const infiniteModePref = sessionStorage.getItem('infiniteMode');
        if (infiniteModePref !== null) {
          infiniteCheckbox.checked = infiniteModePref === 'true';
        } else {
          infiniteCheckbox.checked = false; // 默认关闭
        }
      }

      // ✅ FIX: 恢复普通模式的难度显示（如果之前被修改过）
      if (window.game && window.game.setAscensionLevel) {
        // 使用游戏实例的方法恢复难度显示（会自动更新名称和描述）
        window.game.setAscensionLevel(window.game.selectedAscensionLevel || 1);
      }
      
      // ✅ FIX: 重置难度描述的颜色（防止每日挑战模式的金色残留）
      const diffDesc = document.getElementById('ror-diff-desc');
      if (diffDesc) {
        diffDesc.style.color = ''; // 重置为空字符串，恢复默认样式
      }

      console.log('[UIManager] 普通模式：已恢复所有选项的可交互状态');
    }
  }

  /**
   * 格式化符文描述文本（替换占位符为具体数值）
   * @param {Object} rune - 符文对象
   * @param {number} floor - 当前层数（默认1）
   * @returns {string} 格式化后的描述文本
   */
  formatRuneDescription(rune, floor = 1) {
    if (!rune || !rune.description) {
      return '';
    }

    // 根据符文稀有度获取倍率
    const multiplier = RUNE_RARITY_MULTIPLIERS[rune.rarity] || 1.0;

    // 根据符文类型和ID计算value（只针对STAT类符文）
    let value = 1;
    if (rune.type === 'STAT') {
      if (rune.id && (rune.id.includes('might') || rune.id.includes('brutal'))) {
        value = Math.floor(1 * multiplier * (1 + floor * 0.1));
      } else if (rune.id && (rune.id.includes('iron') || rune.id.includes('fortress'))) {
        value = Math.floor(1 * multiplier * (1 + floor * 0.1));
      } else if (rune.id && (rune.id.includes('arcana') || rune.id.includes('arcane'))) {
        value = Math.floor(1 * multiplier * (1 + floor * 0.1));
      } else if (rune.id && (rune.id.includes('ward') || rune.id.includes('barrier'))) {
        value = Math.floor(1 * multiplier * (1 + floor * 0.1));
      } else if (rune.id && (rune.id.includes('vitality') || rune.id.includes('life'))) {
        value = Math.floor(10 * multiplier * (1 + floor * 0.1));
      } else if (rune.id && (rune.id.includes('precision') || rune.id.includes('deadly') || rune.id.includes('assassin'))) {
        value = Math.floor(5 * multiplier);
      } else if (rune.id && (rune.id.includes('agility') || rune.id.includes('phantom'))) {
        value = Math.floor(5 * multiplier);
      }
    }

    // 生成描述文本（先替换通用占位符）
    let description = rune.description || '';
    description = description.replace(/\{\{value\}\}/g, value);

    // 特殊占位符替换（对于特殊符文，再次替换{{value}}为硬编码值）
    if (rune.id === 'glass_cannon') {
      description = description.replace(/\{\{hpLoss\}\}/g, '30');
    } else if (rune.id === 'greed') {
      description = description.replace(/\{\{damageIncrease\}\}/g, '30');
    } else if (rune.id === 'thunder') {
      description = description.replace(/\{\{value\}\}/g, '15');
      description = description.replace(/\{\{chainDamage\}\}/g, '50');
    } else if (rune.id === 'vampire') {
      description = description.replace(/\{\{value\}\}/g, '15');
    } else if (rune.id === 'execute') {
      description = description.replace(/\{\{value\}\}/g, '30');
      description = description.replace(/\{\{executeDamage\}\}/g, '50');
    } else if (rune.id === 'multicast') {
      description = description.replace(/\{\{value\}\}/g, '25');
    }

    return description;
  }

  /**
   * 渲染每日挑战模式信息
   * @param {Object} config - 每日挑战配置
   */
  async renderDailyModeInfo(config) {
    if (!config) {
      console.error('[UIManager] 每日挑战配置为空');
      return;
    }

    try {
      // 显示每日挑战信息面板
      const dailyInfo = document.querySelector('.daily-run-info');
      if (!dailyInfo) {
        console.warn('[UIManager] 每日挑战信息容器不存在');
        return;
      }
      dailyInfo.classList.remove('hidden');

      // 更新日期标题
      const dateHeader = document.getElementById('daily-date-header');
      if (dateHeader) {
        const now = new Date();
        const year = now.getUTCFullYear();
        const month = String(now.getUTCMonth() + 1).padStart(2, '0');
        const day = String(now.getUTCDate()).padStart(2, '0');
        dateHeader.textContent = `每日挑战 - ${year}-${month}-${day}`;
      }

      // ✅ FIX: 在每日挑战信息面板内添加难度提示（因为 .ror-diff-selector 在每日模式下被隐藏）
      // 检查是否已存在难度提示，避免重复添加
      let difficultyBadge = dailyInfo.querySelector('.daily-difficulty-badge');
      if (!difficultyBadge) {
        difficultyBadge = document.createElement('div');
        difficultyBadge.className = 'daily-difficulty-badge';
        difficultyBadge.textContent = '固定难度：层级 1';
        // 插入到日期标题下方（在 .daily-section 之前）
        const dailySection = dailyInfo.querySelector('.daily-section');
        if (dailySection) {
          dailyInfo.insertBefore(difficultyBadge, dailySection);
        } else if (dateHeader) {
          // 如果找不到 .daily-section，插入到日期标题后面
          dateHeader.insertAdjacentElement('afterend', difficultyBadge);
        } else {
          // 如果日期标题不存在，插入到容器开头
          dailyInfo.insertBefore(difficultyBadge, dailyInfo.firstChild);
        }
      }

      // 渲染词缀
      const modifiersContainer = document.getElementById('daily-modifiers-container');
      if (modifiersContainer) {
        modifiersContainer.innerHTML = '';
        // 防御性检查：确保 modifiers 是数组
        if (Array.isArray(config.modifiers) && config.modifiers.length > 0) {
          config.modifiers.forEach(modifier => {
            if (modifier && modifier.name) {
              const modifierEl = document.createElement('div');
              modifierEl.className = 'daily-modifier-item';
              modifierEl.innerHTML = `
                <span class="modifier-name ${modifier.type === 'positive' ? 'positive' : 'negative'}">
                  ${modifier.name || '未知词缀'}
                </span>
                <span class="modifier-desc">${modifier.description || ''}</span>
              `;
              modifiersContainer.appendChild(modifierEl);
            }
          });
        } else {
          modifiersContainer.innerHTML = '<div class="loading-text">词缀加载中...</div>';
        }
      }

      // 渲染初始遗物
      const relicContainer = document.getElementById('daily-relic-container');
      if (relicContainer) {
        // 防御性检查：确保 startingRune 存在且有必要的属性
        if (config.startingRune && config.startingRune.name) {
          const rune = config.startingRune;
          const runeName = rune.nameZh || rune.name; // 修复：使用中文名
          const runeDesc = this.formatRuneDescription(rune, 1); // 修复：格式化描述

          relicContainer.innerHTML = `
            <div class="daily-relic-item">
              <span class="relic-name">${runeName}</span>
              <span class="relic-desc">${runeDesc}</span>
            </div>
          `;
        } else {
          relicContainer.innerHTML = '<div class="loading-text">遗物加载中...</div>';
        }
      }

      // 异步加载排行榜（不阻塞界面显示，已包含 try-catch）
      this.loadDailyLeaderboard().catch(err => {
        console.error('[UIManager] 加载每日排行榜失败:', err);
      });
    } catch (error) {
      console.error('[UIManager] 渲染每日挑战信息时发生错误:', error);
      // 即使出错也尝试显示基本界面
      const dailyInfo = document.querySelector('.daily-run-info');
      if (dailyInfo) {
        dailyInfo.classList.remove('hidden');
      }
    }
  }

  /**
   * 加载每日排行榜（前3名）
   */
  async loadDailyLeaderboard() {
    const top3List = document.getElementById('daily-top3-list');
    if (!top3List) {
      console.warn('[UIManager] 排行榜容器不存在');
      return;
    }

    // 显示加载状态
    top3List.innerHTML = '<div class="loading-text">加载中...</div>';

    try {
      // 检查 supabaseService 是否已初始化
      if (!supabaseService || !supabaseService.isInitialized) {
        console.warn('[UIManager] SupabaseService 未初始化，跳过排行榜加载');
        top3List.innerHTML = '<div class="loading-text">排行榜服务未就绪</div>';
        return;
      }

      // 获取当前日期
      const now = new Date();
      const year = now.getUTCFullYear();
      const month = String(now.getUTCMonth() + 1).padStart(2, '0');
      const day = String(now.getUTCDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;

      // 获取排行榜数据
      const result = await supabaseService.getDailyLeaderboard(dateStr);

      if (!result.success || !result.data || result.data.length === 0) {
        top3List.innerHTML = '<div class="loading-text">暂无记录</div>';
        return;
      }

      // 只显示前3名
      const top3 = result.data.slice(0, 3);
      let html = '';

      top3.forEach(entry => {
        const rankClass = entry.rank === 1 ? 'rank-1' : entry.rank === 2 ? 'rank-2' : 'rank-3';
        html += `
          <div class="daily-rank-item ${rankClass}">
            <span class="rank-number">#${entry.rank}</span>
            <span class="rank-nickname">${this.escapeHtml(entry.nickname || '匿名')}</span>
            <span class="rank-score">${this.formatNumber(entry.score || 0)}</span>
          </div>
        `;
      });

      top3List.innerHTML = html;
    } catch (error) {
      console.error('[UIManager] 加载每日排行榜异常:', error);
      top3List.innerHTML = '<div class="loading-text">加载失败</div>';
    }
  }

  /**
   * HTML 转义工具方法
   * @param {string} text - 需要转义的文本
   * @returns {string} 转义后的文本
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * 格式化数字（添加千位分隔符）
   * @param {number} num - 数字
   * @returns {string} 格式化后的字符串
   */
  formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  /**
   * 销毁 UI 管理器（清理所有资源）
   */
  destroy() {
    this.overlayManager.destroy();
    this.inventoryUI.destroy();
    this.bestiaryUI.destroy();
    this.shopUI.destroy();
    
    if (this.logTimer) {
      clearTimeout(this.logTimer);
      this.logTimer = null;
    }
    
    console.log('✓ UIManager 已销毁');
  }

  /**
   * 显示楼层进场大字动画
   * @param {number} floor - 当前楼层
   */
  showLevelSplash(floor) {
    const container = document.getElementById('level-splash-container');
    const mainText = document.getElementById('level-splash-main');
    const subText = document.getElementById('level-splash-sub');
    
    if (!container || !mainText || !subText) return;
    
    // 1. 主标题文本
    mainText.textContent = `FLOOR ${floor}`;
    
    // 2. 查找所属区域名称
    let zoneName = 'Unknown Zone';
    const zone = FLOOR_ZONES.find(z => floor <= z.maxFloor);
    if (zone) {
      zoneName = zone.nameZh || zone.name;
    } else if (FLOOR_ZONES.length > 0) {
      const lastZone = FLOOR_ZONES[FLOOR_ZONES.length - 1];
      zoneName = lastZone.nameZh || lastZone.name;
    }
    
    // 每日挑战模式特殊文案
    if (window.game && window.game.isDailyMode) {
       subText.textContent = `每日挑战 - ${zoneName}`;
    } else {
       subText.textContent = zoneName;
    }

    // 3. 重置并触发动画
    container.classList.remove('active');
    // 强制回流以重置动画
    void container.offsetWidth;
    container.classList.add('active');
    
    // 4. 播放音效
    if (window.game && window.game.audio && typeof window.game.audio.playLevelStart === 'function') {
      window.game.audio.playLevelStart();
    }
  }
}
