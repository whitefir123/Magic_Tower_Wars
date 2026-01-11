/**
 * QuestTracker.js
 * 
 * 任务追踪器 HUD 组件
 * 负责在游戏主界面显示任务进度（悬停显示）
 */

/**
 * QuestTracker - 任务追踪器
 * 在 HUD 中显示任务图标，悬停时显示任务详情
 */
export class QuestTracker {
  constructor(game) {
    this.game = game;
    this.elements = {};
    this.isVisible = false;
    
    this.init();
  }

  /**
   * 初始化任务追踪器
   */
  init() {
    // 获取或创建游戏图标容器
    let gameIconsContainer = document.getElementById('game-icons-container');
    if (!gameIconsContainer) {
      // 如果容器不存在，创建一个
      gameIconsContainer = document.createElement('div');
      gameIconsContainer.id = 'game-icons-container';
      const mainUI = document.getElementById('main-ui');
      if (mainUI) {
        mainUI.appendChild(gameIconsContainer);
      } else {
        document.body.appendChild(gameIconsContainer);
      }
    }

    // 创建任务图标（使用图片，与现有图标风格一致）
    const questIcon = document.createElement('img');
    questIcon.id = 'quest-tracker-icon';
    questIcon.className = 'quest-tracker-icon';
    questIcon.src = 'https://i.postimg.cc/RhBDz0W5/renwutubiao1.png';
    questIcon.alt = '任务';
    questIcon.setAttribute('aria-label', '任务');

    // 创建任务详情面板
    const questPanel = document.createElement('div');
    questPanel.id = 'quest-tracker-panel';
    questPanel.className = 'quest-tracker-panel';
    
    const panelTitle = document.createElement('div');
    panelTitle.className = 'quest-tracker-title';
    panelTitle.textContent = '进行中的任务';
    questPanel.appendChild(panelTitle);

    const panelContent = document.createElement('div');
    panelContent.className = 'quest-tracker-content';
    panelContent.id = 'quest-tracker-content';
    questPanel.appendChild(panelContent);

    // 将图标和面板添加到容器（面板是绝对定位，相对于图标）
    gameIconsContainer.appendChild(questIcon);
    gameIconsContainer.appendChild(questPanel);

    // 保存元素引用
    this.elements = {
      icon: questIcon,
      panel: questPanel,
      content: panelContent
    };

    // 添加悬停事件
    this.setupHoverEvents();

    // 注入样式
    this.injectStyles();

    console.log('[QuestTracker] 任务追踪器已初始化');
  }

  /**
   * 设置悬停事件
   */
  setupHoverEvents() {
    const { icon, panel } = this.elements;
    if (!icon || !panel) return;

    // 鼠标进入图标时显示面板
    icon.addEventListener('mouseenter', () => {
      this.showPanel();
    });

    // 鼠标离开图标时，延迟检查是否移入面板
    let hideTimer = null;
    icon.addEventListener('mouseleave', () => {
      hideTimer = setTimeout(() => {
        // 检查鼠标是否在面板内
        const isHoveringPanel = panel.matches(':hover') || document.activeElement === panel;
        if (!isHoveringPanel) {
          this.hidePanel();
        }
      }, 100);
    });

    // 面板鼠标进入时取消隐藏
    panel.addEventListener('mouseenter', () => {
      if (hideTimer) {
        clearTimeout(hideTimer);
        hideTimer = null;
      }
      this.showPanel();
    });

    // 面板鼠标离开时隐藏
    panel.addEventListener('mouseleave', () => {
      this.hidePanel();
    });
  }

  /**
   * 显示面板
   */
  showPanel() {
    const { panel } = this.elements;
    if (!panel) return;
    
    this.updatePanelContent();
    panel.style.display = 'block';
    panel.style.opacity = '1';
    this.isVisible = true;
  }

  /**
   * 隐藏面板
   */
  hidePanel() {
    const { panel } = this.elements;
    if (!panel) return;
    
    panel.style.opacity = '0';
    // 延迟隐藏以确保过渡动画完成
    setTimeout(() => {
      if (panel.style.opacity === '0') {
        panel.style.display = 'none';
      }
    }, 200);
    this.isVisible = false;
  }

