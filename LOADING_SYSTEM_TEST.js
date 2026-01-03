/**
 * 加载界面系统测试脚本
 * 用于验证加载系统的所有功能是否正常工作
 * 
 * 使用方法：
 * 1. 在浏览器控制台中复制粘贴此脚本
 * 2. 或在 HTML 中引入：<script src="LOADING_SYSTEM_TEST.js"></script>
 */

window.LoadingSystemTest = {
  // 测试结果记录
  results: [],
  
  // 测试统计
  totalTests: 0,
  passedTests: 0,
  failedTests: 0,

  /**
   * 记录测试结果
   */
  log: function(testName, passed, message = '') {
    this.totalTests++;
    if (passed) {
      this.passedTests++;
      console.log(`✅ ${testName}`, message);
    } else {
      this.failedTests++;
      console.error(`❌ ${testName}`, message);
    }
    this.results.push({ testName, passed, message });
  },

  /**
   * 测试1：检查 LoadingOverlayManager 是否存在
   */
  testLoadingOverlayManagerExists: function() {
    const exists = window.LoadingOverlayManager !== undefined;
    this.log(
      '测试1: LoadingOverlayManager 存在',
      exists,
      exists ? 'LoadingOverlayManager 已初始化' : 'LoadingOverlayManager 未找到'
    );
    return exists;
  },

  /**
   * 测试2：检查 ResourceManager 是否存在
   */
  testResourceManagerExists: function() {
    const exists = window.ResourceManager !== undefined;
    this.log(
      '测试2: ResourceManager 存在',
      exists,
      exists ? 'ResourceManager 已初始化' : 'ResourceManager 未找到'
    );
    return exists;
  },

  /**
   * 测试3：检查所有加载界面元素是否存在
   */
  testLoadingOverlayElements: function() {
    const overlayIds = [
      'loading-overlay',
      'char-select-loading-overlay',
      'gameplay-loading-overlay'
    ];

    let allExist = true;
    overlayIds.forEach(id => {
      const element = document.getElementById(id);
      if (!element) {
        console.warn(`  ⚠️  加载界面元素未找到: #${id}`);
        allExist = false;
      }
    });

    this.log(
      '测试3: 所有加载界面元素存在',
      allExist,
      allExist ? '所有加载界面元素已找到' : '部分加载界面元素缺失'
    );
    return allExist;
  },

  /**
   * 测试4：检查进度条元素是否存在
   */
  testProgressBarElements: function() {
    const selectors = [
      '#loading-overlay #loading-bar-fill',
      '#char-select-loading-overlay .loading-bar-fill',
      '#gameplay-loading-overlay .loading-bar-fill'
    ];

    let allExist = true;
    selectors.forEach(selector => {
      const element = document.querySelector(selector);
      if (!element) {
        console.warn(`  ⚠️  进度条元素未找到: ${selector}`);
        allExist = false;
      }
    });

    this.log(
      '测试4: 所有进度条元素存在',
      allExist,
      allExist ? '所有进度条元素已找到' : '部分进度条元素缺失'
    );
    return allExist;
  },

  /**
   * 测试5：检查 LoadingOverlayManager 的关键方法
   */
  testLoadingOverlayManagerMethods: function() {
    const manager = window.LoadingOverlayManager;
    const methods = [
      'init',
      'showOverlay',
      'hideOverlay',
      'setProgress',
      'setTip',
      'isVisible',
      'getProgress',
      'hideAllOverlays',
      'checkAndHideOverlay'
    ];

    let allExist = true;
    methods.forEach(method => {
      if (typeof manager[method] !== 'function') {
        console.warn(`  ⚠️  方法未找到: LoadingOverlayManager.${method}`);
        allExist = false;
      }
    });

    this.log(
      '测试5: LoadingOverlayManager 的所有关键方法存在',
      allExist,
      allExist ? '所有方法已找到' : '部分方法缺失'
    );
    return allExist;
  },

  /**
   * 测试6：检查 ResourceManager 的关键方法
   */
  testResourceManagerMethods: function() {
    const manager = window.ResourceManager;
    const methods = [
      'init',
      'loadResource',
      'loadImage',
      'loadScript',
      'loadStyle',
      'updateProgress',
      'addResource',
      'getStats'
    ];

    let allExist = true;
    methods.forEach(method => {
      if (typeof manager[method] !== 'function') {
        console.warn(`  ⚠️  方法未找到: ResourceManager.${method}`);
        allExist = false;
      }
    });

    this.log(
      '测试6: ResourceManager 的所有关键方法存在',
      allExist,
      allExist ? '所有方法已找到' : '部分方法缺失'
    );
    return allExist;
  },

  /**
   * 测试7：测试显示加载界面
   */
  testShowOverlay: function() {
    const manager = window.LoadingOverlayManager;
    manager.showOverlay('global', '测试加载...');
    
    const isVisible = manager.isVisible('global');
    const overlay = document.getElementById('loading-overlay');
    const hasHiddenClass = overlay && overlay.classList.contains('hidden');

    const passed = isVisible && !hasHiddenClass;
    this.log(
      '测试7: 显示加载界面',
      passed,
      passed ? '加载界面已显示' : '加载界面显示失败'
    );

    // 隐藏加载界面以恢复状态
    manager.hideOverlay('global');
    return passed;
  },

  /**
   * 测试8：测试隐藏加载界面
   */
  testHideOverlay: function() {
    const manager = window.LoadingOverlayManager;
    manager.showOverlay('global', '测试加载...');
    manager.hideOverlay('global');
    
    const isVisible = manager.isVisible('global');
    const overlay = document.getElementById('loading-overlay');
    const hasHiddenClass = overlay && overlay.classList.contains('hidden');

    const passed = !isVisible && hasHiddenClass;
    this.log(
      '测试8: 隐藏加载界面',
      passed,
      passed ? '加载界面已隐藏' : '加载界面隐藏失败'
    );
    return passed;
  },

  /**
   * 测试9：测试设置进度
   */
  testSetProgress: function() {
    const manager = window.LoadingOverlayManager;
    manager.showOverlay('global', '测试进度...');
    manager.setProgress(50, 'global');
    
    const progress = manager.getProgress('global');
    const barElement = document.querySelector('#loading-overlay #loading-bar-fill');
    const barWidth = barElement ? barElement.style.width : '0%';

    const passed = progress === 50 && barWidth === '50%';
    this.log(
      '测试9: 设置进度',
      passed,
      passed ? `进度已设置为 50% (${barWidth})` : `进度设置失败 (${barWidth})`
    );

    manager.hideOverlay('global');
    return passed;
  },

  /**
   * 测试10：测试设置提示文本
   */
  testSetTip: function() {
    const manager = window.LoadingOverlayManager;
    manager.showOverlay('global', '初始提示');
    manager.setTip('更新的提示文本', 'global');
    
    const tipElement = document.querySelector('#loading-overlay #loading-tip-text');
    const tipText = tipElement ? tipElement.textContent : '';

    const passed = tipText === '更新的提示文本';
    this.log(
      '测试10: 设置提示文本',
      passed,
      passed ? `提示文本已设置为 "${tipText}"` : `提示文本设置失败 (${tipText})`
    );

    manager.hideOverlay('global');
    return passed;
  },

  /**
   * 测试11：测试事件监听 - resourcesLoaded
   */
  testResourcesLoadedEvent: function() {
    return new Promise((resolve) => {
      let eventFired = false;

      const listener = () => {
        eventFired = true;
        window.removeEventListener('resourcesLoaded', listener);
      };

      window.addEventListener('resourcesLoaded', listener);

      // 手动触发事件
      window.dispatchEvent(new CustomEvent('resourcesLoaded'));

      // 等待一小段时间后检查
      setTimeout(() => {
        this.log(
          '测试11: resourcesLoaded 事件监听',
          eventFired,
          eventFired ? '事件已成功触发和监听' : '事件监听失败'
        );
        resolve(eventFired);
      }, 100);
    });
  },

  /**
   * 测试12：测试事件监听 - charSelectLoadingStart
   */
  testCharSelectLoadingStartEvent: function() {
    return new Promise((resolve) => {
      let eventFired = false;

      const listener = () => {
        eventFired = true;
        window.removeEventListener('charSelectLoadingStart', listener);
      };

      window.addEventListener('charSelectLoadingStart', listener);

      // 手动触发事件
      window.dispatchEvent(new CustomEvent('charSelectLoadingStart'));

      setTimeout(() => {
        this.log(
          '测试12: charSelectLoadingStart 事件监听',
          eventFired,
          eventFired ? '事件已成功触发和监听' : '事件监听失败'
        );
        resolve(eventFired);
      }, 100);
    });
  },

  /**
   * 测试13：测试事件监听 - gameplayLoadingStart
   */
  testGameplayLoadingStartEvent: function() {
    return new Promise((resolve) => {
      let eventFired = false;

      const listener = () => {
        eventFired = true;
        window.removeEventListener('gameplayLoadingStart', listener);
      };

      window.addEventListener('gameplayLoadingStart', listener);

      // 手动触发事件
      window.dispatchEvent(new CustomEvent('gameplayLoadingStart'));

      setTimeout(() => {
        this.log(
          '测试13: gameplayLoadingStart 事件监听',
          eventFired,
          eventFired ? '事件已成功触发和监听' : '事件监听失败'
        );
        resolve(eventFired);
      }, 100);
    });
  },

  /**
   * 测试14：测试资源加载统计
   */
  testResourceStats: function() {
    const stats = window.ResourceManager.getStats();
    const hasRequiredFields = 
      stats.hasOwnProperty('total') &&
      stats.hasOwnProperty('loaded') &&
      stats.hasOwnProperty('failed') &&
      stats.hasOwnProperty('isLoading') &&
      stats.hasOwnProperty('progress');

    this.log(
      '测试14: 资源加载统计',
      hasRequiredFields,
      hasRequiredFields ? `统计信息: ${JSON.stringify(stats)}` : '统计信息缺失'
    );
    return hasRequiredFields;
  },

  /**
   * 测试15：测试多界面独立进度追踪
   */
  testMultipleOverlayProgress: function() {
    const manager = window.LoadingOverlayManager;
    
    // 为不同界面设置不同的进度
    manager.setProgress(30, 'global');
    manager.setProgress(60, 'charSelect');
    manager.setProgress(90, 'gameplay');

    const globalProgress = manager.getProgress('global');
    const charSelectProgress = manager.getProgress('charSelect');
    const gameplayProgress = manager.getProgress('gameplay');

    const passed = 
      globalProgress === 30 &&
      charSelectProgress === 60 &&
      gameplayProgress === 90;

    this.log(
      '测试15: 多界面独立进度追踪',
      passed,
      passed ? 
        `进度已正确设置: global=${globalProgress}%, charSelect=${charSelectProgress}%, gameplay=${gameplayProgress}%` :
        '进度设置失败'
    );
    return passed;
  },

  /**
   * 运行所有测试
   */
  runAllTests: async function() {
    console.log('========================================');
    console.log('🧪 开始运行加载系统测试');
    console.log('========================================\n');

    // 同步测试
    this.testLoadingOverlayManagerExists();
    this.testResourceManagerExists();
    this.testLoadingOverlayElements();
    this.testProgressBarElements();
    this.testLoadingOverlayManagerMethods();
    this.testResourceManagerMethods();
    this.testShowOverlay();
    this.testHideOverlay();
    this.testSetProgress();
    this.testSetTip();
    this.testResourceStats();
    this.testMultipleOverlayProgress();

    // 异步测试
    await this.testResourcesLoadedEvent();
    await this.testCharSelectLoadingStartEvent();
    await this.testGameplayLoadingStartEvent();

    // 输出测试总结
    this.printSummary();
  },

  /**
   * 打印测试总结
   */
  printSummary: function() {
    console.log('\n========================================');
    console.log('📊 测试总结');
    console.log('========================================');
    console.log(`总测试数: ${this.totalTests}`);
    console.log(`✅ 通过: ${this.passedTests}`);
    console.log(`❌ 失败: ${this.failedTests}`);
    console.log(`成功率: ${((this.passedTests / this.totalTests) * 100).toFixed(2)}%`);
    console.log('========================================\n');

    if (this.failedTests === 0) {
      console.log('🎉 所有测试都通过了！加载系统工作正常。');
    } else {
      console.log(`⚠️  有 ${this.failedTests} 个测试失败，请检查上面的错误信息。`);
    }
  },

  /**
   * 打印调试信息
   */
  printDebugInfo: function() {
    console.log('\n========================================');
    console.log('🔍 调试信息');
    console.log('========================================\n');

    // LoadingOverlayManager 状态
    console.log('LoadingOverlayManager 状态:');
    Object.keys(window.LoadingOverlayManager.overlays).forEach(key => {
      const overlay = window.LoadingOverlayManager.overlays[key];
      console.log(`  ${key}:`, {
        visible: overlay.visible,
        isLoading: overlay.isLoading,
        progress: window.LoadingOverlayManager.getProgress(key) + '%'
      });
    });

    // ResourceManager 状态
    console.log('\nResourceManager 状态:');
    const stats = window.ResourceManager.getStats();
    console.log('  ', stats);

    // 已加载资源
    console.log('\n已加载资源:');
    console.log('  ', Array.from(window.ResourceManager.loadedResources));

    // 失败资源
    console.log('\n失败资源:');
    console.log('  ', Array.from(window.ResourceManager.failedResources));

    console.log('\n========================================\n');
  }
};

// 自动运行测试（如果在浏览器控制台中）
if (typeof window !== 'undefined' && document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
      window.LoadingSystemTest.runAllTests();
      window.LoadingSystemTest.printDebugInfo();
    }, 1000);
  });
} else if (typeof window !== 'undefined') {
  setTimeout(() => {
    window.LoadingSystemTest.runAllTests();
    window.LoadingSystemTest.printDebugInfo();
  }, 1000);
}

// 导出测试对象供外部使用
if (typeof module !== 'undefined' && module.exports) {
  module.exports = window.LoadingSystemTest;
}

