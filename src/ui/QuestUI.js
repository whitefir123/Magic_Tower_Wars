/**
 * QuestUI.js
 * 
 * 任务界面UI组件
 * 负责渲染任务列表、详情、进度条等
 */

export class QuestUI {
  constructor(game) {
    this.game = game;
    this.elements = {};
    this.selectedQuestId = null;
    this.autoSubmit = false; // 自动提交（预留功能）
    
    // questSystem 引用将在 update() 中获取
    this.questSystem = null;
    
    // 手风琴菜单状态：记录每个分类的展开/收起状态
    this.categoryStates = {
      'MAIN': false,
      'SIDE': false,
      'DAILY': false
    };
    
    this.init();
  }

  /**
   * 初始化UI（创建DOM结构和样式）
   */
  init() {
    // 创建overlay容器
    const overlay = document.createElement('div');
    overlay.id = 'quest-overlay';
    overlay.className = 'quest-overlay hidden';
    document.body.appendChild(overlay);

    // 创建主容器
    const container = document.createElement('div');
    container.className = 'quest-ui-container';
    overlay.appendChild(container);

    // 左侧：任务列表
    const questList = document.createElement('div');
    questList.className = 'quest-list';
    container.appendChild(questList);

    const listTitle = document.createElement('div');
    listTitle.className = 'quest-list-title';
    listTitle.textContent = '任务列表';
    questList.appendChild(listTitle);

    const listContent = document.createElement('div');
    listContent.className = 'quest-list-content';
    questList.appendChild(listContent);

    // 右侧：任务详情
    const questDetails = document.createElement('div');
    questDetails.className = 'quest-details';
    container.appendChild(questDetails);

    // 详情内容
    const detailsTitle = document.createElement('div');
    detailsTitle.className = 'quest-details-title';
    detailsTitle.textContent = '任务详情';
    questDetails.appendChild(detailsTitle);

    const detailsContent = document.createElement('div');
    detailsContent.className = 'quest-details-content';
    questDetails.appendChild(detailsContent);

    // 任务标题
    const questTitleEl = document.createElement('div');
    questTitleEl.className = 'quest-title';
    detailsContent.appendChild(questTitleEl);

    // 任务描述
    const questDescEl = document.createElement('div');
    questDescEl.className = 'quest-description';
    detailsContent.appendChild(questDescEl);

    // 进度容器（支持多目标）
    const progressContainer = document.createElement('div');
    progressContainer.className = 'quest-progress-container';
    detailsContent.appendChild(progressContainer);

    const progressLabel = document.createElement('div');
    progressLabel.className = 'quest-progress-label';
    progressContainer.appendChild(progressLabel);

    // 单目标进度条（向后兼容）
    const progressBar = document.createElement('div');
    progressBar.className = 'quest-progress-bar';
    progressContainer.appendChild(progressBar);

    const progressFill = document.createElement('div');
    progressFill.className = 'quest-progress-fill';
    progressBar.appendChild(progressFill);

    const progressText = document.createElement('div');
    progressText.className = 'quest-progress-text';
    progressContainer.appendChild(progressText);

    // 多目标列表容器
    const objectivesList = document.createElement('div');
    objectivesList.className = 'quest-objectives-list';
    progressContainer.appendChild(objectivesList);

    // 限制条件区域
    const conditionsSection = document.createElement('div');
    conditionsSection.className = 'quest-conditions-section';
    detailsContent.appendChild(conditionsSection);

    const conditionsTitle = document.createElement('div');
    conditionsTitle.className = 'quest-conditions-title';
    conditionsTitle.textContent = '限制条件:';
    conditionsSection.appendChild(conditionsTitle);

    const conditionsList = document.createElement('div');
    conditionsList.className = 'quest-conditions-list';
    conditionsSection.appendChild(conditionsList);

    // 奖励区域
    const rewardSection = document.createElement('div');
    rewardSection.className = 'quest-reward-section';
    detailsContent.appendChild(rewardSection);

    const rewardTitle = document.createElement('div');
    rewardTitle.className = 'quest-reward-title';
    rewardTitle.textContent = '奖励:';
    rewardSection.appendChild(rewardTitle);

    const rewardList = document.createElement('div');
    rewardList.className = 'quest-reward-list';
    rewardSection.appendChild(rewardList);

    // 操作区（右下角）
    const actionArea = document.createElement('div');
    actionArea.className = 'quest-action-area';
    container.appendChild(actionArea);

    // 复选框：自动提交
    const autoSubmitLabel = document.createElement('label');
    autoSubmitLabel.className = 'quest-auto-submit-label';
    actionArea.appendChild(autoSubmitLabel);

    const autoSubmitCheckbox = document.createElement('input');
    autoSubmitCheckbox.type = 'checkbox';
    autoSubmitCheckbox.className = 'quest-auto-submit-checkbox';
    autoSubmitCheckbox.checked = false;
    autoSubmitLabel.appendChild(autoSubmitCheckbox);

    const autoSubmitText = document.createTextNode(' 自动提交');
    autoSubmitLabel.appendChild(autoSubmitText);

    autoSubmitCheckbox.addEventListener('change', (e) => {
      const checked = e.target.checked;
      this.autoSubmit = checked;
      // 同步状态到 QuestSystem
      if (this.game && this.game.questSystem) {
        this.game.questSystem.setAutoSubmit(checked);
      }
    });

    // 按钮：领取奖励/进行中/已完成
    const actionButton = document.createElement('button');
    actionButton.className = 'quest-action-button';
    actionButton.textContent = '进行中';
    actionButton.disabled = true;
    actionArea.appendChild(actionButton);

    // 关闭按钮（右上角）
    const closeButton = document.createElement('button');
    closeButton.className = 'quest-close-button';
    closeButton.setAttribute('aria-label', '关闭');
    closeButton.addEventListener('click', () => {
      this.close();
    });
    container.appendChild(closeButton);

    // 保存元素引用
    this.elements = {
      overlay,
      container,
      listContent,
      questTitleEl,
      questDescEl,
      progressLabel,
      progressFill,
      progressText,
      progressBar,
      objectivesList,
      conditionsSection,
      conditionsList,
      rewardList,
      actionButton,
      autoSubmitCheckbox
    };

    // 插入样式
    this.injectStyles();

    console.log('[QuestUI] 任务UI已初始化');
  }

