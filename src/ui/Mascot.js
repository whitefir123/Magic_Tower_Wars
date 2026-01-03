// Mascot.js - 主菜单吉祥物动画

/**
 * ========================================================================
 * MASCOT CLASS - JavaScript-Controlled Main Menu Mascot
 * ========================================================================
 * 
 * Handles:
 * - Position calculation along button perimeter (top/left/right/bottom edges)
 * - Sprite frame toggling (IDLE: Row 1, MOVING: Row 2/3, PAUSED: frozen)
 * - State management (IDLE, MOVING, PAUSED)
 * - Stop/Resume logic with 2s timer
 * 
 * Sprite Sheet: 4x4 Grid (400% 400%)
 * Row 1 (Y=0%): Sleep frames (Cols 1-4)
 * Row 2 (Y=33.33%): Horizontal crawl (Cols 3-4)
 * Row 3 (Y=66.66%): Vertical climb (Cols 1-2)
 */
export class Mascot {
  constructor(buttonElement) {
    this.el = document.getElementById('menu-mascot');
    this.button = buttonElement;
    
    if (!this.el || !this.button) {
      console.warn('Mascot: Missing element or button');
      return;
    }

    // Get button dimensions for perimeter calculation
    this.updateButtonDimensions();

    // State machine
    this.state = 'IDLE'; // IDLE, MOVING, PAUSED
    this.dist = 0; // Distance along perimeter (0 to perimeter)
    this.perimeter = 0; // Total perimeter of button

    // Timers
    this.animTimer = 0; // For sprite frame toggling (150ms)
    this.pauseTimer = 0; // For pause countdown (2s)
    this.pauseTimeoutId = null; // For transitioning PAUSED -> IDLE

    // Sprite frame
    this.frame = 0; // 0 or 1 for animation toggle
    this.scaleX = 1; // 1 or -1 for horizontal flip
    this.scaleY = 1; // 1 or -1 for vertical flip

    // Movement speed: 30px per second
    this.speed = 30;

    // Animation frame toggle speed: 150ms
    this.animFrameInterval = 150;

    // Setup event listeners
    this.setupEventListeners();
  }

  updateButtonDimensions() {
    const rect = this.button.getBoundingClientRect();
    this.buttonWidth = rect.width;
    this.buttonHeight = rect.height;
    this.buttonX = rect.left;
    this.buttonY = rect.top;

    // Determine visible image area inside the button when using background-size: contain
    // Load background image once to get its intrinsic aspect ratio
    if (!this._bgImg) {
      this._bgImg = new Image();
      this._bgImg.src = 'https://i.postimg.cc/HWKMcMBL/anniu3.png';
      this._bgRatio = null;
      this._bgImg.onload = () => {
        this._bgRatio = (this._bgImg.naturalWidth || this._bgImg.width) / (this._bgImg.naturalHeight || this._bgImg.height || 1);
      };
    }

    // Default: assume full button area if ratio not ready yet
    let innerW = this.buttonWidth;
    let innerH = this.buttonHeight;
    let offsetX = 0;
    let offsetY = 0;

    const containerRatio = this.buttonWidth / Math.max(1, this.buttonHeight);
    if (this._bgRatio && this._bgRatio > 0) {
      // If container is wider than image ratio, image height fills, add horizontal margins
      if (containerRatio > this._bgRatio) {
        innerH = this.buttonHeight;
        innerW = innerH * this._bgRatio;
        offsetX = Math.max(0, (this.buttonWidth - innerW) / 2);
        offsetY = 0;
      } else {
        // Image width fills, add vertical margins
        innerW = this.buttonWidth;
        innerH = innerW / this._bgRatio;
        offsetX = 0;
        offsetY = Math.max(0, (this.buttonHeight - innerH) / 2);
      }
    }

    this.innerWidth = innerW;
    this.innerHeight = innerH;
    this.offsetX = offsetX;
    this.offsetY = offsetY;

    // Calculate perimeter along the visible image border
    this.perimeter = 2 * (this.innerWidth + this.innerHeight);
  }

  setupEventListeners() {
    if (!this.button) return;

    this.button.addEventListener('mouseenter', () => {
      if (this.state === 'IDLE') {
        this.setState('MOVING');
      } else if (this.state === 'PAUSED') {
        // Resume movement
        this.setState('MOVING');
        if (this.pauseTimeoutId) {
          clearTimeout(this.pauseTimeoutId);
          this.pauseTimeoutId = null;
        }
      }
    });

    this.button.addEventListener('mouseleave', () => {
      if (this.state === 'MOVING') {
        this.setState('PAUSED');
        this.pauseTimer = 0;

        // Start 2s timer to transition to IDLE
        this.pauseTimeoutId = setTimeout(() => {
          this.setState('IDLE');
          this.pauseTimeoutId = null;
        }, 2000);
      }
    });
  }

  setState(newState) {
    if (this.state === newState) return;
    this.state = newState;

    if (newState === 'IDLE') {
      // FIX 4: Do NOT reset dist - keep position memory for smooth transition
      // Only reset frame for sleep animation
      this.frame = 0;
      // Do NOT reset scaleX/scaleY - they will be recalculated in render()
    } else if (newState === 'MOVING') {
      this.animTimer = 0;
    } else if (newState === 'PAUSED') {
      // Freeze current frame
    }
  }

