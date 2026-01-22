// AudioManager.js - 游戏音效管理器
// 支持音效池、音调变化、音量控制及随机BGM轮播

export class AudioManager {
  constructor() {
    if (AudioManager.instance) {
      return AudioManager.instance;
    }
    
    AudioManager.instance = this;
    
    // 1. 注册音频文件路径
    // 注意：路径基于项目根目录
    this.audioFiles = {
      // 背景音乐 (MP3) - 播放列表
      bgm: {
        shadowed_labyrinth: 'assets/audio/bgm/Shadowed Labyrinth.mp3',
        shadows_abyss: 'assets/audio/bgm/Shadows of the Abyss.mp3',
        whispers_depths: 'assets/audio/bgm/Whispers in the Depths.mp3'
      },
      // 关键 UI 音效 (UI相关，启动时优先加载)
      critical: {
        bookFlip: 'assets/audio/sfx/bookFlip2.ogg',
        bookOpen: 'assets/audio/sfx/bookOpen.ogg',
        bookClose: 'assets/audio/sfx/bookClose.ogg',
        handleCoins: 'assets/audio/sfx/handleCoins.ogg',
        handleCoins2: 'assets/audio/sfx/handleCoins2.ogg',
        metalClick: 'assets/audio/sfx/metalClick.ogg',
      },
      // 游戏内战斗与环境音效 (按需加载)
      gameplay: {
        // 门
        doorOpen1: 'assets/audio/sfx/doorOpen_1.ogg',
        doorOpen2: 'assets/audio/sfx/doorOpen_2.ogg',
        doorClose2: 'assets/audio/sfx/doorClose_2.ogg',
        doorClose3: 'assets/audio/sfx/doorClose_3.ogg',
        doorClose4: 'assets/audio/sfx/doorClose_4.ogg',
        doorClose1: 'assets/audio/sfx/doorClose_1.ogg',
        
        // 脚步声
        footstep: 'assets/audio/sfx/footstep00.ogg',
        footstep2: 'assets/audio/sfx/footstep01.ogg',
        footstep3: 'assets/audio/sfx/footstep02.ogg',
        footstep4: 'assets/audio/sfx/footstep03.ogg',
        footstep5: 'assets/audio/sfx/footstep04.ogg',
        footstep6: 'assets/audio/sfx/footstep05.ogg',
        footstep7: 'assets/audio/sfx/footstep06.ogg',
        footstep8: 'assets/audio/sfx/footstep07.ogg',
        footstep9: 'assets/audio/sfx/footstep08.ogg',
        footstep10: 'assets/audio/sfx/footstep09.ogg',
        
        // 战斗 - 攻击 / 受击
        chop: 'assets/audio/sfx/chop.ogg', // 暴击/重击
        knifeSlice1: 'assets/audio/sfx/knifeSlice.ogg',  // 普通攻击
        knifeSlice2: 'assets/audio/sfx/knifeSlice2.ogg', // 普通攻击变体
        drawKnife: 'assets/audio/sfx/drawKnife1.ogg',
        drawKnife2: 'assets/audio/sfx/drawKnife2.ogg',
        drawKnife3: 'assets/audio/sfx/drawKnife3.ogg',
        // 通用受击音效（为兼容保留老key）
        hitHurt: 'assets/audio/sfx/Hit_hurt 23.wav',

        // COMBAT - Split keys to prevent throttling collisions
        // 玩家打中敌人
        attackImpact: 'assets/audio/sfx/Hit_hurt 23.wav',
        // 敌人打中玩家
        playerHit: 'assets/audio/sfx/Hit_hurt 23.wav',
        
        // 战斗 - 受击 (金属盔甲声)
        metalPot1: 'assets/audio/sfx/metalPot1.ogg',
        metalPot2: 'assets/audio/sfx/metalPot2.ogg',
        metalPot3: 'assets/audio/sfx/metalPot3.ogg',
        
        // UI / EVENTS - 交互提示与事件反馈
        levelUp: 'assets/audio/sfx/handleCoins2.ogg',   // 升级提示音（减速播放营造铃声感）
        questComplete: 'assets/audio/sfx/bookFlip2.ogg',// 任务完成
        die: 'assets/audio/sfx/metalLatch.ogg',         // 玩家死亡的沉重提示

        // 物品/装备
        cloth1: 'assets/audio/sfx/cloth1.ogg',
        beltHandle1: 'assets/audio/sfx/beltHandle1.ogg',
        beltHandle2: 'assets/audio/sfx/beltHandle2.ogg',
        leatherDrop: 'assets/audio/sfx/dropLeather.ogg',
        handleSmallLeather: 'assets/audio/sfx/handleSmallLeather.ogg',
        handleSmallLeather2: 'assets/audio/sfx/handleSmallLeather2.ogg',
        
        // 机关/环境
        metalLatch: 'assets/audio/sfx/metalLatch.ogg',
        creak1: 'assets/audio/sfx/creak1.ogg',
        creak2: 'assets/audio/sfx/creak2.ogg',
        creak3: 'assets/audio/sfx/creak3.ogg',

        // UI / 书本扩展
        bookFlip1: 'assets/audio/sfx/bookFlip1.ogg',
        bookFlip3: 'assets/audio/sfx/bookFlip3.ogg',
        bookPlace1: 'assets/audio/sfx/bookPlace1.ogg',
        bookPlace2: 'assets/audio/sfx/bookPlace2.ogg',
        bookPlace3: 'assets/audio/sfx/bookPlace3.ogg'
      }
    };
    
    // BGM 播放列表配置
    this.bgmPlaylist = ['shadowed_labyrinth', 'shadows_abyss', 'whispers_depths'];
    this.currentBgmIndex = -1;

    // 音频上下文状态
    this.audioContextResumed = false;
    
    // 音效池
    this.soundPools = {};
    this.poolSize = 5; 
    
    // 加载状态
    this.criticalLoaded = false; 
    this.loadingKeys = new Set();
    this.loadPromises = {};       
    
    // 音频节流机制
    this.lastPlayTimes = {}; 
    this.throttleDelay = 50; 
    
    // 向后兼容状态
    this.loaded = false;
    this.loadProgress = 0;
    
    // 音量设置
    this.masterVolume = 1.0;
    this.sfxVolume = 1.0;
    this.bgmVolume = 1.0; 
    this.uiVolume = 1.0;   
    
    // BGM 控制
    this.currentBgm = null;      
    this.currentBgmKey = null;   
    
    // 合并所有音频文件查找表
    this.allAudioFiles = {
      ...this.audioFiles.bgm,
      ...this.audioFiles.critical,
      ...this.audioFiles.gameplay
    };

    console.log('[AudioManager] 实例已创建');
  }
  
