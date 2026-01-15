// HUD.js - 抬头显示界面
// 负责左侧状态栏、血条、技能栏、日志的更新

import { ASSETS } from '../constants.js';
import { globalTooltipManager } from '../utils/TooltipManager.js';

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
    
    // ✅ 性能优化：DOM 元素缓存
    this.domCache = {};
    
    // ✅ 性能优化：状态缓存（用于脏检查）
    this.stateCache = {};
    
    // ✅ 性能优化：日志滚动锁，防止高频日志导致重排卡顿
    this.scrollPending = false;
  }
  
  /**
   * ✅ 性能优化：获取缓存的 DOM 元素
   * @param {string} id - 元素 ID
   * @returns {HTMLElement|null} DOM 元素
   */
  getCachedElement(id) {
    if (!this.domCache[id]) {
      this.domCache[id] = document.getElementById(id);
    }
    return this.domCache[id];
  }
  
  /**
   * ✅ 性能优化：仅在值变化时更新文本（脏检查）
   * @param {string} id - 元素 ID
   * @param {any} value - 新值
   */
  updateTextIfChanged(id, value) {
    // 转换为字符串进行比较，确保 0 和 "0" 也能正确处理
    const strValue = String(value);
    if (this.stateCache[id] !== strValue) {
      const el = this.getCachedElement(id);
      if (el) {
        el.innerText = strValue;
        this.stateCache[id] = strValue;
      }
    }
  }
  
  /**
   * ✅ 性能优化：仅在值变化时更新样式属性（脏检查）
   * @param {string} id - 元素 ID
   * @param {string} property - CSS 属性名（如 'width'）
   * @param {string} value - 新值
   */
  updateStyleIfChanged(id, property, value) {
    const cacheKey = `${id}_${property}`;
    if (this.stateCache[cacheKey] !== value) {
      const el = this.getCachedElement(id);
      if (el) {
        el.style[property] = value;
        this.stateCache[cacheKey] = value;
      }
    }
  }

  /**
   * 更新玩家状态显示
   * @param {Player} player - 玩家对象
   */
  updateStats(player) {
    // ✅ 性能优化：使用缓存的 DOM 元素检查
    if (!this.getCachedElement('ui-hp')) return;
    
    // HP
    this.updateTextIfChanged('ui-hp', player.stats.hp);
    this.updateTextIfChanged('ui-hp-max', player.stats.maxHp);
    const hpPercent = Math.max(0, (player.stats.hp / player.stats.maxHp) * 100);
    // ✅ 性能优化：仅在百分比变化时更新宽度
    this.updateStyleIfChanged('hp-visual-fill', 'width', `${hpPercent}%`);

    // Rage
    const ragePercent = player.stats.rage;
    // ✅ 性能优化：仅在百分比变化时更新宽度
    this.updateStyleIfChanged('rage-fill', 'width', `${ragePercent}%`);
    
    const rageTextEl = this.getCachedElement('rage-text');
    const rageSection = document.querySelector('.rage-section'); // 这个元素不常变化，不需要缓存
    
    if (rageTextEl) {
      this.updateTextIfChanged('rage-text', `${ragePercent}%`);
      
      // ✅ 性能优化：仅在怒气状态（是否满100）发生改变时，才修改样式
      const isRageFull = ragePercent >= 100;
      const rageStateKey = 'rage-full-state';
      if (this.stateCache[rageStateKey] !== isRageFull) {
        if (isRageFull) {
          rageTextEl.style.color = '#ff0000';
          rageTextEl.style.fontWeight = 'bold';
          if (rageSection) rageSection.classList.add('full');
        } else {
          rageTextEl.style.color = '#ffffff';
          rageTextEl.style.fontWeight = 'normal';
          if (rageSection) rageSection.classList.remove('full');
        }
        this.stateCache[rageStateKey] = isRageFull;
      }
    }

    // ULT button
    const btnUlt = this.getCachedElement('btn-ultimate');
    const isRageFull = player.stats.rage >= 100;
    const ultReadyKey = 'ult-ready-state';
    if (this.stateCache[ultReadyKey] !== isRageFull) {
      if (isRageFull) { 
        btnUlt?.classList.add('ready'); 
        btnUlt?.removeAttribute('disabled'); 
      } else { 
        btnUlt?.classList.remove('ready'); 
        btnUlt?.setAttribute('disabled', 'true'); 
      }
      this.stateCache[ultReadyKey] = isRageFull;
    }

    // Stats & 计算总属性
    const totals = (player.getTotalStats ? player.getTotalStats() : player.stats);

    // ========== MP 条 ==========
    // 如果还没有 MP 条 DOM，则动态创建，放在怒气条下方
    if (!this.getCachedElement('mp-fill')) {
      if (typeof this.createMpBar === 'function') {
        this.createMpBar();
      }
    }

    const maxMp = player.stats.maxMp ?? totals.maxMp ?? 0;
    const currentMp = player.stats.mp ?? 0;
    if (maxMp > 0) {
      const mpPercent = Math.max(0, Math.min(100, (currentMp / maxMp) * 100));
      this.updateStyleIfChanged('mp-fill', 'width', `${mpPercent}%`);
    } else {
      this.updateStyleIfChanged('mp-fill', 'width', `0%`);
    }

    const mpRegen = totals.mp_regen ?? player.stats.mp_regen ?? 0;
    const regenText = mpRegen ? mpRegen.toFixed(1) : '0.0';
    this.updateTextIfChanged('mp-text', `MP: ${Math.floor(currentMp)}/${Math.floor(maxMp)} (+${regenText})`);

    // Stats 文本
    this.updateTextIfChanged('ui-patk', totals.p_atk);
    this.updateTextIfChanged('ui-matk', totals.m_atk);
    this.updateTextIfChanged('ui-pdef', totals.p_def);
    this.updateTextIfChanged('ui-mdef', totals.m_def);
    this.updateTextIfChanged('ui-keys', player.stats.keys);
    this.updateTextIfChanged('ui-gold', player.stats.gold ?? 0);
    this.updateTextIfChanged('ui-lvl', player.stats.lvl);
    this.updateTextIfChanged('ui-floor', player.stats.floor);

    // Soul Crystals
    const sc = window.game && window.game.metaSaveSystem ? window.game.metaSaveSystem.data.soulCrystals : 0;
    this.updateTextIfChanged('ui-soul-crystals', sc);

    // Crit Rate
    const critEl = this.getCachedElement('ui-crit');
    if (critEl) {
      const critRate = totals.crit_rate || 0.2;
      const critPercent = Math.floor(critRate * 100);
      this.updateTextIfChanged('ui-crit', `${critPercent}%`);
      
      // Check if there's any buff that affects crit rate
      const hasCritBuff = player.buffs && player.buffs.berserk && player.buffs.berserk.active;
      
      // ✅ 性能优化：仅在 buff 状态变化时更新颜色
      const critBuffKey = 'crit-buff-state';
      if (this.stateCache[critBuffKey] !== hasCritBuff) {
        if (hasCritBuff) {
          critEl.style.color = '#ff0000'; // Red when buff is active
        } else {
          critEl.style.color = ''; // Reset to default color
        }
        this.stateCache[critBuffKey] = hasCritBuff;
      }
    }

    // XP Bar
    const xpNow = player.stats.xp ?? 0;
    const xpNext = Math.max(1, player.stats.nextLevelXp ?? 1);
    const xpPercent = Math.max(0, Math.min(100, Math.floor((xpNow / xpNext) * 100)));
    // ✅ 性能优化：仅在百分比变化时更新宽度
    this.updateStyleIfChanged('xp-fill', 'width', `${xpPercent}%`);
    this.updateTextIfChanged('ui-xp', xpNow);
    this.updateTextIfChanged('ui-xp-max', xpNext);
    
    // ✅ FIX: 技能预备状态高亮显示 - 重写逻辑，修正映射关系
    // 索引映射：0=Passive, 1=Active (Q技能), 2=Ult (大招)
    
    // Q 技能图标 (skill-icon-1) - 对应 Active 技能
    const activeSkillIcon = this.getCachedElement('skill-icon-1');
    if (activeSkillIcon) {
      const activeSkillSlot = activeSkillIcon.closest('.skill-slot');
      // 检查 slashPrimed (战士) 或 scorchPrimed (法师) 是否为真
      const isActiveSkillPrimed = !!(player.states && (player.states.slashPrimed || player.states.scorchPrimed));
      
      // ✅ 性能优化：仅在状态变化时更新类
      const activeSkillStateKey = 'skill-icon-1-active';
      if (this.stateCache[activeSkillStateKey] !== isActiveSkillPrimed) {
        if (isActiveSkillPrimed) {
          activeSkillSlot?.classList.add('skill-active');
        } else {
          activeSkillSlot?.classList.remove('skill-active');
        }
        this.stateCache[activeSkillStateKey] = isActiveSkillPrimed;
      }
    }
    
    // Ult 技能图标 (skill-icon-2) - 对应大招
    const ultSkillIcon = this.getCachedElement('skill-icon-2');
    if (ultSkillIcon) {
      const ultSkillSlot = ultSkillIcon.closest('.skill-slot');
      // 检查 freezePrimed 是否为真
      const isUltSkillPrimed = !!(player.states && player.states.freezePrimed);
      
      // ✅ 性能优化：仅在状态变化时更新类
      const ultSkillStateKey = 'skill-icon-2-active';
      if (this.stateCache[ultSkillStateKey] !== isUltSkillPrimed) {
        if (isUltSkillPrimed) {
          ultSkillSlot?.classList.add('skill-active');
        } else {
          ultSkillSlot?.classList.remove('skill-active');
        }
        this.stateCache[ultSkillStateKey] = isUltSkillPrimed;
      }
    }
  }

  /**
   * 动态创建 MP 条，插入到怒气条下方
   */
  createMpBar() {
    const rageSection = document.querySelector('.rage-section');
    if (!rageSection || !rageSection.parentElement) return;

    const mpRow = document.createElement('div');
    mpRow.className = 'stat-row mp-section';
    mpRow.id = 'ui-mp';

    const label = document.createElement('div');
    label.className = 'stat-label';
    label.innerText = 'MP';

    const barContainer = document.createElement('div');
    barContainer.className = 'bar-container';

    const barFill = document.createElement('div');
    barFill.id = 'mp-fill';
    barFill.className = 'bar-fill';
    barFill.style.backgroundColor = '#3399FF';
    barFill.style.width = '100%';

    const barText = document.createElement('div');
    barText.id = 'mp-text';
    barText.className = 'bar-text';
    barText.innerText = 'MP: 0/0 (+0.0)';

    barContainer.appendChild(barFill);
    barContainer.appendChild(barText);
    mpRow.appendChild(label);
    mpRow.appendChild(barContainer);

    // 严格插在怒气条下方
    const parent = rageSection.parentElement;
    if (rageSection.nextSibling) {
      parent.insertBefore(mpRow, rageSection.nextSibling);
    } else {
      parent.appendChild(mpRow);
    }
  }

  /**
   * 记录日志消息
   * @param {string} msg - 消息内容
   * @param {string} type - 消息类型 ('info', 'warning', 'error', 'combat')
   */
  logMessage(msg, type = 'info') {
    if (!this.logPanel) return;

    // ✅ 性能优化：1. 添加节点 (开销较小，保持同步以确保内容即时添加)
    const entry = document.createElement('div');
    entry.className = `log-entry log-${type}`;
    entry.innerText = `> ${msg}`; // 使用 innerText 防止 XSS，且比 innerHTML 快
    this.logPanel.appendChild(entry);

    // ✅ 性能优化：2. 优化滚动和清理：每帧只执行一次 (开销大，因为涉及布局计算)
    // 使用 scrollPending 锁，确保每一帧只执行一次滚动/清理操作
    if (!this.scrollPending) {
      this.scrollPending = true;
      requestAnimationFrame(() => {
        try {
          // 清理旧日志
          while (this.logPanel.children.length > 20) {
            this.logPanel.firstChild.remove();
          }
          // 滚动到底部
          if (this.container) {
            this.container.scrollTop = this.container.scrollHeight;
          }
        } catch (err) {
          // 忽略可能的错误（如元素已被移除）
        }
        this.scrollPending = false;
      });
    }

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
      console.error('Skill bar element not found');
      return;
    }
    
    if (!player) {
      console.error('Player object is null');
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
      
      // 绑定高级 Tooltip
      globalTooltipManager.bind(slot, {
        type: 'SKILL',
        category: skillType,
        data: skillData
      });
      
      // 添加点击交互（被动技能不可点击）
      if (skillType !== 'PASSIVE') {
        slot.style.cursor = 'pointer';
        slot.onclick = (e) => {
          e.stopPropagation();
          
          // 简单的视觉反馈
          slot.style.transform = 'scale(0.95)';
          setTimeout(() => {
            slot.style.transform = '';
          }, 100);
          
          // 调用玩家施法逻辑
          if (skillType === 'ACTIVE') {
            // 检查是否被冰冻
            if (player.hasStatus && player.hasStatus('FROZEN')) {
              if (window.game && window.game.ui) {
                window.game.ui.logMessage('冰冻状态下无法使用技能！', 'warning');
              }
              return;
            }
            
            // 检查是否已经处于就绪状态 (Primed)
            // 这里的检查逻辑与 updateStats 中的高亮逻辑保持一致
            const activeStateKey = skillData.id ? `${skillData.id}Primed` : null;
            const isPrimed = (player.states && (
              player.states.activeSkillPrimed || 
              (activeStateKey && player.states[activeStateKey]) ||
              // 兼容旧代码
              player.states.slashPrimed || 
              player.states.scorchPrimed
            ));

            if (isPrimed) {
              console.log('Skill is already primed, ignoring click.');
              return; // 已经就绪，忽略点击
            }
            
            // 调用主动技能
            if (player.castActiveSkill) {
              player.castActiveSkill();
            }
          } else if (skillType === 'ULT') {
            // 调用终极技能（activateUltimate 内部会检查冰冻状态和怒气）
            if (window.game && window.game.activateUltimate) {
              window.game.activateUltimate();
            } else if (player.castUltimateSkill) {
              // 如果没有 game.activateUltimate，直接调用 player 方法（需要手动检查）
              if (player.hasStatus && player.hasStatus('FROZEN')) {
                if (window.game && window.game.ui) {
                  window.game.ui.logMessage('冰冻状态下无法使用必杀技！', 'warning');
                }
                return;
              }
              
              if (player.stats.rage < 100) {
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
            }
          }
        };
      }
      
      // Create skill icon
      const icon = document.createElement('div');
      icon.className = 'skill-icon';
      icon.id = `skill-icon-${index}`; // ✅ 分配 ID (0=Passive, 1=Active, 2=Ult)
      
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
    console.log('✅ Skill bar initialization complete - Tooltip and click interactions ready');
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

