/**
 * Scroll Lock Manager
 * Handles multi-overlay reference counting, inline style preservation,
 * and reliable mobile touch & desktop background scroll locking.
 */

let lockCount = 0;
let savedScrollY = 0;
let originalStyles = {
  bodyOverflow: '',
  docOverflow: '',
  bodyPosition: '',
  bodyTop: '',
  bodyWidth: '',
  bodyTouchAction: '',
};

export function lockScroll() {
  if (typeof document === 'undefined') return;

  if (lockCount === 0) {
    savedScrollY = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0;

    originalStyles = {
      bodyOverflow: document.body.style.overflow || '',
      docOverflow: document.documentElement.style.overflow || '',
      bodyPosition: document.body.style.position || '',
      bodyTop: document.body.style.top || '',
      bodyWidth: document.body.style.width || '',
      bodyTouchAction: document.body.style.touchAction || '',
    };

    // Lock both html and body to ensure zero background movement across all browsers/devices
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${savedScrollY}px`;
    document.body.style.width = '100%';
  }

  lockCount++;
}

export function unlockScroll() {
  if (typeof document === 'undefined') return;

  if (lockCount > 0) {
    lockCount--;
  }

  if (lockCount === 0) {
    const restoreY = savedScrollY;

    // Restore original inline styles
    document.body.style.overflow = originalStyles.bodyOverflow;
    document.documentElement.style.overflow = originalStyles.docOverflow;
    document.body.style.position = originalStyles.bodyPosition;
    document.body.style.top = originalStyles.bodyTop;
    document.body.style.width = originalStyles.bodyWidth;
    document.body.style.touchAction = originalStyles.bodyTouchAction;

    // Restore original window scroll position precisely
    window.scrollTo({
      top: restoreY,
      left: 0,
      behavior: 'instant'
    });
  }
}
