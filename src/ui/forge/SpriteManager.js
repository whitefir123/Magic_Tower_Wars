// SpriteManager.js - 精灵图资源管理器
// 负责加载、缓存和提取精灵图中的图标

/**
 * SpriteManager - 精灵图资源管理器
 * 提供统一的精灵图加载、缓存和图标提取功能
 */
export class SpriteManager {
  constructor() {
    // 精灵图缓存
    this.spriteSheets = new Map();
    
    // 提取的图标缓存
    this.iconCache = new Map();
    
    // 加载状态
    this.loadingPromises = new Map();
    
    // 精灵图配置
    this.spriteConfigs = {
      // 铁匠NPC精灵图 (2行3列)
      blacksmith: {
        url: 'https://i.postimg.cc/rpT0xfH5/tiejiang1.png',
        frameWidth: 64,
        frameHeight: 64,
        rows: 2,
        cols: 3,
        totalFrames: 6
      },
      
      // 装备图标精灵图 (根据实际情况配置)
      equipment: {
        url: null, // 待配置
        frameWidth: 32,
        frameHeight: 32,
        rows: 8,
        cols: 8,
        totalFrames: 64
      },
      
      // 宝石图标精灵图
      gems: {
        url: null, // 待配置
        frameWidth: 32,
        frameHeight: 32,
        rows: 4,
        cols: 4,
        totalFrames: 16
      },
      
      // 材料图标精灵图
      materials: {
        url: null, // 待配置
        frameWidth: 32,
        frameHeight: 32,
        rows: 4,
        cols: 4,
        totalFrames: 16
      },
      
      // 特效精灵图
      effects: {
        success: {
          url: null, // 待配置
          frameWidth: 64,
          frameHeight: 64,
          rows: 2,
          cols: 4,
          totalFrames: 8
        },
        failure: {
          url: null, // 待配置
          frameWidth: 64,
          frameHeight: 64,
          rows: 2,
          cols: 4,
          totalFrames: 8
        }
      }
    };
    
    console.log('✓ SpriteManager 已初始化');
  }

