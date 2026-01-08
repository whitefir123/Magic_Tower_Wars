// LoadingUI.js - 单例幕布模式加载界面管理器

import { GAME_TIPS } from '../constants.js';
import { CanvasSprite } from '../utils/CanvasSprite.js';

/**
 * 加载背景图常量
 */
const LOADING_BACKGROUNDS = [
  'https://i.postimg.cc/0y72N33X/loadingbackground1.png',
  'https://i.postimg.cc/cCDTwXzg/loadingbackground2.png',
  'https://i.postimg.cc/t4bt70J3/loadingbackground3.png'
];

/**
 * 加载界面管理器 - 单例幕布模式
 * 功能: 统一管理唯一的 #loading-overlay 加载层
 * 核心特性:
 * 1. 单例模式：只有一个加载层实例
 * 2. 幕布转场：支持平滑的场景切换
 * 3. 进度追踪：实时更新加载进度
 * 4. 提示轮播：自动轮播游戏提示
 * 5. 动画支持：小骷髅和蝴蝶动画
 */
export class LoadingUI {
  constructor() {
    // 获取唯一的 DOM 引用（单例模式：只获取一次）
    const overlay = document.getElementById('loading-overlay');
    if (!overlay) {
      console.warn('❌ #loading-overlay 元素未找到');
    }

    // DOM 元素引用
    this.dom = {
      overlay: overlay,
      bar: overlay?.querySelector('#loading-bar-fill'),
      percent: overlay?.querySelector('#loading-percent'),
      tip: overlay?.querySelector('#loading-tip-text'),
      skeleton: overlay?.querySelector('#loading-skeleton'),
      butterfly: overlay?.querySelector('#loading-butterfly')
    };

    // 状态标志
    this.visible = false;
    this.isTransitioning = false;
    this.currentProgress = 0;

    // 提示词轮播定时器
    this.tipInterval = null;
    this.tipStartDelay = null;

    // 事件监听器绑定标志位（防止重复绑定）
    this.eventListenersBound = false;
  }

  /**
   * 初始化加载界面管理器
   */
  init() {
    console.log('🎬 加载界面管理器已初始化（单例幕布模式）');
    this.setupEventListeners();
  }

  /**
   * 设置事件监听（带防重复绑定机制）
   */
  setupEventListeners() {
    // 检查是否已绑定，防止重复绑定导致的内存泄漏
    if (this.eventListenersBound) {
      console.warn('⚠️ 事件监听器已绑定，跳过重复绑定');
      return;
    }

    const self = this;

    // 全局资源加载完成监听
    window.addEventListener('resourcesLoaded', () => {
      console.log('📦 资源加载完成事件已触发');
      self.setProgress(100);
      self.setTip('资源加载完成，初始化游戏...');
    });

    // 游戏初始化完成监听
    window.addEventListener('gameInitialized', () => {
      console.log('🎮 游戏初始化完成事件已触发');
      self.setProgress(100);
      self.setTip('游戏已就绪');
    });

    // 加载进度更新监听
    window.addEventListener('loadingProgress', (e) => {
      const progress = e.detail?.progress || 0;
      self.setProgress(progress);
    });

    // 标记为已绑定
    this.eventListenersBound = true;
    console.log('✅ 事件监听器已绑定');
  }

  /**
   * 显示加载遮罩
   * @param {string} tipText - 提示文本，默认为 '加载中...'
   */
  show(tipText = '加载中...') {
    if (!this.dom.overlay) {
      console.warn('❌ 加载遮罩元素未找到');
      return;
    }

    // 设置随机背景
    this.setRandomBackground();

    // 显示遮罩
    this.dom.overlay.classList.remove('hidden');
    this.dom.overlay.style.display = 'flex';
    this.dom.overlay.style.opacity = '1';
    
    // ⚡ Z-Index 修正：确保高于 Tooltip (1000000)
    this.dom.overlay.style.zIndex = '1000002';
    
    this.visible = true;

    // 重置进度
    this.setProgress(0);

    // 设置提示文本
    this.setTip(tipText);

    // 初始化动画
    this.initializeLoadingAnimations();

    // 开始提示词轮播
    this.startTipRotation();

    console.log('✅ 显示加载遮罩');
  }

