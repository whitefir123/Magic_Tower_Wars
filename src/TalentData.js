/**
 * TalentData.js
 * 
 * POE风格天赋树数据定义
 * 包含节点类型、属性加成、关键石效果等
 */

// 节点类型定义
export const TALENT_NODE_TYPES = {
    ROOT: 'ROOT',           // 起始节点
    SMALL: 'SMALL',         // 小型节点（基础属性）
    MEDIUM: 'MEDIUM',       // 中型节点（被动效果）
    KEYSTONE: 'KEYSTONE'    // 关键石（重大机制改变）
};

// 关键石效果定义
export const KEYSTONE_EFFECTS = {
    BLOOD_MAGIC: 'BLOOD_MAGIC',           // 血魔法：使用生命代替魔力
    IRON_WILL: 'IRON_WILL',               // 钢铁意志：力量加成魔法攻击
    SOUL_REAPER: 'SOUL_REAPER',           // 灵魂收割：击杀回复生命
    CRITICAL_MASTER: 'CRITICAL_MASTER',   // 暴击大师：暴击伤害大幅提升
    BERSERKER: 'BERSERKER',               // 狂战士：低生命时攻击提升
    UNYIELDING_FORTRESS: 'UNYIELDING_FORTRESS', // 不屈堡垒：防御+20% (最终乘算), 移速-10%
    GOLDEN_TOUCH: 'GOLDEN_TOUCH',               // 点石成金：金币+30%, 受伤+10%
    DRAGON_SLAYER: 'DRAGON_SLAYER',              // 屠龙者：对Boss/精英伤害+20% (独立乘区)
    SONIC_BREAKER: 'SONIC_BREAKER',       // 音障突破：攻击速度+40%，但物理攻击-10%
    DEAD_EYE: 'DEAD_EYE',                  // 死神之眼：暴击率+10%，暴击伤害+50%
    LION_HEART: 'LION_HEART',              // 狮子心：最终受到的伤害减少 10%，物理攻击 +10%
    ARCANE_RHYTHM: 'ARCANE_RHYTHM'         // 奥术韵律：技能冷却时间减少 15%，最大魔力 +20%
};

