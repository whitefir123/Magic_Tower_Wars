// LoadingUI.js - 加载界面管理器

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
 * 加载界面管理器 (LoadingOverlayManager) - 完全重构版本
 * 功能: 统一管理全局加载界面、角色选择加载界面、游戏加载界面
 * 核心改进:
 * 1. 准确监听每个界面的加载状态
 * 2. 确保加载界面在资源完全就绪前保持显示
 * 3. 防止加载界面闪烁和提前隐藏
 * 4. 支持多界面并发加载监听
 * 5. 确保小骷髅和蝴蝶动画正确初始化
 */
export class LoadingUI {
  constructor() {
    // 加载界面配置
    this.overlays = {
      global: {
        id: 'loading-overlay',
        barSelector: '#loading-bar-fill',
        percentSelector: '#loading-percent',
        tipSelector: '#loading-tip-text',
        visible: false,
        isLoading: false,
        loadingStartTime: 0,
        minDisplayTime: 800 // 最少显示800ms，防止闪烁
      },
      charSelect: {
        id: 'char-select-loading-overlay',
        barSelector: '.loading-bar-fill',
        percentSelector: '.loading-percent',
        tipSelector: '.loading-tip-text',
        visible: false,
        isLoading: false,
        loadingStartTime: 0,
        minDisplayTime: 500
      },
      gameplay: {
        id: 'gameplay-loading-overlay',
        barSelector: '.loading-bar-fill',
        percentSelector: '.loading-percent',
        tipSelector: '.loading-tip-text',
        visible: false,
        isLoading: false,
        loadingStartTime: 0,
        minDisplayTime: 500
      }
    };

    // 当前活跃的加载界面
    this.currentOverlay = 'global';

    // 加载进度追踪
    this.loadProgress = {
      global: 0,
      charSelect: 0,
      gameplay: 0
    };

    // 资源加载完成标志
    this.resourcesLoadingComplete = false;
    this.gameInitializationComplete = false;

    // 提示词轮播定时器
    this.tipInterval = null;
    this.tipStartDelay = null; // 延迟启动定时器

    // 转场状态标志位（防止自动隐藏与手动转场冲突）
    this.isTransitioning = false;
  }

  /**
   * 初始化加载界面管理器
   */
  init() {
    console.log('🎬 加载界面管理器已初始化（完全重构版本）');
    this.setupEventListeners();
    this.setupResourceMonitoring();
    this.startGlobalLoading();
  }

  /**
   * 启动全局加载界面
   */
  startGlobalLoading() {
    this.showOverlay('global', '初始化资源...');
    this.overlays.global.isLoading = true;
    this.overlays.global.loadingStartTime = Date.now();
    console.log('⏳ 全局加载界面已启动');
  }

