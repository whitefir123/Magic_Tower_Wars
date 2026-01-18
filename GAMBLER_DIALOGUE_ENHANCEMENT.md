# 赌徒对话系统优化 - 自动催促机制

## 📋 改动概述

实现了完整的赌徒NPC自动催促系统，让对话更加智能和连贯。

## 🎯 需求分析

**用户需求：**
1. 玩家进入界面时显示欢迎语（仅首次）
2. 如果玩家3秒后还没抽奖，显示催促语
3. 催促语每4秒自动更新，持续催促
4. 玩家开始抽奖时停止催促
5. 抽奖完成后显示评判语
6. 评判语3秒后重新开始催促循环

## ✨ 实现方案

### 1. 对话流程时间轴

```
进入界面
    ↓
欢迎语 (3秒) [仅首次]
    ↓
催促语1 (4秒)
    ↓
催促语2 (4秒)
    ↓
催促语3 (4秒) ... 循环
    ↓
[玩家开始抽奖] → 停止催促
    ↓
评判语 (3秒)
    ↓
催促语1 (4秒)
    ↓
催促语2 (4秒) ... 循环
```

### 2. 核心功能

#### GamblerNPC.js 新增功能

**状态管理：**
```javascript
this.urgeTimer = null;        // 催促启动定时器
this.urgeInterval = null;     // 催促循环定时器
this.isUrging = false;        // 是否正在催促
this.hasShownWelcome = false; // 是否已显示欢迎语
```

**核心方法：**

1. **showWelcome()** - 显示欢迎语
   - 首次调用：显示欢迎语，3秒后启动催促
   - 后续调用：直接启动催促

2. **showJudgement(context)** - 显示评判语
   - 显示评判语，3秒后启动催促

3. **startUrging()** - 启动催促系统
   - 3秒后显示第一条催促语
   - 之后每4秒显示新的催促语

4. **stopUrging()** - 停止催促系统
   - 清除所有定时器
   - 停止催促循环

5. **showUrgeMessage()** - 显示催促消息
   - 随机选择一条催促语
   - 显示对话气泡

6. **resetWelcome()** - 重置欢迎语标记
   - 界面关闭时调用
   - 下次进入重新显示欢迎语

#### GamblerUI.js 集成

**打开界面时：**
```javascript
// 显示欢迎语（首次）或直接开始催促（后续）
this.gamblerNPC.showWelcome();
```

**关闭界面时：**
```javascript
this.gamblerNPC.stopUrging();
this.gamblerNPC.hide();
this.gamblerNPC.resetWelcome();
```

**开始抽奖时：**
```javascript
// 在 spin() 和 batchSpin() 方法开始时
this.gamblerNPC.stopUrging();
```

**抽奖完成时：**
```javascript
// 显示评判语，3秒后开始催促
this.gamblerNPC.showJudgement(npcContext);
```

**10连抽完成时：**
```javascript
// 显示评判语，3秒后开始催促
this.gamblerNPC.say(message, 3000, true);
```

## 🔧 技术实现细节

### 定时器管理

```javascript
// 启动催促
startUrging() {
  this.stopUrging(); // 先清除旧定时器
  
  // 3秒后显示第一条催促语
  this.urgeTimer = setTimeout(() => {
    this.showUrgeMessage();
    
    // 之后每4秒显示新的催促语
    this.urgeInterval = setInterval(() => {
      this.showUrgeMessage();
    }, 4000);
    
    this.isUrging = true;
  }, 3000);
}

// 停止催促
stopUrging() {
  if (this.urgeTimer) {
    clearTimeout(this.urgeTimer);
    this.urgeTimer = null;
  }
  
  if (this.urgeInterval) {
    clearInterval(this.urgeInterval);
    this.urgeInterval = null;
  }
  
  this.isUrging = false;
}
```

### 欢迎语控制

```javascript
showWelcome() {
  if (this.hasShownWelcome) {
    // 已经显示过，直接开始催促
    this.startUrging();
    return;
  }
  
  // 首次显示欢迎语
  const welcomeMsg = this.getRandomDialogue('welcome');
  this.say(welcomeMsg, 3000, true); // startUrge = true
  this.hasShownWelcome = true;
}
```

### say() 方法增强

```javascript
say(message, duration = 3000, startUrge = false) {
  // 停止之前的催促
  this.stopUrging();
  
  // 显示消息...
  
  // 自动隐藏后启动催促
  this.dialogueTimeout = setTimeout(() => {
    this.hide();
    
    if (startUrge) {
      this.startUrging();
    }
  }, duration);
}
```

## 🎮 用户体验

### 完整流程示例

