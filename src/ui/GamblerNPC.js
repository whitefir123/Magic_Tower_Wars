// GamblerNPC.js - 赌徒 NPC
// 提供上下文感知的对话系统，带自动催促机制

/**
 * GamblerNPC - 赌徒 NPC 对话系统
 * 直接使用 GamblerUI 的 messageText 元素显示对话
 * 支持自动催促：欢迎语/评判语 3秒后开始每4秒显示催促语
 */
export class GamblerNPC {
  constructor(messageElement = null) {
    this.messageElement = messageElement; // 使用外部提供的元素
    this.currentDialogue = null;
    this.dialogueTimeout = null;
    
    // 催促系统
    this.urgeInterval = null;
    this.isUrging = false;
    this.hasShownWelcome = false; // 标记是否已显示欢迎语
    
    // 添加一个回调函数，用于检查界面是否仍然打开
    this.isActiveCallback = null;
    
    // 对话库
    this.dialogues = {
      welcome: [
        '手气不错，陌生人？老虎机知道你的命运...',
        '来试试运气吧，命运女神今天心情不错。',
        '欢迎来到命运的老虎机，准备好了吗？',
        '又见面了，你的钱包准备好了吗？',
        '听说今天有人中了大奖...不过不是你。',
        '这台机器已经很久没吐钱了，也许今天？',
        '我的老虎机从不说谎，只是有时候...它喜欢开玩笑。',
        '欢迎光临！顺便说一句，我上个月刚买了新房子。',
        '看你这运气，要不要先去神殿祈祷一下？',
        '别担心，输了还可以再来...只要你还有钱。'
      ],
      urge: [
        '还愣着干什么？再来一把啊！',
        '别光看着，机器不会自己转的。',
        '怎么，刚才那把吓到你了？继续啊！',
        '时间就是金币，朋友。快点决定吧。',
        '我的机器可等不了太久，它饿了。',
        '发呆不会让你变富，但拉杆会...也许。',
        '你是来赌的还是来参观的？',
        '犹豫就会败北，果断就会...好吧，也可能败北。',
        '别想太多，想多了就不敢玩了。',
        '看你这纠结的样子，是不是该吃点勇气药水？',
        '机会不等人，虽然厄运会。',
        '你站在这里的每一秒，都是我赚钱的机会。',
        '要不要我帮你拉杆？当然，得加钱。',
        '命运在召唤你...或者是我的钱包在召唤你的金币。',
        '别磨蹭了，地牢里的怪物都比你果断。',
        '你这犹豫的样子，让我想起了我的前妻...算了，继续吧。',
        '快点快点，我还等着关门回家呢。',
        '你知道吗？犹豫的时候运气会溜走的。',
        '再不玩我就要打烊了...开玩笑的，我24小时营业。',
        '看你这表情，是不是在计算概率？别算了，没用的。'
      ],
      nearMiss: [
        '哎呀，差一点！',
        '就差那么一点点！',
        '下次一定能中！',
        '运气正在积聚...',
        '看到了吗？希望就在眼前...然后溜走了。',
        '差一点就发财了，人生不就是这样吗？',
        '这么近又那么远，就像你和财富的距离。',
        '机器在嘲笑你，但我不会...至少不当面。',
        '命运女神刚才打了个喷嚏，所以你差点中了。'
      ],
      legendary: [
        '天选之人！',
        '不可思议！命运女神眷顾着你！',
        '这是我见过最幸运的人！',
        '传说级的运气！',
        '我...我需要检查一下机器是不是坏了。',
        '等等，让我确认一下这不是在做梦。',
        '你是不是偷偷贿赂了命运女神？',
        '好吧，看来今天我要破产了。',
        '传说中的幸运儿！快去买彩票吧！',
        '这种运气...你确定没有作弊？开玩笑的。'
      ],
      jackpot: [
        '不可思议！JACKPOT！',
        '这...这怎么可能！你赢得了大奖！',
        '命运女神今天一定喝醉了！',
        '我从未见过如此幸运的人！',
        '等等...让我再数一遍...天啊，真的是JACKPOT！',
        '我的积蓄...我是说，恭喜你！',
        '你知道吗？这个奖池我攒了好久...算了，拿去吧。',
        '我现在严重怀疑你是命运女神的私生子。',
        '好消息：你中了大奖。坏消息：我得吃土了。',
        '这一刻，我的心在滴血...但恭喜你！'
      ],
      highPity: [
        '我感觉到你的运气正在积聚...',
        '坚持住，好运即将到来。',
        '运气的天平正在向你倾斜...',
        '下一次，一定是下一次！',
        '你的霉运快用完了，我保证...大概。',
        '再输几次，保底就到了！多么美妙的机制。',
        '看你这表情，是不是该触发保底了？',
        '别放弃！黎明前总是最黑暗的...然后继续黑暗。',
        '你的运气账户已经透支了，该还债了。',
        '我闻到了好运的味道...或者是我的晚餐糊了？'
      ],
      trash: [
        '嗯...至少你试过了。',
        '运气不是每次都站在你这边。',
        '别灰心，再试一次吧。',
        '看，一块幸运石！虽然没什么用，但至少不是空气。',
        '恭喜！你获得了...呃...这个。',
        '这就是人生，充满了惊喜...和垃圾。',
        '别难过，至少你还有我陪着你。',
        '你知道吗？有些人连这个都抽不到。',
        '这个结果很有收藏价值...如果你喜欢收藏垃圾的话。',
        '命运女神：哈哈哈哈！我：抱歉。',
        '看开点，至少你还活着...暂时。'
      ],
      lowGold: [
        '看起来你的钱包有点空了...',
        '要不要考虑先去冒险赚点金币？',
        '金币不够了？去地牢里找找吧。',
        '穷鬼也想赌博？我喜欢你的勇气。',
        '你的钱包比我的良心还空。',
        '没钱了？那就去打怪啊，这里又不是慈善机构。',
        '贫穷限制了你的想象力...和赌博次数。',
        '看你这样子，是不是该去找铁匠借点钱？',
        '金币不够？要不要考虑卖点装备？'
      ],
      epic: [
        '哇！史诗级的运气！',
        '看来命运女神对你微笑了！',
        '这可不常见！',
        '史诗装备！你今天走运了！',
        '不错不错，我都有点嫉妒了。',
        '看来你的运气账户还有余额。',
        '史诗级！虽然不是传说，但也不错了。',
        '命运女神今天心情还行，给了你点好东西。',
        '这个结果让我想起了我的初恋...美好但短暂。'
      ],
      rare: [
        '不错的运气！',
        '稀有物品，值得庆祝！',
        '看来今天是你的幸运日。',
        '稀有品质！比垃圾强多了。',
        '还行，至少不是最差的。',
        '这个结果...中规中矩，就像你的人生。',
        '稀有装备，够用了，别太贪心。',
        '看，蓝色的！虽然不是紫色，但也不错。',
        '命运女神给了你一个及格分。'
      ],
      spinning: [
        '祝你好运...',
        '命运的齿轮正在转动...',
        '让我们看看会发生什么...',
        '屏住呼吸...',
        '奇迹即将发生...或许。',
        '机器正在思考...',
        '命运女神正在掷骰子...',
        '你的运气正在被评估中...',
        '稍等，让我摇一摇...',
        '这次会是什么呢？'
      ]
    };
  }

