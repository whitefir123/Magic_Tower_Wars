// SupabaseService.js - 全局排行榜服务
// 使用 Supabase 实现用户注册、分数上传和排行榜查询功能

// ⚠️ 重要：如果遇到连接超时，请检查 Supabase Dashboard 中的项目是否处于 PAUSED（休眠）状态
// Check if project is PAUSED in Supabase Dashboard if you get Timeouts.

/**
 * 每日挑战排行榜表结构参考:
 * 
 * create table daily_leaderboard (
 *   id uuid default uuid_generate_v4() primary key,
 *   run_date date not null,
 *   user_id uuid references users(id) not null,
 *   score int not null,
 *   details jsonb default '{}'::jsonb,
 *   created_at timestamp with time zone default timezone('utc'::text, now()) not null
 * );
 * 
 * -- 建立索引以便快速查询当日排行
 * create index idx_daily_leaderboard_date_score on daily_leaderboard (run_date, score desc);
 */

/**
 * 赛季制排行榜系统 - 数据库表结构 SQL
 * 
 * -- 1. 创建赛季定义表
 * CREATE TABLE seasons (
 *   id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
 *   code VARCHAR(20) UNIQUE NOT NULL,      -- 代号，如 'S1'
 *   name VARCHAR(50) NOT NULL,             -- 名称，如 '启航赛季'
 *   start_at TIMESTAMP WITH TIME ZONE NOT NULL,
 *   end_at TIMESTAMP WITH TIME ZONE NOT NULL,
 *   is_active BOOLEAN DEFAULT true,        -- 用于紧急停用
 *   created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
 * );
 * 
 * -- 创建索引以加速时间范围查询
 * CREATE INDEX idx_seasons_dates ON seasons (start_at, end_at);
 * 
 * -- 2. 修改排行榜表，添加赛季关联
 * -- 如果 leaderboard 表已经有数据，新列将默认为 NULL (即非赛季/全局历史数据)
 * ALTER TABLE leaderboard 
 * ADD COLUMN season_id UUID REFERENCES seasons(id);
 * 
 * -- 创建联合索引加速赛季排名查询
 * CREATE INDEX idx_leaderboard_season_score ON leaderboard (season_id, score DESC);
 * 
 * -- 3. 创建赛季奖励领取记录表
 * CREATE TABLE season_rewards (
 *   id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
 *   user_id UUID REFERENCES users(id),     -- 领奖用户
 *   season_id UUID REFERENCES seasons(id), -- 对应赛季
 *   rank INTEGER NOT NULL,                 -- 结算时的排名
 *   rewards JSONB NOT NULL,                -- 奖励内容快照 { "soulCrystals": 100 }
 *   claimed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
 *   
 *   -- 唯一约束：确保每个用户每个赛季只能领一次
 *   UNIQUE(user_id, season_id)
 * );
 * 
 * -- 4. 配置行级安全策略 (RLS)
 * -- 开启 RLS
 * ALTER TABLE seasons ENABLE ROW LEVEL SECURITY;
 * ALTER TABLE season_rewards ENABLE ROW LEVEL SECURITY;
 * 
 * -- 策略：Seasons (所有人可读，仅管理员可写/通过Dashboard写)
 * CREATE POLICY "Allow public read access to seasons" ON seasons FOR SELECT USING (true);
 * 
 * -- 策略：Season Rewards (用户只能读写自己的领奖记录)
 * -- 注意：这里假设前端直接插入领奖记录。在无后端环境中，这依赖客户端逻辑。
 * CREATE POLICY "Allow users to read own rewards" ON season_rewards FOR SELECT USING (true);
 * CREATE POLICY "Allow users to insert own rewards" ON season_rewards FOR INSERT WITH CHECK (true);
 * 
 * -- 5. 插入第一个赛季 (示例：S1赛季，从今天开始，持续30天)
 * -- 你可以在 SQL Editor 中手动修改这个日期，或者运行后在 Table Editor 中修改
 * INSERT INTO seasons (code, name, start_at, end_at)
 * VALUES (
 *   'S1', 
 *   '启航·创世赛季', 
 *   NOW(), 
 *   NOW() + INTERVAL '30 days'
 * );
 */

const SUPABASE_URL = 'https://iggnwszpgggwubbofwoj.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlnZ253c3pwZ2dnd3ViYm9md29qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0OTIwNjUsImV4cCI6MjA4MjA2ODA2NX0.NuAL14Xiv5ZYpbwttUPJG1t4nWo0imBi8t8HZgSbC-k';

class SupabaseService {
  constructor() {
    this.supabase = null;
    this.userId = null;
    this.isInitialized = false;
    this.currentSeason = null; // 当前赛季
  }

  /**
   * 初始化 Supabase 客户端（简化版本 - CDN UMD 模式）
   * 注意：SDK 已在 index.html 中通过 <script> 标签从 CDN 同步加载（UMD 构建版本）
   * @returns {Promise<boolean>} 初始化是否成功
   */
  async initialize() {
    try {
      console.log('[SupabaseService] 🔧 开始初始化...');

      // 等待 SDK 加载完成（最多等待 6 秒）
      let attempts = 0;
      const maxAttempts = 60; // 60 * 100ms = 6秒
      while (typeof window.supabase === 'undefined' && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 100)); // 等待 100ms
        attempts++;
        if (attempts % 10 === 0) {
          console.log(`[SupabaseService] ⏳ 等待 SDK 加载中... (${attempts * 100}ms)`);
        }
      }

      // 检查 window.supabase 是否存在
      if (typeof window.supabase === 'undefined' || typeof window.supabase.createClient === 'undefined') {
        console.error('[SupabaseService] ❌ window.supabase 未定义（等待超时）');
        console.error('[SupabaseService] 💡 请确保 index.html 中已正确引用 UMD 构建版本:');
        console.error('[SupabaseService] 💡 <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js"></script>');
        console.error('[SupabaseService] 💡 window.supabase 类型:', typeof window.supabase);
        return false;
      }

      // 创建 Supabase 客户端
      console.log('[SupabaseService] 🔧 创建 Supabase 客户端...');
      this.supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
      
      if (!this.supabase) {
        console.error('[SupabaseService] ❌ 客户端创建失败');
        return false;
      }

