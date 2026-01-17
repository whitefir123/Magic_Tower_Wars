/**
 * constants.js
 * 这是一个汇聚文件 (Aggregator)，用于重新导出 src/data/ 目录下的所有常量。
 * 这样做是为了保持向后兼容，确保项目中现有的 import 语句不需要修改。
 */

// 基础配置
export * from './data/config.js';

// 资源配置
export * from './data/assets.js';

// 战斗系统
export * from './data/combat.js';

// 角色数据
export * from './data/characters.js';

// 游戏提示
export * from './data/tips.js';

// 难度与层级系统
export * from './data/ascension.js';

// 掉落与品质
export * from './data/loot.js';

// 物品数据库
export * from './data/items.js';

// 套装配置
export * from './data/sets.js';

// 怪物数据
export * from './data/monsters.js';

// 怪物标签系统
export const MONSTER_TAGS = {
  UNDEAD: { name: '亡灵', color: '#a0a0a0' },      // 深灰
  CONSTRUCT: { name: '构装', color: '#b08d55' },   // 铜色
  BEAST: { name: '野兽', color: '#8b4513' },       // 棕色
  HUMANOID: { name: '人形', color: '#e0c0a0' },    // 肤色
  ELEMENTAL: { name: '元素', color: '#4da6ff' },   // 亮蓝
  DEMON: { name: '恶魔', color: '#ff3333' },       // 红色
  FLYING: { name: '飞行', color: '#87ceeb' },      // 天蓝
  BOSS: { name: '首领', color: '#ffd700' },        // 金色
  NATURE: { name: '自然', color: '#4caf50' },      // 绿色
  SPIRIT: { name: '灵体', color: '#e6e6fa' }       // 淡紫
};

// 系统对象配置 (Buffs, Objects, Shop etc.)
export * from './data/system.js';

// 符文系统数据
export * from './data/Runes.js';

// 铁匠系统增强数据模型
export * from './data/forgeModels.js';