  /**
   * 预加载关键音频文件
   */
  async preloadCritical() {
    console.log('[AudioManager] 开始预加载关键音频文件...');
    const keys = Object.keys(this.audioFiles.critical);
    let loadedFiles = 0;
    
    for (const key of keys) {
      await this._loadAudioKey(key, this.audioFiles.critical[key]);
      loadedFiles++;
      this.loadProgress = (loadedFiles / keys.length) * 100;
    }
    
    this.criticalLoaded = true;
    this.loaded = true;
    console.log('[AudioManager] 关键音频文件加载完成！');
  }
  
  /**
   * 预加载所有音频文件（不推荐使用，建议按需加载）
   */
  async preload() {
    await this.preloadCritical();
    await this.preloadGameplayAudio();
  }
  
  /**
   * 内部方法：加载单个音效键
   */
  async _loadAudioKey(key, url) {
    if (this.soundPools[key] && this.soundPools[key].length > 0) return;
    if (this.loadingKeys.has(key)) return this.loadPromises[key];
    
    this.loadingKeys.add(key);
    this.soundPools[key] = [];
    
    const loadPromise = (async () => {
      for (let i = 0; i < this.poolSize; i++) {
        const audio = new Audio(url);
        audio.preload = 'auto';
        try {
          audio.load();
          this.soundPools[key].push({
            audio,
            playing: false,
            lastPlayTime: 0
          });
        } catch (error) {
          console.warn(`[AudioManager] 加载音频失败: ${key} (${url})`, error);
        }
      }
      this.loadingKeys.delete(key);
      delete this.loadPromises[key];
    })();
    
    this.loadPromises[key] = loadPromise;
    return loadPromise;
  }
  