  /**
   * 设置事件监听 - 完全重构
   */
  setupEventListeners() {
    const self = this;

    // ============ 全局资源加载监听 ============
    window.addEventListener('resourcesLoaded', () => {
      console.log('📦 资源加载完成事件已触发');
      self.resourcesLoadingComplete = true;
      self.setProgress(100, 'global');
      self.setTip('资源加载完成，初始化游戏...', 'global');
      
      // ⚠️ 注意：全局加载层的关闭权完全移交给 main.js 的 init 方法
      // 不在这里自动隐藏，避免竞态条件和界面闪烁
    });

    // ============ 游戏初始化完成监听 ============
    window.addEventListener('gameInitialized', () => {
      console.log('🎮 游戏初始化完成事件已触发');
      self.gameInitializationComplete = true;
      self.setProgress(100, 'global');
      self.setTip('游戏已就绪', 'global');
      
      // ⚠️ 注意：全局加载层的关闭权完全移交给 main.js 的 init 方法
      // 不在这里自动隐藏，避免竞态条件和界面闪烁
    });

    // ============ 角色选择界面加载监听 ============
    window.addEventListener('charSelectLoadingStart', () => {
      console.log('👤 角色选择界面加载开始');
      self.showOverlay('charSelect', '加载英雄选择界面...');
      self.overlays.charSelect.isLoading = true;
      self.overlays.charSelect.loadingStartTime = Date.now();
      self.setProgress(0, 'charSelect');
    });

    // 角色选择界面资源加载完成
    window.addEventListener('charSelectResourcesLoaded', () => {
      console.log('👤 角色选择界面资源加载完成');
      self.setProgress(100, 'charSelect');
      self.setTip('英雄选择界面已就绪', 'charSelect');
      self.overlays.charSelect.isLoading = false;
      
      // 检查是否可以隐藏加载界面
      self.checkAndHideOverlay('charSelect');
    });

    // 角色选择界面加载完成（UI渲染完成）
    window.addEventListener('charSelectLoadingComplete', () => {
      console.log('👤 角色选择界面加载完成（UI已渲染）');
      self.overlays.charSelect.isLoading = false;
      self.checkAndHideOverlay('charSelect');
    });

    // ============ 游戏界面加载监听 ============
    window.addEventListener('gameplayLoadingStart', () => {
      console.log('🎮 游戏界面加载开始');
      self.showOverlay('gameplay', '加载游戏界面...');
      self.overlays.gameplay.isLoading = true;
      self.overlays.gameplay.loadingStartTime = Date.now();
      self.setProgress(0, 'gameplay');
    });

    // 游戏界面资源加载完成
    window.addEventListener('gameplayResourcesLoaded', () => {
      console.log('🎮 游戏界面资源加载完成');
      self.setProgress(100, 'gameplay');
      self.setTip('游戏界面已就绪', 'gameplay');
      self.overlays.gameplay.isLoading = false;
      
      // 检查是否可以隐藏加载界面
      self.checkAndHideOverlay('gameplay');
    });

    // 游戏界面加载完成（UI渲染完成）
    window.addEventListener('gameplayLoadingComplete', () => {
      console.log('🎮 游戏界面加载完成（UI已渲染）');
      self.overlays.gameplay.isLoading = false;
      self.checkAndHideOverlay('gameplay');
    });

    // ============ 加载进度更新监听 ============
    window.addEventListener('loadingProgress', (e) => {
      const progress = e.detail?.progress || 0;
      const overlayType = e.detail?.overlayType || 'global';
      self.setProgress(progress, overlayType);
    });

    // ============ 加载进度详细更新 ============
    window.addEventListener('charSelectLoadingProgress', (e) => {
      const progress = e.detail?.progress || 0;
      self.setProgress(progress, 'charSelect');
    });

    window.addEventListener('gameplayLoadingProgress', (e) => {
      const progress = e.detail?.progress || 0;
      self.setProgress(progress, 'gameplay');
    });

    // ============ 模拟加载进度（用于演示和测试） ============
    // 为角色选择界面添加模拟进度
    window.addEventListener('charSelectLoadingStart', () => {
      let progress = 0;
      const interval = setInterval(() => {
        if (!self.overlays.charSelect.isLoading) {
          clearInterval(interval);
          return;
        }
        progress += Math.random() * 30;
        if (progress > 90) progress = 90;
        self.setProgress(Math.floor(progress), 'charSelect');
      }, 300);
    });

    // 为游戏界面添加模拟进度
    window.addEventListener('gameplayLoadingStart', () => {
      let progress = 0;
      const interval = setInterval(() => {
        if (!self.overlays.gameplay.isLoading) {
          clearInterval(interval);
          return;
        }
        progress += Math.random() * 30;
        if (progress > 90) progress = 90;
        self.setProgress(Math.floor(progress), 'gameplay');
      }, 300);
    });
  }

  /**
   * 检查并隐藏加载界面
   * 确保加载界面在资源完全就绪且最少显示时间已过后才隐藏
   * @param {string} overlayType - 加载界面类型
   */
  checkAndHideOverlay(overlayType) {
    const config = this.overlays[overlayType];
    if (!config) return;

    // 如果仍在加载中，不隐藏
    if (config.isLoading) {
      console.log(`⏳ [${overlayType}] 仍在加载中，暂不隐藏`);
      return;
    }

    // 计算已显示时间
    const displayedTime = Date.now() - config.loadingStartTime;
    const remainingTime = Math.max(0, config.minDisplayTime - displayedTime);

    if (remainingTime > 0) {
      // 等待最少显示时间后再隐藏
      console.log(`⏳ [${overlayType}] 等待 ${remainingTime}ms 后隐藏（防止闪烁）`);
      setTimeout(() => {
        this.hideOverlay(overlayType);
      }, remainingTime);
    } else {
      // 立即隐藏
      this.hideOverlay(overlayType);
    }
  }