  /**
   * 注入样式
   */
  injectStyles() {
    // 检查是否已存在样式
    if (document.getElementById('quest-ui-styles')) {
      return;
    }

    const style = document.createElement('style');
    style.id = 'quest-ui-styles';
    style.textContent = `
      .quest-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
        opacity: 0;
        transition: opacity 0.3s ease;
      }

      .quest-overlay.overlay-fade-in {
        opacity: 1;
      }

      .quest-overlay.overlay-fade-out {
        opacity: 0;
      }

      .quest-overlay.hidden {
        display: none;
      }

      .quest-ui-container {
        position: relative;
        width: 983px;
        height: 632px;
        background-image: url('https://i.postimg.cc/MK8vhJt4/renwupanel1.png');
        background-size: 100% 100%;
        background-repeat: no-repeat;
        background-position: center;
        display: flex;
        flex-direction: column;
        padding: 20px;
        box-sizing: border-box;
        image-rendering: pixelated;
        image-rendering: -moz-crisp-edges;
        image-rendering: crisp-edges;
      }

      .quest-list {
        position: absolute;
        left: 30px;
        top: 50px;
        width: 255px;
        height: 487px;
        overflow-y: auto;
        padding-left: 0px;
        padding-right: 0px;
        margin-left: 47px;
        margin-right: 47px;
        margin-top: 22px;
        margin-bottom: 22px;
      }

      .quest-list-title {
        font-size: 19px;
        font-weight: bold;
        color: #fff;
        margin-bottom: 10px;
        text-shadow: 2px 2px 0px #000;
      }

      .quest-list-content {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .quest-category {
        display: flex;
        flex-direction: column;
        gap: 5px;
      }

      .quest-category-header {
        padding: 10px 8px;
        background: rgba(100, 100, 100, 0.6);
        border: 2px solid rgba(255, 255, 255, 0.4);
        cursor: pointer;
        font-size: 18px;
        font-weight: bold;
        color: #fff;
        text-shadow: 2px 2px 0px #000;
        transition: all 0.2s;
        user-select: none;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }

      .quest-category-header:hover {
        background: rgba(150, 150, 150, 0.7);
        border-color: rgba(255, 255, 255, 0.6);
      }

      .quest-category-header::after {
        content: '▶';
        font-size: 14px;
        transition: transform 0.2s;
      }

      .quest-category-header.expanded::after {
        transform: rotate(90deg);
      }

      .quest-category-content {
        display: none;
        flex-direction: column;
        gap: 5px;
        padding-left: 10px;
      }

      .quest-category-content.expanded {
        display: flex;
      }

      .quest-list-item {
        padding: 8px;
        background: rgba(0, 0, 0, 0.5);
        border: 2px solid rgba(255, 255, 255, 0.3);
        cursor: pointer;
        font-size: 17px;
        color: #fff;
        text-shadow: 1px 1px 0px #000;
        transition: all 0.2s;
      }

      .quest-list-item:hover {
        background: rgba(255, 255, 0, 0.3);
        border-color: rgba(255, 255, 0, 0.6);
      }

      .quest-list-item.selected {
        background: rgba(255, 255, 0, 0.5);
        border-color: #ffd700;
        color: #ffd700;
        font-weight: bold;
      }

      .quest-list-item.completed {
        opacity: 0.7;
      }

      .quest-details {
        position: absolute;
        right: 30px;
        top: 50px;
        width: 431px;
        height: 327px;
        padding-left: 0px;
        padding-right: 0px;
        padding-top: 0px;
        padding-bottom: 0px;
        margin-left: 84px;
        margin-right: 84px;
        margin-top: 90px;
        margin-bottom: 90px;
      }

      .quest-details-title {
        font-size: 19px;
        font-weight: bold;
        color: #fff;
        margin-bottom: 15px;
        text-shadow: 2px 2px 0px #000;
      }

      .quest-details-content {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .quest-title {
        font-size: 26px;
        font-weight: bold;
        color: #8B4513;
        text-shadow: 2px 2px 0px #000;
      }

      .quest-description {
        font-size: 17px;
        color: #fff;
        line-height: 1.5;
        text-shadow: 1px 1px 0px #000;
      }

      .quest-progress-container {
        display: flex;
        flex-direction: column;
        gap: 5px;
      }

      .quest-progress-label {
        font-size: 14px;
        color: #fff;
        text-shadow: 1px 1px 0px #000;
      }

      .quest-progress-bar {
        width: 100%;
        height: 20px;
        background: rgba(0, 0, 0, 0.7);
        border: 2px solid rgba(255, 255, 255, 0.5);
        position: relative;
        overflow: hidden;
      }

      .quest-progress-fill {
        height: 100%;
        background: linear-gradient(90deg, #4CAF50, #8BC34A);
        transition: width 0.3s ease;
        width: 0%;
      }

      .quest-progress-text {
        font-size: 14px;
        color: #fff;
        text-align: right;
        text-shadow: 1px 1px 0px #000;
      }

      .quest-objectives-list {
        display: none;
        flex-direction: column;
        gap: 8px;
        margin-top: 10px;
      }

      .quest-objectives-list.visible {
        display: flex;
      }

      .quest-objective-item {
        padding: 8px;
        background: rgba(0, 0, 0, 0.4);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 4px;
      }

      .quest-objective-item.completed {
        background: rgba(76, 175, 80, 0.3);
        border-color: rgba(76, 175, 80, 0.5);
      }

      .quest-objective-description {
        font-size: 15px;
        color: #fff;
        margin-bottom: 4px;
        text-shadow: 1px 1px 0px #000;
      }

      .quest-objective-progress {
        font-size: 13px;
        color: #aaa;
        text-shadow: 1px 1px 0px #000;
      }

      .quest-objective-item.completed .quest-objective-progress {
        color: #8BC34A;
        font-weight: bold;
      }

      .quest-conditions-section {
        margin-top: 10px;
        display: none;
      }

      .quest-conditions-section.visible {
        display: block;
      }

      .quest-conditions-title {
        font-size: 17px;
        font-weight: bold;
        color: #ff9800;
        margin-bottom: 5px;
        text-shadow: 1px 1px 0px #000;
      }

      .quest-conditions-list {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .quest-condition-item {
        font-size: 15px;
        color: #fff;
        text-shadow: 1px 1px 0px #000;
        padding: 4px 0;
      }

      .quest-condition-item.satisfied {
        color: #8BC34A;
      }

      .quest-condition-item.unsatisfied {
        color: #F44336;
      }

      /* Toast 通知样式 */
      .quest-toast {
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0, 0, 0, 0.9);
        border: 2px solid rgba(255, 255, 255, 0.5);
        border-radius: 8px;
        padding: 12px 24px;
        color: #fff;
        font-size: 16px;
        font-weight: bold;
        text-shadow: 2px 2px 0px #000;
        z-index: 20000;
        opacity: 0;
        transition: opacity 0.3s ease;
        pointer-events: none;
        max-width: 80%;
        text-align: center;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
      }

      .quest-toast.visible {
        opacity: 1;
      }

      .quest-toast.success {
        border-color: #4CAF50;
        background: rgba(76, 175, 80, 0.2);
      }

      .quest-toast.info {
        border-color: #2196F3;
        background: rgba(33, 150, 243, 0.2);
      }

      .quest-toast.warning {
        border-color: #FF9800;
        background: rgba(255, 152, 0, 0.2);
      }

      .quest-toast.error {
        border-color: #F44336;
        background: rgba(244, 67, 54, 0.2);
      }

      .quest-reward-section {
        margin-top: 10px;
      }

      .quest-reward-title {
        font-size: 17px;
        font-weight: bold;
        color: #ffd700;
        margin-bottom: 5px;
        text-shadow: 1px 1px 0px #000;
      }

      .quest-reward-list {
        font-size: 17px;
        color: #fff;
        text-shadow: 1px 1px 0px #000;
      }

      .quest-action-area {
        position: absolute;
        bottom: 30px;
        right: 30px;
        display: flex;
        flex-direction: column;
        gap: 10px;
        align-items: flex-end;
        margin-top: 64px;
        margin-bottom: 64px;
        margin-left: 89px;
        margin-right: 89px;
      }

      .quest-auto-submit-label {
        font-size: 14px;
        color: #fff;
        cursor: pointer;
        text-shadow: 1px 1px 0px #000;
        user-select: none;
      }

      .quest-auto-submit-checkbox {
        cursor: pointer;
      }

      .quest-action-button {
        padding: 8px 16px;
        font-size: 17px;
        font-weight: bold;
        border: 2px solid rgba(255, 255, 255, 0.5);
        background: rgba(0, 0, 0, 0.7);
        color: #fff;
        cursor: pointer;
        text-shadow: 1px 1px 0px #000;
        transition: all 0.2s;
      }

      .quest-action-button:hover:not(:disabled) {
        background: rgba(255, 255, 0, 0.3);
        border-color: #ffd700;
        color: #ffd700;
      }

      .quest-action-button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .quest-action-button.claimable {
        background: #ffd700;
        border-color: #ffd700;
        color: #000;
      }

      .quest-action-button.claimable:hover {
        background: #ffed4e;
        border-color: #ffed4e;
      }

      .quest-close-button {
        position: absolute;
        top: 10px;
        right: 10px;
        width: 40px;
        height: 40px;
        background: url('https://i.postimg.cc/Hkg88mzY/chacha.png') no-repeat center/contain;
        background-color: transparent;
        border: none;
        cursor: pointer;
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0;
        text-indent: -9999px;
        overflow: hidden;
        margin-left: 65px;
        margin-right: 65px;
        margin-top: 22px;
        margin-bottom: 22px;
      }

      .quest-close-button:hover {
        transform: scale(1.1);
        filter: brightness(1.2);
      }

      .quest-close-button:active {
        transform: scale(0.95);
      }

      /* 滚动条样式 */
      .quest-list-content::-webkit-scrollbar {
        width: 8px;
      }

      .quest-list-content::-webkit-scrollbar-track {
        background: rgba(0, 0, 0, 0.3);
      }

      .quest-list-content::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.5);
        border-radius: 4px;
      }

      .quest-list-content::-webkit-scrollbar-thumb:hover {
        background: rgba(255, 255, 255, 0.7);
      }
    `;

    document.head.appendChild(style);
  }

