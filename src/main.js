// main.js
import { TILE_SIZE, MAP_WIDTH, MAP_HEIGHT, TILE, EQUIPMENT_DB, BUFF_POOL, DRAFT_TIER_CONFIG, OBJ_TRAP, OBJ_SHRINE_HEAL, OBJ_SHRINE_POWER, LOOT_TABLE_DESTRUCTIBLE, CHARACTERS, DIFFICULTY_LEVELS, ASSETS, CRITICAL_ASSETS, GAMEPLAY_ASSETS, RARITY, LOOT_TABLE, CONSUMABLE_IDS, getRandomConsumable, getAscensionLevel, getAscensionLevelTooltip, getAscensionLevelNewEffect, getDifficultyString, getItemDefinition, RUNE_RARITY_MULTIPLIERS } from './constants.js';
import { Camera, FloatingText } from './utils.js';
import { ResourceManager } from './utils/ResourceManager.js';
import { FloatingTextPool, FogParticlePool } from './utils/ObjectPool.js';
import { Player, Monster } from './entities.js';
import { MapSystem } from './systems/MapSystem.js';
import { CombatSystem } from './systems/CombatSystem.js';
import { RoguelikeSystem } from './systems/RoguelikeSystem.js';
import { BlacksmithSystem } from './systems/BlacksmithSystem.js';
import { UIManager } from './systems.js';
import { LoadingUI } from './ui/LoadingUI.js';
import { ForgeUI } from './ui/ForgeUI.js';
import { SaveSystem } from './save.js';
import { AudioManager } from './audio/AudioManager.js';
import { MetaSaveSystem } from './MetaSaveSystem.js';
import { TalentTreeUI } from './TalentTreeUI.js';
import { supabaseService } from './services/SupabaseService.js';
import { LeaderboardUI } from './ui/LeaderboardUI.js';
import { AchievementSystem } from './systems/AchievementSystem.js';
import { AchievementUI } from './ui/AchievementUI.js';
import { getDevModeManager } from './utils/DevModeManager.js';
import { lootGenerator } from './systems/LootGenerationSystem.js';
import { SeededRandom } from './utils/SeededRandom.js';
import { DailyChallengeSystem } from './systems/DailyChallengeSystem.js';


class Game {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');
    
    // 使用统一的资源管理器（全局单例）
    this.loader = window.ResourceManager || new ResourceManager();
    if (!window.ResourceManager) {
      window.ResourceManager = this.loader;
    }
    
    this.ui = new UIManager();
    this.roguelike = new RoguelikeSystem(this);
    this.loadingUI = new LoadingUI();
    this.inputStack = [];
    this.isPaused = false;
    
    // 初始化元进度存档系统（灵魂水晶和天赋）
    this.metaSaveSystem = new MetaSaveSystem();
    console.log('[Game] 元进度系统已初始化');
    
    // 初始化铁匠系统和UI
    this.blacksmithSystem = new BlacksmithSystem();
    this.forgeUI = null; // 延迟初始化
    
    // FIX: 挂载CombatSystem到game实例，供Monster类使用
    this.combatSystem = CombatSystem;
    
    // 初始化天赋树UI（延迟初始化，第一次打开时创建）
    this.talentTreeUI = null;
    
    // 初始化排行榜UI
    this.leaderboardUI = new LeaderboardUI(this);
    console.log('[Game] 排行榜UI已初始化');
    
    // 初始化成就系统
    this.achievementSystem = new AchievementSystem(this);
    this.achievementUI = new AchievementUI(this);
    this.achievementSystem.setUI(this.achievementUI);
    console.log('[Game] 成就系统已初始化');
    
    // 初始化音效管理器
    this.audio = AudioManager.getInstance();
    console.log('[Game] 音效管理器已初始化');
    
    // 初始化程序化装备生成系统
    this.lootGenerator = lootGenerator;
    window.__lootGenerator = lootGenerator; // 全局访问
    console.log('[Game] 程序化装备生成系统已初始化');
    
    // 种子随机数生成器（用于每日挑战等确定性生成）
    // 普通模式下保持为 null，使用 Math.random()
    this.rng = null;
    
    // 每日挑战模式标志
    this.isDailyMode = false;
    
    // CRITICAL FIX: 每日挑战日期（用于跨日提交时保持一致性）
    // 保存挑战开始时的日期，确保提交成绩时使用正确的日期，防止跨日数据污染
    this.dailyChallengeDate = null;
    
    // CRITICAL FIX: 初始化每日挑战词缀倍数（默认值为 1.0）
    this.dailyShopPriceMultiplier = 1.0;
    this.dailyEliteSpawnMultiplier = 1.0;
    
    // 对象池系统 - 提升性能，减少GC压力
    this.floatingTextPool = new FloatingTextPool(20, 100);
    this.fogParticlePool = new FogParticlePool(50, 500);
    
    this.floatingTexts = [];
    this.killCount = 0;
    this.totalXpGained = 0;
    // FIX: 添加实际伤害累加计数器（用于排行榜统计）
    this.totalDamageDealt = 0;
    this.constants = { BUFF_POOL, DRAFT_TIER_CONFIG };
    
    // Character Selection State
    this.selectedCharId = 'WARRIOR';
    this.selectedDiff = 'normal'; // @deprecated 保留用于向后兼容
    this.selectedAscensionLevel = 1; // 新的噩梦层级（1-25）
    this.difficultyMultiplier = 1.0; // @deprecated 保留用于向后兼容
    
    // Game Configuration (stores settings like fog of war and dynamic lighting)
    this.config = {
      enableFog: true,
      enableLighting: true
    };
    this.gameStarted = false;
    
    // Camera zoom system
    this.cameraZoom = 1.0;
    this.minZoom = 0.5;
    this.maxZoom = 3.0;
    this.zoomSpeed = 0.1;
    
    // Settings system
    this.settings = this.loadSettings();
    
    // 标志：设置事件监听器是否已初始化（防止重复绑定）
    this.settingsListenersInitialized = false;
    
    // 全屏状态变化监听器引用（用于防止重复绑定）
    this.fullscreenChangeHandler = null;
    
    // FPS 计数器初始化
    this.lastFpsTime = 0;
    this.frameCount = 0;
    this.currentFps = 0;
    
    // 创建 FPS 显示元素（如果不存在）
    let fpsCounter = document.getElementById('fps-counter');
    if (!fpsCounter) {
      fpsCounter = document.createElement('div');
      fpsCounter.id = 'fps-counter';
      document.body.appendChild(fpsCounter);
    }
    
    // 初始化开发者模式管理器
    window.devModeManager = getDevModeManager();
    console.log('[Game] 开发者模式管理器已初始化');
    