  /**
   * 设置消息元素
   */
  setMessageElement(element) {
    this.messageElement = element;
  }

  /**
   * 设置活动状态检查回调
   * @param {Function} callback - 返回 true 表示界面仍然打开
   */
  setActiveCallback(callback) {
    this.isActiveCallback = callback;
  }

  /**
   * 检查是否应该继续显示消息
   */
  isActive() {
    if (this.isActiveCallback) {
      return this.isActiveCallback();
    }
    return true; // 默认返回 true（向后兼容）
  }

  /**
   * 说话
   */
  say(message, duration = 5000, startUrge = false) {
    if (!this.messageElement) {
      console.warn('[GamblerNPC] 没有消息元素');
      return;
    }

    // 停止之前的催促
    this.stopUrging();

    // 清除之前的超时
    if (this.dialogueTimeout) {
      clearTimeout(this.dialogueTimeout);
    }

    // 直接更新文本，统一使用金色
    this.currentDialogue = message;
    this.messageElement.textContent = message;
    this.messageElement.style.color = '#ffcc00';
    
    console.log('[GamblerNPC] 显示消息:', message);

    // 启动催促或等待
    if (startUrge) {
      this.dialogueTimeout = setTimeout(() => {
        this.startUrging();
      }, duration);
    }
  }

  /**
   * 显示欢迎语（仅首次）
   */
  showWelcome() {
    if (this.hasShownWelcome) {
      // 已经显示过欢迎语，直接开始催促
      this.startUrging();
      return;
    }
    
    const welcomeMsg = this.getRandomDialogue('welcome');
    this.say(welcomeMsg, 5000, true); // 5秒后启动催促
    this.hasShownWelcome = true;
    console.log('[GamblerNPC] 显示欢迎语，5秒后开始催促');
  }

