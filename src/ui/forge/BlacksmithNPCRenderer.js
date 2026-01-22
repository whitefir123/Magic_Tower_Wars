/**
 * BlacksmithNPCRenderer - 铁匠NPC渲染器
 * 
 * 处理铁匠NPC的可视化、动画和交互
 */

export class BlacksmithNPCRenderer {
  constructor(forgeUI) {
    this.forgeUI = forgeUI;
    this.npcElement = null;
    this.animator = null;
    this.dialogueSystem = null;
    this.giftSystem = null;
    this.affinityDisplay = null; // 好感度显示
    this.currentAnimation = 'IDLE';
  }

  /**
   * 初始化NPC渲染器
   * @param {HTMLElement} containerElement - 容器元素
   */
  initialize(containerElement) {
    // 清空容器（避免重复）
    containerElement.innerHTML = '';
    
    this.npcElement = this.createNPCElement();
    containerElement.appendChild(this.npcElement);
    
    // 如果子系统已经加载，直接重启动画
    if (this.animator && this.animator.isLoaded) {
      // 更新canvas引用
      this.animator.canvas = this.npcElement.querySelector('.npc-sprite');
      this.animator.ctx = this.animator.canvas ? this.animator.canvas.getContext('2d') : null;
      // 重启动画
      this.animator.startAnimation('IDLE_1');
      console.log('✓ NPC动画已重启');
    } else {
      // 首次加载子系统
      this.loadSubsystems();
    }
    
    this.setupEventListeners();
    this.update();
  }

  /**
   * 延迟加载子系统
   */
  async loadSubsystems() {
    try {
      // 加载NPCAnimator
      const { NPCAnimator } = await import('./NPCAnimator.js');
      this.animator = new NPCAnimator(this);
      
      // 等待精灵图加载完成后再启动动画
      await this.animator.loadSprite();
      this.animator.startAnimation('IDLE_1');
      
      // 加载DialogueSystem
      const { DialogueSystem } = await import('./DialogueSystem.js');
      this.dialogueSystem = new DialogueSystem(this);
      
      // 加载GiftSystem
      const { GiftSystem } = await import('./GiftSystem.js');
      this.giftSystem = new GiftSystem(this);
      
      // 加载AffinityDisplay
      const { AffinityDisplay } = await import('./AffinityDisplay.js');
      this.affinityDisplay = new AffinityDisplay(this);
      
      // 确保好感度显示立即渲染
      if (this.affinityDisplay) {
        // 等待爱心素材加载完成
        setTimeout(() => {
          if (this.affinityDisplay.isLoaded) {
            this.affinityDisplay.render();
          }
        }, 100);
      }
      
      console.log('✓ NPC子系统已加载');
    } catch (error) {
      console.error('✗ NPC子系统加载失败:', error);
    }
  }

  /**
   * 创建NPC元素
   * @returns {HTMLElement} NPC元素
   */
  createNPCElement() {
    const npcEl = document.createElement('div');
    npcEl.className = 'blacksmith-npc';
    npcEl.innerHTML = `
      <canvas class="npc-sprite" width="128" height="128"></canvas>
      <div class="npc-info">
        <div class="npc-level">等级 <span id="npc-level-value">1</span></div>
        <div class="npc-affinity">
          <span id="npc-affinity-title">陌生</span>
          <div class="affinity-bar">
            <div class="affinity-progress" id="npc-affinity-progress" style="width: 0%"></div>
          </div>
        </div>
      </div>
    `;
    return npcEl;
  }

  /**
   * 设置事件监听
   */
  setupEventListeners() {
    if (!this.npcElement) return;
    
    // 添加tooltip属性
    this.npcElement.setAttribute('title', '单击进行对话');
    
    this.npcElement.addEventListener('click', () => {
      this.onNPCClick();
    });
    
    // 添加悬停效果（不再添加npc-hover类，因为不需要缩放）
    this.npcElement.addEventListener('mouseenter', () => {
      // 可以在这里添加其他悬停效果，比如光标变化
      this.npcElement.style.cursor = 'pointer';
    });
    
    this.npcElement.addEventListener('mouseleave', () => {
      // 清理悬停效果
    });
  }

