# 赌徒界面按钮反馈动画

## 功能描述
为赌徒界面的所有可交互按钮添加点击反馈动画，提升用户体验。

## 实现的动画效果

### 1. 按钮缩放动画
点击按钮时触发 0.2 秒的缩放动画：
- 0%: 正常大小 (scale: 1)
- 50%: 缩小到 95% (scale: 0.95)
- 100%: 恢复正常 (scale: 1)

### 2. 应用范围
动画应用于以下所有可交互元素：
- **抽奖按钮**（模式显示区域）：点击进行抽奖
- **离开按钮**：点击关闭界面
- **关闭按钮**：点击关闭界面
- **模式切换箭头**：左右箭头按钮

## 技术实现

### CSS 动画定义
```css
@keyframes buttonPress {
  0% { transform: scale(1); }
  50% { transform: scale(0.95); }
  100% { transform: scale(1); }
}

.button-press-animation {
  animation: buttonPress 0.2s ease-out;
}
```

### JavaScript 触发方法
```javascript
triggerButtonAnimation(element) {
  if (!element) return;
  
  // 移除旧的动画类（如果存在）
  element.classList.remove('button-press-animation');
  
  // 强制重排以重启动画
  void element.offsetWidth;
  
  // 添加动画类
  element.classList.add('button-press-animation');
  
  // 动画结束后移除类
  setTimeout(() => {
    element.classList.remove('button-press-animation');
  }, 200);
}
```

### 事件监听器集成
在所有按钮的点击事件中调用动画方法：

```javascript
// 抽奖按钮
this.elements.modeDisplay.addEventListener('click', () => {
  this.triggerButtonAnimation(this.elements.modeDisplay);
  this.confirmSpin();
});

// 离开按钮
this.elements.leaveBtn.addEventListener('click', (e) => {
  this.triggerButtonAnimation(this.elements.leaveBtn);
  closeAction();
});

// 模式切换箭头
this.elements.modePrevBtn.addEventListener('click', () => {
  this.triggerButtonAnimation(this.elements.modePrevBtn);
  this.switchMode(-1);
});
```

## 用户体验改进

### 1. 即时反馈
用户点击按钮时立即看到视觉反馈，确认操作已被识别。

### 2. 流畅自然
0.2 秒的动画时长既不会太快导致看不清，也不会太慢影响操作流畅度。

### 3. 统一体验
所有可交互元素使用相同的动画效果，保持界面一致性。

### 4. 性能优化
- 使用 CSS transform 而不是修改尺寸，性能更好
- 动画结束后自动清理类名，避免内存泄漏
- 使用 `void element.offsetWidth` 强制重排，确保动画可以重复触发

## 修改文件
- `src/ui/GamblerUI.js`
  - `injectStyles()` 方法：添加 CSS 动画定义
  - 新增 `triggerButtonAnimation()` 方法：触发按钮动画
  - `setupEventListeners()` 方法：在所有按钮点击事件中集成动画

## 兼容性
- 使用标准 CSS3 动画，兼容所有现代浏览器
- 如果浏览器不支持动画，按钮仍然可以正常工作，只是没有视觉效果

## 测试建议
1. 点击抽奖按钮，观察缩放动画
2. 点击离开按钮，观察缩放动画
3. 点击模式切换箭头，观察缩放动画
4. 快速连续点击，确认动画可以正确重复触发
5. 在禁用状态下点击，确认不会触发动画（因为事件不会执行）
