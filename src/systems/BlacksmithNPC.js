/**
 * BlacksmithNPC - 铁匠NPC系统
 * 
 * 管理铁匠角色的等级、经验、亲密度和对话系统
 */

import { FORGE_CONFIG } from '../constants.js';

export class BlacksmithNPC {
  constructor(game) {
    this.game = game;
    
    // 铁匠状态
    this.level = 1;
    this.experience = 0;
    this.affinity = 0;
    this.unlockedFeatures = [];
    
    // 等级阈值配置
    this.LEVEL_THRESHOLDS = FORGE_CONFIG.BLACKSMITH?.LEVEL_THRESHOLDS || [
      { level: 1, exp: 0, unlocks: [] },
      { level: 2, exp: 100, unlocks: ['批量强化'] },
      { level: 3, exp: 300, unlocks: ['附魔系统'] },
      { level: 5, exp: 1000, unlocks: ['套装强化'] },
      { level: 7, exp: 3000, unlocks: ['宝石融合'] },
      { level: 10, exp: 10000, unlocks: ['+16强化', '觉醒系统'] }
    ];
    
    // 经验获取配置
    this.EXP_GAINS = FORGE_CONFIG.BLACKSMITH?.EXP_GAINS || {
      enhance: 1,
      reforge: 2,
      socket: 1,
      dismantle: 1,
      enchant: 3,
      awaken: 10,
      set_enhance: 5,
      gem_fusion: 2,
      gem_extraction: 1
    };
    
    // 亲密度阈值配置
    this.AFFINITY_THRESHOLDS = FORGE_CONFIG.BLACKSMITH?.AFFINITY_THRESHOLDS || [
      { affinity: 0, discount: 0, title: '陌生' },
      { affinity: 100, discount: 0.05, title: '熟识' },
      { affinity: 500, discount: 0.10, title: '友好' },
      { affinity: 1000, discount: 0.15, title: '信赖' },
      { affinity: 3000, discount: 0.20, title: '挚友' }
    ];
    
    // 亲密度获取配置
    this.AFFINITY_GAINS = FORGE_CONFIG.BLACKSMITH?.AFFINITY_GAINS || {
      operation: 1,
      success: 2,
      failure: 1,
      dialogue_choice: 5
    };
    
    // 对话库 - 按好感度等级分类
    this.DIALOGUES = FORGE_CONFIG.BLACKSMITH_DIALOGUES || {
      // 问候对话 - 根据好感度等级
      greeting_stranger: [ // 陌生 (0-99)
        '嗯？有什么事吗？',
        '需要修理装备？',
        '我很忙，有事快说。',
        '你是...？哦，客人啊。',
        '找我有什么事？'
      ],
      greeting_acquaintance: [ // 熟识 (100-499)
        '哟，又来了？',
        '欢迎！今天想打造点什么？',
        '嘿，看看这些装备！',
        '来得正好！我刚磨好了锤子。',
        '又见面了！需要帮忙吗？'
      ],
      greeting_friendly: [ // 友好 (500-999)
        '哈！我就知道你会回来的！',
        '老朋友！进来坐坐！',
        '嘿嘿，闻到这股铁的味道了吗？',
        '欢迎欢迎！我的锻炉为你敞开！',
        '哟呵！今天想让哪件装备变得更强？'
      ],
      greeting_trusted: [ // 信赖 (1000-2999)
        '哈哈！我最信赖的伙伴来了！',
        '兄弟！好久不见！',
        '就等你来了！我有新技术想试试！',
        '我的好朋友！快进来！',
        '太好了！正想找你呢！'
      ],
      greeting_best_friend: [ // 挚友 (3000+)
        '老伙计！我的铁砧都在想你了！',
        '哈哈哈！我最好的朋友！',
        '兄弟！来喝一杯！哦不，先看看装备！',
        '你来了！我就知道你会来的！',
        '我的挚友！有你在，什么都能打造出来！'
      ],
      
      // 闲聊对话 - 根据好感度等级
      chat_stranger: [ // 陌生
        '锻造是门技术活，不是谁都能做的。',
        '好的装备需要好的材料。',
        '我的手艺还算不错。',
        '这炉火烧了很多年了。',
        '每件装备都要认真对待。'
      ],
      chat_acquaintance: [ // 熟识
        '你知道吗？好的装备就像好酒，需要时间。',
        '锻造不仅是技术，更是艺术！',
        '每一次敲击都要恰到好处。',
        '好的装备能救你一命，所以我从不马虎。',
        '这炉火已经烧了三十年了，从未熄灭过！'
      ],
      chat_friendly: [ // 友好
        '我爷爷说过，真正的铁匠要用心去感受金属的呼吸。',
        '哈！锻造的秘诀？热情、耐心，还有一点点运气！',
        '有时候我会对着装备说话，它们能听懂我的心意。',
        '你见过真正的矮人锻炉吗？那可是壮观得很！',
        '我这辈子最大的梦想，就是打造出传说级的神器！'
      ],
      chat_trusted: [ // 信赖
        '说实话，你是我见过最懂装备的冒险者。',
        '我很少对人说这些，但你不一样...我信任你。',
        '我爷爷的锤子传给了我，希望有一天能传给值得的人。',
        '和你合作这么久，我学到了很多东西。',
        '你知道吗？我把你当真正的朋友。'
      ],
      chat_best_friend: [ // 挚友
        '兄弟，我们的友谊比精钢还要坚固！',
        '如果有一天我要打造神器，一定让你第一个看！',
        '你就像我的家人一样，这铁匠铺永远是你的家。',
        '我这辈子最骄傲的，除了手艺，就是认识你这个朋友！',
        '哈哈！咱们一起喝过酒，流过汗，这份情谊永不褪色！'
      ],
      
      success: [
        '哈哈！看这光泽！完美的杰作！',
        '就是这样！我的锤子从不失手！',
        '成了！这才是真正的矮人工艺！',
        '漂亮！连我自己都被这质量惊到了！',
        '哼哼，不愧是我打造的，质量杠杠的！',
        '看到没？这就是经验和技术的结晶！',
        '太棒了！这件装备现在能劈开巨石了！',
        '成功！我就说我的手艺不会让你失望！',
        '哈！又一件传世之作诞生了！',
        '完美！这光泽，这纹理，简直是艺术品！'
      ],
      failure: [
        '该死...材料不给力啊。',
        '唉，这次火候没掌握好...别担心，下次一定行！',
        '见鬼！这金属怎么这么倔强！',
        '啧，失败了...不过别灰心，锻造本就是场赌博。',
        '糟糕...看来今天运气不太好。',
        '可恶！差一点就成了！再来一次！',
        '唔...这次没成功，但我学到了经验。',
        '失败是成功之母！矮人从不轻言放弃！',
        '该死的材料！不过别担心，我会找到窍门的。',
        '嘁...这次不算，下次我会更小心的！'
      ],
      level_up: [
        '哈哈！我的技艺又精进了！',
        '太好了！我掌握了祖传的新技法！',
        '感谢你的信任！这些经验让我变得更强了！',
        '我悟了！原来锻造还能这样做！',
        '哦哦！我感觉到力量在涌动！新技术get！',
        '这就是成长的感觉！我现在能做更多事了！',
        '太棒了！我的锻造之路又迈进了一步！',
        '哈！我爷爷要是看到我现在的技术，一定会很骄傲！'
      ],
      affinity_increase: [
        '哈哈！我喜欢你这样的客户！',
        '我们越来越有默契了，朋友！',
        '能为你服务是我的荣幸！',
        '你是我见过最懂装备的冒险者！',
        '嘿嘿，咱们已经是老朋友了！',
        '你的信任让我干劲十足！',
        '和你合作真是太愉快了！',
        '哈！你可是我的VIP客户！',
        '我们的友谊比精钢还要坚固！',
        '能认识你这样的勇士，真是我的福气！'
      ],
      feature_unlock: [
        '嘿！我刚学会了新技术，要试试吗？',
        '看看这个！我的新本领！',
        '我解锁了祖传秘技！来试试吧！',
        '哈哈！现在我能做更多事情了！',
        '这个新功能绝对能帮到你！',
        '我研究出了新的锻造方法！',
        '太棒了！我的工坊又升级了！'
      ],
      gift_thanks: [
        '哦！这是给我的？太感谢了！',
        '哈哈！你真是太客气了！',
        '这礼物我很喜欢！谢谢你！',
        '真不错！你很懂我的心意！',
        '太好了！我会好好珍惜的！',
        '哈！你这朋友我交定了！',
        '这份心意我收下了！谢谢！'
      ]
    };
    
    console.log('✓ BlacksmithNPC 已初始化');
  }
  