  /**
   * 设置资源加载监控
   * 监听 ResourceManager 的加载进度
   */
  setupResourceMonitoring() {
    const self = this;
    
    // 等待 ResourceManager 初始化
    const checkResourceManager = setInterval(() => {
      if (window.ResourceManager && window.ResourceManager.updateProgress) {
        clearInterval(checkResourceManager);
        console.log('✓ ResourceManager 已检测到，开始监控加载进度');
        
        // 监听 ResourceManager 的进度更新
        const originalUpdateProgress = window.ResourceManager.updateProgress;
        window.ResourceManager.updateProgress = function() {
          originalUpdateProgress.call(this);
          
          const loadedCount = this.loadedResources.size;
          const totalCount = this.totalResources;
          const progress = totalCount > 0 ? Math.round((loadedCount / totalCount) * 100) : 0;
          
          self.setProgress(progress, 'global');
          console.log(`📊 资源加载进度: ${progress}% (${loadedCount}/${totalCount})`);
        };
      }
    }, 100);

    // 超时检查（5秒后如果 ResourceManager 仍未初始化，继续）
    setTimeout(() => {
      clearInterval(checkResourceManager);
    }, 5000);
  }

  /**
   * 显示加载界面
   * @param {string} overlayType - 加载界面类型 ('global', 'charSelect', 'gameplay')
   * @param {string} tip - 加载提示文本
   */
  showOverlay(overlayType = 'global', tip = '加载中...') {
    const config = this.overlays[overlayType];
    if (!config) {
      console.warn(`❌ 未知的加载界面类型: ${overlayType}`);
      return;
    }

    const overlay = document.getElementById(config.id);
    if (!overlay) {
      console.warn(`❌ 加载界面元素未找到: ${config.id}`);
      return;
    }

    // 设置随机背景（在显示之前）
    this.setRandomBackground(config.id);

    // 显示加载界面
    overlay.classList.remove('hidden');
    config.visible = true;
    this.currentOverlay = overlayType;

    // 重置进度
    this.setProgress(0, overlayType);

    // 更新提示文本
    this.setTip(tip, overlayType);

    // 初始化小骷髅和蝴蝶动画
    this.initializeLoadingAnimations(overlay);

    // 开始提示词轮播
    this.startTipRotation(overlayType);

    console.log(`✅ 显示加载界面: ${overlayType}`);
  }