// 天赋树节点数据
export const TALENT_TREE_DATA = {
    // ========== 根节点 (天球中心) ==========
    'root': {
        id: 'root',
        x: 0,
        y: 0,
        type: TALENT_NODE_TYPES.ROOT,
        name: '起源',
        description: '你的冒险起点',
        cost: 0,
        stats: {},
        requirements: [],
        unlocked: true
    },

    // ========== 力量分支：猎户座 (Orion) - 上方 ==========
    // 猎户座腰带 (The Belt)
    'str_1': {
        id: 'str_1',
        x: -20,
        y: -130, // 参宿三 (Mintaka)
        type: TALENT_NODE_TYPES.SMALL,
        name: '猎户腰带·一',
        description: '基础力量训练',
        cost: 100,
        stats: { p_atk: 3, max_hp: 15 },
        requirements: ['root']
    },
    'str_2': {
        id: 'str_2',
        x: -50,
        y: -160, // 参宿二 (Alnilam)
        type: TALENT_NODE_TYPES.SMALL,
        name: '猎户腰带·二',
        description: '进阶力量训练',
        cost: 150,
        stats: { p_atk: 5, max_hp: 25 },
        requirements: ['str_1']
    },
    // ========== 勇气分支：狮子座 (Leo) - 勇气与统御 [从 str_2 向左上延伸] ==========
    'leo_1': {
        id: 'leo_1',
        x: -110,
        y: -190, // 狮子座起始位置
        type: TALENT_NODE_TYPES.SMALL,
        name: '狮子·勇气',
        description: '基础勇气训练',
        cost: 200,
        stats: { max_hp: 40, p_def: 3 },
        requirements: ['str_2']
    },
    'leo_2': {
        id: 'leo_2',
        x: -160,
        y: -230, // 狮子座延伸
        type: TALENT_NODE_TYPES.SMALL,
        name: '狮子·统御',
        description: '进阶勇气训练',
        cost: 300,
        stats: { p_atk: 8 },
        requirements: ['leo_1']
    },
    'leo_medium': {
        id: 'leo_medium',
        x: -210,
        y: -270, // 狮子座核心
        type: TALENT_NODE_TYPES.MEDIUM,
        name: '狮子·王者',
        description: '大幅提升勇气能力',
        cost: 700,
        stats: { max_hp: 80, p_atk_percent: 0.05 },
        requirements: ['leo_2']
    },
    'keystone_lion': {
        id: 'keystone_lion',
        x: -260,
        y: -310, // 狮子座终点
        type: TALENT_NODE_TYPES.KEYSTONE,
        name: '狮子心',
        description: '最终受到的伤害减少 10%，物理攻击 +10%',
        cost: 2500,
        stats: { final_dmg_reduce: 0.10, p_atk_percent: 0.10 },
        keystoneEffect: KEYSTONE_EFFECTS.LION_HEART,
        requirements: ['leo_medium']
    },
    'str_3': {
        id: 'str_3',
        x: -80,
        y: -190, // 参宿一 (Alnitak)
        type: TALENT_NODE_TYPES.SMALL,
        name: '猎户腰带·三',
        description: '坚韧体魄',
        cost: 150,
        stats: { p_def: 3, max_hp: 30 },
        requirements: ['str_2']
    },
    // 猎户座腿部 (The Knees) - 参宿七 (Rigel) - 蓝超巨星
    'str_medium': {
        id: 'str_medium',
        x: 60,
        y: -280, // Rigel 位置
        type: TALENT_NODE_TYPES.MEDIUM,
        name: '参宿七·战意',
        description: '大幅提升物理能力',
        cost: 400,
        stats: { p_atk: 10, p_def: 5, max_hp: 50 },
        requirements: ['str_3'] // 从腰带延伸
    },
    // 猎户座肩部 (The Shoulders) - 参宿四 (Betelgeuse) - 红超巨星
    'keystone_berserker': {
        id: 'keystone_berserker',
        x: -180,
        y: -350, // Betelgeuse 位置
        type: TALENT_NODE_TYPES.KEYSTONE,
        name: '参宿四·狂暴',
        description: '生命值低于50%时，物理攻击+30%',
        cost: 1500,
        stats: { p_atk: 8 },
        keystoneEffect: KEYSTONE_EFFECTS.BERSERKER,
        requirements: ['str_3'] // 从腰带另一端延伸
    },

    // ========== 智力分支：仙后座 (Cassiopeia) - 右下 ==========
    // 经典的 "W" 形状
    'int_1': {
        id: 'int_1',
        x: 100,
        y: 80, // 王良四 (Caph) - W的起点
        type: TALENT_NODE_TYPES.SMALL,
        name: '王良四·智慧',
        description: '基础魔法训练',
        cost: 100,
        stats: { m_atk: 3, max_mp: 10 },
        requirements: ['root']
    },
    'int_2': {
        id: 'int_2',
        x: 180,
        y: 180, // 王良一 (Shedar) - W的第一个谷底
        type: TALENT_NODE_TYPES.SMALL,
        name: '王良一·洞察',
        description: '进阶魔法训练',
        cost: 150,
        stats: { m_atk: 5, max_mp: 15 },
        requirements: ['int_1']
    },
    // ========== 韵律分支：天琴座 (Lyra) - 韵律与回响 [从 int_2 向右下延伸] ==========
    'lyra_1': {
        id: 'lyra_1',
        x: 200,
        y: 240, // 天琴座起始位置
        type: TALENT_NODE_TYPES.SMALL,
        name: '天琴·韵律',
        description: '基础韵律训练',
        cost: 200,
        stats: { max_mp: 30, m_def: 3 },
        requirements: ['int_2']
    },
    'lyra_2': {
        id: 'lyra_2',
        x: 230,
        y: 300, // 天琴座延伸
        type: TALENT_NODE_TYPES.SMALL,
        name: '天琴·回响',
        description: '进阶韵律训练',
        cost: 300,
        stats: { m_atk: 8, max_mp: 40 },
        requirements: ['lyra_1']
    },
    'lyra_medium': {
        id: 'lyra_medium',
        x: 260,
        y: 360, // 天琴座核心
        type: TALENT_NODE_TYPES.MEDIUM,
        name: '天琴·共鸣',
        description: '大幅提升韵律能力',
        cost: 700,
        stats: { cooldown_reduction: 0.05, m_atk_percent: 0.05 },
        requirements: ['lyra_2']
    },
    'keystone_rhythm': {
        id: 'keystone_rhythm',
        x: 290,
        y: 420, // 天琴座终点
        type: TALENT_NODE_TYPES.KEYSTONE,
        name: '奥术韵律',
        description: '技能冷却时间减少 15%，最大魔力 +20%',
        cost: 2500,
        stats: { cooldown_reduction: 0.15, max_mp_percent: 0.20 },
        keystoneEffect: KEYSTONE_EFFECTS.ARCANE_RHYTHM,
        requirements: ['lyra_medium']
    },
    'int_3': {
        id: 'int_3',
        x: 260,
        y: 100, // 策 (Cih) - W的中间峰
        type: TALENT_NODE_TYPES.SMALL,
        name: '策·护盾',
        description: '提升魔法防御',
        cost: 150,
        stats: { m_def: 4, max_mp: 12 },
        requirements: ['int_2']
    },
    'int_medium': {
        id: 'int_medium',
        x: 340,
        y: 200, // 阁道三 (Ruchbah) - W的第二个谷底
        type: TALENT_NODE_TYPES.MEDIUM,
        name: '阁道三·奥术',
        description: '大幅提升魔法能力',
        cost: 400,
        stats: { m_atk: 12, m_def: 6, max_mp: 30 },
        requirements: ['int_3']
    },
    'keystone_iron_will': {
        id: 'keystone_iron_will',
        x: 450,
        y: 60, // 阁道二 (Segin) - W的终点，向外扬起
        type: TALENT_NODE_TYPES.KEYSTONE,
        name: '阁道二·意志',
        description: '力量属性的50%转化为魔法攻击加成',
        cost: 1500,
        stats: { m_atk: 10 },
        keystoneEffect: KEYSTONE_EFFECTS.IRON_WILL,
        requirements: ['int_medium']
    },

    // ========== 灵巧分支：天蝎座 (Scorpius) - 左下 ==========
    // 巨大的钩子形状 "J" 或 "S"
    'dex_1': {
        id: 'dex_1',
        x: -100,
        y: 60, // 房宿四 (Dschubba) - 蝎子头部
        type: TALENT_NODE_TYPES.SMALL,
        name: '天蝎·螯',
        description: '基础敏捷训练',
        cost: 100,
        stats: { crit_rate: 2, dodge: 1 },
        requirements: ['root']
    },
    'dex_2': {
        id: 'dex_2',
        x: -160,
        y: 140, // 心宿二 (Antares) - 蝎子之心，红色亮星
        type: TALENT_NODE_TYPES.SMALL,
        name: '心宿二·赤星',
        description: '进阶敏捷训练',
        cost: 150,
        stats: { crit_rate: 3, dodge: 2 },
        requirements: ['dex_1']
    },
    'dex_3': {
        id: 'dex_3',
        x: -140,
        y: 240, // 尾部开始弯曲
        type: TALENT_NODE_TYPES.SMALL,
        name: '天蝎·尾',
        description: '提升命中和暴击',
        cost: 150,
        stats: { crit_rate: 4, crit_dmg: 10 },
        requirements: ['dex_2']
    },
    'dex_medium': {
        id: 'dex_medium',
        x: -240,
        y: 300, // 尾部大弯钩
        type: TALENT_NODE_TYPES.MEDIUM,
        name: '天蝎·钩',
        description: '大幅提升暴击能力',
        cost: 400,
        stats: { crit_rate: 8, crit_dmg: 25, dodge: 3 },
        requirements: ['dex_3']
    },
    'keystone_critical_master': {
        id: 'keystone_critical_master',
        x: -320,
        y: 220, // 尾宿八 (Shaula) - 毒针尖端，向回钩
        type: TALENT_NODE_TYPES.KEYSTONE,
        name: '尾宿八·毒针',
        description: '暴击伤害+100%，但基础攻击-10%',
        cost: 1500,
        stats: { crit_dmg: 80, p_atk: -5 },
        keystoneEffect: KEYSTONE_EFFECTS.CRITICAL_MASTER,
        requirements: ['dex_medium']
    },

    // ========== 混合/特殊星座 (双子座/Gemini 连接点) ==========
    'hybrid_1': {
        id: 'hybrid_1',
        x: 120,
        y: -80, // 位于力量和智力之间，双子座位置
        type: TALENT_NODE_TYPES.SMALL,
        name: '双子·平衡',
        description: '全面提升',
        cost: 200,
        stats: { p_atk: 2, m_atk: 2, p_def: 2, m_def: 2 },
        requirements: ['root']
    },
    'keystone_soul_reaper': {
        id: 'keystone_soul_reaper',
        x: 220,
        y: -140, // 双子座另一颗亮星
        type: TALENT_NODE_TYPES.KEYSTONE,
        name: '双子·收割',
        description: '每击杀一个敌人，回复10%最大生命值',
        cost: 2000,
        stats: { max_hp: 100 },
        keystoneEffect: KEYSTONE_EFFECTS.SOUL_REAPER,
        requirements: ['hybrid_1']
    },
    'keystone_blood_magic': {
        id: 'keystone_blood_magic',
        x: 20,
        y: -140, // 双子座另一颗亮星（左侧）
        type: TALENT_NODE_TYPES.KEYSTONE,
        name: '双子·血魔法',
        description: '最大生命+20%，最大魔力-100%',
        cost: 2000,
        stats: { max_hp_percent: 0.20, max_mp_percent: -1.0 },
        keystoneEffect: KEYSTONE_EFFECTS.BLOOD_MAGIC,
        requirements: ['hybrid_1']
    },

    // ========== 防御分支：大熊座 (Ursa Major) - 正左方延伸 ==========
    'def_1': {
        id: 'def_1',
        x: -140,
        y: -20, // 大熊座起始位置
        type: TALENT_NODE_TYPES.SMALL,
        name: '大熊·坚盾',
        description: '基础防御训练',
        cost: 100,
        stats: { max_hp: 20, p_def: 2 },
        requirements: ['root']
    },
    'def_2': {
        id: 'def_2',
        x: -200,
        y: -40, // 大熊座延伸
        type: TALENT_NODE_TYPES.SMALL,
        name: '大熊·壁垒',
        description: '进阶防御训练',
        cost: 150,
        stats: { max_hp: 40, p_def: 4 },
        requirements: ['def_1']
    },
    'def_medium': {
        id: 'def_medium',
        x: -260,
        y: 0, // 大熊座核心
        type: TALENT_NODE_TYPES.MEDIUM,
        name: '大熊·守护',
        description: '大幅提升防御能力',
        cost: 400,
        stats: { max_hp: 80, p_def: 8, m_def: 5 },
        requirements: ['def_2']
    },
    'keystone_fortress': {
        id: 'keystone_fortress',
        x: -340,
        y: -20, // 大熊座终点
        type: TALENT_NODE_TYPES.KEYSTONE,
        name: '不屈堡垒',
        description: '最终物防+20%，移速-10%',
        cost: 1500,
        stats: { p_def: 10, m_def: 5 },
        keystoneEffect: KEYSTONE_EFFECTS.UNYIELDING_FORTRESS,
        requirements: ['def_medium']
    },

    // ========== 经济分支：天秤座 (Libra) - 正下区域 ==========
    'eco_1': {
        id: 'eco_1',
        x: 0,
        y: 130, // 天秤座起始位置（稍微下移一点避开根部拥挤）
        type: TALENT_NODE_TYPES.SMALL,
        name: '天秤·财富',
        description: '基础经济训练',
        cost: 120,
        stats: { gold_rate: 0.05, max_mp: 10 },
        requirements: ['root']
    },
    'eco_2': {
        id: 'eco_2',
        x: 0,
        y: 200, // 天秤座延伸
        type: TALENT_NODE_TYPES.SMALL,
        name: '天秤·繁荣',
        description: '进阶经济训练',
        cost: 200,
        stats: { gold_rate: 0.10, max_mp: 20 },
        requirements: ['eco_1']
    },
    'eco_medium': {
        id: 'eco_medium',
        x: 0,
        y: 270, // 天秤座核心
        type: TALENT_NODE_TYPES.MEDIUM,
        name: '天秤·平衡',
        description: '大幅提升经济能力',
        cost: 500,
        stats: { gold_rate: 0.15, p_atk: 5, m_atk: 5 },
        requirements: ['eco_2']
    },
    'keystone_golden': {
        id: 'keystone_golden',
        x: 0,
        y: 350, // 天秤座终点
        type: TALENT_NODE_TYPES.KEYSTONE,
        name: '点石成金',
        description: '金币获取+30%，受到伤害+10%',
        cost: 1800,
        stats: { gold_rate: 0.30 },
        keystoneEffect: KEYSTONE_EFFECTS.GOLDEN_TOUCH,
        requirements: ['eco_medium']
    },

    // ========== 穿透分支：天龙座 (Draco) - 正右方延伸，避开双子座 ==========
    'pen_1': {
        id: 'pen_1',
        x: 160,
        y: -20, // 天龙座起始位置
        type: TALENT_NODE_TYPES.SMALL,
        name: '天龙·利爪',
        description: '基础穿透训练',
        cost: 150,
        stats: { armor_pen: 0.03, p_atk: 4 },
        requirements: ['root']
    },
    'pen_2': {
        id: 'pen_2',
        x: 230,
        y: 20, // 天龙座延伸（稍微向下弯曲）
        type: TALENT_NODE_TYPES.SMALL,
        name: '天龙·尖牙',
        description: '进阶穿透训练',
        cost: 250,
        stats: { armor_pen: 0.05, m_atk: 4 },
        requirements: ['pen_1']
    },
    'pen_medium': {
        id: 'pen_medium',
        x: 300,
        y: -10, // 天龙座核心
        type: TALENT_NODE_TYPES.MEDIUM,
        name: '天龙·龙息',
        description: '大幅提升穿透能力',
        cost: 600,
        stats: { armor_pen: 0.10, crit_dmg: 0.15 },
        requirements: ['pen_2']
    },
    'keystone_dragon': {
        id: 'keystone_dragon',
        x: 380,
        y: 30, // 天龙座终点
        type: TALENT_NODE_TYPES.KEYSTONE,
        name: '屠龙者',
        description: '对Boss/精英怪伤害独立+20%',
        cost: 2000,
        stats: { p_atk: 8, m_atk: 8 },
        keystoneEffect: KEYSTONE_EFFECTS.DRAGON_SLAYER,
        requirements: ['pen_medium']
    },

    // ========== 攻速分支：天鹅座 (Cygnus) - 极速与残影 [从 dex_2 向左下延伸] ==========
    'cyg_1': {
        id: 'cyg_1',
        x: -220,
        y: 160, // 天鹅座起始位置
        type: TALENT_NODE_TYPES.SMALL,
        name: '天鹅·振翅',
        description: '基础攻速训练',
        cost: 180,
        stats: { atk_speed: 0.05, dodge: 0.02 },
        requirements: ['dex_2']
    },
    'cyg_2': {
        id: 'cyg_2',
        x: -280,
        y: 180, // 天鹅座延伸
        type: TALENT_NODE_TYPES.SMALL,
        name: '天鹅·疾风',
        description: '进阶攻速训练',
        cost: 280,
        stats: { atk_speed: 0.08 },
        requirements: ['cyg_1']
    },
    'cyg_medium': {
        id: 'cyg_medium',
        x: -340,
        y: 200, // 天鹅座核心
        type: TALENT_NODE_TYPES.MEDIUM,
        name: '天鹅·残影',
        description: '大幅提升攻速能力',
        cost: 650,
        stats: { atk_speed: 0.12, crit_rate: 0.03 },
        requirements: ['cyg_2']
    },
    'keystone_sonic': {
        id: 'keystone_sonic',
        x: -400,
        y: 220, // 天鹅座终点
        type: TALENT_NODE_TYPES.KEYSTONE,
        name: '音障突破',
        description: '攻击速度+40%，但物理攻击-10%',
        cost: 2200,
        stats: { atk_speed: 0.40, p_atk_percent: -0.10 },
        keystoneEffect: KEYSTONE_EFFECTS.SONIC_BREAKER,
        requirements: ['cyg_medium']
    },

    // ========== 暴击分支：人马座 (Sagittarius) - 弱点狙击 [从 pen_1 向右上延伸] ==========
    'sag_1': {
        id: 'sag_1',
        x: 220,
        y: -60, // 人马座起始位置
        type: TALENT_NODE_TYPES.SMALL,
        name: '人马·瞄准',
        description: '基础暴击训练',
        cost: 180,
        stats: { crit_dmg: 10, p_atk: 3 },
        requirements: ['pen_1']
    },
    'sag_2': {
        id: 'sag_2',
        x: 280,
        y: -100, // 人马座延伸
        type: TALENT_NODE_TYPES.SMALL,
        name: '人马·精准',
        description: '进阶暴击训练',
        cost: 280,
        stats: { crit_dmg: 15, armor_pen: 0.02 },
        requirements: ['sag_1']
    },
    'sag_medium': {
        id: 'sag_medium',
        x: 340,
        y: -140, // 人马座核心
        type: TALENT_NODE_TYPES.MEDIUM,
        name: '人马·狙击',
        description: '大幅提升暴击能力',
        cost: 650,
        stats: { crit_rate: 0.05, crit_dmg: 20 },
        requirements: ['sag_2']
    },
    'keystone_deadeye': {
        id: 'keystone_deadeye',
        x: 400,
        y: -180, // 人马座终点
        type: TALENT_NODE_TYPES.KEYSTONE,
        name: '死神之眼',
        description: '暴击率+10%，暴击伤害+50%',
        cost: 2500,
        stats: { crit_rate: 0.10, crit_dmg: 50 },
        keystoneEffect: KEYSTONE_EFFECTS.DEAD_EYE,
        requirements: ['sag_medium']
    }
};

