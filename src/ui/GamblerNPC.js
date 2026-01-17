// GamblerNPC.js - 赌徒 NPC
// 提供上下文感知的对话系统

/**
 * GamblerNPC - 赌徒 NPC 对话系统
 * 根据游戏状态和旋转结果提供动态对话
 */
export class GamblerNPC {
  constructor() {
    this.dialogueElement = null;
    this.currentDialogue = null;
    this.dialogueTimeout = null;
    
    // 对话库
    this.dialogues = {
      welcome: [
        '手气不错，陌生人？老虎机知道你的命运...',
        '来试试运气吧，命运女神今天心情不错。',
        '欢迎来到命运的老虎机，准备好了吗？'
      ],
      nearMiss: [
        '哎呀，差一点！',
        '就差那么一点点！',
        '下次一定能中！',
        '运气正在积聚...'
      ],
      legendary: [
        '天选之人！',
        '不可思议！命运女神眷顾着你！',
        '这是我见过最幸运的人！',
        '传说级的运气！'
      ],
      jackpot: [
        '不可思议！JACKPOT！',
        '这...这怎么可能！你赢得了大奖！',
        '命运女神今天一定喝醉了！',
        '我从未见过如此幸运的人！'
      ],
      highPity: [
        '我感觉到你的运气正在积聚...',
        '坚持住，好运即将到来。',
        '运气的天平正在向你倾斜...',
        '下一次，一定是下一次！'
      ],
      trash: [
        '嗯...至少你试过了。',
        '运气不是每次都站在你这边。',
        '别灰心，再试一次吧。'
      ],
      lowGold: [
        '看起来你的钱包有点空了...',
        '要不要考虑先去冒险赚点金币？',
        '金币不够了？去地牢里找找吧。'
      ],
      epic: [
        '哇！史诗级的运气！',
        '看来命运女神对你微笑了！',
        '这可不常见！'
      ],
      rare: [
        '不错的运气！',
        '稀有物品，值得庆祝！',
        '看来今天是你的幸运日。'
      ]
    };
  }

  /**
   * 说话
   * @param {string} message - 消息内容
   * @param {number} duration - 持续时间（毫秒）
   */
  say(message, duration = 3000) {
    if (!this.dialogueElement) {
      this.createDialogueElement();
    }

    // 清除之前的超时
    if (this.dialogueTimeout) {
      clearTimeout(this.dialogueTimeout);
    }

    // 设置消息
    this.currentDialogue = message;
    this.dialogueElement.textContent = message;
    
    // 显示对话气泡
    this.dialogueElement.style.opacity = '0';
    this.dialogueElement.style.display = 'block';
    
    // 淡入动画
    setTimeout(() => {
      this.dialogueElement.style.transition = 'opacity 300ms ease-in';
      this.dialogueElement.style.opacity = '1';
    }, 10);

    // 自动隐藏
    this.dialogueTimeout = setTimeout(() => {
      this.hide();
    }, duration);
  }

  /**
   * 获取上下文对话
   * @param {Object} context - 上下文对象
   * @returns {string} 对话内容
   */
  getContextualDialogue(context) {
    const {
      result,
      pityCount = 0,
      isNearMiss = false,
      consecutiveRare = 0,
      playerGold = 0
    } = context;

    // 优先级：大奖 > 传说 > 差一点 > 史诗 > 稀有 > 高保底 > 低金币 > 垃圾
    
    if (result.quality === 'JACKPOT') {
      return this.getRandomDialogue('jackpot');
    }

    if (result.quality === 'LEGENDARY') {
      return this.getRandomDialogue('legendary');
    }

    if (isNearMiss) {
      return this.getRandomDialogue('nearMiss');
    }

    if (result.quality === 'EPIC') {
      return this.getRandomDialogue('epic');
    }

    if (result.quality === 'RARE') {
      return this.getRandomDialogue('rare');
    }

    if (pityCount >= 7) {
      return this.getRandomDialogue('highPity');
    }

    if (playerGold < 100) {
      return this.getRandomDialogue('lowGold');
    }

    if (result.type === 'trash') {
      return this.getRandomDialogue('trash');
    }

    return this.getRandomDialogue('welcome');
  }

  /**
   * 获取随机对话
   * @param {string} category - 对话类别
   * @returns {string} 对话内容
   */
  getRandomDialogue(category) {
    const dialogues = this.dialogues[category] || this.dialogues.welcome;
    return dialogues[Math.floor(Math.random() * dialogues.length)];
  }

  /**
   * 创建对话元素
   */
  createDialogueElement() {
    this.dialogueElement = document.createElement('div');
    this.dialogueElement.className = 'gambler-npc-dialogue';
    this.dialogueElement.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0, 0, 0, 0.9);
      color: #ffcc00;
      padding: 15px 25px;
      border-radius: 10px;
      border: 2px solid #d4af37;
      font-size: 16px;
      font-style: italic;
      text-align: center;
      max-width: 400px;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.5);
      z-index: 10000;
      display: none;
      opacity: 0;
      pointer-events: none;
    `;

    // 添加三角形指示器
    const triangle = document.createElement('div');
    triangle.style.cssText = `
      position: absolute;
      bottom: -10px;
      left: 50%;
      transform: translateX(-50%);
      width: 0;
      height: 0;
      border-left: 10px solid transparent;
      border-right: 10px solid transparent;
      border-top: 10px solid #d4af37;
    `;
    this.dialogueElement.appendChild(triangle);

    document.body.appendChild(this.dialogueElement);
  }

  /**
   * 隐藏对话
   */
  hide() {
    if (!this.dialogueElement) return;

    this.dialogueElement.style.transition = 'opacity 300ms ease-out';
    this.dialogueElement.style.opacity = '0';

    setTimeout(() => {
      if (this.dialogueElement) {
        this.dialogueElement.style.display = 'none';
      }
    }, 300);

    if (this.dialogueTimeout) {
      clearTimeout(this.dialogueTimeout);
      this.dialogueTimeout = null;
    }
  }

  /**
   * 销毁
   */
  destroy() {
    this.hide();
    if (this.dialogueElement && this.dialogueElement.parentNode) {
      this.dialogueElement.parentNode.removeChild(this.dialogueElement);
    }
    this.dialogueElement = null;
  }
}