  /**
   * 设置随机背景（修复版：防止闪烁，支持缓存）
   * @param {string} overlayId - 加载界面元素ID
   */
  setRandomBackground(overlayId) {
    const overlay = document.getElementById(overlayId);
    if (!overlay) return;

    // 1. 检查是否已有背景层
    let bgLayer = overlay.querySelector('.loading-bg-layer');
    if (bgLayer && bgLayer.style.backgroundImage && bgLayer.style.backgroundImage !== 'none') {
      if (!bgLayer.classList.contains('active')) {
        bgLayer.classList.add('active');
        bgLayer.style.opacity = '1';
      }
      return; 
    }

    // 2. 准备新背景层
    if (!bgLayer) {
      bgLayer = document.createElement('div');
      bgLayer.className = 'loading-bg-layer';
      overlay.insertBefore(bgLayer, overlay.firstChild);
    }

    // 3. 智能选择背景
    let randomBg;
    let isRestored = false;
    
    // 尝试读取缓存，实现跨页面/跨遮罩的无缝衔接
    try {
      const storedBg = sessionStorage.getItem('currentLoadingBg');
      
      // 如果有缓存且是第一次加载（避免覆盖已有的不同图片），优先使用缓存
      if (storedBg) {
        // 验证存储的背景是否在可用列表中
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
      // 如果 sessionStorage 不可用（隐私模式等），随机选择
      if (!LOADING_BACKGROUNDS || LOADING_BACKGROUNDS.length === 0) return;
      randomBg = LOADING_BACKGROUNDS[Math.floor(Math.random() * LOADING_BACKGROUNDS.length)];
    }
    
    // 更新缓存
    try { 
      sessionStorage.setItem('currentLoadingBg', randomBg); 
    } catch(e) {}

    const img = new Image();
    
    const applyBackground = () => {
      // 如果是恢复的背景，立即显示（无过渡），否则使用动画
      if (isRestored) {
          bgLayer.style.transition = 'none'; // ⚡ 禁用过渡，立即显示
          bgLayer.style.backgroundImage = `url('${randomBg}')`;
          bgLayer.style.opacity = '1';
          bgLayer.classList.add('active');
          
          // 强制重排后恢复过渡效果（以便后续可能有动画）
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
   * @param {HTMLElement} overlay - 加载界面元素
   */
  initializeLoadingAnimations(overlay) {
    // 延迟初始化，确保 DOM 已完全渲染
    setTimeout(() => {
      const skelContainer = overlay.querySelector('.loading-skeleton');
      const bflyContainer = overlay.querySelector('.loading-butterfly');

      if (skelContainer && !skelContainer.__sprite) {
        console.log('🦴 初始化小骷髅动画');
        skelContainer.__sprite = new CanvasSprite(
          skelContainer,
          'https://i.postimg.cc/MGft6mWh/xiaokuloujiazai1.png',
          4, 1, 5
        );
      }

      if (bflyContainer && !bflyContainer.__sprite) {
        console.log('🦋 初始化蝴蝶动画');
        bflyContainer.__sprite = new CanvasSprite(
          bflyContainer,
          'https://i.postimg.cc/DyjfRzTx/hudie1.png',
          4, 1, 16/3
        );
      }
    }, 50);
  }

  /**
   * 隐藏加载界面
   * @param {string} overlayType - 加载界面类型
   */
  hideOverlay(overlayType = 'global') {
    // 🔴 关键修正：如果正在转场中，忽略自动隐藏请求（由转场回调接管）
    if (this.isTransitioning) {
      console.log(`⏸️ [${overlayType}] 转场进行中，忽略自动隐藏请求`);
      return;
    }

    // 停止提示词轮播
    this.stopTipRotation();

    const config = this.overlays[overlayType];
    if (!config) {
      console.warn(`❌ 未知的加载界面类型: ${overlayType}`);
      return;
    }

    const overlay = document.getElementById(config.id);
    if (!overlay) {
      console.warn(`❌ 加载界面元素未找到: ${config.id}`);
      return;
    }

    // 隐藏加载界面
    overlay.classList.add('hidden');
    config.visible = false;

    console.log(`✅ 隐藏加载界面: ${overlayType}`);
  }

  /**
   * 统一转场调度方法 - 中台化调度中心
   * 三段式流程：[遮罩/渐隐 -> 逻辑处理 -> 渐现]
   * @param {Object} config - 转场配置对象
   * @param {string} config.targetId - 目标场景 DOM 元素 ID
   * @param {Function} config.action - 切换逻辑函数（在遮罩显示后执行）
   * @param {string} config.overlayType - 使用的遮罩类型 ('global', 'gameplay', 'charSelect')
   * @returns {Promise} 转场完成后的 Promise
   */
  performTransition(config) {
    return new Promise((resolve) => {
      const { targetId, action, overlayType = 'global' } = config;
      
      if (!targetId || !action) {
        console.warn('[LoadingUI] performTransition: 缺少必要参数', config);
        resolve();
        return;
      }

      console.log(`🎬 [LoadingUI] 启动统一转场: ${overlayType} -> ${targetId}`);

      // 1. 设置全局转场标志位
      this.isTransitioning = true;

      // 2. 触发遮罩显示（如果遮罩未显示）
      const overlayConfig = this.overlays[overlayType];
      if (!overlayConfig) {
        console.warn(`[LoadingUI] 未知的遮罩类型: ${overlayType}`);
        this.isTransitioning = false;
        resolve();
        return;
      }

      const overlayEl = document.getElementById(overlayConfig.id);
      if (!overlayEl) {
        console.warn(`[LoadingUI] 遮罩元素未找到: ${overlayConfig.id}`);
        this.isTransitioning = false;
        resolve();
        return;
      }

      // 如果遮罩未显示，先显示它
      if (!overlayConfig.visible) {
        this.showOverlay(overlayType, '切换场景...');
      }

      // 3. 等待遮罩完全显示后，执行 action 回调
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          try {
            // 执行实际的切换逻辑（数据变更、页面切换等）
            const actionResult = action();
            
            // 如果 action 返回 Promise，等待它完成
            if (actionResult && typeof actionResult.then === 'function') {
              actionResult.then(() => {
                // 4. 执行平滑转场到目标场景
                this.transitionToScene(targetId, overlayType).then(() => {
                  this.isTransitioning = false;
                  resolve();
                });
              }).catch((error) => {
                console.error('[LoadingUI] performTransition action 执行失败:', error);
                this.isTransitioning = false;
                resolve();
              });
            } else {
              // 4. 执行平滑转场到目标场景
              this.transitionToScene(targetId, overlayType).then(() => {
                this.isTransitioning = false;
                resolve();
              });
            }
          } catch (error) {
            console.error('[LoadingUI] performTransition action 执行异常:', error);
            this.isTransitioning = false;
            resolve();
          }
        });
      });
    });
  }

