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

// 系统对象配置 (Buffs, Objects, Shop etc.)
export * from './data/system.js';

// 符文系统数据
export * from './data/Runes.js';
