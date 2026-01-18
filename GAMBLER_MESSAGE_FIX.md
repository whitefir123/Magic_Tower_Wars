# 赌徒界面消息显示修复

## 问题诊断

通过控制台日志发现：
```
[GamblerNPC] Category: welcome, Dialogue: 别担心，输了还可以再来...只要你还有钱。
[GamblerNPC] Category: rare, Dialogue: 稀有装备，够用了，别太贪心。
```

**GamblerNPC对话系统正常工作**，但界面左边显示的是固定文本。

## 根本原因

发现了两个独立的消息显示系统：

### 1. GamblerNPC对话气泡（左下角）
- 位置：`bottom: 20px; left: 20px`
- 功能：显示上下文相关的对话
- 状态：✅ 正常工作，使用新的对话库

### 2. 赌徒消息文本（界面内）
- 位置：`left: -470px; top: 157px`（相对于老虎机背景）
- 元素ID：`gambler-message`
- 功能：显示游戏状态提示
- 状态：❌ 使用固定文本，未使用对话库

## 解决方案

修改了 `updateMessage()` 方法（src/ui/GamblerUI.js 第848-863行）：

### 修改前
```javascript
updateMessage() {
  if (this.elements.messageText) {
    if (this.spinStage === 0) {
      const pity = this.player?.stats?.gamblerPityCount || 0;
      if (pity > 5) {
        this.elements.messageText.textContent = '我感觉到你的运气正在积聚...';
        this.elements.messageText.style.color = '#ff6600';
      } else {
        this.elements.messageText.textContent = '手气不错，陌生人？老虎机知道你的命运...';
        this.elements.messageText.style.color = '#ffcc00';
      }
    } else if (this.spinStage === 1) {
      this.elements.messageText.textContent = '祝你好运...';
    }
  }
}
```

### 修改后
```javascript
updateMessage() {
  if (this.elements.messageText && this.gamblerNPC) {
    if (this.spinStage === 0) {
      const pity = this.player?.stats?.gamblerPityCount || 0;
      const playerGold = this.player?.stats?.gold || 0;
      
      // 根据游戏状态选择合适的对话
      let message;
      if (pity >= 7) {
        message = this.gamblerNPC.getRandomDialogue('highPity');
        this.elements.messageText.style.color = '#ff6600';
      } else if (playerGold < 100) {
        message = this.gamblerNPC.getRandomDialogue('lowGold');
        this.elements.messageText.style.color = '#ff9800';
      } else {
        message = this.gamblerNPC.getRandomDialogue('welcome');
        this.elements.messageText.style.color = '#ffcc00';
      }
      
      this.elements.messageText.textContent = message;
    } else if (this.spinStage === 1) {
      // 旋转中的随机鼓励语
      const spinMessages = [
        '祝你好运...',
        '命运的齿轮正在转动...',
        '让我们看看会发生什么...',
        '屏住呼吸...',
        '奇迹即将发生...或许。'
      ];
      this.elements.messageText.textContent = spinMessages[Math.floor(Math.random() * spinMessages.length)];
    }
  }
}
```

## 改进内容

### 1. 使用对话库
现在 `gambler-message` 元素会从对话库中随机选择消息，而不是显示固定文本。

### 2. 智能上下文选择
根据游戏状态选择合适的对话类别：
- **保底快到** (pity >= 7)：使用 `highPity` 对话
- **金币不足** (gold < 100)：使用 `lowGold` 对话
- **正常状态**：使用 `welcome` 对话

### 3. 旋转中的变化
添加了5条随机的旋转中消息，增加趣味性。

### 4. 颜色提示
- 高保底：橙红色 `#ff6600`
- 低金币：橙色 `#ff9800`
- 正常：金黄色 `#ffcc00`

## 现在的消息系统

### 界面内消息（gambler-message）
- **位置**：老虎机上方中央
- **内容**：从对话库随机选择
- **更新时机**：
  - 打开界面时
  - 每次抽奖后
  - 状态改变时

### NPC对话气泡（左下角）
- **位置**：屏幕左下角
- **内容**：根据抽奖结果显示
- **更新时机**：
  - 打开界面时（欢迎语）
  - 抽奖结果显示时（上下文对话）

## 测试步骤

1. **清除浏览器缓存**
   - `Ctrl + Shift + Delete`
   - 或硬刷新 `Ctrl + F5`

2. **打开赌徒界面**
   - 观察老虎机上方的消息文本
   - 应该显示对话库中的随机内容

3. **多次打开/关闭界面**
   - 每次打开应该看到不同的欢迎语
   - 例如：
     - "又见面了，你的钱包准备好了吗？"
     - "听说今天有人中了大奖...不过不是你。"
     - "欢迎光临！顺便说一句，我上个月刚买了新房子。"

4. **测试不同状态**
   - **保底快到**：连续抽7次不出稀有，应该显示保底相关对话
   - **金币不足**：金币少于100时，应该显示嘲讽对话
   - **旋转中**：点击抽奖时，应该显示随机的鼓励语

## 预期效果

### 打开界面时
```
界面消息: "这台机器已经很久没吐钱了，也许今天？"
NPC气泡: "别担心，输了还可以再来...只要你还有钱。"
```

### 保底快到时
```
界面消息: "再输几次，保底就到了！多么美妙的机制。"
颜色: 橙红色
```

### 金币不足时
```
界面消息: "穷鬼也想赌博？我喜欢你的勇气。"
颜色: 橙色
```

### 旋转中
```
界面消息: "命运的齿轮正在转动..."
```

### 抽到稀有后
```
界面消息: (更新为新的随机欢迎语)
NPC气泡: "稀有装备，够用了，别太贪心。"
```

## 总结

现在赌徒界面有**两个独立的消息系统**，都使用对话库：

1. **界面内消息**：显示当前状态相关的对话
2. **NPC气泡**：显示抽奖结果相关的对话

两者配合使用，提供丰富的黑色幽默体验！