  /**
   * 执行电影级转场：加载层淡出 + 目标场景淡入
   * @param {string} targetId - 目标 DOM 元素的 ID (如 'main-ui' 或 'main-menu')
   * @param {string} overlayType - 当前使用的加载层类型 ('global', 'gameplay' 等)
   * @returns {Promise} 动画完成后的 Promise
   */
  transitionToScene(targetId, overlayType = 'global') {
    return new Promise((resolve) => {
      // 🔴 关键修正：设置转场标志位，阻止自动隐藏
      this.isTransitioning = true;

      const overlayConfig = this.overlays[overlayType];
      const overlayEl = document.getElementById(overlayConfig.id);
      const targetEl = document.getElementById(targetId);

      if (!overlayEl || !targetEl) {
        console.warn('Transition targets not found');
        this.isTransitioning = false;
        resolve();
        return;
      }

      console.log(`🎬 启动转场: ${overlayType} -> ${targetId}`);

      // 1. 准备目标场景 (在幕后渲染)
      // 🔴 关键修复：彻底清理所有可能导致隐藏或不可交互的类
      targetEl.classList.remove('hidden', 'loaded', 'scene-exit', 'scene-hidden');
      
      // 🔴 关键修正：根据目标类型设置正确的 display 值
      if (targetId === 'main-ui') {
        targetEl.style.display = 'flex';
      } else if (targetId === 'main-menu') {
        targetEl.style.display = 'flex';
      } else if (targetId === 'char-select-screen') {
        targetEl.style.display = 'block';
      } else {
        // 默认使用 flex
        targetEl.style.display = 'flex';
      }
      
      // 🔴 关键修正：对于 #main-ui，只使用透明度过渡（避免与 setupScreenScaling 的 transform 冲突）
      // 对于 #main-menu 和 #char-select-screen，可以使用透明度 + 微缩放
      if (targetId === 'main-ui') {
        // ✅ CRITICAL FIX: 清除内联 opacity 样式，让 CSS 类控制透明度
        // 内联样式的优先级高于 CSS 类，必须清除才能让 scene-fade-in 和 scene-active 生效
        targetEl.style.opacity = '';
        // 仅透明度过渡
        targetEl.classList.add('scene-fade-in');
      } else if (targetId === 'main-menu' || targetId === 'char-select-screen') {
        // 主菜单和角色选择界面可以使用微缩放效果
        targetEl.classList.add('scene-transition', 'scene-enter');
      } else {
        // 其他界面默认使用微缩放效果
        targetEl.classList.add('scene-transition', 'scene-enter');
      }
      
      // 🔴 关键修正：强制浏览器重排 (Force Reflow) 以应用初始状态
      // 这确保从 display: none 到 display: flex 的过渡能正确应用 opacity 动画
      void targetEl.offsetWidth;

      // 2. 触发同步动画
      requestAnimationFrame(() => {
        // 场景：淡入（+ 可能的缩放归位）
        if (targetId === 'main-ui') {
          // 仅透明度
          targetEl.classList.add('scene-active');
        } else {
          // 透明度 + 微缩放（适用于 main-menu 和 char-select-screen）
          targetEl.classList.remove('scene-enter');
          targetEl.classList.add('scene-active');
        }
        
        // 加载层：淡出（立即释放点击穿透）
        overlayEl.classList.add('overlay-exit');
      });

      // 3. 动画结束后的清理工作 (等待 1000ms，略长于 CSS 的 0.8s 以确保安全)
      setTimeout(() => {
        // 强制隐藏加载层 (双重保险：类名 + 内联样式)
        overlayEl.classList.add('hidden');
        overlayEl.classList.remove('overlay-exit');
        overlayEl.style.display = 'none'; // 🔴 关键修复：强制隐藏
        
        const config = this.overlays[overlayType];
        if (config) {
          config.visible = false;
        }
        
        // 强制确保目标场景可交互
        targetEl.style.pointerEvents = 'auto'; // 🔴 关键修复：强制开启交互
        
        // ✅ CRITICAL FIX: 确保主UI可见（兜底机制）
        // 即使CSS动画失败，也要确保主UI可见，避免黑屏
        if (targetId === 'main-ui') {
          // ✅ CRITICAL FIX: 确保主UI拥有 loaded 类，防止 CSS 优先级问题导致隐藏
          targetEl.classList.add('loaded');
          // 再次确保不透明
          targetEl.style.opacity = '1';
          // 确保 scene-active 类已添加（如果因为某种原因没有添加）
          if (!targetEl.classList.contains('scene-active')) {
            targetEl.classList.add('scene-active');
            console.warn('⚠️ [LoadingUI] 兜底：手动添加 scene-active 类');
          }
          // 双重保险：检查计算后的 opacity（如果CSS没有生效）
          const computedStyle = window.getComputedStyle(targetEl);
          const computedOpacity = parseFloat(computedStyle.opacity);
          if (computedOpacity < 0.99) {
            targetEl.style.opacity = '1';
            console.warn('⚠️ [LoadingUI] 兜底：强制设置 opacity 为 1');
          }
        }
        
        // 🔴 关键修正：清理转场标志位
        this.isTransitioning = false;
        
        // 清理目标层动画类（保留 scene-fade-in 和 scene-transition 以保持过渡效果）
        // 这些类可以保留，不会影响后续操作
        
        console.log(`✨ 转场完成: ${overlayType} -> ${targetId} (交互已解锁)`);
        resolve();
      }, 1000);
    });
  }

