// BestiaryUI.js - 怪物图鉴 UI
// 独立管理图鉴UI的所有渲染和交互逻辑

import { MONSTER_STATS, MONSTER_TRAITS } from '../constants.js';

/**
 * BestiaryUI - 怪物图鉴界面管理器
 * 负责渲染怪物列表、详细信息、图像等
 * 完全独立的组件，不依赖外部 DOM 操作
 */
export class BestiaryUI {
  constructor(config = {}) {
    // 样式配置对象（允许外部自定义）
    this.style = {
      // 列表项配置
      listItemHeight: config.listItemHeight || 26,
      listItemGap: config.listItemGap || 2,
      
      // 面板配置
      panelOffsetX: config.panelOffsetX || 0,
      panelOffsetY: config.panelOffsetY || 0,
      panelScale: config.panelScale || 1.0,
      
      // 字体配置
      fontSize: config.fontSize || 14,
      titleFontSize: config.titleFontSize || 18,
      
      // 颜色配置
      selectedColor: config.selectedColor || '#ffd700',
      hoverColor: config.hoverColor || '#ffeb3b',
      
      // 动画配置
      enableAnimations: config.enableAnimations !== false,
      transitionDuration: config.transitionDuration || 200,
      
      ...config.customStyles
    };

    // 内部状态
    this.selectedMonster = null;
    this.monsters = Object.keys(MONSTER_STATS);
    this.isOpen = false;
    this.loader = config.loader || null;

    // DOM 元素引用（延迟初始化）
    this.elements = {
      overlay: null,
      listContainer: null,
      detailsPanel: null,
      statsGrid: null,
      infoSection: null,
      traitsSection: null,
      loreSection: null
    };

    // 初始化
    this.init();
  }

  /**
   * 初始化组件
   */
  init() {
    this.initDOMElements();
    this.setupEventListeners();
    this.setupResizeHandler();
    console.log('✓ BestiaryUI 已初始化', this.style);
  }

  /**
   * 初始化 DOM 元素引用
   */
  initDOMElements() {
    this.elements.overlay = document.getElementById('bestiary-overlay');
    this.elements.listContainer = document.getElementById('bestiary-list');
    
    // 应用样式配置到面板
    if (this.elements.overlay) {
      const panel = this.elements.overlay.querySelector('.bestiary-modal');
      if (panel && this.style.panelScale !== 1.0) {
        panel.style.transform = `scale(${this.style.panelScale})`;
      }
    }

    // 缓存详情面板元素
    this.cacheDetailElements();
  }

  /**
   * 缓存详情面板元素引用
   */
  cacheDetailElements() {
    this.elements.statsGrid = {
      hp: document.getElementById('bestiary-hp'),
      patk: document.getElementById('bestiary-patk'),
      matk: document.getElementById('bestiary-matk'),
      pdef: document.getElementById('bestiary-pdef'),
      mdef: document.getElementById('bestiary-mdef'),
      xp: document.getElementById('bestiary-xp'),
      gold: document.getElementById('bestiary-gold'),
      rage: document.getElementById('bestiary-rage')
    };

    this.elements.infoSection = {
      height: document.getElementById('bestiary-height'),
      weight: document.getElementById('bestiary-weight'),
      speed: document.getElementById('bestiary-speed')
    };

    this.elements.loreSection = document.getElementById('bestiary-lore');
    this.elements.traitsSection = document.getElementById('bestiary-traits-section');
  }

  /**
   * 设置事件监听器
   */
  setupEventListeners() {
    if (!this.elements.overlay) return;

    // 关闭按钮
    const closeBtn = this.elements.overlay.querySelector('.bestiary-close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.close());
    }

    // 点击 overlay 外部关闭
    this.elements.overlay.addEventListener('click', (e) => {
      if (e.target === this.elements.overlay) {
        this.close();
      }
    });
  }