  /**
   * 隐藏加载遮罩
   */
  hide() {
    if (!this.dom.overlay) {
      return;
    }

    // 停止提示词轮播
    this.stopTipRotation();

    // 添加淡出类
    this.dom.overlay.classList.add('overlay-exit');

    // 等待动画完成后完全隐藏
    setTimeout(() => {
      this.dom.overlay.classList.add('hidden');
      this.dom.overlay.classList.remove('overlay-exit');
      this.dom.overlay.style.display = 'none';
      this.visible = false;
      console.log('✅ 隐藏加载遮罩');
    }, 800); // 等待 CSS 过渡动画完成（0.8s）
  }

  /**
   * 设置加载进度
   * @param {number} percent - 进度百分比 (0-100)
   */
  setProgress(percent) {
    // 限制进度在 0-100 之间
    percent = Math.max(0, Math.min(100, percent));
    this.currentProgress = percent;

    if (!this.dom.overlay || !this.visible) {
      return;
    }

    // 更新进度条
    if (this.dom.bar) {
      this.dom.bar.style.width = percent + '%';
    }

    // 更新进度百分比文本
    if (this.dom.percent) {
      this.dom.percent.textContent = percent + '%';
    }

    console.log(`📊 加载进度: ${percent}%`);
  }

  /**
   * 设置提示文本
   * @param {string} text - 提示文本
   */
  setTip(text) {
    if (!this.dom.overlay || !this.visible) {
      return;
    }

    if (this.dom.tip) {
      this.dom.tip.textContent = text;
      this.dom.tip.style.opacity = '1';
    }

    // 当外部手动设置提示时，重置轮播计时器
    if (this.tipInterval || this.tipStartDelay) {
      this.stopTipRotation();
      // 延迟 2.5 秒后重新开始轮播
      setTimeout(() => {
        if (this.visible) {
          this.startTipRotation();
        }
      }, 2500);
    }

    console.log(`💬 加载提示: ${text}`);
  }

  /**
   * 设置随机背景
   */
  setRandomBackground() {
    if (!this.dom.overlay) return;

    // 检查是否已有背景层
    let bgLayer = this.dom.overlay.querySelector('.loading-bg-layer');
    if (bgLayer && bgLayer.style.backgroundImage && bgLayer.style.backgroundImage !== 'none') {
      if (!bgLayer.classList.contains('active')) {
        bgLayer.classList.add('active');
        bgLayer.style.opacity = '1';
      }
      return;
    }

    // 准备新背景层
    if (!bgLayer) {
      bgLayer = document.createElement('div');
      bgLayer.className = 'loading-bg-layer';
      this.dom.overlay.insertBefore(bgLayer, this.dom.overlay.firstChild);
    }

    // 智能选择背景
    let randomBg;
    let isRestored = false;

    // 尝试读取缓存，实现跨页面的无缝衔接
    try {
      const storedBg = sessionStorage.getItem('currentLoadingBg');

      if (storedBg) {
        if (!LOADING_BACKGROUNDS || LOADING_BACKGROUNDS.length === 0) return;
        if (LOADING_BACKGROUNDS.includes(storedBg)) {
          randomBg = storedBg;
          isRestored = true;
        } else {
          randomBg = LOADING_BACKGROUNDS[Math.floor(Math.random() * LOADING_BACKGROUNDS.length)];
        }
      } else {
        if (!LOADING_BACKGROUNDS || LOADING_BACKGROUNDS.length === 0) return;
        randomBg = LOADING_BACKGROUNDS[Math.floor(Math.random() * LOADING_BACKGROUNDS.length)];
      }
    } catch (e) {
      if (!LOADING_BACKGROUNDS || LOADING_BACKGROUNDS.length === 0) return;
      randomBg = LOADING_BACKGROUNDS[Math.floor(Math.random() * LOADING_BACKGROUNDS.length)];
    }

    // 更新缓存
    try {
      sessionStorage.setItem('currentLoadingBg', randomBg);
    } catch (e) {}

    const img = new Image();

    const applyBackground = () => {
      if (isRestored) {
        bgLayer.style.transition = 'none';
        bgLayer.style.backgroundImage = `url('${randomBg}')`;
        bgLayer.style.opacity = '1';
        bgLayer.classList.add('active');
        void bgLayer.offsetWidth;
        bgLayer.style.transition = '';
      } else {
        requestAnimationFrame(() => {
          bgLayer.style.backgroundImage = `url('${randomBg}')`;
          bgLayer.classList.add('active');
          bgLayer.style.opacity = '1';
        });
      }
    };

    img.onload = applyBackground;
    img.onerror = () => console.warn(`背景图加载失败: ${randomBg}`);

    img.src = randomBg;

    if (img.complete) {
      applyBackground();
    }
  }