  /**
   * 更新面板内容
   */
  updatePanelContent() {
    const { content } = this.elements;
    if (!content) return;

    const questSystem = this.game ? this.game.questSystem : null;
    if (!questSystem) {
      content.innerHTML = '<div class="quest-tracker-item">任务系统未初始化</div>';
      return;
    }

    // 获取活跃任务
    const activeQuests = questSystem.getActiveQuests();
    
    // 清空内容
    content.innerHTML = '';

    if (activeQuests.length === 0) {
      const emptyMsg = document.createElement('div');
      emptyMsg.className = 'quest-tracker-item quest-tracker-empty';
      emptyMsg.textContent = '暂无进行中的任务';
      content.appendChild(emptyMsg);
      return;
    }

    // 显示每个任务
    activeQuests.forEach(quest => {
      const item = document.createElement('div');
      item.className = 'quest-tracker-item';

      // 任务标题
      const title = document.createElement('div');
      title.className = 'quest-tracker-item-title';
      title.textContent = quest.title;
      item.appendChild(title);

      // 获取 objectives（支持新格式）
      const objectives = quest.objectives || [];
      const hasMultipleObjectives = objectives.length > 1;

      if (hasMultipleObjectives) {
        // 多目标：显示每个子目标的进度
        objectives.forEach((obj, index) => {
          const progress = document.createElement('div');
          progress.className = 'quest-tracker-item-progress';
          
          let progressText = '';
          if (obj.type === 'REACH_FLOOR') {
            const currentFloor = this.game && this.game.player ? this.game.player.stats.floor : 0;
            progressText = `${obj.description || '到达层数'}: ${currentFloor}/${obj.target}`;
          } else {
            const status = obj.current >= obj.count ? '[已完成]' : '';
            progressText = `${obj.description || `目标 ${obj.id}`}: ${obj.current}/${obj.count} ${status}`;
          }
          
          progress.textContent = progressText;
          if (obj.current >= obj.count) {
            progress.style.color = '#8BC34A';
            progress.style.fontWeight = 'bold';
          }
          item.appendChild(progress);
        });

        // 显示总进度
        const completedCount = objectives.filter(obj => obj.current >= obj.count).length;
        const totalProgress = document.createElement('div');
        totalProgress.className = 'quest-tracker-item-progress';
        totalProgress.style.marginTop = '4px';
        totalProgress.style.borderTop = '1px solid rgba(255, 255, 255, 0.2)';
        totalProgress.style.paddingTop = '4px';
        totalProgress.textContent = `总进度: ${completedCount}/${objectives.length} 目标完成`;
        item.appendChild(totalProgress);
      } else {
        // 单目标：显示简单进度
        const progress = document.createElement('div');
        progress.className = 'quest-tracker-item-progress';
        
        let progressText = '';
        if (objectives.length > 0) {
          const obj = objectives[0];
          if (obj.type === 'REACH_FLOOR') {
            const currentFloor = this.game && this.game.player ? this.game.player.stats.floor : 0;
            progressText = `当前: ${currentFloor} / 目标: ${obj.target}`;
          } else {
            progressText = `${obj.current || 0} / ${obj.count || 0}`;
          }
        } else {
          // 向后兼容：使用旧的 objective 和 progress
          const objective = quest.objective || {};
          if (objective.type === 'REACH_FLOOR') {
            const currentFloor = this.game && this.game.player ? this.game.player.stats.floor : 0;
            progressText = `当前: ${currentFloor} / 目标: ${objective.target}`;
          } else {
            progressText = `${quest.progress || 0} / ${quest.target || objective.count || 0}`;
          }
        }
        
        progress.textContent = progressText;
        item.appendChild(progress);
      }

      content.appendChild(item);
    });
  }

  /**
   * 注入样式
   */
  injectStyles() {
    // 检查是否已存在样式
    if (document.getElementById('quest-tracker-styles')) {
      return;
    }

    const style = document.createElement('style');
    style.id = 'quest-tracker-styles';
    style.textContent = `
      .quest-tracker-icon {
        width: 80px;
        height: 80px;
        aspect-ratio: 1;
        cursor: pointer;
        transition: all 0.2s ease;
        filter: none;
        position: relative;
        z-index: 101;
        pointer-events: auto;
        user-select: none;
      }

      .quest-tracker-icon:hover {
        transform: scale(1.15);
        filter: brightness(1.3);
      }

      .quest-tracker-icon:active {
        transform: scale(0.9);
        filter: brightness(0.9);
      }

      .quest-tracker-panel {
        position: absolute;
        left: 100px;
        top: 0;
        width: 280px;
        max-height: 400px;
        background: rgba(0, 0, 0, 0.85);
        border: 2px solid rgba(255, 255, 255, 0.3);
        border-radius: 8px;
        padding: 12px;
        display: none;
        opacity: 0;
        transition: opacity 0.2s ease;
        z-index: 1000;
        pointer-events: auto;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
        overflow-y: auto;
        overflow-x: hidden;
        margin-left: -8px;
        margin-top: 0;
      }

      .quest-tracker-title {
        font-size: 16px;
        font-weight: bold;
        color: #ffd700;
        margin-bottom: 10px;
        text-shadow: 1px 1px 0px #000;
        border-bottom: 1px solid rgba(255, 255, 255, 0.2);
        padding-bottom: 6px;
      }

      .quest-tracker-content {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .quest-tracker-item {
        padding: 8px;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 4px;
      }

      .quest-tracker-item-title {
        font-size: 14px;
        font-weight: bold;
        color: #fff;
        margin-bottom: 4px;
        text-shadow: 1px 1px 0px #000;
        word-wrap: break-word;
      }

      .quest-tracker-item-progress {
        font-size: 12px;
        color: #aaa;
        text-shadow: 1px 1px 0px #000;
      }

      .quest-tracker-empty {
        text-align: center;
        color: #888;
        font-size: 13px;
        padding: 12px;
      }

      /* 滚动条样式 */
      .quest-tracker-panel::-webkit-scrollbar {
        width: 6px;
      }

      .quest-tracker-panel::-webkit-scrollbar-track {
        background: rgba(0, 0, 0, 0.3);
        border-radius: 3px;
      }

      .quest-tracker-panel::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.3);
        border-radius: 3px;
      }

      .quest-tracker-panel::-webkit-scrollbar-thumb:hover {
        background: rgba(255, 255, 255, 0.5);
      }
    `;

    document.head.appendChild(style);
  }

  /**
   * 更新追踪器（由 QuestSystem 调用）
   */
  update() {
    // 如果面板当前可见，更新内容
    if (this.isVisible) {
      this.updatePanelContent();
    }
  }

  /**
   * 销毁追踪器
   */
  destroy() {
    const { icon } = this.elements;
    if (icon && icon.parentNode) {
      icon.parentNode.removeChild(icon);
    }

    // 移除样式
    const style = document.getElementById('quest-tracker-styles');
    if (style) {
      style.parentNode.removeChild(style);
    }
  }
}
