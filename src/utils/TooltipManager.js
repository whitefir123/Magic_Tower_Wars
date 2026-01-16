// TooltipManager.js - 统一的提示框管理器
// 消除重复代码，统一管理所有 tooltip 显示逻辑

import { EQUIPMENT_DB } from '../constants.js';
import { getSetConfig } from '../data/sets.js';
import { ITEM_QUALITY } from '../data/loot.js';

/**
 * TooltipManager - 提示框管理器
 * 统一管理游戏中所有的 tooltip 显示逻辑
 */
export class TooltipManager {
  constructor(config = {}) {
    // 配置
    this.config = {
      offsetX: config.offsetX || 12,
      offsetY: config.offsetY || 12,
      zIndex: config.zIndex || 1000000,
      ...config
    };

    // 获取或创建 tooltip 元素
    this.tooltip = this.getOrCreateTooltip();
    
    // 中文映射表（扩展支持程序化生成属性）
    this.statNameMap = {
      p_atk: '物攻',
      m_atk: '魔攻',
      p_def: '物防',
      m_def: '魔防',
      maxHp: '生命值',
      maxMp: '魔法值',
      crit_rate: '暴击率',
      dodge: '闪避率',
      armor_pen: '护甲穿透',
      lifesteal: '生命偷取',
      gold: '金币加成',
      fovRadius: '视野范围'
    };

    this.typeNameMap = {
      WEAPON: '武器',
      ARMOR: '护甲',
      HELM: '头盔',
      BOOTS: '靴子',
      RING: '戒指',
      AMULET: '护身符',
      CONSUMABLE: '消耗品'
    };
    
    // ✅ v2.0: 品质颜色映射表（用于浅色背景适配）
    this.qualityColorMap = {
      '#ffffff': '#5d4037', // Common: White -> Dark Brown
      '#1eff00': '#2e7d32', // Uncommon: Bright Green -> Dark Green
      '#0070dd': '#01579b', // Rare: Blue -> Dark Blue
      '#a335ee': '#4a148c', // Epic: Purple -> Dark Purple
      '#ff8000': '#e65100', // Legendary: Orange -> Dark Orange
      '#e6cc80': '#827717'  // Mythic: Pale Gold -> Dark Gold
    };
  }

  /**
   * 获取或创建 tooltip 元素
   * @returns {HTMLElement}
   */
  getOrCreateTooltip() {
    let tooltip = document.getElementById('tooltip');
    
    if (!tooltip) {
      console.warn('⚠️ Tooltip element not found, creating it');
      tooltip = document.createElement('div');
      tooltip.id = 'tooltip';
      tooltip.className = 'hidden';
      tooltip.style.position = 'fixed';
      tooltip.style.zIndex = this.config.zIndex.toString();
      document.body.appendChild(tooltip);
      console.log('✅ Tooltip element created');
    }
    
    return tooltip;
  }