  /**
   * 添加经验值
   * @param {string} operationType - 操作类型
   * @returns {Object} 结果对象 { leveledUp: boolean, newLevel: number, unlockedFeatures: Array }
   */
  addExperience(operationType) {
    const expGain = this.EXP_GAINS[operationType] || 0;
    
    if (expGain === 0) {
      return { leveledUp: false, newLevel: this.level, unlockedFeatures: [] };
    }
    
    this.experience += expGain;
    
    // 检查是否升级
    const levelUpResult = this.checkLevelUp();
    
    return levelUpResult;
  }
  
  /**
   * 检查是否升级
   * @returns {Object} 升级结果 { leveledUp: boolean, newLevel: number, unlockedFeatures: Array }
   */
  checkLevelUp() {
    let leveledUp = false;
    const unlockedFeatures = [];
    
    // 从当前等级开始检查
    for (let i = this.level; i < this.LEVEL_THRESHOLDS.length; i++) {
      const threshold = this.LEVEL_THRESHOLDS[i];
      
      if (this.experience >= threshold.exp && this.level < threshold.level) {
        this.level = threshold.level;
        leveledUp = true;
        
        // 解锁新功能
        if (threshold.unlocks && threshold.unlocks.length > 0) {
          for (const feature of threshold.unlocks) {
            if (!this.unlockedFeatures.includes(feature)) {
              this.unlockedFeatures.push(feature);
              unlockedFeatures.push(feature);
            }
          }
        }
      }
    }
    
    return {
      leveledUp: leveledUp,
      newLevel: this.level,
      unlockedFeatures: unlockedFeatures
    };
  }
  
