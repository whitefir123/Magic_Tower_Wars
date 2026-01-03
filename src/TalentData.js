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
    BERSERKER: 'BERSERKER'                // 狂战士：低生命时攻击提升
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
        dodge: 0
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