```
00:00 - 玩家进入界面
00:00 - 显示："欢迎来到命运的老虎机，准备好了吗？"
00:03 - 欢迎语消失
00:03 - 显示："还愣着干什么？再来一把啊！"
00:07 - 显示："别光看着，机器不会自己转的。"
00:11 - 显示："时间就是金币，朋友。快点决定吧。"
00:15 - 玩家点击抽奖
00:15 - 催促停止
00:17 - 抽奖完成
00:17 - 显示："史诗级的运气！"
00:20 - 评判语消失
00:20 - 显示："怎么，刚才那把吓到你了？继续啊！"
00:24 - 显示："我的机器可等不了太久，它饿了。"
...持续催促
```

### 优势

- ✅ **智能化** - 欢迎语只显示一次，避免重复
- ✅ **持续性** - 催促语自动循环，保持玩家参与
- ✅ **响应性** - 玩家操作时立即停止催促
- ✅ **连贯性** - 评判语后自动继续催促
- ✅ **多样性** - 20条催促语随机显示，不重复

## 🧪 测试

### 测试文件
`test_gambler_urge_system.html`

### 测试内容

1. **基础测试**
   - 首次进入界面（显示欢迎语）
   - 再次进入界面（跳过欢迎语）
   - 停止催促
   - 重置NPC

2. **抽奖流程测试**
   - 模拟抽到各种品质
   - 验证评判语显示
   - 验证催促重启

3. **完整流程测试**
   - 自动演示完整流程
   - 验证所有环节

4. **手动控制**
   - 手动显示催促语
   - 手动显示评判语

### 测试方法
```bash
# 启动本地服务器
npm start

# 访问测试页面
http://localhost:3000/test_gambler_urge_system.html
```

## 📊 代码变更统计

### 修改文件

1. **src/ui/GamblerNPC.js**
   - 新增催促系统状态管理
   - 新增 `showWelcome()` 方法
   - 新增 `showJudgement()` 方法
   - 新增 `startUrging()` 方法
   - 新增 `stopUrging()` 方法
   - 新增 `showUrgeMessage()` 方法
   - 新增 `resetWelcome()` 方法
   - 修改 `say()` 方法，支持自动启动催促
   - 修改 `destroy()` 方法，清理催促定时器

2. **src/ui/GamblerUI.js**
   - 修改打开界面逻辑：使用 `showWelcome()`
   - 修改关闭界面逻辑：停止催促并重置
   - 修改 `spin()` 方法：开始时停止催促
   - 修改 `batchSpin()` 方法：开始时停止催促
   - 修改抽奖完成逻辑：使用 `showJudgement()`
   - 修改10连抽完成逻辑：启动催促

## 🎨 催促语设计

20条催促语，带有黑色幽默和赌徒特色：

1. 还愣着干什么？再来一把啊！
2. 别光看着，机器不会自己转的。
3. 怎么，刚才那把吓到你了？继续啊！
4. 时间就是金币，朋友。快点决定吧。
5. 我的机器可等不了太久，它饿了。
6. 发呆不会让你变富，但拉杆会...也许。
7. 你是来赌的还是来参观的？
8. 犹豫就会败北，果断就会...好吧，也可能败北。
9. 别想太多，想多了就不敢玩了。
10. 看你这纠结的样子，是不是该吃点勇气药水？
11. 机会不等人，虽然厄运会。
12. 你站在这里的每一秒，都是我赚钱的机会。
13. 要不要我帮你拉杆？当然，得加钱。
14. 命运在召唤你...或者是我的钱包在召唤你的金币。
15. 别磨蹭了，地牢里的怪物都比你果断。
16. 你这犹豫的样子，让我想起了我的前妻...算了，继续吧。
17. 快点快点，我还等着关门回家呢。
18. 你知道吗？犹豫的时候运气会溜走的。
19. 再不玩我就要打烊了...开玩笑的，我24小时营业。
20. 看你这表情，是不是在计算概率？别算了，没用的。

## 🔮 技术亮点

1. **智能状态管理** - 通过 `hasShownWelcome` 标记控制欢迎语显示
2. **定时器链** - 使用 setTimeout + setInterval 实现延迟启动和循环更新
3. **自动清理** - 每次操作前自动清理旧定时器，避免内存泄漏
4. **响应式设计** - 玩家操作时立即响应，停止催促
5. **可扩展性** - 方法设计清晰，易于添加新功能

## 📝 总结

这次优化实现了完整的自动催促机制，让赌徒NPC的对话系统更加智能和生动：

- 🎭 **智能欢迎** - 欢迎语只在首次显示，避免重复
- 🔄 **自动催促** - 3秒后自动开始，每4秒更新
- 🎯 **精准响应** - 玩家操作时立即停止
- 🎪 **无缝衔接** - 评判语后自动继续催促
- 🎨 **丰富内容** - 20条催促语，带黑色幽默

系统完全符合用户需求，提供了流畅的对话体验。
