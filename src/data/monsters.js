// Monster Data - 怪物数据

// Monster stats
export const MONSTER_STATS = {
  SLIME: { 
    name: "Slime", 
    cnName: "史莱姆",
    hp: 120, maxHp: 120, p_atk: 6, m_atk: 0, p_def: 0, m_def: 0, 
    xp: 10, gold: 5, rageYield: 2, 
    minSpawnDistance: 0,
    desc: "Gooey blob. Physical poke.",
    height: "0.8m",
    weight: "12kg",
    speed: 0.12,
    size: 20,
    base_as: 0.5,
    traits: ['STICKY'],
    tags: ['NATURE'],
    lore: "一种常见的低等魔物。史莱姆是由魔力凝聚而成的生命体，它们通常出现在魔法塔的浅层。虽然单个史莱姆的威胁不大，但它们繁殖迅速，往往成群结队出现。据说史莱姆可以通过分裂来繁殖，这使得它们成为魔法塔中最常见的敌人。"
  },
  BAT: { 
    name: "Bat", 
    cnName: "蝙蝠",
    hp: 80, maxHp: 80, p_atk: 5, m_atk: 8, p_def: 0, m_def: 0, 
    xp: 15, gold: 8, rageYield: 3, 
    minSpawnDistance: 15,
    desc: "Skittish and magical screech.",
    height: "0.5m",
    weight: "2kg",
    speed: 0.14,
    size: 28,
    base_as: 1.5,
    traits: ['ECHOLOCATION'],
    tags: ['BEAST', 'FLYING'],
    lore: "蝙蝠是魔法塔中层的常见敌人。它们拥有敏锐的听觉和魔法感知能力，能够发出具有魔法属性的尖啸。蝙蝠通常在黑暗中活动，它们的魔法攻击往往令人措手不及。许多冒险者在面对蝙蝠群时都吃过亏。"
  },
  SKELETON: { 
    name: "Skeleton", 
    cnName: "骷髅战士",
    hp: 160, maxHp: 160, p_atk: 9, m_atk: 0, p_def: 4, m_def: 2, 
    xp: 20, gold: 12, rageYield: 4, 
    minSpawnDistance: 15,
    desc: "Bone warrior, sturdy against blades.",
    height: "1.7m",
    weight: "35kg",
    speed: 0.11,
    size: 40,
    base_as: 0.8,
    traits: ['BONE_SHIELD'],
    tags: ['UNDEAD', 'HUMANOID'],
    lore: "骷髅战士是被诅咒的亡灵，曾经是魔法塔的守卫者。它们拥有坚硬的骨骼和丰富的战斗经验，能够使用各种武器。骷髅战士对物理伤害有一定的抵抗力，但对魔法伤害相对脆弱。传说中，只有摧毁它们的灵魂才能彻底消灭它们。"
  },
  VOID: { 
    name: "Void Crystal", 
    cnName: "虚空晶体",
    hp: 100, maxHp: 100, p_atk: 0, m_atk: 12, p_def: 1, m_def: 8, 
    xp: 25, gold: 15, rageYield: 5, 
    minSpawnDistance: 20,
    desc: "Glass cannon of arcane force.",
    height: "1.2m",
    weight: "8kg",
    speed: 0.13,
    size: 40,
    base_as: 1.0,
    traits: ['OVERLOAD'],
    tags: ['ELEMENTAL', 'CONSTRUCT'],
    lore: "虚空晶体是魔法塔中层出现的神秘物体。它们由纯粹的魔法能量凝聚而成，散发着诡异的紫色光芒。虚空晶体拥有强大的魔法攻击力，但防御力较弱。据说它们是魔法塔深层某种强大存在的碎片。"
  },
  SWAMP: { 
    name: "Swamp Dweller", 
    cnName: "沼泽居民",
    hp: 240, maxHp: 240, p_atk: 14, m_atk: 10, p_def: 5, m_def: 3, 
    xp: 30, gold: 20, rageYield: 6, 
    minSpawnDistance: 30,
    desc: "Bog lurker, resilient and steady.",
    height: "1.5m",
    weight: "60kg",
    speed: 0.10,
    size: 50,
    base_as: 0.6,
    traits: ['TOXIC_SKIN'],
    tags: ['HUMANOID', 'NATURE'],
    lore: "沼泽居民是魔法塔中层沼泽区域的主要敌人。它们由泥土和腐烂物质组成，拥有强大的物理攻击力和一定的防御能力。沼泽居民行动缓慢但力量惊人，能够造成大量伤害。它们似乎与魔法塔的沼泽地形有某种神秘的联系。"
  },
  CLOCKWORK: { 
    name: "Clockwork Knight", 
    cnName: "发条骑士",
    hp: 350, maxHp: 350, p_atk: 18, m_atk: 6, p_def: 12, m_def: 8, 
    xp: 40, gold: 28, rageYield: 7, 
    minSpawnDistance: 30,
    desc: "Heavily armored automaton.",
    height: "1.8m",
    weight: "120kg",
    speed: 0.09,
    size: 56,
    base_as: 0.5,
    traits: ['PLATING'],
    tags: ['CONSTRUCT'],
    lore: "发条骑士是魔法塔中层的精英敌人。它们是由古代魔法师创造的自动装置，拥有坚硬的金属外壳和精密的机械结构。发条骑士拥有高超的战斗技巧和强大的防御能力，但行动相对缓慢。传说中，每个发条骑士的核心都藏着一个强大的魔法源。"
  },
  REAPER: { 
    name: "Crimson Reaper", 
    cnName: "死神收割者",
    hp: 150, maxHp: 150, p_atk: 8, m_atk: 22, p_def: 3, m_def: 8, 
    xp: 45, gold: 30, rageYield: 8, 
    minSpawnDistance: 30,
    desc: "Deadly arcane scythe-wielder.",
    height: "1.3m",
    weight: "15kg",
    speed: 0.15,
    size: 35,
    base_as: 1.3,
    traits: ['EXECUTION'],
    tags: ['UNDEAD', 'DEMON'],
    lore: "死神收割者是魔法塔中层出现的危险敌人。它们是由诅咒和魔法能量凝聚而成的生命体，挥舞着致命的魔法镰刀。死神收割者拥有极高的魔法攻击力和惊人的速度，但防御力较弱。许多冒险者在面对它们时都因为躲避不及而丧生。"
  },
  GOLEM: { 
    name: "Magma Golem", 
    cnName: "岩浆巨人",
    hp: 600, maxHp: 600, p_atk: 25, m_atk: 0, p_def: 15, m_def: 10, 
    xp: 50, gold: 40, rageYield: 10, 
    minSpawnDistance: 30,
    desc: "Molten colossus, shrugs off blades.",
    height: "2.5m",
    weight: "500kg",
    speed: 0.08,
    size: 56,
    base_as: 0.5,
    traits: ['MOLTEN_CORE'],
    tags: ['CONSTRUCT', 'ELEMENTAL'],
    lore: "岩浆巨人是魔法塔深层的终极敌人之一。它们由熔融的岩浆和魔法能量组成，拥有巨大的体型和压倒性的力量。岩浆巨人拥有极高的物理攻击力和防御能力，能够造成毁灭性的伤害。据说击败岩浆巨人是成为真正冒险者的标志。"
  },
  GHOST: {
    name: "Shadow Ghost",
    cnName: "幽灵",
    hp: 110, maxHp: 110, p_atk: 0, m_atk: 14, p_def: 2, m_def: 5,
    xp: 30, gold: 15, rageYield: 5,
    minSpawnDistance: 20,
    desc: "Invisible wraith, strikes from shadows.",
    height: "1.5m",
    weight: "0kg",
    speed: 0.13,
    size: 40,
    base_as: 1.2,
    traits: ['ETHEREAL'],
    tags: ['UNDEAD', 'SPIRIT', 'FLYING'],
    lore: "幽灵是魔法塔中最神秘的敌人之一。它们可以隐藏在阴影中，只有在光照范围内才能被看见。幽灵拥有强大的魔法攻击能力，但防御力较弱。小心它们的偷袭！"
  },
  BOSS: { 
    name: "Dark Lord", 
    cnName: "黑暗领主",
    hp: 3000, maxHp: 3000, p_atk: 22, m_atk: 22, p_def: 10, m_def: 10, 
    xp: 500, gold: 200, rageYield: 50, 
    minSpawnDistance: 50,
    desc: "Floor Master.",
    height: "2.0m",
    weight: "150kg",
    speed: 0.16,
    size: 56,
    base_as: 1.0,
    tags: ['DEMON', 'BOSS'],
    lore: "黑暗领主是魔法塔的最终守护者,也是整个塔的核心。它是一个拥有强大魔法力量和战斗技巧的古老存在。黑暗领主同时拥有强大的物理和魔法攻击能力，以及均衡的防御。传说中，黑暗领主曾经是魔法塔的创造者，但被诅咒后堕落成了现在的模样。击败它是所有冒险者的终极目标。"
  }
};

