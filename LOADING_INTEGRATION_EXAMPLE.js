/**
 * 加载界面系统集成示例
 * 
 * 这个文件展示了如何在游戏代码中正确使用 LoadingOverlayManager
 * 和 ResourceManager 来管理加载界面
 * 
 * ⚠️ 重要修复（已应用）：
 * - 修复了游戏界面加载时没有正确监听资源加载完成的问题
 * - 修复了角色选择界面加载时的相同问题
 * - 现在使用 ResourceManager.waitForResources() 监听真实资源加载
 * - 添加了备用方案：如果 ResourceManager 不可用，自动使用回退延迟
 * - 添加了异常处理：资源加载失败时不会中断整个流程
 * 
 * 使用方法：
 * 1. 在 src/main.js 中导入或参考这个文件的实现
 * 2. 在游戏初始化、界面切换时调用相应的方法
 * 3. 根据实际需求调整加载步骤和提示文本
 * 4. 确保 ResourceManager 已正确初始化并提供 waitForResources() 方法
 */

// ============================================================================
// 第一部分：主菜单到角色选择界面的加载流程
// ============================================================================

/**
 * 处理"开始游戏"按钮点击
 * 从主菜单切换到角色选择界面
 */
function handleStartGameClick() {
  console.log('🎮 用户点击"开始游戏"按钮');
  
  // 隐藏主菜单
  const mainMenu = document.getElementById('main-menu');
  if (mainMenu) {
    mainMenu.classList.add('hidden');
  }
  
  // 开始加载角色选择界面
  loadCharacterSelectionScreen();
}

/**
 * 加载角色选择界面
 * 显示加载界面，加载所需资源，然后显示角色选择界面
 * 
 * 修复：现在正确监听资源加载完成，而不是使用模拟延迟
 */
async function loadCharacterSelectionScreen() {
  console.log('📦 开始加载角色选择界面...');
  
  // 1. 显示加载界面
  window.LoadingOverlayManager.showOverlay('charSelect', '加载英雄选择界面...');
  
  try {
    // 2. 定义加载步骤及其对应的资源
    const loadingSteps = [
      {
        name: '加载角色模型',
        resources: ['character-models', 'character-skins'],
        fallbackDuration: 400
      },
      {
        name: '加载角色技能数据',
        resources: ['skill-data', 'skill-icons'],
        fallbackDuration: 300
      },
      {
        name: '加载背景音乐',
        resources: ['background-music', 'ui-sounds'],
        fallbackDuration: 200
      },
      {
        name: '初始化UI',
        resources: ['ui-components', 'ui-animations'],
        fallbackDuration: 150
      }
    ];

    // 3. 执行加载步骤，监听资源加载
    let totalProgress = 0;
    const totalSteps = loadingSteps.length;

    for (let i = 0; i < loadingSteps.length; i++) {
      const step = loadingSteps[i];
      
      // 更新提示文本
      window.LoadingOverlayManager.setTip(step.name, 'charSelect');
      console.log(`📦 ${step.name}...`);
      
      // 关键修复：监听真实资源加载，而不是使用模拟延迟
      try {
        // 检查 ResourceManager 是否存在
        if (window.ResourceManager && typeof window.ResourceManager.waitForResources === 'function') {
          // 使用 ResourceManager 监听资源加载完成
          await window.ResourceManager.waitForResources(step.resources);
          console.log(`✓ ${step.name} - 资源加载完成`);
        } else {
          // 备用方案：如果 ResourceManager 不可用，使用回退延迟
          console.warn(`⚠️ ResourceManager 不可用，使用回退延迟: ${step.name}`);
          await new Promise(resolve => setTimeout(resolve, step.fallbackDuration));
        }
      } catch (resourceError) {
        // 资源加载失败时的处理
        console.warn(`⚠️ 资源加载异常: ${step.name}`, resourceError);
        // 继续执行，不中断整个流程
        await new Promise(resolve => setTimeout(resolve, step.fallbackDuration));
      }
      
      // 更新进度条
      totalProgress = Math.round(((i + 1) / totalSteps) * 100);
      window.LoadingOverlayManager.setProgress(totalProgress, 'charSelect');
      
      console.log(`✓ ${step.name} - 进度: ${totalProgress}%`);
    }

    // 4. 加载完成，隐藏加载界面
    console.log('✅ 角色选择界面加载完成');
    window.LoadingOverlayManager.hideOverlay('charSelect');
    
    // 5. 显示角色选择界面
    const charSelectScreen = document.getElementById('char-select-screen');
    if (charSelectScreen) {
      charSelectScreen.classList.remove('hidden');
    }
    
    // 6. 触发事件（可选）
    window.dispatchEvent(new CustomEvent('charSelectLoadingComplete'));

  } catch (error) {
    console.error('❌ 加载角色选择界面失败:', error);
    
    // 显示错误提示
    window.LoadingOverlayManager.setTip('加载失败，请重试', 'charSelect');
    
    // 可选：添加重试按钮或返回主菜单
    setTimeout(() => {
      window.LoadingOverlayManager.hideOverlay('charSelect');
      const mainMenu = document.getElementById('main-menu');
      if (mainMenu) {
        mainMenu.classList.remove('hidden');
      }
    }, 2000);
  }
}