  /**
   * 打开任务界面
   */
  open() {
    const overlay = this.elements.overlay;
    if (!overlay) return;

    overlay.classList.remove('hidden');
    overlay.style.display = 'flex';
    
    // 强制重排
    void overlay.offsetWidth;
    
    overlay.classList.remove('overlay-fade-out');
    overlay.classList.add('overlay-fade-in');

    this.update();
  }

  /**
   * 关闭任务界面
   */
  close() {
    const overlay = this.elements.overlay;
    if (!overlay) return;

    overlay.classList.remove('overlay-fade-in');
    overlay.classList.add('overlay-fade-out');

    setTimeout(() => {
      overlay.classList.add('hidden');
      overlay.style.display = 'none';
    }, 300);
  }

  /**
   * 更新UI显示
   */
  update() {
    // 获取 questSystem 引用
    this.questSystem = this.game ? this.game.questSystem : null;

    if (!this.questSystem) {
      console.warn('[QuestUI] QuestSystem not found');
      return;
    }

    // 更新自动提交复选框状态（从系统读取）
    if (this.elements.autoSubmitCheckbox) {
      this.elements.autoSubmitCheckbox.checked = this.questSystem.autoSubmit || false;
      this.autoSubmit = this.questSystem.autoSubmit || false;
    }

    // 更新任务列表
    this.updateQuestList();

    // 更新任务详情
    if (this.selectedQuestId) {
      this.updateQuestDetails(this.selectedQuestId);
    } else {
      // 如果没有选中任务，自动选中第一个
      const activeQuests = this.questSystem.getActiveQuests();
      const completedQuests = this.questSystem.getCompletedQuests();
      
      if (activeQuests.length > 0) {
        this.selectQuest(activeQuests[0].id);
      } else if (completedQuests.length > 0) {
        this.selectQuest(completedQuests[0].id);
      }
    }
  }