  /**
   * 按需加载
   */
  async _ensureAudioLoaded(key) {
    if (this.soundPools[key] && this.soundPools[key].length > 0) return;
    
    // 查找 URL
    let url = this.audioFiles.critical[key] || this.audioFiles.gameplay[key] || this.audioFiles.bgm[key] || this.allAudioFiles[key];
    
    if (url) {
      // console.log(`[AudioManager] 按需加载: ${key}`);
      await this._loadAudioKey(key, url);
    } else {
      console.warn(`[AudioManager] 音效未找到定义: ${key}`);
    }
  }
  
  /**
   * 后台预加载游戏内音效
   */
  async preloadGameplayAudio(keys = null) {
    const keysToLoad = keys || Object.keys(this.audioFiles.gameplay);
    console.log(`[AudioManager] 后台预加载游戏音效: ${keysToLoad.length} 个`);
    
    const loadPromises = keysToLoad.map(key => {
      if (this.audioFiles.gameplay[key]) {
        return this._loadAudioKey(key, this.audioFiles.gameplay[key]).catch(err => {
          console.warn(`[AudioManager] 后台加载失败: ${key}`, err);
        });
      }
      return Promise.resolve();
    });
    
    await Promise.allSettled(loadPromises);
    console.log('[AudioManager] 游戏音效后台预加载完成');
  }
  
  /**
   * 播放音效
   */
  play(key, options = {}) {
    const waitForLoad = options.waitForLoad === true;
    
    // 已加载则直接播放
    if (this.soundPools[key] && this.soundPools[key].length > 0) {
      return this._playFromPool(key, options);
    }
    
    // 未加载则异步加载后播放
    this._ensureAudioLoaded(key).then(() => {
      this._playFromPool(key, options);
    }).catch(err => {
      console.warn(`[AudioManager] 异步播放失败: ${key}`, err);
    });
    
    return null;
  }
  
