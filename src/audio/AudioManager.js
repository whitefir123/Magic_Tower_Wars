// AudioManager.js - 游戏音效管理器
// 支持音效池、音调变化、音量控制等功能

/**
 * 音效管理器单例类
 * 功能：
 * - 预加载音频文件
 * - 音效池：允许同一音效快速连续播放
 * - 音调变化：为音效添加随机音调变化，避免机械感
 * - 音量控制：从 Game.settings 读取音量设置
 */
export class AudioManager {
  constructor() {
    if (AudioManager.instance) {
      return AudioManager.instance;
    }
    
    AudioManager.instance = this;
    
    // 音频文件映射表
    this.audioFiles = {
      // 背景音乐（BGM，长音频）
      bgm: {
        dungeon_theme: 'public/assets/audio/bgm/dungeon_theme.ogg',
      },
      // 关键音效（UI相关，启动时加载）
      critical: {
        bookFlip: 'public/assets/audio/sfx/bookFlip2.ogg',
        bookOpen: 'public/assets/audio/sfx/bookOpen.ogg',
        handleCoins: 'public/assets/audio/sfx/handleCoins.ogg',
        cloth: 'public/assets/audio/sfx/cloth1.ogg',
      },
      // 游戏内音效（按需加载）
      gameplay: {
        doorOpen: 'public/assets/audio/sfx/doorOpen_1.ogg',
        footstep: 'public/assets/audio/sfx/footstep00.ogg',
        footstep2: 'public/assets/audio/sfx/footstep01.ogg',
        footstep3: 'public/assets/audio/sfx/footstep02.ogg',
        footstep4: 'public/assets/audio/sfx/footstep03.ogg',
        footstep5: 'public/assets/audio/sfx/footstep04.ogg',
        footstep6: 'public/assets/audio/sfx/footstep05.ogg',
        footstep7: 'public/assets/audio/sfx/footstep06.ogg',
        footstep8: 'public/assets/audio/sfx/footstep07.ogg',
        footstep9: 'public/assets/audio/sfx/footstep08.ogg',
        footstep10: 'public/assets/audio/sfx/footstep09.ogg',
        chop: 'public/assets/audio/sfx/chop.ogg',
        metalPot: 'public/assets/audio/sfx/metalPot1.ogg',
        drawKnife: 'public/assets/audio/sfx/drawKnife1.ogg',
      }
    };
    
    // 合并所有音频文件（向后兼容）
    this.allAudioFiles = {
      ...this.audioFiles.bgm,
      ...this.audioFiles.critical,
      ...this.audioFiles.gameplay
    };
    
    // 音频上下文状态（用于处理浏览器自动播放限制）
    this.audioContextResumed = false;
    
    // 音效池：为每个音效创建多个 Audio 实例
    this.soundPools = {};
    this.poolSize = 5; // 每个音效的实例数量
    
    // 加载状态
    this.criticalLoaded = false;  // 关键音效是否已加载
    this.loadingKeys = new Set();  // 正在加载的音效键名
    this.loadPromises = {};       // 每个音效的加载 Promise
    
    // ✅ FIX: 音频节流机制 - 防止同一音效快速重复播放（避免"音频爆炸"）
    this.lastPlayTimes = {}; // 记录每个音效的最后播放时间
    this.throttleDelay = 50; // 同一音效的最小播放间隔（毫秒）
    
    // 加载状态（向后兼容）
    this.loaded = false;
    this.loadProgress = 0;
    
    // 音量设置（从 Game.settings 读取）
    this.masterVolume = 1.0;
    this.sfxVolume = 1.0;
    this.bgmVolume = 1.0;  // 背景音乐音量
    this.uiVolume = 1.0;   // UI 音效音量
    
    // BGM 控制
    this.currentBgm = null;      // 当前播放的 BGM Audio 对象
    this.currentBgmKey = null;   // 当前播放的 BGM 键名
    
    console.log('[AudioManager] 实例已创建');
  }
  