// ============================================================================
// 第二部分：角色选择到游戏界面的加载流程
// ============================================================================

/**
 * 处理"开始游戏"按钮点击（在角色选择界面）
 * 从角色选择界面切换到游戏界面
 */
function handleStartGameplayClick() {
  console.log('🎮 用户点击"开始游戏"按钮（角色选择界面）');
  
  // 隐藏角色选择界面
  const charSelectScreen = document.getElementById('char-select-screen');
  if (charSelectScreen) {
    charSelectScreen.classList.add('hidden');
  }
  
  // 开始加载游戏界面
  loadGameplayScreen();
}

/**
 * 加载游戏界面
 * 显示加载界面，初始化游戏，然后显示游戏界面
 * 
 * 修复：现在正确监听资源加载完成，而不是使用模拟延迟
 */
async function loadGameplayScreen() {
  console.log('🎮 开始加载游戏界面...');
  
  // 1. 显示加载界面
  window.LoadingOverlayManager.showOverlay('gameplay', '初始化游戏...');
  
  try {
    // 2. 定义初始化步骤及其对应的资源
    const initSteps = [
      {
        name: '加载地图数据',
        resources: ['map-data', 'map-textures'],
        fallbackDuration: 500
      },
      {
        name: '初始化敌人系统',
        resources: ['enemy-models', 'enemy-ai'],
        fallbackDuration: 400
      },
      {
        name: '加载UI资源',
        resources: ['ui-sprites', 'ui-fonts'],
        fallbackDuration: 300
      },
      {
        name: '初始化音频系统',
        resources: ['audio-engine', 'background-music'],
        fallbackDuration: 200
      },
      {
        name: '启动游戏循环',
        resources: ['game-loop'],
        fallbackDuration: 150
      }
    ];

    // 3. 执行初始化步骤，监听资源加载
    let totalProgress = 0;
    const totalSteps = initSteps.length;

    for (let i = 0; i < initSteps.length; i++) {
      const step = initSteps[i];
      
      // 更新提示文本
      window.LoadingOverlayManager.setTip(step.name, 'gameplay');
      console.log(`📦 ${step.name}...`);
      
      // 关键修复：监听真实资源加载，而不是使用模拟延迟
      try {
        // 检查 ResourceManager 是否存在
        if (window.ResourceManager && typeof window.ResourceManager.waitForResources === 'function') {
          // 使用 ResourceManager 监听资源加载完成
          await window.ResourceManager.waitForResources(step.resources);
          console.log(`✓ ${step.name} - 资源加载完成`);
        } else {
          // 备用方案：如果 ResourceManager 不可用，使用回退延迟
          console.warn(`⚠️ ResourceManager 不可用，使用回退延迟: ${step.name}`);
          await new Promise(resolve => setTimeout(resolve, step.fallbackDuration));
        }
      } catch (resourceError) {
        // 资源加载失败时的处理
        console.warn(`⚠️ 资源加载异常: ${step.name}`, resourceError);
        // 继续执行，不中断整个流程
        await new Promise(resolve => setTimeout(resolve, step.fallbackDuration));
      }
      
      // 更新进度条
      totalProgress = Math.round(((i + 1) / totalSteps) * 100);
      window.LoadingOverlayManager.setProgress(totalProgress, 'gameplay');
      
      console.log(`✓ ${step.name} - 进度: ${totalProgress}%`);
    }

    // 4. 等待所有资源加载完成（额外的安全检查）
    if (window.ResourceManager && typeof window.ResourceManager.waitForAllResources === 'function') {
      console.log('🔍 执行最终资源完整性检查...');
      try {
        await window.ResourceManager.waitForAllResources();
        console.log('✅ 所有资源加载完成');
      } catch (error) {
        console.warn('⚠️ 部分资源加载失败，但继续进行:', error);
      }
    }

    // 5. 初始化完成，隐藏加载界面
    console.log('✅ 游戏界面加载完成');
    window.LoadingOverlayManager.hideOverlay('gameplay');
    
    // 6. 显示游戏界面
    const mainUI = document.getElementById('main-ui');
    if (mainUI) {
      mainUI.classList.remove('hidden');
    }
    
    // 7. 触发事件（可选）
    window.dispatchEvent(new CustomEvent('gameplayLoadingComplete'));

  } catch (error) {
    console.error('❌ 加载游戏界面失败:', error);
    
    // 显示错误提示
    window.LoadingOverlayManager.setTip('初始化失败，请重试', 'gameplay');
    
    // 可选：添加重试或返回选择界面
    setTimeout(() => {
      window.LoadingOverlayManager.hideOverlay('gameplay');
      const charSelectScreen = document.getElementById('char-select-screen');
      if (charSelectScreen) {
        charSelectScreen.classList.remove('hidden');
      }
    }, 2000);
  }
}

