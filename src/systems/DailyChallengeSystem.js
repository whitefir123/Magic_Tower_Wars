// DailyChallengeSystem.js - 每日挑战系统
// 基于 UTC 日期生成每日挑战配置

import { SeededRandom } from '../utils/SeededRandom.js';
import { DAILY_MODIFIERS } from '../constants.js';
import { CHARACTERS } from '../constants.js';
import { RUNE_POOL } from '../data/Runes.js';

/**
 * DailyChallengeSystem - 每日挑战系统
 * 负责生成每日挑战的配置（角色、词缀、初始遗物）
 */
export class DailyChallengeSystem {
  /**
   * 获取每日种子（基于 UTC 日期）
   * @returns {number} 每日种子值
   */
  static getDailySeed() {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    const day = String(now.getUTCDate()).padStart(2, '0');
    
    // 生成 YYYYMMDD 格式的数字种子
    const dateString = `${year}${month}${day}`;
    return parseInt(dateString, 10);
  }

  /**
   * 获取每日挑战配置
   * @returns {Object} 每日挑战配置
   * {
   *   seed: number,              // 每日种子
   *   character: string,          // 限定角色ID (WARRIOR/MAGE/ROGUE)
   *   modifiers: Array,           // 词缀数组 [1正面, 2负面]
   *   startingRune: Object,       // 初始遗物（符文对象）
   *   rng: SeededRandom          // 用于生成地图和掉落的RNG实例
   * }
   */
  static getDailyConfig() {
    const seed = this.getDailySeed();
    const rng = new SeededRandom(seed);
    
    // === 1. 确定今日限定角色 ===
    const availableCharacters = ['WARRIOR', 'MAGE', 'ROGUE'];
    const character = rng.choice(availableCharacters);
    
    // === 2. 确定今日词缀（1正面 + 2负面） ===
    const positiveModifiers = Object.values(DAILY_MODIFIERS).filter(m => m.type === 'positive');
    const negativeModifiers = Object.values(DAILY_MODIFIERS).filter(m => m.type === 'negative');
    
    // 随机选择1个正面词缀
    const selectedPositive = rng.choice(positiveModifiers);
    
    // 随机选择2个负面词缀（不重复）
    const selectedNegatives = [];
    const negativePool = [...negativeModifiers];
    for (let i = 0; i < 2 && negativePool.length > 0; i++) {
      const index = rng.nextInt(0, negativePool.length - 1);
      selectedNegatives.push(negativePool[index]);
      negativePool.splice(index, 1); // 移除已选择的，避免重复
    }
    
    const modifiers = [selectedPositive, ...selectedNegatives];
    
    // === 3. 确定初始遗物（从符文池中随机选择一个） ===
    // 过滤掉诅咒类符文，初始遗物应该是正面效果
    // 防御性检查：确保 RUNE_POOL 存在
    const pool = RUNE_POOL || [];
    const availableRunes = pool.filter(rune => rune.rarity !== 'CURSED');
    // 如果没有可用符文，提供一个完整的默认符文对象
    const startingRune = rng.choice(availableRunes) || { 
      id: 'might', 
      name: 'Might', 
      nameZh: '蛮力',
      type: 'STAT',
      rarity: 'COMMON', 
      description: '物理攻击力 +1',
      onObtain: (player) => {
        if (!player.runeState) player.runeState = { effects: {}, bonusStats: {} };
        if (!player.runeState.bonusStats) player.runeState.bonusStats = {};
        player.runeState.bonusStats.p_atk = (player.runeState.bonusStats.p_atk || 0) + 1;
      }
    };
    
    // === 4. 随机决定战争迷雾和动态光照（各 50% 概率） ===
    const enableFog = rng.nextFloat() < 0.5;
    const enableLighting = rng.nextFloat() < 0.5;
    
    return {
      seed,
      character,
      modifiers,
      startingRune,
      rng,
      enableFog,      // ✅ 新增：战争迷雾（随机）
      enableLighting // ✅ 新增：动态光照（随机）
    };
  }

  /**
   * 获取今日挑战的显示信息（用于UI）
   * @returns {Object} 显示信息
   */
  static getDailyInfo() {
    const config = this.getDailyConfig();
    
    return {
      seed: config.seed,
      character: {
        id: config.character,
        name: CHARACTERS[config.character]?.name || config.character,
        desc: CHARACTERS[config.character]?.desc || ''
      },
      modifiers: config.modifiers.map(mod => ({
        id: mod.id,
        name: mod.name,
        nameEn: mod.nameEn,
        type: mod.type,
        description: mod.description,
        descriptionEn: mod.descriptionEn
      })),
      startingRune: {
        id: config.startingRune.id,
        name: config.startingRune.name,
        nameZh: config.startingRune.nameZh,
        description: config.startingRune.description
      },
      enableFog: config.enableFog,           // ✅ 新增：战争迷雾设置
      enableLighting: config.enableLighting   // ✅ 新增：动态光照设置
    };
  }
}