  /**
   * 增加亲密度
   * @param {string} type - 亲密度增加类型 ('operation'|'success'|'failure'|'dialogue_choice')
   * @returns {Object} 结果对象 { affinityIncreased: number, newAffinity: number, newTitle: string }
   */
  increaseAffinity(type) {
    const affinityGain = this.AFFINITY_GAINS[type] || 0;
    
    if (affinityGain === 0) {
      return { 
        affinityIncreased: 0, 
        newAffinity: this.affinity, 
        newTitle: this.getAffinityTitle() 
      };
    }
    
    const oldTitle = this.getAffinityTitle();
    this.affinity += affinityGain;
    const newTitle = this.getAffinityTitle();
    
    return {
      affinityIncreased: affinityGain,
      newAffinity: this.affinity,
      newTitle: newTitle,
      titleChanged: oldTitle !== newTitle
    };
  }
  
  /**
   * 获取当前亲密度称号
   * @returns {string} 亲密度称号
   */
  getAffinityTitle() {
    let currentTitle = '陌生';
    
    for (const threshold of this.AFFINITY_THRESHOLDS) {
      if (this.affinity >= threshold.affinity) {
        currentTitle = threshold.title;
      } else {
        break;
      }
    }
    
    return currentTitle;
  }
  
  /**
   * 获取当前折扣率
   * @returns {number} 折扣率 (0-1)
   */
  getDiscountRate() {
    let discount = 0;
    
    for (const threshold of this.AFFINITY_THRESHOLDS) {
      if (this.affinity >= threshold.affinity) {
        discount = threshold.discount;
      } else {
        break;
      }
    }
    
    return discount;
  }
  
  /**
   * 获取当前好感度等级
   * @returns {string} 好感度等级 ('stranger'|'acquaintance'|'friendly'|'trusted'|'best_friend')
   */
  getAffinityLevel() {
    if (this.affinity >= 3000) return 'best_friend';
    if (this.affinity >= 1000) return 'trusted';
    if (this.affinity >= 500) return 'friendly';
    if (this.affinity >= 100) return 'acquaintance';
    return 'stranger';
  }

  /**
   * 获取对话文本
   * @param {string} context - 对话上下文 ('greeting'|'chat'|'success'|'failure'|'level_up'|'affinity_increase'|'feature_unlock'|'gift_thanks')
   * @returns {string} 对话文本
   */
  getDialogue(context) {
    let dialogueKey = context;
    
    // 对于greeting和chat上下文，根据好感度等级选择对话
    if (context === 'greeting' || context === 'chat') {
      const affinityLevel = this.getAffinityLevel();
      dialogueKey = `${context}_${affinityLevel}`;
    }
    
    const dialogues = this.DIALOGUES[dialogueKey];
    
    if (!dialogues || dialogues.length === 0) {
      console.warn(`未找到对话: ${dialogueKey}`);
      return '...';
    }
    
    // 随机选择一个对话
    const randomIndex = Math.floor(Math.random() * dialogues.length);
    return dialogues[randomIndex];
  }
  