// ============================================================================
// 第三部分：游戏内部的加载场景
// ============================================================================

/**
 * 进入新楼层时的加载
 * 例如：从第1层进入第2层
 */
async function loadNewFloor(floorNumber) {
  console.log(`🏢 加载第 ${floorNumber} 层...`);
  
  // 显示游戏加载界面（复用）
  window.LoadingOverlayManager.showOverlay('gameplay', `加载第 ${floorNumber} 层...`);
  
  try {
    // 定义加载步骤
    const steps = [
      { name: '生成地形', duration: 300 },
      { name: '生成敌人', duration: 300 },
      { name: '生成宝箱', duration: 200 }
    ];

    let progress = 0;
    for (let i = 0; i < steps.length; i++) {
      window.LoadingOverlayManager.setTip(steps[i].name, 'gameplay');
      await new Promise(resolve => setTimeout(resolve, steps[i].duration));
      
      progress = Math.round(((i + 1) / steps.length) * 100);
      window.LoadingOverlayManager.setProgress(progress, 'gameplay');
    }

    // 隐藏加载界面
    window.LoadingOverlayManager.hideOverlay('gameplay');
    console.log(`✅ 第 ${floorNumber} 层加载完成`);

  } catch (error) {
    console.error(`❌ 加载第 ${floorNumber} 层失败:`, error);
    window.LoadingOverlayManager.setTip('加载失败', 'gameplay');
  }
}

/**
 * 打开商店时的加载
 */
async function loadShop() {
  console.log('🏪 加载商店...');
  
  window.LoadingOverlayManager.showOverlay('gameplay', '加载商店...');
  
  try {
    // 模拟加载商店数据
    await new Promise(resolve => setTimeout(resolve, 500));
    
    window.LoadingOverlayManager.setProgress(100, 'gameplay');
    window.LoadingOverlayManager.hideOverlay('gameplay');
    
    // 显示商店界面
    const shopOverlay = document.getElementById('shop-overlay');
    if (shopOverlay) {
      shopOverlay.classList.remove('hidden');
    }
    
    console.log('✅ 商店加载完成');

  } catch (error) {
    console.error('❌ 加载商店失败:', error);
    window.LoadingOverlayManager.setTip('加载失败', 'gameplay');
  }
}

/**
 * 打开背包时的加载
 */
async function loadInventory() {
  console.log('🎒 加载背包...');
  
  window.LoadingOverlayManager.showOverlay('gameplay', '加载背包...');
  
  try {
    // 模拟加载背包数据
    await new Promise(resolve => setTimeout(resolve, 300));
    
    window.LoadingOverlayManager.setProgress(100, 'gameplay');
    window.LoadingOverlayManager.hideOverlay('gameplay');
    
    // 显示背包界面
    const inventoryOverlay = document.getElementById('inventory-overlay');
    if (inventoryOverlay) {
      inventoryOverlay.classList.remove('hidden');
    }
    
    console.log('✅ 背包加载完成');

  } catch (error) {
    console.error('❌ 加载背包失败:', error);
    window.LoadingOverlayManager.setTip('加载失败', 'gameplay');
  }
}

// ============================================================================
// 第四部分：事件监听设置
// ============================================================================

/**
 * 初始化所有事件监听
 * 在游戏启动时调用
 */
