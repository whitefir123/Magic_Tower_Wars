// ResourceManager.js - 统一资源管理器
// 整合了 AssetLoader 和原 ResourceManager 的功能
// 提供单一的资源加载和缓存系统

/**
 * ResourceManager - 全局统一资源管理器
 * 职责：
 * 1. 加载和缓存所有游戏资源（图片、音频等）
 * 2. 统一管理加载进度和状态
 * 3. 提供资源获取接口
 * 4. 避免重复加载，节省内存和带宽
 */
export class ResourceManager {
  constructor() {
    // 资源缓存 - Map<key, resource>
    this.resources = new Map();
    
    // 资源加载状态 - Map<url, 'pending'|'loading'|'loaded'|'failed'>
    this.resourceStates = new Map();
    
    // 加载统计
    this.loadedCount = 0;
    this.failedCount = 0;
    this.totalResources = 0;
    
    // 加载状态
    this.isLoading = false;
    this.loadingStartTime = 0;
    
    // 进度回调
    this.onProgressCallbacks = [];
    
    console.log('🎮 统一资源管理器已初始化');
  }
  
  /**
   * 注册进度回调函数
   * @param {Function} callback - 回调函数 (percent, loaded, total) => void
   */
  onProgress(callback) {
    if (typeof callback === 'function') {
      this.onProgressCallbacks.push(callback);
    }
  }
  
  /**
   * 触发所有进度回调
   */
  triggerProgressCallbacks() {
    const percent = this.totalResources > 0 
      ? Math.round(((this.loadedCount + this.failedCount) / this.totalResources) * 100) 
      : 0;
    
    this.onProgressCallbacks.forEach(callback => {
      try {
        callback(percent, this.loadedCount + this.failedCount, this.totalResources);
      } catch (e) {
        console.error('Progress callback error:', e);
      }
    });
  }
  
  /**
   * 加载单个图片资源
   * @param {string} key - 资源键名
   * @param {string} url - 图片URL
   * @param {string} fallbackUrl - 备用URL（可选）
   * @returns {Promise<HTMLImageElement|null>}
   */
  async loadImage(key, url, fallbackUrl = null) {
    // 检查空URL
    if (!url || url === "") {
      this.resources.set(key, null); // 设置为 null 或占位符
      return Promise.resolve(null);
    }
    
    // 检查缓存
    if (this.resources.has(key)) {
      return this.resources.get(key);
    }
    
    this.resourceStates.set(url, 'loading');
    
    try {
      const img = await this._loadImagePromise(url);
      this.resources.set(key, img);
      this.resourceStates.set(url, 'loaded');
      this.loadedCount++;
      this.triggerProgressCallbacks();
      return img;
    } catch (error) {
      console.warn(`Failed to load ${key} from ${url}`);
      
      // 尝试备用URL
      if (fallbackUrl) {
        try {
          console.log(`Trying fallback for ${key}: ${fallbackUrl}`);
          const img = await this._loadImagePromise(fallbackUrl);
          this.resources.set(key, img);
          this.resourceStates.set(url, 'loaded');
          this.loadedCount++;
          this.triggerProgressCallbacks();
          return img;
        } catch (fallbackError) {
          console.error(`Fallback also failed for ${key}`);
        }
      }
      
      // 加载失败
      this.resources.set(key, null);
      this.resourceStates.set(url, 'failed');
      this.failedCount++;
      this.triggerProgressCallbacks();
      return null;
    }
  }
  
  /**
   * 内部方法：加载图片并返回Promise
   * @param {string} url - 图片URL
   * @returns {Promise<HTMLImageElement>}
   */
  _loadImagePromise(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      
      let resolved = false;
      
      img.onload = () => {
        if (!resolved) {
          resolved = true;
          resolve(img);
        }
      };
      
      img.onerror = () => {
        if (!resolved) {
          resolved = true;
          reject(new Error(`Failed to load image: ${url}`));
        }
      };
      
      // 超时机制 (5秒)
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          reject(new Error(`Timeout loading image: ${url}`));
        }
      }, 5000);
      
      img.src = url;
    });
  }
  
  /**
   * 批量加载资源
   * @param {Object} assetsMap - 资源映射 { KEY: { url, fallback? } }
   * @param {Function} onProgress - 进度回调 (percent, loaded, total) => void
   * @returns {Promise<void>}
   */
  async loadAll(assetsMap, onProgress = null) {
    this.isLoading = true;
    this.loadingStartTime = Date.now();
    
    if (onProgress) {
      this.onProgress(onProgress);
    }
    
    const keys = Object.keys(assetsMap);
    this.totalResources = keys.length;
    this.loadedCount = 0;
    this.failedCount = 0;
    
    console.log(`[ResourceManager] Loading ${this.totalResources} resources...`);
    
    // 并行加载所有资源
    await Promise.all(
      keys.map(key => {
        const asset = assetsMap[key];
        return this.loadImage(key, asset.url, asset.fallback);
      })
    );
    
    this.isLoading = false;
    const loadingTime = Date.now() - this.loadingStartTime;
    
    console.log(`[ResourceManager] Loading complete:`);
    console.log(`  - Loaded: ${this.loadedCount}/${this.totalResources}`);
    console.log(`  - Failed: ${this.failedCount}/${this.totalResources}`);
    console.log(`  - Time: ${loadingTime}ms`);
    
    // 触发资源加载完成事件
    window.dispatchEvent(new CustomEvent('resourcesLoaded', {
      detail: {
        loadedCount: this.loadedCount,
        failedCount: this.failedCount,
        totalCount: this.totalResources,
        loadingTime: loadingTime
      }
    }));
  }
  
  /**
   * 加载关键资源（主菜单和加载界面所需）
   * @param {Object} assetsMap - 关键资源映射
   * @param {Function} onProgress - 进度回调
   * @returns {Promise<void>}
   */
  async loadCriticalAssets(assetsMap, onProgress = null) {
    return this.loadAll(assetsMap, onProgress);
  }
  
  /**
   * 加载游戏内资源（后台静默加载）
   * @param {Object} assetsMap - 游戏内资源映射
   * @param {Function} onProgress - 进度回调（可选，用于后台加载监控）
   * @returns {Promise<void>}
   */
  async loadGameplayAssets(assetsMap, onProgress = null) {
    console.log(`[ResourceManager] 开始后台加载游戏内资源...`);
    return this.loadAll(assetsMap, onProgress);
  }
  
  /**
   * 获取已加载的资源
   * @param {string} key - 资源键名
   * @returns {any} 资源对象（图片、音频等）
   */
  getImage(key) {
    return this.resources.get(key);
  }
  
  /**
   * 检查资源是否已加载
   * @param {string} key - 资源键名
   * @returns {boolean}
   */
  hasResource(key) {
    return this.resources.has(key);
  }
  
  /**
   * 获取加载统计信息
   * @returns {Object} 加载统计对象
   */
  getStats() {
    const completedCount = this.loadedCount + this.failedCount;
    return {
      total: this.totalResources,
      loaded: this.loadedCount,
      failed: this.failedCount,
      completed: completedCount,
      isLoading: this.isLoading,
      progress: this.totalResources > 0 ? Math.round((completedCount / this.totalResources) * 100) : 0
    };
  }
}

// 创建全局单例
if (typeof window !== 'undefined') {
  window.ResourceManager = new ResourceManager();
}

