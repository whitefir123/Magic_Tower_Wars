// AnimationController.js - 动画控制器
// 管理赌徒界面的所有动画状态和转换

import { ReelAnimator } from './ReelAnimator.js';
import { QualityPreviewSystem } from './QualityPreviewSystem.js';
import { ResultEffectRenderer } from './ResultEffectRenderer.js';

/**
 * AnimationController - 动画总控制器
 * 协调滚轮动画、品质预告和结果效果的完整动画生命周期
 */
export class AnimationController {
  constructor(gamblerUI) {
    this.gamblerUI = gamblerUI;
    this.reelAnimator = new ReelAnimator(this);
    this.qualityPreview = new QualityPreviewSystem(this);
    this.resultEffects = new ResultEffectRenderer(this);
    
    this.currentAnimation = null;
    this.skipRequested = false;
    this.animationPhase = 'idle'; // 'idle', 'spinning', 'previewing', 'revealing', 'celebrating'
  }

  /**
   * 播放完整的旋转动画序列
   * @param {Object} finalReward - 最终奖励对象
   * @param {Array} items - 滚轮上的所有物品
   * @param {number} winnerIndex - 获胜物品的索引
   * @returns {Promise<Object>} 动画完成时解析，返回实际获得的物品
   */
  async playSpinAnimation(finalReward, items, winnerIndex) {
    // 并发保护：如果已有动画在运行，先清理
    if (this.animationPhase !== 'idle') {
      console.warn('[AnimationController] 检测到未完成的动画，强制清理');
      this.cleanup();
      // 等待两帧，确保清理完成和DOM更新
      await new Promise(resolve => requestAnimationFrame(resolve));
      await new Promise(resolve => requestAnimationFrame(resolve));
      // 额外等待一小段时间确保所有清理完成
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    this.skipRequested = false;
    this.currentAnimation = {
      reward: finalReward,
      items,
      winnerIndex,
      startTime: performance.now()
    };

    try {
      // 阶段 1：滚轮动画
      this.animationPhase = 'spinning';
      await this.reelAnimator.animate(items, winnerIndex, this.skipRequested ? 500 : 5500);

      // 如果跳过，直接返回预设的finalReward
      if (this.skipRequested) {
        this.animationPhase = 'revealing';
        await this.resultEffects.playResultEffect(finalReward.quality, true);
        return finalReward;
      }

      // 动画结束后，获取指针实际停在的物品
      const actualWinner = this.reelAnimator.getActualWinnerByPointer();
      const resultReward = actualWinner || finalReward; // 如果获取失败，使用预设的finalReward
      
      // 阶段 2：品质预告（仅稀有以上）
      if (['RARE', 'EPIC', 'LEGENDARY', 'JACKPOT'].includes(resultReward.quality)) {
        this.animationPhase = 'previewing';
        await this.qualityPreview.showPreview(resultReward.quality, 2000);
      }

      // 阶段 3：显示结果
      this.animationPhase = 'revealing';
      
      // 阶段 4：庆祝效果
      this.animationPhase = 'celebrating';
      await this.resultEffects.playResultEffect(resultReward.quality, false);
      
      return resultReward; // 返回实际获得的物品

    } catch (error) {
      console.error('Animation error:', error);
      // 错误回退：立即显示结果
      this.animationPhase = 'revealing';
      await this.resultEffects.playResultEffect(finalReward.quality, true);
      return finalReward;
    } finally {
      this.animationPhase = 'idle';
      this.currentAnimation = null;
    }
  }

  /**
   * 请求跳过当前动画
   */
  requestSkip() {
    if (this.animationPhase === 'idle' || this.animationPhase === 'celebrating') {
      return; // 已经结束或正在庆祝，不允许跳过
    }
    
    this.skipRequested = true;
    
    // 通知子系统跳过
    if (this.reelAnimator) {
      this.reelAnimator.skip();
    }
    if (this.qualityPreview) {
      this.qualityPreview.clearPreview();
    }
  }

  /**
   * 清理动画状态
   */
  cleanup() {
    this.skipRequested = false;
    this.animationPhase = 'idle';
    this.currentAnimation = null;
    
    if (this.reelAnimator) {
      this.reelAnimator.cleanup();
    }
    if (this.qualityPreview) {
      this.qualityPreview.clearPreview();
    }
    if (this.resultEffects) {
      this.resultEffects.cleanup();
    }
  }

  /**
   * 获取当前动画状态
   * @returns {Object} 动画状态对象
   */
  getState() {
    return {
      phase: this.animationPhase,
      skipRequested: this.skipRequested,
      currentAnimation: this.currentAnimation,
      isAnimating: this.animationPhase !== 'idle'
    };
  }
}
