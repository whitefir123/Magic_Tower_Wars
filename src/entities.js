// entities.js
import { TILE_SIZE, MONSTER_STATS, EQUIPMENT_DB, COMBAT_CONFIG, STATUS_TYPES, STATUS_ICON_MAP, ELITE_AFFIXES, ELITE_SPAWN_CONFIG, ASSETS, getAscensionLevel, FATIGUE_CONFIG, getItemDefinition, CHARACTERS } from './constants.js';
import { createStandardizedItem } from './data/items.js';
import { getSetConfig } from './data/sets.js';
import { Sprite, FloatingText } from './utils.js';

export class Entity {
  constructor(x, y) {
    this.x = x; this.y = y;
    this.visualX = x * TILE_SIZE; this.visualY = y * TILE_SIZE;
    this.destX = this.visualX; this.destY = this.visualY;
    this.isMoving = false; this.moveSpeed = 0.2; this.sprite = null;
    this.statuses = []; // Array of active status effects
    this.activeDoTs = []; // Array of active DoT effects (damage over time)
    this.dodgeOffset = { x: 0, y: 0 }; // 闪避动画偏移
  }
  
  // Apply a status effect to this entity
  applyStatus(type, source, config = {}) {
    const statusDef = STATUS_TYPES[type];
    if (!statusDef) return;
    
    // Check if status already exists
    const existing = this.statuses.find(s => s.type === type);
    if (existing) {
      // Refresh duration for existing status
      existing.duration = config.duration || statusDef.duration;
      existing.timer = 0;
      existing.tickTimer = 0;
      
      // Handle stackable statuses (e.g., POISON)
      let stacksIncreased = false;
      if (statusDef.stackable) {
        const currentStacks = existing.config?.stacks || 1;
        const maxStacks = 10; // 最大叠加层数
        existing.config = existing.config || {};
        const newStacks = Math.min(currentStacks + 1, maxStacks);
        stacksIncreased = newStacks > currentStacks;
        existing.config.stacks = newStacks;
      }
      
      // 情况A (叠加): 如果是可叠加状态且已存在，层数增加后显示飘字
      if (statusDef.stackable && stacksIncreased && window.game && window.game.player === this) {
        const game = window.game;
        if (game.floatingTextPool && game.settings && game.settings.showDamageNumbers !== false) {
          const stacks = existing.config?.stacks || 1;
          const statusText = `${statusDef.name} x${stacks}!`;
          const statusColor = this.getStatusColor(type);
          const floatingText = game.floatingTextPool.create(this.visualX, this.visualY - 30, statusText, statusColor);
          if (game.floatingTexts) {
            game.floatingTexts.push(floatingText);
          }
        }
      }
      // 情况B (刷新): 如果状态已存在且不可叠加（仅刷新时间），不显示飘字
      // 这里不需要额外处理，直接返回即可
      
      return;
    }
    
    // Create new status object
    const status = {
      type,
      duration: config.duration || statusDef.duration,
      timer: 0,
      tickTimer: 0,
      source,
      config: { ...config }
    };
    
    // Initialize stacks for stackable statuses
    if (statusDef.stackable && !status.config.stacks) {
      status.config.stacks = 1;
    }
    
    this.statuses.push(status);
    
    // 情况C (新增): 如果是新添加的状态，且目标是玩家，显示飘字
    if (window.game && window.game.player === this) {
      const game = window.game;
      if (game.floatingTextPool && game.settings && game.settings.showDamageNumbers !== false) {
        const statusText = `${statusDef.name}!`;
        const statusColor = this.getStatusColor(type);
        const floatingText = game.floatingTextPool.create(this.visualX, this.visualY - 30, statusText, statusColor);
        if (game.floatingTexts) {
          game.floatingTexts.push(floatingText);
        }
      }
    }
  }
  
  // Check if entity has a specific status
  hasStatus(type) {
    return this.statuses.some(s => s.type === type);
  }
  
  // Remove a specific status
  removeStatus(type) {
    this.statuses = this.statuses.filter(s => s.type !== type);
  }
  
  // Update all active statuses
  updateStatuses(dt) {
    // 检查游戏是否暂停
    const game = window.game;
    if (game && game.isPaused) {
      return; // 游戏暂停时，不更新状态效果
    }
    
    for (let i = this.statuses.length - 1; i >= 0; i--) {
      const status = this.statuses[i];
      status.timer += dt;
      
      // Handle tick-based effects (e.g., Burn damage)
      const statusDef = STATUS_TYPES[status.type];
      if (statusDef && statusDef.tickInterval > 0) {
        status.tickTimer += dt;
        
        if (status.tickTimer >= statusDef.tickInterval) {
          status.tickTimer -= statusDef.tickInterval;
          
          // Execute tick effect
          this.onStatusTick(status.type, status);
        }
      }
      
      // Check if status expired
      if (status.timer >= status.duration) {
        this.statuses.splice(i, 1);
      }
    }
    
    // ✅ FIX: 处理DoT效果（数据驱动，不依赖闭包函数）
    // 导入CombatSystem以处理DoT逻辑
    for (let i = this.activeDoTs.length - 1; i >= 0; i--) {
      const dot = this.activeDoTs[i];
      dot.elapsedTime += dt;
      
      // 检查是否到了下一个tick时间
      if (dot.elapsedTime >= dot.nextTickTime) {
        dot.nextTickTime += dot.tickInterval;
        
        // ✅ FIX: 使用数据驱动的方式处理DoT，而不是调用闭包函数
        // 通过CombatSystem.handleDoTTick统一处理所有DoT类型
        const game = window.game;
        if (game && game.combatSystem) {
          game.combatSystem.handleDoTTick(this, dot);
        } else {
          // 降级方案：动态导入
          import('./systems/CombatSystem.js').then(({ CombatSystem }) => {
            CombatSystem.handleDoTTick(this, dot);
          }).catch(err => {
            console.warn('Entity.updateStatuses: 无法导入CombatSystem处理DoT', err);
          });
        }
      }
      
      // 检查DoT是否过期
      if (dot.elapsedTime >= dot.duration) {
        this.activeDoTs.splice(i, 1);
      }
    }
  }
  
  // Override in subclasses to handle status tick effects
  onStatusTick(type, status) {
    // Default implementation - can be overridden
  }
  
  updateVisuals(dt) {
    if (!this.isMoving) { if (this.sprite) this.sprite.update(dt, false); return; }
    const dx = this.destX - this.visualX, dy = this.destY - this.visualY;
    const dist = Math.hypot(dx, dy);
    
    // 检查 SLOW 状态，应用速度衰减
    let effectiveMoveSpeed = this.moveSpeed;
    if (this.hasStatus('SLOW')) {
      const slowDef = STATUS_TYPES.SLOW;
      effectiveMoveSpeed *= (slowDef.speedMultiplier || 0.7);
    }
    
    const step = effectiveMoveSpeed * dt;
    if (dist <= step) { this.visualX = this.destX; this.visualY = this.destY; this.isMoving = false; }
    else { this.visualX += (dx/dist)*step; this.visualY += (dy/dist)*step; }
    if (this.sprite) this.sprite.update(dt, true);
    
    // 闪避动画衰减
    if (Math.abs(this.dodgeOffset.x) > 0.1) {
      this.dodgeOffset.x *= 0.8;
    } else {
      this.dodgeOffset.x = 0;
    }
  }
  
  // 触发闪避动画
  triggerDodgeAnimation() {
    this.dodgeOffset.x = 10;
  }
  
  /**
   * 渲染状态图标（在实体上方显示）
   * @param {CanvasRenderingContext2D} ctx - Canvas 上下文
   * @param {number} camX - 相机X偏移 (在此上下文中不需要使用，因为ctx已变换)
   * @param {number} camY - 相机Y偏移 (在此上下文中不需要使用，因为ctx已变换)
   */
  drawStatusIcons(ctx, camX, camY) {
    if (!this.statuses || this.statuses.length === 0) return;
    
    // 状态映射：将状态类型映射到图标索引（0-8，对应3x3网格）
    // 索引计算：index = row * 3 + col
    // 图标视觉描述参考 assets.js 中 SPRITE_STATUS_ICONS 的注释
    const STATUS_MAP = {
      'PYRO': 0,        // 火 (0,0) - 第0行第0列 - 火焰图标
      'BURN': 0,        // 灼烧 - 复用火图标
      'HYDRO': 1,       // 水 (0,1) - 第0行第1列 - 水滴图标
      'WET': 1,         // 潮湿 - 复用水图标
      'CRYO': 2,        // 冰 (0,2) - 第0行第2列 - 雪花或冰晶图标
      'FROZEN': 2,      // 冰冻 - 复用冰图标
      'FREEZE_DOT': 2,  // 冰封伤害 - 复用冰图标
      'ELECTRO': 3,     // 雷 (1,0) - 第1行第0列 - 闪电图标
      'SHOCK': 3,       // 感电 - 复用雷图标
      'ELECTRO_CHARGED': 3, // 感电 - 复用雷图标
      'POISON': 4,      // 毒 (1,1) - 第1行第1列 - 毒气泡图标
      'STUN': 5,        // 晕眩 (1,2) - 第1行第2列 - 旋转的星星图标
      'CRIT': 6,        // 暴击 (2,0) - 第2行第0列 - 暴击图标（参考英雄联盟的暴击图标）
      'SLOW': 7,        // 减速 (2,1) - 第2行第1列 - 红色的朝下的箭头图标
      'DEFUP': 8        // 防御/护盾 (2,2) - 第2行第2列 - 盾牌图标
    };
    
    // 获取资源管理器（优先使用 this.game.loader，其次 this.loader，最后 window.game.loader）
    const game = window.game;
    const loader = (this.game && this.game.loader) || this.loader || (game && game.loader) || window.ResourceManager;
    
    // 获取状态图标精灵图
    const spriteSheet = loader && loader.getImage ? loader.getImage('SPRITE_STATUS_ICONS') : null;
    
    // 检查精灵图是否已加载
    if (!spriteSheet || !spriteSheet.complete || spriteSheet.naturalWidth === 0) {
      // Fallback: 如果精灵图未加载，使用彩色圆圈
      this.drawStatusIconsFallback(ctx);
      return;
    }
    
    // 动态计算单元格大小（基于图片实际尺寸）
    const gridCols = 3; // 3x3网格
    const gridRows = 3;
    const cellW = spriteSheet.naturalWidth / gridCols;
    const cellH = spriteSheet.naturalHeight / gridRows;
    
    // 绘制参数
    const iconSize = 16; // 绘制尺寸（16x16像素）
    const iconSpacing = 2; // 图标间距
    
    // 动态计算 Y 偏移，确保显示在 Sprite 头顶上方
    let yOffset = -20;
    if (this.sprite && this.sprite.destHeight) {
      // 假设 Sprite 是底部对齐的，计算其顶部位置
      // Sprite 顶部偏移 = destHeight - TILE_SIZE
      const spriteTop = this.sprite.destHeight - TILE_SIZE;
      yOffset = -spriteTop - 15; // 在头顶上方 15px
    }
    
    // 计算图标起始位置（居中显示）
    const totalWidth = this.statuses.length * (iconSize + iconSpacing) - iconSpacing;
    const drawX = this.visualX;
    const drawY = this.visualY;
    const startX = drawX + (TILE_SIZE / 2) - (totalWidth / 2);
    
    // 渲染每个状态图标
    for (let i = 0; i < this.statuses.length; i++) {
      const status = this.statuses[i];
      const statusDef = STATUS_TYPES[status.type];
      if (!statusDef) continue;
      
      // 获取图标索引
      const iconIndex = STATUS_MAP[status.type];
      if (iconIndex === undefined) {
        // 如果状态类型不在映射中，跳过或使用默认图标
        continue;
      }
      
      // 计算精灵图中的源坐标（从索引转换为行列）
      const row = Math.floor(iconIndex / gridCols);
      const col = iconIndex % gridCols;
      const sx = col * cellW;
      const sy = row * cellH;
      
      // 计算绘制位置
      const iconX = startX + i * (iconSize + iconSpacing);
      const iconY = drawY + yOffset;
      
      // 绘制图标（使用 drawImage 的切片参数）
      ctx.save();
      ctx.drawImage(
        spriteSheet,
        sx, sy, cellW, cellH,  // 源区域（从精灵图中切片）
        iconX, iconY, iconSize, iconSize  // 目标区域（绘制到画布）
      );
      ctx.restore();
      
      // 绘制堆叠数字（如果是可堆叠状态）
      if (statusDef.stackable && status.config && status.config.stacks > 1) {
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        // 数字显示在图标右下角
        ctx.fillText(status.config.stacks, iconX + iconSize - 2, iconY + iconSize - 2);
        ctx.restore();
      }
    }
  }
  
  /**
   * 后备方案：使用彩色圆圈绘制状态图标（当精灵图未加载时）
   * @param {CanvasRenderingContext2D} ctx - Canvas 上下文
   */
  drawStatusIconsFallback(ctx) {
    if (!this.statuses || this.statuses.length === 0) return;
    
    const iconSize = 16;
    const iconSpacing = 2;
    const yOffset = -10;
    
    const totalWidth = this.statuses.length * (iconSize + iconSpacing) - iconSpacing;
    const drawX = this.visualX;
    const drawY = this.visualY;
    const startX = drawX + (TILE_SIZE / 2) - (totalWidth / 2);
    
    for (let i = 0; i < this.statuses.length; i++) {
      const status = this.statuses[i];
      const statusDef = STATUS_TYPES[status.type];
      if (!statusDef) continue;
      
      const iconX = startX + i * (iconSize + iconSpacing);
      const iconY = drawY + yOffset;
      
      // 使用彩色圆圈
      const color = this.getStatusColor(status.type);
      this.drawStatusCircle(ctx, iconX, iconY, iconSize, color);
      
      // 绘制堆叠数字
      if (statusDef.stackable && status.config && status.config.stacks > 1) {
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(status.config.stacks, iconX + iconSize - 2, iconY + iconSize - 2);
        ctx.restore();
      }
    }
  }
  