  /**
   * 生成物品的 tooltip 内容（HTML）
   * @param {string|Object} itemOrId - 物品ID字符串或物品对象
   * @returns {string} HTML 内容
   */
  generateTooltipContent(itemOrId) {
    if (!itemOrId) {
      return '';
    }
    
    // 如果是技能对象，使用专用生成器
    if (itemOrId && itemOrId.type === 'SKILL') {
      return this.generateSkillTooltip(itemOrId);
    }
    
    // ✅ FIX: 支持物品对象和字符串ID
    let item = null;
    let itemId = null;
    
    if (typeof itemOrId === 'string') {
      // 字符串ID
      itemId = itemOrId;
      item = EQUIPMENT_DB[itemId];
    } else if (typeof itemOrId === 'object') {
      // 物品对象
      item = itemOrId;
      itemId = item.itemId || item.id;
      // 如果对象缺少某些属性，从数据库补充
      if (itemId && EQUIPMENT_DB[itemId]) {
        const dbItem = EQUIPMENT_DB[itemId];
        // 合并，实例属性优先（这样可以使用强化后的属性）
        item = { ...dbItem, ...itemOrId };
      }
    }
    
    if (!item) {
      return '';
    }

    // ✅ FIX: 优先使用实例对象的nameZh（可能包含品质和强化等级信息）
    const displayName = item.nameZh || item.name || item.displayName || '未知物品';
    const typeZh = this.typeNameMap[item.type] || item.type;
    
    // 获取物品品质对应的颜色
    const qualityKey = (item.quality || item.rarity || 'COMMON').toUpperCase();
    const qualityConfig = ITEM_QUALITY[qualityKey] || ITEM_QUALITY.COMMON;
    const qualityColor = qualityConfig.color || '#ffffff';
    // ✅ FIX: 适配浅色背景，使用深色版本的品质颜色
    const displayColor = this.qualityColorMap[qualityColor] || (qualityColor === '#ffffff' ? '#5d4037' : qualityColor);
    const qualityName = qualityConfig.name || qualityKey;
    
    // 应用品质颜色到物品名称
    let content = `<div class="tt-name" style="color: ${displayColor};">${displayName}</div>`;
    content += `<div class="tt-type">${typeZh}</div>`;
    
    // 显示品质和强化等级（如果有）
    // v2.0 FIX: 移除重复的品质显示，只保留强化等级
    // if (item.quality || item.rarity) {
    //   content += `<div class="tt-quality" style="color: ${displayColor};">${qualityName}</div>`;
    // }
    
    if (item.enhanceLevel && item.enhanceLevel > 0) {
      content += `<div class="tt-enhance">强化等级: +${item.enhanceLevel}</div>`;
    }
    
    // 显示物品等级（程序化生成）
    // v2.0 FIX: 移除 iPwr 显示
    // if (item.itemPower) {
    //   content += `<div class="tt-ipower">物品等级: ${item.itemPower}</div>`;
    // }
    
    // 显示描述（包括 Jackpot 等特殊标记）
    if (item.description) {
      content += `<div class="tt-desc">${item.description}</div>`;
    }
    
    // ✅ v2.0: 显示词缀信息（改进版，支持特殊词缀描述）
    if (item.meta && item.meta.affixes && Array.isArray(item.meta.affixes)) {
      for (const affix of item.meta.affixes) {
        const affixType = affix.type === 'prefix' ? '前缀' : '后缀';
        // v2.0 FIX: 确保词缀名称为中文，如果无中文名则不显示
        const affixName = affix.nameZh || '';
        
        if (!affixName) continue; // 如果没有中文名，跳过显示
        
        // 检查是否有特殊效果（转化、触发等）
        let affixDesc = '';
        if (affix.stats) {
          const statEntries = Object.entries(affix.stats);
          const descParts = [];
          
          for (const [statKey, statValue] of statEntries) {
            // v2.1 FIX: 隐藏 multiplier 属性，它是内部计算用的
            if (statKey === 'multiplier') continue;

            // 检查是否是转化类词缀
            if (statKey.includes('_to_') || statKey.includes('_percent')) {
              // 转化类词缀：显示完整描述
              if (statKey === 'p_def_to_p_atk') {
                descParts.push(`将${(statValue * 100).toFixed(0)}%的护甲转化为攻击力`);
              } else if (statKey === 'm_def_to_m_atk') {
                descParts.push(`将${(statValue * 100).toFixed(0)}%的魔法防御转化为魔法攻击`);
              } else {
                descParts.push(`${this.statNameMap[statKey] || statKey}: ${statValue}`);
              }
            } else {
              // 普通词缀：显示数值
              const statName = this.statNameMap[statKey] || statKey;
              const isPercentage = statKey.includes('rate') || statKey.includes('dodge') || 
                                   statKey.includes('pen') || statKey.includes('gold') || 
                                   statKey.includes('lifesteal');
              const displayValue = isPercentage 
                ? `${(statValue * 100).toFixed(1)}%` 
                : `+${Math.floor(statValue)}`;
              descParts.push(`${statName} ${displayValue}`);
            }
          }
          
          if (descParts.length > 0) {
            affixDesc = `: ${descParts.join(', ')}`;
          }
        }
        
        const affixClass = affix.type === 'prefix' ? 'tt-affix tt-prefix' : 'tt-affix tt-suffix';
        content += `<div class="${affixClass}">${affixType}: ${affixName}${affixDesc}</div>`;
      }
    } else if (item.meta) {
      // 兼容旧格式（只有 prefix/suffix 字符串）
      // v2.0 FIX: 不显示未翻译的英文词缀字符串
      if (item.meta.prefix && /[\u4e00-\u9fa5]/.test(item.meta.prefix)) {
        content += `<div class="tt-affix tt-prefix">前缀: ${item.meta.prefix}</div>`;
      }
      if (item.meta.suffix && /[\u4e00-\u9fa5]/.test(item.meta.suffix)) {
        content += `<div class="tt-affix tt-suffix">后缀: ${item.meta.suffix}</div>`;
      }
    }
    
    // ✅ 宝石镶嵌系统：显示孔位状态（在传奇特效之前）
    if (item.meta && item.meta.sockets && Array.isArray(item.meta.sockets) && item.meta.sockets.length > 0) {
      content += `<div class="tt-sockets" style="margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(212, 175, 55, 0.3);">`;
      content += `<div style="color: #d4af37; font-weight: 600; margin-bottom: 5px;">镶嵌槽位:</div>`;
      
      item.meta.sockets.forEach((socket, index) => {
        if (socket.status === 'FILLED' && socket.gemId) {
          // 已镶嵌：显示宝石信息
          const gemDef = EQUIPMENT_DB[socket.gemId];
          if (gemDef) {
            const gemName = gemDef.nameZh || gemDef.name || '未知宝石';
            const gemQuality = (gemDef.quality || gemDef.rarity || 'COMMON').toUpperCase();
            // 复用 ITEM_QUALITY 颜色配置
            const gemQualityConfig = ITEM_QUALITY[gemQuality] || ITEM_QUALITY.COMMON;
            const gemColor = gemQualityConfig.color || '#ffffff';
            
            // 获取宝石效果描述
            let gemEffectDesc = '';
            if (gemDef.gemEffects) {
              const weaponEffect = gemDef.gemEffects.weapon;
              const armorEffect = gemDef.gemEffects.armor;
              const isWeapon = item.type === 'WEAPON';
              const effect = isWeapon ? weaponEffect : armorEffect;
              
              if (effect) {
                const effectParts = [];
                
                // 属性加成
                for (const [statKey, statValue] of Object.entries(effect)) {
                  if (statKey === 'infuseElement') continue; // 元素注灵单独显示
                  
                  const statName = this.statNameMap[statKey] || statKey;
                  const isPercentage = statKey.includes('rate') || statKey.includes('dodge') || 
                                       statKey.includes('pen') || statKey.includes('gold') || 
                                       statKey.includes('lifesteal');
                  const displayValue = isPercentage 
                    ? `${(statValue * 100).toFixed(0)}%` 
                    : `+${Math.floor(statValue)}`;
                  effectParts.push(`${statName} ${displayValue}`);
                }
                
                // 元素注灵
                if (effect.infuseElement) {
                  const elementNames = {
                    'PYRO': '🔥 攻击附带火元素',
                    'CRYO': '❄️ 攻击附带冰元素',
                    'ELECTRO': '⚡ 攻击附带雷元素',
                    'POISON': '☠️ 攻击附带毒元素',
                    'PHYSICAL': '⚔️ 攻击附带物理元素'
                  };
                  const elementName = elementNames[effect.infuseElement] || `攻击附带${effect.infuseElement}元素`;
                  effectParts.push(elementName);
                }
                
                if (effectParts.length > 0) {
                  gemEffectDesc = ` (${effectParts.join(', ')})`;
                }
              }
            }
            
            content += `<div style="color: ${gemColor}; font-size: 12px; margin: 3px 0;">● ${gemName}${gemEffectDesc}</div>`;
          }
        } else {
          // 空槽位
          content += `<div style="color: #888; font-size: 12px; margin: 3px 0;">○ [空镶嵌槽]</div>`;
        }
      });
      
      content += `</div>`;
    }
    
    // ✅ v2.0: 显示传奇特效（醒目的暗金色）
    if (item.meta && item.meta.uniqueEffect && item.meta.uniqueEffect.id) {
      const uniqueEffect = item.meta.uniqueEffect;
      const effectName = uniqueEffect.nameZh || uniqueEffect.name || uniqueEffect.id;
      const effectDesc = uniqueEffect.descriptionZh || uniqueEffect.description || '';
      const chance = uniqueEffect.chance !== undefined ? (uniqueEffect.chance * 100).toFixed(0) : '100';
      
      content += `<div class="tt-unique-effect">`;
      content += `<div class="tt-unique-title">★ ${effectName}</div>`;
      if (effectDesc) {
        content += `<div class="tt-unique-desc">${effectDesc}</div>`;
      } else {
        // 如果没有描述，根据ID生成默认描述
        if (uniqueEffect.id === 'LIGHTNING_CHAIN') {
          content += `<div class="tt-unique-desc">攻击时 ${chance}% 概率触发闪电链，对目标周围2格内的敌人造成50%伤害</div>`;
        }
      }
      content += `</div>`;
    }

    // 消耗品效果
    if (item.type === 'CONSUMABLE' && item.effect) {
      const eff = item.effect;
      let effText = '';
      switch (eff.kind) {
        case 'heal': effText = `回复 ${eff.amount || 0} HP`; break;
        case 'rage': effText = `怒气 +${eff.amount || 0}`; break;
        case 'xp': effText = `获得 ${eff.amount || 0} XP`; break;
        case 'fire': effText = `造成 ${eff.amount || 0} 伤害`; break;
        default: effText = '使用物品'; break;
      }
      // ✅ 消耗品效果：深灰色
      content += `<div class="tt-stat" style="color: #333333;">${effText}</div>`;
    } else {
      // ✅ V2.0: 装备属性 - 改进显示格式，区分底材和词缀加成
      const statsToShow = item.stats || {};
      const baseStats = item.baseStats || {};
      const enhanceLevel = item.enhanceLevel || 0;
      
      const lines = Object.entries(statsToShow)
        .map(([k, v]) => {
          const statName = this.statNameMap[k] || k;
          // 百分比属性特殊处理
          const isPercentage = k.includes('rate') || k.includes('dodge') || 
                               k.includes('pen') || k.includes('gold') || 
                               k.includes('lifesteal') || k.includes('_percent');
          
          // 主数值（最终值）
          const displayValue = isPercentage 
            ? `${(v * 100).toFixed(1)}%` 
            : `+${Math.floor(v)}`;
          
          // ✅ V2.0: 计算底材和词缀加成
          let subText = '';
          if (baseStats[k] !== undefined) {
            // 计算当前强化后的底材数值
            const enhanceMultiplier = 1 + (enhanceLevel * 0.1);
            let enhancedBase = baseStats[k] * enhanceMultiplier;
            
            if (isPercentage) {
              enhancedBase = Math.round(enhancedBase * 100) / 100;
            } else {
              enhancedBase = Math.floor(enhancedBase);
            }
            
            // 计算词缀带来的额外加成
            const affixBonus = isPercentage 
              ? (v - enhancedBase)
              : (Math.floor(v) - enhancedBase);
            
            // 格式化底材数值
            const baseDisplay = isPercentage 
              ? `${(enhancedBase * 100).toFixed(1)}%`
              : enhancedBase;
            
            // 如果有词缀加成，显示副说明
            if (affixBonus > 0.001 || affixBonus < -0.001) {
              const bonusDisplay = isPercentage 
                ? `${(affixBonus * 100).toFixed(1)}%`
                : `+${Math.floor(affixBonus)}`;
              
              subText = ` <span class="val-sub">(基础: ${baseDisplay} <span class="val-bonus" style="color:#00ffff">${bonusDisplay}</span>)</span>`;
            } else {
              // v2.1 FIX: 如果没有词缀加成，不显示冗余的“基础”数值
              subText = '';
            }
          }
          
          return `<div class="tt-stat">${statName}: <span class="val-main">${displayValue}</span>${subText}</div>`;
        })
        .join('');
      content += lines;
    }
    
    // ✅ v2.0: 显示套装信息（在底部）
    if (item.meta && item.meta.setId) {
      const setId = item.meta.setId;
      const setConfig = getSetConfig(setId);
      
      if (setConfig) {
        // 计算玩家当前装备的套装件数
        const game = window.game;
        let setCount = 0;
        const currentItemUid = item.uid;
        const currentItemId = item.id || item.itemId;
        
        // 统计装备栏中的套装件数
        if (game && game.player && game.player.equipment) {
          for (const [slot, equippedItem] of Object.entries(game.player.equipment)) {
            if (equippedItem && typeof equippedItem === 'object' && equippedItem.meta && equippedItem.meta.setId === setId) {
              // 检查是否是当前物品（避免重复计算）
              const isCurrentItem = (equippedItem.uid && currentItemUid && equippedItem.uid === currentItemUid) ||
                                    (equippedItem.id && currentItemId && equippedItem.id === currentItemId);
              if (!isCurrentItem) {
                setCount++;
              }
            }
          }
        }
        
        // 统计背包中的套装件数（不包括当前物品）
        if (game && game.player && game.player.inventory) {
          for (const invItem of game.player.inventory) {
            if (invItem && typeof invItem === 'object' && invItem.meta && invItem.meta.setId === setId) {
              // 检查是否是同一个物品（通过 uid 或 id 比较）
              const isSameItem = (invItem.uid && currentItemUid && invItem.uid === currentItemUid) ||
                                 (invItem.id && currentItemId && invItem.id === currentItemId);
              if (!isSameItem) {
                setCount++;
              }
            }
          }
        }
        
        // 如果当前物品本身有 setId，也要计入（只计算一次）
        if (item.meta.setId === setId) {
          setCount++;
        }
        
        const setName = setConfig.nameZh || setConfig.name || setId;
        content += `<div class="tt-set-info">`;
        content += `<div class="tt-set-header">【${setName}】(${setCount}/4)</div>`;
        
        // 显示套装效果列表
        const pieceCounts = Object.keys(setConfig.pieces).map(Number).sort((a, b) => a - b);
        for (const pieceCount of pieceCounts) {
          const effect = setConfig.pieces[pieceCount];
          const isActive = setCount >= pieceCount;
          const effectClass = isActive ? 'tt-set-effect-active' : 'tt-set-effect-inactive';
          const effectDesc = effect.descriptionZh || effect.description || '';
          
          content += `<div class="tt-set-effect ${effectClass}">`;
          content += `<span class="tt-set-piece-count">${pieceCount}件套:</span> `;
          content += `<span class="tt-set-effect-text">${effectDesc}</span>`;
          content += `</div>`;
        }
        
        content += `</div>`;
      }
    }

    return content;
  }