  /**
   * 设置加载进度
   * @param {number} progress - 进度百分比 (0-100)
   * @param {string} overlayType - 加载界面类型
   */
  setProgress(progress, overlayType = 'global') {
    // 限制进度在 0-100 之间
    progress = Math.max(0, Math.min(100, progress));
    this.loadProgress[overlayType] = progress;

    const config = this.overlays[overlayType];
    if (!config) return;

    const overlay = document.getElementById(config.id);
    if (!overlay || overlay.classList.contains('hidden')) return;

    // 更新进度条
    const barElement = overlay.querySelector(config.barSelector);
    if (barElement) {
      barElement.style.width = progress + '%';
    }

    // 更新进度百分比文本
    const percentElement = overlay.querySelector(config.percentSelector);
    if (percentElement) {
      percentElement.textContent = progress + '%';
    }

    console.log(`📊 [${overlayType}] 加载进度: ${progress}%`);
  }

  /**
   * 设置加载提示文本
   * @param {string} tip - 提示文本
   * @param {string} overlayType - 加载界面类型
   */
  setTip(tip, overlayType = 'global') {
    const config = this.overlays[overlayType];
    if (!config) return;

    const overlay = document.getElementById(config.id);
    if (!overlay || overlay.classList.contains('hidden')) return;

    const tipElement = overlay.querySelector(config.tipSelector);
    if (tipElement) {
      tipElement.textContent = tip;
      // 确保文本可见（如果之前有淡出动画）
      tipElement.style.opacity = '1';
    }

    // 当外部手动设置提示时，重置轮播计时器
    // 这样可以让用户看到手动设置的提示，然后再继续轮播
    if (this.tipInterval || this.tipStartDelay) {
      this.stopTipRotation();
      // 延迟 2.5 秒后重新开始轮播
      setTimeout(() => {
        if (this.isVisible(overlayType)) {
          this.startTipRotation(overlayType);
        }
      }, 2500);
    }

    console.log(`💬 [${overlayType}] 加载提示: ${tip}`);
  }

