// Character Data - 角色数据

// Character Selection Database
export const CHARACTERS = {
  WARRIOR: {
    id: 'WARRIOR',
    name: '战士',
    desc: '平衡型战士，拥有中等的攻击和防御。',
    stats: { hp: 100, maxHp: 100, p_atk: 15, p_def: 5, m_atk: 0, m_def: 0, rage: 0, mp: 60, maxMp: 60, mp_regen: 1.0, mp_on_hit: 2 },
    base_as: 1.0,
    skills: {
      PASSIVE: { name: '铁皮', iconIndex: 0, desc: '防御力提升20%' },
      ACTIVE: { id: 'slash', name: '斩击', key: 'Q', cd: 5000, iconIndex: 1, manaCost: 20, desc: '下次攻击造成150%伤害' },
      ULT: { id: 'berserk', name: '狂暴', key: 'SPACE', cd: 20000, iconIndex: 2, desc: '进入5秒狂暴：物攻+50%，下5次攻击必定暴击' }
    },
    asset: 'PLAYER_WARRIOR',
    portrait: 'PORTRAIT_WARRIOR'
  },
  MAGE: {
    id: 'MAGE',
    name: '法师',
    desc: '高伤害低生命的魔法使者。',
    stats: { hp: 60, maxHp: 60, p_atk: 5, p_def: 2, m_atk: 20, m_def: 10, rage: 0, mp: 200, maxMp: 200, mp_regen: 5.0, mp_on_hit: 1 },
    base_as: 0.8,
    skills: {
      PASSIVE: { name: '魔力流', iconIndex: 3, desc: '魔攻提升25%' },
      ACTIVE: { id: 'scorch', name: '灼烧', key: 'Q', cd: 8000, iconIndex: 4, manaCost: 30, desc: '下次攻击附加灼烧：每秒造成目标最大生命2%伤害，持续5秒' },
      ULT: { id: 'glacial', name: '冰墓', key: 'SPACE', cd: 25000, iconIndex: 5, desc: '下次攻击附加冰封：冻结目标并每秒造成最大生命3%伤害，持续5秒' }
    },
    asset: 'PLAYER_MAGE',
    portrait: 'PORTRAIT_MAGE'
  },
  ROGUE: {
    id: 'ROGUE',
    name: '盗贼',
    desc: '速度型角色，擅长闪避和爆发伤害。',
    stats: { hp: 70, maxHp: 70, p_atk: 18, p_def: 5, m_atk: 8, m_def: 4, rage: 0, mp: 100, maxMp: 100, mp_regen: 3.0, mp_on_hit: 4 },
    base_as: 1.3,
    skills: {
      PASSIVE: { name: '影舞', iconIndex: 6, desc: '闪避率提升20%' },
      ACTIVE: { id: 'backstab', name: '背刺', key: 'Q', cd: 6000, iconIndex: 7, manaCost: 25, desc: '下次攻击从背后发动，造成200%伤害' },
      ULT: { id: 'shadow_clone', name: '影分身', key: 'SPACE', cd: 22000, iconIndex: 8, manaCost: 40, desc: '下三次攻击，你的影子将会同步攻击敌人的背部' }
    },
    asset: 'PLAYER_ROGUE',
    portrait: 'PORTRAIT_ROGUE'
  },
  PALADIN: {
    id: 'PALADIN',
    name: '圣骑士',
    desc: '防御型坦克，拥有强大的防护能力。',
    stats: { hp: 120, maxHp: 120, p_atk: 12, p_def: 12, m_atk: 8, m_def: 8, rage: 0, mp: 120, maxMp: 120, mp_regen: 2.0, mp_on_hit: 2 },
    base_as: 0.7,
    skills: {
      PASSIVE: { name: '圣盾', iconIndex: 0, desc: '防御力提升30%' },
      ACTIVE: { id: 'shield_bash', name: '盾击', key: 'Q', cd: 5500, iconIndex: 1, manaCost: 25 },
      ULT: { id: 'divine_protection', name: '神圣庇护', key: 'SPACE', cd: 23000, iconIndex: 2 }
    },
    asset: 'PLAYER'
  },
  RANGER: {
    id: 'RANGER',
    name: '游侠',
    desc: '远程输出角色，攻击速度快。',
    stats: { hp: 80, maxHp: 80, p_atk: 16, p_def: 6, m_atk: 10, m_def: 5, rage: 0, mp: 100, maxMp: 100, mp_regen: 3.0, mp_on_hit: 3 },
    base_as: 1.2,
    skills: {
      PASSIVE: { name: '快速射击', iconIndex: 3, desc: '攻击速度提升40%' },
      ACTIVE: { id: 'multi_shot', name: '多重射击', key: 'Q', cd: 7000, iconIndex: 4, manaCost: 25 },
      ULT: { id: 'arrow_rain', name: '箭雨', key: 'SPACE', cd: 24000, iconIndex: 5 }
    },
    asset: 'PLAYER'
  },
  NECROMANCER: {
    id: 'NECROMANCER',
    name: '死灵法师',
    desc: '诅咒系法师，可以召唤亡灵仆从。',
    stats: { hp: 75, maxHp: 75, p_atk: 10, p_def: 4, m_atk: 22, m_def: 7, rage: 0, mp: 150, maxMp: 150, mp_regen: 4.0, mp_on_hit: 2 },
    base_as: 0.75,
    skills: {
      PASSIVE: { name: '死亡光环', iconIndex: 6, desc: '魔攻提升20%' },
      ACTIVE: { id: 'curse_bolt', name: '诅咒箭', key: 'Q', cd: 8500, iconIndex: 7, manaCost: 30 },
      ULT: { id: 'undead_army', name: '亡灵军团', key: 'SPACE', cd: 26000, iconIndex: 8 }
    },
    asset: 'PLAYER'
  }
};