  /**
   * 初始化加载界面中的小骷髅和蝴蝶动画
   */
  initializeLoadingAnimations() {
    if (!this.dom.overlay) return;

    // 延迟初始化，确保 DOM 已完全渲染
    setTimeout(() => {
      if (this.dom.skeleton && !this.dom.skeleton.__sprite) {
        console.log('🦴 初始化小骷髅动画');
        this.dom.skeleton.__sprite = new CanvasSprite(
          this.dom.skeleton,
          'https://i.postimg.cc/MGft6mWh/xiaokuloujiazai1.png',
          4, 1, 5
        );
      }

      if (this.dom.butterfly && !this.dom.butterfly.__sprite) {
        console.log('🦋 初始化蝴蝶动画');
        this.dom.butterfly.__sprite = new CanvasSprite(
          this.dom.butterfly,
          'https://i.postimg.cc/DyjfRzTx/hudie1.png',
          4, 1, 16/3
        );
      }
    }, 50);
  }

  /**
   * 开始提示词轮播
   */
  startTipRotation() {
    // 先清除可能存在的定时器
    this.stopTipRotation();

    // 防御性检查
    if (!GAME_TIPS || !Array.isArray(GAME_TIPS) || GAME_TIPS.length === 0) {
      console.warn('⚠️ GAME_TIPS 数据无效，跳过提示词轮播');
      return;
    }

    if (!this.dom.overlay || !this.dom.tip) {
      console.warn('❌ 加载界面元素未找到');
      return;
    }

    // 确保元素有 transition 样式
    if (!this.dom.tip.style.transition) {
      this.dom.tip.style.transition = 'opacity 0.3s ease-in-out';
    }

    // 延迟启动：等待 2.5 秒后开始轮播
    const startDelay = setTimeout(() => {
      // 第一次切换提示
      this._rotateTip();

      // 之后每 3.5 秒切换一次
      this.tipInterval = setInterval(() => {
        if (!this.visible || this.dom.overlay.classList.contains('hidden')) {
          this.stopTipRotation();
          return;
        }
        this._rotateTip();
      }, 3500);
    }, 2500);

    this.tipStartDelay = startDelay;
  }

  /**
   * 内部方法：执行单次提示词切换（带淡入淡出动画）
   * @private
   */
  _rotateTip() {
    if (!this.dom.tip || !this.dom.overlay || this.dom.overlay.classList.contains('hidden')) {
      return;
    }

    if (!GAME_TIPS || !Array.isArray(GAME_TIPS) || GAME_TIPS.length === 0) {
      return;
    }

    // 随机选择一条提示
    const randomIndex = Math.floor(Math.random() * GAME_TIPS.length);
    const randomTip = GAME_TIPS[randomIndex];

    if (!randomTip) {
      console.warn('⚠️ 随机选择的提示词无效');
      return;
    }

    // 淡出动画
    this.dom.tip.style.opacity = '0';

    // 等待淡出动画完成（300ms）后切换文本并淡入
    setTimeout(() => {
      if (!this.dom.tip || !this.dom.overlay || this.dom.overlay.classList.contains('hidden')) {
        return;
      }

      // 切换文本
      this.dom.tip.textContent = randomTip;

      // 淡入动画
      this.dom.tip.style.opacity = '1';
    }, 300);
  }

  /**
   * 停止提示词轮播
   */
  stopTipRotation() {
    if (this.tipInterval) {
      clearInterval(this.tipInterval);
      this.tipInterval = null;
    }

    if (this.tipStartDelay) {
      clearTimeout(this.tipStartDelay);
      this.tipStartDelay = null;
    }
  }

