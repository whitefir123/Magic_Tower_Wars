// InitialView.js - 铁匠铺初始界面管理器
// 管理初始状态的背景、NPC和功能按钮显示

/**
 * InitialView - 初始界面管理器
 * 负责渲染铁匠铺的初始简洁界面
 */
export class InitialView {
  constructor(forgeUI) {
    this.forgeUI = forgeUI;
    this.npcDisplay = null;
    this.functionButtons = null;
  }

  /**
   * 渲染初始界面
   */
  render() {
    const container = this.forgeUI.elements.overlay;
    if (!container) return;
    
    // 清空现有内容
    container.innerHTML = `
      <div class="forge-modal">
        <!-- 左侧NPC区域 -->
        <div class="forge-npc-area" id="forge-npc-area"></div>
        
        <!-- 右上角功能按钮区域（包含关闭按钮） -->
        <div class="forge-function-buttons" id="forge-function-buttons"></div>
        
        <!-- 动态面板容器（初始为空） -->
        <div class="forge-dynamic-panel-container" id="forge-dynamic-panel"></div>
      </div>
    `;
    
    // 渲染NPC
    this.renderNPC();
    
    // 渲染功能按钮
    this.renderFunctionButtons();
  }

  /**
   * 渲染铁匠NPC
   */
  async renderNPC() {
    const npcArea = document.getElementById('forge-npc-area');
    if (!npcArea) return;
    
    // 初始化NPC渲染器（如果还没有）
    if (!this.forgeUI.npcRenderer) {
      try {
        // 动态导入BlacksmithNPCRenderer
        const { BlacksmithNPCRenderer } = await import('./BlacksmithNPCRenderer.js');
        
        // 创建NPC渲染器实例
        this.forgeUI.npcRenderer = new BlacksmithNPCRenderer(this.forgeUI);
        
        // 初始化NPC渲染器，传入npc-area作为容器
        this.forgeUI.npcRenderer.initialize(npcArea);
        
        console.log('✓ NPC渲染器已初始化');
      } catch (error) {
        console.error('✗ NPC渲染器初始化失败:', error);
      }
    } else {
      // 如果已经存在，重新初始化到新容器
      this.forgeUI.npcRenderer.initialize(npcArea);
    }
  }

  /**
   * 渲染功能按钮（使用精灵图素材）
   */
  renderFunctionButtons() {
    const buttonsArea = document.getElementById('forge-function-buttons');
    if (!buttonsArea) return;
    
    // 只保留三个主要功能按钮
    const buttons = [
      { id: 'enhance', spriteIndex: 0, label: '强化/重铸', tooltip: '强化装备等级或重铸品质，包含装备拆解功能' },
      { id: 'socket', spriteIndex: 1, label: '宝石镶嵌', tooltip: '镶嵌宝石提升装备属性' },
      { id: 'dismantle', spriteIndex: 2, label: '宝石拆除', tooltip: '拆除已镶嵌的宝石，包含批量操作和历史记录' }
    ];
    
    buttonsArea.innerHTML = buttons.map(btn => `
      <div class="forge-btn-wrapper">
        <button class="forge-function-btn forge-sprite-btn" 
                data-function="${btn.id}" 
                data-sprite-index="${btn.spriteIndex}"
                title="${btn.tooltip}">
        </button>
        <span class="forge-btn-label">${btn.label}</span>
      </div>
    `).join('') + `
      <!-- 关闭按钮放在最右边 -->
      <button class="forge-close-btn" id="forge-close-btn">✕</button>
    `;
    
    // 绑定点击事件
    buttons.forEach(btn => {
      const element = buttonsArea.querySelector(`[data-function="${btn.id}"]`);
      if (element) {
        console.log(`✓ 绑定按钮事件: ${btn.id}`, element);
        element.addEventListener('click', (e) => {
          console.log(`[按钮点击] ${btn.id}`, e);
          e.stopPropagation(); // 阻止事件冒泡
          this.onFunctionButtonClick(btn.id);
        });
      } else {
        console.warn(`✗ 找不到按钮元素: ${btn.id}`);
      }
    });
    
    // 绑定关闭按钮事件
    this.bindCloseButton();
  }

  /**
   * 功能按钮点击处理
   */
  onFunctionButtonClick(functionId) {
    console.log(`[InitialView] 功能按钮点击: ${functionId}`);
    
    // 播放点击音效（安全调用）
    if (this.forgeUI.soundManager && typeof this.forgeUI.soundManager.playButtonClick === 'function') {
      this.forgeUI.soundManager.playButtonClick();
    }
    
    // 显示对应的功能面板
    if (this.forgeUI.dynamicPanelManager) {
      console.log(`[InitialView] 调用 showPanel: ${functionId}`);
      this.forgeUI.dynamicPanelManager.showPanel(functionId);
    } else {
      console.error('[InitialView] dynamicPanelManager 未初始化');
    }
  }

  /**
   * NPC点击处理
   */
  onNPCClick() {
    console.log('铁匠NPC被点击');
    
    // 播放点击音效
    if (this.forgeUI.soundManager) {
      this.forgeUI.soundManager.playClick();
    }
    
    // 显示对话系统
    if (this.forgeUI.npcRenderer && this.forgeUI.npcRenderer.dialogueSystem) {
      this.forgeUI.npcRenderer.dialogueSystem.showDialogue();
    }
  }

  /**
   * 绑定关闭按钮事件
   */
  bindCloseButton() {
    const closeBtn = document.getElementById('forge-close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.forgeUI.close();
      });
    }
  }

  /**
   * 显示初始状态
   */
  show() {
    const npcArea = document.getElementById('forge-npc-area');
    const buttonsArea = document.getElementById('forge-function-buttons');
    
    if (npcArea) npcArea.style.display = 'block';
    if (buttonsArea) buttonsArea.style.display = 'flex';
  }

  /**
   * 隐藏初始状态（注意：NPC和按钮应该始终可见）
   */
  hide() {
    // 不隐藏NPC和功能按钮，它们应该始终可见
  }

  /**
   * 更新NPC信息显示
   */
  updateNPCInfo(level, affinity, affinityTitle) {
    const levelValue = document.getElementById('npc-level-value');
    const affinityProgress = document.getElementById('affinity-progress');
    const affinityTitleElement = document.getElementById('npc-affinity-title');
    
    if (levelValue) {
      levelValue.textContent = level;
    }
    
    if (affinityProgress) {
      affinityProgress.style.width = `${affinity}%`;
    }
    
    if (affinityTitleElement) {
      affinityTitleElement.textContent = affinityTitle;
    }
  }

  /**
   * 清理
   */
  cleanup() {
    // 清理事件监听器等
  }
}
