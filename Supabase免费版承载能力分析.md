# Supabase 免费版承载能力分析与优化建议

## 📊 Supabase 免费版限制

### 核心限制指标
- **数据库大小**: 500 MB
- **带宽**: 5 GB/月
- **API 请求**: 无限制（但有速率限制）
- **并发连接**: 60 个
- **项目休眠**: 7天无活动后自动暂停（需手动唤醒）

## 🔍 当前项目数据库使用分析

### 数据表结构
1. **users** - 用户表（昵称、ID）
2. **leaderboard** - 全局排行榜（成绩、装备、属性等详细信息）
3. **daily_leaderboard** - 每日挑战排行榜
4. **deaths** - 玩家死亡记录
5. **seasons** - 赛季定义表
6. **season_rewards** - 赛季奖励领取记录

### 查询频率分析
**高频查询：**
- 排行榜查询（每次打开排行榜界面）
- 每日挑战排行榜（每次打开每日挑战）
- 用户验证（游戏启动时）

**中频查询：**
- 成绩提交（游戏结束时）
- 赛季信息查询（打开赛季排行榜时）

**低频查询：**
- 用户注册（首次游戏）
- 死亡记录上传（可选功能）
- 赛季奖励领取（赛季结束时）

## ⚠️ 潜在风险评估

### 1. 数据库大小风险 - 🟡 中等
**问题：**
- `leaderboard` 表存储详细的装备、属性信息（JSONB 字段）
- 每条记录约 2-5 KB
- 500 MB 可存储约 10万-25万条记录

**预估：**
- 1000 活跃玩家，每人平均 10 次提交 = 1万条记录 ≈ 20-50 MB
- 10000 活跃玩家 = 10万条记录 ≈ 200-500 MB ⚠️ **接近上限**

### 2. 带宽风险 - 🔴 高风险
**问题：**
- 每次排行榜查询获取 50-100 条记录
- 每条记录包含详细信息（2-5 KB）
- 单次查询约 100-500 KB

**预估：**
- 5 GB/月 = 5000 MB
- 假设每次查询 200 KB，5000 MB ÷ 0.2 MB = **25000 次查询/月**
- 平均每天约 833 次查询
- 如果有 1000 活跃玩家，每人每天查看 1 次排行榜 = **超出限制** ⚠️

### 3. 并发连接风险 - 🟢 低风险
**问题：**
- 免费版限制 60 个并发连接
- 每个查询占用连接时间约 1-3 秒

**预估：**
- 60 个并发连接，每个连接 2 秒 = 每秒可处理 30 个请求
- 每分钟可处理 1800 个请求
- 除非同时在线玩家超过 100 人，否则不会有问题

### 4. 项目休眠风险 - 🟡 中等
**问题：**
- 7天无活动后自动暂停
- 首次查询需要 10-30 秒唤醒时间
- 用户体验差

## 💡 优化建议

### 立即实施（高优先级）

#### 1. 减少查询数据量
```javascript
// ❌ 当前：查询所有字段
.select('*')

// ✅ 优化：只查询必要字段
.select('id, score, floor, kills, damage, time_seconds, difficulty, character, created_at, user_id, users(nickname)')
// 不查询 details 字段（装备、属性等详细信息）
```

**效果：** 减少 60-80% 的带宽消耗

#### 2. 实现客户端缓存
```javascript
// 缓存排行榜数据 5 分钟
const CACHE_DURATION = 5 * 60 * 1000; // 5分钟
let cachedLeaderboard = null;
let cacheTimestamp = 0;

async loadLeaderboard() {
  const now = Date.now();
  if (cachedLeaderboard && (now - cacheTimestamp) < CACHE_DURATION) {
    return cachedLeaderboard; // 使用缓存
  }
  
  // 从数据库查询
  const data = await supabaseService.getTopRuns(50);
  cachedLeaderboard = data;
  cacheTimestamp = now;
  return data;
}
```

**效果：** 减少 80-90% 的查询次数

#### 3. 限制排行榜显示数量
```javascript
// ❌ 当前：查询 50-100 条
.limit(100)

// ✅ 优化：只查询前 20 条
.limit(20)
```

**效果：** 减少 50-80% 的带宽消耗

#### 4. 移除或简化 details 字段
```javascript
// 方案 A：不存储详细信息（推荐）
const runData = {
  user_id: this.userId,
  score: finalScore,
  floor: scoreData.floor,
  kills: scoreData.kills,
  damage: scoreData.damage,
  time_seconds: scoreData.timeSeconds,
  difficulty: scoreData.difficulty,
  character: scoreData.character
  // ❌ 移除 details 字段
};

// 方案 B：只存储关键信息
const runData = {
  // ... 其他字段
  details: {
    // 只存储最重要的信息
    level: scoreData.level,
    // ❌ 不存储装备、属性等详细信息
  }
};
```