  /**
   * 加载精灵图
   * @param {string} spriteKey - 精灵图键名
   * @returns {Promise<HTMLImageElement>} 加载的图片对象
   */
  async loadSpriteSheet(spriteKey) {
    // 检查是否已加载
    if (this.spriteSheets.has(spriteKey)) {
      return this.spriteSheets.get(spriteKey);
    }

    // 检查是否正在加载
    if (this.loadingPromises.has(spriteKey)) {
      return this.loadingPromises.get(spriteKey);
    }

    // 获取配置
    const config = this.getSpriteConfig(spriteKey);
    if (!config || !config.url) {
      throw new Error(`精灵图配置不存在或URL未设置: ${spriteKey}`);
    }

    // 创建加载Promise
    const loadPromise = new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => {
        this.spriteSheets.set(spriteKey, img);
        this.loadingPromises.delete(spriteKey);
        console.log(`✓ 精灵图已加载: ${spriteKey}`);
        resolve(img);
      };
      
      img.onerror = () => {
        this.loadingPromises.delete(spriteKey);
        const error = new Error(`精灵图加载失败: ${spriteKey} (${config.url})`);
        console.error(error);
        reject(error);
      };
      
      img.src = config.url;
    });

    this.loadingPromises.set(spriteKey, loadPromise);
    return loadPromise;
  }

  /**
   * 获取精灵图配置
   * @param {string} spriteKey - 精灵图键名
   * @returns {Object|null} 配置对象
   */
  getSpriteConfig(spriteKey) {
    // 处理嵌套配置（如 effects.success）
    const keys = spriteKey.split('.');
    let config = this.spriteConfigs;
    
    for (const key of keys) {
      if (config[key]) {
        config = config[key];
      } else {
        return null;
      }
    }
    
    return config;
  }

  /**
   * 提取精灵图中的单个图标
   * @param {string} spriteKey - 精灵图键名
   * @param {number} frameIndex - 帧索引（从0开始）
   * @param {Object} options - 选项
   * @param {number} options.scale - 缩放比例（默认1）
   * @returns {Promise<HTMLCanvasElement>} 提取的图标canvas
   */
  async extractIcon(spriteKey, frameIndex, options = {}) {
    const { scale = 1 } = options;
    
    // 生成缓存键
    const cacheKey = `${spriteKey}_${frameIndex}_${scale}`;
    
    // 检查缓存
    if (this.iconCache.has(cacheKey)) {
      return this.iconCache.get(cacheKey);
    }

    try {
      // 加载精灵图
      const spriteSheet = await this.loadSpriteSheet(spriteKey);
      const config = this.getSpriteConfig(spriteKey);

      // 验证帧索引
      if (frameIndex < 0 || frameIndex >= config.totalFrames) {
        throw new Error(`帧索引超出范围: ${frameIndex} (总帧数: ${config.totalFrames})`);
      }

      // 计算帧位置
      const row = Math.floor(frameIndex / config.cols);
      const col = frameIndex % config.cols;
      const sx = col * config.frameWidth;
      const sy = row * config.frameHeight;

      // 创建canvas
      const canvas = document.createElement('canvas');
      canvas.width = config.frameWidth * scale;
      canvas.height = config.frameHeight * scale;
      const ctx = canvas.getContext('2d');

      // 设置像素化渲染
      ctx.imageSmoothingEnabled = false;

      // 绘制图标
      ctx.drawImage(
        spriteSheet,
        sx, sy, config.frameWidth, config.frameHeight,
        0, 0, canvas.width, canvas.height
      );

      // 缓存结果
      this.iconCache.set(cacheKey, canvas);
      
      return canvas;
    } catch (error) {
      console.error(`提取图标失败: ${spriteKey}[${frameIndex}]`, error);
      
      // 返回回退图标
      return this.createFallbackIcon(config.frameWidth * scale, config.frameHeight * scale);
    }
  }

  /**
   * 创建回退图标（当加载失败时使用）
   * @param {number} width - 宽度
   * @param {number} height - 高度
   * @returns {HTMLCanvasElement} 回退图标canvas
   */
  createFallbackIcon(width, height) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    // 绘制灰色方块
    ctx.fillStyle = '#666';
    ctx.fillRect(0, 0, width, height);

    // 绘制问号
    ctx.fillStyle = '#fff';
    ctx.font = `${Math.floor(height * 0.6)}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('?', width / 2, height / 2);

    return canvas;
  }

  /**
   * 批量提取图标
   * @param {string} spriteKey - 精灵图键名
   * @param {number[]} frameIndices - 帧索引数组
   * @param {Object} options - 选项
   * @returns {Promise<HTMLCanvasElement[]>} 提取的图标数组
   */
  async extractIcons(spriteKey, frameIndices, options = {}) {
    const promises = frameIndices.map(index => 
      this.extractIcon(spriteKey, index, options)
    );
    return Promise.all(promises);
  }

  /**
   * 提取动画帧序列
   * @param {string} spriteKey - 精灵图键名
   * @param {number} startFrame - 起始帧
   * @param {number} endFrame - 结束帧
   * @param {Object} options - 选项
   * @returns {Promise<HTMLCanvasElement[]>} 动画帧数组
   */
  async extractAnimationFrames(spriteKey, startFrame, endFrame, options = {}) {
    const frameIndices = [];
    for (let i = startFrame; i <= endFrame; i++) {
      frameIndices.push(i);
    }
    return this.extractIcons(spriteKey, frameIndices, options);
  }

  /**
   * 更新精灵图配置
   * @param {string} spriteKey - 精灵图键名
   * @param {Object} config - 新配置
   */
  updateSpriteConfig(spriteKey, config) {
    const keys = spriteKey.split('.');
    let target = this.spriteConfigs;
    
    for (let i = 0; i < keys.length - 1; i++) {
      if (!target[keys[i]]) {
        target[keys[i]] = {};
      }
      target = target[keys[i]];
    }
    
    const lastKey = keys[keys.length - 1];
    target[lastKey] = { ...target[lastKey], ...config };
    
    // 清除相关缓存
    this.clearCache(spriteKey);
    
    console.log(`✓ 精灵图配置已更新: ${spriteKey}`);
  }

  /**
   * 清除缓存
   * @param {string} spriteKey - 精灵图键名（可选，不提供则清除所有）
   */
  clearCache(spriteKey = null) {
    if (spriteKey) {
      // 清除特定精灵图的缓存
      this.spriteSheets.delete(spriteKey);
      
      // 清除相关图标缓存
      for (const key of this.iconCache.keys()) {
        if (key.startsWith(spriteKey + '_')) {
          this.iconCache.delete(key);
        }
      }
    } else {
      // 清除所有缓存
      this.spriteSheets.clear();
      this.iconCache.clear();
    }
    
    console.log(`✓ 缓存已清除${spriteKey ? ': ' + spriteKey : ''}`);
  }

  /**
   * 预加载所有精灵图
   * @returns {Promise<void>}
   */
  async preloadAll() {
    const loadPromises = [];
    
    const loadConfig = (config, prefix = '') => {
      for (const [key, value] of Object.entries(config)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        
        if (value.url) {
          loadPromises.push(
            this.loadSpriteSheet(fullKey).catch(err => {
              console.warn(`预加载失败: ${fullKey}`, err);
            })
          );
        } else if (typeof value === 'object' && !Array.isArray(value)) {
          loadConfig(value, fullKey);
        }
      }
    };
    
    loadConfig(this.spriteConfigs);
    
    await Promise.allSettled(loadPromises);
    console.log('✓ 所有精灵图预加载完成');
  }

  /**
   * 获取缓存统计信息
   * @returns {Object} 统计信息
   */
  getCacheStats() {
    return {
      spriteSheetsLoaded: this.spriteSheets.size,
      iconsCached: this.iconCache.size,
      loadingInProgress: this.loadingPromises.size
    };
  }
  
  /**
   * 获取铁匠NPC精灵图
   * @returns {HTMLImageElement|null} 铁匠精灵图
   */
  getBlacksmithSprite() {
    // 尝试从缓存获取
    if (this.spriteSheets.has('blacksmith')) {
      return this.spriteSheets.get('blacksmith');
    }
    
    // 如果未加载，启动异步加载
    this.loadSpriteSheet('blacksmith').catch(err => {
      console.warn('铁匠精灵图加载失败:', err);
    });
    
    return null;
  }
  
  /**
   * 获取材料精灵图
   * @returns {HTMLImageElement|null} 材料精灵图
   */
  getMaterialSprite() {
    if (this.spriteSheets.has('materials')) {
      return this.spriteSheets.get('materials');
    }
    
    this.loadSpriteSheet('materials').catch(err => {
      console.warn('材料精灵图加载失败:', err);
    });
    
    return null;
  }
  
  /**
   * 获取宝石精灵图
   * @returns {HTMLImageElement|null} 宝石精灵图
   */
  getGemSprite() {
    if (this.spriteSheets.has('gems')) {
      return this.spriteSheets.get('gems');
    }
    
    this.loadSpriteSheet('gems').catch(err => {
      console.warn('宝石精灵图加载失败:', err);
    });
    
    return null;
  }
}

// 创建全局单例
export const spriteManager = new SpriteManager();