  /**
   * 生成技能的 tooltip 内容（HTML）
   * 优化为英雄联盟风格：标题高亮、消耗/冷却分行显示、描述清晰
   * @param {Object} skillInfo - 技能信息对象 { type: 'SKILL', category: 'ACTIVE'|'PASSIVE'|'ULT', data: {...} }
   * @returns {string} HTML 内容
   */
  generateSkillTooltip(skillInfo) {
    const { data, category } = skillInfo;
    if (!data) {
      console.warn('⚠️ [TooltipManager] generateSkillTooltip: data is null', skillInfo);
      return '';
    }
    
    console.log('🎨 [TooltipManager] Generating skill tooltip for', { category, data });
    
    const isPassive = category === 'PASSIVE';
    const isUlt = category === 'ULT';
    
    // ✅ 英雄联盟风格：标题高亮显示
    let content = `<div class="tt-skill-header">
      <span class="tt-skill-name">${data.name || '未知技能'}</span>
      ${data.key ? `<span class="tt-skill-key">[${data.key === 'SPACE' ? '空格' : data.key}]</span>` : ''}
    </div>`;

    // ✅ 英雄联盟风格：技能类型和冷却时间分行显示
    const typeName = isUlt ? '终极技能' : (isPassive ? '被动技能' : '主动技能');
    // 使用CSS控制颜色，这里不再硬编码颜色
    
    content += `<div class="tt-skill-type-row" style="font-weight: 600; margin-bottom: 8px; font-size: 0.9rem;">
      ${typeName}
    </div>`;

    // ✅ 英雄联盟风格：冷却时间单独一行，使用醒目的颜色
    if (!isPassive && data.cd) {
      const cdSeconds = (data.cd / 1000).toFixed(1);
      content += `<div class="tt-skill-cd-row" style="font-size: 0.85rem; margin-bottom: 10px;">
        <span style="color: #000000;">冷却时间：</span><span style="font-weight: 600; color: #333333;">${cdSeconds} 秒</span>
      </div>`;
    }

    // ✅ 英雄联盟风格：技能描述清晰，使用合适的行高和颜色
    if (data.desc) {
      content += `<div class="tt-skill-desc" style="font-size: 0.9rem; line-height: 1.6; margin-bottom: 8px;">
        ${data.desc}
      </div>`;
    } else {
      content += `<div class="tt-skill-desc" style="color: #8d6e63; font-size: 0.85rem; font-style: italic; margin-bottom: 8px;">
        暂无描述
      </div>`;
    }

    console.log('✅ [TooltipManager] Skill tooltip content generated');
    return content;
  }