      this.isInitialized = true;
      console.log('[SupabaseService] ✅ 初始化成功');
      return true;
    } catch (error) {
      console.error('[SupabaseService] ❌ 初始化失败 - 错误详情:', JSON.stringify(error, null, 2));
      console.error('[SupabaseService] 错误堆栈:', error.stack);
      return false;
    }
  }

  /**
   * 测试 Supabase 连接状态（诊断工具）
   * @returns {Object} { status: string, message: string, details: any }
   * 
   * 可能的状态：
   * - "OK": 连接正常
   * - "NETWORK_ERROR": 网络错误或服务器休眠（ERR_TIMED_OUT）
   * - "AUTH_ERROR": API Key 错误（401 Unauthorized）
   * - "URL_ERROR": Project URL 错误（404 Not Found）
   * - "SDK_ERROR": Supabase SDK 未加载
   * - "UNKNOWN_ERROR": 未知错误
   */
  async testConnection() {
    console.log('[SupabaseService] 🔍 开始连接诊断...');
    console.log('[SupabaseService] 📍 测试 URL:', SUPABASE_URL);
    
    // 检查 SDK 是否加载
    if (!this.isInitialized) {
      if (!this.initialize()) {
        const errorMsg = 'Supabase SDK 未加载或初始化失败';
        console.error('[SupabaseService] ❌ 诊断结果:', errorMsg);
        return { 
          status: 'SDK_ERROR', 
          message: errorMsg,
          details: null 
        };
      }
    }

    try {
      // 创建超时控制器（5秒超时，比正常请求更短以快速诊断）
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, 5000);

      // 尝试简单的查询：获取 users 表的记录数
      console.log('[SupabaseService] 🔍 尝试查询 users 表...');
      
      const queryPromise = this.supabase
        .from('users')
        .select('id', { count: 'exact', head: true });

      const timeoutPromise = new Promise((_, reject) => {
        controller.signal.addEventListener('abort', () => {
          reject(new Error('CONNECTION_TIMEOUT'));
        });
      });

      const { error, count } = await Promise.race([queryPromise, timeoutPromise]);
      
      clearTimeout(timeoutId);

      // 检查是否有错误
      if (error) {
        console.error('[SupabaseService] ❌ 查询错误:', JSON.stringify(error, null, 2));
        
        // 分析错误类型
        const errorCode = error.code;
        const errorMessage = error.message || '';
        const errorStatus = error.status;

        // 401 Unauthorized - API Key 错误
        if (errorStatus === 401 || errorCode === '401' || errorMessage.includes('401')) {
          const msg = 'API Key 无效或已过期 (401 Unauthorized)';
          console.error('[SupabaseService] 🔑 诊断结果:', msg);
          return { 
            status: 'AUTH_ERROR', 
            message: msg,
            details: error 
          };
        }

        // 404 Not Found - Project URL 错误
        if (errorStatus === 404 || errorCode === '404' || errorMessage.includes('404')) {
          const msg = 'Supabase Project URL 错误 (404 Not Found)';
          console.error('[SupabaseService] 🌐 诊断结果:', msg);
          return { 
            status: 'URL_ERROR', 
            message: msg,
            details: error 
          };
        }

        // 其他错误
        const msg = `数据库查询错误: ${errorMessage}`;
        console.error('[SupabaseService] ⚠️ 诊断结果:', msg);
        return { 
          status: 'UNKNOWN_ERROR', 
          message: msg,
          details: error 
        };
      }

      // 连接成功
      const successMsg = `连接正常 ✓ (users 表有 ${count || 0} 条记录)`;
      console.log('[SupabaseService] ✅ 诊断结果:', successMsg);
      return { 
        status: 'OK', 
        message: successMsg,
        details: { count } 
      };

    } catch (error) {
      console.error('[SupabaseService] ❌ 连接测试异常:', JSON.stringify(error, null, 2));
      
      // 检测超时或网络错误
      if (error.message === 'CONNECTION_TIMEOUT' || 
          error.name === 'AbortError' || 
          error.message?.includes('timeout') ||
          error.message?.includes('Failed to fetch') ||
          error.message?.includes('NetworkError')) {
        
        const msg = '连接超时或服务器休眠 (ERR_TIMED_OUT) - 服务器可能已暂停，请在 Supabase Dashboard 中检查项目状态';
        console.error('[SupabaseService] 🌐 诊断结果:', msg);
        return { 
          status: 'NETWORK_ERROR', 
          message: msg,
          details: error 
        };
      }

      // 其他未知错误
      const msg = `未知错误: ${error.message || '无法连接到服务器'}`;
      console.error('[SupabaseService] ⚠️ 诊断结果:', msg);
      return { 
        status: 'UNKNOWN_ERROR', 
        message: msg,
        details: error 
      };
    }
  }

  /**
   * 检查用户是否已注册
   * @returns {Promise<Object>} { registered: boolean, userId: string | null, nickname: string | null, offline: boolean, errorReason: string }
   */
  async initUser() {
    // 步骤 1：初始化 Supabase 客户端（异步）
    if (!this.isInitialized) {
      console.log('[SupabaseService] 🔧 客户端未初始化，开始初始化...');
      const initResult = await this.initialize();
      if (!initResult) {
        const errorMsg = 'Supabase SDK 加载失败 - 可能被 CSP 阻止或网络错误';
        console.error('[SupabaseService] ❌', errorMsg);
        // 即使 SDK 加载失败，也检查本地存储，允许离线模式
        const storedUserId = localStorage.getItem('leaderboard_user_id');
        const storedNickname = localStorage.getItem('leaderboard_nickname');
        if (storedUserId && storedNickname) {
          console.warn('[SupabaseService] ⚠️ SDK 加载失败，但检测到本地存档，进入离线模式');
          this.userId = storedUserId; // 设置内存中的 ID，以便后续方法可以使用
          return { 
            registered: true, 
            userId: storedUserId, 
            nickname: storedNickname, 
            offline: true,
            errorReason: errorMsg,
            connectionStatus: 'SDK_ERROR'
          };
        }
        return { 
          registered: false, 
          userId: null, 
          nickname: null, 
          offline: true,
          errorReason: errorMsg,
          connectionStatus: 'SDK_ERROR'
        };
      }
    }

    // 步骤 2：检查 LocalStorage 中的用户信息（优先检查本地，即使连接失败也保留）
    try {
      const storedUserId = localStorage.getItem('leaderboard_user_id');
      const storedNickname = localStorage.getItem('leaderboard_nickname');

      if (storedUserId && storedNickname) {
        // 尝试验证用户是否在数据库中存在
        console.log('[SupabaseService] 🔍 验证已存储的用户:', storedNickname);
        
        try {
          const { data, error } = await this.supabase
            .from('users')
            .select('id, nickname')
            .eq('id', storedUserId)
            .single();

          if (error) {
            // 关键修复：区分 "查无此人" 和 "网络错误"
            // PGRST116 是 Supabase/PostgREST 返回的 "Row not found" 标准错误码
            const errorCode = error.code;
            const errorMessage = error.message || '';
            
            if (errorCode === 'PGRST116' || errorMessage.includes('no) rows returned')) {
              // 情况 A：账号确实不存在，清除无效的本地数据
              console.warn('[SupabaseService] ⚠️ ID 不存在 (PGRST116)，服务器已无此账号，清除本地无效数据');
              localStorage.removeItem('leaderboard_user_id');
              localStorage.removeItem('leaderboard_nickname');
              return { 
                registered: false, 
                userId: null, 
                nickname: null, 
                offline: false 
              };
            }
            
            // 情况 B：网络/服务器故障 -> 信任本地数据，进入离线模式
            console.warn('[SupabaseService] ⚠️ 验证失败但保留本地数据 (进入离线模式) - 错误详情:', errorMessage);
            console.warn('[SupabaseService] ⚠️ 错误代码:', errorCode, '错误类型:', typeof error);
            this.userId = storedUserId;
            return { 
              registered: true, 
              userId: storedUserId, 
              nickname: storedNickname, 
              offline: true, // 标记为离线已登录
              errorReason: errorMessage,
              connectionStatus: 'NETWORK_ERROR'
            };
          }

          // 验证成功 (无错误)
          this.userId = data.id;
          console.log('[SupabaseService] ✅ 用户已登录:', data.nickname);
          return { 
            registered: true, 
            userId: data.id, 
            nickname: data.nickname, 
            offline: false 
          };
        } catch (networkError) {
          // 捕获网络异常（如超时、TypeError 等）
          console.warn('[SupabaseService] ⚠️ 验证请求异常，保留本地数据 (进入离线模式) - 异常详情:', networkError.message);
          this.userId = storedUserId;
          return { 
            registered: true, 
            userId: storedUserId, 
            nickname: storedNickname, 
            offline: true,
            errorReason: networkError.message || '网络请求异常',
            connectionStatus: 'NETWORK_ERROR'
          };
        }
      }

      // LocalStorage 为空，用户需要注册
      // 此时可以尝试测试连接，但即使连接失败也不影响注册流程
      console.log('[SupabaseService] 📝 未找到已注册用户，需要注册昵称');
      
      // 可选：进行连接测试（诊断用，但不阻塞）
      try {
        const connectionTest = await this.testConnection();
        if (connectionTest.status !== 'OK') {
          console.warn('[SupabaseService] ⚠️ 连接测试失败:', connectionTest.message);
        } else {
          console.log('[SupabaseService] ✅ 连接测试通过');
        }
      } catch (testError) {
        console.warn('[SupabaseService] ⚠️ 连接测试异常:', testError.message);
      }
      
      return { 
        registered: false, 
        userId: null, 
        nickname: null, 
        offline: false 
      };
    } catch (error) {
      console.error('[SupabaseService] ❌ initUser 错误 - 错误详情:', JSON.stringify(error, null, 2));
      
      // 即使出现异常，也尝试返回本地存储的数据（如果有）
      const storedUserId = localStorage.getItem('leaderboard_user_id');
      const storedNickname = localStorage.getItem('leaderboard_nickname');
      if (storedUserId && storedNickname) {
        console.warn('[SupabaseService] ⚠️ 发生异常，但检测到本地存档，进入离线模式');
        this.userId = storedUserId;
        return { 
          registered: true, 
          userId: storedUserId, 
          nickname: storedNickname, 
          offline: true,
          errorReason: error.message || '未知错误'
        };
      }
      
      return { 
        registered: false, 
        userId: null, 
        nickname: null, 
        offline: true,
        errorReason: error.message || '未知错误'
      };
    }
  }

  /**
   * 注册新用户
   * @param {string} nickname - 用户昵称
   * @returns {Object} { success: boolean, userId: string | null, message: string }
   */
  async registerUser(nickname) {
    if (!this.isInitialized) {
      if (!this.initialize()) {
        return { success: false, userId: null, message: '服务未初始化' };
      }
    }

    try {
      // 防御性检查：在执行注册插入之前，检查 localStorage 是否已存在用户 ID
      // 这可以避免并发请求或网络恢复后发现已登录的情况
      const existingUserId = localStorage.getItem('leaderboard_user_id');
      const existingNickname = localStorage.getItem('leaderboard_nickname');
      
      if (existingUserId && existingNickname) {
        console.warn('[SupabaseService] ⚠️ 检测到本地已存在用户 ID，跳过注册避免覆盖旧账号');
        console.warn('[SupabaseService] ⚠️ 已存在的用户:', existingNickname, 'ID:', existingUserId);
        this.userId = existingUserId;
        return { 
          success: true, 
          userId: existingUserId, 
          message: '用户已登录（检测到本地存档）' 
        };
      }

      // 验证昵称
      if (!nickname || nickname.trim().length < 2) {
        return { success: false, userId: null, message: '昵称至少需要2个字符' };
      }

      if (nickname.trim().length > 20) {
        return { success: false, userId: null, message: '昵称不能超过20个字符' };
      }

      const trimmedNickname = nickname.trim();

      // 检查昵称是否已被使用
      const { data: existingUsers, error: checkError } = await this.supabase
        .from('users')
        .select('id')
        .eq('nickname', trimmedNickname);

      if (checkError) {
        console.error('[SupabaseService] 检查昵称失败 - 错误详情:', JSON.stringify(checkError, null, 2));
        return { success: false, userId: null, message: '网络错误，请重试' };
      }

      if (existingUsers && existingUsers.length > 0) {
        return { success: false, userId: null, message: '昵称已被使用，请换一个' };
      }

      // 防御性检查：在执行插入之前，再次检查 localStorage（并发防御）
      // 如果 localStorage 中突然有了 ID（例如用户在另一个标签页注册了），应立即中止注册
      const doubleCheckUserId = localStorage.getItem('leaderboard_user_id');
      const doubleCheckNickname = localStorage.getItem('leaderboard_nickname');
      if (doubleCheckUserId && doubleCheckNickname) {
        console.warn('[SupabaseService] ⚠️ 在执行插入前检测到本地已存在用户 ID（可能由并发注册产生），中止注册');
        console.warn('[SupabaseService] ⚠️ 已存在的用户:', doubleCheckNickname, 'ID:', doubleCheckUserId);
        this.userId = doubleCheckUserId;
        return { 
          success: true, 
          userId: doubleCheckUserId, 
          message: '用户已登录（检测到并发注册）' 
        };
      }

      // 插入新用户
      const { data, error } = await this.supabase
        .from('users')
        .insert([{ nickname: trimmedNickname }])
        .select()
        .single();

      if (error) {
        console.error('[SupabaseService] 注册用户失败 - 错误详情:', JSON.stringify(error, null, 2));
        return { success: false, userId: null, message: '注册失败，请重试' };
      }

      // 保存到 localStorage
      localStorage.setItem('leaderboard_user_id', data.id);
      localStorage.setItem('leaderboard_nickname', data.nickname);
      this.userId = data.id;

      console.log('[SupabaseService] 用户注册成功:', data.nickname);
      return { success: true, userId: data.id, message: '注册成功！' };
    } catch (error) {
      console.error('[SupabaseService] registerUser 错误 - 错误详情:', JSON.stringify(error, null, 2));
      return { success: false, userId: null, message: '网络错误，请重试' };
    }
  }

  /**
   * 提交游戏成绩
   * @param {Object} scoreData - 成绩数据
   * @param {number} scoreData.floor - 到达的层数
   * @param {number} scoreData.kills - 击杀数
   * @param {number} scoreData.damage - 造成的伤害
   * @param {number} scoreData.timeSeconds - 游戏时长（秒）
   * @param {string} scoreData.difficulty - 难度
   * @param {string} scoreData.character - 角色
   * @param {Object} scoreData.details - 详细信息（装备、属性等）
   * @returns {Object} { success: boolean, message: string }
   */
  async submitRun(scoreData) {
    if (!this.isInitialized) {
      console.warn('[SupabaseService] 服务未初始化，无法提交成绩');
      return { success: false, message: '服务未初始化' };
    }

    if (!this.userId) {
      console.warn('[SupabaseService] 用户未登录，无法提交成绩');
      return { success: false, message: '请先注册昵称' };
    }

    try {
      // 计算分数：楼层 * 50000 + 钥匙 * 5000 + 伤害 * 0.1 - 时间 * 5
      const score = Math.floor(
        (scoreData.floor || 0) * 50000 +
        (scoreData.keys || 0) * 5000 +
        (scoreData.damage || 0) * 0.1 -
        (scoreData.timeSeconds || 0) * 5
      );

      // 确保分数不为负数
      const finalScore = Math.max(0, score);

      const runData = {
        user_id: this.userId,
        score: finalScore,
        floor: scoreData.floor || 1,
        level: scoreData.level || 1, // 玩家等级
        kills: scoreData.kills || 0,
        damage: scoreData.damage || 0,
        time_seconds: scoreData.timeSeconds || 0,
        difficulty: scoreData.difficulty || 'normal',
        character: scoreData.character || 'unknown',
        details: scoreData.details || {},
        season_id: this.currentSeason ? this.currentSeason.id : null // 关联当前赛季（如果有）
      };

      const { data, error } = await this.supabase
        .from('leaderboard')
        .insert([runData])
        .select()
        .single();

      if (error) {
        console.error('[SupabaseService] 提交成绩失败 - 错误详情:', JSON.stringify(error, null, 2));
        const errorMessage = error.message || error.hint || '提交失败，请重试';
        return { 
          success: false, 
          message: errorMessage,
          errorCode: error.code,
          errorDetails: error
        };
      }

      console.log('[SupabaseService] 成绩提交成功，分数:', finalScore);
      return { success: true, message: '成绩已上传！', score: finalScore };
    } catch (error) {
      console.error('[SupabaseService] submitRun 错误 - 错误详情:', JSON.stringify(error, null, 2));
      const errorMessage = error.message || '网络错误，请检查连接';
      return { 
        success: false, 
        message: errorMessage,
        errorCode: error.code,
        errorDetails: error
      };
    }
  }

  /**
   * 获取排行榜数据
   * @param {number} limit - 获取的记录数量（默认 50）
   * @param {string} difficulty - 筛选难度（可选，如 'normal', 'hard', 'nightmare'）
   * @returns {Object} { success: boolean, data: Array, error: string|null }
   */
  async getTopRuns(limit = 50, difficulty = null) {
    if (!this.isInitialized) {
      if (!this.initialize()) {
        console.warn('[SupabaseService] 服务未初始化，无法获取排行榜');
        return { 
          success: false, 
          data: [], 
          error: '服务未初始化',
          errorCode: 'SERVICE_NOT_INITIALIZED'
        };
      }
    }

    // 创建 AbortController 用于超时控制
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
      console.warn('[SupabaseService] 请求超时（10秒）');
    }, 10000); // 10秒超时

    try {
      // 增加查询数量以确保去重后能填满 UI 的显示数量
      // 获取更多记录（例如 limit * 2 或至少 100 条），以便去重后仍有足够数据
      const fetchLimit = Math.max(limit * 2, 100);
      
      let query = this.supabase
        .from('leaderboard')
        .select(`
          id,
          score,
          floor,
          kills,
          damage,
          time_seconds,
          difficulty,
          character,
          details,
          created_at,
          user_id,
          users (nickname)
        `)
        .order('score', { ascending: false })
        .limit(fetchLimit);

      // 如果指定了难度，添加筛选条件
      if (difficulty) {
        query = query.eq('difficulty', difficulty);
      }

      // 执行查询并应用超时控制
      const queryPromise = query;
      const timeoutPromise = new Promise((_, reject) => {
        controller.signal.addEventListener('abort', () => {
          reject(new Error('Request timeout - 请求超时，服务器可能正在休眠'));
        });
      });

      // 使用 Promise.race 实现超时
      const { data, error } = await Promise.race([queryPromise, timeoutPromise]);

      // 清除超时定时器
      clearTimeout(timeoutId);

      if (error) {
        console.error('[SupabaseService] 获取排行榜失败 - 错误详情:', JSON.stringify(error, null, 2));
        console.error('[SupabaseService] 查询URL和参数:', {
          table: 'leaderboard',
          select: 'id, score, floor, kills, damage, time_seconds, difficulty, character, details, created_at, users(nickname)',
          order: 'score.desc',
          limit: fetchLimit,
          difficulty: difficulty || 'all'
        });
        // 返回包含错误信息的对象，而不是空数组
        return { 
          success: false, 
          data: [], 
          error: error.message || error.hint || '获取排行榜失败',
          errorCode: error.code,
          errorDetails: error
        };
      }

      // 格式化数据
      const formattedData = data.map((entry) => ({
        rank: 0, // 临时占位，稍后会重新计算
        nickname: entry.users?.nickname || '匿名',
        userId: entry.user_id, // 用于去重
        score: entry.score,
        floor: entry.floor,
        kills: entry.kills,
        damage: entry.damage,
        timeSeconds: entry.time_seconds,
        difficulty: entry.difficulty,
        character: entry.character,
        details: entry.details,
        createdAt: entry.created_at
      }));

      // 去重处理：同一用户（基于 nickname 或 user_id）只保留最高分的一条记录
      const userBestScores = new Map(); // key: userId 或 nickname, value: 最高分记录
      
      formattedData.forEach(entry => {
        // 优先使用 userId，如果没有则使用 nickname
        const userKey = entry.userId || entry.nickname;
        
        if (!userKey) {
          // 如果没有用户标识，跳过这条记录
          return;
        }
        
        const existing = userBestScores.get(userKey);
        
        // 如果该用户还没有记录，或者当前记录的分数更高，则更新
        if (!existing || entry.score > existing.score) {
          userBestScores.set(userKey, entry);
        }
      });

      // 将 Map 转换为数组，并按分数降序排序
      const deduplicatedData = Array.from(userBestScores.values())
        .sort((a, b) => b.score - a.score)
        .slice(0, limit) // 只取前 limit 条
        .map((entry, index) => ({
          ...entry,
          rank: index + 1 // 重新计算排名
        }));

      console.log(`[SupabaseService] 获取排行榜成功，原始记录 ${formattedData.length} 条，去重后 ${deduplicatedData.length} 条`);
      return { success: true, data: deduplicatedData, error: null };
    } catch (error) {
      // 清除超时定时器
      clearTimeout(timeoutId);
      
      console.error('[SupabaseService] getTopRuns 错误 - 错误详情:', JSON.stringify(error, null, 2));
      
      // 检测超时错误
      const isTimeout = error.name === 'AbortError' || error.message?.includes('timeout');
      const errorMessage = isTimeout 
        ? 'Request timeout - 请求超时，服务器可能正在休眠' 
        : (error.message || '网络错误，请检查连接');
      
      return { 
        success: false, 
        data: [], 
        error: errorMessage,
        errorCode: isTimeout ? 'TIMEOUT' : error.code,
        errorDetails: error
      };
    }
  }

  /**
   * 获取用户的最佳成绩
   * @returns {Object | null} 用户的最佳成绩
   */
  async getUserBestRun() {
    if (!this.isInitialized || !this.userId) {
      return null;
    }

    try {
      const { data, error } = await this.supabase
        .from('leaderboard')
        .select('*')
        .eq('user_id', this.userId)
        .order('score', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        console.warn('[SupabaseService] 获取用户最佳成绩失败 - 错误详情:', JSON.stringify(error, null, 2));
        return null;
      }

      return data;
    } catch (error) {
      console.error('[SupabaseService] getUserBestRun 错误 - 错误详情:', JSON.stringify(error, null, 2));
      return null;
    }
  }

  /**
   * 获取每日挑战排行榜
   * @param {string} dateStr - 日期字符串 (YYYY-MM-DD 格式)
   * @returns {Object} { success: boolean, data: Array, error: string|null }
   */
  async getDailyLeaderboard(dateStr) {
    if (!this.isInitialized) {
      if (!await this.initialize()) {
        console.warn('[SupabaseService] 服务未初始化，无法获取每日排行榜');
        return { 
          success: false, 
          data: [], 
          error: '服务未初始化',
          errorCode: 'SERVICE_NOT_INITIALIZED'
        };
      }
    }

    // 创建 AbortController 用于超时控制
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
      console.warn('[SupabaseService] 请求超时（10秒）');
    }, 10000); // 10秒超时

    try {
      // 查询指定日期的前50名，关联 users 表获取昵称
      // 使用 run_date 列来过滤（表结构：run_date date not null）
      let query = this.supabase
        .from('daily_leaderboard')
        .select(`
          id,
          user_id,
          score,
          details,
          run_date,
          created_at,
          users (nickname)
        `)
        .eq('run_date', dateStr)
        .order('score', { ascending: false })
        .limit(50);

      // 执行查询并应用超时控制
      const queryPromise = query;
      const timeoutPromise = new Promise((_, reject) => {
        controller.signal.addEventListener('abort', () => {
          reject(new Error('Request timeout - 请求超时，服务器可能正在休眠'));
        });
      });

      // 使用 Promise.race 实现超时
      const { data, error } = await Promise.race([queryPromise, timeoutPromise]);

      // 清除超时定时器
      clearTimeout(timeoutId);

      if (error) {
        console.error('[SupabaseService] 获取每日排行榜失败 - 错误详情:', JSON.stringify(error, null, 2));
        return { 
          success: false, 
          data: [], 
          error: error.message || error.hint || '获取每日排行榜失败',
          errorCode: error.code,
          errorDetails: error
        };
      }

      // 格式化数据
      const formattedData = (data || []).map((entry, index) => {
        // 从 run_date 获取日期字符串（格式：YYYY-MM-DD）
        const entryDate = entry.run_date || dateStr;
        return {
          rank: index + 1,
          nickname: entry.users?.nickname || '匿名',
          userId: entry.user_id,
          score: entry.score,
          details: entry.details || {},
          dateStr: entryDate,
          createdAt: entry.created_at
        };
      });

      console.log(`[SupabaseService] 获取每日排行榜成功，共 ${formattedData.length} 条记录`);
      return { success: true, data: formattedData, error: null };
    } catch (error) {
      // 清除超时定时器
      clearTimeout(timeoutId);
      
      console.error('[SupabaseService] getDailyLeaderboard 错误 - 错误详情:', JSON.stringify(error, null, 2));
      
      // 检测超时错误
      const isTimeout = error.name === 'AbortError' || error.message?.includes('timeout');
      const errorMessage = isTimeout 
        ? 'Request timeout - 请求超时，服务器可能正在休眠' 
        : (error.message || '网络错误，请检查连接');
      
      return { 
        success: false, 
        data: [], 
        error: errorMessage,
        errorCode: isTimeout ? 'TIMEOUT' : error.code,
        errorDetails: error
      };
    }
  }

  /**
   * 提交每日挑战成绩
   * @param {Object} scoreData - 成绩数据
   * @param {number} scoreData.score - 分数
   * @param {Object} scoreData.details - 详细信息（楼层、击杀、伤害等）
   * @param {string} scoreData.dateStr - 日期字符串 (YYYY-MM-DD 格式)
   * @returns {Object} { success: boolean, message: string, updated: boolean }
   */
  async submitDailyScore(scoreData) {
    if (!this.isInitialized) {
      console.warn('[SupabaseService] 服务未初始化，无法提交每日成绩');
      return { success: false, message: '服务未初始化', updated: false };
    }

    if (!this.userId) {
      console.warn('[SupabaseService] 用户未登录，无法提交每日成绩');
      return { success: false, message: '请先注册昵称', updated: false };
    }

    try {
      const { score, details, dateStr } = scoreData;

      if (!dateStr) {
        return { success: false, message: '日期字符串不能为空', updated: false };
      }

      // 先查询该用户当日是否已提交过成绩
      // 使用 run_date 列来查询（表结构：run_date date not null）
      const { data: existingRecord, error: queryError } = await this.supabase
        .from('daily_leaderboard')
        .select('id, score, run_date')
        .eq('user_id', this.userId)
        .eq('run_date', dateStr)
        .single();

      if (queryError && queryError.code !== 'PGRST116') {
        // PGRST116 是 "Row not found" 的标准错误码，这是正常的（表示没有记录）
        // 其他错误才是真正的错误
        console.error('[SupabaseService] 查询每日成绩失败 - 错误详情:', JSON.stringify(queryError, null, 2));
        return { 
          success: false, 
          message: queryError.message || '查询失败，请重试',
          updated: false,
          errorCode: queryError.code
        };
      }

      // 如果已提交过成绩
      if (existingRecord) {
        // 如果新分数更高，则更新
        if (score > existingRecord.score) {
          const { data, error } = await this.supabase
            .from('daily_leaderboard')
            .update({
              score: score,
              details: details
            })
            .eq('id', existingRecord.id)
            .select()
            .single();

          if (error) {
            console.error('[SupabaseService] 更新每日成绩失败 - 错误详情:', JSON.stringify(error, null, 2));
            return { 
              success: false, 
              message: error.message || '更新失败，请重试',
              updated: false,
              errorCode: error.code
            };
          }

          console.log('[SupabaseService] 每日成绩更新成功，新分数:', score);
          return { success: true, message: '成绩已更新！', updated: true, score: score };
        } else {
          // 新分数更低，忽略
          console.log('[SupabaseService] 新分数低于现有分数，忽略提交');
          return { 
            success: true, 
            message: '新分数低于现有成绩，未更新',
            updated: false,
            score: existingRecord.score
          };
        }
      } else {
        // 没提交过，插入新记录
        // 使用 run_date 列（表结构：run_date date not null）
        const { data, error } = await this.supabase
          .from('daily_leaderboard')
          .insert([{
            user_id: this.userId,
            score: score,
            details: details,
            run_date: dateStr
          }])
          .select()
          .single();

        if (error) {
          console.error('[SupabaseService] 插入每日成绩失败 - 错误详情:', JSON.stringify(error, null, 2));
          return { 
            success: false, 
            message: error.message || error.hint || '提交失败，请重试',
            updated: false,
            errorCode: error.code
          };
        }

        console.log('[SupabaseService] 每日成绩提交成功，分数:', score);
        return { success: true, message: '成绩已上传！', updated: true, score: score };
      }
    } catch (error) {
      console.error('[SupabaseService] submitDailyScore 错误 - 错误详情:', JSON.stringify(error, null, 2));
      const errorMessage = error.message || '网络错误，请检查连接';
      return { 
        success: false, 
        message: errorMessage,
        updated: false,
        errorCode: error.code
      };
    }
  }

  /**
   * 上传玩家死亡记录
   * @param {Object} deathData - 死亡数据
   * @param {string} deathData.nickname - 玩家昵称
   * @param {number} deathData.floor - 死亡楼层
   * @param {number} deathData.x - 死亡坐标 X
   * @param {number} deathData.y - 死亡坐标 Y
   * @param {number} deathData.level - 玩家等级
   * @param {Object} deathData.stats - 玩家属性快照
   * @param {Object} deathData.equipment - 玩家装备快照
   * @param {string} deathData.charId - 职业 ID
   * @returns {Object} { success: boolean, message: string }
   */
  async uploadPlayerDeath(deathData) {
    if (!this.isInitialized) {
      if (!await this.initialize()) {
        console.warn('[SupabaseService] 服务未初始化，无法上传死亡记录');
        return { success: false, message: '服务未初始化' };
      }
    }

    // 从 localStorage 获取 user_id
    const userId = localStorage.getItem('leaderboard_user_id');
    if (!userId) {
      console.warn('[SupabaseService] 用户未登录，无法上传死亡记录');
      return { success: false, message: '用户未登录' };
    }

    try {
      const { nickname, floor, x, y, level, stats, equipment, charId } = deathData;

      const deathRecord = {
        user_id: userId,
        nickname: nickname || '匿名',
        floor: floor || 1,
        x: x || 1,
        y: y || 1,
        level: level || 1,
        stats: stats || {},
        equipment: equipment || {},
        char_id: charId || null // 存储职业ID
      };

      const { data, error } = await this.supabase
        .from('deaths')
        .insert([deathRecord])
        .select()
        .single();

      if (error) {
        console.error('[SupabaseService] 上传死亡记录失败 - 错误详情:', JSON.stringify(error, null, 2));
        return { 
          success: false, 
          message: error.message || '上传失败，请重试'
        };
      }

      console.log('[SupabaseService] 死亡记录上传成功');
      return { success: true, message: '死亡记录已上传' };
    } catch (error) {
      console.error('[SupabaseService] uploadPlayerDeath 错误 - 错误详情:', JSON.stringify(error, null, 2));
      return { 
        success: false, 
        message: error.message || '网络错误，请检查连接'
      };
    }
  }

  /**
   * 获取堕落冒险者（Ghost）
   * @param {number} floor - 当前楼层
   * @returns {Object|null} 死亡记录数据，如果获取失败返回 null
   */
  async getFallenAdventurer(floor) {
    if (!this.isInitialized) {
      if (!await this.initialize()) {
        console.warn('[SupabaseService] 服务未初始化，无法获取堕落冒险者');
        return null;
      }
    }

    try {
      // 查询该楼层的死亡记录，限制20条，然后前端随机选择
      const { data, error } = await this.supabase
        .from('deaths')
        .select('*')
        .eq('floor', floor)
        .limit(20);

      if (error) {
        console.error('[SupabaseService] 获取堕落冒险者失败 - 错误详情:', JSON.stringify(error, null, 2));
        return null;
      }

      if (!data || data.length === 0) {
        console.log(`[SupabaseService] 第 ${floor} 层没有死亡记录`);
        return null;
      }

      // 随机选择一条记录
      const randomIndex = Math.floor(Math.random() * data.length);
      const selectedRecord = data[randomIndex];

      console.log(`[SupabaseService] 获取到堕落冒险者: ${selectedRecord.nickname} (第 ${floor} 层)`);
      return selectedRecord;
    } catch (error) {
      console.error('[SupabaseService] getFallenAdventurer 错误 - 错误详情:', JSON.stringify(error, null, 2));
      return null;
    }
  }

  /**
   * 获取当前赛季
   * 查询条件：start_at <= NOW() AND end_at >= NOW() AND is_active = true
   * @returns {Promise<Object|null>} 当前赛季对象，如果没有则返回 null
   */
  async fetchCurrentSeason() {
    if (!this.isInitialized) {
      if (!await this.initialize()) {
        console.warn('[SupabaseService] 服务未初始化，无法获取当前赛季');
        return null;
      }
    }

    try {
      const now = new Date().toISOString(); // 使用 UTC 时间
      
      const { data, error } = await this.supabase
        .from('seasons')
        .select('*')
        .lte('start_at', now) // start_at <= NOW()
        .gte('end_at', now)   // end_at >= NOW()
        .eq('is_active', true)
        .order('start_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        // PGRST116 是 "Row not found" 的标准错误码，这是正常的（表示没有当前赛季）
        if (error.code === 'PGRST116') {
          console.log('[SupabaseService] 当前没有进行中的赛季');
          this.currentSeason = null;
          return null;
        }
        console.error('[SupabaseService] 获取当前赛季失败 - 错误详情:', JSON.stringify(error, null, 2));
        return null;
      }

      this.currentSeason = data;
      console.log('[SupabaseService] 当前赛季:', data.name, `(${data.code})`);
      return data;
    } catch (error) {
      console.error('[SupabaseService] fetchCurrentSeason 错误 - 错误详情:', JSON.stringify(error, null, 2));
      return null;
    }
  }

  /**
   * 获取赛季排行榜
   * @param {string} seasonId - 赛季ID（可选，如果不提供则使用当前赛季）
   * @param {number} limit - 获取的记录数量（默认 50）
   * @param {string} difficulty - 筛选难度（可选，如 'normal', 'hard', 'nightmare'）
   * @returns {Object} { success: boolean, data: Array, error: string|null }
   */
  async getSeasonalLeaderboard(seasonId = null, limit = 50, difficulty = null) {
    if (!this.isInitialized) {
      if (!await this.initialize()) {
        console.warn('[SupabaseService] 服务未初始化，无法获取赛季排行榜');
        return { 
          success: false, 
          data: [], 
          error: '服务未初始化',
          errorCode: 'SERVICE_NOT_INITIALIZED'
        };
      }
    }

    // 如果没有提供 seasonId，使用当前赛季
    const targetSeasonId = seasonId || (this.currentSeason ? this.currentSeason.id : null);
    
    if (!targetSeasonId) {
      return {
        success: false,
        data: [],
        error: '当前没有进行中的赛季',
        errorCode: 'NO_CURRENT_SEASON'
      };
    }

    // 创建 AbortController 用于超时控制
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
      console.warn('[SupabaseService] 请求超时（10秒）');
    }, 10000); // 10秒超时

    try {
      // 增加查询数量以确保去重后能填满 UI 的显示数量
      const fetchLimit = Math.max(limit * 2, 100);
      
      let query = this.supabase
        .from('leaderboard')
        .select(`
          id,
          score,
          floor,
          kills,
          damage,
          time_seconds,
          difficulty,
          character,
          details,
          created_at,
          user_id,
          users (nickname)
        `)
        .eq('season_id', targetSeasonId) // 只查询该赛季的记录
        .order('score', { ascending: false })
        .limit(fetchLimit);

      // 如果指定了难度，添加筛选条件
      if (difficulty) {
        query = query.eq('difficulty', difficulty);
      }

      // 执行查询并应用超时控制
      const queryPromise = query;
      const timeoutPromise = new Promise((_, reject) => {
        controller.signal.addEventListener('abort', () => {
          reject(new Error('Request timeout - 请求超时，服务器可能正在休眠'));
        });
      });

      // 使用 Promise.race 实现超时
      const { data, error } = await Promise.race([queryPromise, timeoutPromise]);

      // 清除超时定时器
      clearTimeout(timeoutId);

      if (error) {
        console.error('[SupabaseService] 获取赛季排行榜失败 - 错误详情:', JSON.stringify(error, null, 2));
        return { 
          success: false, 
          data: [], 
          error: error.message || error.hint || '获取赛季排行榜失败',
          errorCode: error.code,
          errorDetails: error
        };
      }

      // 格式化数据
      const formattedData = data.map((entry) => ({
        rank: 0, // 临时占位，稍后会重新计算
        nickname: entry.users?.nickname || '匿名',
        userId: entry.user_id, // 用于去重
        score: entry.score,
        floor: entry.floor,
        kills: entry.kills,
        damage: entry.damage,
        timeSeconds: entry.time_seconds,
        difficulty: entry.difficulty,
        character: entry.character,
        details: entry.details,
        createdAt: entry.created_at
      }));

      // 去重处理：同一用户只保留最高分的一条记录
      const userBestScores = new Map();
      
      formattedData.forEach(entry => {
        const userKey = entry.userId || entry.nickname;
        
        if (!userKey) {
          return;
        }
        
        const existing = userBestScores.get(userKey);
        
        if (!existing || entry.score > existing.score) {
          userBestScores.set(userKey, entry);
        }
      });

      // 将 Map 转换为数组，并按分数降序排序
      const deduplicatedData = Array.from(userBestScores.values())
        .sort((a, b) => b.score - a.score)
        .slice(0, limit) // 只取前 limit 条
        .map((entry, index) => ({
          ...entry,
          rank: index + 1 // 重新计算排名
        }));

      console.log(`[SupabaseService] 获取赛季排行榜成功，原始记录 ${formattedData.length} 条，去重后 ${deduplicatedData.length} 条`);
      return { success: true, data: deduplicatedData, error: null };
    } catch (error) {
      // 清除超时定时器
      clearTimeout(timeoutId);
      
      console.error('[SupabaseService] getSeasonalLeaderboard 错误 - 错误详情:', JSON.stringify(error, null, 2));
      
      // 检测超时错误
      const isTimeout = error.name === 'AbortError' || error.message?.includes('timeout');
      const errorMessage = isTimeout 
        ? 'Request timeout - 请求超时，服务器可能正在休眠' 
        : (error.message || '网络错误，请检查连接');
      
      return { 
        success: false, 
        data: [], 
        error: errorMessage,
        errorCode: isTimeout ? 'TIMEOUT' : error.code,
        errorDetails: error
      };
    }
  }

  /**
   * 检查并领取上赛季奖励
   * 核心业务逻辑：
   * 1. 查找上赛季（end_at < NOW()，按 end_at 降序取第一条）
   * 2. 检查是否已领奖
   * 3. 查询用户在上赛季的最高分和排名
   * 4. 计算奖励并插入 season_rewards 表
   * @returns {Promise<Object>} { claimed: boolean, rank: number|null, reward: number|null, season: Object|null }
   */
  async checkAndClaimSeasonRewards() {
    if (!this.isInitialized) {
      if (!await this.initialize()) {
        console.warn('[SupabaseService] 服务未初始化，无法检查赛季奖励');
        return { claimed: false, rank: null, reward: null, season: null };
      }
    }

    if (!this.userId) {
      console.warn('[SupabaseService] 用户未登录，无法检查赛季奖励');
      return { claimed: false, rank: null, reward: null, season: null };
    }

    try {
      const now = new Date().toISOString(); // 使用 UTC 时间

      // 步骤 1: 查找上赛季（已结束的赛季，按结束时间降序取第一条）
      const { data: lastSeason, error: seasonError } = await this.supabase
        .from('seasons')
        .select('*')
        .lt('end_at', now) // end_at < NOW()
        .order('end_at', { ascending: false })
        .limit(1)
        .single();

      if (seasonError) {
        // PGRST116 是 "Row not found" 的标准错误码，表示没有上赛季
        if (seasonError.code === 'PGRST116') {
          console.log('[SupabaseService] 没有上赛季，无需领取奖励');
          return { claimed: false, rank: null, reward: null, season: null };
        }
        console.error('[SupabaseService] 查找上赛季失败 - 错误详情:', JSON.stringify(seasonError, null, 2));
        return { claimed: false, rank: null, reward: null, season: null };
      }

      if (!lastSeason) {
        console.log('[SupabaseService] 没有上赛季');
        return { claimed: false, rank: null, reward: null, season: null };
      }

      // 步骤 2: 检查是否已领奖
      const { data: existingReward, error: rewardCheckError } = await this.supabase
        .from('season_rewards')
        .select('*')
        .eq('user_id', this.userId)
        .eq('season_id', lastSeason.id)
        .single();

      if (rewardCheckError && rewardCheckError.code !== 'PGRST116') {
        // 非 "Row not found" 错误才是真正的错误
        console.error('[SupabaseService] 检查奖励记录失败 - 错误详情:', JSON.stringify(rewardCheckError, null, 2));
        return { claimed: false, rank: null, reward: null, season: lastSeason };
      }

      if (existingReward) {
        console.log('[SupabaseService] 上赛季奖励已领取，排名:', existingReward.rank);
        return { 
          claimed: true, 
          rank: existingReward.rank, 
          reward: existingReward.rewards?.soulCrystals || 0,
          season: lastSeason,
          alreadyClaimed: true
        };
      }

      // 步骤 3: 查询用户在上赛季的最高分记录
      const { data: userBestRun, error: bestRunError } = await this.supabase
        .from('leaderboard')
        .select('score')
        .eq('user_id', this.userId)
        .eq('season_id', lastSeason.id)
        .order('score', { ascending: false })
        .limit(1)
        .single();

      if (bestRunError) {
        // PGRST116 表示用户没有参与上赛季
        if (bestRunError.code === 'PGRST116') {
          console.log('[SupabaseService] 用户未参与上赛季，无奖励');
          return { claimed: false, rank: null, reward: null, season: lastSeason };
        }
        console.error('[SupabaseService] 查询用户最高分失败 - 错误详情:', JSON.stringify(bestRunError, null, 2));
        return { claimed: false, rank: null, reward: null, season: lastSeason };
      }

      if (!userBestRun || !userBestRun.score) {
        console.log('[SupabaseService] 用户在上赛季没有成绩');
        return { claimed: false, rank: null, reward: null, season: lastSeason };
      }

      const userScore = userBestRun.score;

      // 步骤 4: 计算排名（统计分数高于用户的记录数量）
      const { count, error: countError } = await this.supabase
        .from('leaderboard')
        .select('*', { count: 'exact', head: true })
        .eq('season_id', lastSeason.id)
        .gt('score', userScore); // score > userScore

      if (countError) {
        console.error('[SupabaseService] 计算排名失败 - 错误详情:', JSON.stringify(countError, null, 2));
        return { claimed: false, rank: null, reward: null, season: lastSeason };
      }

      // 排名 = 高于用户分数的记录数 + 1
      const rank = (count || 0) + 1;

      // 步骤 5: 计算奖励
      let rewardAmount = 50; // 默认参与奖
      if (rank === 1) {
        rewardAmount = 1000;
      } else if (rank >= 2 && rank <= 10) {
        rewardAmount = 500;
      } else if (rank >= 11 && rank <= 100) {
        rewardAmount = 200;
      } else if (rank >= 101 && rank <= 1000) {
        rewardAmount = 100;
      }

      // 步骤 6: 插入奖励记录
      const { data: rewardRecord, error: insertError } = await this.supabase
        .from('season_rewards')
        .insert([{
          user_id: this.userId,
          season_id: lastSeason.id,
          rank: rank,
          rewards: { soulCrystals: rewardAmount }
        }])
        .select()
        .single();

      if (insertError) {
        console.error('[SupabaseService] 插入奖励记录失败 - 错误详情:', JSON.stringify(insertError, null, 2));
        return { claimed: false, rank: rank, reward: rewardAmount, season: lastSeason };
      }

      console.log(`[SupabaseService] 上赛季奖励领取成功！排名: ${rank}, 奖励: ${rewardAmount} 水晶`);
      return { 
        claimed: true, 
        rank: rank, 
        reward: rewardAmount,
        season: lastSeason
      };
    } catch (error) {
      console.error('[SupabaseService] checkAndClaimSeasonRewards 错误 - 错误详情:', JSON.stringify(error, null, 2));
      return { claimed: false, rank: null, reward: null, season: null };
    }
  }
}

// 导出单例
export const supabaseService = new SupabaseService();