/**
 * 获取节点的可达性（是否满足前置条件）
 * @param {string} nodeId - 节点ID
 * @param {Array<string>} unlockedIds - 已解锁的节点ID列表
 * @returns {boolean}
 */
export function isNodeReachable(nodeId, unlockedIds) {
    const node = TALENT_TREE_DATA[nodeId];
    if (!node) return false;
    
    // 根节点总是可达
    if (node.type === TALENT_NODE_TYPES.ROOT) return true;
    
    // 检查是否至少有一个前置节点已解锁
    if (!node.requirements || node.requirements.length === 0) return false;
    
    return node.requirements.some(reqId => unlockedIds.includes(reqId));
}

/**
 * 获取节点的连接线信息
 * @returns {Array<{from: string, to: string}>}
 */
export function getTalentTreeConnections() {
    const connections = [];
    
    Object.values(TALENT_TREE_DATA).forEach(node => {
        if (node.requirements && node.requirements.length > 0) {
            node.requirements.forEach(reqId => {
                connections.push({
                    from: reqId,
                    to: node.id
                });
            });
        }
    });
    
    return connections;
}

/**
 * 计算所有已解锁天赋的总属性加成
 * @param {Array<string>} unlockedIds - 已解锁的节点ID列表
 * @returns {Object} 总属性加成
 */