  /**
   * 开始提示词轮播
   * @param {string} overlayType - 加载界面类型
   */
  startTipRotation(overlayType) {
    // 先清除可能存在的定时器，防止内存泄漏
    this.stopTipRotation();

    // 防御性检查：确保 GAME_TIPS 数据存在且有效
    if (!GAME_TIPS || !Array.isArray(GAME_TIPS) || GAME_TIPS.length === 0) {
      console.warn('⚠️ GAME_TIPS 数据无效，跳过提示词轮播');
      return;
    }

    const config = this.overlays[overlayType];
    if (!config) {
      console.warn(`❌ 未知的加载界面类型: ${overlayType}`);
      return;
    }

    // 获取 overlay 容器元素
    const overlay = document.getElementById(config.id);
    if (!overlay) {
      console.warn(`❌ 加载界面元素未找到: ${config.id}`);
      return;
    }

    // 获取提示文本元素
    const tipEl = overlay.querySelector(config.tipSelector);
    if (!tipEl) {
      console.warn(`❌ 提示文本元素未找到: ${config.tipSelector}`);
      return;
    }

    // 确保元素有 transition 样式（如果 CSS 中没有，这里添加）
    if (!tipEl.style.transition) {
      tipEl.style.transition = 'opacity 0.3s ease-in-out';
    }

    // 延迟启动：等待 2.5 秒后开始轮播，让用户先看到初始的技术提示
    const startDelay = setTimeout(() => {
      // 第一次切换提示
      this._rotateTip(overlay, tipEl, config);

      // 之后每 3.5 秒切换一次
      this.tipInterval = setInterval(() => {
        // 检查 overlay 是否仍然可见
        if (!this.isVisible(overlayType) || overlay.classList.contains('hidden')) {
          this.stopTipRotation();
          return;
        }

        // 轮播切换提示
        this._rotateTip(overlay, tipEl, config);
      }, 3500); // 每 3.5 秒切换一次
    }, 2500); // 延迟 2.5 秒启动

    // 将延迟定时器也保存，以便在 stopTipRotation 中清除
    this.tipStartDelay = startDelay;
  }

  /**
   * 内部方法：执行单次提示词切换（带淡入淡出动画）
   * @param {HTMLElement} overlay - overlay 容器元素
   * @param {HTMLElement} tipEl - 提示文本元素
   * @param {Object} config - overlay 配置对象
   * @private
   */
  _rotateTip(overlay, tipEl, config) {
    // 再次检查元素是否存在（防御性编程）
    if (!tipEl || !overlay || overlay.classList.contains('hidden')) {
      return;
    }

    // 防御性检查：确保 GAME_TIPS 数据有效
    if (!GAME_TIPS || !Array.isArray(GAME_TIPS) || GAME_TIPS.length === 0) {
      return;
    }

    // 随机选择一条提示（确保索引在有效范围内）
    const randomIndex = Math.floor(Math.random() * GAME_TIPS.length);
    const randomTip = GAME_TIPS[randomIndex];

    if (!randomTip) {
      console.warn('⚠️ 随机选择的提示词无效');
      return;
    }

    // 淡出动画
    tipEl.style.opacity = '0';

    // 等待淡出动画完成（300ms）后切换文本并淡入
    setTimeout(() => {
      // 再次检查元素是否仍然存在且可见
      if (!tipEl || !overlay || overlay.classList.contains('hidden')) {
        return;
      }

      // 切换文本
      tipEl.textContent = randomTip;

      // 淡入动画
      tipEl.style.opacity = '1';
    }, 300); // 等待 300ms 淡出动画完成
  }

