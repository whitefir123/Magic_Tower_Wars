/**
 * PerformanceOptimizer - 铁匠铺性能优化器
 * 
 * 提供虚拟滚动、图标缓存、动画优化等性能优化功能
 */

export class PerformanceOptimizer {
  constructor(forgeUI) {
    this.forgeUI = forgeUI;
    
    // 图标缓存
    this.iconCache = new Map();
    
    // 动画帧请求ID
    this.animationFrameId = null;
    
    // 虚拟滚动配置
    this.virtualScrollConfig = {
      itemHeight: 70, // 每个装备卡片的高度
      visibleItems: 10, // 可见区域显示的项目数
      bufferItems: 3 // 缓冲区额外渲染的项目数
    };
    
    // 延迟加载队列
    this.lazyLoadQueue = [];
    this.isProcessingQueue = false;
  }

  /**
   * 缓存精灵图提取的图标
   * @param {string} key - 缓存键
   * @param {HTMLCanvasElement} canvas - Canvas元素
   */
  cacheIcon(key, canvas) {
    if (!this.iconCache.has(key)) {
      // 将canvas转换为dataURL进行缓存
      const dataUrl = canvas.toDataURL();
      this.iconCache.set(key, dataUrl);
    }
  }

  /**
   * 获取缓存的图标
   * @param {string} key - 缓存键
   * @returns {string|null} dataURL或null
   */
  getCachedIcon(key) {
    return this.iconCache.get(key) || null;
  }

  /**
   * 清除图标缓存
   */
  clearIconCache() {
    this.iconCache.clear();
  }

  /**
   * 获取缓存大小
   * @returns {number} 缓存的图标数量
   */
  getCacheSize() {
    return this.iconCache.size;
  }

  /**
   * 使用requestAnimationFrame优化动画
   * @param {Function} callback - 动画回调函数
   */
  optimizeAnimation(callback) {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    
    this.animationFrameId = requestAnimationFrame(() => {
      callback();
      this.animationFrameId = null;
    });
  }

  /**
   * 取消动画
   */
  cancelAnimation() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * 延迟加载资源
   * @param {Function} loadFunction - 加载函数
   * @param {number} priority - 优先级（数字越小优先级越高）
   */
  lazyLoad(loadFunction, priority = 5) {
    this.lazyLoadQueue.push({ loadFunction, priority });
    this.lazyLoadQueue.sort((a, b) => a.priority - b.priority);
    
    if (!this.isProcessingQueue) {
      this.processLazyLoadQueue();
    }
  }

  /**
   * 处理延迟加载队列
   */
  async processLazyLoadQueue() {
    if (this.lazyLoadQueue.length === 0) {
      this.isProcessingQueue = false;
      return;
    }
    
    this.isProcessingQueue = true;
    
    // 使用requestIdleCallback或setTimeout
    const processNext = () => {
      if (this.lazyLoadQueue.length === 0) {
        this.isProcessingQueue = false;
        return;
      }
      
      const { loadFunction } = this.lazyLoadQueue.shift();
      
      try {
        loadFunction();
      } catch (error) {
        console.error('延迟加载失败:', error);
      }
      
      // 继续处理下一个
      if (typeof requestIdleCallback !== 'undefined') {
        requestIdleCallback(processNext);
      } else {
        setTimeout(processNext, 16); // ~60fps
      }
    };
    
    if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(processNext);
    } else {
      setTimeout(processNext, 16);
    }
  }

  /**
   * 实现虚拟滚动
   * @param {Array} items - 所有项目
   * @param {HTMLElement} container - 容器元素
   * @param {Function} renderItem - 渲染单个项目的函数
   */
  setupVirtualScroll(items, container, renderItem) {
    if (!container || items.length === 0) return;
    
    const { itemHeight, visibleItems, bufferItems } = this.virtualScrollConfig;
    const totalHeight = items.length * itemHeight;
    
    // 创建虚拟滚动容器
    const scrollContainer = document.createElement('div');
    scrollContainer.style.height = `${totalHeight}px`;
    scrollContainer.style.position = 'relative';
    
    const viewport = document.createElement('div');
    viewport.style.position = 'absolute';
    viewport.style.top = '0';
    viewport.style.left = '0';
    viewport.style.right = '0';
    
    scrollContainer.appendChild(viewport);
    
    // 渲染可见项目
    const renderVisibleItems = () => {
      const scrollTop = container.scrollTop || 0;
      const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - bufferItems);
      const endIndex = Math.min(items.length, startIndex + visibleItems + bufferItems * 2);
      
      viewport.innerHTML = '';
      viewport.style.transform = `translateY(${startIndex * itemHeight}px)`;
      
      for (let i = startIndex; i < endIndex; i++) {
        const itemElement = renderItem(items[i], i);
        if (itemElement) {
          viewport.appendChild(itemElement);
        }
      }
    };
    
    // 监听滚动事件（使用节流）
    let scrollTimeout;
    container.addEventListener('scroll', () => {
      if (scrollTimeout) {
        clearTimeout(scrollTimeout);
      }
      scrollTimeout = setTimeout(() => {
        this.optimizeAnimation(renderVisibleItems);
      }, 16);
    });
    
    // 初始渲染
    container.innerHTML = '';
    container.appendChild(scrollContainer);
    renderVisibleItems();
    
    return {
      update: (newItems) => {
        items = newItems;
        scrollContainer.style.height = `${items.length * itemHeight}px`;
        renderVisibleItems();
      },
      destroy: () => {
        if (scrollTimeout) {
          clearTimeout(scrollTimeout);
        }
      }
    };
  }

  /**
   * 节流函数
   * @param {Function} func - 要节流的函数
   * @param {number} delay - 延迟时间（毫秒）
   * @returns {Function} 节流后的函数
   */
  throttle(func, delay = 16) {
    let lastCall = 0;
    return function(...args) {
      const now = Date.now();
      if (now - lastCall >= delay) {
        lastCall = now;
        return func.apply(this, args);
      }
    };
  }

  /**
   * 防抖函数
   * @param {Function} func - 要防抖的函数
   * @param {number} delay - 延迟时间（毫秒）
   * @returns {Function} 防抖后的函数
   */
  debounce(func, delay = 300) {
    let timeoutId;
    return function(...args) {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
  }

  /**
   * 批量DOM操作
   * @param {Function} operations - DOM操作函数
   */
  batchDOMOperations(operations) {
    // 使用DocumentFragment减少重排
    const fragment = document.createDocumentFragment();
    operations(fragment);
    return fragment;
  }

  /**
   * 预加载图片
   * @param {Array<string>} urls - 图片URL数组
   * @returns {Promise} 加载完成的Promise
   */
  preloadImages(urls) {
    const promises = urls.map(url => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(url);
        img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
        img.src = url;
      });
    });
    
    return Promise.allSettled(promises);
  }

  /**
   * 获取性能统计
   * @returns {Object} 性能统计信息
   */
  getPerformanceStats() {
    return {
      iconCacheSize: this.iconCache.size,
      lazyLoadQueueLength: this.lazyLoadQueue.length,
      isAnimating: this.animationFrameId !== null,
      isProcessingQueue: this.isProcessingQueue
    };
  }

  /**
   * 清理资源
   */
  cleanup() {
    this.clearIconCache();
    this.cancelAnimation();
    this.lazyLoadQueue = [];
    this.isProcessingQueue = false;
  }
}
