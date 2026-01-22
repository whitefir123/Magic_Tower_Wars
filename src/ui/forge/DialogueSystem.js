/**
 * DialogueSystem - NPC对话系统
 * 
 * 处理铁匠NPC的对话显示和交互（轻量级气泡模式）
 */

export class DialogueSystem {
  constructor(npcRenderer) {
    this.npcRenderer = npcRenderer;
    this.dialogueElement = null;
    this.optionsElement = null; // 选项气泡
    this.dialogueQueue = []; // 对话队列
    this.currentDialogueIndex = 0;
    this.isShowing = false;
    this.waitingForChoice = false; // 是否等待玩家选择
  }

  /**
   * 显示对话
   * @param {string} context - 对话上下文（可选，默认为'greeting'）
   */
  showDialogue(context = 'greeting') {
    const blacksmithNPC = this.getBlacksmithNPC();
    if (!blacksmithNPC) {
      console.warn('BlacksmithNPC未初始化');
      return;
    }
    
    // 获取对话内容
    const dialogue = blacksmithNPC.getDialogue(context);
    
    // 构建对话队列（支持选项）
    this.buildDialogueQueue(dialogue, context);
    this.currentDialogueIndex = 0;
    this.isShowing = true;
    
    // 显示第一句对话
    this.showNextDialogue();
  }

  /**
   * 构建对话队列
   * @param {string} dialogue - 对话文本
   * @param {string} context - 对话上下文
   */
  buildDialogueQueue(dialogue, context) {
    // 分割对话文本
    const sentences = this.splitDialogue(dialogue);
    
    this.dialogueQueue = [];
    
    // 添加对话句子
    sentences.forEach(sentence => {
      this.dialogueQueue.push({
        type: 'text',
        content: sentence
      });
    });
    
    // 根据上下文添加选项
    if (context === 'greeting') {
      this.dialogueQueue.push({
        type: 'choice',
        question: '你想做什么？',
        options: [
          { text: '闲聊', action: 'chat' },
          { text: '送礼', action: 'gift' },
          { text: '离开', action: 'leave' }
        ]
      });
    }
  }

  /**
   * 分割对话文本
   * @param {string} text - 对话文本
   * @returns {Array<string>} 对话数组
   */
  splitDialogue(text) {
    // 简单分割：按句号、问号、感叹号分割
    const sentences = text.split(/([。！？.!?])/g);
    const dialogues = [];
    
    for (let i = 0; i < sentences.length; i += 2) {
      if (sentences[i] && sentences[i].trim()) {
        const sentence = sentences[i] + (sentences[i + 1] || '');
        dialogues.push(sentence.trim());
      }
    }
    
    // 如果没有分割成功，返回原文本
    return dialogues.length > 0 ? dialogues : [text];
  }

  /**
   * 显示下一句对话
   */
  showNextDialogue() {
    if (this.currentDialogueIndex >= this.dialogueQueue.length) {
      // 对话结束
      this.hideDialogue();
      return;
    }
    
    const dialogueItem = this.dialogueQueue[this.currentDialogueIndex];
    
    if (dialogueItem.type === 'text') {
      // 普通文本对话
      const isLastDialogue = this.currentDialogueIndex === this.dialogueQueue.length - 1;
      this.createOrUpdateDialogueElement(dialogueItem.content, isLastDialogue);
      this.currentDialogueIndex++;
      
      // 更新好感度显示位置
      this.updateAffinityDisplayPosition();
    } else if (dialogueItem.type === 'choice') {
      // 选项对话
      this.showChoiceDialogue(dialogueItem);
    }
  }

  /**
   * 显示选项对话
   * @param {Object} dialogueItem - 对话项
   */
  showChoiceDialogue(dialogueItem) {
    // 显示问题
    this.createOrUpdateDialogueElement(dialogueItem.question, false);
    
    // 隐藏指示器（因为需要等待选择）
    const indicator = this.dialogueElement?.querySelector('.dialogue-bubble-indicator');
    if (indicator) {
      indicator.style.display = 'none';
    }
    
    // 显示选项
    this.showOptions(dialogueItem.options);
    this.waitingForChoice = true;
  }