  /**
   * 更新任务列表（手风琴菜单）
   */
  updateQuestList() {
    const listContent = this.elements.listContent;
    if (!listContent || !this.questSystem) return;

    // 导入 QUEST_DATABASE
    import('../systems/QuestSystem.js').then(({ QUEST_DATABASE }) => {
      // 清空列表
      listContent.innerHTML = '';

      // 获取所有任务（活跃 + 已完成）
      const activeQuests = this.questSystem.getActiveQuests();
      const completedQuests = this.questSystem.getCompletedQuests();

      // 按分类组织任务
      const questsByCategory = {
        'MAIN': { active: [], completed: [] },
        'SIDE': { active: [], completed: [] },
        'DAILY': { active: [], completed: [] }
      };

      // 分类活跃任务
      activeQuests.forEach(quest => {
        const category = quest.category || 'SIDE'; // 默认为支线
        if (questsByCategory[category]) {
          questsByCategory[category].active.push(quest);
        }
      });

      // 分类已完成任务
      completedQuests.forEach(quest => {
        const category = quest.category || 'SIDE'; // 默认为支线
        if (questsByCategory[category]) {
          questsByCategory[category].completed.push(quest);
        }
      });

      // 定义分类显示名称
      const categoryNames = {
        'MAIN': '主线任务',
        'SIDE': '支线任务',
        'DAILY': '每日任务'
      };

      // 确定默认展开的分类（有进行中任务的分类）
      let hasExpandedCategory = false;
      Object.keys(questsByCategory).forEach(category => {
        if (questsByCategory[category].active.length > 0 && !hasExpandedCategory) {
          this.categoryStates[category] = true;
          hasExpandedCategory = true;
        }
      });

      // 为每个分类创建容器
      Object.keys(questsByCategory).forEach(category => {
        const categoryData = questsByCategory[category];
        const totalQuests = categoryData.active.length + categoryData.completed.length;

        // 如果没有任务，跳过该分类
        if (totalQuests === 0) {
          return;
        }

        // 创建分类容器
        const categoryContainer = document.createElement('div');
        categoryContainer.className = 'quest-category';

        // 创建分类标题
        const categoryHeader = document.createElement('div');
        categoryHeader.className = 'quest-category-header';
        if (this.categoryStates[category]) {
          categoryHeader.classList.add('expanded');
        }
        categoryHeader.textContent = categoryNames[category];
        
        // 添加点击事件：切换展开/收起
        categoryHeader.addEventListener('click', () => {
          this.categoryStates[category] = !this.categoryStates[category];
          categoryHeader.classList.toggle('expanded');
          categoryContent.classList.toggle('expanded');
        });

        // 创建分类内容容器
        const categoryContent = document.createElement('div');
        categoryContent.className = 'quest-category-content';
        if (this.categoryStates[category]) {
          categoryContent.classList.add('expanded');
        }

        // 添加活跃任务
        categoryData.active.forEach(quest => {
          const item = this.createQuestListItem(quest, 'active');
          categoryContent.appendChild(item);
        });

        // 添加已完成任务
        categoryData.completed.forEach(quest => {
          const item = this.createQuestListItem(quest, 'completed');
          categoryContent.appendChild(item);
        });

        categoryContainer.appendChild(categoryHeader);
        categoryContainer.appendChild(categoryContent);
        listContent.appendChild(categoryContainer);
      });

      // 如果没有任何任务，显示提示
      const totalTasks = activeQuests.length + completedQuests.length;
      if (totalTasks === 0) {
        const emptyMsg = document.createElement('div');
        emptyMsg.className = 'quest-list-item';
        emptyMsg.textContent = '暂无任务';
        emptyMsg.style.opacity = '0.5';
        emptyMsg.style.cursor = 'default';
        listContent.appendChild(emptyMsg);
      }
    }).catch(err => {
      console.error('[QuestUI] Failed to load QUEST_DATABASE:', err);
    });
  }

