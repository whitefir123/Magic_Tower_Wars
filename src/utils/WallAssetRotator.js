// WallAssetRotator.js - 墙壁素材旋转处理器
// 功能: 将墙壁素材旋转指定角度，不影响其他素材

/**
 * WallAssetRotator - 墙壁素材旋转处理器
 * 提供墙壁素材的旋转功能
 */
export const WallAssetRotator = {
  /**
   * 旋转墙壁素材
   * @param {string} imageUrl - 墙壁素材URL
   * @param {number} degrees - 旋转角度（90, 180, 270等）
   * @param {function} callback - 完成后的回调函数，返回旋转后的图片数据URL
   */
  rotateWallAsset: function(imageUrl, degrees = 90, callback) {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = function() {
      // 创建临时canvas用于旋转
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // 根据旋转角度调整canvas尺寸
      const radians = (degrees % 360) * Math.PI / 180;
      const cos = Math.abs(Math.cos(radians));
      const sin = Math.abs(Math.sin(radians));
      
      // 计算新的canvas尺寸
      const newWidth = img.width * cos + img.height * sin;
      const newHeight = img.width * sin + img.height * cos;
      
      canvas.width = Math.ceil(newWidth);
      canvas.height = Math.ceil(newHeight);
      
      // 移动到中心并旋转
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate(radians);
      ctx.imageSmoothingEnabled = false; // 保持像素风格
      
      // 从中心绘制图片
      ctx.drawImage(img, -img.width / 2, -img.height / 2);
      
      // 获取旋转后的图片数据URL
      const rotatedImageUrl = canvas.toDataURL('image/png');
      
      if (callback && typeof callback === 'function') {
        callback(rotatedImageUrl);
      }
      
      // 返回旋转后的图片数据
      return rotatedImageUrl;
    };
    
    img.onerror = function() {
      console.error('墙壁素材加载失败:', imageUrl);
      if (callback && typeof callback === 'function') {
        callback(null);
      }
    };
    
    img.src = imageUrl;
  },
  
  /**
   * 快速旋转墙壁90度
   * @param {string} imageUrl - 墙壁素材URL
   * @param {function} callback - 完成后的回调函数
   */
  rotateWall90: function(imageUrl, callback) {
    this.rotateWallAsset(imageUrl, 90, callback);
  },
  
  /**
   * 快速旋转墙壁180度
   * @param {string} imageUrl - 墙壁素材URL
   * @param {function} callback - 完成后的回调函数
   */
  rotateWall180: function(imageUrl, callback) {
    this.rotateWallAsset(imageUrl, 180, callback);
  },
  
  /**
   * 快速旋转墙壁270度
   * @param {string} imageUrl - 墙壁素材URL
   * @param {function} callback - 完成后的回调函数
   */
  rotateWall270: function(imageUrl, callback) {
    this.rotateWallAsset(imageUrl, 270, callback);
  }
};

// 暴露到全局作用域
if (typeof window !== 'undefined') {
  window.WallAssetRotator = WallAssetRotator;
}