  /**
   * 计算 tooltip 的安全位置（确保不会超出屏幕边界）
   * @param {number} mouseX - 鼠标 X 坐标
   * @param {number} mouseY - 鼠标 Y 坐标
   * @returns {object} {left, top}
   */
  calculateSafePosition(mouseX, mouseY) {
    const tooltipWidth = this.tooltip.offsetWidth || 200;
    const tooltipHeight = this.tooltip.offsetHeight || 100;
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    
    // 增加默认偏移量，避免离目标太近
    const safePadding = 20; // 新增间距
    
    let left = mouseX + this.config.offsetX + safePadding;
    let top = mouseY + this.config.offsetY + safePadding;
    
    // 如果 tooltip 会超出右边界，则显示在鼠标左侧
    if (left + tooltipWidth > windowWidth) {
      left = mouseX - tooltipWidth - this.config.offsetX - safePadding;
    }
    
    // 如果 tooltip 会超出下边界，则显示在鼠标上方
    if (top + tooltipHeight > windowHeight) {
      top = mouseY - tooltipHeight - this.config.offsetY - safePadding;
    }
    
    // 确保不会超出左边界和上边界
    left = Math.max(0, Math.min(left, windowWidth - tooltipWidth));
    top = Math.max(0, Math.min(top, windowHeight - tooltipHeight));
    
    return { left, top };
  }

