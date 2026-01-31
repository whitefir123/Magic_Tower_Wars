# Supabase 安全策略检查

## 当前配置分析

根据你的截图，以下是需要检查和修复的地方：

---

## ⚠️ 高风险：daily_leaderboard 表

### 当前策略
- `public_insert` → INSERT → anon ✅
- `public_select` → SELECT → anon ✅
- `public_update` → UPDATE → anon ⚠️ **需要检查**

### 检查步骤
1. 点击 `public_update` 旁边的 `...` 按钮
2. 选择 **"Edit policy"**
3. 查看 **USING expression** 和 **WITH CHECK expression**

### 如果显示 `true`，需要修改为：

**方案 A：限制只能更新自己的记录**
```sql
USING expression: auth.uid() = user_id
WITH CHECK expression: auth.uid() = user_id
```

**方案 B：完全禁止更新（推荐）**
- 直接删除 `public_update` 策略
- 排行榜数据一旦提交就不应该被修改

---

## ✅ 正确配置：leaderboard 表

### 当前策略
- `Public insert leaderboard` → INSERT → public ✅
- `Public read leaderboard` → SELECT → public ✅

这个配置是正确的：
- 任何人都可以读取排行榜
- 任何人都可以提交成绩
- 没有 UPDATE 和 DELETE 权限（安全）

---

## ✅ 正确配置：deaths 表

### 当前策略
- `Enable insert for authenticated users` → INSERT → public ✅
- `Enable read access for all users` → SELECT → public ✅

这个配置也是正确的。

---

## ✅ 正确配置：season_rewards 表

### 当前策略
- `Allow users to insert own rewards` → INSERT → public ✅
- `Allow users to read own rewards` → SELECT → public ✅

这个配置是正确的。

---

## ✅ 正确配置：seasons 表

### 当前策略
- `Allow public read access to seasons` → SELECT → public ✅

这个配置是正确的（只读，不能修改）。

---

## 🎯 推荐的最终配置

### 所有表都应该遵循的原则：
1. ✅ **SELECT（读取）**：允许所有人读取排行榜
2. ✅ **INSERT（插入）**：允许所有人提交成绩
3. ❌ **UPDATE（更新）**：禁止或严格限制
4. ❌ **DELETE（删除）**：完全禁止

---

## 🔧 如何修复 public_update 策略

### 方法 1：删除策略（推荐）
1. 点击 `public_update` 旁边的 `...`
2. 选择 **"Delete policy"**
3. 确认删除

### 方法 2：限制更新权限
1. 点击 `public_update` 旁边的 `...`
2. 选择 **"Edit policy"**
3. 修改 USING expression 为：
   ```sql
   auth.uid() = user_id
   ```
4. 修改 WITH CHECK expression 为：
   ```sql
   auth.uid() = user_id
   ```
5. 点击 **"Save policy"**

---

## ✅ 检查清单

完成以下检查后，你的数据库就安全了：

- [ ] 检查 `daily_leaderboard` 的 `public_update` 策略
- [ ] 确认所有表都没有不必要的 UPDATE 权限
- [ ] 确认所有表都没有 DELETE 权限
- [ ] 测试：在浏览器控制台尝试修改数据，应该被拒绝

---

## 🧪 安全测试

部署后，打开浏览器控制台（F12），运行以下代码测试：

```javascript
// 测试是否能读取排行榜（应该成功）
const { data, error } = await supabaseService.supabase
  .from('leaderboard')
  .select('*')
  .limit(10);
console.log('读取测试:', data ? '✅ 成功' : '❌ 失败', error);

// 测试是否能修改别人的记录（应该失败）
const { data: updateData, error: updateError } = await supabaseService.supabase
  .from('leaderboard')
  .update({ score: 999999 })
  .eq('id', 1);
console.log('修改测试:', updateError ? '✅ 已阻止' : '❌ 危险！可以修改');
```

如果修改测试显示 "✅ 已阻止"，说明配置正确！
