# 赌徒动画状态冲突修复

## 问题描述
当先进行单抽，然后进行十连时，如果十连中触发高品质抽奖动画，会出现卡死现象，无法进行动画演示。

## 问题原因

### 1. 状态残留
单抽完成后，`AnimationController` 的状态没有完全清理，可能残留以下状态：
- `animationPhase` 可能不是 `'idle'`
- `currentAnimation` 可能还保留着上次的动画数据
- `skipRequested` 可能还是 `true`
- 子系统（ReelAnimator、QualityPreviewSystem、ResultEffectRenderer）可能还有未清理的状态

### 2. 并发冲突
十连开始时，如果动画控制器还保留着单抽的状态，当触发高品质动画时：
- `playSpinAnimation` 方法检测到 `animationPhase !== 'idle'`
- 新动画无法正常启动
- 导致卡死

### 3. 缺少并发保护
`AnimationController.playSpinAnimation` 方法没有检查是否已有动画在运行，直接覆盖状态可能导致冲突。

## 修复方案

### 1. 添加并发保护
在 `AnimationController.playSpinAnimation` 方法开始时，检查并清理未完成的动画：

```javascript
async playSpinAnimation(finalReward, items, winnerIndex) {
  // 并发保护：如果已有动画在运行，先清理
  if (this.animationPhase !== 'idle') {
    console.warn('[AnimationController] 检测到未完成的动画，强制清理');
    this.cleanup();
  }
  
  // ... 继续执行动画
}
```

### 2. 在抽奖前清理状态
在 `spin` 和 `batchSpin` 方法开始时，主动清理动画控制器状态：

```javascript
async spin(tierKey) {
  if (this.isSpinning) return;
  if (!this.player) return;

  // 清理动画控制器状态（防止状态残留）
  if (this.animationController) {
    this.animationController.cleanup();
  }
  
  // ... 继续执行抽奖
}

async batchSpin() {
  if (this.isSpinning) return;
  if (!this.player) return;

  // 清理动画控制器状态（防止状态残留）
  if (this.animationController) {
    this.animationController.cleanup();
  }
  
  // ... 继续执行十连
}
```

### 3. cleanup 方法的作用
`AnimationController.cleanup()` 方法会：
- 重置 `skipRequested = false`
- 重置 `animationPhase = 'idle'`
- 清空 `currentAnimation = null`
- 调用子系统的清理方法：
  - `reelAnimator.cleanup()`
  - `qualityPreview.clearPreview()`
  - `resultEffects.cleanup()`

## 修改文件
- `src/ui/AnimationController.js`
  - `playSpinAnimation()` 方法：添加并发保护
  
- `src/ui/GamblerUI.js`
  - `spin()` 方法：在开始时清理动画状态
  - `batchSpin()` 方法：在开始时清理动画状态

## 技术细节

### 状态机设计
`AnimationController` 使用状态机管理动画生命周期：
- `'idle'`: 空闲状态，可以开始新动画
- `'spinning'`: 滚轮动画中
- `'previewing'`: 品质预告中
- `'revealing'`: 显示结果中
- `'celebrating'`: 庆祝效果中

### 防御性编程
- **双重保护**：在 `AnimationController` 和 `GamblerUI` 两个层级都添加清理
- **主动清理**：每次抽奖前主动清理，而不是依赖上次抽奖的清理
- **错误恢复**：如果检测到状态异常，强制清理并记录警告日志

## 测试建议
1. 进行单次抽奖
2. 等待动画完全结束
3. 立即进行十连抽奖
4. 确认十连中的高品质动画能正常播放
5. 重复测试多次，确保稳定性
6. 测试快速连续抽奖的情况

## 预期效果
- 单抽后进行十连，高品质动画正常播放
- 不会出现卡死现象
- 动画流畅，无状态冲突
- 控制台会在检测到异常状态时输出警告日志