  /**
   * 显示 tooltip
   * @param {string|Object} itemOrId - 物品ID字符串或物品对象
   * @param {number} mouseX - 鼠标 X 坐标
   * @param {number} mouseY - 鼠标 Y 坐标
   */
  show(itemOrId, mouseX, mouseY) {
    if (!this.tooltip) return;

    const content = this.generateTooltipContent(itemOrId);
    if (!content) {
      this.hide();
      return;
    }

    // 设置内容
    this.tooltip.innerHTML = content;
    
    // 显示 tooltip（移除 hidden 类，设置样式）
    this.tooltip.classList.remove('hidden');
    this.tooltip.style.display = 'block';
    this.tooltip.style.position = 'fixed';
    this.tooltip.style.zIndex = this.config.zIndex.toString();
    this.tooltip.classList.add('visible');
    
    // 延迟一帧以确保 tooltip 尺寸已计算，然后设置位置
    requestAnimationFrame(() => {
      const { left, top } = this.calculateSafePosition(mouseX, mouseY);
      this.tooltip.style.left = `${left}px`;
      this.tooltip.style.top = `${top}px`;
    });
  }

  /**
   * 更新 tooltip 位置（鼠标移动时调用）
   * @param {number} mouseX - 鼠标 X 坐标
   * @param {number} mouseY - 鼠标 Y 坐标
   */
  updatePosition(mouseX, mouseY) {
    if (!this.tooltip || this.tooltip.style.display !== 'block') return;
    
    const { left, top } = this.calculateSafePosition(mouseX, mouseY);
    this.tooltip.style.left = `${left}px`;
    this.tooltip.style.top = `${top}px`;
  }