// Elite Monster Affix System
export const ELITE_AFFIXES = {
  VAMPIRIC: {
    id: 'VAMPIRIC',
    name: '吸血',
    nameColor: '#ff3366',
    desc: '攻击时回复造成伤害的50%生命值',
    visualEffect: 'flash_green'
  },
  THORNS: {
    id: 'THORNS',
    name: '反伤',
    nameColor: '#999999',
    desc: '反弹受到物理伤害的20%给攻击者',
    reflectPercent: 0.2,
    visualEffect: 'spike_shield'
  },
  VOLATILE: {
    id: 'VOLATILE',
    name: '自爆',
    nameColor: '#ff0000',
    desc: '死亡时爆炸，对1格内的玩家造成巨大伤害',
    explodeRange: 1,
    explodeDamage: 80,
    explodeDelay: 1500,
    visualEffect: 'red_pulse'
  },
  REGENERATOR: {
    id: 'REGENERATOR',
    name: '再生',
    nameColor: '#00ff88',
    desc: '未受伤害时每秒回复2%最大生命值',
    regenPercent: 0.02,
    regenInterval: 1000,
    damageCooldown: 3000,
    visualEffect: 'healing_plus'
  },
  FROST_AURA: {
    id: 'FROST_AURA',
    name: '寒冰光环',
    nameColor: '#00ddff',
    desc: '2格内的玩家移动速度降低30%',
    range: 2,
    slowPercent: 0.3,
    visualEffect: 'blue_circle'
  },
  TELEPORTER: {
    id: 'TELEPORTER',
    name: '闪烁',
    nameColor: '#cc00ff',
    desc: '受到3次伤害后瞬移到附近',
    hitThreshold: 3,
    teleportRange: 3,
    visualEffect: 'fade_blink'
  }
};

