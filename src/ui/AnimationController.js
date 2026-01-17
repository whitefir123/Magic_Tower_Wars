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
   * @returns {Promise} 动画完成时解析
   */
  async playSpinAnimation(finalReward, items, winnerIndex) {
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
      await this.reelAnimator.animate(items, winnerIndex, this.skipRequested ? 500 : 4000);

      // 如果跳过，直接进入结果
      if (this.skipRequested) {
        this.animationPhase = 'revealing';
        await this.resultEffects.playResultEffect(finalReward.quality, true); // 缩略版
        return;
      }

      // 阶段 2：品质预告（仅稀有以上）
      if (['RARE', 'EPIC', 'LEGENDARY', 'JACKPOT'].includes(finalReward.quality)) {
        this.animationPhase = 'previewing';
        await this.qualityPreview.showPreview(finalReward.quality, 2000);
      }

      // 阶段 3：显示结果
      this.animationPhase = 'revealing';
      
      // 阶段 4：庆祝效果
      this.animationPhase = 'celebrating';
      await this.resultEffects.playResultEffect(finalReward.quality, false);

    } catch (error) {
      console.error('Animation error:', error);
      // 错误回退：立即显示结果
      this.animationPhase = 'revealing';
      await this.resultEffects.playResultEffect(finalReward.quality, true);
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