    window.game = this; // Expose globally for UI onclick
  }


  /**
   * 等待所有 DOM 中的图片资源加载完毕
   * 监听 <img> 标签和 CSS background-image 的加载状态
   */
  async waitForAllDOMImagesLoaded() {
    return new Promise((resolve) => {
      // 收集所有需要加载的图片
      const imageElements = document.querySelectorAll('img');
      const elementsWithBg = document.querySelectorAll('[style*="background-image"], [style*="backgroundImage"]');
      
      let totalImages = imageElements.length + elementsWithBg.length;
      let loadedImages = 0;
      
      console.log(`[ResourceMonitor] Found ${totalImages} DOM images to monitor`);
      
      if (totalImages === 0) {
        console.log('[ResourceMonitor] No DOM images to wait for, proceeding...');
        resolve();
        return;
      }
      
      const checkComplete = () => {
        loadedImages++;
        const percent = Math.round((loadedImages / totalImages) * 100);
        console.log(`[ResourceMonitor] DOM images loaded: ${loadedImages}/${totalImages} (${percent}%)`);
        
        if (loadedImages >= totalImages) {
          console.log('[ResourceMonitor] All DOM images loaded!');
          resolve();
        }
      };
      
      // 监听 <img> 标签
      imageElements.forEach(img => {
        if (img.complete && img.naturalHeight !== 0) {
          // 图片已经加载
          checkComplete();
        } else {
          // 等待图片加载
          img.addEventListener('load', checkComplete, { once: true });
          img.addEventListener('error', checkComplete, { once: true });
        }
      });
      
      // 监听 CSS background-image（通过加载图片对象）
      elementsWithBg.forEach(el => {
        const bgImage = window.getComputedStyle(el).backgroundImage;
        if (bgImage && bgImage !== 'none') {
          const urlMatch = bgImage.match(/url\(['"]?([^'"()]+)['"]?\)/);
          if (urlMatch) {
            const imageUrl = urlMatch[1];
            const img = new Image();
            img.onload = checkComplete;
            img.onerror = checkComplete;
            img.src = imageUrl;
          } else {
            checkComplete();
          }
        } else {
          checkComplete();
        }
      });
    });
  }

  /**
   * 等待所有样式表加载完毕
   */
  async waitForResourceManager() {
    return new Promise((resolve) => {
      const rm = window.ResourceManager;
      if (!rm) {
        resolve();
        return;
      }
      let done = false;
      const finish = () => { if (!done) { done = true; resolve(); } };
      window.addEventListener('resourcesLoaded', finish, { once: true });
      // 超时兜底，防止卡死
      setTimeout(finish, 8000);
    });
  }

  async waitForAllStylesLoaded() {
    return new Promise((resolve) => {
      const links = document.querySelectorAll('link[rel="stylesheet"]');
      let totalLinks = links.length;
      let loadedLinks = 0;
      
      console.log(`[ResourceMonitor] Found ${totalLinks} stylesheets to monitor`);
      
      if (totalLinks === 0) {
        console.log('[ResourceMonitor] No stylesheets to wait for, proceeding...');
        resolve();
        return;
      }
      
      const checkComplete = () => {
        loadedLinks++;
        const percent = Math.round((loadedLinks / totalLinks) * 100);
        console.log(`[ResourceMonitor] Stylesheets loaded: ${loadedLinks}/${totalLinks} (${percent}%)`);
        
        if (loadedLinks >= totalLinks) {
          console.log('[ResourceMonitor] All stylesheets loaded!');
          resolve();
        }
      };
      
      links.forEach(link => {
        // 检查样式表是否已加载（通过检查 sheet 属性）
        if (link.sheet) {
          checkComplete();
        } else {
          link.addEventListener('load', checkComplete, { once: true });
          link.addEventListener('error', checkComplete, { once: true });
        }
      });
    });
  }

  /**
   * 等待所有字体加载完毕（使用 FontFaceSet API）
   */
  async waitForFontsLoaded() {
    return new Promise((resolve) => {
      if (document.fonts && document.fonts.ready) {
        console.log('[ResourceMonitor] Waiting for fonts to load...');
        document.fonts.ready.then(() => {
          console.log('[ResourceMonitor] All fonts loaded!');
          resolve();
        }).catch((e) => {
          console.warn('[ResourceMonitor] Font loading error (non-critical):', e);
          resolve(); // 即使字体加载失败也继续
        });
      } else {
        console.log('[ResourceMonitor] FontFaceSet API not available, skipping font check');
        resolve();
      }
    });
  }

  /**
   * 监听页面的完整加载状态
   */
  async waitForPageFullyLoaded() {
    return new Promise((resolve) => {
      if (document.readyState === 'complete') {
        console.log('[ResourceMonitor] Page already fully loaded');
        resolve();
      } else {
        window.addEventListener('load', () => {
          console.log('[ResourceMonitor] Page fully loaded event fired');
          resolve();
        }, { once: true });
      }
    });
  }

  /**
   * 设置输入处理（键盘和鼠标）
   */
  setupInputs() {
    const normalizeKey = (key) => {
      const k = (key || '').toLowerCase();
      if (k === 'w' || k === 'arrowup') return 'ArrowUp';
      if (k === 's' || k === 'arrowdown') return 'ArrowDown';
      if (k === 'a' || k === 'arrowleft') return 'ArrowLeft';
      if (k === 'd' || k === 'arrowright') return 'ArrowRight';
      return null;
    };

    window.addEventListener('keydown', (e) => {
      // FIX: 如果游戏暂停（UI打开），阻止所有游戏输入
      if (this.isPaused) {
        // 只允许关闭UI的快捷键（如ESC）
        if (e.key === 'Escape') {
          // 让UI自己处理ESC关闭逻辑
          return;
        }
        // 阻止其他所有输入
        e.preventDefault();
        return;
      }
      
      // Toggle System Log lock with Enter
      if (e.key === 'Enter') {
        e.preventDefault();
        if (this.ui && this.ui.toggleLog) this.ui.toggleLog();
        return;
      }
      // Active Skill (Q key)
      // FIX: 冰冻状态下禁止使用技能
      if (e.key.toLowerCase() === 'q') {
        if (this.player && this.player.hasStatus && this.player.hasStatus('FROZEN')) {
          if (this.ui) this.ui.logMessage('冰冻状态下无法使用技能！', 'warning');
          return;
        }
        e.preventDefault();
        if (this.player && this.player.castActiveSkill) {
          this.player.castActiveSkill();
        }
        return;
      }
      const dir = normalizeKey(e.key);
      if (dir) { if (!this.inputStack.includes(dir)) this.inputStack.push(dir); e.preventDefault(); }
      if (e.key === ' ') { e.preventDefault(); if (this.player && this.player.stats.rage >= 100) this.activateUltimate(); }
    });
    
    window.addEventListener('keyup', (e) => {
      const dir = normalizeKey(e.key); 
      if (dir) this.inputStack = this.inputStack.filter(k => k !== dir);
    });

    // Setup mouse wheel zoom
    const canvasWrapper = document.getElementById('canvas-wrapper');
    if (canvasWrapper) {
      canvasWrapper.addEventListener('wheel', (e) => {
        if (!this.gameStarted) return;
        e.preventDefault();
        
        // 以玩家为中心缩放（不改变canvas尺寸，只改变绘制缩放）
        const zoomDelta = e.deltaY > 0 ? -this.zoomSpeed : this.zoomSpeed;
        const newZoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.cameraZoom + zoomDelta));
        
        // 检查新的缩放是否会导致相机可视区域超出地图边界
        if (this.camera && this.player) {
          const canvasWidth = this.canvas.width;
          const canvasHeight = this.canvas.height;
          
          // 计算新缩放下的相机可视区域
          const newCameraWidth = canvasWidth / newZoom;
          const newCameraHeight = canvasHeight / newZoom;
          
          // 获取地图的实际尺寸（像素）
          const mapPixelWidth = MAP_WIDTH * TILE_SIZE;
          const mapPixelHeight = MAP_HEIGHT * TILE_SIZE;
          
          // 检查相机可视区域是否会超出地图边界
          // 只有当相机可视区域小于等于地图尺寸时才允许缩放
          if (newCameraWidth <= mapPixelWidth && newCameraHeight <= mapPixelHeight) {
            this.cameraZoom = newZoom;
            // 立即跟随玩家，确保缩放后仍以玩家为中心
            this.camera.follow(this.player);
          }
          // 如果缩放会导致超出边界，则不更新缩放值
        }
      }, { passive: false });
    }
  }

  async init() {
    try {
      console.log('[Init] 🚀 启动并行初始化流程...');
      
      // 1. 立即显示加载界面
      this.loadingUI.init(); // 确保 DOM 引用已抓取
      this.loadingUI.showOverlay('global', '正在初始化核心系统...');
      
      // 2. 定义并行任务池
      // 系统级任务 (通常很快)
      const sysTasks = [
        this.waitForPageFullyLoaded(),
        this.waitForAllStylesLoaded(),
        this.waitForFontsLoaded()
      ];

      // 资源加载任务 (关键路径)
      // 将关键资源加载进度映射到 0-70%
      const assetTask = this.loader.loadCriticalAssets(CRITICAL_ASSETS, (percent) => {
        const visualPercent = Math.min(70, Math.floor(percent * 0.7));
        this.loadingUI.setProgress(visualPercent, 'global');
      });

      // 音频加载任务 (并行进行)
      const audioTask = this.audio.preloadCritical();

      // 3. 等待所有关键任务并行完成
      // 这里我们使用 Promise.all，意味着只有当所有 CSS/字体/关键图片/UI音效都就绪后才继续
      await Promise.all([...sysTasks, assetTask, audioTask]);
      
      console.log('[Init] 核心资源并行加载完成');
      this.loadingUI.setProgress(80, 'global');
      this.loadingUI.setTip('正在构建游戏世界...', 'global');

      // 4. 初始化游戏系统 (同步逻辑)
      // 稍微延迟一帧以允许 UI 刷新
      await new Promise(resolve => requestAnimationFrame(resolve));

      // 音频设置与恢复策略
      this.audio.updateVolumes(this.settings);
      this.setupAudioResume();
      
      // 传递 loader 给 UI 组件
      if (this.ui && this.ui.setBestiaryLoader) {
        this.ui.setBestiaryLoader(this.loader);
      }

      // 初始化核心系统
      this.map = new MapSystem(this.loader, this.difficultyMultiplier);
      this.player = new Player(this.map, this.loader);
      this.camera = new Camera(800, 800, MAP_WIDTH * TILE_SIZE, MAP_HEIGHT * TILE_SIZE);
      
      // 设置输入与事件
      this.setupInputs();
      
      // 检测当前页面环境（用于区分主菜单页面和游戏页面）
      const isGamePage = window.location.pathname.endsWith('game.html') || window.location.href.includes('game.html');
      
      // 设置菜单与 UI
      if (!isGamePage) {
        this.setupMenuButtons();
      } else {
        this.setupBackpackIcon();
      }
      this.setupScreenScaling();
      
      // 启动游戏循环
      this.lastTime = 0;
      requestAnimationFrame(t => this.loop(t));

      // 5. 初始化排行榜 (异步，不阻塞)
      this.loadingUI.setTip('连接排行榜服务...', 'global');
      await this.initLeaderboardUser();
      
      this.loadingUI.setProgress(100, 'global');
      
      // 6. 显示主菜单并隐藏加载屏（仅在主菜单页面）
      if (!isGamePage) {
        // 预先初始化主菜单 DOM (但不显示)
        this.showMainMenu(true); // 仅预备不显示
        // 执行转场
        await this.loadingUI.transitionToScene('main-menu', 'global');
        
        // 安全阀：强制移除全局加载层的阻挡 (防止按钮无法点击)
        const loadingOverlay = document.getElementById('loading-overlay');
        if (loadingOverlay) {
          loadingOverlay.style.display = 'none';
          loadingOverlay.style.pointerEvents = 'none';
          console.log('[Init] 安全阀：强制移除加载层阻挡');
        }
      } else {
        console.log('[Init] 游戏页面检测到，跳过主菜单显示');
        
        // FIX: 如果是每日挑战模式，不要隐藏加载层，直接保持显示以实现平滑过渡
        const gameMode = sessionStorage.getItem('gameMode');
        if (gameMode !== 'daily') {
          this.loadingUI.hideOverlay('global');
        } else {
          console.log('[Init] 每日挑战模式：保持加载层显示，等待 startDailyChallenge 接管');
          // 可以更新一下提示文字
          this.loadingUI.setTip('准备每日挑战...', 'global');
        }
      }
      
      // 7. [关键优化] 闲时后台预加载
      // 主菜单显示后，立即在后台加载游戏内重型资源，为"开始游戏"做准备
      setTimeout(() => {
        console.log('[Init] 启动后台静默预加载...');
        this.loader.loadGameplayAssets(GAMEPLAY_ASSETS).catch(e => console.warn('后台资源加载警告:', e));
        this.audio.preloadGameplayAudio().catch(e => console.warn('后台音频加载警告:', e));
      }, 100);
      
      // 调试辅助：在点击时输出被点击的元素，帮助定位遮挡问题
      // 仅在开发环境下或调试时有用，不影响正常逻辑
      document.addEventListener('click', (e) => {
        console.log('Clicked element:', e.target);
        console.log('   Parent path:', e.composedPath());
      }, { once: true }); // 只运行一次，避免刷屏

    } catch (e) {
      console.error('[Init] CRITICAL ERROR:', e);
      alert('游戏初始化失败，请检查控制台。\n' + e.message);
      this.loadingUI.hideOverlay('global');
    }
  }

  /**
   * 初始化排行榜用户
   */
  async initLeaderboardUser() {
    try {
      console.log('[Game] 初始化排行榜用户...');
      const userStatus = await supabaseService.initUser();
      
      // 检查是否为离线模式
      if (userStatus.offline) {
        console.warn('[Leaderboard] 离线模式，排行榜功能不可用');
        
        // 显示详细的离线原因给用户
        const errorReason = userStatus.errorReason || '未知原因';
        const connectionStatus = userStatus.connectionStatus || 'UNKNOWN';
        
        // 根据连接状态显示不同的消息
        let userMessage = '';
        let technicalDetails = '';
        let suggestedAction = '';
        
        if (connectionStatus === 'SDK_ERROR') {
          userMessage = '排行榜 SDK 加载失败\n\n' +
                       '可能原因：\n' +
                       '1. CSP（内容安全策略）阻止了 SDK 加载\n' +
                       '2. CDN (cdn.jsdelivr.net) 无法访问\n' +
                       '3. 网络连接问题\n\n' +
                       '您现在处于离线模式。';
          suggestedAction = '建议操作：\n' +
                           '1. 刷新页面重试（F5）\n' +
                           '2. 检查浏览器控制台查看详细错误\n' +
                           '3. 确认网络连接正常';
          technicalDetails = `技术详情: ${errorReason}`;
        } else if (connectionStatus === 'NETWORK_ERROR') {
          userMessage = '无法连接到排行榜服务器\n\n' +
                       '可能原因：\n' +
                       '1. 服务器正在休眠（Supabase 免费版会自动暂停）\n' +
                       '2. 网络连接问题\n' +
                       '3. 服务器维护中\n\n' +
                       '您现在处于离线模式，游戏功能不受影响，但无法提交分数到排行榜。';
          suggestedAction = '建议操作：\n' +
                           '请稍后重试，服务器可能需要几秒钟唤醒';
          technicalDetails = `技术详情: ${errorReason}`;
        } else if (connectionStatus === 'AUTH_ERROR') {
          userMessage = '排行榜服务器身份验证失败\n\n' +
                       'API Key 可能无效或已过期。\n' +
                       '请联系开发者检查配置。\n\n' +
                       '您现在处于离线模式。';
          suggestedAction = '建议操作：\n' +
                           '联系游戏开发者报告此问题';
          technicalDetails = `技术详情: ${errorReason}`;
        } else if (connectionStatus === 'URL_ERROR') {
          userMessage = '排行榜服务器地址错误\n\n' +
                       'Supabase Project URL 可能配置错误。\n' +
                       '请联系开发者检查配置。\n\n' +
                       '您现在处于离线模式。';
          suggestedAction = '建议操作：\n' +
                           '联系游戏开发者报告此问题';
          technicalDetails = `技术详情: ${errorReason}`;
        } else {
          userMessage = '无法连接到排行榜服务器\n\n' +
                       '您现在处于离线模式，游戏功能不受影响，但无法提交分数到排行榜。';
          suggestedAction = '建议操作：\n' +
                           '请刷新页面重试';
          technicalDetails = `技术详情: ${errorReason}`;
        }
        
        // 显示警告消息给用户
        console.warn(`[Leaderboard] ${technicalDetails}`);
        
        // 显示详细的错误信息给用户
        const fullMessage = userMessage + '\n\n' + 
                           suggestedAction + '\n\n' + 
                           '─────────────────────\n' +
                           technicalDetails;
        
        // 使用 Alert 显示给用户（简单直接）
        alert(fullMessage);
        
        // 在控制台输出完整的诊断信息（方便调试）
        console.group('[Leaderboard] 离线模式诊断报告');
        console.error('连接状态:', connectionStatus);
        console.error('错误原因:', errorReason);
        console.error('完整状态对象:', JSON.stringify(userStatus, null, 2));
        console.groupEnd();
        
        // 可选：显示一个更美观的 Toast/Overlay（如果你有相应的 UI 组件）
        // this.showOfflineModeWarning(userMessage, technicalDetails);
        
        return;
      }
      
      // 在线模式
      console.log('[Leaderboard] 排行榜服务连接正常');
      
      if (!userStatus.registered) {
        // 用户未注册，显示昵称注册模态框
        console.log('[Leaderboard] 显示昵称注册模态框');
        this.showNicknameModal();
      } else {
        console.log('[Leaderboard] 用户已登录:', userStatus.nickname);
      }
    } catch (error) {
      console.error('[Leaderboard] 初始化用户失败:', error);
    }
  }

  /**
   * 显示昵称注册模态框
   */
  showNicknameModal() {
    const modal = document.getElementById('nickname-modal');
    if (!modal) return;

    const input = document.getElementById('nickname-input');
    const errorSpan = document.getElementById('nickname-error');
    const registerBtn = document.getElementById('btn-register-nickname');
    const skipBtn = document.getElementById('btn-skip-register');

    // 清空之前的输入
    if (input) input.value = '';
    if (errorSpan) errorSpan.textContent = '';

    // 显示模态框
    modal.classList.remove('hidden');
    modal.style.display = 'flex'; // 强制设置内联样式作为后备

    // 绑定注册按钮事件
    if (registerBtn) {
      registerBtn.onclick = async () => {
        const nickname = input?.value?.trim();
        if (!nickname) {
          if (errorSpan) errorSpan.textContent = '请输入昵称';
          return;
        }

        registerBtn.disabled = true;
        registerBtn.textContent = '注册中...';

        const result = await supabaseService.registerUser(nickname);

        if (result.success) {
          console.log('[Leaderboard] 用户注册成功');
          modal.classList.add('hidden');
          if (this.ui) {
            this.ui.logMessage(`欢迎，${nickname}！`, 'gain');
          }
        } else {
          if (errorSpan) errorSpan.textContent = result.message;
          registerBtn.disabled = false;
          registerBtn.textContent = '确认';
        }
      };
    }

    // 绑定跳过按钮事件
    if (skipBtn) {
      skipBtn.onclick = () => {
        modal.classList.add('hidden');
        console.log('[Leaderboard] 用户跳过注册');
      };
    }

    // 支持回车键提交
    if (input) {
      input.onkeydown = (e) => {
        if (e.key === 'Enter') {
          registerBtn?.click();
        }
      };
    }
  }

  /**
   * 屏幕缩放系统 - 确保游戏 UI 在任何屏幕尺寸上保持完美比例
   * Design Resolution: 1840x900 (基础设计分辨率)
   * Scaling Method: Letterboxing (保持宽高比，两侧/上下留黑边)
   */
  setupScreenScaling() {
    const designWidth = 1840;  // CSS 中 #main-ui 的宽度
    const designHeight = 900;  // CSS 中 #main-ui 的高度
    
    const handleResize = () => {
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;
      
      // 计算缩放因子（保持宽高比，取较大值 - 铺满屏幕）
      const scaleX = windowWidth / designWidth;
      const scaleY = windowHeight / designHeight;
      const scale = Math.max(scaleX, scaleY);
      
      // 应用缩放变换到 #main-ui 容器
      const mainUI = document.getElementById('main-ui');
      if (mainUI) {
        mainUI.style.transform = `scale(${scale})`;
      }
      
      // 调试信息
      console.log(`[Screen Scaling] Window: ${windowWidth}x${windowHeight}, Scale: ${scale.toFixed(3)}`);
    };
    
    // 初始调用
    handleResize();
    
    // 监听窗口大小变化
    window.addEventListener('resize', handleResize);
    
    // 存储 handleResize 以便后续需要时调用
    this.handleResize = handleResize;
  }

  nextLevel() {
    // v2.1: 重置符文刷新费用
    if (this.roguelike && this.roguelike.resetRerollCost) {
      this.roguelike.resetRerollCost();
    }
    // v2.1: 重置符文刷新费用
    if (this.roguelike && this.roguelike.resetRerollCost) {
      this.roguelike.resetRerollCost();
    }
    // 成就系统：检测层结束（在进入新层之前）
    if (this.achievementSystem) {
      this.achievementSystem.check('onLevelEnd');
    }
    
    // FIX: 层级切换时清除技能预备状态 - 防止玩家带着预搓好的技能进入下一层
    if (this.player && this.player.clearPrimedStates) {
      this.player.clearPrimedStates();
    }
    
    // FIX: 先增加楼层，再生成地图
    // 使用新的噩梦层级系统
    // 将ascensionLevel传递给MapSystem用于生成层级（确保有默认值1）
    const ascensionLevel = this.selectedAscensionLevel ?? 1;
    this.player.stats.floor++;
    // 每日挑战模式：传入 RNG 以确保确定性生成
    this.map.generateLevel(this.player.stats.floor, ascensionLevel, this.isDailyMode ? this.rng : null);
    
    // FIX: 清除浮动文字池，防止残留文字在错误的坐标显示
    // OPTIMIZATION: 直接清空数组即可，对象会在 loop 中被 releaseDeadObjects 自动回收
    // 不需要先 release 再 clear，这样更高效且避免竞争条件
    this.floatingTexts = [];
    if (this.floatingTextPool && this.floatingTextPool.clear) {
      // 清空对象池（释放所有未使用的对象）
      this.floatingTextPool.clear();
    }
    
    for (let y = 0; y < this.map.height; y++) for (let x = 0; x < this.map.width; x++) if (this.map.grid[y][x] === TILE.STAIRS_UP) {
      this.player.x = x; this.player.y = y; this.player.visualX = x * TILE_SIZE; this.player.visualY = y * TILE_SIZE; this.player.destX = this.player.visualX; this.player.destY = this.player.visualY;
    }
    this.ui.updateStats(this.player);
    this.ui.updateEquipmentSockets(this.player);
    
    // 自动保存功能
    // CRITICAL FIX: 每日挑战模式绝对禁止自动保存，防止覆盖主线进度存档
    if (this.settings && this.settings.autoSave === true && !this.isDailyMode) {
      const success = SaveSystem.save(this);
      if (success) {
        this.ui.logMessage('游戏已自动保存', 'info');
      }
    }
    
    // 成就系统：检测层开始
    if (this.achievementSystem) {
      this.achievementSystem.check('onLevelStart');
    }
  }

  loop(ts) {
    const dt = ts - this.lastTime; this.lastTime = ts;

    // FPS 计算逻辑（严格限制为每秒更新一次，避免 DOM 抖动）
    this.frameCount++;
    if (ts - this.lastFpsTime >= 1000) {
      this.currentFps = this.frameCount;
      this.frameCount = 0;
      this.lastFpsTime = ts;
      
      // 仅在需要时更新 FPS 显示（每秒最多一次 DOM 操作）
      if (this.settings && this.settings.showFps) {
        const fpsCounter = document.getElementById('fps-counter');
        if (fpsCounter) {
          fpsCounter.textContent = `FPS: ${this.currentFps}`;
          fpsCounter.style.display = 'block';
        }
      } else {
        const fpsCounter = document.getElementById('fps-counter');
        if (fpsCounter) {
          fpsCounter.style.display = 'none';
        }
      }
    }

    if (this.gameStarted) {
      // Ensure loading overlay is hidden during gameplay (already handled in startGame)
      // This is just a safety check
      const loadingOverlay = document.getElementById('loading-overlay');
      if (loadingOverlay && loadingOverlay.style.display !== 'none') {
        loadingOverlay.style.opacity = '0';
        loadingOverlay.style.pointerEvents = 'none';
        loadingOverlay.style.display = 'none';
      }
      
      try { if (this.player && !this.isPaused) this.update(dt); } catch (e) { console.error('Non-Fatal Game Loop Error (update):', e); }
      try { this.render(); } catch (e) { console.error('Non-Fatal Game Loop Error (render):', e); }
      
      // 成就系统：更新层游戏时间（排除暂停时间）
      if (this.achievementSystem && !this.isPaused) {
        this.achievementSystem.updateLevelPlayTime(dt);
      }
    }

    // Update mascot animation every frame
    try { if (this.ui && this.ui.mascot) this.ui.mascot.update(dt); } catch (e) { console.error('Non-Fatal Mascot Update Error:', e); }
    requestAnimationFrame(t => this.loop(t));
  }

  update(dt) {
    // Guard: ensure player exists before proceeding
    if (!this.player) return;
    
    // Update player state (buffs, cooldowns)
    if (this.player && this.player.update) {
      this.player.update(dt);
    }
    
    // Input
    // Check if player is frozen - cannot move or act
    const playerFrozen = this.player.hasStatus && this.player.hasStatus('FREEZE');
    
    if (!this.player.isMoving && this.inputStack.length > 0 && !this.player.pendingCombat && !playerFrozen) {
      const key = this.inputStack[this.inputStack.length - 1];
      let dx = 0, dy = 0;
      if (key === 'ArrowUp') { dy = -1; this.player.sprite.setDirection(1); }
      if (key === 'ArrowDown') { dy = 1; this.player.sprite.setDirection(0); }
      if (key === 'ArrowLeft') { dx = -1; this.player.sprite.setDirection(2); }
      if (key === 'ArrowRight') { dx = 1; this.player.sprite.setDirection(3); }
      const nx = this.player.x + dx; const ny = this.player.y + dy; const tile = this.map.grid[ny][nx];
      if (tile !== TILE.WALL) {
        if (tile === TILE.DOOR) {
          if (this.player.stats.keys > 0) { 
            this.player.stats.keys--; 
            this.map.grid[ny][nx] = TILE.FLOOR; 
            this.ui.logMessage('门已打开'); 
            this.ui.updateStats(this.player); 
            // 播放开门音效
            if (this.audio) this.audio.playDoorOpen();
          }
          else { this.ui.logMessage('门已上锁！需要钥匙'); }
        } else {
          const monster = this.map.getMonsterAt(nx, ny);
          if (monster) {
            this.player.startCombatSlide(monster);
          } else {
            const npc = this.map.getNpcAt(nx, ny);
            if (npc) { 
              // 区分NPC类型
              if (npc.type === 'GAMBLER') {
                this.openGambler();
              } else {
                this.ui.openShop();
              }
            }
            else {
              // Check for interactive objects (shrines block movement, traps don't)
              const obj = this.map.getObjectAt(nx, ny);
              
              // Check for forge (blacksmith)
              if (obj && obj.type === 'INTERACTIVE_FORGE') {
                this.openForge();
                return; // Don't move
              }
              
              if (obj && (obj.type === 'OBJ_SHRINE_HEAL' || obj.type === 'OBJ_SHRINE_POWER')) {
                // Shrine blocks movement - show interaction prompt
                this.handleShrineInteraction(obj);
                return; // Don't move
              }
              // Check for destructible objects (crates, barrels)
              if (obj && (obj.type === 'OBJ_CRATE' || obj.type === 'OBJ_BARREL') && !obj.destroyed) {
                // Destructible object - destroy it without moving
                this.handleDestructibleInteraction(obj);
                return; // Don't move
              }
              // Check for cursed altar
              if (obj && obj.type === 'OBJ_ALTAR_CURSED' && !obj.activated) {
                // Altar blocks movement - show interaction prompt
                this.handleAltarInteraction(obj);
                return; // Don't move
              }
              // Check for altar placeholder (second tile of altar)
              if (obj && obj.type === 'OBJ_ALTAR_PLACEHOLDER') {
                // Find the parent altar and interact with it
                const parentAltar = this.map.getObjectAt(obj.parentAltar.x, obj.parentAltar.y);
                if (parentAltar && !parentAltar.activated) {
                  this.handleAltarInteraction(parentAltar);
                  return; // Don't move
                }
              }
              this.player.startMove(nx, ny);
              // Pickup
              let it = this.map.getItemAt(nx, ny); if (!it) it = this.map.getItemAt(this.player.x, this.player.y);
              if (it) {
                if (it.type === 'ITEM_EQUIP') {
                  // 支持动态生成的装备
                  const def = getItemDefinition(it.itemId);
                  // 如果该装备对应的槽位为空，直接自动装备
                  if (def && !this.player.equipment[def.type]) {
                    this.player.equip(it.itemId);
                    this.map.removeItem(it);
                    // 播放装备音效
                    if (this.audio) this.audio.playCloth();
                  } else {
                    // 槽位已占用，放入背包
                    const added = this.player.addToInventory(it.itemId);
                    if (added) {
                      this.map.removeItem(it);
                      if (def) {
                        const itemName = def.nameZh || def.name;
                        this.ui.logMessage(`已添加 ${itemName} 到背包`, 'gain');
                      }
                      // 播放布料音效
                      if (this.audio) this.audio.playCloth();
                    } else {
                      this.ui.logMessage('背包已满！', 'info');
                    }
                  }
                  this.ui.updateStats(this.player);
                } else if (it.type === 'ITEM_CONSUMABLE') {
                  const def = EQUIPMENT_DB[it.itemId];
                  const added = this.player.addToInventory(it.itemId);
                  if (added) {
                    this.map.removeItem(it);
                    if (def) {
                      const itemName = def.nameZh || def.name;
                      this.ui.logMessage(`发现了 ${itemName}！`, 'gain');
                    }
                    // 播放药水拾取音效
                    if (this.audio) this.audio.playCloth();
                  } else {
                    this.ui.logMessage('背包已满！', 'info');
                  }
                  this.ui.updateStats(this.player);
                } else {
                  if (it.type.includes('KEY')) { 
                    this.player.stats.keys++; 
                    this.ui.logMessage('发现了一把钥匙！', 'gain'); 
                    // 播放钥匙拾取音效（使用金币音效，游戏内逻辑）
                    if (this.audio) this.audio.playCoins({ forceCategory: 'gameplay' });
                  }
                  if (it.type.includes('CHEST')) { 
                    // Generate random loot from chest
                    this.generateChestLoot(it.x, it.y);
                    // 播放宝箱打开音效（游戏内逻辑）
                    if (this.audio) this.audio.playCoins({ forceCategory: 'gameplay' });
                  }
                  this.map.removeItem(it); this.ui.updateStats(this.player);
                }
              }
              if (tile === TILE.STAIRS_DOWN) this.nextLevel();
            }
          }
        }
      }
    }

    this.player.updateVisuals(dt); 
    
    // Update player statuses (status effects)
    if (this.player && this.player.updateStatuses) {
      this.player.updateStatuses(dt);
    }
    
    // Reset frost aura flag before checking monsters
    if (this.player) {
      this.player.frostAuraSlowed = false;
    }
    
    this.map.monsters.forEach(m => {
      m.updateVisuals(dt);
      // Update monster statuses (status effects)
      if (m && m.updateStatuses) {
        m.updateStatuses(dt);
      }
      // Update elite monster affix effects
      if (m && m.isElite && m.update) {
        m.update(dt, this.map, this.player);
      }
    });
    
    if (this.map.npcs) this.map.npcs.forEach(n => n.updateVisuals(dt));
    
    // Update fog particles
    this.map.fogParticles.forEach(particle => particle.update(dt));
    // Remove dead fog particles and recycle them to the pool
    this.map.fogParticles = this.fogParticlePool.releaseDeadObjects(this.map.fogParticles, obj => obj.isDead());
    
    // Reveal tiles around player (fog of war) - use player's vision radius
    const visionRadius = this.player.getVisionRadius ? this.player.getVisionRadius() : 4;
    this.map.computeFOV(this.player.x, this.player.y, visionRadius);
    
    // Update trap reset timers
    this.map.objects.forEach(obj => {
      if (obj.type === 'OBJ_TRAP' && obj.resetTimer > 0) {
        obj.resetTimer -= dt;
        if (obj.resetTimer <= 0) {
          obj.triggered = false;
        }
      }
    });
    
    // Update monster combat states
    this.map.monsters.forEach(m => {
      if (m.inCombat) {
        const timeSinceDamage = Date.now() - m.lastDamageTime;
        if (timeSinceDamage > m.combatTimeout) {
          // 5秒内没有受伤，退出战斗状态
          m.exitCombat();
          this.ui.logMessage(`${m.type} 失去了你的踪迹...`, 'info');
        }
      }
    });
    
    this.map.monsters.forEach(m => { m.moveTimer -= dt; m.tryWander(this.map, this.player); });
    
    // 更新和回收飘字对象（使用对象池）
    if (this.floatingTexts && this.floatingTexts.length) {
      this.floatingTexts.forEach(ft => ft.update(dt));
      this.floatingTexts = this.floatingTextPool.releaseDeadObjects(this.floatingTexts, obj => obj.isDead());
      
      // 限制最大数量，防止性能问题
      if (this.floatingTexts.length > 50) {
        const excess = this.floatingTexts.splice(0, this.floatingTexts.length - 50);
        excess.forEach(ft => this.floatingTextPool.release(ft));
      }
    }
    if (this.player.pendingCombat) {
      const pendingCombat = this.player.pendingCombat; // 保存引用，防止在 checkInteraction 中被清空
      const res = CombatSystem.checkInteraction(this.player, pendingCombat);
      if (res === 'WIN' && pendingCombat) {
        // FIX: Boss击杀胜利结算
        if (pendingCombat.type === 'BOSS') {
          // Boss被击杀，触发胜利
          if (this.audio) {
            // 播放胜利音效（可选）
            this.audio.playCoins({ volume: 0.8 }); // 使用金币音效作为临时胜利音效
          }
          
          // 显示胜利消息
          if (this.ui) {
            this.ui.logMessage('恭喜！你击败了黑暗领主！', 'gain');
            setTimeout(() => {
              this.ui.logMessage('游戏通关！', 'gain');
            }, 1000);
          }
          
          // 延迟触发胜利结算（让玩家看到击杀效果）
          setTimeout(() => {
            this.endGame(false); // false表示胜利/退休
          }, 2000);
        }
        
        const targetX = pendingCombat.x; 
        const targetY = pendingCombat.y; 
        this.player.x = targetX; 
        this.player.y = targetY; 
        this.player.visualX = targetX*TILE_SIZE; 
        this.player.visualY = targetY*TILE_SIZE; 
        this.player.destX = this.player.visualX; 
        this.player.destY = this.player.visualY; 
        this.player.pendingCombat = null; 
        this.player.isMoving = false;
      }
      else if (res === 'BOUNCE') { this.player.cancelCombatSlide(); this.player.isMoving = true; }
    }

    // Check for trap triggers (traps trigger on walk)
    const trapAtPlayer = this.map.getObjectAt(this.player.x, this.player.y);
    if (trapAtPlayer && trapAtPlayer.type === 'OBJ_TRAP' && !trapAtPlayer.triggered) {
      trapAtPlayer.triggered = true;
      trapAtPlayer.triggerCount = (trapAtPlayer.triggerCount || 0) + 1;
      trapAtPlayer.resetTimer = 2000; // 2 seconds before it can be triggered again
      // 使用动态计算的陷阱伤害（应用了ascensionLevel修饰符），如果没有则使用默认值
      const damage = trapAtPlayer.damage || OBJ_TRAP.damage;
      this.player.takeDamage(damage);
      // 使用对象池创建飘字 (如果设置允许)
      if (this.settings && this.settings.showDamageNumbers !== false) {
        const floatingText = this.floatingTextPool.create(this.player.visualX, this.player.visualY - 10, `-${damage}`, '#ff6b6b');
        this.floatingTexts.push(floatingText);
      }
      this.ui.logMessage(`触发陷阱！-${damage} HP`, 'combat');
      
      // 成就系统：检测陷阱触发
      if (this.achievementSystem) {
        this.achievementSystem.check('onTrap');
      }
    }

    // Update skill bar UI
    if (this.ui && this.ui.updateSkillBar) {
      this.ui.updateSkillBar(this.player);
    }

    this.camera.follow(this.player);
  }

  render() {
    // Guard: ensure player and map exist before rendering
    if (!this.player || !this.map) return;
    
    const canvasWidth = this.canvas.width;
    const canvasHeight = this.canvas.height;
    
    // Clear canvas with black background
    this.ctx.fillStyle = '#000';
    this.ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    
    this.ctx.save();
    
    // Update camera viewport size based on zoom level
    // When zoomed out (zoom < 1), we see more of the map
    // When zoomed in (zoom > 1), we see less of the map
    this.camera.width = canvasWidth / this.cameraZoom;
    this.camera.height = canvasHeight / this.cameraZoom;
    this.camera.follow(this.player);
    
    // Apply zoom scaling centered on canvas
    this.ctx.translate(canvasWidth / 2, canvasHeight / 2);
    this.ctx.scale(this.cameraZoom, this.cameraZoom);
    this.ctx.translate(-canvasWidth / (2 * this.cameraZoom), -canvasHeight / (2 * this.cameraZoom));
    
    // Apply camera translation
    this.ctx.translate(-this.camera.x, -this.camera.y);
    
    // Draw map and floating texts
    this.map.draw(this.ctx, this.player, this.camera);
    if (this.floatingTexts && this.floatingTexts.length) {
      this.floatingTexts.forEach(ft => ft.draw(this.ctx, TILE_SIZE));
    }
    
    // 每日挑战模式：绘制水印
    if (this.isDailyMode) {
      this.drawDailyChallengeWatermark();
    }
    
    this.ctx.restore();
  }

  /**
   * 绘制每日挑战水印
   */
  drawDailyChallengeWatermark() {
    this.ctx.save();
    
    // 在右上角绘制水印
    const canvasWidth = this.canvas.width;
    const canvasHeight = this.canvas.height;
    
    // 恢复缩放和变换，使用屏幕坐标
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    
    // 绘制背景
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    this.ctx.fillRect(canvasWidth - 150, 10, 140, 50);
    
    // 绘制边框
    this.ctx.strokeStyle = '#d4af37';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(canvasWidth - 150, 10, 140, 50);
    
    // 绘制文字
    this.ctx.fillStyle = '#d4af37';
    this.ctx.font = 'bold 16px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('每日挑战', canvasWidth - 80, 25);
    
    // 绘制日期
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    const day = String(now.getUTCDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    
    this.ctx.font = '12px Arial';
    this.ctx.fillText(dateStr, canvasWidth - 80, 45);
    
    this.ctx.restore();
  }

  /**
   * 更新保存/读取按钮的可见性
   * 在每日挑战模式下隐藏这些按钮
   */
  updateSaveLoadButtonsVisibility() {
    // 查找所有保存和读取按钮
    const btnActions = document.querySelector('.btn-actions');
    if (!btnActions) return;

    const saveButtons = btnActions.querySelectorAll('button');
    saveButtons.forEach(btn => {
      const onclick = btn.getAttribute('onclick') || '';
      if (onclick.includes('saveGame')) {
        // 保存按钮
        if (this.isDailyMode) {
          btn.style.display = 'none';
        } else {
          btn.style.display = '';
        }
      } else if (onclick.includes('loadGame')) {
        // 读取按钮
        if (this.isDailyMode) {
          btn.style.display = 'none';
        } else {
          btn.style.display = '';
        }
      }
    });
  }

  // DESTRUCTIBLE OBJECT INTERACTION (Crates, Barrels)
  handleDestructibleInteraction(obj) {
    if (!obj || obj.destroyed) return;
    
    // Play hit sound
    if (this.audio) this.audio.playMeleeHit();
    
    // Mark as destroyed
    obj.destroyed = true;
    obj.hp = 0;
    
    // Change type to non-blocking debris
    obj.type = 'DEBRIS';
    
    // Trigger loot drop
    this.checkDestructibleLoot(obj.x, obj.y);
    
    // Show floating text
    if (this.settings && this.settings.showDamageNumbers !== false) {
      const floatingText = this.floatingTextPool.create(obj.visualX, obj.visualY - 10, '破坏！', '#ffaa00');
      this.floatingTexts.push(floatingText);
    }
  }

  // DESTRUCTIBLE LOOT SYSTEM
  checkDestructibleLoot(x, y) {
    // Roll random number against LOOT_TABLE_DESTRUCTIBLE
    const selectFromWeightedTable = (table) => {
      const totalWeight = Object.values(table).reduce((sum, entry) => sum + entry.weight, 0);
      let random = Math.random() * totalWeight;
      
      for (const [key, entry] of Object.entries(table)) {
        random -= entry.weight;
        if (random <= 0) {
          return { key, data: entry };
        }
      }
      return { key: Object.keys(table)[0], data: Object.values(table)[0] }; // Fallback
    };
    
    const result = selectFromWeightedTable(window.LOOT_TABLE_DESTRUCTIBLE || LOOT_TABLE_DESTRUCTIBLE);
    const lootKey = result.key;
    const lootData = result.data;
    
    switch (lootKey) {
      case 'EMPTY': {
        // Empty - show floating text
        if (this.settings && this.settings.showDamageNumbers !== false) {
          const floatingText = this.floatingTextPool.create(x * TILE_SIZE, y * TILE_SIZE - 10, '空的', '#999999');
          this.floatingTexts.push(floatingText);
        }
        this.ui.logMessage('里面什么也没有...', 'info');
        break;
      }
      
      case 'GOLD_SMALL': {
        // Small gold (1-5)
        const goldAmount = Math.floor(Math.random() * (lootData.maxAmount - lootData.minAmount + 1)) + lootData.minAmount;
        this.player.stats.gold = (this.player.stats.gold || 0) + goldAmount;
        
        if (this.settings && this.settings.showDamageNumbers !== false) {
          const floatingText = this.floatingTextPool.create(x * TILE_SIZE, y * TILE_SIZE - 10, `+${goldAmount}G`, '#ffd700');
          this.floatingTexts.push(floatingText);
        }
        this.ui.logMessage(`发现了 ${goldAmount} 金币！`, 'gain');
        
        // Play coin sound (游戏内逻辑)
        if (this.audio) this.audio.playCoins({ forceCategory: 'gameplay' });
        break;
      }
      
      case 'POTION': {
        // Small potion (HP or Rage)
        const potionType = Math.random() < 0.7 ? 'POTION_HP_S' : 'POTION_RAGE';
        const added = this.player.addToInventory(potionType);
        if (added) {
          const def = EQUIPMENT_DB[potionType];
          const itemName = def ? (def.nameZh || def.name) : '药水';
          this.ui.logMessage(`发现了 ${itemName}！`, 'gain');
          
          if (this.settings && this.settings.showDamageNumbers !== false) {
            const floatingText = this.floatingTextPool.create(x * TILE_SIZE, y * TILE_SIZE - 10, itemName, '#00ff88');
            this.floatingTexts.push(floatingText);
          }
          
          // Play cloth sound
          if (this.audio) this.audio.playCloth();
        } else {
          this.ui.logMessage('背包已满！', 'info');
        }
        break;
      }
      
      case 'TRAP_BOMB': {
        // Trap - deals damage immediately
        const damage = Math.floor(Math.random() * (lootData.maxDamage - lootData.minDamage + 1)) + lootData.minDamage;
        this.player.takeDamage(damage);
        
        if (this.settings && this.settings.showDamageNumbers !== false) {
          const floatingText = this.floatingTextPool.create(x * TILE_SIZE, y * TILE_SIZE - 10, `陷阱！-${damage}`, '#ff0000');
          this.floatingTexts.push(floatingText);
        }
        this.ui.logMessage(`陷阱炸弹！受到 ${damage} 伤害！`, 'combat');
        
        // Play explosion sound (use meleeHit as placeholder)
        if (this.audio) this.audio.playMeleeHit();
        break;
      }
      
      case 'AMBUSH_SNAKE': {
        // Ambush - spawn a monster at this location
        const monsterType = lootData.monsterType || 'SKELETON';
        const monster = new Monster(monsterType, x, y, this.loader, 1, TILE, this.player.stats.floor, this.selectedAscensionLevel);
        this.map.monsters.push(monster);
        
        if (this.settings && this.settings.showDamageNumbers !== false) {
          const floatingText = this.floatingTextPool.create(x * TILE_SIZE, y * TILE_SIZE - 10, '伏击！', '#ff3300');
          this.floatingTexts.push(floatingText);
        }
        this.ui.logMessage('怪物从里面冲了出来！', 'combat');
        
        // Play monster spawn sound (use meleeHit as placeholder)
        if (this.audio) this.audio.playMeleeHit();
        break;
      }
    }
    
    this.ui.updateStats(this.player);
  }

  // CURSED ALTAR INTERACTION
  handleAltarInteraction(altar) {
    if (!altar || altar.activated) return;
    
    this.isPaused = true;
    this.inputStack = [];
    
    // Show confirmation prompt
    const accept = confirm('触碰诅咒祭坛？一波波怪物将会出现！\n\n奖励：稀有宝箱');
    
    if (accept) {
      // Activate altar
      altar.activated = true;
      
      // Spawn 5-8 monsters in a circle around the player
      const monsterCount = Math.floor(Math.random() * 4) + 5; // 5-8
      const spawnRadius = 3;
      let spawned = 0;
      
      for (let attempt = 0; attempt < monsterCount * 20 && spawned < monsterCount; attempt++) {
        // Random angle and distance
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.floor(Math.random() * spawnRadius) + 1;
        const spawnX = altar.x + Math.round(Math.cos(angle) * distance);
        const spawnY = altar.y + Math.round(Math.sin(angle) * distance);
        
        // Check if spawn position is valid
        if (spawnX < 1 || spawnX >= this.map.width - 1 || spawnY < 1 || spawnY >= this.map.height - 1) continue;
        if (this.map.grid[spawnY][spawnX] !== TILE.FLOOR) continue;
        if (this.map.getMonsterAt(spawnX, spawnY)) continue;
        
        // Spawn random monster (weighted towards stronger monsters)
        const monsterTypes = ['SKELETON', 'VOID', 'SWAMP', 'CLOCKWORK', 'REAPER'];
        const monsterType = monsterTypes[Math.floor(Math.random() * monsterTypes.length)];
        const difficulty = 1 + this.player.stats.floor * 0.2;
        const monster = new Monster(monsterType, spawnX, spawnY, this.loader, difficulty, TILE, this.player.stats.floor, this.selectedAscensionLevel);
        this.map.monsters.push(monster);
        spawned++;
      }
      
      // Play ominous sound
      if (this.audio) this.audio.playMeleeHit();
      
      // Spawn high-tier chest at altar location
      this.map.addItem('OBJ_CHEST', altar.x, altar.y);
      
      // Show message
      this.ui.logMessage(`诅咒祭坛激活！${spawned} 个怪物出现了！`, 'combat');
      
      // Show floating text
      if (this.settings && this.settings.showDamageNumbers !== false) {
        const floatingText = this.floatingTextPool.create(altar.visualX, altar.visualY - 10, '诅咒！', '#ff00ff');
        this.floatingTexts.push(floatingText);
      }
      
      // Remove altar (or mark as deactivated)
      this.map.removeObject(altar);
      
      // Remove placeholder if exists
      const placeholder = this.map.getObjectAt(altar.x + 1, altar.y);
      if (placeholder && placeholder.type === 'OBJ_ALTAR_PLACEHOLDER') {
        this.map.removeObject(placeholder);
      }
    }
    
    this.isPaused = false;
  }

  // SHRINE INTERACTION
  handleShrineInteraction(shrine) {
    this.isPaused = true;
    this.inputStack = [];
    this.currentShrine = shrine;
    
    const titleEl = document.getElementById('shrine-title');
    const cardsEl = document.getElementById('shrine-cards');
    const overlayEl = document.getElementById('shrine-overlay');
    
    if (!titleEl || !cardsEl || !overlayEl) return;
    
    cardsEl.innerHTML = '';
    
    if (shrine.type === 'OBJ_SHRINE_HEAL') {
      titleEl.innerText = 'SHRINE OF HEALING';
      
      const canAfford = this.player.stats.gold >= OBJ_SHRINE_HEAL.cost;
      
      // Accept option
      const acceptDiv = document.createElement('div');
      acceptDiv.className = 'card' + (canAfford ? '' : ' disabled');
      acceptDiv.innerHTML = `<h3>接受祝福</h3><p>消耗 ${OBJ_SHRINE_HEAL.cost} 金币<br/>恢复 ${OBJ_SHRINE_HEAL.heal} HP</p>`;
      acceptDiv.onclick = () => {
        if (canAfford) {
          this.player.stats.gold -= OBJ_SHRINE_HEAL.cost;
          this.player.heal(OBJ_SHRINE_HEAL.heal);
          this.ui.logMessage(`祈祷于神殿！恢复 ${OBJ_SHRINE_HEAL.heal} HP，消耗 ${OBJ_SHRINE_HEAL.cost} 金币`, 'gain');
          this.map.removeObject(shrine);
          this.ui.updateStats(this.player);
          // 关键修复：正确处理隐藏类
          overlayEl.classList.remove('overlay-fade-in');
          overlayEl.classList.add('hidden');
          overlayEl.style.setProperty('display', 'none', 'important');
          this.isPaused = false;
          this.currentShrine = null;
        }
      };
      cardsEl.appendChild(acceptDiv);
      
      // Decline option
      const declineDiv = document.createElement('div');
      declineDiv.className = 'card';
      declineDiv.innerHTML = `<h3>离开</h3><p>放弃祝福</p>`;
      declineDiv.onclick = () => {
        // 关键修复：正确处理隐藏类
        overlayEl.classList.remove('overlay-fade-in');
        overlayEl.classList.add('hidden');
        overlayEl.style.setProperty('display', 'none', 'important');
        this.isPaused = false;
        this.currentShrine = null;
      };
      cardsEl.appendChild(declineDiv);
      
    } else if (shrine.type === 'OBJ_SHRINE_POWER') {
      titleEl.innerText = 'SHRINE OF POWER';
      
      const canAfford = this.player.stats.hp > OBJ_SHRINE_POWER.cost;
      
      // Accept option
      const acceptDiv = document.createElement('div');
      acceptDiv.className = 'card' + (canAfford ? '' : ' disabled');
      acceptDiv.innerHTML = `<h3>接受祝福</h3><p>消耗 ${OBJ_SHRINE_POWER.cost} HP<br/>获得 ${OBJ_SHRINE_POWER.gainAtk} 攻击力</p>`;
      acceptDiv.onclick = () => {
        if (canAfford) {
          this.player.takeDamage(OBJ_SHRINE_POWER.cost);
          this.player.stats.p_atk += OBJ_SHRINE_POWER.gainAtk;
          this.ui.logMessage(`祈祷于神殿！获得 ${OBJ_SHRINE_POWER.gainAtk} 攻击力，消耗 ${OBJ_SHRINE_POWER.cost} HP`, 'gain');
          this.map.removeObject(shrine);
          this.ui.updateStats(this.player);
          // 关键修复：正确处理隐藏类
          overlayEl.classList.remove('overlay-fade-in');
          overlayEl.classList.add('hidden');
          overlayEl.style.setProperty('display', 'none', 'important');
          this.isPaused = false;
          this.currentShrine = null;
        }
      };
      cardsEl.appendChild(acceptDiv);
      
      // Decline option
      const declineDiv = document.createElement('div');
      declineDiv.className = 'card';
      declineDiv.innerHTML = `<h3>离开</h3><p>放弃祝福</p>`;
      declineDiv.onclick = () => {
        // 关键修复：正确处理隐藏类
        overlayEl.classList.remove('overlay-fade-in');
        overlayEl.classList.add('hidden');
        overlayEl.style.setProperty('display', 'none', 'important');
        this.isPaused = false;
        this.currentShrine = null;
      };
      cardsEl.appendChild(declineDiv);
    }
    
    // 关键修复：正确处理显示类
    overlayEl.classList.remove('hidden');
    overlayEl.style.setProperty('display', 'flex', 'important');
    void overlayEl.offsetWidth; // 强制重排
    overlayEl.classList.add('overlay-fade-in');
  }

  // SHOP - 委托给 UIManager
  openShop() { 
    this.ui.openShop(); 
    // 播放打开商店音效
    if (this.audio) this.audio.playBookFlip();
  }
  
  // GAMBLER - 打开赌徒界面
  openGambler() {
    if (this.ui && this.ui.gamblerUI) {
      this.ui.gamblerUI.open();
      // 播放打开音效
      if (this.audio) this.audio.playBookFlip();
    }
  }
  closeShop() { this.ui.closeShop(); }
  buy(type) { this.ui.shopUI.buy(type); }
  
  // FORGE - 铁匠铺
  openForge() {
    // 延迟初始化 ForgeUI
    if (!this.forgeUI) {
      this.forgeUI = new ForgeUI(this.blacksmithSystem);
    }
    this.forgeUI.open();
    // 播放打开铁匠铺音效
    if (this.audio) this.audio.playMetalClick();
  }
  closeForge() {
    if (this.forgeUI) {
      this.forgeUI.close();
    }
  }

  // LEADERBOARD - 排行榜
  openLeaderboard() {
    if (this.leaderboardUI) {
      this.leaderboardUI.open();
      // 播放打开音效
      if (this.audio) this.audio.playBookFlip();
    }
  }

  openAchievements() {
    if (this.achievementUI) {
      this.achievementUI.open();
      // 播放打开音效
      if (this.audio) this.audio.playBookFlip();
    }
  }

  closeLeaderboard() {
    if (this.leaderboardUI) {
      this.leaderboardUI.close();
    }
  }

  // INVENTORY
  openInventory() {
    console.log('🎒 Game.openInventory() called');
    
    if (!this.gameStarted) {
      console.warn('Game not started yet, cannot open inventory');
      return;
    }
    
    this.isPaused = true; 
    this.inputStack = []; 
    
    if (this.ui && this.ui.openInventory) {
      console.log('🎒 Rendering and opening inventory UI...');
      this.ui.renderInventory(this.player);
      this.ui.openInventory();
      
      // 播放打开背包音效
      if (this.audio) {
        this.audio.playCloth();
      }
      
      console.log('✓ Inventory opened successfully');
    } else {
      console.error('UI or openInventory method not available');
    }
  }
  
  closeInventory() { 
    if (this.ui && this.ui.closeInventory) {
      this.ui.closeInventory();
    }
    this.isPaused = false; 
  }

  // SETTINGS
  openSettings() {
    const settingsOverlay = document.getElementById('settings-overlay');
    if (!settingsOverlay) return;
    
    this.loadSettingsUI();
    
    // 1. 显示 Overlay 并添加淡入类
    settingsOverlay.classList.remove('hidden');
    settingsOverlay.style.setProperty('display', 'flex', 'important');
    
    // 强制重排以确保过渡生效
    void settingsOverlay.offsetWidth;
    
    settingsOverlay.classList.remove('overlay-fade-out');
    settingsOverlay.classList.add('overlay-fade-in');
    
    // 2. 模态框进场动画
    const modal = settingsOverlay.querySelector('.settings-modal');
    if (modal) {
      modal.classList.remove('modal-animate-exit');
      modal.classList.add('modal-animate-enter');
    }
    
    this.setupSettingsEventListeners();
  }

  closeSettings() {
    const settingsOverlay = document.getElementById('settings-overlay');
    if (!settingsOverlay) return;
    
    // 1. 模态框离场动画
    const modal = settingsOverlay.querySelector('.settings-modal');
    if (modal) {
      modal.classList.remove('modal-animate-enter');
      modal.classList.add('modal-animate-exit');
    }
    
    // 2. 背景淡出
    settingsOverlay.classList.remove('overlay-fade-in');
    settingsOverlay.classList.add('overlay-fade-out');
    
    // 3. 延时隐藏 (250ms 匹配动画时长)
    setTimeout(() => {
      settingsOverlay.classList.add('hidden');
      settingsOverlay.style.setProperty('display', 'none', 'important');
      
      // 清理动画类，为下次打开做准备
      settingsOverlay.classList.remove('overlay-fade-out');
      if (modal) {
        modal.classList.remove('modal-animate-exit');
      }
    }, 250);

    this.saveSettings();
  }

  closeBestiary() {
    if (this.ui && this.ui.closeBestiary) {
      this.ui.closeBestiary();
    }
  }

  /**
   * 打开天赋树UI
   * 完善转场逻辑：确保主菜单完全淡出（0.8s）后再启动天赋树渲染，避免 z-index 竞争
   */
  async openTalentTree() {
    // 1. 焦土政策：立即强制隐藏所有非主菜单界面
    // 防止主菜单淡出时漏出底下的界面
    const charSelect = document.getElementById('char-select-screen');
    if (charSelect) {
      charSelect.style.setProperty('display', 'none', 'important');
      charSelect.classList.remove('scene-transition', 'scene-active', 'loaded');
    }
    
    const mainUI = document.getElementById('main-ui');
    if (mainUI) {
      mainUI.style.setProperty('display', 'none', 'important');
      mainUI.classList.remove('scene-transition', 'scene-active', 'loaded');
    }

    // 延迟初始化天赋树UI
    if (!this.talentTreeUI) {
      this.talentTreeUI = new TalentTreeUI(this);
      console.log('[Game] 天赋树UI已初始化');
    }
    
    // 获取主菜单元素
    const mainMenu = document.getElementById('main-menu');
    if (mainMenu && mainMenu.style.display !== 'none') {
      // 添加淡出动画类
      mainMenu.classList.remove('scene-active');
      mainMenu.classList.add('scene-transition', 'scene-enter');
      
      // 等待淡出动画完成 (800ms) - 确保完全淡出
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // 隐藏主菜单（确保 z-index 不会竞争）
      mainMenu.style.display = 'none';
      mainMenu.style.opacity = '0';
      mainMenu.style.zIndex = '0';
      mainMenu.classList.remove('scene-transition', 'scene-enter');
      
      // 额外等待一小段时间，确保 DOM 更新完成
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    // 显示天赋树（带淡入动画）
    this.talentTreeUI.show();
  }

  /**
   * 关闭天赋树UI并返回主菜单
   */
  /**
   * 关闭天赋树UI并返回主菜单
   */
  async closeTalentTree() {
    // 1. 隐藏天赋树
    if (this.talentTreeUI) {
      this.talentTreeUI.hide();
    }
    
    // 2. 再次强制清理幽灵界面
    const charSelect = document.getElementById('char-select-screen');
    if (charSelect) {
      charSelect.style.setProperty('display', 'none', 'important');
      charSelect.className = 'hidden'; // 重置所有类，只留 hidden
    }
    
    const mainUI = document.getElementById('main-ui');
    if (mainUI) {
      mainUI.style.setProperty('display', 'none', 'important');
      mainUI.className = 'hidden';
    }

    // 3. 显式恢复主菜单
    const mainMenu = document.getElementById('main-menu');
    if (mainMenu) {
      // 移除所有可能导致冲突的动画类
      mainMenu.classList.remove('hidden', 'scene-transition', 'scene-enter', 'scene-exit');
      
      // 强制重置样式
      mainMenu.style.display = 'flex';
      mainMenu.style.opacity = '0'; // 先透明
      mainMenu.style.zIndex = '10000';
      mainMenu.style.pointerEvents = 'auto';

      // 强制重排
      void mainMenu.offsetWidth;

      // 添加动画类并淡入
      mainMenu.classList.add('scene-transition');
      requestAnimationFrame(() => {
        mainMenu.style.opacity = '1';
        mainMenu.classList.add('scene-active');
      });
      
      // 恢复菜单按钮组状态 - 强制重置为初始状态
      const mainGroup = document.getElementById('menu-group-main');
      const extrasGroup = document.getElementById('menu-group-extras');
      
      if (mainGroup) {
        // 清除所有位置类和隐藏类
        mainGroup.classList.remove('menu-pos-left', 'menu-pos-right', 'hidden');
        // 强制设置为中心可见
        mainGroup.classList.add('menu-pos-center', 'active');
      }
      
      if (extrasGroup) {
        // 清除所有位置类和激活类
        extrasGroup.classList.remove('menu-pos-center', 'menu-pos-left', 'active');
        // 强制设置为右侧隐藏
        extrasGroup.classList.add('menu-pos-right', 'hidden');
      }
    }
  }

  /**
   * 应用天赋树加成到玩家
   * @param {boolean} restoreKeystonesOnly - 如果为true，仅恢复关键石，不叠加属性（用于读档）
   */
  applyTalentBonuses(restoreKeystonesOnly = false) {
    if (!this.player || !this.metaSaveSystem) return;
    
    // 导入天赋数据模块
    import('./TalentData.js').then(module => {
      const { calculateTotalStats, getActiveKeystones, KEYSTONE_EFFECTS } = module;
      
      const unlockedIds = this.metaSaveSystem.data.unlockedTalentIds || ['root'];
      const talentStats = calculateTotalStats(unlockedIds);
      const keystones = getActiveKeystones(unlockedIds);
      
      // FIX: 读档时跳过属性叠加，避免重复叠加
      if (!restoreKeystonesOnly) {
        // 应用属性加成（仅在新游戏时执行）
        if (talentStats.p_atk) this.player.stats.p_atk += talentStats.p_atk;
        if (talentStats.m_atk) this.player.stats.m_atk += talentStats.m_atk;
        if (talentStats.p_def) this.player.stats.p_def += talentStats.p_def;
        if (talentStats.m_def) this.player.stats.m_def += talentStats.m_def;
        if (talentStats.max_hp) {
          this.player.stats.maxHp += talentStats.max_hp;
          this.player.stats.hp += talentStats.max_hp; // 也增加当前生命值
        }
        if (talentStats.max_mp && this.player.stats.maxMp !== undefined) {
          this.player.stats.maxMp += talentStats.max_mp;
          this.player.stats.mp += talentStats.max_mp;
        }
      }
      
      // 存储关键石效果到玩家对象（用于战斗逻辑）
      // FIX: 读档时也需要恢复关键石
      this.player.activeKeystones = keystones;
      
      console.log('[TalentSystem] 天赋加成已应用:', restoreKeystonesOnly ? '(仅关键石)' : talentStats);
      console.log('[TalentSystem] 激活的关键石:', keystones);
      
      // 记录到日志
      if (keystones.length > 0 && this.ui) {
        keystones.forEach(ks => {
          const name = this.getKeystoneName(ks);
          this.ui.logMessage(`关键石激活: ${name}`, 'buff');
        });
      }
    }).catch(err => {
      console.error('[TalentSystem] 应用天赋加成失败:', err);
    });
  }

  /**
   * 获取关键石名称
   */
  getKeystoneName(keystoneId) {
    const names = {
      'BLOOD_MAGIC': '血魔法',
      'IRON_WILL': '钢铁意志',
      'SOUL_REAPER': '灵魂收割者',
      'CRITICAL_MASTER': '暴击大师',
      'BERSERKER': '狂战士'
    };
    return names[keystoneId] || keystoneId;
  }

  setupSettingsEventListeners() {
    // 防止重复绑定事件监听器
    if (this.settingsListenersInitialized) {
      return;
    }
    
    this.settingsListenersInitialized = true;
    console.log('[Settings] 初始化设置事件监听器');
    
    // Category switching
    const categories = document.querySelectorAll('.settings-category');
    categories.forEach(cat => {
      cat.addEventListener('click', () => {
        const categoryName = cat.getAttribute('data-category');
        this.switchSettingsCategory(categoryName);
      });
    });

    // Audio sliders - Realtime Update
    const bgmVolume = document.getElementById('bgm-volume');
    if (bgmVolume) {
      bgmVolume.addEventListener('input', (e) => {
        const value = e.target.value;
        document.getElementById('bgm-value').textContent = value + '%';
        this.settings.bgmVolume = parseInt(value);
        this.audio.updateVolumes(this.settings); // 实时更新
      });
      // 拖拽结束保存设置
      bgmVolume.addEventListener('change', () => {
        this.saveSettings();
      });
    }

    const sfxVolume = document.getElementById('sfx-volume');
    if (sfxVolume) {
      sfxVolume.addEventListener('input', (e) => {
        const value = e.target.value;
        document.getElementById('sfx-value').textContent = value + '%';
        this.settings.sfxVolume = parseInt(value);
        this.audio.updateVolumes(this.settings);
      });
      // 拖拽结束播放预览音效并保存设置
      sfxVolume.addEventListener('change', () => {
        this.saveSettings();
        if (this.settings.audioEnabled) this.audio.playAttack();
      });
    }

    const uiSfxVolume = document.getElementById('ui-sfx-volume');
    if (uiSfxVolume) {
      uiSfxVolume.addEventListener('input', (e) => {
        const value = e.target.value;
        document.getElementById('ui-sfx-value').textContent = value + '%';
        this.settings.uiSfxVolume = parseInt(value);
        this.audio.updateVolumes(this.settings);
      });
      // 拖拽结束播放预览音效并保存设置
      uiSfxVolume.addEventListener('change', () => {
        this.saveSettings();
        if (this.settings.audioEnabled) this.audio.playCoins();
      });
    }

    // Audio enabled checkbox
    const audioEnabled = document.getElementById('audio-enabled');
    if (audioEnabled) {
      audioEnabled.addEventListener('change', (e) => {
        this.settings.audioEnabled = e.target.checked;
        this.audio.updateVolumes(this.settings);
        this.saveSettings();
      });
    }

    // Graphics settings
    const qualityBtns = document.querySelectorAll('.quality-btn');
    qualityBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        qualityBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.settings.graphicsQuality = btn.getAttribute('data-quality');
        this.saveSettings();
      });
    });

    const particleEffects = document.getElementById('particle-effects');
    if (particleEffects) {
      particleEffects.addEventListener('change', (e) => {
        this.settings.particleEffects = e.target.checked;
        this.saveSettings();
      });
    }

    const screenShake = document.getElementById('screen-shake');
    if (screenShake) {
      screenShake.addEventListener('change', (e) => {
        this.settings.screenShake = e.target.checked;
        this.saveSettings();
      });
    }

    const bloomEffect = document.getElementById('bloom-effect');
    if (bloomEffect) {
      bloomEffect.addEventListener('change', (e) => {
        this.settings.bloomEffect = e.target.checked;
        this.saveSettings();
      });
    }

    // Gameplay settings
    const gameSpeed = document.getElementById('game-speed');
    if (gameSpeed) {
      gameSpeed.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value).toFixed(1);
        document.getElementById('game-speed-value').textContent = value + 'x';
        this.settings.gameSpeed = parseFloat(value);
      });
      // 拖拽结束保存设置
      gameSpeed.addEventListener('change', () => {
        this.saveSettings();
      });
    }

    const autoSave = document.getElementById('auto-save');
    if (autoSave) {
      autoSave.addEventListener('change', (e) => {
        this.settings.autoSave = e.target.checked;
        this.saveSettings();
      });
    }

    const difficultyScaling = document.getElementById('difficulty-scaling');
    if (difficultyScaling) {
      difficultyScaling.addEventListener('change', (e) => {
        this.settings.difficultyScaling = e.target.checked;
        this.saveSettings();
      });
    }

    const showDamageNumbers = document.getElementById('show-damage-numbers');
    if (showDamageNumbers) {
      showDamageNumbers.addEventListener('change', (e) => {
        this.settings.showDamageNumbers = e.target.checked;
        this.saveSettings();
      });
    }

    // Display settings
    const brightness = document.getElementById('brightness');
    if (brightness) {
      brightness.addEventListener('input', (e) => {
        const value = e.target.value;
        document.getElementById('brightness-value').textContent = value + '%';
        this.settings.brightness = parseInt(value);
        this.applyDisplaySettings();
      });
      // 拖拽结束保存设置
      brightness.addEventListener('change', () => {
        this.saveSettings();
      });
    }

    const contrast = document.getElementById('contrast');
    if (contrast) {
      contrast.addEventListener('input', (e) => {
        const value = e.target.value;
        document.getElementById('contrast-value').textContent = value + '%';
        this.settings.contrast = parseInt(value);
        this.applyDisplaySettings();
      });
      // 拖拽结束保存设置
      contrast.addEventListener('change', () => {
        this.saveSettings();
      });
    }

    const showFps = document.getElementById('show-fps');
    if (showFps) {
      showFps.addEventListener('change', (e) => {
        this.settings.showFps = e.target.checked;
        this.saveSettings();
        // 更新 FPS 显示状态
        const fpsCounter = document.getElementById('fps-counter');
        if (fpsCounter) {
          fpsCounter.style.display = e.target.checked ? 'block' : 'none';
        }
      });
    }

    const fullscreenMode = document.getElementById('fullscreen-mode');
    if (fullscreenMode) {
      fullscreenMode.addEventListener('change', (e) => {
        this.settings.fullscreenMode = e.target.checked;
        this.toggleFullscreen(e.target.checked);
        this.saveSettings();
      });
    }

    // 监听全屏状态变化（用户按 Esc 退出全屏时自动更新复选框）
    // 使用命名函数并存储引用，防止重复绑定
    if (!this.fullscreenChangeHandler) {
      this.fullscreenChangeHandler = () => {
        const isFullscreen = !!document.fullscreenElement;
        const fullscreenMode = document.getElementById('fullscreen-mode');
        if (fullscreenMode) {
          fullscreenMode.checked = isFullscreen;
          this.settings.fullscreenMode = isFullscreen;
          this.saveSettings();
        }
      };
      document.addEventListener('fullscreenchange', this.fullscreenChangeHandler);
    }

    // 开发者模式密码输入
    const devCodeInput = document.getElementById('dev-code-input');
    const devCodeSubmit = document.getElementById('dev-code-submit');
    const devModeStatus = document.getElementById('dev-mode-status');
    
    if (devCodeSubmit) {
      devCodeSubmit.addEventListener('click', () => {
        const password = devCodeInput?.value || '';
        if (password === 'admin') {
          // 启用开发者模式
          if (window.devModeManager) {
            window.devModeManager.enable();
            if (devModeStatus) {
              devModeStatus.textContent = '✓ 开发者模式已开启';
              devModeStatus.style.color = '#4caf50';
              devModeStatus.style.display = 'block';
            }
            if (devCodeInput) {
              devCodeInput.value = '';
            }
            // 显示提示消息
            if (this.ui && this.ui.logMessage) {
              this.ui.logMessage('开发者模式已开启', 'info');
            }
          }
        } else if (password) {
          // 密码错误
          if (devModeStatus) {
            devModeStatus.textContent = '✗ 密码错误';
            devModeStatus.style.color = '#f44336';
            devModeStatus.style.display = 'block';
          }
          if (devCodeInput) {
            devCodeInput.value = '';
          }
        }
      });
    }

    // 支持回车键提交
    if (devCodeInput) {
      devCodeInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && devCodeSubmit) {
          devCodeSubmit.click();
        }
      });
    }
  }

  switchSettingsCategory(categoryName) {
    // Update active category
    const categories = document.querySelectorAll('.settings-category');
    categories.forEach(cat => {
      if (cat.getAttribute('data-category') === categoryName) {
        cat.classList.add('active');
      } else {
        cat.classList.remove('active');
      }
    });

    // Update active section
    const sections = document.querySelectorAll('.settings-section');
    sections.forEach(sec => {
      if (sec.getAttribute('data-section') === categoryName) {
        sec.classList.add('active');
      } else {
        sec.classList.remove('active');
      }
    });
  }

  applyDisplaySettings() {
    const brightness = this.settings.brightness || 100;
    const contrast = this.settings.contrast || 100;
    document.body.style.filter = `brightness(${brightness}%) contrast(${contrast}%)`;
  }

  toggleFullscreen(enable) {
    try {
      if (enable) {
        // 进入全屏（必须在用户手势事件中调用，否则浏览器会阻止）
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(err => {
            console.warn('[Settings] 无法进入全屏模式:', err);
            // 如果进入全屏失败，同步更新复选框状态
            const fullscreenMode = document.getElementById('fullscreen-mode');
            if (fullscreenMode) {
              fullscreenMode.checked = false;
              this.settings.fullscreenMode = false;
              this.saveSettings();
            }
          });
        }
      } else {
        // 退出全屏
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(err => {
            console.warn('[Settings] 无法退出全屏模式:', err);
          });
        }
      }
    } catch (err) {
      console.error('[Settings] 全屏切换异常:', err);
    }
  }

  loadSettingsUI() {
    // Load settings from localStorage or use defaults
    this.settings = this.loadSettings();

    // Update UI elements with saved values
    const bgmVolume = document.getElementById('bgm-volume');
    if (bgmVolume) {
      bgmVolume.value = this.settings.bgmVolume || 100;
      document.getElementById('bgm-value').textContent = (this.settings.bgmVolume || 100) + '%';
    }

    const sfxVolume = document.getElementById('sfx-volume');
    if (sfxVolume) {
      sfxVolume.value = this.settings.sfxVolume || 100;
      document.getElementById('sfx-value').textContent = (this.settings.sfxVolume || 100) + '%';
    }

    const uiSfxVolume = document.getElementById('ui-sfx-volume');
    if (uiSfxVolume) {
      uiSfxVolume.value = this.settings.uiSfxVolume || 100;
      document.getElementById('ui-sfx-value').textContent = (this.settings.uiSfxVolume || 100) + '%';
    }

    const audioEnabled = document.getElementById('audio-enabled');
    if (audioEnabled) {
      audioEnabled.checked = this.settings.audioEnabled !== false;
    }

    // Graphics quality
    const qualityBtns = document.querySelectorAll('.quality-btn');
    const quality = this.settings.graphicsQuality || 'low';
    qualityBtns.forEach(btn => {
      if (btn.getAttribute('data-quality') === quality) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    const particleEffects = document.getElementById('particle-effects');
    if (particleEffects) {
      particleEffects.checked = this.settings.particleEffects !== false;
    }

    const screenShake = document.getElementById('screen-shake');
    if (screenShake) {
      screenShake.checked = this.settings.screenShake !== false;
    }

    const bloomEffect = document.getElementById('bloom-effect');
    if (bloomEffect) {
      bloomEffect.checked = this.settings.bloomEffect !== false;
    }

    // Gameplay
    const gameSpeed = document.getElementById('game-speed');
    if (gameSpeed) {
      gameSpeed.value = this.settings.gameSpeed || 1.0;
      document.getElementById('game-speed-value').textContent = (this.settings.gameSpeed || 1.0).toFixed(1) + 'x';
    }

    const autoSave = document.getElementById('auto-save');
    if (autoSave) {
      autoSave.checked = this.settings.autoSave !== false;
    }

    const difficultyScaling = document.getElementById('difficulty-scaling');
    if (difficultyScaling) {
      difficultyScaling.checked = this.settings.difficultyScaling !== false;
    }

    const showDamageNumbers = document.getElementById('show-damage-numbers');
    if (showDamageNumbers) {
      showDamageNumbers.checked = this.settings.showDamageNumbers !== false;
    }

    // Display
    const brightness = document.getElementById('brightness');
    if (brightness) {
      brightness.value = this.settings.brightness || 100;
      document.getElementById('brightness-value').textContent = (this.settings.brightness || 100) + '%';
    }

    const contrast = document.getElementById('contrast');
    if (contrast) {
      contrast.value = this.settings.contrast || 100;
      document.getElementById('contrast-value').textContent = (this.settings.contrast || 100) + '%';
    }

    const showFps = document.getElementById('show-fps');
    if (showFps) {
      showFps.checked = this.settings.showFps || false;
      // 初始化 FPS 显示状态
      const fpsCounter = document.getElementById('fps-counter');
      if (fpsCounter) {
        fpsCounter.style.display = (this.settings.showFps || false) ? 'block' : 'none';
      }
    }

    const fullscreenMode = document.getElementById('fullscreen-mode');
    if (fullscreenMode) {
      // 同步当前全屏状态到复选框（不自动触发全屏，避免用户手势陷阱）
      const currentFullscreenState = !!document.fullscreenElement;
      fullscreenMode.checked = currentFullscreenState;
      // 更新设置以匹配实际状态
      this.settings.fullscreenMode = currentFullscreenState;
    }

    // 更新开发者模式状态显示
    if (window.devModeManager) {
      window.devModeManager.updateStatusDisplay();
    }

    // Apply display settings
    this.applyDisplaySettings();
  }

  loadSettings() {
    const saved = localStorage.getItem('gameSettings');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.warn('Failed to parse settings:', e);
      }
    }
    
    // Return default settings
    return {
      bgmVolume: 100,
      sfxVolume: 100,
      uiSfxVolume: 100,
      audioEnabled: true,
      graphicsQuality: 'low',
      particleEffects: true,
      screenShake: true,
      bloomEffect: true,
      gameSpeed: 1.0,
      autoSave: true,
      difficultyScaling: true,
      showDamageNumbers: true,
      brightness: 100,
      contrast: 100,
      showFps: false,
      fullscreenMode: false
    };
  }

  saveSettings() {
    localStorage.setItem('gameSettings', JSON.stringify(this.settings));
    console.log('[Settings] Settings saved to localStorage');
  }

  // RESET SETTINGS - 恢复默认设置并立即应用
  resetSettings() {
    if (!confirm('确定要恢复默认设置吗？\n这将重置所有音频、显示和游戏偏好。')) {
      return;
    }

    console.log('[Settings] Resetting to defaults...');

    // 1. 定义单一信源的默认配置 (Single Source of Truth)
    const defaults = {
      // 音频
      bgmVolume: 100,
      sfxVolume: 100,
      uiSfxVolume: 100,
      audioEnabled: true,
      
      // 画质 (保留默认低画质以确保性能)
      graphicsQuality: 'low',
      particleEffects: true,
      screenShake: true,
      bloomEffect: true,
      
      // 游戏性
      gameSpeed: 1.0,
      autoSave: true,
      difficultyScaling: true,
      showDamageNumbers: true,
      
      // 显示
      brightness: 100,
      contrast: 100,
      showFps: false,
      fullscreenMode: false
    };

    // 2. 更新内存状态
    this.settings = { ...defaults }; // 使用浅拷贝防止引用问题

    // 3. 立即应用副作用 (Side Effects) - 核心修复
    
    // [Audio] 强制更新混音器
    if (this.audio) {
      this.audio.updateVolumes(this.settings);
      // 如果开启了音频，播放确认音效
      if (this.settings.audioEnabled) {
        this.audio.playMetalClick();
        // 尝试恢复 BGM (如果之前被静音)
        if (this.audio.currentBgm && this.audio.currentBgm.paused) {
          this.audio.currentBgm.play().catch(() => {
            // 静默失败，浏览器自动播放策略可能阻止
          });
        }
      }
    }

    // [Display] 重置 CSS 滤镜
    this.applyDisplaySettings();

    // [Display] FPS 计数器
    const fpsCounter = document.getElementById('fps-counter');
    if (fpsCounter) {
      fpsCounter.style.display = this.settings.showFps ? 'block' : 'none';
    }

    // [Display] 退出全屏 (如果当前是全屏且默认是关闭)
    if (document.fullscreenElement && !this.settings.fullscreenMode) {
      document.exitFullscreen().catch(err => {
        console.warn('[Settings] 退出全屏失败 (非致命):', err);
      });
    }

    // 4. 持久化保存
    this.saveSettings();

    // 5. 关键修复：刷新 UI 控件状态 (Sync UI Inputs)
    // 这一步确保滑块跳回中间，复选框取消勾选
    // 我们直接调用 loadSettingsUI，因为它包含了所有 DOM 更新逻辑
    this.loadSettingsUI();

    // 6. 给用户反馈
    if (this.ui && this.ui.logMessage) {
      this.ui.logMessage('设置已恢复默认', 'info');
    }
    
    console.log('[Settings] All settings reset and applied.');
  }
  equipFromInventory(slotIdx) {
    // FIX: 支持物品对象和字符串ID
    const itemOrId = this.player && this.player.inventory ? this.player.inventory[slotIdx] : null;
    if (!itemOrId) return;
    
    // 获取物品对象（equip方法已经支持对象和ID）
    const prevItem = this.player.equip(itemOrId);
    this.player.removeFromInventory(slotIdx);
    if (prevItem) this.player.inventory[slotIdx] = prevItem;
    if (this.ui && this.ui.renderInventory) this.ui.renderInventory(this.player);
    this.ui.updateStats(this.player);
  }

  // ULTIMATE
  activateUltimate() {
    // FIX: 冰冻状态下禁止使用必杀技
    if (this.player && this.player.hasStatus && this.player.hasStatus('FROZEN')) {
      if (this.ui) this.ui.logMessage('冰冻状态下无法使用必杀技！', 'warning');
      return;
    }
    
    if (this.player.stats.rage < 100) return; // not ready
    this.player.stats.rage = 0; this.ui.updateStats(this.player);
    
    // Activate character-specific ultimate
    if (this.player.charConfig && this.player.charConfig.id === 'WARRIOR') {
      if (this.player.activateBerserk) {
        this.player.activateBerserk();
      }
    } else if (this.player.charConfig && this.player.charConfig.id === 'MAGE') {
      if (this.player.castUltimateSkill) {
        this.player.castUltimateSkill();
      }
    } else {
      this.ui.logMessage('终极技能已激活！', 'ultimate');
    }
    
    // Small camera shake as feedback
    this.camera.shakeTimer = Math.max(this.camera.shakeTimer || 0, 20);
  }
  activateUlt() { this.activateUltimate(); }

  // CHEST LOOT GENERATION SYSTEM
  generateChestLoot(chestX, chestY) {
    // Weighted random selection
    const selectFromWeightedTable = (table) => {
      const totalWeight = Object.values(table).reduce((sum, entry) => sum + entry.weight, 0);
      let random = Math.random() * totalWeight;
      
      for (const [key, entry] of Object.entries(table)) {
        random -= entry.weight;
        if (random <= 0) {
          return key;
        }
      }
      return Object.keys(table)[0]; // Fallback
    };

    // Select random equipment with rarity-based weighting
    const selectRandomEquipment = () => {
      const allEquipment = Object.values(EQUIPMENT_DB).filter(item => item.type !== 'CONSUMABLE');
      
      // Build weighted pool based on rarity
      const weightedPool = [];
      allEquipment.forEach(item => {
        const rarityData = RARITY[item.rarity] || RARITY.COMMON;
        for (let i = 0; i < rarityData.weight; i++) {
          weightedPool.push(item);
        }
      });
      
      if (weightedPool.length === 0) return null;
      return weightedPool[Math.floor(Math.random() * weightedPool.length)];
    };

    const lootType = selectFromWeightedTable(LOOT_TABLE);
    
    switch (lootType) {
      case 'GOLD': {
        // Gold amount scales with rarity
        const rarityRoll = Math.random();
        let rarity = RARITY.COMMON;
        let cumulativeWeight = 0;
        for (const r of Object.values(RARITY)) {
          cumulativeWeight += r.weight;
          if (rarityRoll * 100 <= cumulativeWeight) {
            rarity = r;
            break;
          }
        }
        
        const baseAmount = LOOT_TABLE.GOLD.minAmount;
        const maxAmount = LOOT_TABLE.GOLD.maxAmount;
        const rarityMultiplier = rarity === RARITY.LEGENDARY ? 3 : rarity === RARITY.EPIC ? 2 : rarity === RARITY.RARE ? 1.5 : 1;
        const goldAmount = Math.floor((baseAmount + Math.random() * (maxAmount - baseAmount)) * rarityMultiplier);
        
        this.player.stats.gold = (this.player.stats.gold || 0) + goldAmount;
        this.ui.logMessage(`宝箱打开！获得 ${goldAmount} 金币 [${rarity.name}]`, 'gain');
        
        // Show floating text with rarity color
        if (this.settings && this.settings.showDamageNumbers !== false) {
          const floatingText = this.floatingTextPool.create(chestX * TILE_SIZE, chestY * TILE_SIZE - 10, `+${goldAmount}G`, rarity.color);
          this.floatingTexts.push(floatingText);
        }
        break;
      }
      
      case 'POTION': {
        // FIX: 使用 RNG（如果存在，每日挑战模式需要确定性）
        const rng = (this.isDailyMode && this.rng) ? this.rng : null;
        const consumable = getRandomConsumable(rng);
        if (consumable) {
          const added = this.player.addToInventory(consumable.id);
          if (added) {
            const rarity = RARITY[consumable.rarity] || RARITY.COMMON;
            this.ui.logMessage(`宝箱打开！获得 ${consumable.nameZh || consumable.name} [${rarity.name}]`, 'gain');
            
            // Show floating text with rarity color
            if (this.settings && this.settings.showDamageNumbers !== false) {
              const floatingText = this.floatingTextPool.create(chestX * TILE_SIZE, chestY * TILE_SIZE - 10, consumable.nameZh || consumable.name, rarity.color);
              this.floatingTexts.push(floatingText);
            }
          } else {
            this.ui.logMessage('宝箱打开，但背包已满！', 'info');
          }
        }
        break;
      }
      
      case 'EQUIPMENT': {
        const equipment = selectRandomEquipment();
        if (equipment) {
          // Drop equipment on ground near chest
          this.map.addEquipAt(equipment.id, chestX, chestY);
          const rarity = RARITY[equipment.rarity] || RARITY.COMMON;
          this.ui.logMessage(`宝箱打开！发现装备 ${equipment.nameZh || equipment.name} [${rarity.name}]`, 'gain');
          
          // Show floating text with rarity color
          if (this.settings && this.settings.showDamageNumbers !== false) {
            const floatingText = this.floatingTextPool.create(chestX * TILE_SIZE, chestY * TILE_SIZE - 10, equipment.nameZh || equipment.name, rarity.color);
            this.floatingTexts.push(floatingText);
          }
        }
        break;
      }
      
      case 'RELIC': {
        // 遗物系统：从宝箱中掉落遗物（低概率，稀有奖励）
        import('./data/artifacts.js').then(({ ARTIFACTS }) => {
          const allRelics = Object.keys(ARTIFACTS);
          if (allRelics.length === 0) return;
          
          // 检查玩家已拥有的遗物，避免重复
          const ownedRelics = this.player.relics ? Array.from(this.player.relics.keys()) : [];
          const availableRelics = allRelics.filter(id => !ownedRelics.includes(id));
          
          if (availableRelics.length === 0) {
            // 如果所有遗物都已拥有，掉落金币作为替代
            const goldAmount = 500 + Math.floor(Math.random() * 500);
            this.player.stats.gold = (this.player.stats.gold || 0) + goldAmount;
            this.ui.logMessage(`宝箱打开！获得 ${goldAmount} 金币（已拥有所有遗物）`, 'gain');
            return;
          }
          
          // 随机选择一个遗物
          const randomRelicId = availableRelics[Math.floor(Math.random() * availableRelics.length)];
          const relic = ARTIFACTS[randomRelicId];
          
          if (relic) {
            // 添加遗物到玩家
            this.player.addRelic(randomRelicId);
            
            // 显示掉落消息
            const rarity = RARITY[relic.rarity] || RARITY.COMMON;
            this.ui.logMessage(`宝箱打开！获得遗物：${relic.name} [${rarity.name}]`, 'gain');
            
            // Show floating text with rarity color
            if (this.settings && this.settings.showDamageNumbers !== false) {
              const floatingText = this.floatingTextPool.create(chestX * TILE_SIZE, chestY * TILE_SIZE - 10, relic.name, rarity.color);
              this.floatingTexts.push(floatingText);
            }
          }
        }).catch(err => {
          console.error('[Game] 加载遗物数据失败:', err);
        });
        break;
      }
      
      case 'STAT_BOOST': {
        // Random choice: HP or Rage
        if (Math.random() < 0.5) {
          const hpBoost = 20 + Math.floor(Math.random() * 30);
          this.player.heal(hpBoost);
          this.ui.logMessage(`宝箱打开！恢复 ${hpBoost} HP！`, 'gain');
          
          if (this.settings && this.settings.showDamageNumbers !== false) {
            const floatingText = this.floatingTextPool.create(chestX * TILE_SIZE, chestY * TILE_SIZE - 10, `+${hpBoost} HP`, '#00ff00');
            this.floatingTexts.push(floatingText);
          }
        } else {
          const rageBoost = 15 + Math.floor(Math.random() * 20);
          this.player.stats.rage = Math.min(100, (this.player.stats.rage || 0) + rageBoost);
          this.ui.logMessage(`宝箱打开！获得 ${rageBoost} 怒气！`, 'gain');
          
          if (this.settings && this.settings.showDamageNumbers !== false) {
            const floatingText = this.floatingTextPool.create(chestX * TILE_SIZE, chestY * TILE_SIZE - 10, `+${rageBoost} 怒气`, '#ff9900');
            this.floatingTexts.push(floatingText);
          }
        }
        break;
      }
      
      case 'NOTHING': {
        // 10% chance for trap, 90% chance for just nothing
        if (Math.random() < 0.1) {
          const damage = 10 + Math.floor(Math.random() * 15);
          this.player.takeDamage(damage);
          this.ui.logMessage(`陷阱箱！受到 ${damage} 伤害！`, 'combat');
          
          if (this.settings && this.settings.showDamageNumbers !== false) {
            const floatingText = this.floatingTextPool.create(chestX * TILE_SIZE, chestY * TILE_SIZE - 10, `-${damage}`, '#ff0000');
            this.floatingTexts.push(floatingText);
          }
        } else {
          this.ui.logMessage('宝箱是空的...', 'info');
        }
        break;
      }
    }
    
    this.ui.updateStats(this.player);
  }

  // CHARACTER SELECTION SYSTEM - Risk of Rain 2 HUD Style
  async showCharacterSelect(mode = 'normal') {
    try {
      // 1. 直接显示加载界面（它会覆盖在当前界面之上）
      this.loadingUI.showOverlay('charSelect', '加载英雄选择界面...');
      
      // 给一点时间让加载界面的淡入动画开始播放
      await new Promise(r => setTimeout(r, 100));

      // 初始化角色选择界面
      this.initCharSelect();
      await this.waitForCharSelectScreenResourcesLoaded();
      this.loadingUI.setProgress(100, 'charSelect');
      
      // 应用模式设置
      if (this.ui && this.ui.showCharacterSelect) {
        this.ui.showCharacterSelect(mode);
      }
      
      // 2. 在幕后隐藏主菜单（此时加载页已完全遮挡，用户看不见这个切换）
      this.hideMainMenu();

      // 3. 转场到角色选择界面
      await this.loadingUI.transitionToScene('char-select-screen', 'charSelect');
      
      // 确保角色选择界面可见（兜底机制）
      const charSelectScreen = document.getElementById('char-select-screen');
      if (charSelectScreen) {
        charSelectScreen.classList.add('loaded');
        console.log('[CharSelect] Character selection screen shown with transition');
      }
    } catch (e) {
      console.error('[CharSelect] Error showing character select:', e);
      this.loadingUI.hideOverlay('charSelect');
    }
  }

  /**
   * 等待英雄选择界面的所有资源加载完毕
   */
  async waitForCharSelectScreenResourcesLoaded() {
    return new Promise((resolve) => {
      const charSelectScreen = document.getElementById('char-select-screen');
      if (!charSelectScreen) {
        resolve();
        return;
      }

      // 收集所有需要加载的资源
      const images = charSelectScreen.querySelectorAll('img');
      const elementsWithBg = charSelectScreen.querySelectorAll('[style*="background-image"], [style*="backgroundImage"]');
      
      let totalResources = images.length + elementsWithBg.length;
      let loadedResources = 0;

      if (totalResources === 0) {
        resolve();
        return;
      }

      const checkComplete = () => {
        loadedResources++;
        const percent = Math.round((loadedResources / totalResources) * 100);
        this.loadingUI.setProgress(percent, 'charSelect');
        
        if (loadedResources >= totalResources) {
          resolve();
        }
      };

      // 监听 <img> 标签
      images.forEach(img => {
        if (img.complete && img.naturalHeight !== 0) {
          checkComplete();
        } else {
          img.addEventListener('load', checkComplete, { once: true });
          img.addEventListener('error', checkComplete, { once: true });
        }
      });

      // 监听 CSS background-image
      elementsWithBg.forEach(el => {
        const bgImage = window.getComputedStyle(el).backgroundImage;
        if (bgImage && bgImage !== 'none') {
          const urlMatch = bgImage.match(/url\(['"]?([^'"()]+)['"]?\)/);
          if (urlMatch) {
            const imageUrl = urlMatch[1];
            const img = new Image();
            img.onload = checkComplete;
            img.onerror = checkComplete;
            img.src = imageUrl;
          } else {
            checkComplete();
          }
        } else {
          checkComplete();
        }
      });
    });
  }

  hideCharacterSelect() {
    const charSelectScreen = document.getElementById('char-select-screen');
    if (charSelectScreen) {
      charSelectScreen.classList.remove('loaded');
      charSelectScreen.classList.remove('scene-transition', 'scene-active', 'scene-enter');
      charSelectScreen.style.display = 'none';
      console.log('[CharSelect] Character selection screen hidden');
    }
  }

  /**
   * 从英雄选择界面返回到主菜单（带过渡效果）
   */
  async returnToMainMenu() {
    console.log('[CharSelect] Returning to main menu with transition');
    
    try {
      // 第一步：淡出角色选择界面
      await this.loadingUI.fadeSceneOut('char-select-screen');
      
      // 显示加载界面
      this.loadingUI.showOverlay('charSelect', '返回主菜单...');
      
      // 显示主菜单（使用过渡效果）
      this.showMainMenu(true); // 仅预备不显示
      await this.loadingUI.transitionToScene('main-menu', 'charSelect');
      
      // 关键修复：移除 char-select-screen 的 .scene-transition 类，防止它因为 CSS 规则 display: block !important 而无法隐藏
      const charSelect = document.getElementById('char-select-screen');
      if (charSelect) {
        charSelect.classList.remove('scene-transition');
        charSelect.style.setProperty('display', 'none', 'important');
      }
      
      console.log('[CharSelect] Returned to main menu with transition');
    } catch (e) {
      console.error('[CharSelect] Error returning to main menu:', e);
      // 错误恢复：直接显示主菜单
      this.hideCharacterSelect();
      this.showMainMenu();
    }
  }

  /**
   * 设置英雄图标的素材切割位置
   * 专门用于处理英雄图标的background-position，避免影响其他素材的切割
   * 
   * @param {HTMLElement} iconElement - 英雄图标元素
   * @param {number} iconIndex - 英雄在精灵图中的列索引 (0, 1, 2)
   */
  setCharIconBackgroundPosition(iconElement, iconIndex) {
    if (!iconElement) return;

    // 明确声明英雄图标精灵表布局：3 列 2 行（第二行可能为备用/选中状态）
    const COLS = 3;
    const ROWS = 1; // 英雄图标素材为 3 列 1 行
    const ROW_INDEX = 0;

    // 设置背景图片（防止被其他状态覆盖）
    const url = ASSETS.UI_ICONS_CLASS.url;
    if (url) iconElement.style.backgroundImage = `url('${url}')`;

    // 优先：像素级精确切片，避免百分比在不同缩放/浏览器下出现偏移和缝隙
    try {
      const img = this.loader?.getImage?.('UI_ICONS_CLASS');
      if (img && (img.naturalWidth || img.width) && (img.naturalHeight || img.height)) {
        const natW = img.naturalWidth || img.width;
        const natH = img.naturalHeight || img.height;
        const cellW = natW / COLS;
        const cellH = natH / ROWS;
        const iconH = iconElement.clientHeight || 72; // 目标高度
        const scale = iconH / cellH;                  // 以单元格高度为基准缩放
        const dispW = (cellW * COLS) * scale;         // 缩放后的整张图显示宽度
        const frameW = dispW / COLS;                  // 单帧显示宽度
        const yOffsetPx = -Math.round(ROW_INDEX * iconH); // 固定使用第1行

        iconElement.style.backgroundRepeat = 'no-repeat';
        iconElement.style.backgroundSize = `${Math.round(dispW)}px ${Math.round(iconH * ROWS)}px`;
        iconElement.style.backgroundPosition = `${-Math.round(iconIndex * frameW)}px ${yOffsetPx}px`;
        return; // 成功使用像素模式
      }
    } catch (e) { /* ignore */ }

    // 兜底：百分比方案（3列2行）
    iconElement.style.backgroundRepeat = 'no-repeat';
    iconElement.style.backgroundSize = '300% 200%';
    const xPercent = (COLS === 1) ? 0 : iconIndex * (100 / (COLS - 1)); // 0,50,100
    const yPercent = (ROWS === 1) ? 0 : ROW_INDEX * (100 / (ROWS - 1));  // 0 或 100
    iconElement.style.backgroundPosition = `${xPercent}% ${yPercent}%`;
  }

  initCharSelect() {
    // Character index mapping for icon slicing (Warrior, Mage, Rogue)
    const charIndexMap = {
      'WARRIOR': 0,
      'MAGE': 1,
      'ROGUE': 2
    };

    // Generate character icons in .ror-char-strip
    const charStrip = document.querySelector('.ror-char-strip');
    if (charStrip) {
      charStrip.innerHTML = ''; // Clear existing icons
      
      // Create icon for each character (only first 3: Warrior, Mage, Rogue)
      const displayChars = ['WARRIOR', 'MAGE', 'ROGUE'];
      displayChars.forEach(charId => {
        if (!CHARACTERS[charId]) return;
        
        const charData = CHARACTERS[charId];
        const icon = document.createElement('button');
        icon.className = 'ror-char-icon';
        icon.setAttribute('data-char', charId);
        icon.title = charData.name;
        
        // Set background image to UI_ICONS_CLASS
        icon.style.backgroundImage = `url('${ASSETS.UI_ICONS_CLASS.url}')`;
        
        // Use specialized method to set background position for hero icons
        const iconIndex = charIndexMap[charId];
        this.setCharIconBackgroundPosition(icon, iconIndex);
        
        icon.addEventListener('click', () => {
          // FIX: 防御性判断 - 在每日挑战模式下，禁止选择非限定角色
          const charSelectScreen = document.getElementById('char-select-screen');
          if (charSelectScreen && charSelectScreen.classList.contains('mode-daily')) {
            // 获取每日挑战配置
            const dailyConfig = DailyChallengeSystem.getDailyConfig();
            if (dailyConfig && charId !== dailyConfig.character) {
              console.warn(`[CharSelect] 每日挑战模式下禁止选择角色: ${charId}，今日限定角色: ${dailyConfig.character}`);
              return; // 阻止选择
            }
          }
          this.selectCharacter(charId);
        });
        
        charStrip.appendChild(icon);
      });
    }

    // Set default selection
    this.selectCharacter(this.selectedCharId);
    
    // FIX: 在每日挑战模式下，强制设置并显示难度为层级 1
    const charSelectScreen = document.getElementById('char-select-screen');
    if (charSelectScreen && charSelectScreen.classList.contains('mode-daily')) {
      this.selectedAscensionLevel = 1;
      this.setAscensionLevel(1);
      console.log('[InitCharSelect] 每日挑战模式：强制设置难度层级为 1');
    } else {
      this.setAscensionLevel(this.selectedAscensionLevel);
    }
    
    // 初始化tooltip（鼠标悬停时显示）
    const diffDisplay = document.getElementById('ror-diff-display');
    if (diffDisplay) {
      const tooltipElement = document.getElementById('ror-diff-tooltip');
      diffDisplay.addEventListener('mouseenter', () => {
        if (tooltipElement) {
          this.updateAscensionTooltip(this.selectedAscensionLevel);
          tooltipElement.style.display = 'block';
        }
      });
      diffDisplay.addEventListener('mouseleave', () => {
        if (tooltipElement) {
          tooltipElement.style.display = 'none';
        }
      });
    }
  }

  selectCharacter(charId) {
    // Character index mapping for portrait slicing (Warrior, Mage, Rogue)
    const charIndexMap = {
      'WARRIOR': 0,
      'MAGE': 1,
      'ROGUE': 2
    };

    // Update state
    this.selectedCharId = charId;

    // Update UI: Highlight icon
    const charIcons = document.querySelectorAll('.ror-char-icon');
    charIcons.forEach(icon => {
      const iconCharId = icon.getAttribute('data-char');
      if (iconCharId === charId) {
        icon.classList.add('active');
        // 确保选中的图标也有正确的background-position
        const iconIndex = charIndexMap[iconCharId];
        this.setCharIconBackgroundPosition(icon, iconIndex);
      } else {
        icon.classList.remove('active');
        // 确保未选中的图标也有正确的background-position
        const iconIndex = charIndexMap[iconCharId];
        this.setCharIconBackgroundPosition(icon, iconIndex);
      }
    });

    // Update details panel
    const charData = CHARACTERS[charId];
    if (charData) {
      // Update name
      const charName = document.getElementById('ror-char-name');
      if (charName) charName.textContent = charData.name;

      // Update stats
      const hpSpan = document.getElementById('ror-hp');
      const atkSpan = document.getElementById('ror-speed');
      if (hpSpan) hpSpan.textContent = `HP: ${charData.stats.maxHp}`;
      if (atkSpan) atkSpan.textContent = `攻击: ${charData.stats.p_atk}`;

      // Update skills grid with icons and descriptions
      const skillNames = ['passive', 'active', 'ult'];
      const skillLabels = ['被动', '主动', '必杀技'];
      const skillIconIndices = charData.skillIconIndices || [0, 1, 2];

      // Map character to Y position in 3x3 grid
      const charYMap = {
        'WARRIOR': 0,
        'MAGE': 50,
        'ROGUE': 100
      };
      const charYPercent = charYMap[charId] || 0;

      skillNames.forEach((skillType, idx) => {
        // Update skill icon background position for 3x3 grid
        const skillIcon = document.getElementById(`skill-icon-${idx}`);
        if (skillIcon) {
          const iconIndex = skillIconIndices[idx];
          // X position: 0%, 50%, 100% for columns 0, 1, 2
          const xPercent = idx * 50;
          const backgroundPosition = `${xPercent}% ${charYPercent}%`;
          skillIcon.style.backgroundPosition = backgroundPosition;
          skillIcon.style.backgroundImage = `url('${ASSETS.ICONS_SKILLS.url}')`;
        }

        // Update skill label
        const skillLabel = document.getElementById(`skill-label-${idx}`);
        if (skillLabel) skillLabel.textContent = skillLabels[idx];

        // Update skill description
        const skillDesc = document.getElementById(`skill-desc-${idx}`);
        if (skillDesc) {
          // Map skill type to the correct key in charData.skills
          const skillKeyMap = {
            'passive': 'PASSIVE',
            'active': 'ACTIVE',
            'ult': 'ULT'
          };
          const skillKey = skillKeyMap[skillType];
          const skillData = charData.skills[skillKey];
          if (skillData) {
            if (skillData.desc) {
              skillDesc.textContent = `${skillData.name}: ${skillData.desc}`;
            } else {
              skillDesc.textContent = skillData.name || '';
            }
          }
        }
      });

      // Update lore
      const loreDiv = document.getElementById('ror-lore');
      if (loreDiv) loreDiv.textContent = charData.desc;
    }

    // Update animated portrait preview
    // CSS animation now handles the frame-by-frame movement via portrait-idle keyframes
    // JS only ensures the container is visible and has the correct base class
    const previewSprite = document.getElementById('ror-preview-sprite');
    if (previewSprite) {
      // Ensure the container is visible and uses the animated portrait asset
      previewSprite.style.backgroundImage = `url('https://i.postimg.cc/PJBxvYD0/zhanshilihui1.png')`;
      // CSS animation handles background-position changes, no need to set it here
    }
  }



  // @deprecated 保留用于向后兼容
  setDifficulty(difficulty) {
    // Update state
    this.selectedDiff = difficulty;

    // Update UI: Display difficulty name
    const diffName = document.getElementById('ror-diff-name');
    if (diffName) {
      const diffData = DIFFICULTY_LEVELS[difficulty.toUpperCase()];
      if (diffData) {
        diffName.textContent = diffData.name;
      }
    }

    // Update difficulty multiplier
    const diffData = DIFFICULTY_LEVELS[difficulty.toUpperCase()];
    if (diffData) {
      this.difficultyMultiplier = diffData.multiplier;
    }
  }

  // @deprecated 保留用于向后兼容
  changeDiff(direction) {
    // Get current difficulty index
    const difficulties = Object.keys(DIFFICULTY_LEVELS);
    const currentIndex = difficulties.findIndex(d => d.toLowerCase() === this.selectedDiff);
    const newIndex = (currentIndex + direction + difficulties.length) % difficulties.length;
    const newDiff = difficulties[newIndex].toLowerCase();
    this.setDifficulty(newDiff);
  }

  // 新的噩梦层级设置方法
  setAscensionLevel(level) {
    if (level < 1) level = 1;
    if (level > 25) level = 25;
    this.selectedAscensionLevel = level;
    
    // Update UI: Display ascension level number
    const diffName = document.getElementById('ror-diff-name');
    if (diffName) {
      diffName.textContent = level;
    }
    
    // Update new effect description
    const newEffectText = getAscensionLevelNewEffect(level);
    const diffDesc = document.getElementById('ror-diff-desc');
    if (diffDesc) {
      diffDesc.textContent = newEffectText;
    }
    
    // Update tooltip
    this.updateAscensionTooltip(level);
  }

  // 改变噩梦层级（方向：-1为减少，+1为增加）
  changeAscensionLevel(direction) {
    const newLevel = Math.max(1, Math.min(25, this.selectedAscensionLevel + direction));
    this.setAscensionLevel(newLevel);
  }

  // 更新噩梦层级tooltip
  updateAscensionTooltip(level) {
    const tooltipElement = document.getElementById('ror-diff-tooltip');
    if (tooltipElement) {
      const effects = getAscensionLevelTooltip(level);
      tooltipElement.innerHTML = effects.join('<br>');
    }
  }

  // MAIN MENU SYSTEM
  showMainMenu(prepareOnly = false) {
    const mainMenu = document.getElementById('main-menu');
    const mainUI = document.getElementById('main-ui');
    const charSelect = document.getElementById('char-select-screen'); // 获取角色选择界面
    
    // Reset menu groups to show main group, hide extras group
    const mainGroup = document.getElementById('menu-group-main');
    const extrasGroup = document.getElementById('menu-group-extras');
    if (mainGroup) {
      // Reset main group to center position
      mainGroup.classList.remove('menu-pos-left');
      mainGroup.classList.add('menu-pos-center');
      // Remove old classes
      mainGroup.classList.remove('hidden', 'active');
    }
    if (extrasGroup) {
      // Reset extras group to right position (hidden)
      extrasGroup.classList.remove('menu-pos-center');
      extrasGroup.classList.add('menu-pos-right');
      // Remove old classes
      extrasGroup.classList.remove('hidden', 'active');
    }
    
    // 关键修复：彻底隐藏其他所有界面，防止隐形遮挡
    if (mainUI) {
      mainUI.classList.remove('loaded', 'scene-active');
      mainUI.style.display = 'none';
      mainUI.style.pointerEvents = 'none'; // 双重保险
    }
    
    if (charSelect) {
      charSelect.classList.remove('loaded', 'scene-active');
      charSelect.style.display = 'none';
      charSelect.style.pointerEvents = 'none'; // 双重保险
    }
    
    // 新增：强制隐藏所有可能阻挡点击的覆盖层 (Draft, Shrine, Gambler, etc.)
    const blockers = ['draft-overlay', 'shrine-overlay', 'gambler-overlay', 'shop-overlay', 'inventory-overlay', 'bestiary-overlay'];
    blockers.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.classList.add('hidden');
        el.style.display = 'none';
        el.style.pointerEvents = 'none';
        console.log(`[Menu] 强制隐藏覆盖层: ${id}`);
      }
    });
    
    // Show main menu
    if (mainMenu) {
      if (prepareOnly) {
        // 仅预备：移除 hidden 类，但不设置 display
        mainMenu.classList.remove('hidden');
        // 预备阶段也确保它在最上层
        mainMenu.style.zIndex = '10000';
      } else {
        mainMenu.style.display = 'flex';
        mainMenu.style.zIndex = '10000';
        mainMenu.style.pointerEvents = 'auto';
      }
    }
    
    console.log(`[Menu] Main menu ${prepareOnly ? 'prepared' : 'displayed'} (其他界面已强制隐藏)`);
  }

  hideMainMenu() {
    const mainMenu = document.getElementById('main-menu');
    if (mainMenu) mainMenu.style.display = 'none';
  }

  /**
   * 设置音频上下文恢复（处理浏览器自动播放限制）
   * 在用户首次交互时解锁音频播放
   */
  setupAudioResume() {
    if (!this.audio) return;
    
    // 一次性事件监听器：在用户首次点击或按键时解锁音频
    const resumeAudio = async (event) => {
      if (this.audio && !this.audio.audioContextResumed) {
        await this.audio.resume();
        // 尝试播放 BGM（如果用户已启用音频）
        if (this.settings && this.settings.audioEnabled !== false) {
          this.audio.playBgm('dungeon_theme');
        }
        // 移除事件监听器（只需要解锁一次）
        document.removeEventListener('click', resumeAudio);
        document.removeEventListener('keydown', resumeAudio);
        document.removeEventListener('touchstart', resumeAudio);
      }
    };
    
    // 监听多种用户交互事件
    document.addEventListener('click', resumeAudio, { once: true });
    document.addEventListener('keydown', resumeAudio, { once: true });
    document.addEventListener('touchstart', resumeAudio, { once: true });
    
    console.log('[Audio] Audio resume listeners setup');
  }

  setupMenuButtons() {
    const btnStart = document.getElementById('btn-start-game');
    const btnContinue = document.getElementById('btn-continue');
    const btnBestiary = document.getElementById('btn-bestiary');
    const btnSettings = document.getElementById('btn-settings');

    if (btnStart) {
      btnStart.addEventListener('click', async () => {
        try {
          // 确保音频上下文已解锁并启动 BGM
          if (this.audio) {
            await this.audio.resume();
            this.audio.playBgm('dungeon_theme');
          }
          
          // 优化：先显示加载层，再切换界面（参考 returnToMainMenu 实现模式）
          this.loadingUI.showOverlay('charSelect', '加载英雄选择界面...');
          
          // 等待遮罩显示
          await new Promise(r => setTimeout(r, 200));
          
          // 隐藏主菜单 DOM
          this.hideMainMenu();
          
          // 显示角色选择界面（内部已包含 transitionToScene）
          await this.showCharacterSelect();
        } catch (error) {
          console.error('[Game] Error handling start game button click:', error);
          // 如果出错，恢复主菜单显示，避免黑屏
          this.showMainMenu();
        }
      });
    }

    if (btnContinue) {
      // Check if save exists
      const hasSave = SaveSystem.hasSave();
      if (hasSave) {
        btnContinue.classList.remove('disabled');
      } else {
        btnContinue.classList.add('disabled');
      }

      btnContinue.addEventListener('click', async () => {
        if (!SaveSystem.hasSave()) {
          this.ui.logMessage('没有保存的数据！', 'info');
          return;
        }
        // 确保音频上下文已解锁并启动 BGM
        if (this.audio) {
          await this.audio.resume();
          this.audio.playBgm('dungeon_theme');
        }
        this.loadGame();
        this.startGame();
      });
    }

    if (btnBestiary) {
      btnBestiary.addEventListener('click', () => {
        if (this.ui && this.ui.openBestiary) {
          this.ui.openBestiary();
        }
      });
    }

    // Talent Tree Button
    const btnTalents = document.getElementById('btn-talents');
    if (btnTalents) {
      // Issue 1 Fix: 添加统一的菜单按钮样式类
      btnTalents.classList.add('menu-btn');
      btnTalents.addEventListener('click', () => {
        this.openTalentTree();
      });
    }

    // Leaderboard Button
    const btnLeaderboard = document.getElementById('btn-leaderboard');
    if (btnLeaderboard) {
      btnLeaderboard.addEventListener('click', () => {
        this.openLeaderboard();
      });
    }

    // Daily Challenge Button
    const btnDailyChallenge = document.getElementById('btn-daily-challenge');
    if (btnDailyChallenge) {
      btnDailyChallenge.addEventListener('click', async () => {
        try {
          console.log('[Game] Daily Challenge button clicked');
          
          // 确保音频上下文已解锁并启动 BGM
          if (this.audio) {
            await this.audio.resume();
            this.audio.playBgm('dungeon_theme');
          }
          
          // 优化：先显示加载层，再切换界面（参考 returnToMainMenu 实现模式）
          this.loadingUI.showOverlay('charSelect', '加载英雄选择界面...');
          
          // 等待遮罩显示
          await new Promise(r => setTimeout(r, 200));
          
          // 隐藏主菜单 DOM
          this.hideMainMenu();
          
          // 进入每日挑战模式选择界面（内部已包含 transitionToScene）
          await this.showCharacterSelect('daily');
        } catch (error) {
          console.error('[Game] Error handling daily challenge button click:', error);
          // 如果出错，恢复主菜单显示，避免黑屏
          this.showMainMenu();
        }
      });
    } else {
      console.warn('[Game] Daily Challenge button not found: #btn-daily-challenge');
    }

    // Achievement Button
    const btnAchievements = document.getElementById('btn-achievements');
    if (btnAchievements) {
      btnAchievements.addEventListener('click', () => {
        this.openAchievements();
      });
    }

    if (btnSettings) {
      btnSettings.addEventListener('click', () => {
        this.openSettings();
      });
    }

    // More Button - Switch to Extras Group
    const btnMore = document.getElementById('btn-more');
    if (btnMore) {
      btnMore.addEventListener('click', () => {
        const mainGroup = document.getElementById('menu-group-main');
        const extrasGroup = document.getElementById('menu-group-extras');
        
        if (mainGroup && extrasGroup) {
          // Main group: slide out to left
          mainGroup.classList.remove('menu-pos-center');
          mainGroup.classList.add('menu-pos-left');
          // Remove old classes
          mainGroup.classList.remove('hidden', 'active');
          
          // Extras group: slide in from right to center
          extrasGroup.classList.remove('menu-pos-right');
          extrasGroup.classList.add('menu-pos-center');
          // Remove old classes
          extrasGroup.classList.remove('hidden', 'active');
          
          // Play book flip sound effect
          if (this.audio) this.audio.playBookFlip();
        }
      });
    }

    // Back Button - Switch to Main Group
    const btnBack = document.getElementById('btn-back');
    if (btnBack) {
      btnBack.addEventListener('click', () => {
        const mainGroup = document.getElementById('menu-group-main');
        const extrasGroup = document.getElementById('menu-group-extras');
        
        if (mainGroup && extrasGroup) {
          // Extras group: slide out to right
          extrasGroup.classList.remove('menu-pos-center');
          extrasGroup.classList.add('menu-pos-right');
          // Remove old classes
          extrasGroup.classList.remove('hidden', 'active');
          
          // Main group: slide in from left to center
          mainGroup.classList.remove('menu-pos-left');
          mainGroup.classList.add('menu-pos-center');
          // Remove old classes
          mainGroup.classList.remove('hidden', 'active');
          
          // Play book flip sound effect
          if (this.audio) this.audio.playBookFlip();
        }
      });
    }

    // Setup backpack icon event listener
    this.setupBackpackIcon();
  }

  setupBackpackIcon() {
    const backpackIcon = document.getElementById('backpack-icon');
    if (backpackIcon) {
      console.log('✓ Backpack icon found, setting up event listener');
      
      // 移除可能存在的旧监听器
      const newIcon = backpackIcon.cloneNode(true);
      backpackIcon.parentNode.replaceChild(newIcon, backpackIcon);
      
      // 添加新的点击监听器
      newIcon.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('🎒 Backpack icon clicked!');
        this.openInventory();
      });
      
      // 添加鼠标悬停效果确认
      newIcon.addEventListener('mouseenter', () => {
        console.log('🎒 Mouse entered backpack icon');
      });
      
      console.log('✓ Backpack icon event listeners attached');
    } else {
      console.warn('Backpack icon not found!');
    }
  }

  /**
   * 保存游戏状态并跳转到 game.html
   */
  startGameWithRedirect() {
    console.log('[StartGameWithRedirect] Saving state and redirecting...');
    
    // 1. 显示加载界面（视觉反馈）
    // 使用 'global' 或 'gameplay' 类型的遮罩
    this.loadingUI.showOverlay('gameplay', '正在进入世界...');
    this.loadingUI.setProgress(100, 'gameplay'); // 设为满，表示准备就绪

    // 检查当前是否为每日挑战模式
    const charSelectScreen = document.getElementById('char-select-screen');
    const isDailyMode = charSelectScreen && charSelectScreen.classList.contains('mode-daily');
    
    if (isDailyMode) {
      // 每日挑战模式
      sessionStorage.setItem('gameMode', 'daily');
      
      // 获取每日挑战配置并保存种子
      const dailyConfig = DailyChallengeSystem.getDailyConfig();
      if (dailyConfig && dailyConfig.seed) {
        sessionStorage.setItem('dailySeed', dailyConfig.seed.toString());
      }
      
      // 强制保存设置：每日模式下必须开启战争迷雾和动态光照
      sessionStorage.setItem('enableFog', 'true');
      sessionStorage.setItem('enableLighting', 'true');
      
      console.log('[StartGameWithRedirect] Daily challenge mode detected, saving seed:', dailyConfig?.seed);
      console.log('[StartGameWithRedirect] Daily mode: forced enableFog=true, enableLighting=true');
    } else {
      // 普通模式
      sessionStorage.setItem('gameMode', 'normal');
      
      // 保存用户选择的战争迷雾设置
      const fogCheckbox = document.getElementById('chk-fog');
      const enableFog = fogCheckbox ? fogCheckbox.checked : true;
      sessionStorage.setItem('enableFog', enableFog.toString());
      
      // 保存用户选择的动态光照设置
      const lightingCheckbox = document.getElementById('chk-lighting');
      const enableLighting = lightingCheckbox ? lightingCheckbox.checked : true;
      sessionStorage.setItem('enableLighting', enableLighting.toString());
    }
    
    // 保存选择的角色和噩梦层级到 sessionStorage
    sessionStorage.setItem('selectedCharId', this.selectedCharId);
    sessionStorage.setItem('selectedAscensionLevel', this.selectedAscensionLevel.toString());
    sessionStorage.setItem('selectedDiff', this.selectedDiff); // @deprecated 向后兼容
    
    const enableFog = sessionStorage.getItem('enableFog') === 'true';
    const enableLighting = sessionStorage.getItem('enableLighting') === 'true';
    console.log(`[StartGameWithRedirect] Saved: charId=${this.selectedCharId}, ascensionLevel=${this.selectedAscensionLevel}, enableFog=${enableFog}, enableLighting=${enableLighting}, gameMode=${isDailyMode ? 'daily' : 'normal'}`);
    
    console.log('[Transition] Redirecting to game.html...');
    
    // 2. 延迟跳转，让用户看到加载层出现
    setTimeout(() => {
      window.location.href = 'game.html';
    }, 200); // 稍微缩短等待时间，感觉更响应
  }

  async startGame() {
    console.log('[StartGame] Starting game...');
    
    // 🔴 关键修复：强制隐藏所有可能阻挡点击/滚轮的覆盖层
    // 确保游戏开始时，没有任何隐形弹窗遮挡 Canvas
    const blockers = [
      'draft-overlay', 
      'shrine-overlay', 
      'gambler-overlay', 
      'shop-overlay', 
      'inventory-overlay', 
      'bestiary-overlay',
      'settings-overlay',
      'achievement-overlay',
      'leaderboard-overlay',
      'item-action-menu' // 右键菜单也一并清理
    ];
    
    blockers.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.classList.remove('overlay-fade-in'); // 移除可能的动画类
        el.classList.add('hidden');
        el.style.setProperty('display', 'none', 'important'); // 强制隐藏
        el.style.pointerEvents = 'none'; // 确保不阻挡交互
      }
    });
    
    // FIX: 清理每日挑战状态（防御性编程，确保普通模式不受影响）
    this.isDailyMode = false;
    this.rng = null;
    this.dailyChallengeDate = null; // FIX: 清理挑战日期
    this.dailyShopPriceMultiplier = 1.0;
    this.dailyEliteSpawnMultiplier = 1.0;
    // FIX: 重置伤害统计
    this.totalDamageDealt = 0;
    
    // 触发游戏加载开始事件，通知 LoadingOverlayManager
    window.dispatchEvent(new CustomEvent('gameplayLoadingStart'));
    
    // 显示游玩界面加载界面
    this.loadingUI.showOverlay('gameplay', '加载游戏资源...');
    
    try {
      // 🚀 优化：确认游戏内资源加载完成（资源可能已在后台预加载）
      // 如果资源已经由 init() 的后台预加载完成，这里的回调会瞬间完成（预期行为，秒开游戏）
      console.log('[StartGame] 确认游戏内资源加载状态...');
      this.loadingUI.setTip('加载游戏资源（图片）...', 'gameplay');
      
      // 加载游戏内图片资源（如果已加载，会立即完成）
      await this.loader.loadGameplayAssets(GAMEPLAY_ASSETS, (percent, loaded, total) => {
        // 更新加载进度（0-70% 用于图片资源）
        const imageProgress = Math.round((percent * 0.7));
        this.loadingUI.setProgress(imageProgress, 'gameplay');
        console.log(`[StartGame] 游戏资源加载进度: ${imageProgress}% (${loaded}/${total})`);
      });
      console.log('[StartGame] ✓ 游戏内图片资源已就绪');
      
      // 加载游戏内音频资源（后台加载，不阻塞）
      this.loadingUI.setTip('加载游戏资源（音频）...', 'gameplay');
      this.audio.preloadGameplayAudio().then(() => {
        console.log('[StartGame] ✓ 游戏内音频资源后台加载完成');
      }).catch(err => {
        console.warn('[StartGame] 游戏内音频资源加载失败:', err);
      });
      
      // 更新进度到 80%（音频在后台加载）
      this.loadingUI.setProgress(80, 'gameplay');
      this.loadingUI.setTip('初始化游戏界面...', 'gameplay');
      // Capture the "Enable Fog of War" setting from sessionStorage (set by startGameWithRedirect)
      // or from the checkbox if it exists (for direct game start from index.html)
      const enableFogFromSession = sessionStorage.getItem('enableFog');
      if (enableFogFromSession !== null) {
        // Convert string to boolean
        this.config.enableFog = enableFogFromSession === 'true';
        console.log(`[StartGame] Fog of War setting from sessionStorage: ${this.config.enableFog}`);
      } else {
        // Fallback: try to get from checkbox (for direct game start)
        const fogCheckbox = document.getElementById('chk-fog');
        if (fogCheckbox) {
          this.config.enableFog = fogCheckbox.checked;
          console.log(`[StartGame] Fog of War setting from checkbox: ${this.config.enableFog}`);
        }
      }
      
      // Capture the "Enable Dynamic Lighting" setting from sessionStorage
      const enableLightingFromSession = sessionStorage.getItem('enableLighting');
      if (enableLightingFromSession !== null) {
        // Convert string to boolean
        this.config.enableLighting = enableLightingFromSession === 'true';
        console.log(`[StartGame] Dynamic Lighting setting from sessionStorage: ${this.config.enableLighting}`);
      } else {
        // Fallback: try to get from checkbox (for direct game start)
        const lightingCheckbox = document.getElementById('chk-lighting');
        if (lightingCheckbox) {
          this.config.enableLighting = lightingCheckbox.checked;
          console.log(`[StartGame] Dynamic Lighting setting from checkbox: ${this.config.enableLighting}`);
        }
      }
      
      // 第一步：淡出角色选择界面（如果可见）
      const charSelectScreen = document.getElementById('char-select-screen');
      if (charSelectScreen && !charSelectScreen.classList.contains('hidden') && charSelectScreen.style.display !== 'none') {
        await this.loadingUI.fadeSceneOut('char-select-screen');
      }
      
      // Hide main menu (should already be hidden, but ensure it's hidden)
      this.hideMainMenu();
      console.log('[StartGame] Main menu and character select hidden');
      
      // Prepare main UI (but don't show yet)
      const mainUI = document.getElementById('main-ui');
      if (mainUI) {
        mainUI.classList.remove('loaded');
        mainUI.style.display = 'none';
      }
      
      // Only reset if this is a new game (not a loaded game)
      // Check if player is still at floor 1 with default stats (new game indicator)
      if (this.player.stats.floor === 1 && this.player.stats.gold === 0 && this.player.stats.xp === 0) {
        // New game - create a new Player instance with the selected character config
        const charData = CHARACTERS[this.selectedCharId];
        this.player = new Player(this.map, this.loader, charData);
        
        // Reset other stats for a new game
        this.player.stats.xp = 0;
        this.player.stats.gold = 0;
        this.player.stats.keys = 1;
        this.player.stats.rage = 0;
        // FIX: 新游戏时初始化楼层为0，nextLevel会将其变为1
        this.player.stats.floor = 0;
        this.player.equipment = { WEAPON: null, ARMOR: null, HELM: null, BOOTS: null, RING: null, AMULET: null, ACCESSORY: null };
        // Initialize inventory as array of 20 null slots (not empty array)
        this.player.inventory = new Array(20).fill(null);
        
        // Apply talent tree bonuses to player stats
        this.applyTalentBonuses();
        
        // 使用新的噩梦层级系统（在nextLevel中通过MapSystem.generateLevel传递）
        // @deprecated 保留旧的difficultyMultiplier用于向后兼容，但新系统不使用它
        
        // 重置商店价格（仅在新游戏时调用，确保价格递增机制正常工作）
        if (this.ui && this.ui.resetShopPrices) {
          this.ui.resetShopPrices();
        }
        
        // Reset game state
        this.killCount = 0;
        this.totalXpGained = 0;
        // FIX: 重置伤害统计
        this.totalDamageDealt = 0;
        
        // 成就系统：重置会话数据
        if (this.achievementSystem) {
          this.achievementSystem.onGameStart();
        }
        
            // FIX: 调用nextLevel生成第1层（nextLevel会将floor从0变为1）
        this.nextLevel();
      } else {
        // Loaded game - just regenerate current level without incrementing floor
        // 使用新的噩梦层级系统（确保有默认值1）
        const ascensionLevel = this.selectedAscensionLevel ?? 1;
        this.map.generateLevel(this.player.stats.floor, ascensionLevel);
        for (let y = 0; y < this.map.height; y++) {
          for (let x = 0; x < this.map.width; x++) {
            if (this.map.grid[y][x] === TILE.STAIRS_UP) {
              this.player.x = x;
              this.player.y = y;
              this.player.visualX = x * TILE_SIZE;
              this.player.visualY = y * TILE_SIZE;
              this.player.destX = this.player.visualX;
              this.player.destY = this.player.visualY;
            }
          }
        }
        
        // FIX: 读档时恢复关键石效果（不叠加属性，避免重复叠加）
        this.applyTalentBonuses(true);
      }
      
      // Always reset these on game start
      this.startTime = Date.now();
      this.isPaused = false;
      this.inputStack = [];
      this.gameStarted = true;
      
      // 每日挑战模式：隐藏保存/读取按钮
      this.updateSaveLoadButtonsVisibility();
      
      // Update UI
      this.ui.updateStats(this.player);
      this.ui.updateEquipmentSockets(this.player);
      
      // Initialize skill bar
      this.ui.initSkillBar(this.player);
      
      // Diagnostic: Check skill bar visibility
      setTimeout(() => {
        const skillBar = document.getElementById('skill-bar');
        console.log('SKILL BAR DIAGNOSTIC:');
        console.log('  Element found:', !!skillBar);
        if (skillBar) {
          const style = window.getComputedStyle(skillBar);
          console.log('  Display:', style.display);
          console.log('  Visibility:', style.visibility);
          console.log('  Opacity:', style.opacity);
          console.log('  Z-index:', style.zIndex);
          console.log('  Position:', style.position);
          console.log('  Bottom:', style.bottom);
          console.log('  Left:', style.left);
          console.log('  Width:', style.width);
          console.log('  Height:', style.height);
          console.log('  Children count:', skillBar.children.length);
          
          // Check parent
          const parent = skillBar.parentElement;
          console.log('  Parent ID:', parent?.id);
          const parentStyle = window.getComputedStyle(parent);
          console.log('  Parent overflow:', parentStyle.overflow);
          console.log('  Parent display:', parentStyle.display);
          console.log('  Parent z-index:', parentStyle.zIndex);
        }
      }, 100);
      
      // 等待游玩界面的所有资源加载完毕
      await this.waitForGameplayScreenResourcesLoaded();
      
      // 触发资源加载完成事件，通知 LoadingOverlayManager
      window.dispatchEvent(new CustomEvent('gameplayResourcesLoaded'));
      
      // 更新进度条到 100%
      this.loadingUI.setProgress(100, 'gameplay');
      
      // ✅ 触发加载完成事件，通知 LoadingOverlayManager UI 已渲染完成
      window.dispatchEvent(new CustomEvent('gameplayLoadingComplete'));
      
      // NOW show the main UI with smooth transition using transitionToScene
      // This ensures all DOM construction is complete before displaying
      await this.loadingUI.transitionToScene('main-ui', 'gameplay');
      
      // CRITICAL FIX: 确保主UI可见（双重保险）
      // 注意：mainUI 变量已在前面声明过，这里使用新变量名
      const mainUIFinal = document.getElementById('main-ui');
      if (mainUIFinal) {
        // 清除可能残留的内联样式
        mainUIFinal.style.opacity = '';
        // 确保主UI可见
        mainUIFinal.style.display = 'flex';
        mainUIFinal.classList.add('scene-fade-in', 'scene-active');
        console.log('[StartGame] 主UI已确保可见');
      }
      
      // 确保 LoadingOverlay 彻底隐藏 (双重保险)
      const loadingOverlay = document.getElementById(this.loadingUI.overlays.gameplay.id);
      if (loadingOverlay) {
        loadingOverlay.style.display = 'none';
        loadingOverlay.classList.add('hidden');
      }
      
      console.log('[StartGame] Game started successfully!');
    } catch (e) {
      console.error('[StartGame] Error starting game:', e);
      this.loadingUI.hideOverlay('gameplay');
      
      // FIX: 错误恢复：尝试强制显示主界面，避免黑屏
      const mainUI = document.getElementById('main-ui');
      if (mainUI) {
        mainUI.style.display = 'flex';
        mainUI.style.opacity = '1';
        mainUI.classList.remove('scene-fade-in');
        console.log('[StartGame] 错误恢复：强制显示主UI');
      }
    }
  }

  /**
   * 启动每日挑战模式
   * 基于 UTC 日期生成每日挑战配置，应用词缀和初始遗物
   */
  async startDailyChallenge() {
    console.log('[DailyChallenge] Starting daily challenge...');
    
    // 1. 强制设置每日挑战难度
    this.selectedAscensionLevel = 1;
    this.isDailyMode = true; // 尽早设置标志位
    console.log('[DailyChallenge] 强制设置难度层级: 1 (每日挑战标准难度)');
    
      // 2. 接管加载界面 (使用 gameplay 类型)
      // 注意：如果之前 global 层还在，这里会平滑切换到 gameplay 层
      this.loadingUI.showOverlay('gameplay', '加载每日挑战资源...');
      
      // 2. 稍微等待遮罩层出现，然后幕后隐藏旧界面
      await new Promise(r => setTimeout(r, 100));
      this.hideMainMenu();
      const charSelect = document.getElementById('char-select-screen');
      if(charSelect) charSelect.style.display = 'none';
      
      // ✅ 触发游戏加载开始事件
      window.dispatchEvent(new CustomEvent('gameplayLoadingStart'));
      
      try {
        // 加载游戏资源（与 startGame 相同）
        await this.loader.loadGameplayAssets(GAMEPLAY_ASSETS, (percent, loaded, total) => {
          const imageProgress = Math.round((percent * 0.7));
          this.loadingUI.setProgress(imageProgress, 'gameplay');
        });
        
        // 获取每日挑战配置
        const dailyConfig = DailyChallengeSystem.getDailyConfig();
        console.log('[DailyChallenge] 每日挑战配置:', dailyConfig);
        
        // CRITICAL FIX: 保存挑战开始时的日期（YYYY-MM-DD 格式）
        // 确保即使跨日完成挑战，提交成绩时也使用开始时的日期，防止数据污染
        const now = new Date();
        const year = now.getUTCFullYear();
        const month = String(now.getUTCMonth() + 1).padStart(2, '0');
        const day = String(now.getUTCDate()).padStart(2, '0');
        this.dailyChallengeDate = `${year}-${month}-${day}`;
        console.log('[DailyChallenge] 保存挑战日期:', this.dailyChallengeDate);
        
        // 初始化 RNG（用于确定性生成）
        this.rng = dailyConfig.rng;
        
        // 强制设置玩家角色为今日限定角色
        this.selectedCharId = dailyConfig.character;
        const charData = CHARACTERS[dailyConfig.character];
        if (!charData) {
          console.error(`[DailyChallenge] 角色 ${dailyConfig.character} 不存在`);
          return;
        }
      
      // 3. 准备主UI
      const mainUI = document.getElementById('main-ui');
      if (mainUI) {
        mainUI.classList.remove('loaded');
        // FIX: 使用 opacity: 0 隐藏，但必须强制 display: flex !important
        // 否则 CSS 中的 display: none !important 会阻止元素渲染，导致资源加载挂起
        mainUI.style.opacity = '0';
        mainUI.style.setProperty('display', 'flex', 'important'); 
      }
      
      // 创建玩家实例（使用限定角色）
      this.player = new Player(this.map, this.loader, charData);
      
      // 重置玩家状态
      this.player.stats.xp = 0;
      this.player.stats.gold = 0;
      this.player.stats.keys = 1;
      this.player.stats.rage = 0;
      this.player.stats.floor = 0; // nextLevel 会将其变为 1
      this.player.equipment = { WEAPON: null, ARMOR: null, HELM: null, BOOTS: null, RING: null, AMULET: null, ACCESSORY: null };
      this.player.inventory = new Array(20).fill(null);
      
      // 应用天赋树加成（如果有）
      this.applyTalentBonuses();
      
      // 应用每日词缀效果
      dailyConfig.modifiers.forEach(modifier => {
        if (modifier.apply) {
          modifier.apply(this.player, this);
          console.log(`[DailyChallenge] 应用词缀: ${modifier.name} (${modifier.description})`);
        }
      });
      
      // 应用初始遗物（符文）
      // FIX: 复用 RoguelikeSystem.applyRune 逻辑，避免代码重复和数值不一致
      if (dailyConfig.startingRune && this.roguelike) {
        // 使用 RoguelikeSystem 的 generateRuneOptions 逻辑来计算符文数值
        // 这样可以确保初始符文的数值计算与正常符文选择一致
        const floor = 1;
        const multiplier = RUNE_RARITY_MULTIPLIERS[dailyConfig.startingRune.rarity] || 1.0;
        let value = 1;
        
        // 根据符文类型和稀有度计算数值（与 generateRuneOptions 保持一致）
        if (dailyConfig.startingRune.type === 'STAT') {
          if (dailyConfig.startingRune.id.includes('might') || dailyConfig.startingRune.id.includes('brutal')) {
            value = Math.floor(1 * multiplier * (1 + floor * 0.1));
          } else if (dailyConfig.startingRune.id.includes('iron') || dailyConfig.startingRune.id.includes('fortress')) {
            value = Math.floor(1 * multiplier * (1 + floor * 0.1));
          } else if (dailyConfig.startingRune.id.includes('arcana') || dailyConfig.startingRune.id.includes('arcane')) {
            value = Math.floor(1 * multiplier * (1 + floor * 0.1));
          } else if (dailyConfig.startingRune.id.includes('ward') || dailyConfig.startingRune.id.includes('barrier')) {
            value = Math.floor(1 * multiplier * (1 + floor * 0.1));
          } else if (dailyConfig.startingRune.id.includes('vitality') || dailyConfig.startingRune.id.includes('life')) {
            value = Math.floor(10 * multiplier * (1 + floor * 0.1));
          } else if (dailyConfig.startingRune.id.includes('precision') || dailyConfig.startingRune.id.includes('deadly') || dailyConfig.startingRune.id.includes('assassin')) {
            value = Math.floor(5 * multiplier);
          } else if (dailyConfig.startingRune.id.includes('agility') || dailyConfig.startingRune.id.includes('phantom')) {
            value = Math.floor(5 * multiplier);
          }
        }
        
        // FIX: 复用 RoguelikeSystem.applyRune 方法，确保逻辑一致
        const runeOption = {
          rune: dailyConfig.startingRune,
          value: value,
          name: dailyConfig.startingRune.name,
          description: dailyConfig.startingRune.description || '',
          rarity: dailyConfig.startingRune.rarity,
          type: dailyConfig.startingRune.type
        };
        
        this.roguelike.applyRune(runeOption);
        
        console.log(`[DailyChallenge] 应用初始遗物: ${dailyConfig.startingRune.nameZh || dailyConfig.startingRune.name}`);
      }
      
      // 重置游戏状态
      this.killCount = 0;
      this.totalXpGained = 0;
      // FIX: 重置伤害统计
      this.totalDamageDealt = 0;
      this.startTime = Date.now();
      this.isPaused = false;
      this.inputStack = [];
      this.gameStarted = true;
      
      // 重置商店价格
      if (this.ui && this.ui.resetShopPrices) {
        this.ui.resetShopPrices();
      }
      
      // 成就系统：重置会话数据
      if (this.achievementSystem) {
        this.achievementSystem.onGameStart();
      }
      
      // 生成第一层（使用 RNG）
      this.nextLevel();
      
      // 更新UI
      this.ui.updateStats(this.player);
      this.ui.updateEquipmentSockets(this.player);
      this.ui.initSkillBar(this.player);
      
      // 每日挑战模式：隐藏保存/读取按钮
      this.updateSaveLoadButtonsVisibility();
      
      // 显示每日挑战信息
      if (this.ui && this.ui.logMessage) {
        const charName = charData.name;
        const modifiersText = dailyConfig.modifiers.map(m => m.name).join('、');
        this.ui.logMessage(`每日挑战：${charName} | 词缀：${modifiersText}`, 'info');
      }
      
      // 4. 等待资源加载 (FIX: 添加超时保护)
      // 创建一个超时 Promise
      const timeoutPromise = new Promise(resolve => setTimeout(resolve, 5000));
      // 竞态等待：要么资源加载完成，要么 5秒超时，防止永久黑屏
      await Promise.race([
        this.waitForGameplayScreenResourcesLoaded(),
        timeoutPromise
      ]);

      // 触发资源加载完成事件
      window.dispatchEvent(new CustomEvent('gameplayResourcesLoaded'));
      
      // 更新进度到 100%
      this.loadingUI.setProgress(100, 'gameplay');
      
      // 触发加载完成事件
      window.dispatchEvent(new CustomEvent('gameplayLoadingComplete'));
      
      // 5. 显示主UI (transitionToScene 会处理 opacity 动画)
      await this.loadingUI.transitionToScene('main-ui', 'gameplay');
      
      // CRITICAL FIX: 确保主UI可见（双重保险）
      // 注意：mainUI 变量已在前面声明过，这里直接使用
      const mainUIFinal = document.getElementById('main-ui');
      if (mainUIFinal) {
        // 清除可能残留的内联 opacity 样式
        mainUIFinal.style.opacity = '';
        // 确保主UI可见
        mainUIFinal.style.display = 'flex';
        mainUIFinal.classList.add('scene-fade-in', 'scene-active');
        console.log('[DailyChallenge] 主UI已确保可见');
      }
      
      // 确保 LoadingOverlay 彻底隐藏
      const loadingOverlay = document.getElementById(this.loadingUI.overlays.gameplay.id);
      if (loadingOverlay) {
        loadingOverlay.style.display = 'none';
        loadingOverlay.classList.add('hidden');
      }
      
      console.log('[DailyChallenge] 每日挑战已启动');
    } catch (error) {
      console.error('[DailyChallenge] 启动失败:', error);
      this.loadingUI.hideOverlay('gameplay');
      
      // FIX: 错误恢复：尝试强制显示主界面，避免黑屏
      const mainUI = document.getElementById('main-ui');
      if (mainUI) {
        mainUI.style.display = 'flex';
        mainUI.style.opacity = '1';
        mainUI.classList.remove('scene-fade-in'); 
      }
      alert('每日挑战启动失败: ' + error.message);
    }
  }

  /**
   * 等待游玩界面的所有资源加载完毕
   */
  async waitForGameplayScreenResourcesLoaded() {
    return new Promise((resolve) => {
      const mainUI = document.getElementById('main-ui');
      if (!mainUI) {
        console.warn('[waitForGameplayScreenResourcesLoaded] main-ui 元素不存在');
        resolve();
        return;
      }

      // FIX: 等待一小段时间确保DOM完全渲染
      // 因为在startDailyChallenge中，主UI可能刚刚被创建或修改
      setTimeout(() => {
        // 收集所有需要加载的资源
        const images = mainUI.querySelectorAll('img');
        const elementsWithBg = mainUI.querySelectorAll('[style*="background-image"], [style*="backgroundImage"]');
        
        let totalResources = images.length + elementsWithBg.length;
        let loadedResources = 0;

        console.log(`[waitForGameplayScreenResourcesLoaded] 找到 ${totalResources} 个资源需要加载 (${images.length} 个图片, ${elementsWithBg.length} 个背景)`);

        if (totalResources === 0) {
          console.log('[waitForGameplayScreenResourcesLoaded] 没有资源需要加载，立即完成');
          resolve();
          return;
        }

        // FIX: 添加超时保护，防止某些资源永远不触发load/error事件
        const timeoutId = setTimeout(() => {
          console.warn(`[waitForGameplayScreenResourcesLoaded] 超时：已等待 3 秒，强制完成 (${loadedResources}/${totalResources})`);
          resolve();
        }, 3000);

        const checkComplete = () => {
          loadedResources++;
          const percent = Math.round((loadedResources / totalResources) * 100);
          
          console.log(`[waitForGameplayScreenResourcesLoaded] 资源加载进度: ${loadedResources}/${totalResources} (${percent}%)`);
          
          // 分发进度更新事件，通知 LoadingOverlayManager
          window.dispatchEvent(new CustomEvent('gameplayLoadingProgress', {
            detail: { progress: percent }
          }));
          
          this.loadingUI.setProgress(percent, 'gameplay');
          
          if (loadedResources >= totalResources) {
            clearTimeout(timeoutId);
            console.log('[waitForGameplayScreenResourcesLoaded] 所有资源加载完成');
            resolve();
          }
        };

        // 监听 <img> 标签
        images.forEach((img, index) => {
          if (img.complete && img.naturalHeight !== 0) {
            checkComplete();
          } else {
            img.addEventListener('load', () => {
              console.log(`[waitForGameplayScreenResourcesLoaded] 图片 ${index + 1} 加载完成: ${img.src}`);
              checkComplete();
            }, { once: true });
            img.addEventListener('error', () => {
              console.warn(`[waitForGameplayScreenResourcesLoaded] 图片 ${index + 1} 加载失败: ${img.src}`);
              checkComplete();
            }, { once: true });
          }
        });

        // 监听 CSS background-image
        elementsWithBg.forEach((el, index) => {
          const bgImage = window.getComputedStyle(el).backgroundImage;
          if (bgImage && bgImage !== 'none') {
            const urlMatch = bgImage.match(/url\(['"]?([^'"()]+)['"]?\)/);
            if (urlMatch) {
              const imageUrl = urlMatch[1];
              const img = new Image();
              img.onload = () => {
                console.log(`[waitForGameplayScreenResourcesLoaded] 背景图片 ${index + 1} 加载完成: ${imageUrl}`);
                checkComplete();
              };
              img.onerror = () => {
                console.warn(`[waitForGameplayScreenResourcesLoaded] 背景图片 ${index + 1} 加载失败: ${imageUrl}`);
                checkComplete();
              };
              img.src = imageUrl;
            } else {
              checkComplete();
            }
          } else {
            checkComplete();
          }
        });
      }, 100); // 等待100ms确保DOM渲染完成
    });
  }

  // END GAME
  endGame(isDeath = true) {
    try {
      // 成就系统：检测死亡时的金币
      // 注意：不要在这里调用 check('onLevelEnd')，死亡不应触发通关层级的成就
      if (this.achievementSystem && isDeath && this.player) {
        this.achievementSystem.check('onDeath', { gold: this.player.stats.gold });
      }
      
      // FIX: 记录死亡统计到元进度系统
      if (this.metaSaveSystem && isDeath) {
        this.metaSaveSystem.onGameEnd({
          floor: this.player?.stats?.floor ?? 1,
          totalKills: this.killCount ?? 0
        });
      }
      
      // 计算游戏数据
      const floor = this.player?.stats?.floor ?? 1;
      const gold = this.player?.stats?.gold ?? 0;
      const keys = this.player?.stats?.keys ?? 0;
      const kills = this.killCount ?? 0;
      const totalXp = this.totalXpGained ?? 0;
      const elapsed = Math.max(0, (Date.now() - (this.startTime || Date.now())));
      const timeSeconds = Math.floor(elapsed / 1000);
      const mm = Math.floor(elapsed / 60000);
      const ss = Math.floor((elapsed % 60000) / 1000);
      const timeStr = `${String(mm).padStart(2,'0')}:${String(ss).padStart(2,'0')}`;
      
      // 上传成绩到排行榜（异步，不阻塞界面）
      this.submitScoreToLeaderboard(floor, kills, keys, timeSeconds);
      
      this.isPaused = true; this.inputStack = [];
      const overlay = document.getElementById('leaderboard-overlay'); if (!overlay) return;
      const goTitle = document.getElementById('go-title'); if (goTitle) { if (isDeath) { goTitle.innerText = 'YOU DIED'; goTitle.style.color = '#e74c3c'; } else { goTitle.innerText = 'RETIRED'; goTitle.style.color = '#f1c40f'; } }
      const setText = (id, val) => { const el = document.getElementById(id); if (el) el.innerText = val; };
      setText('go-time', timeStr); setText('go-floor', floor); setText('go-kills', kills); setText('go-xp', totalXp); setText('go-gold', gold);
      
      // 使用平滑渐变显示结算页面（从透明到不透明，0.4s）
      overlay.style.setProperty('display', 'flex', 'important');
      overlay.style.opacity = '0';
      // 强制重排以应用初始状态
      void overlay.offsetWidth;
      // 使用 requestAnimationFrame 确保平滑过渡
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          overlay.style.transition = 'opacity 0.4s ease-out';
          overlay.style.opacity = '1';
        });
      });
      
      // Bind retry button if not already bound
      const retryBtn = document.getElementById('btn-retry-game');
      if (retryBtn && !retryBtn.hasAttribute('data-retry-bound')) {
        retryBtn.setAttribute('data-retry-bound', 'true');
        retryBtn.addEventListener('click', () => {
          this.restartGame();
        });
      }
    } catch (e) { console.error('endGame error', e); }
  }

  /**
   * 提交成绩到排行榜
   */
  async submitScoreToLeaderboard(floor, kills, keys, timeSeconds) {
    try {
      // 收集装备信息
      const equipmentInfo = {};
      if (this.player && this.player.equipment) {
        Object.keys(this.player.equipment).forEach(slot => {
          const itemId = this.player.equipment[slot];
          if (itemId && EQUIPMENT_DB[itemId]) {
            equipmentInfo[slot] = EQUIPMENT_DB[itemId].nameZh || EQUIPMENT_DB[itemId].name;
          }
        });
      }

      // 收集最终属性
      const finalStats = this.player?.stats ? {
        hp: this.player.stats.hp,
        maxHp: this.player.stats.maxHp,
        p_atk: this.player.stats.p_atk,
        m_atk: this.player.stats.m_atk,
        p_def: this.player.stats.p_def,
        m_def: this.player.stats.m_def,
        gold: this.player.stats.gold
      } : {};

      // 如果是每日挑战模式，同时提交每日成绩
      if (this.isDailyMode) {
        try {
          // CRITICAL FIX: 使用挑战开始时的日期，而不是当前日期
          // 防止跨日完成挑战时，成绩被提交到错误的日期（数据污染）
          let dateStr;
          if (this.dailyChallengeDate) {
            dateStr = this.dailyChallengeDate;
            console.log('[SubmitScore] 使用挑战开始时的日期:', dateStr);
          } else {
            // 防御性回退：如果没有保存日期，使用当前日期（不应该发生）
            const now = new Date();
            const year = now.getUTCFullYear();
            const month = String(now.getUTCMonth() + 1).padStart(2, '0');
            const day = String(now.getUTCDate()).padStart(2, '0');
            dateStr = `${year}-${month}-${day}`;
            console.warn('[SubmitScore] 警告：未找到挑战日期，使用当前日期:', dateStr);
          }

          // 计算每日挑战分数（与普通排行榜使用相同的公式）
          // FIX: 使用实际累加的伤害值，如果没有则回退到估算值
          const totalDamage = this.totalDamageDealt || (kills * 100);
          const score = Math.floor(
            floor * 50000 +
            keys * 5000 +
            totalDamage * 0.1 -
            timeSeconds * 5
          );
          const finalScore = Math.max(0, score);

          // 构建详细信息
          const details = {
            floor: floor,
            kills: kills,
            keys: keys,
            damage: totalDamage,
            timeSeconds: timeSeconds,
            equipment: equipmentInfo,
            stats: finalStats,
            character: this.selectedCharId || 'unknown'
          };

          // 提交每日成绩
          const dailyResult = await supabaseService.submitDailyScore({
            score: finalScore,
            details: details,
            dateStr: dateStr
          });

          if (dailyResult.success) {
            console.log('[Game] 每日挑战成绩提交成功:', dailyResult.message);
            if (dailyResult.updated && this.ui && this.ui.logMessage) {
              this.ui.logMessage(`每日挑战成绩已${dailyResult.updated ? '更新' : '保存'}！`, 'success');
            }
          } else {
            console.warn('[Game] 每日挑战成绩提交失败:', dailyResult.message);
          }
        } catch (dailyError) {
          console.error('[Game] 提交每日挑战成绩异常:', dailyError);
        }
      }

      // FIX: 使用实际累加的伤害值，如果没有则回退到估算值
      const totalDamage = this.totalDamageDealt || (kills * 100);

      // 将噩梦层级（1-25）映射为字符串难度（用于数据库兼容性）
      const difficultyString = getDifficultyString(this.selectedAscensionLevel || 1);
      
      const scoreData = {
        floor: floor,
        level: this.player?.stats?.lvl || 1, // 玩家等级（从 lvl 字段获取）
        kills: kills,
        keys: keys,
        damage: totalDamage,
        timeSeconds: timeSeconds,
        difficulty: difficultyString, // 使用映射后的字符串难度
        character: this.selectedCharId || 'WARRIOR',
        details: {
          equipment: equipmentInfo,
          stats: finalStats,
          ascensionLevel: this.selectedAscensionLevel || 1 // 同时保存数字层级（用于未来扩展）
        }
      };

      const result = await supabaseService.submitRun(scoreData);
      
      if (result.success) {
        console.log('[Leaderboard] 成绩上传成功，分数:', result.score);
        if (this.ui) {
          this.ui.logMessage(`成绩已上传！分数: ${result.score}`, 'gain');
        }
      } else {
        console.warn('[Leaderboard] 成绩上传失败:', result.message);
      }
    } catch (error) {
      console.error('[Leaderboard] 上传成绩时出错:', error);
    }
  }

  // RESTART GAME (Retry functionality)
  async restartGame() {
    console.log('[RestartGame] Restarting game...');
    
    // CRITICAL FIX: 每日挑战模式重试逻辑
    // 如果是每日挑战模式，需要重新初始化 RNG、重新应用词缀，而不是回退到普通模式
    const wasDailyMode = this.isDailyMode;
    
    // v2.1: 重置符文刷新费用
    if (this.roguelike && this.roguelike.resetRerollCost) {
      this.roguelike.resetRerollCost();
    }
    
    // v2.1: 重置符文刷新费用
    if (this.roguelike && this.roguelike.resetRerollCost) {
      this.roguelike.resetRerollCost();
    }
    
    // ⚠️ 注意：不要在这里调用 check('onLevelEnd')，重启游戏不应触发通关层级的成就
    
    // FIX: 重载元进度数据，防止内存中的数据与存储不一致
    if (this.metaSaveSystem) {
      this.metaSaveSystem.data = this.metaSaveSystem.loadMetaData();
      console.log('[RestartGame] 元进度已重载:', this.metaSaveSystem.data);
    }
    
    // 淡出游戏结束界面（如果可见）
    await this.loadingUI.fadeSceneOut('leaderboard-overlay');
    
    // Reset all game state
    this.killCount = 0;
    this.totalXpGained = 0;
    // FIX: 重置伤害统计
    this.totalDamageDealt = 0;
    this.startTime = Date.now();
    this.isPaused = false;
    this.inputStack = [];
    
    // Clear object pools to prevent memory leaks
    if (this.floatingTextPool) {
      this.floatingTexts.forEach(ft => this.floatingTextPool.release(ft));
      this.floatingTexts = [];
    }
    if (this.fogParticlePool && this.map) {
      this.map.fogParticles.forEach(particle => this.fogParticlePool.release(particle));
      this.map.fogParticles = [];
    }
    
    // CRITICAL FIX: 每日挑战模式重试时，重新初始化 RNG 和配置
    if (wasDailyMode) {
      console.log('[RestartGame] 每日挑战模式重试，重新初始化配置...');
      
      // CRITICAL FIX: 强制设置每日挑战难度为层级 1，确保重试时难度一致
      this.selectedAscensionLevel = 1;
      console.log('[RestartGame] 每日挑战重试：强制设置难度层级: 1');
      
      // 重新获取每日挑战配置（使用今日种子）
      const dailyConfig = DailyChallengeSystem.getDailyConfig();
      
      // CRITICAL FIX: 更新挑战日期（重试时使用新的日期）
      const now = new Date();
      const year = now.getUTCFullYear();
      const month = String(now.getUTCMonth() + 1).padStart(2, '0');
      const day = String(now.getUTCDate()).padStart(2, '0');
      this.dailyChallengeDate = `${year}-${month}-${day}`;
      console.log('[RestartGame] 每日挑战重试：更新挑战日期:', this.dailyChallengeDate);
      
      // 重新初始化 RNG（使用今日种子）
      this.rng = dailyConfig.rng;
      
      // 保持 isDailyMode 标志
      this.isDailyMode = true;
      
      // 重新设置角色为今日限定角色
      this.selectedCharId = dailyConfig.character;
      const charData = CHARACTERS[dailyConfig.character];
      if (!charData) {
        console.error(`[RestartGame] 角色 ${dailyConfig.character} 不存在`);
        return;
      }
      
      // 重置每日词缀倍数
      this.dailyShopPriceMultiplier = 1.0;
      this.dailyEliteSpawnMultiplier = 1.0;
      
      // 创建玩家实例（使用限定角色）
      this.player = new Player(this.map, this.loader, charData);
      
      // 重置玩家状态
      this.player.stats.floor = 0; // nextLevel 会将其变为 1
      this.player.stats.xp = 0;
      this.player.stats.gold = 0;
      this.player.stats.keys = 1;
      this.player.stats.rage = 0;
      this.player.equipment = { WEAPON: null, ARMOR: null, HELM: null, BOOTS: null, RING: null, AMULET: null, ACCESSORY: null };
      this.player.inventory = new Array(20).fill(null);
      
      // 清理遗物状态
      if (this.player.relics) {
        this.player.relics.clear();
      }
      if (this.ui && this.ui.updateRelicBar) {
        this.ui.updateRelicBar(new Map()); // 清空遗物栏
      }
      
      // 应用天赋树加成（如果有）
      this.applyTalentBonuses();
      
      // 重新应用每日词缀效果
      dailyConfig.modifiers.forEach(modifier => {
        if (modifier.apply) {
          modifier.apply(this.player, this);
          console.log(`[RestartGame] 重新应用词缀: ${modifier.name} (${modifier.description})`);
        }
      });
      
      // 重新应用初始遗物（符文）
      // FIX: 复用 RoguelikeSystem.applyRune 逻辑，避免代码重复和数值不一致
      if (dailyConfig.startingRune && this.roguelike) {
        // 使用 RoguelikeSystem 的 generateRuneOptions 逻辑来计算符文数值
        const floor = 1;
        const multiplier = RUNE_RARITY_MULTIPLIERS[dailyConfig.startingRune.rarity] || 1.0;
        let value = 1;
        
        // 根据符文类型和稀有度计算数值（与 generateRuneOptions 保持一致）
        if (dailyConfig.startingRune.type === 'STAT') {
          if (dailyConfig.startingRune.id.includes('might') || dailyConfig.startingRune.id.includes('brutal')) {
            value = Math.floor(1 * multiplier * (1 + floor * 0.1));
          } else if (dailyConfig.startingRune.id.includes('iron') || dailyConfig.startingRune.id.includes('fortress')) {
            value = Math.floor(1 * multiplier * (1 + floor * 0.1));
          } else if (dailyConfig.startingRune.id.includes('arcana') || dailyConfig.startingRune.id.includes('arcane')) {
            value = Math.floor(1 * multiplier * (1 + floor * 0.1));
          } else if (dailyConfig.startingRune.id.includes('ward') || dailyConfig.startingRune.id.includes('barrier')) {
            value = Math.floor(1 * multiplier * (1 + floor * 0.1));
          } else if (dailyConfig.startingRune.id.includes('vitality') || dailyConfig.startingRune.id.includes('life')) {
            value = Math.floor(10 * multiplier * (1 + floor * 0.1));
          } else if (dailyConfig.startingRune.id.includes('precision') || dailyConfig.startingRune.id.includes('deadly') || dailyConfig.startingRune.id.includes('assassin')) {
            value = Math.floor(5 * multiplier);
          } else if (dailyConfig.startingRune.id.includes('agility') || dailyConfig.startingRune.id.includes('phantom')) {
            value = Math.floor(5 * multiplier);
          }
        }
        
        // FIX: 复用 RoguelikeSystem.applyRune 方法，确保逻辑一致
        const runeOption = {
          rune: dailyConfig.startingRune,
          value: value,
          name: dailyConfig.startingRune.name,
          description: dailyConfig.startingRune.description || '',
          rarity: dailyConfig.startingRune.rarity,
          type: dailyConfig.startingRune.type
        };
        
        this.roguelike.applyRune(runeOption);
        
        console.log(`[RestartGame] 重新应用初始遗物: ${dailyConfig.startingRune.nameZh || dailyConfig.startingRune.name}`);
      }
      
      // 重置商店价格
      if (this.ui && this.ui.resetShopPrices) {
        this.ui.resetShopPrices();
      }
      
      // 生成第一层（使用 RNG）
      this.nextLevel();
      
      // 显示每日挑战信息
      if (this.ui && this.ui.logMessage) {
        const modifiersText = dailyConfig.modifiers.map(m => m.name).join('、');
        this.ui.logMessage(`每日挑战重试：${charData.name} | 词缀：${modifiersText}`, 'info');
      }
    } else {
      // 普通模式的重试逻辑（原有逻辑）
      // FIX: 显式重置每日挑战状态（防御性编程，防止状态污染）
      this.isDailyMode = false;
      this.rng = null;
      this.dailyChallengeDate = null; // FIX: 清理挑战日期
      this.dailyShopPriceMultiplier = 1.0;
      this.dailyEliteSpawnMultiplier = 1.0;
      
      // Reset player completely
      const charData = CHARACTERS[this.selectedCharId];
      this.player = new Player(this.map, this.loader, charData);
      this.player.stats.floor = 1;
      this.player.stats.xp = 0;
      this.player.stats.gold = 0;
      this.player.stats.keys = 1;
      this.player.stats.rage = 0;
      this.player.equipment = { WEAPON: null, ARMOR: null, HELM: null, BOOTS: null, RING: null, AMULET: null, ACCESSORY: null };
      this.player.inventory = new Array(20).fill(null);
      
      // 清理遗物状态和UI
      if (this.player.relics) {
        this.player.relics.clear();
      }
      if (this.ui && this.ui.updateRelicBar) {
        this.ui.updateRelicBar(new Map()); // 清空遗物栏
      }
      
      // Apply difficulty multiplier
      const diffKey = this.selectedDiff.toUpperCase();
      const diffData = DIFFICULTY_LEVELS[diffKey];
      if (diffData) {
        this.difficultyMultiplier = diffData.multiplier;
        this.map.difficultyMultiplier = this.difficultyMultiplier;
      }
      
      // Reset map and generate floor 1
      this.map.difficultyMultiplier = this.difficultyMultiplier;
      this.nextLevel();
    }
    
    // Clear log panel
    if (this.ui && this.ui.clearLog) {
      this.ui.clearLog();
    }
    
    // Update UI
    this.ui.updateStats(this.player);
    this.ui.updateEquipmentSockets(this.player);
    this.ui.initSkillBar(this.player);
    
    // 每日挑战模式：更新保存/读取按钮可见性
    this.updateSaveLoadButtonsVisibility();
    
    // Resume game
    this.gameStarted = true;
    
    console.log('[RestartGame] Game restarted successfully!');
  }

  /**
   * 淡出并重新加载页面（用于游戏结束界面的平滑过渡）
   * @param {string} targetUrl - 目标 URL（如 'index.html' 或使用 location.reload()）
   */
  fadeOutAndReload(targetUrl = null) {
    console.log('[Transition] Fading out for reload/redirect...');
    
    // 给 body 添加淡出类
    document.body.classList.add('page-exit-active');
    
    // 等待 500ms（匹配 CSS 过渡时间），然后再执行跳转或重载
    setTimeout(() => {
      if (targetUrl) {
        window.location.href = targetUrl;
      } else {
        location.reload();
      }
    }, 500);
  }

  // SAVE SYSTEM
  saveGame(silent = false) {
    // 每日挑战模式：禁用手动保存
    if (this.isDailyMode) {
      if (!silent && this.ui) {
        this.ui.logMessage('每日挑战模式无法手动存档', 'info');
      }
      return false;
    }

    const success = SaveSystem.save(this);
    if (success && !silent) {
      this.ui.logMessage('游戏已保存！', 'gain');
    } else if (!success && !silent) {
      this.ui.logMessage('保存失败！', 'info');
    }
  }

  loadGame() {
    // FIX: 清理每日挑战状态（防御性编程，确保读档时状态干净）
    this.isDailyMode = false;
    this.rng = null;
    this.dailyChallengeDate = null; // FIX: 清理挑战日期
    this.dailyShopPriceMultiplier = 1.0;
    this.dailyEliteSpawnMultiplier = 1.0;
    
    // 每日挑战模式：禁用手动读取（虽然上面已清理，但保留检查作为防御）
    if (this.isDailyMode) {
      if (this.ui) {
        this.ui.logMessage('每日挑战模式无法手动读档', 'info');
      }
      return;
    }

    const saveData = SaveSystem.load();
    if (!saveData) {
      this.ui.logMessage('没有保存的数据！', 'info');
      return;
    }

    const success = SaveSystem.restore(this, saveData);
    if (success) {
      this.ui.logMessage('游戏已读取！', 'gain');
    } else {
      this.ui.logMessage('读取失败！', 'info');
    }
  }
}