  /**
   * 绘制状态圆圈图标
   * @param {CanvasRenderingContext2D} ctx - Canvas 上下文
   * @param {number} x - X坐标
   * @param {number} y - Y坐标
   * @param {number} size - 图标大小
   * @param {string} color - 颜色
   */
  drawStatusCircle(ctx, x, y, size, color) {
    ctx.save();
    
    // 绘制圆形背景
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.beginPath();
    ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
    ctx.fill();
    
    // 绘制彩色圆圈
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x + size / 2, y + size / 2, size / 2 - 1, 0, Math.PI * 2);
    ctx.fill();
    
    // 绘制边框
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(x + size / 2, y + size / 2, size / 2 - 1, 0, Math.PI * 2);
    ctx.stroke();
    
    ctx.restore();
  }
  
  /**
   * 获取状态颜色
   * @param {string} statusType - 状态类型
   * @returns {string} 颜色值
   */
  getStatusColor(statusType) {
    const colorMap = {
      'BURN': '#ff6b00',      // 灼烧 - 橙红色
      'WET': '#4da6ff',       // 潮湿 - 蓝色
      'FROZEN': '#00bfff',    // 冰冻 - 青色
      'FREEZE_DOT': '#00bfff', // 冰封伤害 - 青色
      'SHOCK': '#ffff00',     // 感电 - 黄色
      'POISON': '#00ff00',    // 中毒 - 绿色
      'SLOW': '#cccccc'       // 减速 - 灰色
    };
    return colorMap[statusType] || '#ffffff';
  }
}

