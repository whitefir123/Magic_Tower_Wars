/**
 * ForgeSoundManager - 铁匠铺音效管理器
 * 
 * 为铁匠铺的所有操作提供统一的音效反馈
 * 集成AudioManager，提供更高级的音效控制
 */

export class ForgeSoundManager {
  constructor(audioManager) {
    this.audioManager = audioManager;
    
    // 音效映射
    this.sounds = {
      // UI交互
      open: 'playUIOpen',           // 打开铁匠铺
      close: 'playUIClose',         // 关闭铁匠铺
      pageSwitch: 'playBookFlip',   // 页面切换
      buttonClick: 'playMetalClick', // 按钮点击
      
      // 强化相关
      forge: 'playForge',           // 锻造音效（通用）
      enhanceSuccess: 'playLevelUp', // 强化成功
      enhanceFailure: 'playMetalLatch', // 强化失败
      hammering: 'playChop',        // 锤击声
      
      // 宝石相关
      socketGem: 'playMetalClick',  // 镶嵌宝石
      unsocketGem: 'playMetalClick', // 拆除宝石
      synthesis: 'playBookFlip',    // 宝石合成
      
      // 其他操作
      reforge: 'playForge',         // 重铸
      dismantle: 'playMetalLatch',  // 拆解
      coins: 'playCoins',           // 金币音效
      
      // 材料操作
      addMaterial: 'playLeatherDrop', // 添加材料
      removeMaterial: 'playCloth',    // 移除材料
      
      // NPC交互
      npcClick: 'playBookFlip',     // 点击NPC
      gift: 'playCoins',            // 送礼
      dialogue: 'playBookFlip',     // 对话
      
      // 系统通知
      levelUp: 'playLevelUp',       // 升级
      unlock: 'playMetalClick'      // 功能解锁
    };
  }

  /**
   * 播放音效
   * @param {string} soundKey - 音效键名
   * @param {Object} options - 播放选项
   */
  play(soundKey, options = {}) {
    if (!this.audioManager) {
      console.warn('AudioManager未初始化');
      return;
    }
    
    const methodName = this.sounds[soundKey];
    if (!methodName) {
      console.warn(`未知的音效: ${soundKey}`);
      return;
    }
    
    const method = this.audioManager[methodName];
    if (typeof method === 'function') {
      try {
        method.call(this.audioManager, options);
      } catch (error) {
        console.error(`播放音效失败 (${soundKey}):`, error);
      }
    } else {
      console.warn(`AudioManager没有方法: ${methodName}`);
    }
  }

  /**
   * 播放打开音效
   */
  playOpen() {
    this.play('open');
  }

  /**
   * 播放关闭音效
   */
  playClose() {
    this.play('close');
  }

  /**
   * 播放页面切换音效
   */
  playPageSwitch() {
    this.play('pageSwitch');
  }

  /**
   * 播放按钮点击音效
   */
  playButtonClick() {
    this.play('buttonClick');
  }

  /**
   * 播放锻造音效
   */
  playForge() {
    this.play('forge');
  }

  /**
   * 播放强化成功音效
   */
  playEnhanceSuccess() {
    this.play('enhanceSuccess');
  }

  /**
   * 播放强化失败音效
   */
  playEnhanceFailure() {
    this.play('enhanceFailure');
  }

  /**
   * 播放锤击音效
   */
  playHammering() {
    this.play('hammering');
  }

  /**
   * 播放镶嵌宝石音效
   */
  playSocketGem() {
    this.play('socketGem');
  }

  /**
   * 播放拆除宝石音效
   */
  playUnsocketGem() {
    this.play('unsocketGem');
  }

  /**
   * 播放宝石合成音效
   */
  playSynthesis() {
    this.play('synthesis');
  }

  /**
   * 播放重铸音效
   */
  playReforge() {
    this.play('reforge');
  }

  /**
   * 播放拆解音效
   */
  playDismantle() {
    this.play('dismantle');
  }

  /**
   * 播放金币音效
   */
  playCoins() {
    this.play('coins');
  }

  /**
   * 播放添加材料音效
   */
  playAddMaterial() {
    this.play('addMaterial');
  }

  /**
   * 播放移除材料音效
   */
  playRemoveMaterial() {
    this.play('removeMaterial');
  }

  /**
   * 播放NPC点击音效
   */
  playNPCClick() {
    this.play('npcClick');
  }

  /**
   * 播放送礼音效
   */
  playGift() {
    this.play('gift');
  }

  /**
   * 播放对话音效
   */
  playDialogue() {
    this.play('dialogue');
  }

  /**
   * 播放升级音效
   */
  playLevelUp() {
    this.play('levelUp');
  }

  /**
   * 播放功能解锁音效
   */
  playUnlock() {
    this.play('unlock');
  }

  /**
   * 播放强化动画序列音效
   * @param {boolean} success - 是否成功
   */
  playEnhanceSequence(success) {
    // 先播放锤击声
    this.playHammering();
    
    // 延迟播放结果音效
    setTimeout(() => {
      if (success) {
        this.playEnhanceSuccess();
      } else {
        this.playEnhanceFailure();
      }
    }, 500);
  }

  /**
   * 检查AudioManager是否可用
   * @returns {boolean}
   */
  isAvailable() {
    return this.audioManager !== null && this.audioManager !== undefined;
  }

  /**
   * 设置音量
   * @param {number} volume - 音量 (0-1)
   */
  setVolume(volume) {
    if (this.audioManager && typeof this.audioManager.setVolume === 'function') {
      this.audioManager.setVolume(volume);
    }
  }

  /**
   * 静音/取消静音
   * @param {boolean} muted - 是否静音
   */
  setMuted(muted) {
    if (this.audioManager && typeof this.audioManager.setMuted === 'function') {
      this.audioManager.setMuted(muted);
    }
  }
}

