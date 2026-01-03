// HUD.js - 抬头显示界面
// 负责左侧状态栏、血条、技能栏、日志的更新

import { ASSETS } from '../constants.js';

/**
 * HUD - 抬头显示界面管理器
 * 负责更新玩家状态显示（HP、怒气、属性、技能栏等）
 */
export class HUD {
  constructor() {
    this.logPanel = document.getElementById('log-panel');
    this.container = document.getElementById('system-log-container');
    this.logTimer = null;
    this.isLogLocked = false;
  }

  /**
   * 更新玩家状态显示
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
      // 怒气满值时变成红色加粗，否则保持白色普通
      if (player.stats.rage >= 100) {
        rageTextEl.style.color = '#ff0000';
        rageTextEl.style.fontWeight = 'bold';
        // 给整个怒气区域添加 full 类，触发CSS样式
        if (rageSection) rageSection.classList.add('full');
      } else {
        rageTextEl.style.color = '#ffffff';
        rageTextEl.style.fontWeight = 'normal';
        // 移除 full 类
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
    setText('ui-keys', player.stats.keys);
    setText('ui-gold', player.stats.gold ?? 0);
    setText('ui-lvl', player.stats.lvl);
    setText('ui-floor', player.stats.floor);

    // Soul Crystals
    const sc = window.game && window.game.metaSaveSystem ? window.game.metaSaveSystem.data.soulCrystals : 0;
    const scEl = document.getElementById('ui-soul-crystals');
    if (scEl) scEl.innerText = sc;

    // Crit Rate
    const critEl = document.getElementById('ui-crit');
    if (critEl) {
      const critRate = totals.crit_rate || 0.2;
      const critPercent = Math.floor(critRate * 100);
      critEl.innerText = `${critPercent}%`;
      
      // Check if there's any buff that affects crit rate
      const hasCritBuff = player.buffs && player.buffs.berserk && player.buffs.berserk.active;
      
      // Change color to red if there's a buff affecting crit rate
      if (hasCritBuff) {
        critEl.style.color = '#ff0000'; // Red when buff is active
      } else {
        critEl.style.color = ''; // Reset to default color
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
    
    // ✅ FIX: 技能预备状态高亮显示
    // 技能槽位索引：0=Slash, 1=Scorch, 2=Freeze
    const skillSlots = [
      { id: 'skill-icon-0', state: 'slashPrimed' },
      { id: 'skill-icon-1', state: 'scorchPrimed' },
      { id: 'skill-icon-2', state: 'freezePrimed' }
    ];
    
    skillSlots.forEach(({ id, state }) => {
      const skillIcon = document.getElementById(id);
      if (skillIcon) {
        const skillSlot = skillIcon.closest('.skill-slot');
        const isActive = player.states && player.states[state];
        
        if (isActive) {
          // 添加高亮类
          skillSlot?.classList.add('skill-active');
        } else {
          // 移除高亮类
          skillSlot?.classList.remove('skill-active');
        }
      }
    });
  }

  /**
   * 记录日志消息
   * @param {string} msg - 消息内容
   * @param {string} type - 消息类型 ('info', 'warning', 'error', 'combat')
   */
  logMessage(msg, type = 'info') {
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
      if (this.logTimer) { 
        clearTimeout(this.logTimer); 
        this.logTimer = null; 
      }
      if (!this.isLogLocked) {
        this.logTimer = setTimeout(() => {
          if (!this.isLogLocked && this.container) this.container.style.opacity = '0';
        }, 3000); // 3s 更易读
      }
    }
  }

  /**
   * 切换日志锁定状态
   */
  toggleLog() {
    this.isLogLocked = !this.isLogLocked;
    if (this.container) {
      if (this.isLogLocked) {
        this.container.style.opacity = '1';
        if (this.logTimer) { 
          clearTimeout(this.logTimer); 
          this.logTimer = null; 
        }
        // 不在这里递归调用 logMessage，避免死循环；仅在 UI 上提示
        const tip = document.createElement('div');
        tip.className = 'log-entry log-info';
        tip.innerHTML = '> 日志已锁定';
        this.logPanel.appendChild(tip);
      } else {
        if (this.logTimer) { 
          clearTimeout(this.logTimer); 
          this.logTimer = null; 
        }
        // 立即开始淡出
        this.container.style.opacity = '0';
        const tip = document.createElement('div');
        tip.className = 'log-entry log-info';
        tip.innerHTML = '> 日志自动隐藏';
        this.logPanel.appendChild(tip);
      }
    }
  }

  /**
   * 初始化技能栏
   * @param {Player} player - 玩家对象
   */
  initSkillBar(player) {
    const skillBar = document.getElementById('skill-bar');
    console.log('🎯 initSkillBar called', { skillBar, player });
    
    if (!skillBar) {
      console.error('❌ Skill bar element not found');
      return;
    }
    
    if (!player) {
      console.error('❌ Player object is null');
      return;
    }
    
    if (!player.skills) {
      console.error('❌ Player skills not initialized', player);
      return;
    }
    
    // Clear existing slots
    skillBar.innerHTML = '';
    console.log('✅ Skill bar cleared');
    
    // Create 3 skill slots: Passive, Active, ULT
    const skillTypes = ['PASSIVE', 'ACTIVE', 'ULT'];
    
    let slotsCreated = 0;
    skillTypes.forEach((skillType, index) => {
      const skillData = player.skills[skillType];
      if (!skillData) {
        console.warn(`⚠️  Skill data not found for ${skillType}`);
        return;
      }
      
      console.log(`📝 Creating skill slot for ${skillType}`, skillData);
      
      const slot = document.createElement('div');
      slot.className = 'skill-slot';
      slot.dataset.skillType = skillType;
      slot.title = skillData.name || skillType;
      
      // Create skill icon
      const icon = document.createElement('div');
      icon.className = 'skill-icon';
      
      // Set background position based on iconIndex (3x3 grid = 300%)
      if (skillData.iconIndex !== undefined) {
        const col = skillData.iconIndex % 3;
        const row = Math.floor(skillData.iconIndex / 3);
        const pos = ['0%', '50%', '100%'];
        icon.style.backgroundPosition = `${pos[col]} ${pos[row]}`; // 与角色选择页一致：0/50/100
        icon.style.backgroundSize = '300% 300%';
        icon.style.backgroundImage = `url('${ASSETS.ICONS_SKILLS.url}')`;
        console.log(`  📍 Icon position: ${pos[col]} ${pos[row]} (index: ${skillData.iconIndex})`);
      }
      
      // Create cooldown overlay
      const cooldownOverlay = document.createElement('div');
      cooldownOverlay.className = 'cooldown-overlay';
      
      // Create key hint
      const keyHint = document.createElement('div');
      keyHint.className = 'skill-key-hint';
      if (skillData.key) {
        keyHint.innerText = skillData.key === 'SPACE' ? 'SPC' : skillData.key;
      }
      
      // Add decorative frame first (behind icon)
      const frame = document.createElement('div');
      frame.className = 'skill-frame';
      slot.appendChild(frame);
      // Append icon (above frame)
      slot.appendChild(icon);
      // Then cooldown overlay (above icon)
      slot.appendChild(cooldownOverlay);
      // Then key hint (top-most)
      slot.appendChild(keyHint);
      
      skillBar.appendChild(slot);
      slotsCreated++;
      console.log(`✅ Skill slot created for ${skillType}`);
    });
    
    console.log(`🎉 Skill bar initialized with ${slotsCreated} slots`);
    console.log('📊 Skill bar element:', skillBar);
    console.log('📊 Skill bar children:', skillBar.children.length);
    console.log('📊 Skill bar computed style:', window.getComputedStyle(skillBar));
  }

  /**
   * 更新技能栏冷却显示
   * @param {Player} player - 玩家对象
   */
  updateSkillBar(player) {
    if (!player || !player.skills || !player.cooldowns) return;
    
    const slots = document.querySelectorAll('.skill-slot');
    const skillTypes = ['PASSIVE', 'ACTIVE', 'ULT'];
    
    slots.forEach((slot, index) => {
      const skillType = skillTypes[index];
      if (!skillType) return;
      
      const skillData = player.skills[skillType];
      if (!skillData) return;
      
      // Get cooldown info
      let currentCd = 0;
      let maxCd = 0;
      
      if (skillType === 'ACTIVE') {
        currentCd = Math.max(0, player.cooldowns.active);
        maxCd = player.cooldowns.maxActive || 5000;
      } else if (skillType === 'ULT') {
        currentCd = Math.max(0, player.cooldowns.ult);
        maxCd = player.cooldowns.maxUlt || 20000;
      }
      
      // Update cooldown overlay height (percentage)
      const cooldownPercent = maxCd > 0 ? (currentCd / maxCd) * 100 : 0;
      const overlay = slot.querySelector('.cooldown-overlay');
      if (overlay) {
        overlay.style.height = `${cooldownPercent}%`;
      }
      
      // Update on-cooldown class
      if (currentCd > 0) {
        slot.classList.add('on-cooldown');
      } else {
        slot.classList.remove('on-cooldown');
      }
    });
  }

  /**
   * 添加遗物到遗物栏（旧方法，保留以兼容）
   * @param {string} relicName - 遗物名称
   */
  addRelic(relicName) {
    const relicBar = document.getElementById('relic-bar');
    if (!relicBar) return;
    
    const slots = relicBar.querySelectorAll('.relic-slot');
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
        
        // 添加 Tooltip 支持 (假设使用了 TooltipManager 或 title 属性)
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
}