  /**
   * 检查功能是否已解锁
   * @param {string} featureName - 功能名称
   * @returns {boolean} 是否已解锁
   */
  isFeatureUnlocked(featureName) {
    return this.unlockedFeatures.includes(featureName);
  }
  
  /**
   * 获取所有可用功能
   * @returns {Object} 功能可用性对象
   */
  getAvailableFeatures() {
    return {
      batchEnhance: this.isFeatureUnlocked('批量强化'),
      enchantment: this.isFeatureUnlocked('附魔系统'),
      setEnhancement: this.isFeatureUnlocked('套装强化'),
      gemFusion: this.isFeatureUnlocked('宝石融合'),
      highLevelEnhance: this.isFeatureUnlocked('+16强化'),
      awakening: this.isFeatureUnlocked('觉醒系统')
    };
  }
  
  /**
   * 获取铁匠信息
   * @returns {Object} 铁匠信息对象
   */
  getInfo() {
    const currentThreshold = this.LEVEL_THRESHOLDS.find(t => t.level === this.level);
    const nextThreshold = this.LEVEL_THRESHOLDS.find(t => t.level === this.level + 1);
    
    return {
      level: this.level,
      experience: this.experience,
      nextLevelExp: nextThreshold ? nextThreshold.exp : null,
      expProgress: nextThreshold ? ((this.experience - currentThreshold.exp) / (nextThreshold.exp - currentThreshold.exp) * 100).toFixed(2) + '%' : '100%',
      affinity: this.affinity,
      affinityTitle: this.getAffinityTitle(),
      discountRate: this.getDiscountRate(),
      unlockedFeatures: [...this.unlockedFeatures],
      availableFeatures: this.getAvailableFeatures()
    };
  }
  
  /**
   * 获取下一个解锁的功能
   * @returns {Object|null} 下一个功能信息
   */
  getNextUnlock() {
    for (const threshold of this.LEVEL_THRESHOLDS) {
      if (threshold.level > this.level && threshold.unlocks.length > 0) {
        return {
          level: threshold.level,
          exp: threshold.exp,
          expNeeded: threshold.exp - this.experience,
          features: threshold.unlocks
        };
      }
    }
    
    return null;
  }
  
  /**
   * 处理操作完成事件
   * @param {string} operationType - 操作类型
   * @param {boolean} success - 是否成功
   * @returns {Object} 事件结果
   */
  onOperationComplete(operationType, success) {
    // 增加经验
    const expResult = this.addExperience(operationType);
    
    // 增加亲密度
    const affinityType = success ? 'success' : 'failure';
    const affinityResult = this.increaseAffinity(affinityType);
    
    // 构建结果对象
    const result = {
      exp: expResult,
      affinity: affinityResult,
      dialogue: null,
      notifications: []
    };
    
    // 选择对话
    if (expResult.leveledUp) {
      result.dialogue = this.getDialogue('level_up');
      result.notifications.push({
        type: 'level_up',
        message: `铁匠升级到 ${expResult.newLevel} 级！`,
        features: expResult.unlockedFeatures
      });
    } else if (affinityResult.titleChanged) {
      result.dialogue = this.getDialogue('affinity_increase');
      result.notifications.push({
        type: 'affinity_up',
        message: `与铁匠的关系变为：${affinityResult.newTitle}`,
        discount: this.getDiscountRate()
      });
    } else {
      result.dialogue = this.getDialogue(success ? 'success' : 'failure');
    }
    
    return result;
  }
  
  /**
   * 导出数据（用于保存）
   * @returns {Object} 导出的数据对象
   */
  exportData() {
    return {
      level: this.level,
      experience: this.experience,
      affinity: this.affinity,
      unlockedFeatures: [...this.unlockedFeatures]
    };
  }
  
  /**
   * 导入数据（用于加载）
   * @param {Object} data - 导入的数据对象
   */
  importData(data) {
    if (!data) return;
    
    if (typeof data.level === 'number') {
      this.level = data.level;
    }
    
    if (typeof data.experience === 'number') {
      this.experience = data.experience;
    }
    
    if (typeof data.affinity === 'number') {
      this.affinity = data.affinity;
    }
    
    if (Array.isArray(data.unlockedFeatures)) {
      this.unlockedFeatures = [...data.unlockedFeatures];
    }
  }
  
  /**
   * 重置铁匠数据
   */
  reset() {
    this.level = 1;
    this.experience = 0;
    this.affinity = 0;
    this.unlockedFeatures = [];
  }
}
