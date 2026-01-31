# Netlify 部署指南

## 第一步：保护 Supabase 数据库 ⚠️

### 1. 登录 Supabase
- 访问 https://supabase.com
- 登录你的账号
- 进入项目 `iggnwszpgggwubbofwoj`

### 2. 启用行级安全（RLS）
- 左侧菜单 → **Table Editor**
- 找到你的表（如 `leaderboard`）
- 点击表名旁的 `...` → **Edit table** → **Enable RLS**

### 3. 创建安全策略
- 左侧菜单 → **Authentication** → **Policies**
- 点击 **New Policy**

**策略 1：允许读取**
```
Policy name: Allow public read
Target roles: public
Policy command: SELECT
USING expression: true
```

**策略 2：允许插入**
```
Policy name: Allow insert own records
Target roles: public
Policy command: INSERT
WITH CHECK expression: true
```

---

## 第二步：部署到 Netlify

### 1. 注册/登录 Netlify
- 访问 https://www.netlify.com
- 点击 **Sign up** 或 **Log in**
- 建议使用 GitHub 账号登录

### 2. 部署方式选择

#### 方式 A：拖拽部署（最简单）
1. 将整个项目文件夹压缩成 `.zip` 文件
2. 登录 Netlify 后，点击 **Add new site** → **Deploy manually**
3. 把 `.zip` 文件拖到页面上
4. 等待部署完成（1-2分钟）

#### 方式 B：连接 GitHub（推荐）
1. 把项目上传到 GitHub
2. Netlify 点击 **Add new site** → **Import an existing project**
3. 选择 **GitHub**，授权并选择你的仓库
4. 构建设置：
   - Build command: 留空
   - Publish directory: `.`（点号）
5. 点击 **Deploy site**

### 3. 配置自定义域名（可选）
- 部署完成后，点击 **Domain settings**
- 可以使用免费的 `.netlify.app` 域名
- 或添加自己的域名

---

## 第三步：测试游戏

1. 打开 Netlify 给你的网址（如 `your-game.netlify.app`）
2. 测试以下功能：
   - ✅ 游戏能正常加载
   - ✅ 排行榜能显示
   - ✅ 音乐和音效正常
   - ✅ 开发者模式入口已隐藏（在设置页面检查）

---

## 常见问题

### Q: 部署后游戏无法加载？
A: 检查浏览器控制台（F12），看是否有资源加载错误

### Q: 排行榜不显示？
A: 确认 Supabase RLS 策略已正确配置

### Q: 如何更新游戏？
A: 
- 拖拽部署：重新上传新的 `.zip` 文件
- GitHub 部署：推送代码到 GitHub，Netlify 会自动重新部署

### Q: 如何查看访问量？
A: Netlify 后台 → **Analytics** 可以看到访问统计

---

## 安全检查清单

部署前确认：
- ✅ Supabase RLS 已启用
- ✅ 开发者模式在生产环境已隐藏
- ✅ `netlify.toml` 文件已创建（包含安全响应头）
- ✅ 游戏在本地测试正常

---

## 需要帮助？

如果遇到问题：
1. 查看 Netlify 部署日志（Deploy log）
2. 检查浏览器控制台错误信息
3. 确认所有文件都已上传