  /**
   * 打开图鉴界面
   */
  open() {
    if (!this.elements.overlay) {
      this.initDOMElements();
    }

    if (!this.elements.overlay || !this.elements.listContainer) {
      console.warn('Bestiary 元素未找到');
      return;
    }

    // 播放打开书本音效
    const game = window.game;
    if (game && game.audio) {
      game.audio.playBookOpen();
    }

    // 显示 overlay
    this.elements.overlay.classList.remove('hidden');
    this.isOpen = true;

    // 渲染怪物列表
    this.render();

    // 默认选择第一个怪物
    if (this.monsters.length > 0 && !this.selectedMonster) {
      this.selectMonster(this.monsters[0]);
    }

    // Apply smooth transition animation
    const modal = this.elements.overlay.querySelector('.bestiary-modal');
    if (modal) {
      // Remove animation class to restart animation on re-open
      modal.classList.remove('modal-animate-enter');
      // Force reflow to restart animation
      void modal.offsetWidth;
      // Add animation class
      modal.classList.add('modal-animate-enter');
    }

    console.log('✓ BestiaryUI 已打开');
  }

  /**
   * 关闭图鉴界面
   */
  close() {
    if (this.elements.overlay) {
      this.elements.overlay.classList.add('hidden');
      this.isOpen = false;
      console.log('✓ BestiaryUI 已关闭');
    }
  }