**效果：** 减少 70-90% 的存储空间和带宽

### 中期实施（中优先级）

#### 5. 实现数据清理策略
```javascript
// 定期清理旧数据（保留最近 30 天）
async cleanOldData() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  await this.supabase
    .from('leaderboard')
    .delete()
    .lt('created_at', thirtyDaysAgo.toISOString())
    .not('user_id', 'in', '(SELECT DISTINCT user_id FROM leaderboard ORDER BY score DESC LIMIT 1000)');
  // 保留前1000名的所有记录
}
```

**效果：** 控制数据库增长

#### 6. 使用 CDN 缓存排行榜
```javascript
// 使用 Vercel Edge Functions 或 Cloudflare Workers
// 在边缘节点缓存排行榜数据
export default async function handler(req) {
  const cached = await cache.get('leaderboard');
  if (cached) return cached;
  
  const data = await fetchFromSupabase();
  await cache.set('leaderboard', data, { ttl: 300 }); // 5分钟
  return data;
}
```

**效果：** 大幅减少数据库查询

#### 7. 实现分页加载
```javascript
// 首次只加载前 10 名
async loadLeaderboard(page = 1, pageSize = 10) {
  const offset = (page - 1) * pageSize;
  const { data } = await this.supabase
    .from('leaderboard')
    .select('...')
    .order('score', { ascending: false })
    .range(offset, offset + pageSize - 1);
  return data;
}
```

**效果：** 减少单次查询数据量

### 长期方案（低优先级）

#### 8. 升级到付费版
**Supabase Pro 版本（$25/月）：**
- 数据库大小：8 GB
- 带宽：50 GB/月
- 并发连接：120 个
- 无项目休眠

**适用场景：**
- 日活跃用户 > 1000
- 月查询次数 > 10万

#### 9. 迁移到自建数据库
**方案：**
- 使用 PostgreSQL + Redis
- 部署在 VPS（如 DigitalOcean、Linode）
- 成本：$5-10/月

**适用场景：**
- 日活跃用户 > 5000
- 需要完全控制

## 📈 承载能力预估（优化后）

### 优化前
- **日活跃用户**: 100-200 人
- **月查询次数**: 2.5万次（带宽限制）
- **数据存储**: 1万条记录

### 优化后（实施建议 1-4）
- **日活跃用户**: 500-1000 人 ✅
- **月查询次数**: 10-15万次 ✅
- **数据存储**: 5-10万条记录 ✅

### 优化后（实施建议 1-7）
- **日活跃用户**: 2000-5000 人 ✅✅
- **月查询次数**: 50万次+ ✅✅
- **数据存储**: 10-20万条记录 ✅✅

## 🎯 推荐实施方案

### 阶段 1：立即优化（1-2小时）
1. ✅ 减少查询字段（移除 details）
2. ✅ 限制排行榜显示数量（20条）
3. ✅ 实现客户端缓存（5分钟）

**预期效果：** 可支持 500-1000 日活跃用户

### 阶段 2：观察期（1-2周）
- 监控 Supabase Dashboard 的使用情况
- 查看带宽、存储、查询次数
- 根据实际情况调整

### 阶段 3：按需扩展
- 如果用户增长超预期，考虑升级到 Pro 版本
- 或实施更多优化措施（CDN、分页等）

## 📝 监控指标

在 Supabase Dashboard 中关注：
1. **Database Size** - 数据库大小（目标：< 400 MB）
2. **Bandwidth** - 带宽使用（目标：< 4 GB/月）
3. **API Requests** - API 请求次数
4. **Active Connections** - 活跃连接数（目标：< 50）

## 🚨 应急预案

如果突然流量激增：
1. **临时措施**：关闭排行榜功能，显示"维护中"
2. **快速优化**：立即实施缓存和限制查询
3. **升级方案**：升级到 Pro 版本（可在 Dashboard 中一键升级）

## 总结

**当前状态：** 🟡 可以支持小规模用户（100-200人）

**优化后：** 🟢 可以支持中等规模用户（500-1000人）

**建议：** 
- 先发布，观察实际用户量
- 实施立即优化措施
- 根据实际情况决定是否升级

**成本预估：**
- 免费版：$0/月（支持 500-1000 日活）
- Pro 版：$25/月（支持 5000+ 日活）

对于个人项目来说，免费版 + 优化措施完全够用！