  /**
   * 创建任务列表项
   */
  createQuestListItem(quest, status) {
    const item = document.createElement('div');
    item.className = `quest-list-item ${status}`;
    if (this.selectedQuestId === quest.id) {
      item.classList.add('selected');
    }

    item.textContent = quest.title;
    
    item.addEventListener('click', () => {
      this.selectQuest(quest.id);
    });

    return item;
  }

  /**
   * 选择任务
   */
  selectQuest(questId) {
    this.selectedQuestId = questId;
    this.updateQuestList(); // 更新列表以显示选中状态
    this.updateQuestDetails(questId);
  }

  /**
   * 更新任务详情
   */
  updateQuestDetails(questId) {
    if (!this.questSystem) return;

    // 从QUEST_DATABASE获取任务数据
    import('../systems/QuestSystem.js').then(({ QUEST_DATABASE }) => {
      const quest = QUEST_DATABASE[questId];

      if (!quest) {
        console.warn(`[QuestUI] 任务不存在: ${questId}`);
        return;
      }

      const { questTitleEl, questDescEl, progressLabel, progressFill, progressText, progressBar, objectivesList, conditionsSection, conditionsList, rewardList, actionButton } = this.elements;

      // 更新标题和描述
      questTitleEl.textContent = quest.title;
      questDescEl.textContent = quest.description;

      // 获取任务进度（包含 objectives）
      const isCompleted = this.questSystem.completedQuests.has(questId);
      const isClaimed = this.questSystem.claimedQuests.has(questId);
      const progress = this.questSystem.getQuestProgress(questId);

      // 规范化任务数据以获取 objectives
      const normalizedQuest = this.questSystem.normalizeQuest(JSON.parse(JSON.stringify(quest)));
      const objectives = progress && progress.objectives ? progress.objectives : normalizedQuest.objectives;

      // 判断是否有多个目标
      const hasMultipleObjectives = objectives && objectives.length > 1;

      // 显示/隐藏相应的UI元素
      if (hasMultipleObjectives) {
        // 多目标：隐藏单目标进度条，显示目标列表
        progressBar.style.display = 'none';
        objectivesList.classList.add('visible');
        objectivesList.innerHTML = '';

        // 渲染每个子目标
        objectives.forEach(obj => {
          const item = document.createElement('div');
          item.className = 'quest-objective-item';
          if (obj.current >= obj.count) {
            item.classList.add('completed');
          }

          const desc = document.createElement('div');
          desc.className = 'quest-objective-description';
          desc.textContent = obj.description || `目标 ${obj.id}`;
          item.appendChild(desc);

          const prog = document.createElement('div');
          prog.className = 'quest-objective-progress';
          if (obj.current >= obj.count) {
            prog.textContent = `${obj.count}/${obj.count} [已完成]`;
          } else {
            prog.textContent = `${obj.current}/${obj.count}`;
          }
          item.appendChild(prog);

          objectivesList.appendChild(item);
        });

        // 更新总进度标签
        const completedCount = objectives.filter(obj => obj.current >= obj.count).length;
        progressLabel.textContent = `任务进度: ${completedCount}/${objectives.length} 目标完成`;
      } else {
        // 单目标：显示进度条，隐藏目标列表
        progressBar.style.display = 'block';
        objectivesList.classList.remove('visible');
        objectivesList.innerHTML = '';

        if (isClaimed) {
          // 已领取奖励
          progressLabel.textContent = '任务状态:';
          progressText.textContent = '已完成';
          progressFill.style.width = '100%';
          actionButton.textContent = '已完成';
          actionButton.disabled = true;
          actionButton.classList.remove('claimable');
        } else if (isCompleted) {
          // 已完成，待领取
          const targetCount = objectives && objectives.length > 0 ? objectives[0].count : (quest.objective?.count || 1);
          progressLabel.textContent = '任务状态:';
          progressText.textContent = `已完成 (${targetCount}/${targetCount})`;
          progressFill.style.width = '100%';
          actionButton.textContent = '领取奖励';
          actionButton.disabled = false;
          actionButton.classList.add('claimable');
          
          // 绑定领取奖励事件
          actionButton.onclick = () => {
            if (this.questSystem.claimReward(questId)) {
              this.update();
            }
          };
        } else if (progress) {
          // 进行中
          const percent = progress.target > 0 ? (progress.progress / progress.target) * 100 : 0;
          progressLabel.textContent = '任务进度:';
          progressText.textContent = `${progress.progress} / ${progress.target}`;
          progressFill.style.width = `${percent}%`;
          actionButton.textContent = '进行中';
          actionButton.disabled = true;
          actionButton.classList.remove('claimable');
          actionButton.onclick = null;
        } else {
          // 未知状态
          progressLabel.textContent = '任务状态:';
          progressText.textContent = '未知';
          progressFill.style.width = '0%';
          actionButton.textContent = '进行中';
          actionButton.disabled = true;
          actionButton.classList.remove('claimable');
          actionButton.onclick = null;
        }
      }

      // 更新限制条件显示
      if (quest.conditions && this.questSystem) {
        conditionsSection.classList.add('visible');
        conditionsList.innerHTML = '';

        // 检查条件是否满足
        const conditionCheck = this.questSystem.checkConditions(normalizedQuest);
        const conditions = quest.conditions;

        // 显示生命值百分比条件
        if (conditions.minHpPercent !== undefined) {
          const player = this.game && this.game.player;
          const currentHp = player && player.stats ? (player.stats.hp || 0) : 0;
          const maxHp = player && player.stats ? (player.stats.maxHp || 1) : 1;
          const hpPercent = (currentHp / maxHp) * 100;
          const isSatisfied = hpPercent >= conditions.minHpPercent;

          const conditionItem = document.createElement('div');
          conditionItem.className = `quest-condition-item ${isSatisfied ? 'satisfied' : 'unsatisfied'}`;
          conditionItem.textContent = `生命值保持 ${conditions.minHpPercent}% 以上 (当前: ${Math.floor(hpPercent)}%)`;
          conditionsList.appendChild(conditionItem);
        }

        // 显示金币条件
        if (conditions.minGold !== undefined && conditions.minGold > 0) {
          const player = this.game && this.game.player;
          const currentGold = player && player.stats ? (player.stats.gold || 0) : 0;
          const isSatisfied = currentGold >= conditions.minGold;

          const conditionItem = document.createElement('div');
          conditionItem.className = `quest-condition-item ${isSatisfied ? 'satisfied' : 'unsatisfied'}`;
          conditionItem.textContent = `金币达到 ${conditions.minGold} (当前: ${currentGold})`;
          conditionsList.appendChild(conditionItem);
        }
      } else {
        // 没有条件，隐藏条件区域
        conditionsSection.classList.remove('visible');
        conditionsList.innerHTML = '';
      }

      // 更新奖励
      rewardList.innerHTML = '';
      const reward = quest.reward;
      const rewardItems = [];

      if (reward.gold && reward.gold > 0) {
        rewardItems.push(`${reward.gold} 金币`);
      }
      if (reward.xp && reward.xp > 0) {
        rewardItems.push(`${reward.xp} 经验`);
      }
      if (reward.items && Array.isArray(reward.items)) {
        reward.items.forEach(itemId => {
          rewardItems.push(itemId); // 可以进一步获取物品名称
        });
      }

      if (rewardItems.length > 0) {
        rewardList.textContent = rewardItems.join('、');
      } else {
        rewardList.textContent = '无奖励';
      }
    }).catch(err => {
      console.error('[QuestUI] Failed to load QUEST_DATABASE:', err);
    });
  }

  /**
   * 显示 Toast 通知
   * @param {string} message - 消息内容
   * @param {string} type - 类型 ('info', 'success', 'warning', 'error')
   */
  showToast(message, type = 'info') {
    // 创建 Toast 元素
    let toast = document.getElementById('quest-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'quest-toast';
      toast.className = 'quest-toast';
      document.body.appendChild(toast);
    }

    // 设置内容和类型
    toast.textContent = message;
    toast.className = `quest-toast ${type}`;

    // 显示
    toast.classList.add('visible');

    // 2秒后隐藏
    setTimeout(() => {
      toast.classList.remove('visible');
      // 延迟移除元素（等待动画完成）
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    }, 2000);
  }

  /**
   * 获取overlay元素（用于OverlayManager）
   */
  getOverlayElement() {
    return this.elements.overlay;
  }

  /**
   * 销毁UI
   */
  destroy() {
    if (this.elements.overlay && this.elements.overlay.parentNode) {
      this.elements.overlay.parentNode.removeChild(this.elements.overlay);
    }
    
    // 移除样式
    const style = document.getElementById('quest-ui-styles');
    if (style) {
      style.parentNode.removeChild(style);
    }
  }
}
