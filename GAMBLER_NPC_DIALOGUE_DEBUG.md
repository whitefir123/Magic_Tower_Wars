# 赌徒NPC对话系统调试指南

## 问题描述
新增的赌徒NPC对话没有显示，需要检查和调试。

## 已完成的修改

### 1. 扩充对话库 (src/ui/GamblerNPC.js)
已将所有对话类别的内容大幅扩充：
- **welcome**: 3条 → 10条
- **nearMiss**: 4条 → 9条
- **legendary**: 4条 → 10条
- **jackpot**: 4条 → 10条
- **highPity**: 4条 → 10条
- **trash**: 3条 → 11条
- **lowGold**: 3条 → 9条
- **epic**: 3条 → 9条
- **rare**: 3条 → 9条

### 2. 添加调试日志
在两个关键方法中添加了console.log：
- `getContextualDialogue()`: 显示上下文信息
- `getRandomDialogue()`: 显示选中的对话

## 测试步骤

### 1. 清除浏览器缓存
**重要！** 浏览器可能缓存了旧版本的JavaScript文件。

**Chrome/Edge:**
1. 按 `Ctrl + Shift + Delete`
2. 选择"缓存的图片和文件"
3. 点击"清除数据"

**或者使用硬刷新:**
- Windows: `Ctrl + F5`
- Mac: `Cmd + Shift + R`

### 2. 打开开发者工具
1. 按 `F12` 打开开发者工具
2. 切换到 "Console" 标签

### 3. 进入赌徒界面
1. 启动游戏
2. 找到赌徒NPC并打开界面
3. 观察控制台输出

### 4. 进行抽奖
1. 点击抽奖按钮
2. 观察：
   - 左侧是否显示NPC对话气泡
   - 控制台是否输出日志

## 预期的控制台输出

### 打开界面时
```
[GamblerNPC] Category: welcome, Dialogue: 欢迎光临！顺便说一句，我上个月刚买了新房子。
```

### 抽到普通物品时
```
[GamblerNPC] Context: { quality: 'COMMON', type: 'equipment', pityCount: 2, isNearMiss: false, playerGold: 500 }
[GamblerNPC] Category: welcome, Dialogue: 这台机器已经很久没吐钱了，也许今天？
```

### 抽到垃圾时
```
[GamblerNPC] Context: { quality: 'COMMON', type: 'trash', pityCount: 3, isNearMiss: false, playerGold: 450 }
[GamblerNPC] Category: trash, Dialogue: 看，一块幸运石！虽然没什么用，但至少不是空气。
```

### 抽到稀有时
```
[GamblerNPC] Context: { quality: 'RARE', type: 'equipment', pityCount: 0, isNearMiss: false, playerGold: 400 }
[GamblerNPC] Category: rare, Dialogue: 稀有品质！比垃圾强多了。
```

### 抽到史诗时
```
[GamblerNPC] Context: { quality: 'EPIC', type: 'equipment', pityCount: 0, isNearMiss: false, playerGold: 350 }
[GamblerNPC] Category: epic, Dialogue: 史诗装备！你今天走运了！
```

### 抽到传说时
```
[GamblerNPC] Context: { quality: 'LEGENDARY', type: 'equipment', pityCount: 0, isNearMiss: false, playerGold: 300 }
[GamblerNPC] Category: legendary, Dialogue: 我...我需要检查一下机器是不是坏了。
```

### 保底快到时
```
[GamblerNPC] Context: { quality: 'COMMON', type: 'equipment', pityCount: 7, isNearMiss: false, playerGold: 250 }
[GamblerNPC] Category: highPity, Dialogue: 再输几次，保底就到了！多么美妙的机制。
```

### 金币不足时
```
[GamblerNPC] Context: { quality: 'COMMON', type: 'equipment', pityCount: 1, isNearMiss: false, playerGold: 80 }
[GamblerNPC] Category: lowGold, Dialogue: 穷鬼也想赌博？我喜欢你的勇气。
```

## 对话显示位置

NPC对话应该显示在：
- **位置**: 屏幕左下角
- **样式**: 暗金色边框的对话气泡
- **持续时间**: 3秒后自动消失

## 可能的问题和解决方案

### 问题1: 看不到对话气泡
**原因**: CSS样式可能被覆盖或z-index太低
**解决**: 检查`.gambler-npc-dialogue`的CSS样式

### 问题2: 控制台没有日志
**原因**: 
1. 浏览器缓存了旧代码
2. GamblerNPC对象没有正确初始化

**解决**: 
1. 清除缓存并硬刷新
2. 检查GamblerUI是否正确创建了gamblerNPC实例

### 问题3: 对话内容是旧的
**原因**: 浏览器缓存
**解决**: 
1. 清除缓存
2. 使用隐私模式/无痕模式测试
3. 检查文件修改时间

### 问题4: 10连抽对话不变
**原因**: 10连抽使用了硬编码的对话
**位置**: `src/ui/GamblerUI.js` 第1118-1125行
**状态**: 这是预期行为，10连抽有专门的对话

## 验证对话库是否加载

在控制台输入以下命令：
```javascript
// 获取GamblerUI实例
const gamblerUI = window.game?.ui?.gamblerUI;

// 检查对话库
if (gamblerUI?.gamblerNPC) {
  console.log('Welcome dialogues:', gamblerUI.gamblerNPC.dialogues.welcome);
  console.log('Trash dialogues:', gamblerUI.gamblerNPC.dialogues.trash);
  console.log('Legendary dialogues:', gamblerUI.gamblerNPC.dialogues.legendary);
}
```

如果输出显示新的对话内容，说明代码已加载。

## 手动触发对话测试

在控制台输入：
```javascript
// 测试欢迎语
window.game.ui.gamblerUI.gamblerNPC.say(
  window.game.ui.gamblerUI.gamblerNPC.getRandomDialogue('welcome'), 
  5000
);

// 测试垃圾对话
window.game.ui.gamblerUI.gamblerNPC.say(
  window.game.ui.gamblerUI.gamblerNPC.getRandomDialogue('trash'), 
  5000
);

// 测试传说对话
window.game.ui.gamblerUI.gamblerNPC.say(
  window.game.ui.gamblerUI.gamblerNPC.getRandomDialogue('legendary'), 
  5000
);
```

## 总结

1. **清除缓存**是最重要的步骤
2. 使用**控制台日志**确认代码是否执行
3. 使用**手动测试**验证对话系统是否工作
4. 检查**对话气泡**是否正确显示

如果完成以上步骤后仍然看不到新对话，请提供控制台的完整输出以便进一步调试。