  /**
   * 预加载关键音频文件（UI相关音效）
   * @returns {Promise<void>}
   */
  async preloadCritical() {
    console.log('[AudioManager] 开始预加载关键音频文件...');
    
    const keys = Object.keys(this.audioFiles.critical);
    const totalFiles = keys.length;
    let loadedFiles = 0;
    
    // 为每个关键音效创建音效池
    for (const key of keys) {
      const url = this.audioFiles.critical[key];
      await this._loadAudioKey(key, url);
      
      loadedFiles++;
      this.loadProgress = (loadedFiles / totalFiles) * 100;
      console.log(`[AudioManager] 关键音频加载进度: ${Math.round(this.loadProgress)}%`);
    }
    
    this.criticalLoaded = true;
    this.loaded = true; // 向后兼容
    console.log('[AudioManager] 关键音频文件加载完成！');
  }
  
  /**
   * 预加载所有音频文件（向后兼容，不推荐使用）
   * @returns {Promise<void>}
   */
  async preload() {
    console.log('[AudioManager] 开始预加载所有音频文件...');
    
    // 先加载关键音效
    await this.preloadCritical();
    
    // 然后加载游戏内音效
    const keys = Object.keys(this.audioFiles.gameplay);
    const totalFiles = keys.length;
    let loadedFiles = 0;
    
    for (const key of keys) {
      const url = this.audioFiles.gameplay[key];
      await this._loadAudioKey(key, url);
      
      loadedFiles++;
      this.loadProgress = 50 + (loadedFiles / totalFiles) * 50; // 50-100%
      console.log(`[AudioManager] 游戏音频加载进度: ${Math.round(this.loadProgress)}%`);
    }
    
    console.log('[AudioManager] 所有音频文件加载完成！');
  }
  
