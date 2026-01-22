/**
 * NavigationController - 导航控制器
 * 
 * 管理铁匠铺功能页面的导航和切换
 */

export class NavigationController {
  constructor(forgeUI) {
    this.forgeUI = forgeUI;
    this.currentPage = 'enhance'; // 当前页面
    this.lastPage = 'enhance'; // 上次访问的页面
    this.navigationElement = null;
    
    // 功能页面配置
    this.pages = {
      enhance: {
        name: '强化/重铸',
        icon: '⚒️',
        tooltip: '强化装备等级或重铸品质',
        requiresItem: true
      },
      socket: {
        name: '宝石镶嵌',
        icon: '💎',
        tooltip: '镶嵌宝石提升装备属性',
        requiresItem: true
      },
      synthesis: {
        name: '宝石合成',
        icon: '🔮',
        tooltip: '合成高级宝石',
        requiresItem: false
      },
      dismantle: {
        name: '装备拆解',
        icon: '🔨',
        tooltip: '拆解装备获取材料',
        requiresItem: true
      },
      batch: {
        name: '批量操作',
        icon: '📦',
        tooltip: '批量强化或拆解装备',
        requiresItem: false
      }
    };
  }

  /**
   * 初始化导航控制器
   * @param {HTMLElement} containerElement - 容器元素
   */
  initialize(containerElement) {
    // 从localStorage恢复上次的页面
    const savedPage = localStorage.getItem('forge_last_page');
    if (savedPage && this.pages[savedPage]) {
      this.currentPage = savedPage;
      this.lastPage = savedPage;
    }
    
    console.log('✓ NavigationController 已初始化');
  }

  /**
   * 切换到指定页面
   * @param {string} pageName - 页面名称
   */
  navigateTo(pageName) {
    if (!this.pages[pageName]) {
      console.warn(`未知的页面: ${pageName}`);
      return;
    }
    
    const page = this.pages[pageName];
    
    // 检查是否需要选中装备
    if (page.requiresItem && !this.forgeUI.selectedItem) {
      this.forgeUI.showMessage('请先选择一件装备', 'info');
      return;
    }
    
    // 保存当前页面
    this.lastPage = this.currentPage;
    this.currentPage = pageName;
    
    // 保存到localStorage
    localStorage.setItem('forge_last_page', pageName);
    
    // 播放页面切换音效
    if (window.AudioManager && typeof window.AudioManager.playBookFlip === 'function') {
      window.AudioManager.playBookFlip();
    }
    
    // 触发ForgeUI的模式切换
    if (this.forgeUI.switchMode) {
      this.forgeUI.switchMode(pageName);
    }
    
    console.log(`✓ 导航到页面: ${pageName}`);
  }

  /**
   * 返回上一页
   */
  goBack() {
    if (this.lastPage && this.lastPage !== this.currentPage) {
      this.navigateTo(this.lastPage);
    }
  }

  /**
   * 获取当前页面
   * @returns {string} 当前页面名称
   */
  getCurrentPage() {
    return this.currentPage;
  }

  /**
   * 获取页面信息
   * @param {string} pageName - 页面名称
   * @returns {Object|null} 页面信息
   */
  getPageInfo(pageName) {
    return this.pages[pageName] || null;
  }

  /**
   * 检查页面是否可用
   * @param {string} pageName - 页面名称
   * @returns {boolean} 是否可用
   */
  isPageAvailable(pageName) {
    const page = this.pages[pageName];
    if (!page) return false;
    
    // 如果需要选中装备但没有选中，则不可用
    if (page.requiresItem && !this.forgeUI.selectedItem) {
      return false;
    }
    
    return true;
  }

  /**
   * 清理资源
   */
  cleanup() {
    this.navigationElement = null;
  }
}
