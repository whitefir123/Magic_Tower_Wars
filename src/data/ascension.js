// Ascension Levels System - 噩梦层级系统

// ========================================
// 噩梦层级（Ascension Levels）系统
// ========================================
// 废弃旧的DIFFICULTY_LEVELS，使用新的ASCENSION_LEVELS（1-25级）
// @deprecated 保留DIFFICULTY_LEVELS仅用于向后兼容，新代码应使用ASCENSION_LEVELS
export const DIFFICULTY_LEVELS = {
  NORMAL: { id: 'normal', name: '普通', multiplier: 1.0, desc: '标准难度' },
  HARD: { id: 'hard', name: '困难', multiplier: 1.5, desc: '更多挑战' },
  INFINITE: { id: 'infinite', name: '无限', multiplier: 2.0, desc: '极限挑战' }
};

// 基础成长倍率配置
export const ASCENSION_BASE_SCALING = {
  HP: 0.10,      // 每级HP +10%
  ATK: 0.08,     // 每级ATK +8%
  GOLD: 0.10,    // 每级Gold +10%（奖励增加）
  XP: 0.10       // 每级XP +10%（奖励增加）
};

// 获取指定噩梦层级的配置数据
export function getAscensionLevel(level) {
  if (level < 1 || level > 25) {
    console.warn(`Invalid ascension level: ${level}, defaulting to 1`);
    level = 1;
  }
  
  // 基础配置（所有层级共享）
  const baseConfig = {
    level: level,
    // 基础成长倍率（累积）
    hpMult: 1 + ASCENSION_BASE_SCALING.HP * (level - 1),
    atkMult: 1 + ASCENSION_BASE_SCALING.ATK * (level - 1),
    goldMult: 1 + ASCENSION_BASE_SCALING.GOLD * (level - 1),
    xpMult: 1 + ASCENSION_BASE_SCALING.XP * (level - 1),
    
    // 修饰符（默认值）
    eliteChance: 0.08,
    aggroRange: 0,
    bossHpMult: 0,
    moveSpeedMult: 0,
    eliteAffixCount: 1,
    trapDensity: 0,
    trapDamageMult: 0,
    voidShield: false,
    bossEnrage: false,
    atkCooldownMult: 0,
    monsterDensity: 0,
    lowHpDef: false,
    guaranteedCurseAltar: false
  };
  
  // 应用特定层级修饰符
  if (level >= 1) {
    baseConfig.eliteChance = 0.15; // Lv1: 精英怪概率提升
  }
  if (level >= 3) {
    baseConfig.aggroRange = 2; // Lv3: 仇恨范围+2
  }
  if (level >= 5) {
    baseConfig.bossHpMult = 0.3; // Lv5: Boss HP +30%
  }
  if (level >= 7) {
    baseConfig.moveSpeedMult = 0.1; // Lv7: 怪物移速 +10%
  }
  if (level >= 10) {
    baseConfig.eliteAffixCount = 2; // Lv10: 精英怪固定2个词缀
  }
  if (level >= 12) {
    baseConfig.trapDensity = 0.5; // Lv12: 陷阱密度 +0.5
    baseConfig.trapDamageMult = 0.5; // Lv12: 陷阱伤害 +50%
  }
  if (level >= 14) {
    baseConfig.voidShield = true; // Lv14: 虚空护盾（魔抗*1.5）
  }
  if (level >= 15) {
    baseConfig.bossEnrage = true; // Lv15: Boss半血狂暴（攻速+30%）
  }
  if (level >= 17) {
    baseConfig.atkCooldownMult = -0.15; // Lv17: 攻击冷却 -15%（攻击更快）
  }
  if (level >= 19) {
    baseConfig.monsterDensity = 0.2; // Lv19: 怪物密度 +20%
  }
  if (level >= 20) {
    baseConfig.lowHpDef = true; // Lv20: 残血加防（HP<30%时Def+50%）
  }
  if (level >= 22) {
    // Lv22: 精英怪有概率获得3个词缀（与Lv10的2个词缀叠加）
    // 实际处理：在生成精英怪时，根据level决定词缀数量
  }
  if (level >= 24) {
    baseConfig.moveSpeedMult += 0.1; // Lv24: 怪物移速再+10%（累计+20%）
  }
  if (level >= 25) {
    baseConfig.guaranteedCurseAltar = true; // Lv25: 必定生成诅咒祭坛
  }
  
  return baseConfig;
}