  /**
   * 显示等待语（抽奖中）
   */
  showSpinning() {
    this.stopUrging();
    
    // 清除之前的定时器，防止催促在抽奖中触发
    if (this.dialogueTimeout) {
      clearTimeout(this.dialogueTimeout);
      this.dialogueTimeout = null;
    }
    
    if (!this.messageElement) {
      console.warn('[GamblerNPC] 没有消息元素');
      return;
    }

    const spinningMsg = this.getRandomDialogue('spinning');
    this.currentDialogue = spinningMsg;
    this.messageElement.textContent = spinningMsg;
    this.messageElement.style.color = '#ffcc00'; // 统一使用金色
    
    console.log('[GamblerNPC] 显示等待语:', spinningMsg);
  }

  /**
   * 显示评判语（抽奖结果）
   */
  showJudgement(context) {
    const dialogue = this.getContextualDialogue(context);
    this.say(dialogue, 5000, true); // 5秒后启动催促
    console.log('[GamblerNPC] 显示评判语，5秒后开始催促');
  }

  /**
   * 启动催促系统
   */
  startUrging() {
    // 检查界面是否仍然打开
    if (!this.isActive()) {
      console.log('[GamblerNPC] 界面已关闭，取消启动催促系统');
      return;
    }
    
    this.stopUrging();
    
    console.log('[GamblerNPC] 启动催促系统：立即显示第一条，之后每4秒更新');
    
    // 立即显示第一条催促语
    this.showUrgeMessage();
    
    // 之后每4秒显示新的催促语
    this.urgeInterval = setInterval(() => {
      // 每次显示前检查界面是否仍然打开
      if (!this.isActive()) {
        console.log('[GamblerNPC] 界面已关闭，停止催促系统');
        this.stopUrging();
        return;
      }
      this.showUrgeMessage();
    }, 4000);
    
    this.isUrging = true;
  }

  /**
   * 停止催促系统
   */
  stopUrging() {
    if (this.urgeInterval) {
      clearInterval(this.urgeInterval);
      this.urgeInterval = null;
    }
    
    // 同时清除 dialogueTimeout，防止延迟启动催促
    if (this.dialogueTimeout) {
      clearTimeout(this.dialogueTimeout);
      this.dialogueTimeout = null;
    }
    
    this.isUrging = false;
    console.log('[GamblerNPC] 停止催促系统');
  }

  /**
   * 显示催促消息
   */
  showUrgeMessage() {
    // 检查界面是否仍然打开
    if (!this.isActive()) {
      console.log('[GamblerNPC] 界面已关闭，取消显示催促消息');
      this.stopUrging();
      return;
    }
    
    if (!this.messageElement) {
      console.warn('[GamblerNPC] 没有消息元素');
      return;
    }

    const urgeMsg = this.getRandomDialogue('urge');
    this.currentDialogue = urgeMsg;
    this.messageElement.textContent = urgeMsg;
    this.messageElement.style.color = '#ffcc00'; // 统一使用金色
    
    console.log('[GamblerNPC] 催促:', urgeMsg);
  }

  /**
   * 重置欢迎语标记
   */
  resetWelcome() {
    this.hasShownWelcome = false;
    console.log('[GamblerNPC] 重置欢迎语标记');
  }

  /**
   * 获取上下文对话
   */
  getContextualDialogue(context) {
    const {
      result,
      pityCount = 0,
      isNearMiss = false,
      playerGold = 0
    } = context;

    console.log('[GamblerNPC] Context:', { 
      quality: result?.quality, 
      type: result?.type,
      pityCount, 
      isNearMiss, 
      playerGold 
    });

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
   */
  getRandomDialogue(category) {
    const dialogues = this.dialogues[category] || this.dialogues.welcome;
    const selectedDialogue = dialogues[Math.floor(Math.random() * dialogues.length)];
    console.log(`[GamblerNPC] Category: ${category}, Dialogue: ${selectedDialogue}`);
    return selectedDialogue;
  }

  /**
   * 隐藏（清空文本）
   */
  hide() {
    if (this.messageElement) {
      this.messageElement.textContent = '';
    }
  }

  /**
   * 销毁
   */
  destroy() {
    // 停止催促（已包含清除 dialogueTimeout）
    this.stopUrging();
    
    // 清除所有定时器
    if (this.dialogueTimeout) {
      clearTimeout(this.dialogueTimeout);
      this.dialogueTimeout = null;
    }
    
    if (this.urgeInterval) {
      clearInterval(this.urgeInterval);
      this.urgeInterval = null;
    }
    
    // 重置状态
    this.isUrging = false;
    this.resetWelcome();
    
    console.log('[GamblerNPC] 已销毁，所有定时器已清除');
  }
}