  /**
   * Calculate position and sprite based on distance along perimeter
   * Returns { top, left, bgPosX, bgPosY, scaleX, scaleY }
   * 
   * Sprite Sheet: 4x4 Grid (400% 400%)
   * Row 1 (Y=0%): Sleep frames (Cols 1-4) - 0%, 33.33%, 66.66%, 100%
   * Row 2 (Y=33.33%): Horizontal crawl (Cols 3-4) - 66.66%, 100%
   * Row 3 (Y=66.66%): Vertical climb (Cols 1-4) - 0%, 33.33%, 66.66%, 100%
   */
  calculatePositionAndSprite(dist) {
    // Use visible image area (background-size: contain) if available
    const w = (this.innerWidth || this.buttonWidth);
    const h = (this.innerHeight || this.buttonHeight);
    const ox = (this.offsetX || 0);
    const oy = (this.offsetY || 0);

    let top, left, bgPosX, bgPosY, scaleX = 1, scaleY = 1;

    // Normalize distance to perimeter
    dist = dist % this.perimeter;

    // Edge 1: Top (0 to w) - Moving Right along visible frame
    if (dist < w) {
      const progress = dist / w;
      top = oy - 32; // just above top edge of visible image
      left = ox + progress * w;
      bgPosX = 66.66 + (this.frame * 33.34); // Row 2: Cols 3-4 (66.66%, 100%)
      bgPosY = 33.33;
      scaleX = 1;
      scaleY = 1;
    }
    // Edge 2: Right (w to w+h) - Moving Down
    else if (dist < w + h) {
      const progress = (dist - w) / h;
      top = oy + progress * h;
      left = ox + w;
      // Row 3: Frame 3 (66.66%) or Frame 4 (100%)
      bgPosX = 66.66 + (this.frame * 33.34); // Toggle between 66.66% and 100%
      bgPosY = 66.66; // Row 3
      scaleX = -1; // Flip horizontal
      scaleY = -1; // Flip vertical
    }
    // Edge 3: Bottom (w+h to 2w+h) - Moving Left
    else if (dist < 2 * w + h) {
      const progress = (dist - w - h) / w;
      top = oy + h - 8; // Adjust so feet touch border exactly
      left = ox + w - progress * w;
      bgPosX = 100 - (this.frame * 33.34); // Row 2: Cols 4-3 (reversed)
      bgPosY = 33.33;
      scaleX = -1; // Face Left
      scaleY = -1; // Feet towards button
    }
    // Edge 4: Left (2w+h to 2w+2h) - Moving Up
    else {
      const progress = (dist - 2 * w - h) / h;
      top = oy + h - progress * h;
      left = ox;
      // Row 3: Frame 1 (0%) or Frame 3 (66.66%)
      bgPosX = this.frame === 0 ? 0 : 66.66; // Toggle between 0% and 66.66%
      bgPosY = 66.66; // Row 3
      scaleX = 1; // No flip
      scaleY = 1; // No flip
    }

    return { top, left, bgPosX, bgPosY, scaleX, scaleY };
  }

  /**
   * Update mascot position and animation
   * Called every frame from Game.loop()
   */
  update(dt) {
    if (!this.el || !this.button) return;

    // Update button dimensions in case window resized
    this.updateButtonDimensions();

    if (this.state === 'MOVING') {
      // Move along perimeter: 30px per second
      this.dist += (this.speed * dt) / 1000;
      if (this.dist >= this.perimeter) {
        this.dist -= this.perimeter;
      }

      // Toggle sprite frame every 150ms
      this.animTimer += dt;
      if (this.animTimer >= this.animFrameInterval) {
        this.frame = 1 - this.frame;
        this.animTimer = 0;
      }
    } else if (this.state === 'PAUSED') {
      // Freeze at current position, keep frame
      this.pauseTimer += dt;
    } else if (this.state === 'IDLE') {
      // Sleep animation: toggle frame every 1s
      this.animTimer += dt;
      if (this.animTimer >= 1000) {
        this.frame = 1 - this.frame;
        this.animTimer = 0;
      }
    }

    // Apply position and sprite
    this.render();
  }

  render() {
    if (!this.el) return;

    let top, left, bgPosX, bgPosY, scaleX, scaleY;

    if (this.state === 'IDLE') {
      // FIX 4: Keep position from where mascot stopped (use dist for position)
      // But show sleep animation (Row 1)
      const pos = this.calculatePositionAndSprite(this.dist);
      top = pos.top;
      left = pos.left;
      // Override sprite to show sleep animation (Row 1)
      bgPosX = this.frame === 0 ? 0 : 100; // Row 1: Col 1 or Col 4
      bgPosY = 0; // Row 1
      scaleX = pos.scaleX; // Keep orientation from perimeter position
      scaleY = pos.scaleY; // Keep orientation from perimeter position
    } else if (this.state === 'MOVING' || this.state === 'PAUSED') {
      // Moving or paused: calculate position along perimeter
      const pos = this.calculatePositionAndSprite(this.dist);
      top = pos.top;
      left = pos.left;
      bgPosX = pos.bgPosX;
      bgPosY = pos.bgPosY;
      scaleX = pos.scaleX;
      scaleY = pos.scaleY;
    }

    // Apply styles
    this.el.style.top = top + 'px';
    this.el.style.left = left + 'px';
    this.el.style.backgroundPosition = bgPosX.toFixed(2) + '% ' + bgPosY.toFixed(2) + '%';
    this.el.style.transform = `translate(-50%, 0) scaleX(${scaleX}) scaleY(${scaleY})`;
  }
}