export function calculateTotalStats(unlockedIds) {
    const totalStats = {
        p_atk: 0,
        m_atk: 0,
        p_def: 0,
        m_def: 0,
        max_hp: 0,
        max_mp: 0,
        crit_rate: 0,
        crit_dmg: 0,
        dodge: 0,
        gold_rate: 0,  // ✅ 新增：金币获取倍率
        armor_pen: 0,   // ✅ 新增：护甲穿透
        atk_speed: 0,   // ✅ 新增：攻击速度
        p_atk_percent: 0, // ✅ 新增：物理攻击百分比
        cooldown_reduction: 0, // ✅ 新增：冷却缩减
        final_dmg_reduce: 0,   // ✅ 新增：最终减伤
        max_hp_percent: 0,     // ✅ 新增：最大生命百分比
        max_mp_percent: 0,     // ✅ 新增：最大魔力百分比
        m_atk_percent: 0       // ✅ 新增：魔法攻击百分比
    };
    
    unlockedIds.forEach(id => {
        const node = TALENT_TREE_DATA[id];
        if (node && node.stats) {
            Object.keys(node.stats).forEach(key => {
                if (totalStats.hasOwnProperty(key)) {
                    totalStats[key] += node.stats[key];
                }
            });
        }
    });
    
    return totalStats;
}

/**
 * 获取已激活的关键石效果列表
 * @param {Array<string>} unlockedIds - 已解锁的节点ID列表
 * @returns {Array<string>} 关键石效果ID列表
 */
export function getActiveKeystones(unlockedIds) {
    const keystones = [];
    
    unlockedIds.forEach(id => {
        const node = TALENT_TREE_DATA[id];
        if (node && node.keystoneEffect) {
            keystones.push(node.keystoneEffect);
        }
    });
    
    return keystones;
}