  /**
   * 显示选项气泡
   * @param {Array} options - 选项数组
   */
  showOptions(options) {
    // 移除旧的选项气泡
    if (this.optionsElement) {
      this.optionsElement.remove();
    }
    
    // 创建选项气泡
    this.optionsElement = document.createElement('div');
    this.optionsElement.className = 'dialogue-options-bubble';
    
    // 添加选项按钮
    options.forEach(option => {
      const btn = document.createElement('button');
      btn.className = 'dialogue-option-btn';
      // 只显示文字，不显示图标
      btn.innerHTML = `<span class="option-text">${option.text}</span>`;
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.onOptionClick(option);
      });
      this.optionsElement.appendChild(btn);
    });
    
    // 添加到铁匠铺overlay中
    const forgeOverlay = document.getElementById('forge-overlay');
    if (forgeOverlay) {
      forgeOverlay.appendChild(this.optionsElement);
    } else {
      document.body.appendChild(this.optionsElement);
    }
    
    // 定位选项气泡
    this.positionOptionsBubble();
    
    // 添加淡入动画
    setTimeout(() => {
      if (this.optionsElement) {
        this.optionsElement.classList.add('options-fade-in');
      }
    }, 10);
  }

  /**
   * 定位选项气泡
   */
  positionOptionsBubble() {
    if (!this.optionsElement || !this.dialogueElement) {
      return;
    }
    
    const dialogueRect = this.dialogueElement.getBoundingClientRect();
    
    // 选项气泡显示在对话框右侧
    const left = dialogueRect.right + 15; // 15px间距
    const top = dialogueRect.top; // 与对话框顶部对齐
    
    this.optionsElement.style.left = `${left}px`;
    this.optionsElement.style.top = `${top}px`;
  }

  /**
   * 选项点击处理
   * @param {Object} option - 选项对象
   */
  onOptionClick(option) {
    // 播放点击音效
    if (window.AudioManager && typeof window.AudioManager.playClick === 'function') {
      window.AudioManager.playClick();
    }
    
    // 隐藏选项气泡
    this.hideOptions();
    
    this.waitingForChoice = false;
    this.currentDialogueIndex++;
    
    // 处理选项动作
    this.handleOptionAction(option);
  }

  /**
   * 处理选项动作
   * @param {Object} option - 选项对象
   */
  handleOptionAction(option) {
    const blacksmithNPC = this.getBlacksmithNPC();
    
    switch (option.action) {
      case 'chat':
        // 闲聊：先显示闲聊内容，然后增加好感度
        if (blacksmithNPC) {
          // 获取闲聊对话
          const chatDialogue = blacksmithNPC.getDialogue('chat');
          
          // 添加闲聊对话
          this.dialogueQueue.push({
            type: 'text',
            content: chatDialogue
          });
          
          // 增加好感度（飘字由AffinityDisplay自动处理）
          blacksmithNPC.increaseAffinity('dialogue_choice');
          
          // 添加好感度增加的回应
          const responseDialogue = blacksmithNPC.getDialogue('affinity_increase');
          this.dialogueQueue.push({
            type: 'text',
            content: responseDialogue
          });
          
          // 更新NPC显示
          if (this.npcRenderer) {
            this.npcRenderer.update();
          }
        }
        
        // 继续对话
        this.showNextDialogue();
        break;
        
      case 'gift':
        // 送礼：打开送礼界面
        this.hideDialogue();
        if (this.npcRenderer && this.npcRenderer.giftSystem) {
          this.npcRenderer.giftSystem.showGiftSelection();
        }
        break;
        
      case 'leave':
        // 离开：关闭对话
        this.hideDialogue();
        break;
        
      default:
        // 默认：继续对话
        this.showNextDialogue();
    }
  }

  /**
   * 创建或更新对话元素
   * @param {string} text - 对话文本
   * @param {boolean} isLastDialogue - 是否是最后一句对话
   */
  createOrUpdateDialogueElement(text, isLastDialogue) {
    if (!this.dialogueElement) {
      // 创建对话气泡
      this.dialogueElement = document.createElement('div');
      this.dialogueElement.className = 'npc-dialogue-bubble';
      this.dialogueElement.innerHTML = `
        <div class="dialogue-bubble-content">
          <p class="dialogue-bubble-text"></p>
          <div class="dialogue-bubble-indicator">▼</div>
        </div>
      `;
      
      // 添加到铁匠铺overlay中
      const forgeOverlay = document.getElementById('forge-overlay');
      if (forgeOverlay) {
        forgeOverlay.appendChild(this.dialogueElement);
      } else {
        document.body.appendChild(this.dialogueElement);
      }
      
      // 绑定点击事件
      this.dialogueElement.addEventListener('click', (e) => {
        e.stopPropagation();
        this.onDialogueClick();
      });
      
      // 添加淡入动画
      setTimeout(() => {
        if (this.dialogueElement) {
          this.dialogueElement.classList.add('bubble-fade-in');
        }
      }, 10);
    }
    
    // 更新文本
    const textEl = this.dialogueElement.querySelector('.dialogue-bubble-text');
    if (textEl) {
      // 打字机效果
      this.typewriterEffect(textEl, text);
    }
    
    // 更新指示器显示
    const indicator = this.dialogueElement.querySelector('.dialogue-bubble-indicator');
    if (indicator) {
      indicator.style.display = (isLastDialogue || this.waitingForChoice) ? 'none' : 'block';
    }
    
    // 定位对话框到NPC头顶
    this.positionDialogueBubble();
  }

  /**
   * 打字机效果
   * @param {HTMLElement} element - 文本元素
   * @param {string} text - 要显示的文本
   */
  typewriterEffect(element, text) {
    element.textContent = '';
    let index = 0;
    
    const type = () => {
      if (index < text.length) {
        element.textContent += text.charAt(index);
        index++;
        setTimeout(type, 30); // 每个字符30ms
      }
    };
    
    type();
  }

  /**
   * 定位对话气泡到NPC头顶
   */
  positionDialogueBubble() {
    if (!this.dialogueElement || !this.npcRenderer || !this.npcRenderer.npcElement) {
      return;
    }
    
    const npcElement = this.npcRenderer.npcElement;
    const npcRect = npcElement.getBoundingClientRect();
    
    // 计算对话框位置（NPC上方）
    const bubbleWidth = 300; // 对话框宽度
    const bubbleHeight = this.dialogueElement.offsetHeight || 100;
    const offset = 20; // 与NPC的间距
    
    // 水平居中对齐NPC
    const left = npcRect.left + (npcRect.width / 2) - (bubbleWidth / 2);
    // 垂直位置在NPC上方
    const top = npcRect.top - bubbleHeight - offset;
    
    this.dialogueElement.style.left = `${left}px`;
    this.dialogueElement.style.top = `${top}px`;
    this.dialogueElement.style.width = `${bubbleWidth}px`;
  }

  /**
   * 对话框点击事件
   */
  onDialogueClick() {
    // 如果正在等待选择，不响应点击
    if (this.waitingForChoice) {
      return;
    }
    
    // 播放点击音效
    if (window.AudioManager && typeof window.AudioManager.playClick === 'function') {
      window.AudioManager.playClick();
    }
    
    // 显示下一句对话
    this.showNextDialogue();
  }

  /**
   * 显示浮动消息（飘字效果）
   * @param {string} message - 消息内容
   * @param {string} type - 消息类型 ('info', 'success', 'warning', 'error')
   */
  showFloatingMessage(message, type = 'info') {
    const messageEl = document.createElement('div');
    messageEl.className = `floating-text floating-text-${type}`;
    messageEl.textContent = message;
    
    // 定位到爱心位置
    if (this.npcRenderer && this.npcRenderer.affinityDisplay && this.npcRenderer.affinityDisplay.displayElement) {
      const affinityRect = this.npcRenderer.affinityDisplay.displayElement.getBoundingClientRect();
      messageEl.style.left = `${affinityRect.left + affinityRect.width / 2}px`;
      messageEl.style.top = `${affinityRect.top}px`;
    } else if (this.npcRenderer && this.npcRenderer.npcElement) {
      // 如果没有爱心显示，定位到NPC上方
      const npcRect = this.npcRenderer.npcElement.getBoundingClientRect();
      messageEl.style.left = `${npcRect.left + npcRect.width / 2}px`;
      messageEl.style.top = `${npcRect.top - 50}px`;
    }
    
    const forgeOverlay = document.getElementById('forge-overlay');
    if (forgeOverlay) {
      forgeOverlay.appendChild(messageEl);
    } else {
      document.body.appendChild(messageEl);
    }
    
    // 添加动画
    setTimeout(() => messageEl.classList.add('show'), 10);
    
    // 1.5秒后移除
    setTimeout(() => {
      messageEl.classList.remove('show');
      setTimeout(() => messageEl.remove(), 500);
    }, 1500);
  }

  /**
   * 隐藏选项气泡
   */
  hideOptions() {
    if (this.optionsElement) {
      this.optionsElement.classList.remove('options-fade-in');
      this.optionsElement.classList.add('options-fade-out');
      
      setTimeout(() => {
        if (this.optionsElement && this.optionsElement.parentElement) {
          this.optionsElement.parentElement.removeChild(this.optionsElement);
        }
        this.optionsElement = null;
      }, 300);
    }
  }

  /**
   * 隐藏对话
   */
  hideDialogue() {
    // 隐藏选项
    this.hideOptions();
    
    if (this.dialogueElement) {
      // 添加淡出动画
      this.dialogueElement.classList.remove('bubble-fade-in');
      this.dialogueElement.classList.add('bubble-fade-out');
      
      // 动画结束后移除元素
      setTimeout(() => {
        if (this.dialogueElement && this.dialogueElement.parentElement) {
          this.dialogueElement.parentElement.removeChild(this.dialogueElement);
        }
        this.dialogueElement = null;
        this.isShowing = false;
        this.dialogueQueue = [];
        this.currentDialogueIndex = 0;
        this.waitingForChoice = false;
        
        // 更新好感度显示位置（回到NPC头顶）
        this.updateAffinityDisplayPosition();
      }, 300);
    }
  }

  /**
   * 更新好感度显示位置
   */
  updateAffinityDisplayPosition() {
    if (this.npcRenderer && this.npcRenderer.affinityDisplay) {
      this.npcRenderer.affinityDisplay.positionDisplay();
    }
  }

  /**
   * 获取BlacksmithNPC实例
   * @returns {Object|null} BlacksmithNPC实例
   */
  getBlacksmithNPC() {
    if (!this.npcRenderer || !this.npcRenderer.forgeUI) {
      return null;
    }
    
    const blacksmithSystem = this.npcRenderer.forgeUI.blacksmithSystem;
    if (!blacksmithSystem || !blacksmithSystem.blacksmithNPC) {
      return null;
    }
    
    return blacksmithSystem.blacksmithNPC;
  }

  /**
   * 清理资源
   */
  cleanup() {
    this.hideDialogue();
    this.dialogueQueue = [];
    this.currentDialogueIndex = 0;
  }
}