// Elite monster spawn chance (increases with floor)
export const ELITE_SPAWN_CONFIG = {
  baseChance: 0.08,        // 8% base chance
  floorMultiplier: 0.02,   // +2% per floor
  maxChance: 0.25,         // Cap at 25%
  minFloor: 2              // Elites start appearing from floor 2
};

// Monster Traits System - 怪物特性系统
export const MONSTER_TRAITS = {
  STICKY: { 
    name: '黏液', 
    desc: '攻击时降低玩家30%移动速度，持续2秒' 
  },
  ECHOLOCATION: { 
    name: '超声波', 
    desc: '拥有25%的固有闪避率' 
  },
  BONE_SHIELD: { 
    name: '骨盾', 
    desc: '战斗开始时完全格挡受到的第一次伤害' 
  },
  OVERLOAD: { 
    name: '能量过载', 
    desc: '死亡时对周围1格造成200%魔法攻击的自爆伤害' 
  },
  TOXIC_SKIN: { 
    name: '毒性皮肤', 
    desc: '攻击时使玩家中毒' 
  },
  PLATING: { 
    name: '金属装甲', 
    desc: '物理抗性+50%，但雷属性伤害+50%' 
  },
  EXECUTION: { 
    name: '斩杀', 
    desc: '对生命值低于30%的目标造成双倍暴击伤害' 
  },
  MOLTEN_CORE: { 
    name: '熔岩核心', 
    desc: '免疫灼烧和冰冻，每3秒获得一次护盾' 
  },
  ETHEREAL: { 
    name: '虚无', 
    desc: '物理伤害减免80%，但受到双倍魔法伤害' 
  }
};