  /**
   * 隐藏 tooltip
   */
  hide() {
    if (!this.tooltip) return;
    
    this.tooltip.style.display = 'none';
    this.tooltip.classList.add('hidden');
    this.tooltip.classList.remove('visible');
  }

  /**
   * 为元素绑定 tooltip 事件
   * @param {HTMLElement} element - 要绑定的元素
   * @param {string|Object|null} itemOrId - 物品ID字符串或物品对象（null 表示无物品）
   */
  bind(element, itemOrId) {
    if (!element) {
      console.warn('⚠️ TooltipManager.bind: element is null');
      return;
    }

    // 鼠标进入时显示 tooltip
    element.onmouseenter = (e) => {
      if (itemOrId) {
        this.show(itemOrId, e.clientX, e.clientY);
      }
    };

    // 鼠标移动时更新位置
    element.onmousemove = (e) => {
      this.updatePosition(e.clientX, e.clientY);
    };

    // 鼠标离开时隐藏 tooltip
    element.onmouseleave = () => {
      this.hide();
    };
  }

  /**
   * 解除元素的 tooltip 绑定
   * @param {HTMLElement} element - 要解除绑定的元素
   */
  unbind(element) {
    if (!element) return;
    
    element.onmouseenter = null;
    element.onmousemove = null;
    element.onmouseleave = null;
  }

  /**
   * 更新配置
   * @param {object} newConfig - 新的配置
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    if (this.tooltip) {
      this.tooltip.style.zIndex = this.config.zIndex.toString();
    }
  }

  /**
   * 销毁管理器
   */
  destroy() {
    this.hide();
    this.tooltip = null;
  }
}

// 创建全局单例实例
export const globalTooltipManager = new TooltipManager();