function initializeLoadingEventListeners() {
  console.log('🎯 初始化加载事件监听...');
  
  // 主菜单事件
  const btnStartGame = document.getElementById('btn-start-game');
  if (btnStartGame) {
    btnStartGame.addEventListener('click', handleStartGameClick);
  }
  
  // 角色选择界面事件
  const btnReady = document.querySelector('.ror-btn-ready');
  if (btnReady) {
    btnReady.addEventListener('click', handleStartGameplayClick);
  }
  
  // 监听全局资源加载完成
  window.addEventListener('resourcesLoaded', () => {
    console.log('📦 全局资源加载完成');
    // 可以在这里执行游戏初始化逻辑
  });
  
  // 监听游戏初始化完成
  window.addEventListener('gameInitialized', () => {
    console.log('🎮 游戏初始化完成');
  });
  
  // 监听角色选择加载完成
  window.addEventListener('charSelectLoadingComplete', () => {
    console.log('👤 角色选择界面加载完成');
  });
  
  // 监听游戏加载完成
  window.addEventListener('gameplayLoadingComplete', () => {
    console.log('🎮 游戏加载完成');
  });
  
  console.log('✅ 加载事件监听初始化完成');
}

// ============================================================================
// 第五部分：调试工具
// ============================================================================

/**
 * 调试工具：快速测试加载界面
 * 在浏览器控制台中使用
 */
window.LoadingDebugTools = {
  /**
   * 测试全局加载界面
   */
  testGlobalLoading: function() {
    console.log('🧪 测试全局加载界面...');
    window.LoadingOverlayManager.showOverlay('global', '测试加载...');
    
    let progress = 0;
    const interval = setInterval(() => {
      progress += 10;
      window.LoadingOverlayManager.setProgress(progress, 'global');
      
      if (progress >= 100) {
        clearInterval(interval);
        window.LoadingOverlayManager.hideOverlay('global');
        console.log('✅ 测试完成');
      }
    }, 200);
  },

  /**
   * 测试角色选择加载界面
   */
  testCharSelectLoading: function() {
    console.log('🧪 测试角色选择加载界面...');
    window.LoadingOverlayManager.showOverlay('charSelect', '测试加载...');
    
    let progress = 0;
    const interval = setInterval(() => {
      progress += 10;
      window.LoadingOverlayManager.setProgress(progress, 'charSelect');
      
      if (progress >= 100) {
        clearInterval(interval);
        window.LoadingOverlayManager.hideOverlay('charSelect');
        console.log('✅ 测试完成');
      }
    }, 200);
  },

  /**
   * 测试游戏加载界面
   */
  testGameplayLoading: function() {
    console.log('🧪 测试游戏加载界面...');
    window.LoadingOverlayManager.showOverlay('gameplay', '测试加载...');
    
    let progress = 0;
    const interval = setInterval(() => {
      progress += 10;
      window.LoadingOverlayManager.setProgress(progress, 'gameplay');
      
      if (progress >= 100) {
        clearInterval(interval);
        window.LoadingOverlayManager.hideOverlay('gameplay');
        console.log('✅ 测试完成');
      }
    }, 200);
  },

  /**
   * 显示所有加载界面状态
   */
  showStatus: function() {
    console.log('📊 加载界面状态:');
    console.log('  全局:', window.LoadingOverlayManager.isVisible('global'));
    console.log('  角色选择:', window.LoadingOverlayManager.isVisible('charSelect'));
    console.log('  游戏:', window.LoadingOverlayManager.isVisible('gameplay'));
    console.log('  当前进度:', window.LoadingOverlayManager.getProgress() + '%');
  }
};

// ============================================================================
// 第六部分：导出和初始化
// ============================================================================

// 页面加载完成后初始化
window.addEventListener('load', () => {
  console.log('🚀 页面加载完成，初始化加载系统...');
  
  // 初始化事件监听
  initializeLoadingEventListeners();
  
  // 输出调试工具使用提示
  console.log('💡 调试工具已加载，可以在控制台使用:');
  console.log('  - LoadingDebugTools.testGlobalLoading()');
  console.log('  - LoadingDebugTools.testCharSelectLoading()');
  console.log('  - LoadingDebugTools.testGameplayLoading()');
  console.log('  - LoadingDebugTools.showStatus()');
});

// 导出函数供外部使用
window.GameLoadingFunctions = {
  loadCharacterSelectionScreen,
  loadGameplayScreen,
  loadNewFloor,
  loadShop,
  loadInventory,
  initializeLoadingEventListeners
};