  /**
   * 内部方法：从音效池播放
   */
  _playFromPool(key, options = {}) {
    if (!this.soundPools[key] || this.soundPools[key].length === 0) return null;
    if (this.masterVolume === 0) return null;
    
    // 节流
    const now = Date.now();
    const lastPlayTime = this.lastPlayTimes[key] || 0;
    if (now - lastPlayTime < this.throttleDelay) return null;
    
    // 更新设置
    const game = window.game;
    if (game && game.settings) {
      this.updateVolumes(game.settings);
    }
    
    this.lastPlayTimes[key] = now;
    
    // 获取可用实例
    const pool = this.soundPools[key];
    let soundInstance = pool.find(i => !i.playing);
    if (!soundInstance) {
      // 如果都忙，使用最早播放的
      soundInstance = pool.reduce((oldest, current) => 
        current.lastPlayTime < oldest.lastPlayTime ? current : oldest
      );
    }
    
    const audio = soundInstance.audio;
    
    // 重置
    audio.pause();
    audio.currentTime = 0;
    
    // 设置音量
    const baseVolume = options.volume !== undefined ? options.volume : 1.0;
    let categoryVolume;
    
    if (options.forceCategory === 'ui') {
      categoryVolume = this.uiVolume;
    } else if (options.forceCategory === 'gameplay') {
      categoryVolume = this.sfxVolume;
    } else {
      categoryVolume = this.audioFiles.critical[key] ? this.uiVolume : this.sfxVolume;
    }
    
    audio.volume = Math.min(1.0, baseVolume * categoryVolume * this.masterVolume);
    audio.loop = options.loop || false;
    
    // 音调 / 播放速度
    const pitchVar = options.pitchVar || 0;
    const baseRate = options.playbackRate || 1.0;
    if (pitchVar > 0) {
      const randomPitch = baseRate + (Math.random() * 2 - 1) * pitchVar;
      audio.playbackRate = Math.max(0.5, Math.min(2.0, randomPitch));
    } else {
      audio.playbackRate = baseRate;
    }
    
    // 播放
    try {
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(error => {});
      }
      
      soundInstance.playing = true;
      soundInstance.lastPlayTime = Date.now();
      
      audio.onended = () => {
        soundInstance.playing = false;
        audio.onended = null; // 清理引用
      };
      
      return audio;
    } catch (error) {
      return null;
    }
  }
  
  stop(key) {
    if (!this.soundPools[key]) return;
    this.soundPools[key].forEach(instance => {
      instance.audio.pause();
      instance.audio.currentTime = 0;
      instance.playing = false;
    });
  }
  
  stopAll() {
    Object.keys(this.soundPools).forEach(key => this.stop(key));
  }
  
  updateVolumes(settings) {
    if (!settings) return;
    this.masterVolume = settings.audioEnabled !== false ? 1.0 : 0.0;
    this.bgmVolume = (settings.bgmVolume ?? 100) / 100;
    this.sfxVolume = (settings.sfxVolume ?? 100) / 100;
    this.uiVolume = (settings.uiSfxVolume ?? 100) / 100;

    if (this.currentBgm) {
      this.currentBgm.volume = Math.max(0, Math.min(1, this.bgmVolume * this.masterVolume));
    }
  }
  
  resume() {
    if (this.audioContextResumed) return Promise.resolve();
    this.audioContextResumed = true;
    
    // 播放无声片段解锁 AudioContext
    const audio = new Audio();
    audio.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';
    audio.volume = 0;
    return audio.play().then(() => {
      audio.remove();
      console.log('[AudioManager] Audio context resumed');
    }).catch(e => console.warn('Unlock failed', e));
  }
  
  setMasterVolume(v) { this.masterVolume = Math.max(0, Math.min(1, v)); }
  setSfxVolume(v) { this.sfxVolume = Math.max(0, Math.min(1, v)); }
  
  /**
   * 随机播放 BGM (播放列表轮播)
   */
  playRandomBgm() {
    if (!this.audioContextResumed) this.resume();
    if (this.masterVolume === 0) return;
    
    // 如果已经在播放且没暂停，不打断
    if (this.currentBgm && !this.currentBgm.paused) return;

    // 随机选择下一首，避免重复
    let nextIndex;
    if (this.bgmPlaylist.length > 1) {
        let attempts = 0;
        do {
            nextIndex = Math.floor(Math.random() * this.bgmPlaylist.length);
            attempts++;
        } while (nextIndex === this.currentBgmIndex && attempts < 5);
    } else {
        nextIndex = 0;
    }
    
    this.currentBgmIndex = nextIndex;
    const nextKey = this.bgmPlaylist[nextIndex];
    
    // 播放选中的曲目，loop=false 以便触发 ended 事件切歌
    this.playBgm(nextKey, false);
  }
  
  /**
   * 播放指定 BGM
   */
  playBgm(key, loop = true) {
    if (this.masterVolume === 0) return;
    if (this.currentBgmKey === key && this.currentBgm && !this.currentBgm.paused) return;

    this.stopBgm();
    const requestedKey = key;

    this._ensureAudioLoaded(key).then(() => {
        if (this.currentBgmKey !== null && this.currentBgmKey !== requestedKey) return;

        let url = this.allAudioFiles[requestedKey];
        if (!url) return;

        const audio = new Audio(url);
        audio.loop = loop;
        audio.volume = this.bgmVolume * this.masterVolume;
        
        // 自动切歌逻辑
        if (!loop) {
            audio.addEventListener('ended', () => {
                console.log('[AudioManager] BGM 播放结束，切换下一首...');
                this.currentBgm = null;
                this.currentBgmKey = null;
                this.playRandomBgm();
            }, { once: true });
        }
        
        const playPromise = audio.play();
        if (playPromise !== undefined) {
            playPromise.catch(error => {
                console.warn(`[AudioManager] BGM 自动播放被拦截: ${error}`);
                if (this.currentBgmKey === requestedKey) {
                  this.currentBgm = null;
                  this.currentBgmKey = null;
                }
            });
        }
        
        if (this.currentBgmKey === null || this.currentBgmKey === requestedKey) {
          this.currentBgm = audio;
          this.currentBgmKey = requestedKey;
          console.log(`[AudioManager] 正在播放 BGM: ${requestedKey}`);
        }
    }).catch(e => console.warn('BGM Load Error', e));
  }
  
  stopBgm() {
    if (this.currentBgm) {
        this.currentBgm.pause();
        this.currentBgm.currentTime = 0;
        // 移除旧的监听器
        this.currentBgm.onended = null;
        this.currentBgm = null;
        this.currentBgmKey = null;
    }
  }
  
  // ================= 快捷播放方法 (Sound Mapping) =================
  
  playFootstep() {
    // 使用 00-09 共 10 个脚步声变体，增加行走听感的丰富度
    const steps = [
      'footstep',
      'footstep2',
      'footstep3',
      'footstep4',
      'footstep5',
      'footstep6',
      'footstep7',
      'footstep8',
      'footstep9',
      'footstep10'
    ];
    const sound = steps[Math.floor(Math.random() * steps.length)];
    return this.play(sound, { volume: 0.3, pitchVar: 0.15, forceCategory: 'gameplay' });
  }
  
  playAttack() {
    // 玩家攻击命中的清脆打击声（稍微升高音调）
    return this.play('attackImpact', { 
      volume: 0.7, 
      pitchVar: 0.1, 
      forceCategory: 'gameplay' 
    });
  }
  
  playCrit() {
    // 暴击使用更重的音效（稍微降低播放速度）
    return this.play('attackImpact', { 
      volume: 0.9, 
      playbackRate: 0.8, 
      forceCategory: 'gameplay' 
    });
  }
  
  playHit() {
    // 玩家被击中的受击声，使用独立key避免与攻击音效互相节流
    return this.play('playerHit', { 
      volume: 0.6, 
      pitchVar: 0.1, 
      forceCategory: 'gameplay' 
    });
  }
  
  playDoorOpen() {
    // 开门使用两种变体，并轻微随机音调
    const sound = Math.random() < 0.5 ? 'doorOpen1' : 'doorOpen2';
    return this.play(sound, { volume: 0.7, forceCategory: 'gameplay' });
  }

  playDoorClose() {
    // 关门/机关关闭，使用多种门闩与木门关合声
    const sounds = ['doorClose1', 'doorClose2', 'doorClose3', 'doorClose4'];
    const sound = sounds[Math.floor(Math.random() * sounds.length)];
    return this.play(sound, { volume: 0.8, pitchVar: 0.08, forceCategory: 'gameplay' });
  }
  
  playCoins(options = {}) {
    const sound = Math.random() < 0.5 ? 'handleCoins' : 'handleCoins2';
    return this.play(sound, { volume: 0.5, pitchVar: 0.05, ...options });
  }
  
  playCloth() {
    const sounds = [
      'beltHandle1',
      'beltHandle2',
      'cloth1',
      'leatherDrop',
      'handleSmallLeather',
      'handleSmallLeather2'
    ];
    const sound = sounds[Math.floor(Math.random() * sounds.length)];
    return this.play(sound, { volume: 0.4, forceCategory: 'gameplay' });
  }
  
  playBookFlip() {
    // 混合多种翻书与放置变体，让 UI 操作更自然
    const sounds = ['bookFlip', 'bookFlip1', 'bookFlip3'];
    const sound = sounds[Math.floor(Math.random() * sounds.length)];
    return this.play(sound, { volume: 0.5, forceCategory: 'ui' });
  }
  playBookOpen() { return this.play('bookOpen', { volume: 0.6 }); }
  playBookClose() { return this.play('bookClose', { volume: 0.5 }); }
  
  playMetalClick() { return this.play('metalClick', { volume: 0.4 }); }
  
  playLevelUp() {
    // 使用金币声减速播放，营造“升级铃声”
    return this.play('levelUp', { 
      volume: 0.8, 
      playbackRate: 0.5, 
      forceCategory: 'ui' 
    });
  }

  playQuestComplete() {
    // 略微加快翻书声，突出完成反馈
    return this.play('questComplete', { 
      volume: 0.7, 
      playbackRate: 1.2, 
      forceCategory: 'ui' 
    });
  }

  playPlayerDeath() {
    // 低速金属闩锁声，营造沉重死亡反馈
    return this.play('die', { 
      volume: 1.0, 
      playbackRate: 0.5, 
      forceCategory: 'gameplay' 
    });
  }
  
  // 兼容旧接口
  playMeleeHit() { return this.playHit(); }
  playLevelStart() { return this.play('metalLatch', { volume: 0.6 }); }

  // ================= 语义化高级接口 =================

  /**
   * 楼梯 / 上下楼：使用更沉重的脚步声
   */
  playStairs() {
    return this.play('footstep', { volume: 0.5, playbackRate: 0.8, forceCategory: 'gameplay' });
  }

  /**
   * 铁匠铺专用音效
   */
  
  // UI打开/关闭
  playUIOpen() {
    return this.playBookOpen();
  }
  
  playUIClose() {
    return this.playBookClose();
  }
  
  // 锻造音效
  playForge() {
    return this.play('chop', { volume: 0.7, pitchVar: 0.1, forceCategory: 'gameplay' });
  }
  
  playChop() {
    return this.play('chop', { volume: 0.8, pitchVar: 0.15, forceCategory: 'gameplay' });
  }
  
  // 材料操作
  playLeatherDrop() {
    return this.play('leatherDrop', { volume: 0.5, forceCategory: 'gameplay' });
  }
  
  // 送礼音效
  playGift() {
    return this.playCoins({ volume: 0.6 });
  }
  
  // 金属闩锁（用于失败/拆解）
  playMetalLatch() {
    return this.play('metalLatch', { volume: 0.6, forceCategory: 'gameplay' });
  }
  playStairs() {
    const steps = [
      'footstep',
      'footstep2',
      'footstep3',
      'footstep4',
      'footstep5',
      'footstep6',
      'footstep7',
      'footstep8',
      'footstep9',
      'footstep10'
    ];
    const sound = steps[Math.floor(Math.random() * steps.length)];
    return this.play(sound, {
      volume: 0.5,
      playbackRate: 0.7,
      pitchVar: 0.0,
      forceCategory: 'gameplay'
    });
  }

  /**
   * 铁匠铺：随机敲击金属盆，模拟打铁声
   */
  playForge() {
    const sounds = ['metalPot1', 'metalPot2', 'metalPot3'];
    const sound = sounds[Math.floor(Math.random() * sounds.length)];
    return this.play(sound, {
      volume: 0.9,
      pitchVar: 0.1,
      playbackRate: 0.95,
      forceCategory: 'gameplay'
    });
  }

  /**
   * 赌博：金币拨弄声
   */
  playGamble() {
    return this.playCoins({
      volume: 0.6,
      pitchVar: 0.08,
      forceCategory: 'ui'
    });
  }

  /**
   * 天赋解锁：更清脆的金属按键声
   */
  playTalentUnlock() {
    return this.play('metalClick', {
      volume: 0.7,
      playbackRate: 1.5,
      pitchVar: 0,
      forceCategory: 'ui'
    });
  }

  /**
   * 通用 UI 打开
   */
  playUIOpen() {
    const sounds = ['bookOpen', 'cloth1'];
    const sound = sounds[Math.random() < 0.5 ? 0 : 1];
    return this.play(sound, {
      volume: 0.6,
      pitchVar: 0.05,
      forceCategory: 'ui'
    });
  }

  /**
   * 通用 UI 关闭
   */
  playUIClose() {
    const sounds = ['bookClose', 'bookPlace1'];
    const sound = sounds[Math.random() < 0.5 ? 0 : 1];
    return this.play(sound, {
      volume: 0.6,
      pitchVar: 0.03,
      forceCategory: 'ui'
    });
  }

  /**
   * UI / 逻辑错误提示
   */
  playError() {
    return this.play('metalLatch', {
      volume: 0.7,
      playbackRate: 0.6,
      pitchVar: 0,
      forceCategory: 'ui'
    });
  }

  /**
   * 物品落地
   */
  playItemDrop() {
    const sounds = ['bookPlace1', 'leatherDrop'];
    const sound = sounds[Math.random() < 0.5 ? 0 : 1];
    return this.play(sound, {
      volume: 0.6,
      pitchVar: 0.05,
      forceCategory: 'gameplay'
    });
  }
  
  static getInstance() {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager();
    }
    return AudioManager.instance;
  }
}

export default AudioManager.getInstance();