  /**
   * 内部方法：加载单个音效键
   * @param {string} key - 音效键名
   * @param {string} url - 音频文件URL
   * @returns {Promise<void>}
   */
  async _loadAudioKey(key, url) {
    // 如果已加载，直接返回
    if (this.soundPools[key] && this.soundPools[key].length > 0) {
      return;
    }
    
    // 如果正在加载，等待加载完成
    if (this.loadingKeys.has(key)) {
      return this.loadPromises[key];
    }
    
    // 开始加载
    this.loadingKeys.add(key);
    this.soundPools[key] = [];
    
    const loadPromise = (async () => {
      // 创建多个实例
      for (let i = 0; i < this.poolSize; i++) {
        const audio = new Audio(url);
        audio.preload = 'auto';
        
        // 预加载音频
        try {
          await new Promise((resolve, reject) => {
            audio.addEventListener('canplaythrough', resolve, { once: true });
            audio.addEventListener('error', reject, { once: true });
            audio.load();
          });
          
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
   * 按需加载游戏内音效（当首次播放时自动加载）
   * @param {string} key - 音效键名
   * @returns {Promise<void>}
   */
  async _ensureAudioLoaded(key) {
    // 检查是否已加载
    if (this.soundPools[key] && this.soundPools[key].length > 0) {
      return;
    }
    
    // 检查是否在关键音效中
    if (this.audioFiles.critical[key]) {
      const url = this.audioFiles.critical[key];
      await this._loadAudioKey(key, url);
      return;
    }
    
    // 检查是否在游戏内音效中
    if (this.audioFiles.gameplay[key]) {
      const url = this.audioFiles.gameplay[key];
      console.log(`[AudioManager] 按需加载游戏音效: ${key}`);
      await this._loadAudioKey(key, url);
      return;
    }
    
    // 向后兼容：检查合并后的映射
    if (this.allAudioFiles[key]) {
      const url = this.allAudioFiles[key];
      console.log(`[AudioManager] 按需加载音效: ${key}`);
      await this._loadAudioKey(key, url);
      return;
    }
    
    console.warn(`[AudioManager] 音效不存在: ${key}`);
  }
  
  /**
   * 后台预加载游戏内音效（可选，用于提前加载常用音效）
   * @param {Array<string>} keys - 要预加载的音效键名数组（可选，默认加载所有）
   * @returns {Promise<void>}
   */
  async preloadGameplayAudio(keys = null) {
    const keysToLoad = keys || Object.keys(this.audioFiles.gameplay);
    console.log(`[AudioManager] 开始后台预加载游戏音效: ${keysToLoad.length} 个`);
    
    // 并行加载，但不阻塞
    const loadPromises = keysToLoad.map(key => {
      if (this.audioFiles.gameplay[key]) {
        return this._loadAudioKey(key, this.audioFiles.gameplay[key]).catch(err => {
          console.warn(`[AudioManager] 后台加载失败: ${key}`, err);
        });
      }
      return Promise.resolve();
    });
    
    await Promise.all(loadPromises);
    console.log('[AudioManager] 游戏音效后台预加载完成');
  }
  
  /**
   * 播放音效（支持按需加载）
   * @param {string} key - 音效键名
   * @param {object} options - 播放选项
   * @param {number} options.volume - 音量 (0-1)，默认 1.0
   * @param {number} options.pitchVar - 音调变化范围 (例如 0.1 表示 0.9-1.1)，默认 0
   * @param {boolean} options.loop - 是否循环播放，默认 false
   * @param {boolean} options.waitForLoad - 是否等待加载完成再播放，默认 false（不阻塞）
   * @param {string} options.forceCategory - 强制指定音效分类 ('ui' 或 'gameplay')，覆盖默认分类逻辑
   * @returns {HTMLAudioElement|null} - 返回播放的 Audio 元素，如果播放失败则返回 null
   */
  play(key, options = {}) {
    const waitForLoad = options.waitForLoad === true;
    
    // 如果音效已加载，直接播放（同步路径，最快）
    if (this.soundPools[key] && this.soundPools[key].length > 0) {
      return this._playFromPool(key, options);
    }
    
    // 如果音效未加载，按需加载
    if (waitForLoad) {
      // 同步等待加载（不推荐，会阻塞）
      console.warn(`[AudioManager] 同步等待音效加载: ${key}，这可能会阻塞`);
      // 注意：这里不能真正同步等待，因为 _ensureAudioLoaded 是异步的
      // 所以 fallback 到异步加载
      this._ensureAudioLoaded(key).then(() => {
        this._playFromPool(key, options);
      }).catch(err => {
        console.warn(`[AudioManager] 加载音效失败: ${key}`, err);
      });
      return null;
    } else {
      // 异步加载，不阻塞（推荐）
      this._ensureAudioLoaded(key).then(() => {
        this._playFromPool(key, options);
      }).catch(err => {
        console.warn(`[AudioManager] 异步加载音效失败: ${key}`, err);
      });
      return null; // 立即返回，音效将在加载完成后播放
    }
  }
  
  /**
   * 内部方法：从音效池播放音效
   * @param {string} key - 音效键名
   * @param {object} options - 播放选项
   * @returns {HTMLAudioElement|null}
   */
  _playFromPool(key, options = {}) {
    // 检查音效是否存在
    if (!this.soundPools[key] || this.soundPools[key].length === 0) {
      return null;
    }
    
    // ✅ FIX: 音频节流 - 检查是否在节流时间内
    const now = Date.now();
    const lastPlayTime = this.lastPlayTimes[key] || 0;
    const timeSinceLastPlay = now - lastPlayTime;
    
    // 如果距离上次播放时间太短，跳过本次播放（防止音频爆炸）
    if (timeSinceLastPlay < this.throttleDelay) {
      return null; // 静默跳过，不播放
    }
    
    // 从 Game.settings 读取音量设置（如果存在）
    const game = window.game;
    if (game && game.settings) {
      this.updateVolumes(game.settings);
    }
    
    // 如果音频被禁用，直接返回
    if (this.masterVolume === 0) {
      return null;
    }
    
    // ✅ FIX: 更新最后播放时间
    this.lastPlayTimes[key] = now;
    
    // 从音效池中获取可用的实例
    const pool = this.soundPools[key];
    let soundInstance = null;
    
    // 优先使用未播放的实例
    for (const instance of pool) {
      if (!instance.playing) {
        soundInstance = instance;
        break;
      }
    }
    
    // 如果所有实例都在播放，使用最早播放的实例
    if (!soundInstance) {
      soundInstance = pool.reduce((oldest, current) => 
        current.lastPlayTime < oldest.lastPlayTime ? current : oldest
      );
    }
    
    const audio = soundInstance.audio;
    
    // 停止当前播放（如果正在播放）
    audio.pause();
    audio.currentTime = 0;
    
    // 设置音量：根据音效类型应用不同的音量乘数
    const baseVolume = options.volume !== undefined ? options.volume : 1.0;
    // 判断音效类型：优先使用 forceCategory，否则按默认逻辑（critical 使用 uiVolume，gameplay 使用 sfxVolume）
    let categoryVolume;
    if (options.forceCategory === 'ui') {
      categoryVolume = this.uiVolume;
    } else if (options.forceCategory === 'gameplay') {
      categoryVolume = this.sfxVolume;
    } else {
      // 默认逻辑：critical 使用 uiVolume，gameplay 使用 sfxVolume
      categoryVolume = this.audioFiles.critical[key] ? this.uiVolume : this.sfxVolume;
    }
    audio.volume = Math.min(1.0, baseVolume * categoryVolume * this.masterVolume);
    
    // 设置循环
    audio.loop = options.loop || false;
    
    // 音调变化（通过 playbackRate 实现）
    const pitchVar = options.pitchVar || 0;
    if (pitchVar > 0) {
      const randomPitch = 1.0 + (Math.random() * 2 - 1) * pitchVar;
      audio.playbackRate = Math.max(0.5, Math.min(2.0, randomPitch)); // 限制在 0.5-2.0 范围内
    } else {
      audio.playbackRate = 1.0;
    }
    
    // 播放音效
    try {
      audio.play().catch(error => {
        console.warn(`[AudioManager] 播放失败: ${key}`, error);
      });
      
      soundInstance.playing = true;
      soundInstance.lastPlayTime = Date.now();
      
      // 播放结束后重置状态
      audio.addEventListener('ended', () => {
        soundInstance.playing = false;
      }, { once: true });
      
      return audio;
    } catch (error) {
      console.warn(`[AudioManager] 播放异常: ${key}`, error);
      return null;
    }
  }
  
  /**
   * 停止指定音效
   * @param {string} key - 音效键名
   */
  stop(key) {
    if (!this.soundPools[key]) return;
    
    const pool = this.soundPools[key];
    for (const instance of pool) {
      instance.audio.pause();
      instance.audio.currentTime = 0;
      instance.playing = false;
    }
  }
  
  /**
   * 停止所有音效
   */
  stopAll() {
    for (const key of Object.keys(this.soundPools)) {
      this.stop(key);
    }
  }
  
  /**
   * 更新音量设置
   * @param {Object} settings - 游戏设置对象
   */
  updateVolumes(settings) {
    if (!settings) {
      console.warn('[AudioManager] updateVolumes called with invalid settings');
      return;
    }
    
    // 主音量开关
    this.masterVolume = settings.audioEnabled !== false ? 1.0 : 0.0;
    
    // 独立通道音量 (0-100 -> 0.0-1.0)，处理边界情况
    const bgmVol = settings.bgmVolume;
    const sfxVol = settings.sfxVolume;
    const uiVol = settings.uiSfxVolume;
    
    this.bgmVolume = (typeof bgmVol === 'number' && !isNaN(bgmVol) && bgmVol >= 0 && bgmVol <= 100) 
      ? bgmVol / 100 
      : 1.0;
    this.sfxVolume = (typeof sfxVol === 'number' && !isNaN(sfxVol) && sfxVol >= 0 && sfxVol <= 100) 
      ? sfxVol / 100 
      : 1.0;
    this.uiVolume = (typeof uiVol === 'number' && !isNaN(uiVol) && uiVol >= 0 && uiVol <= 100) 
      ? uiVol / 100 
      : 1.0;

    // 实时更新当前播放的 BGM 音量
    if (this.currentBgm) {
      this.currentBgm.volume = Math.max(0, Math.min(1, this.bgmVolume * this.masterVolume));
    }
  }
  
  /**
   * 恢复音频上下文（处理浏览器自动播放限制）
   * 在用户首次交互时调用，解锁音频播放
   */
  resume() {
    if (this.audioContextResumed) {
      return Promise.resolve();
    }
    
    this.audioContextResumed = true;
    
    // 创建一个静音的 Audio 实例并播放，以解锁音频上下文
    const unlockAudio = () => {
      const audio = new Audio();
      audio.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';
      audio.volume = 0;
      audio.play().then(() => {
        audio.pause();
        audio.remove();
        console.log('[AudioManager] Audio context resumed');
      }).catch(err => {
        console.warn('[AudioManager] Failed to resume audio context:', err);
      });
    };
    
    // 尝试立即解锁
    unlockAudio();
    
    return Promise.resolve();
  }
  
  /**
   * 设置主音量
   * @param {number} volume - 音量 (0-1)
   */
  setMasterVolume(volume) {
    this.masterVolume = Math.max(0, Math.min(1, volume));
  }
  
  /**
   * 设置音效音量
   * @param {number} volume - 音量 (0-1)
   */
  setSfxVolume(volume) {
    this.sfxVolume = Math.max(0, Math.min(1, volume));
  }
  
  /**
   * 播放背景音乐 (独占, 循环)
   * @param {string} key - 音效键名
   */
  playBgm(key) {
    // 确保音频上下文已解锁
    if (!this.audioContextResumed) {
      this.resume();
    }
    
    if (this.masterVolume === 0) return; // 静音时不开始播放，但保留逻辑需要时可优化
    if (this.currentBgmKey === key && this.currentBgm && !this.currentBgm.paused) return;

    // 停止当前 BGM
    this.stopBgm();

    // 保存请求的 key，用于防御性检查
    const requestedKey = key;

    // 异步加载并播放
    this._ensureAudioLoaded(key).then(() => {
        // 防御性检查：确保加载完成时，请求的 key 依然是 currentBgmKey（防止加载期间切歌导致的竞态问题）
        if (this.currentBgmKey !== null && this.currentBgmKey !== requestedKey) {
          // 加载期间已经切换了 BGM，放弃本次播放
          console.log(`[AudioManager] BGM load cancelled: ${requestedKey} (switched to ${this.currentBgmKey})`);
          return;
        }
        
        // 再次检查（防止加载期间切换了BGM）
        if (this.currentBgm && this.currentBgmKey !== requestedKey) {
          this.stopBgm();
          return;
        }
        
        // 查找音频 URL（优先查找 BGM，然后 gameplay，最后 critical）
        let url = this.audioFiles.bgm[requestedKey] || this.audioFiles.gameplay[requestedKey] || this.audioFiles.critical[requestedKey] || this.allAudioFiles[requestedKey];
        
        if (!url) {
            console.warn(`[AudioManager] BGM not found: ${requestedKey}`);
            return;
        }

        const audio = new Audio(url);
        audio.loop = true;
        audio.volume = this.bgmVolume * this.masterVolume;
        
        const playPromise = audio.play();
        if (playPromise !== undefined) {
            playPromise.catch(error => {
                console.warn(`[AudioManager] BGM autoplay prevented: ${error}`);
                // 播放失败时清理状态
                if (this.currentBgmKey === requestedKey) {
                  this.currentBgm = null;
                  this.currentBgmKey = null;
                }
            });
        }
        
        // 再次确认状态（防止竞态）
        if (this.currentBgmKey === null || this.currentBgmKey === requestedKey) {
          this.currentBgm = audio;
          this.currentBgmKey = requestedKey;
          console.log(`[AudioManager] Playing BGM: ${requestedKey}`);
        }
    }).catch(error => {
        console.warn(`[AudioManager] BGM load failed: ${key}`, error);
        // 加载失败时清理状态
        if (this.currentBgmKey === requestedKey) {
          this.currentBgm = null;
          this.currentBgmKey = null;
        }
    });
  }
  
  /**
   * 停止背景音乐
   */
  stopBgm() {
    if (this.currentBgm) {
        this.currentBgm.pause();
        this.currentBgm.currentTime = 0;
        this.currentBgm = null;
        this.currentBgmKey = null;
    }
  }
  
  /**
   * 播放脚步声（随机从多个变体中选择）
   */
  playFootstep() {
    const footsteps = ['footstep', 'footstep2', 'footstep3', 'footstep4', 'footstep5', 
                      'footstep6', 'footstep7', 'footstep8', 'footstep9', 'footstep10'];
    const randomFootstep = footsteps[Math.floor(Math.random() * footsteps.length)];
    return this.play(randomFootstep, { 
      volume: 0.3, 
      pitchVar: 0.15,
      waitForLoad: false // 不阻塞，异步加载
    });
  }
  
  /**
   * 播放攻击音效（带随机音调）
   */
  playAttack() {
    return this.play('chop', { 
      volume: 0.6, 
      pitchVar: 0.1,
      waitForLoad: false
    });
  }
  
  /**
   * 播放暴击音效（音调更高、音量更大）
   */
  playCrit() {
    return this.play('chop', { 
      volume: 0.9, 
      pitchVar: 0.2, // 更高的音调变化范围
      waitForLoad: false
    });
  }
  
  /**
   * 播放受击音效
   */
  playHit() {
    return this.play('metalPot', { 
      volume: 0.5, 
      pitchVar: 0.1,
      waitForLoad: false
    });
  }
  
  /**
   * 播放开门音效
   */
  playDoorOpen() {
    return this.play('doorOpen', { 
      volume: 0.7,
      waitForLoad: false
    });
  }
  
  /**
   * 播放楼层开始音效（楼层切换时的重击/钟声）
   */
  playLevelStart() {
    // Placeholder: 使用 metalPot 音效模拟沉重敲击感
    return this.play('metalPot', { 
      volume: 0.5, 
      pitchVar: 0,
      waitForLoad: false
    });
    // 说明：目前 play() 没有直接的音高控制接口，
    // 这里将 pitchVar 设为 0，后续可以替换为专门的 level_start.ogg 资源。
  }
  
  /**
   * 播放金币音效
   * @param {object} options - 播放选项（支持 forceCategory）
   */
  playCoins(options = {}) {
    return this.play('handleCoins', { 
      volume: 0.5, 
      pitchVar: 0.05,
      ...options
    });
  }
  
  /**
   * 播放布料音效（背包/装备）
   */
  playCloth() {
    return this.play('cloth', { 
      volume: 0.4 
    });
  }
  
  /**
   * 播放书页翻动音效（图鉴/菜单）
   */
  playBookFlip() {
    return this.play('bookFlip', { 
      volume: 0.5 
    });
  }
  
  /**
   * 播放打开书本音效（图鉴打开）
   */
  playBookOpen() {
    return this.play('bookOpen', { 
      volume: 0.6 
    });
  }
  
  /**
   * 播放近战攻击音效（向后兼容）
   */
  playMeleeHit() {
    return this.playHit();
  }
  
  /**
   * 播放金属点击音效（向后兼容）
   */
  playMetalClick() {
    return this.play('metalPot', { 
      volume: 0.3,
      waitForLoad: false
    });
  }
  
  /**
   * 获取单例实例
   * @returns {AudioManager}
   */
  static getInstance() {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager();
    }
    return AudioManager.instance;
  }
}

// 导出单例实例
export default AudioManager.getInstance();

