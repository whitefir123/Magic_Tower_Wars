// Items Database - 物品数据库

/**
 * 生成唯一标识符
 * @returns {string} 唯一ID
 */
function generateUID() {
  return `unique_id_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 标准化物品对象包装函数 (v2.0)
 * 将任何物品定义包装成标准对象实例，确保包含所有必需字段
 * @param {Object|string} itemDef - 物品定义（可以是 EQUIPMENT_DB 中的对象或 ID 字符串）
 * @param {Object} options - 额外选项
 * @param {number} options.level - 物品等级（默认 1）
 * @param {Array} options.affixes - 词缀数组（默认 []）
 * @param {string} options.uniqueEffect - 传奇特效（默认 null）
 * @param {string} options.setId - 套装ID（默认 null）
 * @returns {Object} 标准化的物品对象实例
 */
export function createStandardizedItem(itemDef, options = {}) {
  // 如果传入的是字符串ID，从数据库获取定义
  if (typeof itemDef === 'string') {
    itemDef = EQUIPMENT_DB[itemDef];
    if (!itemDef) {
      console.warn(`[createStandardizedItem] 未找到物品定义: ${itemDef}`);
      return null;
    }
  }
  
  if (!itemDef || typeof itemDef !== 'object') {
    console.warn('[createStandardizedItem] 无效的物品定义');
    return null;
  }
  
  const {
    level = 1,
    affixes = [],
    uniqueEffect = null,
    setId = null,
    sockets = null // 从 options 中获取 sockets
  } = options;
  
  // 生成唯一ID
  const uid = generateUID();
  
  // 获取原始模板ID
  const id = itemDef.id || itemDef.itemId || uid;
  
  // ✅ 宝石镶嵌系统：保留 sockets（优先从 options，其次从 itemDef.meta，最后为空数组）
  const preservedSockets = sockets !== null 
    ? sockets 
    : (itemDef.meta?.sockets || (itemDef.sockets !== undefined ? itemDef.sockets : []));
  
  // 确保 sockets 是数组
  const finalSockets = Array.isArray(preservedSockets) ? preservedSockets : [];
  
  // 构建 meta 对象
  const meta = {
    level,
    affixes: Array.isArray(affixes) ? affixes : [],
    uniqueEffect,
    setId,
    sockets: finalSockets // ✅ 宝石镶嵌系统：确保 sockets 被保留
  };
  
  // 获取基础属性（优先使用 stats，如果没有则使用空对象）
  const baseStats = itemDef.stats ? { ...itemDef.stats } : {};
  
  // 构建标准化的物品对象
  const standardizedItem = {
    uid,
    id, // 原始模板ID
    name: itemDef.name || '',
    nameZh: itemDef.nameZh || itemDef.name || '',
    type: itemDef.type || 'UNKNOWN',
    tier: itemDef.tier || 1,
    rarity: itemDef.rarity || itemDef.quality || 'COMMON',
    quality: itemDef.quality || itemDef.rarity || 'COMMON',
    iconIndex: itemDef.iconIndex !== undefined ? itemDef.iconIndex : 0,
    stats: { ...baseStats }, // 扁平化的当前属性对象
    meta, // 元数据
    // 保留其他可能存在的属性（如 description, dropWeight 等）
    ...Object.fromEntries(
      Object.entries(itemDef).filter(([key]) => 
        !['id', 'itemId', 'uid', 'stats', 'meta'].includes(key)
      )
    )
  };
  
  // 如果原物品有 baseStats，保留它
  if (itemDef.baseStats) {
    standardizedItem.baseStats = { ...itemDef.baseStats };
  } else if (itemDef.stats) {
    // 如果没有 baseStats，使用 stats 作为 baseStats
    standardizedItem.baseStats = { ...itemDef.stats };
  }
  
  // 如果原物品有 enhanceLevel，保留它
  if (itemDef.enhanceLevel !== undefined) {
    standardizedItem.enhanceLevel = itemDef.enhanceLevel;
  }
  
  // 兼容旧系统的 itemId 字段
  standardizedItem.itemId = id;
  
  return standardizedItem;
}

// 品质倍率与名称映射（用于消耗品动态生成）
const CONSUMABLE_QUALITY_MULTIPLIERS = {
  COMMON: 1.0,
  UNCOMMON: 1.2,
  RARE: 1.5,
  EPIC: 2.5,
  LEGENDARY: 5.0,
  MYTHIC: 10.0
};

const CONSUMABLE_QUALITY_LABELS = {
  COMMON: { en: 'Common', zh: '普通' },
  UNCOMMON: { en: 'Uncommon', zh: '优秀' },
  RARE: { en: 'Rare', zh: '稀有' },
  EPIC: { en: 'Epic', zh: '史诗' },
  LEGENDARY: { en: 'Legendary', zh: '传说' },
  MYTHIC: { en: 'Mythic', zh: '神话' }
};

/**
 * 动态消耗品工厂函数
 * 基于品质倍率放大数值，并初始化堆叠属性
 * @param {Object} itemDef - 消耗品基础定义（来自 EQUIPMENT_DB）
 * @param {string} quality - 品质枚举：COMMON/RARE/EPIC/LEGENDARY/MYTHIC
 * @returns {Object|null} 动态消耗品实例
 */
export function createDynamicConsumable(itemDef, quality = 'COMMON') {
  if (!itemDef) return null;

  // 防御性处理：兼容传入字符串 ID
  if (typeof itemDef === 'string') {
    itemDef = EQUIPMENT_DB[itemDef];
    if (!itemDef) {
      console.warn('[createDynamicConsumable] 未找到物品定义:', itemDef);
      return null;
    }
  }

  if (itemDef.type !== 'CONSUMABLE') {
    console.warn('[createDynamicConsumable] 非消耗品类型，忽略:', itemDef.id || itemDef.itemId);
    return null;
  }

  const qKey = (quality || itemDef.quality || itemDef.rarity || 'COMMON').toUpperCase();
  const mult = CONSUMABLE_QUALITY_MULTIPLIERS[qKey] ?? CONSUMABLE_QUALITY_MULTIPLIERS.COMMON;
  const labels = CONSUMABLE_QUALITY_LABELS[qKey] || CONSUMABLE_QUALITY_LABELS.COMMON;

  // 深拷贝效果对象，避免污染静态定义
  let effect = null;
  if (itemDef.effect && typeof itemDef.effect === 'object') {
    effect = { ...itemDef.effect };

    // 数值字段按倍率缩放（向下取整）
    if (typeof effect.amount === 'number') {
      effect.amount = Math.floor(effect.amount * mult);
    }
    if (typeof effect.damage === 'number') {
      effect.damage = Math.floor(effect.damage * mult);
    }
  }

  const baseName = itemDef.name || '';
  const baseNameZh = itemDef.nameZh || baseName;

  const displayName = `${labels.en} · ${baseName}`;
  const displayNameZh = `${labels.zh} · ${baseNameZh}`;

  // 生成针对这一“堆”的唯一 UID
  const uid = generateUID();
  const templateId = itemDef.id || itemDef.itemId || 'CONSUMABLE_DYNAMIC';

  const instance = {
    // 标识
    uid,
    id: templateId,
    itemId: templateId,

    // 显示
    name: displayName,
    nameZh: displayNameZh,

    // 基本数据
    type: 'CONSUMABLE',
    rarity: qKey,
    quality: qKey,
    iconIndex: itemDef.iconIndex ?? 0,

    // 效果（已按品质缩放）
    effect,

    // 堆叠属性
    count: 1,
    maxStack: 99,

    // 兼容字段（保留原有描述等）
    desc: itemDef.desc,
    descZh: itemDef.descZh,

    // 标记为动态消耗品，方便调试与序列化策略
    isDynamicConsumable: true
  };

  return instance;
}

// Equipment + Consumables DB
export const EQUIPMENT_DB = {
  // ========== WEAPONS (第1行) ==========
  // 0: 生锈剑/铁剑(物理)
  WEAPON_IRON_T1: { 
    id: 'WEAPON_IRON_T1', 
    name: 'Rusty Sword', 
    nameZh: '生锈铁剑', 
    type: 'WEAPON', 
    tier: 1, 
    rarity: 'COMMON', 
    stats: { p_atk: 3 }, 
    iconIndex: 0,
    dropWeight: 100
  },
  WEAPON_IRON_T2: { 
    id: 'WEAPON_IRON_T2', 
    name: 'Iron Sword', 
    nameZh: '精钢剑', 
    type: 'WEAPON', 
    tier: 2, 
    rarity: 'RARE', 
    stats: { p_atk: 7 }, 
    iconIndex: 0,
    dropWeight: 50
  },
  WEAPON_IRON_T3: { 
    id: 'WEAPON_IRON_T3', 
    name: 'Masterwork Blade', 
    nameZh: '勇者之剑', 
    type: 'WEAPON', 
    tier: 3, 
    rarity: 'EPIC', 
    stats: { p_atk: 12 }, 
    iconIndex: 0,
    dropWeight: 10
  },
  
  // 1: 黄金剑(暴击)
  WEAPON_GOLDEN_T1: { 
    id: 'WEAPON_GOLDEN_T1', 
    name: 'Bronze Blade', 
    nameZh: '青铜之刃', 
    type: 'WEAPON', 
    tier: 1, 
    rarity: 'COMMON', 
    stats: { p_atk: 2, crit_rate: 0.05 }, 
    iconIndex: 1,
    dropWeight: 100
  },
  WEAPON_GOLDEN_T2: { 
    id: 'WEAPON_GOLDEN_T2', 
    name: 'Golden Sword', 
    nameZh: '黄金之刃', 
    type: 'WEAPON', 
    tier: 2, 
    rarity: 'RARE', 
    stats: { p_atk: 5, crit_rate: 0.10 }, 
    iconIndex: 1,
    dropWeight: 50
  },
  WEAPON_GOLDEN_T3: { 
    id: 'WEAPON_GOLDEN_T3', 
    name: 'Excalibur', 
    nameZh: '王者之剑', 
    type: 'WEAPON', 
    tier: 3, 
    rarity: 'LEGENDARY', 
    stats: { p_atk: 9, crit_rate: 0.20 }, 
    iconIndex: 1,
    dropWeight: 10
  },
  
  // 2: 法杖(魔法)
  WEAPON_STAFF_T1: { 
    id: 'WEAPON_STAFF_T1', 
    name: 'Wooden Staff', 
    nameZh: '木制法杖', 
    type: 'WEAPON', 
    tier: 1, 
    rarity: 'COMMON', 
    stats: { m_atk: 3 }, 
    iconIndex: 2,
    dropWeight: 100
  },
  WEAPON_STAFF_T2: { 
    id: 'WEAPON_STAFF_T2', 
    name: 'Mage Staff', 
    nameZh: '法师法杖', 
    type: 'WEAPON', 
    tier: 2, 
    rarity: 'RARE', 
    stats: { m_atk: 7 }, 
    iconIndex: 2,
    dropWeight: 50
  },
  WEAPON_STAFF_T3: { 
    id: 'WEAPON_STAFF_T3', 
    name: 'Archmage Staff', 
    nameZh: '大法师之杖', 
    type: 'WEAPON', 
    tier: 3, 
    rarity: 'EPIC', 
    stats: { m_atk: 12 }, 
    iconIndex: 2,
    dropWeight: 10
  },
  
  // 3: 镰刀(穿透/混伤)
  WEAPON_SICKLE_T1: { 
    id: 'WEAPON_SICKLE_T1', 
    name: 'Rusty Sickle', 
    nameZh: '生锈镰刀', 
    type: 'WEAPON', 
    tier: 1, 
    rarity: 'COMMON', 
    stats: { p_atk: 2, m_atk: 1, armor_pen: 0.05 }, 
    iconIndex: 3,
    dropWeight: 100
  },
  WEAPON_SICKLE_T2: { 
    id: 'WEAPON_SICKLE_T2', 
    name: 'Reaper Sickle', 
    nameZh: '收割者镰刀', 
    type: 'WEAPON', 
    tier: 2, 
    rarity: 'RARE', 
    stats: { p_atk: 4, m_atk: 3, armor_pen: 0.10 }, 
    iconIndex: 3,
    dropWeight: 50
  },
  WEAPON_SICKLE_T3: { 
    id: 'WEAPON_SICKLE_T3', 
    name: 'Death Scythe', 
    nameZh: '死神之镰', 
    type: 'WEAPON', 
    tier: 3, 
    rarity: 'LEGENDARY', 
    stats: { p_atk: 7, m_atk: 6, armor_pen: 0.20 }, 
    iconIndex: 3,
    dropWeight: 10
  },

  // ========== ARMOR (第2行) ==========
  // 4: 皮甲(闪避)
  ARMOR_LEATHER_T1: { 
    id: 'ARMOR_LEATHER_T1', 
    name: 'Leather Armor', 
    nameZh: '皮甲', 
    type: 'ARMOR', 
    tier: 1, 
    rarity: 'COMMON', 
    stats: { p_def: 2, dodge: 0.05 }, 
    iconIndex: 4,
    dropWeight: 100
  },
  ARMOR_LEATHER_T2: { 
    id: 'ARMOR_LEATHER_T2', 
    name: 'Reinforced Leather', 
    nameZh: '强化皮甲', 
    type: 'ARMOR', 
    tier: 2, 
    rarity: 'RARE', 
    stats: { p_def: 5, dodge: 0.10 }, 
    iconIndex: 4,
    dropWeight: 50
  },
  ARMOR_LEATHER_T3: { 
    id: 'ARMOR_LEATHER_T3', 
    name: 'Shadow Leather', 
    nameZh: '暗影皮甲', 
    type: 'ARMOR', 
    tier: 3, 
    rarity: 'EPIC', 
    stats: { p_def: 8, dodge: 0.15 }, 
    iconIndex: 4,
    dropWeight: 10
  },
  
  // 5: 锁子甲(生命)
  ARMOR_CHAIN_T1: { 
    id: 'ARMOR_CHAIN_T1', 
    name: 'Chain Mail', 
    nameZh: '锁子甲', 
    type: 'ARMOR', 
    tier: 1, 
    rarity: 'COMMON', 
    stats: { p_def: 3, maxHp: 20 }, 
    iconIndex: 5,
    dropWeight: 100
  },
  ARMOR_CHAIN_T2: { 
    id: 'ARMOR_CHAIN_T2', 
    name: 'Heavy Chain', 
    nameZh: '重装锁甲', 
    type: 'ARMOR', 
    tier: 2, 
    rarity: 'RARE', 
    stats: { p_def: 6, maxHp: 50 }, 
    iconIndex: 5,
    dropWeight: 50
  },
  ARMOR_CHAIN_T3: { 
    id: 'ARMOR_CHAIN_T3', 
    name: 'Titan Chain', 
    nameZh: '泰坦锁甲', 
    type: 'ARMOR', 
    tier: 3, 
    rarity: 'LEGENDARY', 
    stats: { p_def: 10, maxHp: 100 }, 
    iconIndex: 5,
    dropWeight: 10
  },
  
  // 6: 黑曜石甲(纯防)
  ARMOR_OBSIDIAN_T1: { 
    id: 'ARMOR_OBSIDIAN_T1', 
    name: 'Iron Plate', 
    nameZh: '铁板甲', 
    type: 'ARMOR', 
    tier: 1, 
    rarity: 'COMMON', 
    stats: { p_def: 4 }, 
    iconIndex: 6,
    dropWeight: 100
  },
  ARMOR_OBSIDIAN_T2: { 
    id: 'ARMOR_OBSIDIAN_T2', 
    name: 'Steel Plate', 
    nameZh: '钢制板甲', 
    type: 'ARMOR', 
    tier: 2, 
    rarity: 'RARE', 
    stats: { p_def: 8 }, 
    iconIndex: 6,
    dropWeight: 50
  },
  ARMOR_OBSIDIAN_T3: { 
    id: 'ARMOR_OBSIDIAN_T3', 
    name: 'Obsidian Mail', 
    nameZh: '黑曜石护甲', 
    type: 'ARMOR', 
    tier: 3, 
    rarity: 'LEGENDARY', 
    stats: { p_def: 12 }, 
    iconIndex: 6,
    dropWeight: 10
  },
  
  // 7: 法袍(魔攻)
  ARMOR_ROBE_T1: { 
    id: 'ARMOR_ROBE_T1', 
    name: 'Apprentice Robe', 
    nameZh: '学徒法袍', 
    type: 'ARMOR', 
    tier: 1, 
    rarity: 'COMMON', 
    stats: { p_def: 1, m_atk: 2 }, 
    iconIndex: 7,
    dropWeight: 100
  },
  ARMOR_ROBE_T2: { 
    id: 'ARMOR_ROBE_T2', 
    name: 'Mage Robe', 
    nameZh: '法师法袍', 
    type: 'ARMOR', 
    tier: 2, 
    rarity: 'RARE', 
    stats: { p_def: 3, m_atk: 5 }, 
    iconIndex: 7,
    dropWeight: 50
  },
  ARMOR_ROBE_T3: { 
    id: 'ARMOR_ROBE_T3', 
    name: 'Archmage Robe', 
    nameZh: '大法师法袍', 
    type: 'ARMOR', 
    tier: 3, 
    rarity: 'EPIC', 
    stats: { p_def: 5, m_atk: 9 }, 
    iconIndex: 7,
    dropWeight: 10
  },

  // ========== HELM (第3行) ==========
  // 8: 铁盔(防)
  HELM_IRON_T1: { 
    id: 'HELM_IRON_T1', 
    name: 'Iron Helm', 
    nameZh: '铁盔', 
    type: 'HELM', 
    tier: 1, 
    rarity: 'COMMON', 
    stats: { p_def: 2 }, 
    iconIndex: 8,
    dropWeight: 100
  },
  HELM_IRON_T2: { 
    id: 'HELM_IRON_T2', 
    name: 'Steel Helm', 
    nameZh: '钢盔', 
    type: 'HELM', 
    tier: 2, 
    rarity: 'RARE', 
    stats: { p_def: 4 }, 
    iconIndex: 8,
    dropWeight: 50
  },
  HELM_IRON_T3: { 
    id: 'HELM_IRON_T3', 
    name: 'Titan Helm', 
    nameZh: '泰坦头盔', 
    type: 'HELM', 
    tier: 3, 
    rarity: 'EPIC', 
    stats: { p_def: 6 }, 
    iconIndex: 8,
    dropWeight: 10
  },
  
  // 9: 皇冠(金币/魔)
  HELM_CROWN_T1: { 
    id: 'HELM_CROWN_T1', 
    name: 'Bronze Crown', 
    nameZh: '青铜皇冠', 
    type: 'HELM', 
    tier: 1, 
    rarity: 'COMMON', 
    stats: { p_def: 1, gold: 0.10 }, 
    iconIndex: 9,
    dropWeight: 100
  },
  HELM_CROWN_T2: { 
    id: 'HELM_CROWN_T2', 
    name: 'Golden Crown', 
    nameZh: '黄金皇冠', 
    type: 'HELM', 
    tier: 2, 
    rarity: 'RARE', 
    stats: { p_def: 2, gold: 0.20, maxMp: 20 }, 
    iconIndex: 9,
    dropWeight: 50
  },
  HELM_CROWN_T3: { 
    id: 'HELM_CROWN_T3', 
    name: 'Royal Crown', 
    nameZh: '王者皇冠', 
    type: 'HELM', 
    tier: 3, 
    rarity: 'LEGENDARY', 
    stats: { p_def: 3, gold: 0.30, maxMp: 50 }, 
    iconIndex: 9,
    dropWeight: 10
  },

  // ========== BOOTS (第3行) ==========
  // 10: 布鞋(闪避)
  BOOTS_CLOTH_T1: { 
    id: 'BOOTS_CLOTH_T1', 
    name: 'Cloth Boots', 
    nameZh: '布鞋', 
    type: 'BOOTS', 
    tier: 1, 
    rarity: 'COMMON', 
    stats: { p_def: 1, dodge: 0.05 }, 
    iconIndex: 10,
    dropWeight: 100
  },
  BOOTS_CLOTH_T2: { 
    id: 'BOOTS_CLOTH_T2', 
    name: 'Light Boots', 
    nameZh: '轻便靴', 
    type: 'BOOTS', 
    tier: 2, 
    rarity: 'RARE', 
    stats: { p_def: 2, dodge: 0.10 }, 
    iconIndex: 10,
    dropWeight: 50
  },
  BOOTS_CLOTH_T3: { 
    id: 'BOOTS_CLOTH_T3', 
    name: 'Shadow Boots', 
    nameZh: '暗影之靴', 
    type: 'BOOTS', 
    tier: 3, 
    rarity: 'EPIC', 
    stats: { p_def: 3, dodge: 0.15 }, 
    iconIndex: 10,
    dropWeight: 10
  },
  
  // 11: 铁靴(防)
  BOOTS_IRON_T1: { 
    id: 'BOOTS_IRON_T1', 
    name: 'Iron Boots', 
    nameZh: '铁靴', 
    type: 'BOOTS', 
    tier: 1, 
    rarity: 'COMMON', 
    stats: { p_def: 2 }, 
    iconIndex: 11,
    dropWeight: 100
  },
  BOOTS_IRON_T2: { 
    id: 'BOOTS_IRON_T2', 
    name: 'Steel Boots', 
    nameZh: '钢靴', 
    type: 'BOOTS', 
    tier: 2, 
    rarity: 'RARE', 
    stats: { p_def: 4 }, 
    iconIndex: 11,
    dropWeight: 50
  },
  BOOTS_IRON_T3: { 
    id: 'BOOTS_IRON_T3', 
    name: 'Titan Boots', 
    nameZh: '泰坦之靴', 
    type: 'BOOTS', 
    tier: 3, 
    rarity: 'EPIC', 
    stats: { p_def: 6 }, 
    iconIndex: 11,
    dropWeight: 10
  },

  // ========== RING (第4行) ==========
  // 12: 手镯(戒指-物攻)
  RING_BRACELET_T1: { 
    id: 'RING_BRACELET_T1', 
    name: 'Bronze Bracelet', 
    nameZh: '青铜手镯', 
    type: 'RING', 
    tier: 1, 
    rarity: 'COMMON', 
    stats: { p_atk: 2 }, 
    iconIndex: 12,
    dropWeight: 100
  },
  RING_BRACELET_T2: { 
    id: 'RING_BRACELET_T2', 
    name: 'Iron Bracelet', 
    nameZh: '铁制手镯', 
    type: 'RING', 
    tier: 2, 
    rarity: 'RARE', 
    stats: { p_atk: 5 }, 
    iconIndex: 12,
    dropWeight: 50
  },
  RING_BRACELET_T3: { 
    id: 'RING_BRACELET_T3', 
    name: 'Warrior Bracelet', 
    nameZh: '战士手镯', 
    type: 'RING', 
    tier: 3, 
    rarity: 'EPIC', 
    stats: { p_atk: 8 }, 
    iconIndex: 12,
    dropWeight: 10
  },
  
  // 15: 绿宝石(戒指-魔攻)
  RING_EMERALD_T1: { 
    id: 'RING_EMERALD_T1', 
    name: 'Copper Ring', 
    nameZh: '铜戒指', 
    type: 'RING', 
    tier: 1, 
    rarity: 'COMMON', 
    stats: { m_atk: 2 }, 
    iconIndex: 15,
    dropWeight: 100
  },
  RING_EMERALD_T2: { 
    id: 'RING_EMERALD_T2', 
    name: 'Emerald Ring', 
    nameZh: '绿宝石戒指', 
    type: 'RING', 
    tier: 2, 
    rarity: 'RARE', 
    stats: { m_atk: 5 }, 
    iconIndex: 15,
    dropWeight: 50
  },
  RING_EMERALD_T3: { 
    id: 'RING_EMERALD_T3', 
    name: 'Archmage Ring', 
    nameZh: '大法师戒指', 
    type: 'RING', 
    tier: 3, 
    rarity: 'LEGENDARY', 
    stats: { m_atk: 8 }, 
    iconIndex: 15,
    dropWeight: 10
  },

  // ========== AMULET (第4行) ==========
  // 13: 红宝石(项链-生命)
  AMULET_RUBY_T1: { 
    id: 'AMULET_RUBY_T1', 
    name: 'Copper Amulet', 
    nameZh: '铜制护符', 
    type: 'AMULET', 
    tier: 1, 
    rarity: 'COMMON', 
    stats: { maxHp: 15 }, 
    iconIndex: 13,
    dropWeight: 100
  },
  AMULET_RUBY_T2: { 
    id: 'AMULET_RUBY_T2', 
    name: 'Ruby Amulet', 
    nameZh: '红宝石护符', 
    type: 'AMULET', 
    tier: 2, 
    rarity: 'RARE', 
    stats: { maxHp: 40 }, 
    iconIndex: 13,
    dropWeight: 50
  },
  AMULET_RUBY_T3: { 
    id: 'AMULET_RUBY_T3', 
    name: 'Life Amulet', 
    nameZh: '生命护符', 
    type: 'AMULET', 
    tier: 3, 
    rarity: 'EPIC', 
    stats: { maxHp: 80 }, 
    iconIndex: 13,
    dropWeight: 10
  },
  
  // 14: 骨头(项链-特殊)
  AMULET_BONE_T1: { 
    id: 'AMULET_BONE_T1', 
    name: 'Bone Pendant', 
    nameZh: '骨制吊坠', 
    type: 'AMULET', 
    tier: 1, 
    rarity: 'COMMON', 
    stats: { p_atk: 1, m_atk: 1 }, 
    iconIndex: 14,
    dropWeight: 100
  },
  AMULET_BONE_T2: { 
    id: 'AMULET_BONE_T2', 
    name: 'Ancient Bone', 
    nameZh: '远古之骨', 
    type: 'AMULET', 
    tier: 2, 
    rarity: 'RARE', 
    stats: { p_atk: 3, m_atk: 3 }, 
    iconIndex: 14,
    dropWeight: 50
  },
  AMULET_BONE_T3: { 
    id: 'AMULET_BONE_T3', 
    name: 'Phylactery', 
    nameZh: '命匣', 
    type: 'AMULET', 
    tier: 3, 
    rarity: 'LEGENDARY', 
    stats: { p_atk: 5, m_atk: 5 }, 
    iconIndex: 14,
    dropWeight: 10
  },
  
  // ACCESSORIES (保留原有)
  LANTERN: { 
    id: 'LANTERN', 
    name: 'Enchanted Lantern', 
    nameZh: '魔法灯笼', 
    type: 'ACCESSORY', 
    tier: 2, 
    rarity: 'RARE', 
    stats: { fovRadius: 2 }, 
    iconIndex: 3, 
    desc: '增加视野范围+2',
    dropWeight: 50
  },

  // ========== CONSUMABLES (保留原有) ==========
  POTION_HP_S: { 
    id: 'POTION_HP_S', 
    name: 'Small Potion', 
    nameZh: '小型药水', 
    type: 'CONSUMABLE', 
    rarity: 'COMMON', 
    iconIndex: 0,
    maxStack: 99,
    effect: { kind: 'heal', amount: 50 } 
  },
  POTION_RAGE: { 
    id: 'POTION_RAGE', 
    name: 'Rage Potion', 
    nameZh: '怒气药水', 
    type: 'CONSUMABLE', 
    rarity: 'RARE', 
    iconIndex: 1,
    maxStack: 99,
    effect: { kind: 'rage', amount: 20 } 
  },
  SCROLL_XP: { 
    id: 'SCROLL_XP', 
    name: 'Knowledge Scroll', 
    nameZh: '知识卷轴', 
    type: 'CONSUMABLE', 
    rarity: 'RARE', 
    iconIndex: 4,
    maxStack: 99,
    effect: { kind: 'xp', amount: 10 } 
  },
  SCROLL_FIRE: { 
    id: 'SCROLL_FIRE', 
    name: 'Fire Scroll', 
    nameZh: '火焰卷轴', 
    type: 'CONSUMABLE', 
    rarity: 'EPIC', 
  iconIndex: 5,
  maxStack: 99,
  // 使用后：为下一次成功攻击预充能，先对目标造成30点火焰伤害并施加灼烧，再结算本次攻击（可触发融化等元素反应）
  desc: '消耗品：使用后，使你的下一次成功攻击在命中前先造成30点火焰伤害并施加灼烧，可与技能本身的灼烧叠加并触发元素反应。',
  descZh: '消耗品：使用后，使你的下一次成功攻击在命中前先造成30点火焰伤害并施加灼烧，可与技能本身的灼烧叠加并触发元素反应。',
  effect: { kind: 'prime_state', state: 'fireScrollPrimed', damage: 30, status: 'BURN' } 
  },

  // ========== GEMS (宝石系统) ==========
  // 宝石图集布局：5列 (红/蓝/黄/绿/白) x 4行 (碎裂/完整/无瑕/完美)
  // 列索引：0=Ruby(红), 1=Sapphire(蓝), 2=Topaz(黄), 3=Emerald(绿), 4=Diamond(白)
  // 行索引：0=Tier1(碎裂), 1=Tier2(完整), 2=Tier3(无瑕), 3=Tier4(完美)
  
  // Ruby (红宝石) - Pyro元素
  GEM_RUBY_T1: {
    id: 'GEM_RUBY_T1',
    name: 'Chipped Ruby',
    nameZh: '碎裂红宝石',
    type: 'GEM',
    tier: 1,
    rarity: 'COMMON',
    iconIndex: 0, // 第0列，第0行
    gemEffects: {
      weapon: { p_atk: 2 },
      armor: { p_def: 2, maxHp: 2 }
    },
    dropWeight: 100
  },
  GEM_RUBY_T2: {
    id: 'GEM_RUBY_T2',
    name: 'Ruby',
    nameZh: '完整红宝石',
    type: 'GEM',
    tier: 2,
    rarity: 'RARE',
    iconIndex: 5, // 第0列，第1行 (col + row * 5)
    gemEffects: {
      weapon: { p_atk: 5 },
      armor: { p_def: 5, maxHp: 5 }
    },
    dropWeight: 50
  },
  GEM_RUBY_T3: {
    id: 'GEM_RUBY_T3',
    name: 'Flawless Ruby',
    nameZh: '无瑕红宝石',
    type: 'GEM',
    tier: 3,
    rarity: 'EPIC',
    iconIndex: 10, // 第0列，第2行
    gemEffects: {
      weapon: { p_atk: 10, infuseElement: 'PYRO' },
      armor: { p_def: 10, maxHp: 10 }
    },
    dropWeight: 20
  },
  GEM_RUBY_T4: {
    id: 'GEM_RUBY_T4',
    name: 'Perfect Ruby',
    nameZh: '完美红宝石',
    type: 'GEM',
    tier: 4,
    rarity: 'LEGENDARY',
    iconIndex: 15, // 第0列，第3行
    gemEffects: {
      weapon: { p_atk: 20, infuseElement: 'PYRO', crit_rate: 0.05 },
      armor: { p_def: 20, maxHp: 20, p_atk: 5 }
    },
    dropWeight: 5
  },

  // Sapphire (蓝宝石) - Cryo元素
  GEM_SAPPHIRE_T1: {
    id: 'GEM_SAPPHIRE_T1',
    name: 'Chipped Sapphire',
    nameZh: '碎裂蓝宝石',
    type: 'GEM',
    tier: 1,
    rarity: 'COMMON',
    iconIndex: 1, // 第1列，第0行
    gemEffects: {
      weapon: { m_atk: 2 },
      armor: { m_def: 2, maxHp: 2 }
    },
    dropWeight: 100
  },
  GEM_SAPPHIRE_T2: {
    id: 'GEM_SAPPHIRE_T2',
    name: 'Sapphire',
    nameZh: '完整蓝宝石',
    type: 'GEM',
    tier: 2,
    rarity: 'RARE',
    iconIndex: 6, // 第1列，第1行
    gemEffects: {
      weapon: { m_atk: 5 },
      armor: { m_def: 5, maxHp: 5 }
    },
    dropWeight: 50
  },
  GEM_SAPPHIRE_T3: {
    id: 'GEM_SAPPHIRE_T3',
    name: 'Flawless Sapphire',
    nameZh: '无瑕蓝宝石',
    type: 'GEM',
    tier: 3,
    rarity: 'EPIC',
    iconIndex: 11, // 第1列，第2行
    gemEffects: {
      weapon: { m_atk: 10, infuseElement: 'CRYO' },
      armor: { m_def: 10, maxHp: 10 }
    },
    dropWeight: 20
  },
  GEM_SAPPHIRE_T4: {
    id: 'GEM_SAPPHIRE_T4',
    name: 'Perfect Sapphire',
    nameZh: '完美蓝宝石',
    type: 'GEM',
    tier: 4,
    rarity: 'LEGENDARY',
    iconIndex: 16, // 第1列，第3行
    gemEffects: {
      weapon: { m_atk: 20, infuseElement: 'CRYO', crit_rate: 0.05 },
      armor: { m_def: 20, maxHp: 20, m_atk: 5 }
    },
    dropWeight: 5
  },

  // Topaz (黄宝石) - Electro元素
  GEM_TOPAZ_T1: {
    id: 'GEM_TOPAZ_T1',
    name: 'Chipped Topaz',
    nameZh: '碎裂黄宝石',
    type: 'GEM',
    tier: 1,
    rarity: 'COMMON',
    iconIndex: 2, // 第2列，第0行
    gemEffects: {
      weapon: { p_atk: 1, m_atk: 1 },
      armor: { p_def: 1, m_def: 1, maxHp: 2 }
    },
    dropWeight: 100
  },
  GEM_TOPAZ_T2: {
    id: 'GEM_TOPAZ_T2',
    name: 'Topaz',
    nameZh: '完整黄宝石',
    type: 'GEM',
    tier: 2,
    rarity: 'RARE',
    iconIndex: 7, // 第2列，第1行
    gemEffects: {
      weapon: { p_atk: 3, m_atk: 2 },
      armor: { p_def: 3, m_def: 2, maxHp: 5 }
    },
    dropWeight: 50
  },
  GEM_TOPAZ_T3: {
    id: 'GEM_TOPAZ_T3',
    name: 'Flawless Topaz',
    nameZh: '无瑕黄宝石',
    type: 'GEM',
    tier: 3,
    rarity: 'EPIC',
    iconIndex: 12, // 第2列，第2行
    gemEffects: {
      weapon: { p_atk: 5, m_atk: 5, infuseElement: 'ELECTRO' },
      armor: { p_def: 5, m_def: 5, maxHp: 10 }
    },
    dropWeight: 20
  },
  GEM_TOPAZ_T4: {
    id: 'GEM_TOPAZ_T4',
    name: 'Perfect Topaz',
    nameZh: '完美黄宝石',
    type: 'GEM',
    tier: 4,
    rarity: 'LEGENDARY',
    iconIndex: 17, // 第2列，第3行
    gemEffects: {
      weapon: { p_atk: 10, m_atk: 10, infuseElement: 'ELECTRO', crit_rate: 0.05 },
      armor: { p_def: 10, m_def: 10, maxHp: 20, p_atk: 3, m_atk: 2 }
    },
    dropWeight: 5
  },

  // Emerald (绿宝石) - Poison元素
  GEM_EMERALD_T1: {
    id: 'GEM_EMERALD_T1',
    name: 'Chipped Emerald',
    nameZh: '碎裂绿宝石',
    type: 'GEM',
    tier: 1,
    rarity: 'COMMON',
    iconIndex: 3, // 第3列，第0行
    gemEffects: {
      weapon: { p_atk: 2 },
      armor: { p_def: 2, maxHp: 2 }
    },
    dropWeight: 100
  },
  GEM_EMERALD_T2: {
    id: 'GEM_EMERALD_T2',
    name: 'Emerald',
    nameZh: '完整绿宝石',
    type: 'GEM',
    tier: 2,
    rarity: 'RARE',
    iconIndex: 8, // 第3列，第1行
    gemEffects: {
      weapon: { p_atk: 5 },
      armor: { p_def: 5, maxHp: 5 }
    },
    dropWeight: 50
  },
  GEM_EMERALD_T3: {
    id: 'GEM_EMERALD_T3',
    name: 'Flawless Emerald',
    nameZh: '无瑕绿宝石',
    type: 'GEM',
    tier: 3,
    rarity: 'EPIC',
    iconIndex: 13, // 第3列，第2行
    gemEffects: {
      weapon: { p_atk: 10, infuseElement: 'POISON' },
      armor: { p_def: 10, maxHp: 10 }
    },
    dropWeight: 20
  },
  GEM_EMERALD_T4: {
    id: 'GEM_EMERALD_T4',
    name: 'Perfect Emerald',
    nameZh: '完美绿宝石',
    type: 'GEM',
    tier: 4,
    rarity: 'LEGENDARY',
    iconIndex: 18, // 第3列，第3行
    gemEffects: {
      weapon: { p_atk: 20, infuseElement: 'POISON', crit_rate: 0.05 },
      armor: { p_def: 20, maxHp: 20, p_atk: 5 }
    },
    dropWeight: 5
  },

  // Diamond (钻石) - Physical元素
  GEM_DIAMOND_T1: {
    id: 'GEM_DIAMOND_T1',
    name: 'Chipped Diamond',
    nameZh: '碎裂钻石',
    type: 'GEM',
    tier: 1,
    rarity: 'COMMON',
    iconIndex: 4, // 第4列，第0行
    gemEffects: {
      weapon: { p_atk: 2 },
      armor: { p_def: 2, maxHp: 2 }
    },
    dropWeight: 100
  },
  GEM_DIAMOND_T2: {
    id: 'GEM_DIAMOND_T2',
    name: 'Diamond',
    nameZh: '完整钻石',
    type: 'GEM',
    tier: 2,
    rarity: 'RARE',
    iconIndex: 9, // 第4列，第1行
    gemEffects: {
      weapon: { p_atk: 5 },
      armor: { p_def: 5, maxHp: 5 }
    },
    dropWeight: 50
  },
  GEM_DIAMOND_T3: {
    id: 'GEM_DIAMOND_T3',
    name: 'Flawless Diamond',
    nameZh: '无瑕钻石',
    type: 'GEM',
    tier: 3,
    rarity: 'EPIC',
    iconIndex: 14, // 第4列，第2行
    gemEffects: {
      weapon: { p_atk: 10, infuseElement: 'PHYSICAL' },
      armor: { p_def: 10, maxHp: 10 }
    },
    dropWeight: 20
  },
  GEM_DIAMOND_T4: {
    id: 'GEM_DIAMOND_T4',
    name: 'Perfect Diamond',
    nameZh: '完美钻石',
    type: 'GEM',
    tier: 4,
    rarity: 'LEGENDARY',
    iconIndex: 19, // 第4列，第3行
    gemEffects: {
      weapon: { p_atk: 20, infuseElement: 'PHYSICAL', crit_rate: 0.05 },
      armor: { p_def: 20, maxHp: 20, p_atk: 5 }
    },
    dropWeight: 5
  }
};

/**
 * 根据楼层获取装备掉落
 * 使用程序化生成系统 (Procedural Generation)
 * 
 * @param {number} floor - 当前楼层
 * @param {Object} options - 额外选项
 * @param {number} options.monsterTier - 怪物等级 (1-3)
 * @param {string} options.playerClass - 玩家职业
 * @param {number} options.magicFind - 魔法发现
 * @param {number} options.ascensionLevel - 飞升等级
 * @param {boolean} options.useLegacySystem - 使用旧系统（商店等场景）
 * @returns {Object|null} 随机装备或null
 */
export function getEquipmentDropForFloor(floor, options = {}) {
  const { useLegacySystem = false } = options;
  
  // === 新系统：程序化生成 ===
  if (!useLegacySystem) {
    try {
      // 动态导入生成系统（避免循环依赖）
      import('../systems/LootGenerationSystem.js').then(module => {
        // 模块加载后不需要做什么，后续调用会使用缓存
      });
      
      // 检查模块是否已加载
      if (typeof window.__lootGenerator === 'undefined') {
        // 首次调用，异步加载后回退到旧系统
        console.log('⚡ Loading procedural generation system...');
        return getEquipmentDropForFloor_Legacy(floor);
      }
      
      // 使用程序化生成
      // ✅ 每日挑战模式：如果 game 对象存在且处于每日挑战模式，传入 RNG
      const rng = (options.game && options.game.isDailyMode && options.game.rng) ? options.game.rng : null;
      const item = window.__lootGenerator.generate({
        floor,
        monsterTier: options.monsterTier || Math.min(Math.floor(floor / 5) + 1, 3),
        playerClass: options.playerClass,
        magicFind: options.magicFind || 0,
        ascensionLevel: options.ascensionLevel || 0,
        rng: rng
      });
      
      // ✅ v2.0: 确保程序化生成的装备也有标准结构（buildItemObject 已处理，这里做验证）
      if (item && !item.uid) {
        // 如果生成的物品缺少 uid，补充它
        item.uid = item.uid || generateUID();
      }
      
      return item;
    } catch (err) {
      console.warn('⚠️ Procedural generation failed, using legacy system:', err);
      return getEquipmentDropForFloor_Legacy(floor);
    }
  }
  
  // === 旧系统：固定装备池 ===
  return getEquipmentDropForFloor_Legacy(floor);
}

/**
 * 旧版装备掉落系统（保留用于商店等固定场景）
 * @param {number} floor - 当前楼层
 * @returns {Object|null} 标准化的物品对象实例或null
 */
export function getEquipmentDropForFloor_Legacy(floor) {
  // 确定解锁的Tier池
  const unlockedTiers = [];
  if (floor >= 1) unlockedTiers.push(1);  // Floor 1+: 解锁 Tier 1
  if (floor >= 5) unlockedTiers.push(2);  // Floor 5+: 解锁 Tier 2
  if (floor >= 10) unlockedTiers.push(3); // Floor 10+: 解锁 Tier 3
  
  // 过滤出已解锁且非消耗品的装备
  const pool = Object.values(EQUIPMENT_DB).filter(item => 
    unlockedTiers.includes(item.tier) && 
    item.type !== 'CONSUMABLE' &&
    item.dropWeight !== undefined
  );
  
  if (pool.length === 0) return null;
  
  // 计算总权重
  const totalWeight = pool.reduce((sum, item) => sum + item.dropWeight, 0);
  
  // 加权随机抽取
  let random = Math.random() * totalWeight;
  let selectedItem = null;
  for (const item of pool) {
    random -= item.dropWeight;
    if (random <= 0) {
      selectedItem = item;
      break;
    }
  }
  
  // 兜底返回最后一个（理论上不会执行到这里）
  if (!selectedItem) {
    selectedItem = pool[pool.length - 1];
  }
  
  // ✅ v2.0: 将旧系统返回的装备包装成标准对象实例
  // 计算物品等级（基于楼层）
  const level = Math.max(1, Math.floor(floor / 5) + 1);
  
  return createStandardizedItem(selectedItem, {
    level,
    affixes: [], // 旧系统没有词缀
    uniqueEffect: null,
    setId: null
  });
}

// Consumable item IDs
export const CONSUMABLE_IDS = ['POTION_HP_S', 'POTION_RAGE', 'SCROLL_XP', 'SCROLL_FIRE'];

// Get random consumable item
/**
 * 获取随机消耗品
 * @param {SeededRandom} rng - 可选的随机数生成器（如果提供则使用，否则使用 Math.random）
 * @returns {Object|null} 消耗品对象或null
 */
export function getRandomConsumable(rng = null) {
  const list = CONSUMABLE_IDS.filter(id => EQUIPMENT_DB[id]);
  if (list.length === 0) return null;
  // ✅ FIX: 使用传入的 RNG 或回退到 Math.random（每日挑战模式需要确定性）
  const randomValue = rng ? rng.next() : Math.random();
  const id = list[Math.floor(randomValue * list.length)];
  return EQUIPMENT_DB[id];
}

/**
 * 获取物品定义（支持静态和动态生成）
 * @param {string} itemId - 物品ID
 * @returns {Object|null} 物品定义
 */
export function getItemDefinition(itemId) {
  // 优先从动态物品池查找
  if (window.__dynamicItems && window.__dynamicItems.has(itemId)) {
    return window.__dynamicItems.get(itemId);
  }
  
  // 回退到静态数据库
  return EQUIPMENT_DB[itemId] || null;
}

/**
 * 序列化物品对象（Item Serialization 2.0）
 * 精简存档体积，只保存必要字段
 * @param {Object} item - 物品对象
 * @returns {Object} 序列化后的数据
 */
export function serializeItem(item) {
  if (!item) return null;
  
  // 如果是字符串（旧格式），直接返回
  if (typeof item === 'string') {
    return item;
  }
  
  // 提取核心字段
  const serialized = {
    itemId: item.itemId || item.id,
    uid: item.uid,
    quality: item.quality,
    enhanceLevel: item.enhanceLevel,
    meta: item.meta || {}
  };

  // 堆叠属性（主要用于消耗品）
  if (typeof item.count === 'number') {
    serialized.count = item.count;
  }
  if (typeof item.maxStack === 'number') {
    serialized.maxStack = item.maxStack;
  }
  
  // 检查是否为动态物品
  const isDynamicItem = item.uid && (
    item.uid.includes('PROCGEN') || 
    (item.meta && item.meta.archetype)
  );
  
  // 动态物品：必须保存 baseStats
  if (isDynamicItem && item.baseStats) {
    serialized.baseStats = { ...item.baseStats };
  }
  
  // 静态物品：不保存 baseStats 和 stats（从数据库恢复）
  // 注意：meta 中的 sockets、affixes 等已包含在 meta 字段中
  
  return serialized;
}

/**
 * 反序列化物品对象（Item Serialization 2.0）
 * 从序列化数据还原物品对象
 * @param {Object|string} data - 序列化数据（对象或字符串ID）
 * @returns {Object|null} 还原的物品对象
 */
export function deserializeItem(data) {
  if (!data) return null;
  
  // 向后兼容：如果读取到字符串ID（旧存档），视为静态物品
  if (typeof data === 'string') {
    const itemDef = EQUIPMENT_DB[data];
    if (!itemDef) {
      console.warn(`[deserializeItem] 未找到物品定义: ${data}`);
      return null;
    }
    // 创建标准物品对象
    return createStandardizedItem(itemDef, {
      level: 1,
      affixes: [],
      uniqueEffect: null,
      setId: null
    });
  }
  
  // 新格式：从数据库获取模板
  const itemId = data.itemId || data.id;
  if (!itemId) {
    console.warn('[deserializeItem] 缺少 itemId');
    return null;
  }
  
  const itemDef = EQUIPMENT_DB[itemId];
  if (!itemDef) {
    // 可能是动态生成的物品，尝试从动态物品池查找
    if (window.__dynamicItems && window.__dynamicItems.has(itemId)) {
      const dynamicItem = window.__dynamicItems.get(itemId);
      // 合并数据
      const restored = {
        ...dynamicItem,
        ...data,
        itemId: itemId,
        id: itemId
      };
      // 如果 data 中有 baseStats，覆盖模板的 baseStats
      if (data.baseStats) {
        restored.baseStats = { ...data.baseStats };
      }
      // 确保 meta 和 sockets 结构完整
      if (!restored.meta) {
        restored.meta = {};
      }
      if (!restored.meta.sockets && data.meta && data.meta.sockets) {
        restored.meta.sockets = data.meta.sockets;
      }
      return restored;
    }
    console.warn(`[deserializeItem] 未找到物品定义: ${itemId}`);
    return null;
  }
  
  // 合并模板和数据
  const restored = {
    ...itemDef,
    ...data,
    itemId: itemId,
    id: itemId
  };

  // 堆叠属性兼容：旧存档没有 count/maxStack 时自动补全
  if (typeof restored.count !== 'number' || restored.count <= 0) {
    restored.count = 1;
  }
  if (typeof restored.maxStack !== 'number' || restored.maxStack <= 0) {
    if (restored.type === 'CONSUMABLE') {
      restored.maxStack = 99;
    } else {
      restored.maxStack = 1;
    }
  }
  
  // 如果 data 中有 baseStats，覆盖模板的 baseStats
  if (data.baseStats) {
    restored.baseStats = { ...data.baseStats };
  } else if (itemDef.stats && !restored.baseStats) {
    // 如果没有 baseStats，使用 stats 作为 baseStats
    restored.baseStats = { ...itemDef.stats };
  }
  
  // 确保 meta 结构完整
  if (!restored.meta) {
    restored.meta = {
      level: data.meta?.level || 1,
      affixes: data.meta?.affixes || [],
      uniqueEffect: data.meta?.uniqueEffect || null,
      setId: data.meta?.setId || null,
      sockets: data.meta?.sockets || []
    };
  } else {
    // 确保 sockets 存在
    if (!restored.meta.sockets) {
      restored.meta.sockets = data.meta?.sockets || [];
    }
  }
  
  // 确保 uid 存在
  if (!restored.uid) {
    restored.uid = data.uid || generateUID();
  }
  
  return restored;
}