export class Monster extends Entity {
  constructor(type, x, y, loader, diff, TILE, floor = 1, ascensionLevel = 1) {
    super(x, y);
    this.loader = loader; // 保存 Loader 引用，用于状态图标加载
    this.type = type; this.homeX = x; this.homeY = y;
    this.ascensionLevel = ascensionLevel; // 存储噩梦层级
    
    // ✅ FIX: 生成永久唯一的 uid（优先使用 crypto.randomUUID，降级到时间戳+随机数）
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      this.uid = crypto.randomUUID();
    } else {
      this.uid = `monster_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    this.stats = JSON.parse(JSON.stringify(MONSTER_STATS[type]));
    
    // 获取噩梦层级配置
    const ascConfig = getAscensionLevel(ascensionLevel);
    
    // ⚠️ 注意：diff 参数已被废弃，仅保留用于向后兼容，不会被使用
    // 所有属性计算都基于 ascensionLevel，确保只有单一难度来源，避免双重叠加
    
    // 计算基础属性（使用新的噩梦层级系统，仅基于 ascensionLevel）
    const baseHp = this.stats.hp;
    const basePAtk = this.stats.p_atk || 0;
    const baseMAtk = this.stats.m_atk || 0;
    const basePDef = this.stats.p_def || 0;
    const baseMDef = this.stats.m_def || 0;
    const baseGold = this.stats.gold || 0;
    const baseXp = this.stats.xp || 0;
    
    // ✅ 重构：噩梦曲线 - 分项计算楼层成长
    const settings = window.game?.settings || {};
    const difficultyScaling = settings.difficultyScaling !== false; // 默认为 true
    
    let hpGrowth, atkGrowth, defBonus;
    
    if (difficultyScaling) {
      // 噩梦曲线公式（开启时）
      // 1. 生命值 (HP) - 指数级增长：每层复利增长 8%
      hpGrowth = Math.pow(1.08, floor - 1);
      
      // 2. 攻击力 (ATK) - 混合增长：线性(6%) + 微量指数(2%)
      atkGrowth = (1 + (floor - 1) * 0.06) * Math.pow(1.02, floor - 1);
      
      // 3. 防御力 (DEF) - 阶梯成长：每层增加 1.5 固定防御值
      defBonus = Math.floor((floor - 1) * 1.5);
    } else {
      // 弱化版线性成长（简单模式）
      // 每层 +4% HP/ATK，不加防御
      hpGrowth = 1 + (floor - 1) * 0.04;
      atkGrowth = 1 + (floor - 1) * 0.04;
      defBonus = 0;
    }
    
    // 计算最终属性：同时应用 ascConfig (噩梦层级系数) 和 floor (楼层成长系数)
    this.stats.hp = Math.floor(baseHp * ascConfig.hpMult * hpGrowth);
    this.stats.p_atk = Math.floor(basePAtk * ascConfig.atkMult * atkGrowth);
    this.stats.m_atk = Math.floor(baseMAtk * ascConfig.atkMult * atkGrowth);
    
    // 防御力：直接加上固定防御值（通常不受 ascension 倍率影响）
    this.stats.p_def = Math.floor(basePDef + defBonus);
    this.stats.m_def = Math.floor(baseMDef + defBonus);
    
    // 奖励倍率（金币和经验）
    this.stats.goldYield = Math.floor(baseGold * ascConfig.goldMult);
    this.stats.xpYield = Math.floor(baseXp * ascConfig.xpMult);
    
    // 应用移动速度修饰符
    const baseSpeed = this.stats.speed || 0.12;
    this.moveSpeed = baseSpeed * (1 + ascConfig.moveSpeedMult);
    
    // Elite Monster System - Check if this should be an elite (使用新的eliteChance)
    this.isElite = false;
    this.affixes = [];
    this.eliteVisualEffects = {
      flashTimer: 0,
      pulseTimer: 0,
      regenShowTimer: 0,
      teleportHitCount: 0,
      lastDamagedTime: 0,
      lastRegenTime: 0,
      volatileExploding: false,
      volatileExplosionTimer: 0,
      vampiricTintTimer: 0, // For subtle red tint on vampiric attack
      regenPulsePhase: 0 // For subtle opacity pulse on regeneration
    };
    
    // 使用噩梦层级配置的eliteChance
    if (floor >= ELITE_SPAWN_CONFIG.minFloor) {
      let eliteChance = ascConfig.eliteChance || ELITE_SPAWN_CONFIG.baseChance;
      
      // ✅ CRITICAL FIX: 应用每日挑战词缀：精英小队（精英怪生成概率翻倍）
      const game = window.game;
      if (game && game.dailyEliteSpawnMultiplier && game.dailyEliteSpawnMultiplier !== 1.0) {
        eliteChance = Math.min(1.0, eliteChance * game.dailyEliteSpawnMultiplier);
        console.log(`[Monster] 每日词缀生效：精英怪生成概率 ${eliteChance * 100}% (倍数: ${game.dailyEliteSpawnMultiplier})`);
      }
      
      if (Math.random() < eliteChance) {
        this.isElite = true;
        
        // 根据层级决定词缀数量
        let numAffixes = 1;
        if (ascensionLevel >= 22) {
          // Lv22+: 30%概率3个词缀，否则2个
          numAffixes = Math.random() < 0.3 ? 3 : 2;
        } else if (ascensionLevel >= 10) {
          // Lv10+: 固定2个词缀
          numAffixes = ascConfig.eliteAffixCount || 2;
        }
        
        // Select random affixes
        const availableAffixes = Object.keys(ELITE_AFFIXES);
        for (let i = 0; i < numAffixes && availableAffixes.length > 0; i++) {
          const randomIndex = Math.floor(Math.random() * availableAffixes.length);
          const affixKey = availableAffixes[randomIndex];
          this.affixes.push(affixKey);
          availableAffixes.splice(randomIndex, 1); // Remove to prevent duplicates
        }
        
        // Elite monsters have 2x HP and 1.5x damage (在基础成长之后)
        this.stats.hp = Math.floor(this.stats.hp * 2.0);
        this.stats.p_atk = Math.floor(this.stats.p_atk * 1.5);
        this.stats.m_atk = Math.floor(this.stats.m_atk * 1.5);
      }
    }
    
    // ✅ 层域守卫：普通模式下第1-8层的Boss特殊处理
    const game = window.game;
    const isInfiniteMode = game?.config?.infiniteMode || false;
    
    if (type === 'BOSS' && !isInfiniteMode && floor < 9) {
      // 获取 BOSS 的原始基础属性（从 MONSTER_STATS）
      const bossBaseStats = MONSTER_STATS.BOSS;
      const bossBaseHp = bossBaseStats.hp || 3000;
      const bossBasePAtk = bossBaseStats.p_atk || 22;
      const bossBaseMAtk = bossBaseStats.m_atk || 22;
      const bossBasePDef = bossBaseStats.p_def || 10;
      const bossBaseMDef = bossBaseStats.m_def || 10;
      
      // 名称修改：层域守卫
      this.name = 'Floor Guardian';
      // 注意：displayName 通过 getDisplayName() 方法获取，需要修改 MONSTER_STATS 或添加特殊标记
      // 这里我们添加一个标记，在 getDisplayName() 中处理
      this.isFloorGuardian = true;
      
      // HP 削弱：baseHp * (0.05 + floor * 0.1)
      const hpMultiplier = 0.05 + floor * 0.1;
      this.stats.hp = Math.floor(bossBaseHp * hpMultiplier);
      
      // ATK 削弱：baseAtk * (0.5 + floor * 0.06)
      const atkMultiplier = 0.5 + floor * 0.06;
      this.stats.p_atk = Math.floor(bossBasePAtk * atkMultiplier);
      this.stats.m_atk = Math.floor(bossBaseMAtk * atkMultiplier);
      
      // DEF 调整：baseDef * (0.5 + floor * 0.06)
      const defMultiplier = 0.5 + floor * 0.06;
      this.stats.p_def = Math.floor(bossBasePDef * defMultiplier);
      this.stats.m_def = Math.floor(bossBaseMDef * defMultiplier);
      
      // 更新 maxHp
      this.stats.maxHp = this.stats.hp;
    } else {
      // Boss特殊处理：应用bossHpMult（第9层及以上的Boss或无限模式）
      if (type === 'BOSS' && ascConfig.bossHpMult > 0) {
        this.stats.hp = Math.floor(this.stats.hp * (1 + ascConfig.bossHpMult));
      }
    }
    
    this.stats.maxHp = this.stats.hp; // Store max HP for status effects
    
    // 应用攻击冷却时间修饰符
    const destHeight = this.stats.size || 56;
    
    // 设置怪物的同心圆刷新范围
    // 以玩家出生地（1,1）为中心，每个怪物都有一个最小刷新距离
    // 距离 = 曼哈顿距离 (|x - playerX| + |y - playerY|)
    this.minSpawnDistance = MONSTER_STATS[type]?.minSpawnDistance ?? 0;
    
    // 设置怪物基础攻击速度（APS）
    // 从 MONSTER_STATS 获取 base_as，如果没有则使用默认值 1.0
    const baseAS = MONSTER_STATS[type]?.base_as || 1.0;
    this.base_as = baseAS;
    
    // 计算基础攻击冷却时间（毫秒）
    // 公式：Attack_Interval_MS = 1000 / Base_APS
    const baseAttackCooldown = 1000 / baseAS;
    // 应用攻击冷却时间修饰符（负数表示冷却时间减少，攻击更快）
    this.baseAttackCooldown = Math.max(100, baseAttackCooldown * (1 + ascConfig.atkCooldownMult));
    this.lastAttackTime = 0;
    
    // 存储噩梦层级配置（用于后续行为逻辑）
    this.ascConfig = ascConfig;
    
    this._TILE = TILE;
    // 蝙蝠和冰露冰使用特殊的动画类型
    let animationType = 'monster';
    if (type === 'BAT') {
      animationType = 'bat';
    } else if (type === 'SKELETON') {
      animationType = 'icemonster';
    } else if (type === 'GHOST') {
      // ✅ 新增：普通幽灵(静态图)使用 ghost 逻辑
      animationType = 'ghost';
    }
    this.sprite = new Sprite({ assetKey: 'MONSTER_' + type, loader, destHeight, animationType });
    this.moveTimer = 0; this.moveInterval = this.generateWanderInterval(); this.leashRange = 3;
    
    // 战斗状态属性
    this.inCombat = false;
    this.lastDamageTime = 0;
    this.combatTimeout = 8000; // 8秒内没有受伤就退出战斗状态（更宽容，避免因减速/miss导致脱战）
    
    // 新增：战斗疲劳/激怒机制
    this.battleTimer = 0;      // 当前战斗持续时间 (ms)
    this.enrageStacks = 0;     // 当前激怒层数
    
    // 怪物特性系统 - 初始化特性状态
    const traits = this.stats.traits || [];
    this.traits = traits;
    
    // BONE_SHIELD: 骨盾状态
    if (traits.includes('BONE_SHIELD')) {
      this.boneShieldActive = true;
    }
    
    // MOLTEN_CORE: 熔岩核心护盾计时器
    if (traits.includes('MOLTEN_CORE')) {
      this.shieldTimer = 0;
      this.shieldCooldown = 3000; // 3秒
    }
  }
  
  // Handle status tick effects for monsters
  // ✅ FIX: 统一DoT逻辑 - 移除直接扣血，改为调用CombatSystem.handleDoTTick
  onStatusTick(type, status) {
    // ✅ FIX: 自爆怪物在倒计时期间免疫所有伤害（包括DoT）
    if (this.isInvulnerable || (this.hasAffix && this.hasAffix('VOLATILE') && this.eliteVisualEffects && this.eliteVisualEffects.volatileExploding)) {
      return; // 免疫所有状态伤害
    }
    
    const statusDef = STATUS_TYPES[type];
    if (!statusDef) return;
    
    // ✅ FIX: 将状态DoT转换为activeDoTs格式，统一由CombatSystem.handleDoTTick处理
    // 这样可以确保所有DoT伤害都能正确触发onDamageTaken
    const game = window.game;
    if (!game || !game.combatSystem) return;
    
    // 将status转换为DoT格式
    let dotType = null;
    let damage = 0;
    let color = '#ffffff';
    
    if (type === 'BURN') {
      dotType = 'BURN';
      const damagePercent = statusDef.damagePercent || 0.02;
      damage = Math.max(1, Math.floor(this.stats.maxHp * damagePercent));
      color = '#ff6b6b';
    } else if (type === 'FREEZE_DOT') {
      dotType = 'FREEZE_DOT';
      const damagePercent = statusDef.damagePercent || 0.03;
      damage = Math.max(1, Math.floor(this.stats.maxHp * damagePercent));
      color = '#00bfff';
    } else if (type === 'POISON') {
      dotType = 'POISON';
      const stacks = status.config?.stacks || 1;
      const damagePercent = statusDef.damagePercent || 0.01;
      damage = Math.max(1, Math.floor(this.stats.maxHp * damagePercent * stacks));
      color = '#00ff00';
    }
    
    if (dotType && damage > 0) {
      // 创建临时DoT对象，调用CombatSystem.handleDoTTick统一处理
      const tempDot = {
        type: dotType,
        damage: damage,
        sourceId: status.source === game.player ? 'player' : null,
        color: color
      };
      game.combatSystem.handleDoTTick(this, tempDot);
    }
  }
  
  // 检查怪物是否有特定特性（例如STEALTH）
  hasTrait(trait) {
    return this.stats.traits && this.stats.traits.includes(trait);
  }
  
  // 检查怪物是否有特定标签（例如UNDEAD、BOSS等）
  hasTag(tagId) {
    // 如果 tags 不存在或为空，返回 false
    if (!this.stats.tags || !Array.isArray(this.stats.tags) || this.stats.tags.length === 0) {
      return false;
    }
    
    // 统一转为大写进行比较，增强健壮性
    const upperTagId = String(tagId).toUpperCase();
    
    // 检查 tags 数组中是否包含该标签（也转为大写比较）
    return this.stats.tags.some(tag => String(tag).toUpperCase() === upperTagId);
  }
  
  // 重写 applyStatus 方法以处理特性免疫
  applyStatus(type, source, config = {}) {
    // MOLTEN_CORE: 免疫灼烧和冰冻
    if (this.traits && this.traits.includes('MOLTEN_CORE')) {
      if (type === 'BURN' || type === 'FROZEN' || type === 'FREEZE_DOT') {
        // 免疫这些状态，直接返回
        return;
      }
    }
    
    // 调用父类方法
    super.applyStatus(type, source, config);
  }
  
  // 获取怪物的最小刷新距离（同心圆机制）
  // 返回值是曼哈顿距离，怪物只能在大于等于此距离的位置刷新
  
  // 检查位置是否符合该怪物的刷新条件（同心圆机制）
  // playerX, playerY 是玩家出生地坐标
  isValidSpawnLocation(x, y, playerX = 1, playerY = 1) {
    // 计算曼哈顿距离
    const distance = Math.abs(x - playerX) + Math.abs(y - playerY);
    
    // 检查是否满足最小刷新距离要求（同心圆）
    // 如果实际距离 >= 最小刷新距离，则允许刷新
    return distance >= this.minSpawnDistance;
  }
  
  // 生成随机漫游间隔（1-3秒）
  generateWanderInterval() {
    return 1000 + Math.random() * 2000; // 1000-3000ms
  }
  
  // 退出战斗状态
  exitCombat() {
    this.inCombat = false;
    this.lastDamageTime = 0;
    this.lastAttackTime = 0; // 重置攻击计时器，下次进战斗可以立即攻击
    
    // 重置战斗疲劳
    this.battleTimer = 0;
    this.enrageStacks = 0;
    
    // 重置特性状态
    if (this.traits && this.traits.includes('BONE_SHIELD')) {
      this.boneShieldActive = true; // 骷髅脱战后骨盾恢复
    }
  }
  
  // 获取当前激怒攻击力加成 (1.0 = 无加成)
  getPowerMultiplier() {
    return 1.0 + (this.enrageStacks * FATIGUE_CONFIG.ATK_BONUS_PER_STACK);
  }

  // 获取当前激怒穿透加成 (0.0 = 无加成)
  getPenetrationBonus() {
    return this.enrageStacks * FATIGUE_CONFIG.PEN_BONUS_PER_STACK;
  }
  
  // Elite Affix - Apply effects when taking damage
  onDamageTaken(damage, source) {
    const now = Date.now();
    this.eliteVisualEffects.lastDamagedTime = now;
    
    // TELEPORTER - Count hits and teleport after threshold
    if (this.hasAffix('TELEPORTER')) {
      this.eliteVisualEffects.teleportHitCount++;
      const config = ELITE_AFFIXES.TELEPORTER;
      
      if (this.eliteVisualEffects.teleportHitCount >= config.hitThreshold) {
        this.eliteVisualEffects.teleportHitCount = 0;
        this.triggerTeleport();
      }
    }
  }
  
  // Check if monster has a specific affix
  hasAffix(affixId) {
    return this.affixes.includes(affixId);
  }
  
  // Get elite display name with affix
  getDisplayName() {
    // ✅ 层域守卫特殊处理
    if (this.isFloorGuardian) {
      return '层域守卫';
    }
    
    const baseName = MONSTER_STATS[this.type]?.cnName || this.type;
    
    if (!this.isElite || this.affixes.length === 0) {
      return baseName;
    }
    
    // Get the first affix name
    const affixKey = this.affixes[0];
    const affixDef = ELITE_AFFIXES[affixKey];
    const affixName = affixDef ? affixDef.name : '';
    
    return `${affixName}${baseName}`;
  }
  
  // Trigger teleport effect
  triggerTeleport() {
    const game = window.game;
    if (!game || !game.map) return;
    
    const config = ELITE_AFFIXES.TELEPORTER;
    const range = config.teleportRange;
    
    // Find valid teleport location within range
    const attempts = 20;
    for (let i = 0; i < attempts; i++) {
      const offsetX = Math.floor(Math.random() * range * 2 + 1) - range;
      const offsetY = Math.floor(Math.random() * range * 2 + 1) - range;
      const newX = this.x + offsetX;
      const newY = this.y + offsetY;
      
      // Check if valid position
      if (newX < 0 || newX >= game.map.width || newY < 0 || newY >= game.map.height) continue;
      const tile = game.map.grid[newY][newX];
      if (tile === this._TILE.WALL || tile === this._TILE.DOOR) continue;
      if (game.map.getMonsterAt(newX, newY)) continue;
      // ✅ FIX: 检查玩家位置，避免瞬移到玩家脚下
      if (game.player && newX === game.player.x && newY === game.player.y) continue;
      // ✅ FIX: 增强碰撞检测 - 检查地图对象（宝箱、祭坛、陷阱等）
      const objAtPos = game.map.getObjectAt(newX, newY);
      if (objAtPos) {
        // 检查对象类型，如果是阻塞性对象则跳过
        // 注意：对象类型可能是字符串常量（如'OBJ_CRATE'）或对象ID（如OBJ_CRATE.id）
        const blockingTypes = ['OBJ_CRATE', 'OBJ_BARREL', 'OBJ_SHRINE_HEAL', 'OBJ_SHRINE_POWER', 'OBJ_ALTAR_CURSED', 'OBJ_ALTAR_PLACEHOLDER', 'INTERACTIVE_FORGE'];
        // OBJ_TRAP 不阻塞（怪物可以瞬移到陷阱上）
        if (blockingTypes.includes(objAtPos.type)) {
          continue; // 跳过阻塞性对象
        }
      }
      
      // Valid position found - teleport
      this.x = newX;
      this.y = newY;
      this.visualX = newX * TILE_SIZE;
      this.visualY = newY * TILE_SIZE;
      this.destX = this.visualX;
      this.destY = this.visualY;
      
      // No floating text or log message - player should notice by observation
      
      break;
    }
  }
  
  // Update method for elite affix effects
  update(dt, map, player) {
    // Update timers
    if (this.moveTimer > 0) this.moveTimer -= dt;
    
    // Update status effects
    this.updateStatuses(dt);
    
    // attackCooldown 现在通过 getCurrentAttackCooldown() 方法动态获取，不再在 update() 中修改静态属性
    
    // Check if should exit combat
    if (this.inCombat) {
      const now = Date.now();
      if (now - this.lastDamageTime > this.combatTimeout) {
        this.exitCombat();
      } else {
        // 更新战斗疲劳计时器
        this.battleTimer += dt;
        
        // 计算应有的激怒层数
        const expectedStacks = Math.floor(this.battleTimer / FATIGUE_CONFIG.INTERVAL);
        
        // 如果层数增加且未达上限，更新层数
        if (expectedStacks > this.enrageStacks && this.enrageStacks < FATIGUE_CONFIG.MAX_STACKS) {
          this.enrageStacks = Math.min(expectedStacks, FATIGUE_CONFIG.MAX_STACKS);
          
          // 可选：在这里添加视觉提示，例如显示"激怒!"浮动文字或播放音效
          // console.log(`${this.type} 获得了激怒效果！当前层数: ${this.enrageStacks}`);
        }
      }
    }
    
    // 怪物特性更新 - MOLTEN_CORE: 每3秒获得一次护盾
    if (this.traits && this.traits.includes('MOLTEN_CORE')) {
      this.shieldTimer += dt;
      if (this.shieldTimer >= this.shieldCooldown) {
        this.shieldTimer = 0;
        // ✅ FIX: 回复5%最大生命值（模拟护盾再生效果）
        const healAmount = Math.floor(this.stats.maxHp * 0.05);
        this.stats.hp = Math.min(this.stats.maxHp, this.stats.hp + healAmount);
        
        // 显示视觉提示
        const game = window.game;
        if (game && game.floatingTextPool && game.floatingTexts) {
          const shieldText = game.floatingTextPool.create(this.visualX, this.visualY - 30, '护盾!', '#cccccc');
          game.floatingTexts.push(shieldText);
        }
      }
    }
    
    // Elite Affix Updates
    if (this.isElite) {
      this.eliteVisualEffects.flashTimer += dt;
      this.eliteVisualEffects.pulseTimer += dt;
      
      // REGENERATOR - Heal over time if not damaged recently
      if (this.hasAffix('REGENERATOR')) {
        const config = ELITE_AFFIXES.REGENERATOR;
        const now = Date.now();
        const timeSinceDamage = now - this.eliteVisualEffects.lastDamagedTime;
        
        // Only regenerate if not damaged recently
        if (timeSinceDamage >= config.damageCooldown) {
          const timeSinceRegen = now - this.eliteVisualEffects.lastRegenTime;
          
          if (timeSinceRegen >= config.regenInterval) {
            const healAmount = Math.ceil(this.stats.maxHp * config.regenPercent);
            this.stats.hp = Math.min(this.stats.maxHp, this.stats.hp + healAmount);
            this.eliteVisualEffects.lastRegenTime = now;
            this.eliteVisualEffects.regenPulsePhase = 0; // Reset pulse phase
            
            // No floating text - player should notice by observation
          }
        }
      }
      
      // VOLATILE - Handle explosion countdown
      if (this.hasAffix('VOLATILE') && this.eliteVisualEffects.volatileExploding) {
        this.eliteVisualEffects.volatileExplosionTimer -= dt;
        
        if (this.eliteVisualEffects.volatileExplosionTimer <= 0) {
          this.triggerVolatileExplosion(player);
          // ✅ FIX: After explosion, mark for removal
          // The game loop will clean up dead monsters in the next frame
          if (map && map.removeMonster) {
            map.removeMonster(this);
          }
        }
      }
      
      // FROST_AURA - Apply slow to nearby player
      if (this.hasAffix('FROST_AURA') && player) {
        const config = ELITE_AFFIXES.FROST_AURA;
        const distance = Math.abs(this.x - player.x) + Math.abs(this.y - player.y);
        
        if (distance <= config.range) {
          // Apply slow debuff (handled in player movement logic)
          player.frostAuraSlowed = true;
        } else {
          player.frostAuraSlowed = false;
        }
      }
      
      // Update visual effect timers
      if (this.eliteVisualEffects.regenShowTimer > 0) {
        this.eliteVisualEffects.regenShowTimer -= dt;
      }
      if (this.eliteVisualEffects.vampiricTintTimer > 0) {
        this.eliteVisualEffects.vampiricTintTimer -= dt;
      }
      
      // Update regen pulse phase
      this.eliteVisualEffects.regenPulsePhase += dt * 0.001; // Slow pulse
    }
  }
  
  // Trigger volatile explosion when monster dies
  triggerVolatileDeath() {
    if (!this.hasAffix('VOLATILE')) return;
    
    const config = ELITE_AFFIXES.VOLATILE;
    this.eliteVisualEffects.volatileExploding = true;
    this.eliteVisualEffects.volatileExplosionTimer = config.explodeDelay;
    
    // ✅ FIX: 设置无敌标记，防止DoT和其他伤害在自爆倒计时期间杀死怪物
    this.isInvulnerable = true; // 标记为无敌状态
    this.stats.hp = 1; // Keep at 1 HP to prevent actual death
    
    // No log message - player should notice the shaking/vibration effect
  }
  
  // Execute volatile explosion
  triggerVolatileExplosion(player) {
    const game = window.game;
    if (!game) return;
    
    const config = ELITE_AFFIXES.VOLATILE;
    const distance = Math.abs(this.x - player.x) + Math.abs(this.y - player.y);
    
    // Damage player if in range
    if (distance <= config.explodeRange) {
      player.takeDamage(config.explodeDamage);
      
      if (game.floatingTextPool && game.settings && game.settings.showDamageNumbers !== false) {
        const damageText = game.floatingTextPool.create(player.visualX, player.visualY - 10, `-${config.explodeDamage}`, '#ff3333');
        game.floatingTexts.push(damageText);
      }
      
      // Camera shake
      if (game.camera) {
        game.camera.shakeTimer = Math.max(game.camera.shakeTimer || 0, 30);
      }
      
      // Play explosion sound
      if (game.audio) {
        game.audio.playHit();
      }
    }
    
    // Now actually kill the monster
    this.stats.hp = 0;
    this.eliteVisualEffects.volatileExploding = false;
    this.isInvulnerable = false; // ✅ FIX: 清除无敌标记
  }
  
  tryWander(map, player) {
    // ✅ FIX: 冰冻状态下禁止移动
    if (this.hasStatus('FROZEN')) {
      return; // 冰冻状态：禁止移动
    }
    
    if (this.isMoving) return; if (this.moveTimer > 0) return;
    
    // Check if frozen - cannot move or act
    if (this.hasStatus('FREEZE')) {
      return;
    }
    
    // 如果在战斗状态，继续追击玩家
    if (this.inCombat) {
      this.tryChasePlayer(map, player);
      return;
    }
    
    // 正常漫游 - 怪物不再主动追击玩家
    const directions = [ {dx:0,dy:-1,dir:1}, {dx:0,dy:1,dir:0}, {dx:-1,dy:0,dir:2}, {dx:1,dy:0,dir:3} ];
    const randomDir = directions[Math.floor(Math.random()*directions.length)];
    const nx = this.x + randomDir.dx, ny = this.y + randomDir.dy;
    
    // ✅ FIX: 使用isWalkable检查位置是否可通行（包括障碍物检查）
    if (!map.isWalkable(nx, ny, false, this)) { 
      this.moveTimer = this.generateWanderInterval(); 
      return; 
    }
    
    // 检查玩家位置（玩家不应该被isWalkable检查，因为玩家是动态的）
    if (player.x === nx && player.y === ny) { 
      this.moveTimer = this.generateWanderInterval(); 
      return; 
    }
    
    const distFromHome = Math.abs(nx - this.homeX) + Math.abs(ny - this.homeY);
    if (distFromHome > this.leashRange) { 
      this.moveTimer = this.generateWanderInterval(); 
      return; 
    }
    
    this.x = nx; 
    this.y = ny; 
    this.destX = nx*TILE_SIZE; 
    this.destY = ny*TILE_SIZE; 
    this.isMoving = true; 
    this.sprite.setDirection(randomDir.dir);
    this.moveTimer = this.generateWanderInterval();
  }

  /**
   * 获取当前攻击冷却时间（考虑Boss狂暴等动态效果）
   * @returns {number} 当前攻击冷却时间（毫秒）
   */
  getCurrentAttackCooldown() {
    // 应用噩梦层级机制：bossEnrage（Boss狂暴）- HP<50%时攻击速度+30%
    if (this.type === 'BOSS' && this.ascConfig && this.ascConfig.bossEnrage) {
      const hpPercent = this.stats.hp / this.stats.maxHp;
      if (hpPercent < 0.5) {
        // Boss狂暴：攻击速度+30%，即冷却时间减少
        // 新APS = base_as * 1.3
        const enragedAS = (this.base_as || 1.0) * 1.3;
        const enragedCooldown = 1000 / enragedAS;
        return Math.max(100, Math.floor(enragedCooldown * (1 + this.ascConfig.atkCooldownMult)));
      }
    }
    // 正常情况或非Boss，返回基础攻击冷却时间
    return this.baseAttackCooldown;
  }

  tryChasePlayer(map, player) {
    // ✅ FIX: 修复怪物被冰冻时仍能追击的AI漏洞 - 冰冻状态下禁止移动和转向
    if (this.hasStatus('FROZEN') || this.hasStatus('FREEZE')) {
      return; // 冰冻状态下无法移动或转向
    }
    
    if (this.isMoving) return; if (this.moveTimer > 0) return;
    
    // 应用噩梦层级机制：aggroRange（仇恨范围修饰符）
    const baseAggroRange = 6; // 基础追击范围扩大，确保怪物能持续追击
    const aggroRange = baseAggroRange + (this.ascConfig?.aggroRange || 0);
    
    // 简单的追击逻辑：朝向玩家移动
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const distToPlayer = Math.abs(dx) + Math.abs(dy); // Manhattan distance
    
    // 检查是否在仇恨范围内（应用aggroRange修饰符）
    if (distToPlayer > aggroRange) {
      // 超出仇恨范围，退出战斗状态
      this.exitCombat();
      return;
    }
    
    // Check if player is adjacent (1 tile away) - if so, attack instead of move
    if (distToPlayer === 1) {
      // Player is adjacent - check if attack is off cooldown
      // 使用 getCurrentAttackCooldown() 方法动态获取当前攻击冷却时间（考虑Boss狂暴）
      const currentAttackCooldown = this.getCurrentAttackCooldown();
      const now = Date.now();
      if (now - this.lastAttackTime >= currentAttackCooldown) {
        // Attack is ready - trigger monster attack
        // ✅ FIX: 使用全局CombatSystem，避免动态import
        const game = window.game;
        if (game && game.combatSystem) {
          game.combatSystem.monsterAttackPlayer(player, this);
        } else {
          // 降级方案：动态导入（如果game.combatSystem不存在）
          import('./systems.js').then(({ CombatSystem }) => {
            CombatSystem.monsterAttackPlayer(player, this);
          }).catch(err => console.error('Failed to import CombatSystem:', err));
        }
        this.lastAttackTime = now;
        this.moveTimer = 300; // Short cooldown before next action
      } else {
        // Attack is on cooldown - just wait
        this.moveTimer = 200; // Wait a bit before checking again
      }
      return;
    }
    
    // 优先移动距离最大的方向
    let moveDir = null;
    if (Math.abs(dx) > Math.abs(dy)) {
      // 优先水平移动
      moveDir = dx > 0 ? {dx:1,dy:0,dir:3} : {dx:-1,dy:0,dir:2};
    } else {
      // 优先竖直移动
      moveDir = dy > 0 ? {dx:0,dy:1,dir:0} : {dx:0,dy:-1,dir:1};
    }
    
    const nx = this.x + moveDir.dx;
    const ny = this.y + moveDir.dy;
    
    // ✅ FIX: 使用isWalkable检查位置是否可通行（包括障碍物检查）
    if (!map.isWalkable(nx, ny, false, this)) {
      // 尝试备选方向
      const altDir = Math.abs(dx) > Math.abs(dy) 
        ? {dx:0,dy:(dy > 0 ? 1 : -1),dir:(dy > 0 ? 0 : 1)}
        : {dx:(dx > 0 ? 1 : -1),dy:0,dir:(dx > 0 ? 3 : 2)};
      const altX = this.x + altDir.dx;
      const altY = this.y + altDir.dy;
      
      if (!map.isWalkable(altX, altY, false, this)) {
        this.moveTimer = 300;
        return;
      }
      
      // 使用备选方向
      this.x = altX; 
      this.y = altY; 
      this.destX = altX*TILE_SIZE; 
      this.destY = altY*TILE_SIZE; 
      this.isMoving = true; 
      this.sprite.setDirection(altDir.dir);
      this.moveTimer = 300;
      return;
    }
    
    // 移动
    this.x = nx; this.y = ny; this.destX = nx*TILE_SIZE; this.destY = ny*TILE_SIZE; this.isMoving = true; this.sprite.setDirection(moveDir.dir);
    this.moveTimer = 300; // 追击时更频繁地移动
  }
  
  /**
   * 渲染状态图标（在实体上方显示）
   * 重写或扩展以包含激怒状态显示
   */
  drawStatusIcons(ctx, camX, camY) {
    // 调用父类方法绘制普通状态
    super.drawStatusIcons(ctx, camX, camY);
    
    // 额外绘制激怒层数 (如果有)
    if (this.enrageStacks > 0) {
      const screenX = this.visualX;
      const screenY = this.visualY;
      
      // 在血条或名字上方绘制红色激怒点
      const x = screenX + TILE_SIZE - 8; // 右上角
      const y = screenY - 5;
      
      ctx.save();
      ctx.fillStyle = '#ff0000';
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      
      // 绘制一个小红点表示激怒
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      
      // 如果层数较高，显示数字
      if (this.enrageStacks >= 3) {
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 8px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        // 稍微偏移一点位置显示数字
        ctx.fillText(this.enrageStacks, x, y - 8);
      }
      ctx.restore();
    }
  }
}

export class Merchant extends Entity {
  constructor(x, y, loader) {
    super(x, y);
    this.sprite = new Sprite({ assetKey: 'NPC_MERCHANT', loader, destHeight: 56, animationType: 'merchant' });
    this.moveSpeed = 0;
  }
  
  // 获取地精商人在该楼层是否应该出现
  // 参数：floor - 当前楼层数，lastAppearFloor - 上次出现的楼层数
  static shouldAppear(floor, lastAppearFloor) {
    // 计算连续没有出现的楼层数
    const floorsSinceAppear = floor - lastAppearFloor - 1;
    
    // 如果连续两层没出现（即间隔 >= 2），则必定出现
    if (floorsSinceAppear >= 2) {
      return true;
    }
    
    // 否则有 30% 的概率出现
    return Math.random() < 0.3;
  }
}

export class Gambler extends Entity {
  constructor(x, y, loader) {
    super(x, y);
    this.sprite = new Sprite({ assetKey: 'NPC_GAMBLER', loader, destHeight: 56, animationType: 'merchant' });
    this.moveSpeed = 0;
    this.type = 'GAMBLER'; // 用于识别实体类型
  }
  
  // 判断赌徒在该楼层是否应该出现
  // 参数：floor - 当前楼层数
  static shouldAppear(floor, config = {}) {
    const minFloor = config.minFloor || 2;
    const spawnChance = config.spawnChance || 0.1;
    
    // 从指定楼层开始出现
    if (floor < minFloor) {
      return false;
    }
    
    // 随机概率出现（默认 10%）
    return Math.random() < spawnChance;
  }
}

export class Player extends Entity {
  constructor(map, loader, charConfig = null) {
    super(1, 1);
    
    // Initialize stats from character config or use defaults
    let baseStats = { hp: 100, maxHp: 100, p_atk: 15, p_def: 5, m_atk: 0, m_def: 0, rage: 0 };
    if (charConfig && charConfig.stats) {
      baseStats = { ...charConfig.stats };
    }
    
    this.stats = { 
      hp: baseStats.hp, 
      maxHp: baseStats.maxHp, 
      p_atk: baseStats.p_atk, 
      p_def: baseStats.p_def, 
      m_atk: baseStats.m_atk, 
      m_def: baseStats.m_def, 
      rage: baseStats.rage || 0, 
      lvl: 1, 
      xp: 0, 
      nextLevelXp: 50, 
      keys: 1, 
      floor: 1, 
      gold: 0 
    };
    
    this.equipment = { WEAPON: null, ARMOR: null, HELM: null, BOOTS: null, RING: null, AMULET: null, ACCESSORY: null };
    // Initialize inventory as array of 20 null slots (not undefined)
    this.inventory = new Array(20).fill(null);
    this.map = map; 
    this.loader = loader;
    this.sprite = new Sprite({ assetKey: 'PLAYER', loader, animationType: 'player' });
    this.moveSpeed = 0.25; 
    this.pendingCombat = null;
    this.charConfig = charConfig; // Store character config for reference
    
    // Initialize skills from character config
    this.skills = null;
    if (charConfig && charConfig.skills) {
      this.skills = charConfig.skills;
    }
    
    // Initialize buffs and cooldowns
    this.buffs = { 
      berserk: { active: false, timer: 0, stacks: 0 } 
    };
    
    // Initialize cooldowns with max values from character config
    this.cooldowns = { 
      active: 0, 
      ult: 0,
      maxActive: (charConfig && charConfig.skills && charConfig.skills.ACTIVE) ? charConfig.skills.ACTIVE.cd : 5000,
      maxUlt: (charConfig && charConfig.skills && charConfig.skills.ULT) ? charConfig.skills.ULT.cd : 20000
    };
    
    // Initialize skill states
    this.states = {
      slashPrimed: false,
      scorchPrimed: false,
      freezePrimed: false
    };
    
    // 脚步声计时器（用于控制脚步声播放频率）
    this.footstepTimer = 0;
    this.footstepInterval = 400; // 每400ms播放一次脚步声
    
    // ========== 命运符文系统 2.1：初始化符文状态容器 ==========
    this.runeState = {
      // 记录已获得的符文等级/层数，例如 { 'thunder': 3, 'execute': 1 }
      effects: {},
      // 记录通过符文获得的累计属性，用于UI显示，例如 { p_atk: 50, hp: 200 }
      bonusStats: {
        p_atk: 0,
        m_atk: 0,
        p_def: 0,
        m_def: 0,
        hp: 0,
        crit_rate: 0,
        dodge: 0,
        gold_rate: 0,
        atk_speed: 0,
        p_atk_percent: 0,
        m_atk_percent: 0
      }
    };
    
    // 初始化符文运行时数据（用于存储机制类符文的配置）
    this.runes = {};
    
    // ========== 远古遗物系统：初始化遗物容器 ==========
    this.relics = new Map(); // 存储遗物，Key为ID，Value为遗物对象
    
    // ========== 武器精通系统：初始化战斗状态 ==========
    this.combatState = {
      comboCount: 0,
      maxCombo: 0,
      lastTargetId: null,
      lastAttackTime: 0,
      weaponType: null
    };
    
    // ========== 攻击速度系统：初始化攻击计时器 ==========
    this.lastAttackTime = 0; // 用于攻击冷却时间追踪
    this.postKillDelay = 0; // 用于防止击杀后立即移动的延迟标志
  }
  
  // Handle status tick effects for player
  onStatusTick(type, status) {
    const statusDef = STATUS_TYPES[type];
    if (!statusDef) return;
    
    if (type === 'BURN') {
      // Burn damage: 2% of max HP per tick
      const damagePercent = statusDef.damagePercent || 0.02;
      const damage = Math.max(1, Math.floor(this.stats.maxHp * damagePercent));
      this.takeDamage(damage);
      if (window.game && window.game.floatingTextPool && window.game.settings && window.game.settings.showDamageNumbers !== false) {
        const burnText = window.game.floatingTextPool.create(this.visualX, this.visualY - 10, `-${damage}`, '#ff6b6b');
        window.game.floatingTexts.push(burnText);
      }
    } else if (type === 'FREEZE_DOT') {
      // Freeze DOT: 3% of max HP per tick
      const damagePercent = statusDef.damagePercent || 0.03;
      const damage = Math.max(1, Math.floor(this.stats.maxHp * damagePercent));
      this.takeDamage(damage);
      if (window.game && window.game.floatingTextPool && window.game.settings && window.game.settings.showDamageNumbers !== false) {
        const freezeText = window.game.floatingTextPool.create(this.visualX, this.visualY - 10, `-${damage}`, '#00bfff');
        window.game.floatingTexts.push(freezeText);
      }
    } else if (type === 'POISON') {
      // Poison damage: 1% of max HP per stack per tick (stackable)
      const stacks = status.config?.stacks || 1;
      const damagePercent = statusDef.damagePercent || 0.01;
      const damage = Math.max(1, Math.floor(this.stats.maxHp * damagePercent * stacks));
      this.takeDamage(damage);
      if (window.game && window.game.floatingTextPool && window.game.settings && window.game.settings.showDamageNumbers !== false) {
        const poisonText = window.game.floatingTextPool.create(this.visualX, this.visualY - 10, `-${damage}`, '#00ff00');
        window.game.floatingTexts.push(poisonText);
      }
    }
  }
  /**
   * 添加物品到背包
   * @param {string|Object} item - 物品ID字符串或物品实例对象
   * @returns {boolean} 是否添加成功
   */
  addToInventory(item) { 
    // Ensure strict null check (not undefined or falsy values)
    const idx = this.inventory.findIndex(slot => slot === null); 
    if (idx === -1) return false; 
    
    // 如果传入的是字符串ID,创建标准化的物品实例对象
    if (typeof item === 'string') {
      // ✅ v2.0: 使用标准化函数创建物品实例
      const itemInstance = createStandardizedItem(item, {
        level: 1,
        affixes: [],
        uniqueEffect: null,
        setId: null
      });
      
      if (!itemInstance) return false;
      
      this.inventory[idx] = itemInstance;
    } else {
      // 如果传入的是对象,确保它有标准结构
      if (item && typeof item === 'object') {
        // 如果对象缺少标准字段，尝试标准化它
        if (!item.uid || !item.meta) {
          // 如果有 itemId 或 id，尝试标准化
          const itemId = item.itemId || item.id;
          if (itemId) {
            const standardized = createStandardizedItem(itemId, {
              level: item.level || item.meta?.level || 1,
              affixes: item.affixes || item.meta?.affixes || [],
              uniqueEffect: item.uniqueEffect || item.meta?.uniqueEffect || null,
              setId: item.setId || item.meta?.setId || null
            });
            if (standardized) {
              // 合并原有属性（如 enhanceLevel, stats 等）
              this.inventory[idx] = { ...standardized, ...item };
              return true;
            }
          }
        }
      }
      // 如果传入的是对象,直接存储（假设已经是标准对象）
      this.inventory[idx] = item;
    }
    
    return true; 
  }
  /**
   * 从背包移除物品
   * @param {number} index - 背包槽位索引
   * @returns {Object|string|null} 移除的物品实例对象或ID
   */
  removeFromInventory(index) { 
    if (index<0 || index>=this.inventory.length) return null; 
    const item = this.inventory[index]; 
    this.inventory[index] = null; 
    return item; 
  }
  findFirstEmptyInventorySlot() { return this.inventory.findIndex(x=>x===null); }
  swapInventory(a, b) { if (a===b) return true; if (a<0||a>=this.inventory.length||b<0||b>=this.inventory.length) return false; const tmp=this.inventory[a]; this.inventory[a]=this.inventory[b]; this.inventory[b]=tmp; return true; }
  /**
   * 卸下装备到背包槽位
   * @param {string} slot - 装备槽位
   * @param {number} invIndex - 背包槽位索引
   * @returns {boolean} 是否成功
   */
  unequipToSlot(slot, invIndex) { 
    if (!slot) return false; 
    if (invIndex<0||invIndex>=this.inventory.length) return false; 
    if (this.inventory[invIndex]!==null) return false; 
    
    const equippedItem = this.equipment[slot]; 
    if (!equippedItem) return false; 
    
    this.equipment[slot] = null; 
    this.inventory[invIndex] = equippedItem; // 存储物品实例对象
    
    if (window.game&&window.game.ui){ 
      window.game.ui.updateEquipmentSockets(this); 
      window.game.ui.renderInventory?.(this); 
      window.game.ui.updateStats(this);
    } 
    return true; 
  }
  /**
   * 获取物品实例对象（兼容旧代码）
   * @param {string|Object} item - 物品ID字符串或物品实例对象
   * @returns {Object|null} 物品实例对象
   */
  getItemInstance(item) {
    if (!item) return null;
    
    // 如果是对象,直接返回
    if (typeof item === 'object') {
      return item;
    }
    
    // 如果是字符串ID,从数据库获取并创建实例
    const itemDef = EQUIPMENT_DB[item];
    if (!itemDef) return null;
    
    return {
      itemId: item,
      uid: `${item}_legacy_${Date.now()}`,
      quality: itemDef.quality || 'COMMON',
      enhanceLevel: itemDef.enhanceLevel || 0,
      stats: itemDef.stats ? { ...itemDef.stats } : {},
      baseStats: itemDef.baseStats || (itemDef.stats ? { ...itemDef.stats } : {}),
      ...itemDef
    };
  }

  getTotalStats() {
    // ========== 第一阶段：基础统计 ==========
    // ✅ 防御性初始化：确保所有属性都有默认值，防止NaN
    // ✅ CRITICAL: Store BASE stats before any modifications (for percentage calculations)
    const basePAtk = this.stats.p_atk || 0;
    const baseMAtk = this.stats.m_atk || 0;
    
    const total = { 
      p_atk: basePAtk, 
      m_atk: baseMAtk, 
      p_def: this.stats.p_def || 0, 
      m_def: this.stats.m_def || 0, 
      dodge: 0.05, // 基础闪避率5%
      crit_dmg: 1.4, // 基础暴击伤害倍率
      maxHp: this.stats.maxHp || 100,
      maxMp: this.stats.maxMp || 0
    };
    
    // 套装计数：记录每个套装ID出现的次数
    const setCounts = {};
    
    // ✅ 防御性累加：确保装备的stats字段存在，且所有属性都有默认值
    const add = (itemInstance) => { 
      if (!itemInstance) return;
      
      // 优先使用实例属性，如果缺失则回退到DB默认值
      const s = itemInstance.stats || {}; // 如果stats为undefined，使用空对象
      total.p_atk += (s.p_atk || 0); 
      total.m_atk += (s.m_atk || 0); 
      total.p_def += (s.p_def || 0); 
      total.m_def += (s.m_def || 0); 
      total.dodge += (s.dodge || 0); // 安全累加闪避值
      total.maxHp += (s.maxHp || 0);
      total.maxMp += (s.maxMp || 0);
      // ✅ FIX: 暴击伤害属性需要除以100（因为装备/天赋中存储的是百分比值，如50表示50%）
      total.crit_dmg += (s.crit_dmg || 0) / 100;
      
      // ✅ v2.0: 记录套装ID
      const setId = itemInstance.meta?.setId;
      if (setId) {
        setCounts[setId] = (setCounts[setId] || 0) + 1;
      }
    };
    
    // 获取装备实例对象（兼容旧代码）
    const weapon = this.getItemInstance(this.equipment.WEAPON);
    const armor = this.getItemInstance(this.equipment.ARMOR);
    const helm = this.getItemInstance(this.equipment.HELM);
    const boots = this.getItemInstance(this.equipment.BOOTS);
    const ring = this.getItemInstance(this.equipment.RING);
    const amulet = this.getItemInstance(this.equipment.AMULET);
    const accessory = this.getItemInstance(this.equipment.ACCESSORY);
    
    add(weapon);
    add(armor);
    add(helm);
    add(boots);
    add(ring);
    add(amulet);
    add(accessory);
    
    // ========== 第二阶段：转化逻辑 ==========
    // 处理"转化类"词缀（例如：将护甲转化为攻击力）
    // 注意：转化逻辑需要在基础统计完成后计算，因为需要基于当前的基础属性值
    
    // 存储转化效果（从套装效果中获取）
    const conversions = {};
    
    // ✅ FIX: 先累加装备的 crit_rate（在设置基础值之前）
    // 注意：dodge 已经在第一阶段通过 add() 累加了，这里只需要处理 crit_rate
    // 因为 crit_rate 在后续逻辑中会被直接赋值覆盖，需要先累加装备属性
    let equipmentCritRate = 0;
    
    // 重新遍历装备，累加 crit_rate
    const addCritRate = (itemInstance) => {
      if (!itemInstance) return;
      const s = itemInstance.stats || {};
      if (s.crit_rate !== undefined) equipmentCritRate += (s.crit_rate || 0);
    };
    
    addCritRate(weapon);
    addCritRate(armor);
    addCritRate(helm);
    addCritRate(boots);
    addCritRate(ring);
    addCritRate(amulet);
    addCritRate(accessory);
    
    // 先应用职业被动和Buff（这些不影响转化计算）
    // Apply Warrior passive: 20% physical defense boost
    if (this.charConfig && this.charConfig.id === 'WARRIOR') {
      total.p_def = Math.floor(total.p_def * 1.2);
    }
    
    // Apply Mage passive: 25% magic attack boost
    if (this.charConfig && this.charConfig.id === 'MAGE') {
      total.m_atk = Math.floor(total.m_atk * 1.25);
    }
    
    // Apply Berserk buff: 50% attack boost
    if (this.buffs && this.buffs.berserk && this.buffs.berserk.active) {
      total.p_atk = Math.floor(total.p_atk * 1.5);
    }
    
    // ========== 第三阶段：套装激活 ==========
    // 根据setId计数，从sets.js获取激活的套装效果
    for (const [setId, count] of Object.entries(setCounts)) {
      const setConfig = getSetConfig(setId);
      if (!setConfig || !setConfig.pieces) continue;
      
      // 检查激活的套装效果（2件套、4件套等）
      const pieceCounts = Object.keys(setConfig.pieces).map(Number).sort((a, b) => b - a);
      
      for (const pieceCount of pieceCounts) {
        if (count >= pieceCount) {
          const effect = setConfig.pieces[pieceCount];
          
          // 应用直接属性加成
          if (effect.stats) {
            for (const [statKey, statValue] of Object.entries(effect.stats)) {
              if (total[statKey] !== undefined) {
                total[statKey] += statValue;
              }
            }
          }
          
          // 存储特殊标记（供其他系统使用）
          if (effect.flags) {
            for (const [flagKey, flagValue] of Object.entries(effect.flags)) {
              if (!total.flags) total.flags = {};
              total.flags[flagKey] = flagValue;
            }
          }
          
          // 存储转化效果（在转化阶段处理）
          if (effect.conversions) {
            for (const [convKey, convValue] of Object.entries(effect.conversions)) {
              conversions[convKey] = convValue;
            }
          }
          
          // 只应用最高等级的套装效果（例如：如果4件套激活，就不应用2件套）
          break;
        }
      }
    }
    
    // 应用转化效果
    for (const [convKey, convValue] of Object.entries(conversions)) {
      if (convKey === 'p_def_to_p_atk') {
        // 将护甲转化为物理攻击
        const converted = total.p_def * convValue;
        total.p_atk += Math.floor(converted);
        // 注意：这里不减少护甲，因为转化是"额外获得"，而不是"消耗护甲"
      } else if (convKey === 'm_def_to_m_atk') {
        // 将魔法防御转化为魔法攻击
        const converted = total.m_def * convValue;
        total.m_atk += Math.floor(converted);
      }
      // 可以添加更多转化类型
    }
    
    // ========== 天赋树关键石效果 ==========
    if (this.activeKeystones && Array.isArray(this.activeKeystones)) {
      // IRON_WILL (钢铁意志): 物攻的50%转化为魔攻
      if (this.activeKeystones.includes('IRON_WILL')) {
        total.m_atk += Math.floor(total.p_atk * 0.5);
      }
      
      // BERSERKER (狂战士): HP<50%时物攻+30%
      if (this.activeKeystones.includes('BERSERKER')) {
        const hpPercent = this.stats.hp / this.stats.maxHp;
        if (hpPercent < 0.5) {
          total.p_atk = Math.floor(total.p_atk * 1.3);
        }
      }
      
      // CRITICAL_MASTER (暴击大师): 增加暴击伤害
      if (this.activeKeystones.includes('CRITICAL_MASTER')) {
        total.crit_dmg += 0.5; // 增加50%暴击伤害
      }
    }
    
    // ✅ 累加天赋树提供的 gold_rate 和 armor_pen
    if (this.stats.gold_rate !== undefined) {
      total.gold_rate = (total.gold_rate || 0) + this.stats.gold_rate;
    }
    if (this.stats.armor_pen !== undefined) {
      total.armor_pen = (total.armor_pen || 0) + this.stats.armor_pen;
    }
    
    // ✅ 累加天赋树提供的攻击速度
    if (this.stats.atk_speed !== undefined) {
      total.atk_speed = (total.atk_speed || 0) + this.stats.atk_speed;
    }
    
    // ✅ 累加天赋树提供的百分比物攻
    if (this.stats.p_atk_percent !== undefined) {
      total.p_atk_percent = (total.p_atk_percent || 0) + this.stats.p_atk_percent;
    }
    
    // ✅ 累加天赋树提供的百分比魔攻
    if (this.stats.m_atk_percent !== undefined) {
      total.m_atk_percent = (total.m_atk_percent || 0) + this.stats.m_atk_percent;
    }
    
    // ✅ 累加天赋树提供的冷却缩减
    if (this.stats.cooldown_reduction !== undefined) {
      total.cooldown_reduction = (total.cooldown_reduction || 0) + this.stats.cooldown_reduction;
    }
    
    // ✅ 累加天赋树提供的最终减伤
    if (this.stats.final_dmg_reduce !== undefined) {
      total.final_dmg_reduce = (total.final_dmg_reduce || 0) + this.stats.final_dmg_reduce;
    }
    
    // ✅ 累加天赋树提供的最大魔力百分比
    if (this.stats.max_mp_percent !== undefined) {
      total.max_mp_percent = (total.max_mp_percent || 0) + this.stats.max_mp_percent;
    }
    
    // ✅ 累加天赋树提供的暴击伤害
    // 注意：TalentData 中可能存储为整数（如 50 表示 50%）或小数（如 0.15 表示 15%）
    // 如果值 >= 1，则除以 100；否则直接使用（已经是小数格式）
    if (this.stats.crit_dmg !== undefined) {
      const critDmgValue = Math.abs(this.stats.crit_dmg) >= 1 ? this.stats.crit_dmg / 100 : this.stats.crit_dmg;
      total.crit_dmg += critDmgValue;
    }
    
    // ✅ 不屈堡垒：最终物防+20%（在所有计算完成后应用）
    if (this.activeKeystones && Array.isArray(this.activeKeystones) && this.activeKeystones.includes('UNYIELDING_FORTRESS')) {
      total.p_def = Math.floor(total.p_def * 1.20);
    }
    
    // ✅ FIX: Calculate Crit Rate - 累加所有来源，而不是覆盖
    // 公式：总暴击率 = 基础值 + 装备属性 + Buff + 符文 + 宝石
    let crit_rate = COMBAT_CONFIG.BASE_CRIT_RATE || 0.2; // Default 20% base crit rate
    
    // ✅ FIX: 累加装备提供的暴击率（在第二阶段已计算）
    crit_rate += equipmentCritRate;
    
    // If Berserk is active with stacks, set crit rate to 100% (覆盖所有其他来源)
    if (this.buffs && this.buffs.berserk && this.buffs.berserk.stacks > 0) {
      crit_rate = 1.0; // 100% crit rate during berserk
    }
    
    // ✅ FIX: 累加而不是覆盖
    // 注意：total.dodge 已经在第一阶段通过 add() 累加了装备的 dodge，所以这里只需要设置 crit_rate
    total.crit_rate = crit_rate;
    
    // ✅ 防御性检查：确保dodge值有效（防止NaN或无效值）
    if (isNaN(total.dodge) || total.dodge < 0) {
      total.dodge = 0.05; // 重置为基础值
    }
    // 限制闪避率上限（防止超过100%）
    total.dodge = Math.min(total.dodge, 1.0);
    
    // ========== 第四阶段：符文属性加成 ==========
    // ✅ 命运符文系统 2.1：累加符文提供的属性加成
    if (this.runeState && this.runeState.bonusStats) {
      const bonus = this.runeState.bonusStats;
      
      // 累加基础属性
      total.p_atk += (bonus.p_atk || 0);
      total.m_atk += (bonus.m_atk || 0);
      total.p_def += (bonus.p_def || 0);
      total.m_def += (bonus.m_def || 0);
      total.maxHp += (bonus.hp || 0);
      
      // 累加百分比属性（暴击率、闪避率）
      if (bonus.crit_rate) {
        total.crit_rate = (total.crit_rate || 0) + bonus.crit_rate;
      }
      if (bonus.dodge) {
        total.dodge = (total.dodge || 0) + bonus.dodge;
      }
      
      // 累加攻击速度（用于后续计算）
      if (bonus.atk_speed !== undefined) {
        total.atk_speed = (total.atk_speed || 0) + bonus.atk_speed;
      }
      
      // 存储百分比攻击加成（在第五阶段应用）
      if (bonus.p_atk_percent !== undefined) {
        total.p_atk_percent = (total.p_atk_percent || 0) + bonus.p_atk_percent;
      }
      if (bonus.m_atk_percent !== undefined) {
        total.m_atk_percent = (total.m_atk_percent || 0) + bonus.m_atk_percent;
      }
      
      // ✅ 累加新属性：冷却缩减、最终减伤、最大魔力百分比
      if (bonus.cooldown_reduction !== undefined) {
        total.cooldown_reduction = (total.cooldown_reduction || 0) + bonus.cooldown_reduction;
      }
      if (bonus.final_dmg_reduce !== undefined) {
        total.final_dmg_reduce = (total.final_dmg_reduce || 0) + bonus.final_dmg_reduce;
      }
      if (bonus.max_mp_percent !== undefined) {
        total.max_mp_percent = (total.max_mp_percent || 0) + bonus.max_mp_percent;
      }
      
      // 限制百分比属性上限
      total.crit_rate = Math.min(total.crit_rate || 0, 1.0);
      total.dodge = Math.min(total.dodge || 0, 1.0);
    }
    
    // ========== 第五阶段：符文机制类属性 ==========
    // ✅ FIX: 只处理MECHANIC类符文的运行时属性（如暴击伤害加成），STAT类符文的属性已在第四阶段通过bonusStats处理
    if (this.runes) {
      // ✅ FIX: 不再累加runes中的crit_rate和dodge（这些已通过bonusStats在第四阶段处理，避免双重叠加）
      // 只处理机制类属性（如暴击伤害加成）
      if (this.runes.crit_dmg_bonus !== undefined) {
        total.crit_dmg = (total.crit_dmg || 0) + this.runes.crit_dmg_bonus;
      }
      
      // 限制百分比属性上限
      total.crit_rate = Math.min(total.crit_rate || 0, 1.0);
      total.dodge = Math.min(total.dodge || 0, 1.0);
    }
    
    // ========== 第六阶段：宝石镶嵌系统属性加成 ==========
    // ✅ 遍历所有装备，计算宝石加成
    for (const [slot, itemInstance] of Object.entries(this.equipment)) {
      if (!itemInstance) continue;
      
      // 检查装备是否有sockets
      const sockets = itemInstance.meta?.sockets;
      if (!sockets || !Array.isArray(sockets)) continue;
      
      // 遍历每个socket
      for (const socket of sockets) {
        // 检查socket是否已填充宝石
        if (socket.status === 'FILLED' && socket.gemId) {
          // 从数据库获取宝石数据
          const gemDef = EQUIPMENT_DB[socket.gemId];
          if (!gemDef || !gemDef.gemEffects) continue;
          
          // 根据装备类型选择对应的gemEffects
          const isWeapon = slot === 'WEAPON';
          const gemEffect = isWeapon ? gemDef.gemEffects.weapon : gemDef.gemEffects.armor;
          
          if (gemEffect) {
            // ✅ FIX: 累加宝石属性到总属性（添加防御性检查，防止NaN）
            for (const [statKey, statValue] of Object.entries(gemEffect)) {
              // 跳过infuseElement（这是机制属性，不是数值属性）
              if (statKey === 'infuseElement') continue;
              
              // ✅ FIX: 防御性检查 - 如果属性未初始化，先初始化为0
              if (total[statKey] === undefined) {
                total[statKey] = 0;
              }
              
              // 累加属性值
              if (typeof statValue === 'number' && !isNaN(statValue)) {
                total[statKey] += statValue;
              }
            }
          }
        }
      }
    }
    
    // 限制百分比属性上限（在宝石加成后再次限制）
    total.crit_rate = Math.min(total.crit_rate || 0, 1.0);
    total.dodge = Math.min(total.dodge || 0, 1.0);
    
    // ========== 第七阶段：应用百分比攻击加成 ==========
    // ✅ CRITICAL FIX: 百分比加成只应用于BASE stat，不是total
    // Formula: Total_Stat = Base_Stat + Flat_Bonuses + (Base_Stat * Percent_Bonus)
    // Example: Base 200 + Flat 50 + (200 * 0.5) = 350 (NOT 375)
    if (total.p_atk_percent) {
      const percentBonus = Math.floor(basePAtk * total.p_atk_percent);
      total.p_atk += percentBonus;
    }
    if (total.m_atk_percent) {
      const percentBonus = Math.floor(baseMAtk * total.m_atk_percent);
      total.m_atk += percentBonus;
    }
    
    // ✅ 应用百分比魔力加成
    if (total.max_mp_percent) {
      total.max_mp = Math.floor(total.max_mp * (1 + total.max_mp_percent));
    }
    
    // ========== 第八阶段：计算最终攻击速度 ==========
    // ✅ 攻击速度系统：Base_APS + Bonus_APS，上限 7.0 APS，下限 0.1 APS
    const baseAS = this.charConfig?.base_as || 1.0;
    const bonusAS = total.atk_speed || 0;
    const finalAS = Math.max(0.1, Math.min(7.0, baseAS + bonusAS)); // ✅ Safety clamp: min 0.1 APS, max 7.0 APS
    total.atk_speed = finalAS;
    
    return total;
  }
  
  /**
   * 获取当前攻击速度 (APS - Attacks Per Second)
   * @returns {number} 攻击速度（每秒攻击次数）
   */
  getAttackSpeed() {
    const totals = this.getTotalStats();
    return totals.atk_speed || 1.0;
  }
  
  /**
   * 获取当前攻击冷却时间（毫秒）
   * @returns {number} 攻击间隔（毫秒）
   */
  getAttackCooldown() {
    const aps = this.getAttackSpeed();
    // ✅ Safety: APS is already clamped to [0.1, 7.0] in getTotalStats(), so no division by zero
    // 公式：Attack_Interval_MS = 1000 / Final_APS
    const safeAPS = Math.max(0.1, aps); // Extra safety check (should never be needed)
    return 1000 / safeAPS;
  }
  /**
   * 装备物品
   * @param {string|Object} item - 物品ID字符串或物品实例对象
   * @returns {Object|null} 之前装备的物品实例对象
   */
  equip(item) {
    // 获取物品实例对象
    let itemInstance = null;
    
    if (typeof item === 'string') {
      // 如果是字符串ID,从背包中查找或创建实例
      const invItem = this.inventory.find(slot => slot && (slot.itemId === item || slot.id === item || (typeof slot === 'string' && slot === item)));
      if (invItem && typeof invItem === 'object') {
        itemInstance = invItem;
      } else {
        // ✅ v2.0: 从数据库创建标准化的物品实例
        itemInstance = createStandardizedItem(item, {
          level: 1,
          affixes: [],
          uniqueEffect: null,
          setId: null
        });
        
        if (!itemInstance) return null;
      }
    } else if (typeof item === 'object') {
      // 确保对象有标准结构
      if (!item.uid || !item.meta) {
        // 如果有 itemId 或 id，尝试标准化
        const itemId = item.itemId || item.id;
        if (itemId) {
          const standardized = createStandardizedItem(itemId, {
            level: item.level || item.meta?.level || 1,
            affixes: item.affixes || item.meta?.affixes || [],
            uniqueEffect: item.uniqueEffect || item.meta?.uniqueEffect || null,
            setId: item.setId || item.meta?.setId || null
          });
          if (standardized) {
            // 合并原有属性（如 enhanceLevel, stats 等）
            itemInstance = { ...standardized, ...item };
          } else {
            itemInstance = item;
          }
        } else {
          itemInstance = item;
        }
      } else {
        itemInstance = item;
      }
    } else {
      return null;
    }
    
    if (!itemInstance || !itemInstance.type) return null;
    
    const slot = itemInstance.type;
    const prev = this.equipment[slot] || null;
    
    // ✅ FIX: 当武器发生变更时，重置连击计数（防止连击状态跨武器继承）
    if (slot === 'WEAPON' && prev !== itemInstance) {
      if (this.combatState) {
        this.combatState.comboCount = 0;
        this.combatState.lastTargetId = null;
        this.combatState.lastAttackTime = 0;
      }
    }
    
    // 存储物品实例对象（而不是ID）
    this.equipment[slot] = itemInstance;
    
    if (window.game && window.game.ui) { 
      window.game.ui.updateEquipmentSockets(this); 
      window.game.ui.updateStats(this); 
      const itemName = itemInstance.nameZh || itemInstance.name;
      window.game.ui.logMessage(`已装备 ${itemName}`, 'gain');
    }
    return prev;
  }
  update(dt) {
    // ✅ CRITICAL FIX: 卫语句：死亡阶段禁止操作
    if (window.game && window.game.deathPhase && window.game.deathPhase.active) {
      return;
    }
    
    // ✅ FIX: 冰冻状态下禁止使用技能（在update中检查，确保技能无法激活）
    // 注意：实际的技能激活检查在main.js的输入处理中，这里只是确保状态正确
    
    // Update cooldown timers
    if (this.cooldowns.active > 0) {
      this.cooldowns.active -= dt;
    }
    if (this.cooldowns.ult > 0) {
      this.cooldowns.ult -= dt;
    }
    
    // Update buff timers
    if (this.buffs && this.buffs.berserk) {
      if (this.buffs.berserk.active && this.buffs.berserk.timer > 0) {
        this.buffs.berserk.timer -= dt;
        if (this.buffs.berserk.timer <= 0) {
          this.buffs.berserk.active = false;
          this.buffs.berserk.stacks = 0;
          if (window.game && window.game.ui) {
            window.game.ui.logMessage('狂暴状态已结束', 'info');
          }
        }
      }
    }
  }
  
  // 覆盖 Entity 的 updateVisuals 方法，添加脚步声
  updateVisuals(dt) {
    // 如果正在移动，播放脚步声
    if (this.isMoving) {
      this.footstepTimer += dt;
      if (this.footstepTimer >= this.footstepInterval) {
        this.footstepTimer = 0;
        // 播放脚步声
        const game = window.game;
        if (game && game.audio) {
          game.audio.playFootstep();
        }
      }
    } else {
      // 不在移动时重置计时器
      this.footstepTimer = 0;
    }
    
    // 调用父类的 updateVisuals 方法
    if (!this.isMoving) { 
      if (this.sprite) this.sprite.update(dt, false);
      // 闪避动画衰减
      if (Math.abs(this.dodgeOffset.x) > 0.1) {
        this.dodgeOffset.x *= 0.8;
      } else {
        this.dodgeOffset.x = 0;
      }
      return; 
    }
    const dx = this.destX - this.visualX, dy = this.destY - this.visualY;
    const dist = Math.hypot(dx, dy);
    
    // Apply Frost Aura slow effect
    let effectiveMoveSpeed = this.moveSpeed;
    if (this.frostAuraSlowed) {
      effectiveMoveSpeed *= 0.7; // 30% slow = 70% speed
    }
    
    // ✅ FIX: 检查 SLOW 状态（史莱姆的 STICKY 特性）
    if (this.hasStatus('SLOW')) {
      const slowDef = STATUS_TYPES.SLOW;
      effectiveMoveSpeed *= (slowDef.speedMultiplier || 0.7);
    }
    
    // ✅ 不屈堡垒：移速-10%
    if (this.activeKeystones && Array.isArray(this.activeKeystones) && this.activeKeystones.includes('UNYIELDING_FORTRESS')) {
      effectiveMoveSpeed *= 0.9;
    }
    
    const step = effectiveMoveSpeed * dt;
    if (dist <= step) { 
      this.visualX = this.destX; 
      this.visualY = this.destY; 
      this.isMoving = false; 
    }
    else { 
      this.visualX += (dx/dist)*step; 
      this.visualY += (dy/dist)*step; 
    }
    if (this.sprite) this.sprite.update(dt, true);
    
    // 闪避动画衰减
    if (Math.abs(this.dodgeOffset.x) > 0.1) {
      this.dodgeOffset.x *= 0.8;
    } else {
      this.dodgeOffset.x = 0;
    }
  }
  
  getVisionRadius() {
    // Base vision radius
    let radius = 4;
    
    // Check if player has lantern equipped
    const accessory = this.getItemInstance(this.equipment.ACCESSORY);
    if (accessory && accessory.stats && accessory.stats.fovRadius) {
      radius += accessory.stats.fovRadius;
    }
    
    return radius;
  }
  
  /**
   * 获取当前装备武器的原型类型
   * @returns {string} 武器类型：'BLADE', 'EDGE', 'STAFF', 'SCYTHE', 或 'NONE'
   */
  getWeaponArchetype() {
    const weapon = this.getItemInstance(this.equipment.WEAPON);
    if (!weapon) return 'NONE';
    
    // ✅ FIX: 优先使用 meta.archetype（程序化生成装备的元数据）
    if (weapon.meta && weapon.meta.archetype) {
      const archetype = weapon.meta.archetype.toUpperCase();
      if (['BLADE', 'EDGE', 'STAFF', 'SCYTHE'].includes(archetype)) {
        return archetype;
      }
    }
    
    // 后备方案：使用 iconIndex（旧系统兼容）
    // 根据 iconIndex 映射到武器类型（参考 procgen.js 中的 ARCHETYPES）
    // 0: BLADE, 1: EDGE, 2: STAFF, 3: SCYTHE
    let iconIndex = weapon.iconIndex;
    
    // 如果实例没有 iconIndex，尝试从动态物品池或数据库查找
    if (iconIndex === undefined) {
      if (window.__dynamicItems && window.__dynamicItems instanceof Map) {
        const dynamicItem = window.__dynamicItems.get(weapon.uid || weapon.itemId);
        if (dynamicItem) iconIndex = dynamicItem.iconIndex;
      }
      
      // 如果还是没有，尝试从数据库查找
      if (iconIndex === undefined && weapon.itemId) {
        const dbDef = EQUIPMENT_DB[weapon.itemId];
        if (dbDef) iconIndex = dbDef.iconIndex;
      }
    }
    
    // 根据 iconIndex 映射到武器类型
    if (iconIndex === 0) return 'BLADE';
    if (iconIndex === 1) return 'EDGE';
    if (iconIndex === 2) return 'STAFF';
    if (iconIndex === 3) return 'SCYTHE';
    
    return 'NONE';
  }
  
  /**
   * 绘制连击UI（在玩家右侧显示垂直半椭圆弧）
   * @param {CanvasRenderingContext2D} ctx - Canvas 上下文
   * @param {number} camX - 相机X偏移
   * @param {number} camY - 相机Y偏移
   */
  drawComboUI(ctx, camX, camY) {
    const comboState = this.combatState;
    
    // Condition: Do NOT draw if comboCount === 0 or maxCombo === 0
    if (!comboState || comboState.comboCount === 0 || comboState.maxCombo === 0) return;
    
    // Position: Arc center at sprite center, arc extends to the right
    const centerX = this.visualX + TILE_SIZE / 2;
    const centerY = this.visualY + TILE_SIZE / 2;
    const radius = 24; // Distance from center
    const startAngle = -Math.PI / 4; // -45 degrees
    const endAngle = Math.PI / 4;    // +45 degrees
    const totalAngle = endAngle - startAngle;
    const gap = 0.1; // Gap between segments
    const segmentAngle = (totalAngle - (comboState.maxCombo - 1) * gap) / comboState.maxCombo;
    
    ctx.save();
    
    // Draw background: Thin, semi-transparent black arc
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    
    // Draw all segments as background
    for (let i = 0; i < comboState.maxCombo; i++) {
      const segmentStartAngle = startAngle + i * (segmentAngle + gap);
      const segmentEndAngle = segmentStartAngle + segmentAngle;
      
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, segmentStartAngle, segmentEndAngle);
      ctx.stroke();
    }
    
    // Draw foreground: White, glowing segments for current comboCount
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.shadowBlur = 4;
    ctx.shadowColor = '#ffffff';
    
    // Draw filled segments (only for current comboCount)
    for (let i = 0; i < comboState.comboCount; i++) {
      const segmentStartAngle = startAngle + i * (segmentAngle + gap);
      const segmentEndAngle = segmentStartAngle + segmentAngle;
      
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, segmentStartAngle, segmentEndAngle);
      ctx.stroke();
    }
    
    ctx.restore();
  }
  
  startMove(gx, gy) { this.x = gx; this.y = gy; this.destX = gx*TILE_SIZE; this.destY = gy*TILE_SIZE; this.isMoving = true; }
  startCombatSlide(monster) { this.pendingCombat = monster; this.destX = monster.visualX; this.destY = monster.visualY; this.isMoving = true; }
  cancelCombatSlide() { this.pendingCombat = null; this.destX = this.x*TILE_SIZE; this.destY = this.y*TILE_SIZE; this.isMoving = true; }
  
  activateBerserk() {
    if (this.buffs && this.buffs.berserk) {
      this.buffs.berserk.active = true;
      this.buffs.berserk.timer = 5000;  // 5 seconds
      this.buffs.berserk.stacks = 5;    // 5 guaranteed crits
      if (window.game && window.game.ui) {
        window.game.ui.logMessage('进入狂暴状态！', 'ultimate');
      }
    }
  }
  
  canUseActive() {
    return this.cooldowns && this.cooldowns.active <= 0;
  }
  
  /**
   * ✅ FIX: 清除所有技能预备状态（确保同一时间只有一个技能生效）
   */
  clearPrimedStates() {
    if (!this.states) this.states = {};
    this.states.slashPrimed = false;
    this.states.scorchPrimed = false;
    this.states.freezePrimed = false;
    this.states.activeElement = null;
    this.states.ultElement = null;
  }
  
  /**
   * ✅ FIX: 修复技能双重施法漏洞 - 在造成伤害后设置CD
   * @param {string} skillType - 'active' 或 'ult'
   * @param {number} cooldown - 冷却时间（毫秒）
   */
  startSkillCooldown(skillType, cooldown) {
    if (!this.cooldowns) this.cooldowns = { active: 0, ult: 0 };
    
    // ✅ 获取冷却缩减 (CDR)
    const totals = this.getTotalStats ? this.getTotalStats() : this.stats;
    const cdr = totals.cooldown_reduction || 0;
    // 限制 CDR 最大为 50%
    const effectiveCdr = Math.min(cdr, 0.5);
    const reducedCooldown = Math.floor(cooldown * (1 - effectiveCdr));
    
    if (skillType === 'active') {
      this.cooldowns.active = reducedCooldown;
    } else if (skillType === 'ult') {
      this.cooldowns.ult = reducedCooldown;
    }
  }
  
  castActiveSkill() {
    // Check if skill is on cooldown
    if (!this.canUseActive()) {
      if (window.game && window.game.ui) {
        window.game.ui.logMessage('主动技能冷却中...', 'info');
      }
      return false;
    }
    
    // ✅ FIX: 防止重复按键重置状态 - 如果技能已就绪但未打出，不允许再次按键
    if (this.states && (this.states.slashPrimed || this.states.scorchPrimed)) {
      // 技能已就绪，等待玩家攻击，不允许重复按键
      return false;
    }
    
    // ✅ FIX: 清除之前的技能预备状态，确保同一时间只有一个技能生效
    this.clearPrimedStates();
    
    // Character-specific active skill
    // ✅ FIX: 修复技能双重施法漏洞 - 不在施法时设置CD，而是在造成伤害后设置
    if (this.charConfig && this.charConfig.id === 'WARRIOR') {
      // Warrior: Slash - Physical damage, no element
      this.states.slashPrimed = true;
      this.states.activeElement = null; // 无元素
      // ✅ FIX: 移除立即设置CD的代码，改为在造成伤害后设置
      if (window.game && window.game.ui) {
        window.game.ui.logMessage('斩击准备就绪！下次攻击造成150%伤害。', 'ultimate');
        // [新增] 强制刷新 UI 以显示高亮框
        window.game.ui.updateStats(this);
      }
      if (window.game && window.game.floatingTextPool && window.game.settings && window.game.settings.showDamageNumbers !== false) {
        const readyText = window.game.floatingTextPool.create(this.visualX, this.visualY - 30, '已准备!', '#ffff00');
        window.game.floatingTexts.push(readyText);
      }
    } else if (this.charConfig && this.charConfig.id === 'MAGE') {
      // Mage: Scorch - PYRO element (Fire)
      this.states.scorchPrimed = true;
      this.states.activeElement = 'PYRO'; // 火元素
      // ✅ FIX: 移除立即设置CD的代码，改为在造成伤害后设置
      if (window.game && window.game.ui) {
        window.game.ui.logMessage('灼烧准备就绪！下次攻击附加火元素和灼烧状态。', 'ultimate');
        // [新增] 强制刷新 UI 以显示高亮框
        window.game.ui.updateStats(this);
      }
      if (window.game && window.game.floatingTextPool && window.game.settings && window.game.settings.showDamageNumbers !== false) {
        const scorchText = window.game.floatingTextPool.create(this.visualX, this.visualY - 30, '火球术!', '#ff6b6b');
        window.game.floatingTexts.push(scorchText);
      }
    }
    
    return true;
  }
  
  castUltimateSkill() {
    // ✅ FIX: 清除之前的技能预备状态，确保同一时间只有一个技能生效
    this.clearPrimedStates();
    
    // Character-specific ultimate skill
    if (this.charConfig && this.charConfig.id === 'MAGE') {
      // Mage: Glacial Tomb - CRYO element (Ice)
      this.states.freezePrimed = true;
      this.states.ultElement = 'CRYO'; // 冰元素
      // ✅ FIX: 移除立即设置CD的代码，改为在造成伤害后设置
      if (window.game && window.game.ui) {
        window.game.ui.logMessage('冰封陵墓准备就绪！下次攻击附加冰元素和冰封状态。', 'ultimate');
        // [新增] 强制刷新 UI 以显示高亮框
        window.game.ui.updateStats(this);
      }
      if (window.game && window.game.floatingTextPool && window.game.settings && window.game.settings.showDamageNumbers !== false) {
        const freezeText = window.game.floatingTextPool.create(this.visualX, this.visualY - 30, '冰墓术!', '#00bfff');
        window.game.floatingTexts.push(freezeText);
      }
      return true;
    } else if (this.charConfig && this.charConfig.id === 'WARRIOR') {
      // Warrior: Berserk - No element, physical buff
      // ✅ FIX: Berserk是立即生效的buff，不是预备技能，所以立即设置CD
      this.activateBerserk();
      this.cooldowns.ult = 20000;
      return true;
    }
    return false;
  }
  
  gainXp(amt) { 
    this.stats.xp += amt; 
    let leveled = false; 
    if (this.stats.xp >= this.stats.nextLevelXp) { 
      this.stats.lvl++; 
      this.stats.xp -= this.stats.nextLevelXp; 
      this.stats.nextLevelXp = Math.floor(this.stats.nextLevelXp * 1.5); 
      
      // 升级时提升属性
      this.stats.p_atk += 1;
      this.stats.m_atk += 1;
      this.stats.p_def += 1;
      this.stats.m_def += 1;
      this.stats.maxHp += 1;
      this.stats.hp = this.stats.maxHp; // 回满血（包含增加上限的效果）
      
      leveled = true;
      
      // 显示升级消息
      if (window.game && window.game.ui) {
        window.game.ui.logMessage('升级！全属性 +1', 'gain');
      }
    } 
    if (window.game && window.game.ui) window.game.ui.updateStats(this); 
    return leveled; 
  }
  heal(amt) { 
    const actualHeal = Math.min(this.stats.maxHp - this.stats.hp, amt);
    this.stats.hp += actualHeal; 
    if (window.game && window.game.ui) window.game.ui.updateStats(this);
    
    // 显示回血数字（如果设置开启）
    if (actualHeal > 0 && window.game && window.game.floatingTextPool && window.game.settings && window.game.settings.showDamageNumbers !== false) {
      const text = window.game.floatingTextPool.create(this.visualX, this.visualY - 20, `+${actualHeal}`, '#00ff88');
      window.game.floatingTexts.push(text);
    }
  }
  gainRage(amt) { 
    const beforeRage = this.stats.rage || 0;
    this.stats.rage = Math.min(100, beforeRage + amt);
    // const actualGain = this.stats.rage - beforeRage; // 不再需要计算实际增量用于显示
    if (window.game && window.game.ui) window.game.ui.updateStats(this);
    
    // 移除怒气飘字逻辑，保持画面整洁
  }
  takeDamage(amt) { 
    // ✅ 获取最终减伤属性
    const totals = this.getTotalStats ? this.getTotalStats() : this.stats;
    const dmgReduce = totals.final_dmg_reduce || 0;
    
    // 应用减伤 (上限 80%)
    const effectiveReduce = Math.min(dmgReduce, 0.8);
    const reducedAmt = Math.floor(amt * (1 - effectiveReduce));
    
    // 保证至少造成 1 点伤害（除非 amt 也是 0）
    const finalAmt = amt > 0 ? Math.max(1, reducedAmt) : 0;
    
    this.stats.hp -= finalAmt; 
    this.gainRage(5); 
    
    // Freeze breaks on damage
    if (this.hasStatus('FREEZE')) {
      this.removeStatus('FREEZE');
      if (window.game && window.game.ui) {
        window.game.ui.logMessage('冰封状态已解除！', 'info');
      }
    }
    
    if (window.game&&window.game.ui) window.game.ui.updateStats(this); 
    // 死亡时触发子弹时间阶段，而不是立即结束游戏
    // ✅ FIX: 更安全的检查，防止因为对象不存在而报错
    if (this.stats.hp <= 0 && window.game) {
      if (window.game.triggerDeathPhase && typeof window.game.triggerDeathPhase === 'function') {
        window.game.triggerDeathPhase();
      } else {
        // 降级方案：如果 triggerDeathPhase 不存在，直接结束游戏
        if (window.game.endGame && typeof window.game.endGame === 'function') {
          window.game.endGame(true);
        }
      }
    } 
  }

  // Use item in a specific inventory slot (consumables only)
  useItem(index) {
    if (index < 0 || index >= this.inventory.length) return false;
    const item = this.inventory[index];
    if (!item) return false;

    // 获取物品定义（兼容旧代码）
    let def = null;
    if (typeof item === 'string') {
      def = EQUIPMENT_DB[item];
    } else if (typeof item === 'object') {
      def = item;
      // 如果实例对象缺少某些属性,从数据库补充
      if (!def.name && def.itemId) {
        const dbDef = EQUIPMENT_DB[def.itemId];
        if (dbDef) {
          def = { ...dbDef, ...def }; // 合并,实例属性优先
        }
      }
    }

    if (!def) return false;
    const ui = window.game?.ui;

    if (def.type === 'CONSUMABLE') {
      const eff = def.effect || {};
      // 获取物品的中文名称，在 switch 之前声明，避免重复声明
      const itemName = def.nameZh || def.name;
      switch (eff.kind) {
        case 'heal':
          this.heal(eff.amount || 0);
          ui?.logMessage(`使用 ${itemName}，回复 ${eff.amount||0} HP`, 'gain');
          break;
        case 'rage':
          this.gainRage(eff.amount || 0);
          ui?.logMessage(`使用 ${itemName}，怒气 +${eff.amount||0}`, 'gain');
          break;
        case 'xp':
          this.gainXp(eff.amount || 0);
          ui?.logMessage(`使用 ${itemName}，获得 ${eff.amount||0} XP`, 'gain');
          break;
        case 'prime_state': {
          // 预充能状态：下一次成功攻击前先触发额外效果，不在这里直接造成伤害
          if (!this.states) this.states = {};
          if (eff.state) {
            this.states[eff.state] = true;
          }
          // 可选：记录配置，方便将来扩展为多种预充能物品
          if (!this.states._primedEffects) this.states._primedEffects = {};
          if (eff.state) {
            this.states._primedEffects[eff.state] = {
              damage: eff.damage || 0,
              status: eff.status || null
            };
          }
          ui?.logMessage('火焰卷轴已激活：下一次攻击附带火焰伤害与灼烧。', 'gain');
          break;
        }
        default:
          break;
      }
      this.removeFromInventory(index);
      ui?.updateStats(this);
      ui?.renderInventory?.(this);
      return true;
    }
    return false;
  }
  
  /**
   * 添加遗物
   * @param {string} relicId - 遗物ID
   */
  addRelic(relicId) {
    // 避免循环依赖，动态导入
    import('./data/artifacts.js').then(({ ARTIFACTS }) => {
      const relic = ARTIFACTS[relicId];
      if (!relic) return;
      
      if (!this.relics.has(relicId)) {
        this.relics.set(relicId, relic);
        
        // ✅ FIX: 执行 onObtain hook（如果存在）
        if (relic.hooks && relic.hooks.onObtain) {
          try {
            relic.hooks.onObtain(this, relic);
          } catch (err) {
            console.error(`[Player] 执行遗物 ${relic.id} 的 onObtain hook 时出错:`, err);
          }
        }
        
        if (window.game && window.game.ui) {
          window.game.ui.logMessage(`获得了遗物: ${relic.name}`, 'gain');
          // ✅ FIX: 通过 UIManager 的 updateRelicBar 方法更新 UI
          if (window.game.ui.updateRelicBar) {
            window.game.ui.updateRelicBar(this.relics);
          }
          // ✅ FIX: 更新属性显示（如果遗物有属性加成）
          window.game.ui.updateStats(this);
        }
      }
    });
  }
  
  /**
   * 检查是否拥有指定遗物
   * @param {string} relicId - 遗物ID
   * @returns {boolean}
   */
  hasRelic(relicId) {
    return this.relics.has(relicId);
  }
  
  /**
   * 获取所有遗物
   * @returns {Array} 遗物数组
   */
  getRelics() {
    return Array.from(this.relics.values());
  }
}

/**
 * 堕落冒险者（Ghost）- 继承自 Monster
 * 使用已死亡玩家的数据生成，作为特殊怪物出现
 */
export class FallenAdventurer extends Monster {
  constructor(ghostData, x, y, loader, TILE, floor = 1, ascensionLevel = 1) {
    // 使用 'FALLEN_ADVENTURER' 作为类型，但需要自定义属性
    super('SLIME', x, y, loader, 1, TILE, floor, ascensionLevel); // 使用 SLIME 作为基础类型，后续会覆盖属性
    
    this.type = 'FALLEN_ADVENTURER';
    this.ghostData = ghostData;
    this.originalStats = JSON.parse(JSON.stringify(ghostData.stats || {}));
    this.originalUserId = ghostData.user_id || null;
    this.originalCharId = ghostData.char_id || 'WARRIOR';
    this.nickname = ghostData.nickname || '未知冒险者';
    
    // 设置名字
    this.displayName = `堕落的 ${this.nickname}`;
    
    // ✅ 修复：死去的玩家使用玩家素材(序列帧)，而非静态幽灵图
    // FallenAdventurer 已经有 isFallenAdventurer = true 标记，
    // MapSystem 会自动对其应用黑白+半透明滤镜，所以不需要在这里做特殊处理
    this.sprite = new Sprite({ 
      assetKey: 'PLAYER',  // 使用玩家素材
      loader, 
      destHeight: 56, 
      animationType: 'player' // 使用玩家动画逻辑(支持序列帧)
    });
    
    // 数值平衡：基于原始属性
    const originalStats = this.originalStats;
    const originalMaxHp = originalStats.maxHp || originalStats.hp || 100;
    const originalPAtk = originalStats.p_atk || 0;
    const originalMAtk = originalStats.m_atk || 0;
    const originalDef = originalStats.p_def || originalStats.m_def || 0;
    
    // 重新计算属性（基于原始属性，应用平衡系数）
    this.stats.hp = Math.floor(originalMaxHp * 3); // HP = 原始 * 3
    this.stats.maxHp = this.stats.hp;
    
    // 攻击力 = 原始 * 0.8（削弱）
    this.stats.p_atk = Math.floor(originalPAtk * 0.8);
    this.stats.m_atk = Math.floor(originalMAtk * 0.8);
    
    // 防御保持不变
    this.stats.p_def = originalStats.p_def || 0;
    this.stats.m_def = originalStats.m_def || 0;
    
    // 设置基础属性（用于掉落计算）
    this.stats.goldYield = 0; // Ghost 不掉落金币
    this.stats.xpYield = 0; // Ghost 不掉落经验
    
    // 设置移动速度和攻击速度（使用基础值）
    this.moveSpeed = 0.12;
    this.base_as = 1.0;
    this.baseAttackCooldown = 1000;
    this.lastAttackTime = 0;
    
    // 战斗状态
    this.inCombat = false;
    this.lastDamageTime = 0;
    this.combatTimeout = 8000;
    this.battleTimer = 0;
    this.enrageStacks = 0;
    
    // 标记为特殊类型
    this.isFallenAdventurer = true;
  }
  
  /**
   * 获取掉落物品（重写 Monster 的掉落逻辑）
   * @param {string} currentPlayerId - 当前玩家ID（从 localStorage 获取）
   * @returns {Object} 掉落数据 { isSelf: boolean, crystal: number, equipment: Object|null, statBonus: Object|null }
   */
  getDrop(currentPlayerId) {
    const game = window.game;
    
    // 判断是否是自己的尸体
    const isSelf = this.originalUserId === currentPlayerId;
    
    if (isSelf) {
      // 自己的尸体：掉落少量灵魂水晶
      const crystalAmount = 2 + Math.floor(Math.random() * 2); // 2-3个
      
      if (game && game.metaSaveSystem) {
        game.metaSaveSystem.addSoulCrystals(crystalAmount);
      }
      
      return {
        isSelf: true,
        crystal: crystalAmount
      };
    } else {
      // 他人的尸体：正常掉落
      const crystalAmount = 5 + Math.floor(Math.random() * 5); // 5-9个
      
      if (game && game.metaSaveSystem) {
        game.metaSaveSystem.addSoulCrystals(crystalAmount);
      }
      
      // 装备掉落：30% 概率随机选取一件身上的装备
      let droppedEquipment = null;
      const equipment = this.ghostData.equipment || {};
      const equipmentSlots = ['WEAPON', 'ARMOR', 'HELM', 'BOOTS', 'RING', 'AMULET', 'ACCESSORY'];
      const equippedItems = equipmentSlots.filter(slot => equipment[slot] !== null && equipment[slot] !== undefined);
      
      if (equippedItems.length > 0 && Math.random() < 0.3) {
        const randomSlot = equippedItems[Math.floor(Math.random() * equippedItems.length)];
        const itemData = equipment[randomSlot];
        
        if (itemData) {
          // 创建新的装备实例，清除 uid 生成新的
          if (typeof itemData === 'object' && itemData.itemId) {
            // 使用 createStandardizedItem 创建新实例
            const newItem = createStandardizedItem(itemData.itemId, {
              level: itemData.meta?.level || itemData.level || 1,
              affixes: itemData.meta?.affixes || itemData.affixes || [],
              uniqueEffect: itemData.meta?.uniqueEffect || itemData.uniqueEffect || null,
              setId: itemData.meta?.setId || itemData.setId || null
            });
            
            if (newItem) {
              droppedEquipment = newItem;
            }
          } else if (typeof itemData === 'string') {
            // 如果是字符串ID，直接创建
            const newItem = createStandardizedItem(itemData, {
              level: 1,
              affixes: [],
              uniqueEffect: null,
              setId: null
            });
            
            if (newItem) {
              droppedEquipment = newItem;
            }
          }
        }
      }
      
      // 属性掠夺：随机选取一项原始属性，计算其 7% 的值
      const statKeys = ['maxHp', 'p_atk', 'm_atk', 'p_def', 'm_def'];
      const availableStats = statKeys.filter(key => {
        const value = this.originalStats[key] || this.originalStats[key === 'maxHp' ? 'hp' : key];
        return value && value > 0;
      });
      
      let statBonus = null;
      if (availableStats.length > 0) {
        const randomStatKey = availableStats[Math.floor(Math.random() * availableStats.length)];
        const originalValue = this.originalStats[randomStatKey] || this.originalStats[randomStatKey === 'maxHp' ? 'hp' : randomStatKey] || 0;
        const bonusValue = Math.floor(originalValue * 0.07); // 7%
        
        if (bonusValue > 0) {
          statBonus = {
            key: randomStatKey,
            value: bonusValue
          };
        }
      }
      
      return {
        isSelf: false,
        crystal: crystalAmount,
        equipment: droppedEquipment,
        statBonus: statBonus
      };
    }
  }
}