  /**
   * 等待指定时间（工具方法）
   * @param {number} ms - 等待时间（毫秒）
   * @returns {Promise}
   */
  wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 统一转场调度方法 - 单例幕布模式（增强版）
   * 流程：[拉上幕布 -> 等待覆盖 -> 执行切换逻辑 -> 等待渲染 -> 拉开幕布]
   * @param {Object} config - 转场配置对象
   * @param {string} config.targetId - 目标场景 DOM 元素 ID
   * @param {Function} config.action - 切换逻辑函数（在幕布显示后执行）
   * @returns {Promise} 转场完成后的 Promise
   */
  async performTransition({ targetId, action }) {
    if (!targetId) {
      console.warn('[LoadingUI] performTransition: 缺少 targetId 参数');
      return;
    }

    console.log(`🎬 [LoadingUI] 启动转场: -> ${targetId}`);

    // 设置转场标志位
    this.isTransitioning = true;

    try {
      // 1. 拉上幕布
      this.show('加载中...');

      // 2. 等待幕布完全覆盖（400ms）
      await this.wait(400);

      // 3. 执行切换逻辑
      if (action && typeof action === 'function') {
        const actionResult = action();
        
        // 如果 action 返回 Promise，等待它完成
        if (actionResult && typeof actionResult.then === 'function') {
          await actionResult;
        }
      }

      // ⚡ 关键：强制等待两帧，确保 DOM 渲染完成，防止闪烁
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));

      // 4. 拉开幕布
      this.hide();

      // 等待隐藏动画完成
      await this.wait(800);

    } catch (error) {
      console.error('[LoadingUI] performTransition 执行异常:', error);
    } finally {
      // 清理转场标志位
      this.isTransitioning = false;
      console.log(`✨ 转场完成: -> ${targetId}`);
    }
  }

  /**
   * 检查加载界面是否可见
   * @returns {boolean} 是否可见
   */
  isVisible() {
    return this.visible;
  }

  /**
   * 获取当前加载进度
   * @returns {number} 进度百分比
   */
  getProgress() {
    return this.currentProgress;
  }

  /**
   * 通用的场景淡出方法
   * 实现"旧界面平滑淡出"的效果
   * @param {string} elementId - 目标DOM元素的ID
   * @param {number} duration - 动画持续时间（毫秒），默认600ms
   * @returns {Promise} 动画完成后的Promise
   */
  fadeSceneOut(elementId, duration = 600) {
    return new Promise((resolve) => {
      const element = document.getElementById(elementId);
      if (!element) {
        console.warn(`[LoadingUI] fadeSceneOut: 元素未找到: ${elementId}`);
        resolve();
        return;
      }

      // 确保元素有过渡类
      if (!element.classList.contains('scene-transition') && !element.classList.contains('scene-fade-in')) {
        if (elementId === 'main-ui') {
          element.classList.add('scene-fade-in');
        } else {
          element.classList.add('scene-transition');
        }
      }

      // 移除激活状态，添加离场状态
      element.classList.remove('scene-active', 'scene-visible');
      element.classList.add('scene-exit');

      // 使用transitionend事件监听动画完成
      const handleTransitionEnd = (e) => {
        if (e.target === element && e.propertyName === 'opacity') {
          element.removeEventListener('transitionend', handleTransitionEnd);
          
          // 动画结束后，隐藏元素
          element.classList.add('hidden');
          if (elementId === 'leaderboard-overlay') {
            element.style.setProperty('display', 'none', 'important');
          } else {
            element.style.display = 'none';
          }
          
          // 清理动画类
          element.classList.remove('scene-exit', 'scene-active', 'scene-visible', 'scene-hidden');
          
          console.log(`✅ [LoadingUI] 场景淡出完成: ${elementId}`);
          resolve();
        }
      };

      element.addEventListener('transitionend', handleTransitionEnd);

      // 兜底：如果transitionend事件没有触发，使用setTimeout
      setTimeout(() => {
        if (element.classList.contains('scene-exit')) {
          element.removeEventListener('transitionend', handleTransitionEnd);
          element.classList.add('hidden');
          if (elementId === 'leaderboard-overlay') {
            element.style.setProperty('display', 'none', 'important');
          } else {
            element.style.display = 'none';
          }
          element.classList.remove('scene-exit', 'scene-active', 'scene-visible', 'scene-hidden');
          console.log(`✅ [LoadingUI] 场景淡出完成（超时兜底）: ${elementId}`);
          resolve();
        }
      }, duration + 100);
    });
  }
}