// 获取指定层级的所有生效效果描述（用于Tooltip）
export function getAscensionLevelTooltip(level) {
  const config = getAscensionLevel(level);
  const effects = [];
  
  // 基础效果
  effects.push(`生命值: +${Math.round((config.hpMult - 1) * 100)}%`);
  effects.push(`攻击力: +${Math.round((config.atkMult - 1) * 100)}%`);
  effects.push(`金币奖励: +${Math.round((config.goldMult - 1) * 100)}%`);
  effects.push(`经验奖励: +${Math.round((config.xpMult - 1) * 100)}%`);
  
  // 特定层级效果
  if (level >= 1) {
    effects.push(`Lv1: 精英怪概率提升至15%`);
  }
  if (level >= 3) {
    effects.push(`Lv3: 怪物仇恨范围 +2`);
  }
  if (level >= 5) {
    effects.push(`Lv5: Boss生命值 +30%`);
  }
  if (level >= 7) {
    effects.push(`Lv7: 怪物移速 +10%`);
  }
  if (level >= 10) {
    effects.push(`Lv10: 精英怪固定2个词缀`);
  }
  if (level >= 12) {
    effects.push(`Lv12: 陷阱密度 +50%，陷阱伤害 +50%`);
  }
  if (level >= 14) {
    effects.push(`Lv14: 所有怪物获得虚空护盾（魔抗*1.5）`);
  }
  if (level >= 15) {
    effects.push(`Lv15: Boss半血时攻速 +30%`);
  }
  if (level >= 17) {
    effects.push(`Lv17: 怪物攻击速度 +15%`);
  }
  if (level >= 19) {
    effects.push(`Lv19: 怪物密度 +20%`);
  }
  if (level >= 20) {
    effects.push(`Lv20: 怪物HP<30%时防御 +50%`);
  }
  if (level >= 22) {
    effects.push(`Lv22: 精英怪可能获得3个词缀`);
  }
  if (level >= 24) {
    effects.push(`Lv24: 怪物移速再 +10%（累计 +20%）`);
  }
  if (level >= 25) {
    effects.push(`Lv25: 每层必定生成诅咒祭坛`);
  }
  
  return effects;
}

// 将噩梦层级（1-25）映射为排行榜使用的难度字符串
// 用于向后兼容数据库和UI的字符串格式要求
export function getDifficultyString(ascensionLevel) {
  if (ascensionLevel <= 8) {
    return 'normal';
  } else if (ascensionLevel <= 16) {
    return 'hard';
  } else {
    return 'nightmare';
  }
}

// 获取指定层级的新增效果描述（仅显示该层级新增的效果）
export function getAscensionLevelNewEffect(level) {
  const newEffects = [];
  
  // 检查每个层级的新增效果
  if (level === 1) {
    newEffects.push('精英怪概率提升');
  } else if (level === 3) {
    newEffects.push('仇恨范围 +2');
  } else if (level === 5) {
    newEffects.push('Boss HP +30%');
  } else if (level === 7) {
    newEffects.push('怪物移速 +10%');
  } else if (level === 10) {
    newEffects.push('精英怪2个词缀');
  } else if (level === 12) {
    newEffects.push('陷阱密度/伤害 +50%');
  } else if (level === 14) {
    newEffects.push('虚空护盾');
  } else if (level === 15) {
    newEffects.push('Boss狂暴');
  } else if (level === 17) {
    newEffects.push('攻击速度 +15%');
  } else if (level === 19) {
    newEffects.push('怪物密度 +20%');
  } else if (level === 20) {
    newEffects.push('残血加防');
  } else if (level === 22) {
    newEffects.push('精英3词缀（概率）');
  } else if (level === 24) {
    newEffects.push('移速再 +10%');
  } else if (level === 25) {
    newEffects.push('必定诅咒祭坛');
  }
  
  return newEffects.length > 0 ? newEffects.join('，') : '标准成长';
}