window.addEventListener('load', async () => {
  try {
    const game = new Game();
    window.game = game; // Ensure global for HTML inline onclick
    await game.init();
    
    // 检测当前页面是否为 game.html（游戏页面）
    const isGamePage = window.location.pathname.endsWith('game.html') || 
                       window.location.href.includes('game.html');
    
    if (isGamePage) {
      // 在 game.html 页面上，直接启动游戏
      console.log('[Init] Detected game.html page, starting game directly...');
      
      // 检查游戏模式（每日挑战或普通模式）
      const gameMode = sessionStorage.getItem('gameMode') || 'normal';
      console.log(`[Init] Game mode: ${gameMode}`);
      
      if (gameMode === 'daily') {
        // 每日挑战模式：直接启动每日挑战
        console.log('[Init] Starting daily challenge mode...');
        
        // 标记游戏已初始化完成
        window.dispatchEvent(new CustomEvent('gameInitialized'));
        
        // FIX: 直接启动，无需延迟，因为 init() 已保证核心对象就绪
        game.startDailyChallenge();
      } else {
        // 普通模式：恢复设置并启动普通游戏
        // FIX: 统一的 sessionStorage 恢复函数
        const restoreSessionData = () => {
          // 恢复角色和难度设置
          const selectedCharId = sessionStorage.getItem('selectedCharId') || 'WARRIOR';
          const selectedDiff = sessionStorage.getItem('selectedDiff') || 'normal'; // @deprecated 向后兼容
          
          // FIX: 安全的 ascensionLevel 解析（防止 NaN）
          const parseAscensionLevel = (value) => {
            const parsed = parseInt(value, 10);
            if (isNaN(parsed)) {
              console.warn(`Invalid ascensionLevel value: ${value}, using default 1`);
              return 1;
            }
            return Math.max(1, Math.min(25, parsed));
          };
          
          const ascensionLevelStr = sessionStorage.getItem('selectedAscensionLevel') || '1';
          const selectedAscensionLevel = parseAscensionLevel(ascensionLevelStr);
          
          // FIX: 安全的 boolean 解析
          const parseBooleanSetting = (value, defaultValue = true) => {
            if (value === null || value === undefined) return defaultValue;
            return value === 'true';
          };
          
          const enableFog = parseBooleanSetting(sessionStorage.getItem('enableFog'), true);
          const enableLighting = parseBooleanSetting(sessionStorage.getItem('enableLighting'), true);
          
          // 应用设置到游戏实例
          game.selectedCharId = selectedCharId;
          game.selectedAscensionLevel = selectedAscensionLevel;
          game.selectedDiff = selectedDiff;
          game.config.enableFog = enableFog;
          game.config.enableLighting = enableLighting;
          
          // 输出日志
          console.log(`[Init] Restored settings:`, {
            character: selectedCharId,
            ascensionLevel: selectedAscensionLevel,
            difficulty: selectedDiff,
            fog: enableFog,
            lighting: enableLighting
          });
        };
        
        restoreSessionData();
        console.log(`[Init] Session data restored successfully`);
        
        // 标记游戏已初始化完成
        window.dispatchEvent(new CustomEvent('gameInitialized'));
        
        // 延迟启动游戏，确保加载界面已显示
        setTimeout(() => {
          game.startGame();
        }, 500);
      }
    }
  } catch (e) {
    console.error('GAME INIT ERROR:', e);
    // 发生致命错误时移除遮罩，显示错误
    const loading = document.getElementById('loading-overlay');
    if (loading) loading.style.display = 'none';
    alert('游戏初始化致命错误: ' + e.message);
  }
});