  /**
   * 切换图鉴界面开关
   */
  toggle() {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  /**
   * 完整渲染图鉴界面
   */
  render() {
    this.renderMonsterList();
    
    // 如果已选择怪物，重新渲染详情
    if (this.selectedMonster) {
      this.renderDetails(this.selectedMonster);
    }
  }

  /**
   * 更新图鉴界面（数据变化时调用）
   */
  update() {
    if (this.isOpen) {
      this.render();
    }
  }

  /**
   * 渲染怪物列表
   */
  renderMonsterList() {
    if (!this.elements.listContainer) return;

    // 清空现有列表
    this.elements.listContainer.innerHTML = '';

    // 为每个怪物创建列表项
    this.monsters.forEach((monsterKey) => {
      const stats = MONSTER_STATS[monsterKey];
      if (!stats) return;

      const listItem = document.createElement('div');
      listItem.className = 'bestiary-list-item';
      listItem.textContent = stats.cnName || stats.name;
      listItem.dataset.monster = monsterKey;

      // 应用样式配置
      if (this.style.listItemHeight) {
        listItem.style.height = `${this.style.listItemHeight}px`;
        listItem.style.lineHeight = `${this.style.listItemHeight}px`;
      }
      if (this.style.fontSize) {
        listItem.style.fontSize = `${this.style.fontSize}px`;
      }

      // 点击事件
      listItem.addEventListener('click', () => {
        this.selectMonster(monsterKey);
      });

      // 悬停效果（如果启用动画）
      if (this.style.enableAnimations) {
        listItem.addEventListener('mouseenter', () => {
          if (!listItem.classList.contains('active')) {
            listItem.style.backgroundColor = this.style.hoverColor + '22'; // 半透明
          }
        });
        listItem.addEventListener('mouseleave', () => {
          if (!listItem.classList.contains('active')) {
            listItem.style.backgroundColor = '';
          }
        });
      }

      this.elements.listContainer.appendChild(listItem);
    });

    console.log(`✓ 已渲染 ${this.monsters.length} 个怪物`);
  }

  /**
   * 选择怪物并显示详情
   * @param {string} monsterKey - 怪物键值（如 'SLIME', 'BAT'）
   */
  selectMonster(monsterKey) {
    if (!MONSTER_STATS[monsterKey]) {
      console.warn(`怪物不存在: ${monsterKey}`);
      return;
    }

    if (!this.elements.listContainer) return;

    // 播放翻页音效（只在切换怪物时播放，不在初次打开时播放）
    if (this.selectedMonster && this.selectedMonster !== monsterKey) {
      const game = window.game;
      if (game && game.audio) {
        game.audio.playBookFlip();
      }
    }

    this.selectedMonster = monsterKey;

    // 更新列表项激活状态
    const listItems = this.elements.listContainer.querySelectorAll('.bestiary-list-item');
    listItems.forEach((item) => {
      if (item.dataset.monster === monsterKey) {
        item.classList.add('active');
        if (this.style.selectedColor) {
          item.style.backgroundColor = this.style.selectedColor + '33'; // 半透明
          item.style.borderColor = this.style.selectedColor;
        }
      } else {
        item.classList.remove('active');
        item.style.backgroundColor = '';
        item.style.borderColor = '';
      }
    });

    // 渲染详情
    this.renderDetails(monsterKey);

    console.log(`✓ 已选择怪物: ${monsterKey}`);
  }

  /**
   * 渲染怪物详情
   * @param {string} monsterKey - 怪物键值
   */
  renderDetails(monsterKey) {
    const stats = MONSTER_STATS[monsterKey];
    if (!stats) return;

    // 渲染各个部分
    this.renderStatsGrid(stats);
    this.renderInfoSection(stats);
    this.renderTraits(stats);
    this.renderLore(stats);
    this.renderPortrait(monsterKey, stats);
  }

  /**
   * 渲染属性网格
   * @param {object} stats - 怪物属性对象
   */
  renderStatsGrid(stats) {
    const elements = this.elements.statsGrid;
    if (!elements) return;

    if (elements.hp) elements.hp.textContent = stats.hp || '-';
    if (elements.patk) elements.patk.textContent = stats.p_atk || '-';
    if (elements.matk) elements.matk.textContent = stats.m_atk || '-';
    if (elements.pdef) elements.pdef.textContent = stats.p_def || '-';
    if (elements.mdef) elements.mdef.textContent = stats.m_def || '-';
    if (elements.xp) elements.xp.textContent = stats.xp || '-';
    if (elements.gold) elements.gold.textContent = stats.gold || '-';
    if (elements.rage) elements.rage.textContent = stats.rageYield || '-';
  }

  /**
   * 渲染信息区域
   * @param {object} stats - 怪物属性对象
   */
  renderInfoSection(stats) {
    const elements = this.elements.infoSection;
    if (!elements) return;

    if (elements.height) elements.height.textContent = stats.height || '-';
    if (elements.weight) elements.weight.textContent = stats.weight || '-';

    // 转换速度值为中文描述
    let speedText = '-';
    if (typeof stats.speed === 'number') {
      if (stats.speed <= 0.08) speedText = '最慢';
      else if (stats.speed <= 0.10) speedText = '很慢';
      else if (stats.speed <= 0.12) speedText = '慢';
      else if (stats.speed <= 0.14) speedText = '中等';
      else if (stats.speed <= 0.15) speedText = '快';
      else speedText = '极快';
    }
    if (elements.speed) elements.speed.textContent = speedText;
  }

  /**
   * 渲染怪物特性
   * @param {object} stats - 怪物属性对象
   */
  renderTraits(stats) {
    const traitsSection = this.elements.traitsSection;
    if (!traitsSection) return;

    // 清空现有内容
    traitsSection.innerHTML = '';

    // 获取怪物的特性列表
    const traits = stats.traits || [];
    
    if (traits.length === 0) {
      // 如果没有特性，显示占位文本
      const placeholder = document.createElement('div');
      placeholder.className = 'traits-empty';
      placeholder.textContent = '该怪物没有特殊特性';
      traitsSection.appendChild(placeholder);
      return;
    }

    // 创建特性标题
    const title = document.createElement('h3');
    title.className = 'traits-title';
    title.textContent = '特性';
    traitsSection.appendChild(title);

    // 创建特性容器
    const traitsContainer = document.createElement('div');
    traitsContainer.className = 'traits-container';

    // 遍历特性并渲染
    traits.forEach((traitKey) => {
      const traitDef = MONSTER_TRAITS[traitKey];
      if (!traitDef) return;

      // 创建特性项
      const traitItem = document.createElement('div');
      traitItem.className = 'trait-item';

      // 特性名称
      const traitName = document.createElement('div');
      traitName.className = 'trait-name';
      traitName.textContent = traitDef.name;
      traitItem.appendChild(traitName);

      // 特性描述
      const traitDesc = document.createElement('div');
      traitDesc.className = 'trait-desc';
      traitDesc.textContent = traitDef.desc;
      traitItem.appendChild(traitDesc);

      traitsContainer.appendChild(traitItem);
    });

    traitsSection.appendChild(traitsContainer);
  }

  /**
   * 渲染背景故事
   * @param {object} stats - 怪物属性对象
   */
  renderLore(stats) {
    const loreElement = this.elements.loreSection;
    if (loreElement) {
      loreElement.textContent = stats.lore || '暂无背景故事...';
      
      // 应用字体大小配置
      if (this.style.fontSize) {
        loreElement.style.fontSize = `${this.style.fontSize}px`;
      }
    }
  }

  /**
   * 渲染怪物肖像
   * @param {string} monsterKey - 怪物键值
   * @param {object} stats - 怪物属性对象
   */
  renderPortrait(monsterKey, stats) {
    const portraitContainer = document.getElementById('bestiary-portrait');
    if (!portraitContainer) return;

    portraitContainer.innerHTML = '';

    // 如果有 loader 且怪物有图像资源，渲染肖像
    if (this.loader && stats.sprite) {
      try {
        const canvas = document.createElement('canvas');
        const size = 120; // 肖像尺寸
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        // 尝试加载怪物精灵图
        const img = this.loader.getImage(stats.sprite);
        if (img && img.complete) {
          ctx.imageSmoothingEnabled = false;
          
          // 居中绘制
          const scale = Math.min(size / img.width, size / img.height);
          const w = img.width * scale;
          const h = img.height * scale;
          const x = (size - w) / 2;
          const y = (size - h) / 2;
          
          ctx.drawImage(img, x, y, w, h);
          portraitContainer.appendChild(canvas);
        }
      } catch (e) {
        console.warn(`无法渲染怪物肖像: ${monsterKey}`, e);
      }
    }

    // 如果没有图像，显示怪物名称
    if (!portraitContainer.children.length) {
      const placeholder = document.createElement('div');
      placeholder.className = 'bestiary-portrait-placeholder';
      placeholder.textContent = stats.cnName || stats.name || '?';
      if (this.style.titleFontSize) {
        placeholder.style.fontSize = `${this.style.titleFontSize}px`;
      }
      portraitContainer.appendChild(placeholder);
    }
  }

  /**
   * 设置 resize 事件处理（响应窗口大小变化）
   */
  setupResizeHandler() {
    window.addEventListener('resize', () => {
      if (this.isOpen) {
        // 窗口大小变化时重新渲染
        this.render();
      }
    });
  }

  /**
   * 更新样式配置（运行时修改样式）
   * @param {object} newStyles - 新的样式配置
   */
  updateStyle(newStyles) {
    this.style = { ...this.style, ...newStyles };

    // 应用新样式
    if (this.elements.overlay && newStyles.panelScale) {
      const panel = this.elements.overlay.querySelector('.bestiary-modal');
      if (panel) {
        panel.style.transform = `scale(${newStyles.panelScale})`;
      }
    }

    // 重新渲染
    if (this.isOpen) {
      this.render();
    }

    console.log('✓ BestiaryUI 样式已更新', this.style);
  }

  /**
   * 设置资源加载器（用于渲染怪物肖像）
   * @param {object} loader - 资源加载器实例
   */
  setLoader(loader) {
    this.loader = loader;
    
    // 如果图鉴已打开且有选中的怪物，重新渲染肖像
    if (this.isOpen && this.selectedMonster) {
      const stats = MONSTER_STATS[this.selectedMonster];
      if (stats) {
        this.renderPortrait(this.selectedMonster, stats);
      }
    }
  }

  /**
   * 销毁组件（清理资源）
   */
  destroy() {
    this.close();
    this.selectedMonster = null;
    this.loader = null;
    console.log('✓ BestiaryUI 已销毁');
  }
}