  /**
   * NPC点击事件
   */
  onNPCClick() {
    if (!this.dialogueSystem) {
      console.warn('对话系统未初始化');
      return;
    }
    
    // 播放点击音效
    if (window.AudioManager && typeof window.AudioManager.playClick === 'function') {
      window.AudioManager.playClick();
    }
    
    // 如果对话正在进行中，推进到下一句
    if (this.dialogueSystem.isShowing) {
      this.dialogueSystem.onDialogueClick();
    } else {
      // 否则开始新对话
      this.dialogueSystem.showDialogue();
    }
  }

  /**
   * 更新NPC显示
   */
  update() {
    if (!this.forgeUI.blacksmithSystem || !this.forgeUI.blacksmithSystem.blacksmithNPC) {
      console.warn('BlacksmithNPC系统未初始化');
      return;
    }
    
    const blacksmithNPC = this.forgeUI.blacksmithSystem.blacksmithNPC;
    const info = blacksmithNPC.getInfo();
    
    // 更新等级
    const levelEl = this.npcElement.querySelector('#npc-level-value');
    if (levelEl) levelEl.textContent = info.level;
    
    // 更新好感度称号
    const titleEl = this.npcElement.querySelector('#npc-affinity-title');
    if (titleEl) titleEl.textContent = info.affinityTitle;
    
    // 更新好感度进度条
    const progressEl = this.npcElement.querySelector('#npc-affinity-progress');
    if (progressEl) {
      const progress = parseFloat(info.expProgress) || 0;
      progressEl.style.width = `${progress}%`;
    }
    
    // 更新好感度显示
    if (this.affinityDisplay) {
      this.affinityDisplay.update();
    }
    
    // 根据等级更新NPC外观
    this.updateAppearance(info.level);
  }

  /**
   * 更新NPC外观
   * @param {number} level - 铁匠等级
   */
  updateAppearance(level) {
    if (!this.npcElement) return;
    
    // 移除所有等级类
    this.npcElement.classList.remove('master-blacksmith', 'expert-blacksmith', 'apprentice-blacksmith');
    
    // 根据等级添加对应的装饰类
    if (level >= 10) {
      this.npcElement.classList.add('master-blacksmith');
    } else if (level >= 5) {
      this.npcElement.classList.add('expert-blacksmith');
    } else if (level >= 2) {
      this.npcElement.classList.add('apprentice-blacksmith');
    }
  }

  /**
   * 播放锻造动画
   */
  playHammeringAnimation() {
    if (!this.animator) {
      console.warn('动画器未初始化');
      return;
    }
    
    this.animator.startAnimation('HAMMERING');
    
    // 2秒后恢复待机动画
    setTimeout(() => {
      if (this.animator) {
        this.animator.startAnimation('IDLE_1');
      }
    }, 2000);
  }

  /**
   * 播放完成动画
   */
  playCompleteAnimation() {
    if (!this.animator) {
      console.warn('动画器未初始化');
      return;
    }
    
    this.animator.startAnimation('COMPLETE');
    
    // 1.5秒后恢复待机动画
    setTimeout(() => {
      if (this.animator) {
        this.animator.startAnimation('IDLE_1');
      }
    }, 1500);
  }

  /**
   * 清理资源
   */
  cleanup() {
    if (this.animator) {
      this.animator.stopAnimation();
    }
    
    if (this.dialogueSystem) {
      this.dialogueSystem.hideDialogue();
    }
    
    if (this.giftSystem) {
      this.giftSystem.hideGiftSelection();
    }
    
    if (this.npcElement && this.npcElement.parentElement) {
      this.npcElement.parentElement.removeChild(this.npcElement);
    }
    
    this.npcElement = null;
    this.animator = null;
    this.dialogueSystem = null;
    this.giftSystem = null;
  }
}
