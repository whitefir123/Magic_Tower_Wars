# 赌徒十连后按钮状态问题修复

## 问题描述
进行十连抽奖后，十连按钮和离开按钮都变灰处于不可用状态。虽然强制点击十连按钮还能进行抽奖，但离开按钮无法使用。

## 问题原因
在 `batchSpin` 方法中，调用顺序不正确：

```javascript
// 错误的顺序
this.showBatchSummary(results);
this.render();              // 此时 isSpinning 还是 true
this.renderHistory();
this.isSpinning = false;    // 状态重置在 render() 之后
this.spinStage = 0;
```

当 `render()` 被调用时，`isSpinning` 还是 `true`，导致 `updateButtonStates()` 方法将所有按钮设置为禁用状态。之后虽然 `isSpinning` 被设置为 `false`，但按钮状态没有再次更新。

## 修复方案
调整调用顺序，先重置状态，再更新显示：

```javascript
// 正确的顺序
this.isSpinning = false;    // 先重置状态
this.spinStage = 0;
this.showBatchSummary(results);
this.render();              // 此时 isSpinning 已经是 false
this.renderHistory();
```

## 技术细节

### updateButtonStates 方法的逻辑
```javascript
updateButtonStates() {
  // 根据 isSpinning 状态更新按钮
  const canAfford = playerGold >= mode.price;
  
  // 模式显示区域
  this.elements.modeDisplay.style.opacity = (canAfford && !this.isSpinning) ? '1' : '0.5';
  this.elements.modeDisplay.style.cursor = (canAfford && !this.isSpinning) ? 'pointer' : 'not-allowed';
  
  // 离开按钮
  this.elements.leaveBtn.disabled = this.isSpinning;
  this.elements.leaveBtn.style.opacity = this.isSpinning ? '0.5' : '1';
  this.elements.leaveBtn.style.cursor = this.isSpinning ? 'not-allowed' : 'pointer';
}
```

### 为什么强制点击十连按钮还能抽奖？
因为 `confirmSpin` 方法中有检查：
```javascript
confirmSpin() {
  if (this.isSpinning) return;  // 检查实际状态，而不是按钮样式
  // ...
}
```

虽然按钮样式显示为禁用，但实际的 `isSpinning` 状态已经是 `false`，所以点击仍然有效。

### 为什么离开按钮不行？
离开按钮使用了 `disabled` 属性：
```javascript
this.elements.leaveBtn.disabled = this.isSpinning;
```

当 `disabled = true` 时，按钮完全不响应点击事件，即使 `isSpinning` 后来变成 `false`，`disabled` 属性也不会自动更新。

## 修改文件
- `src/ui/GamblerUI.js` - `batchSpin` 方法（第 1186-1194 行）

## 测试建议
1. 进行十连抽奖
2. 确认十连完成后，所有按钮恢复正常状态
3. 确认离开按钮可以正常点击
4. 确认可以继续进行下一次抽奖

## 相关方法
- `batchSpin()` - 批量抽奖方法
- `render()` - 更新界面显示
- `updateButtonStates()` - 更新按钮状态
- `confirmSpin()` - 确认抽奖
