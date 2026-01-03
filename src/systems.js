// systems.js - 重构后的系统导出文件
// 此文件重新导出所有拆分后的模块以保持向后兼容

// 重新导出系统模块
export { MapSystem } from './systems/MapSystem.js';
export { CombatSystem } from './systems/CombatSystem.js';
export { RoguelikeSystem } from './systems/RoguelikeSystem.js';

// 重新导出 UI 模块
export { UIManager } from './ui/UIManager.js';
export { BestiaryUI as BestiarySystem } from './ui/BestiaryUI.js';

// 注意：UIManager 类的完整实现已移至 src/ui/UIManager.js
// 此文件仅保留导出语句以保持向后兼容
