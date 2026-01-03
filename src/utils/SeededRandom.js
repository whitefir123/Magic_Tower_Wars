// SeededRandom.js - 基于种子的确定性随机数生成器
// 使用 Mulberry32 算法实现

/**
 * SeededRandom - 确定性随机数生成器
 * 使用相同的种子会生成相同的随机数序列
 */
export class SeededRandom {
  /**
   * 构造函数
   * @param {number} seed - 种子值（整数）
   */
  constructor(seed) {
    this.seed = seed || 0;
  }

  /**
   * Mulberry32 算法核心
   * 生成下一个内部状态
   * @private
   */
  _next() {
    let t = this.seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }

  /**
   * 返回 0-1 之间的浮点数
   * @returns {number} 0-1 之间的随机浮点数
   */
  next() {
    return this._next();
  }

  /**
   * 返回指定范围内的整数
   * @param {number} min - 最小值（包含）
   * @param {number} max - 最大值（包含）
   * @returns {number} min 到 max 之间的随机整数
   */
  nextInt(min, max) {
    if (min === undefined) min = 0;
    if (max === undefined) max = Number.MAX_SAFE_INTEGER;
    
    // 确保 min <= max
    if (min > max) {
      [min, max] = [max, min];
    }
    
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  /**
   * 从数组中随机选择一个元素
   * @param {Array} array - 数组
   * @returns {*} 随机选择的元素
   */
  choice(array) {
    if (!array || array.length === 0) {
      return null;
    }
    const index = this.nextInt(0, array.length - 1);
    return array[index];
  }

  /**
   * 打乱数组（Fisher-Yates 洗牌算法）
   * @param {Array} array - 要打乱的数组（会被修改）
   * @returns {Array} 打乱后的数组（原数组）
   */
  shuffle(array) {
    if (!array || array.length === 0) {
      return array;
    }
    
    for (let i = array.length - 1; i > 0; i--) {
      const j = this.nextInt(0, i);
      [array[i], array[j]] = [array[j], array[i]];
    }
    
    return array;
  }

  /**
   * 返回指定范围内的浮点数
   * @param {number} min - 最小值
   * @param {number} max - 最大值
   * @returns {number} min 到 max 之间的随机浮点数
   */
  nextFloat(min, max) {
    if (min === undefined) min = 0;
    if (max === undefined) max = 1;
    
    if (min > max) {
      [min, max] = [max, min];
    }
    
    return this.next() * (max - min) + min;
  }
}