  /**
   * 停止提示词轮播
   * 清除所有相关定时器，防止内存泄漏
   */
  stopTipRotation() {
    // 清除轮播定时器
    if (this.tipInterval) {
      clearInterval(this.tipInterval);
      this.tipInterval = null;
    }

    // 清除延迟启动定时器
    if (this.tipStartDelay) {
      clearTimeout(this.tipStartDelay);
      this.tipStartDelay = null;
    }
  }

  /**
   * 检查加载界面是否可见
   * @param {string} overlayType - 加载界面类型
   * @returns {boolean} 是否可见
   */
  isVisible(overlayType = 'global') {
    return this.overlays[overlayType]?.visible || false;
  }

  /**
   * 获取当前加载进度
   * @param {string} overlayType - 加载界面类型
   * @returns {number} 进度百分比
   */
  getProgress(overlayType = 'global') {
    return this.loadProgress[overlayType] || 0;
  }

  /**
   * 强制隐藏所有加载界面
   */
  hideAllOverlays() {
    Object.keys(this.overlays).forEach(overlayType => {
      this.hideOverlay(overlayType);
    });
    console.log('✅ 所有加载界面已隐藏');
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
        // 判断元素类型：main-ui使用scene-fade-in，其他使用scene-transition
        if (elementId === 'main-ui') {
          element.classList.add('scene-fade-in');
        } else {
          element.classList.add('scene-transition');
        }
      }

      // 移除激活状态，添加离场状态
      element.classList.remove('scene-active', 'scene-visible');
      element.classList.add('scene-exit');

      // 使用transitionend事件监听动画完成（更准确）
      const handleTransitionEnd = (e) => {
        // 只处理opacity的transition，避免transform冲突
        if (e.target === element && e.propertyName === 'opacity') {
          element.removeEventListener('transitionend', handleTransitionEnd);
          
          // 动画结束后，隐藏元素
          element.classList.add('hidden');
          // 对于leaderboard-overlay等特殊元素，使用!important
          if (elementId === 'leaderboard-overlay') {
            element.style.setProperty('display', 'none', 'important');
          } else {
            element.style.display = 'none';
          }
          
          // 清理动画类（保留基础类以便下次使用）
          // 🔴 关键修复：彻底清理所有离场/隐藏相关的类，防止状态残留
          element.classList.remove('scene-exit', 'scene-active', 'scene-visible', 'scene-hidden');
          
          console.log(`✅ [LoadingUI] 场景淡出完成: ${elementId}`);
          resolve();
        }
      };

      // 添加事件监听
      element.addEventListener('transitionend', handleTransitionEnd);

      // 兜底：如果transitionend事件没有触发（某些情况下可能不会触发），使用setTimeout
      setTimeout(() => {
        // 检查是否已经resolve（通过检查事件监听器是否还在）
        // 如果元素仍然有scene-exit类，说明transitionend没有触发，需要手动处理
        if (element.classList.contains('scene-exit')) {
          element.removeEventListener('transitionend', handleTransitionEnd);
          element.classList.add('hidden');
          // 对于leaderboard-overlay等特殊元素，使用!important
          if (elementId === 'leaderboard-overlay') {
            element.style.setProperty('display', 'none', 'important');
          } else {
            element.style.display = 'none';
          }
          // 🔴 关键修复：彻底清理所有离场/隐藏相关的类，防止状态残留
          element.classList.remove('scene-exit', 'scene-active', 'scene-visible', 'scene-hidden');
          console.log(`✅ [LoadingUI] 场景淡出完成（超时兜底）: ${elementId}`);
          resolve();
        }
      }, duration + 100); // 略长于动画时间，确保安全
    });
  }
}

