import { useEffect } from 'react';

let lockCount = 0;
let originalOverflow = '';
let originalTouchAction = '';
let originalPaddingRight = '';

export function useScrollLock(isLocked: boolean) {
  useEffect(() => {
    if (!isLocked) return;

    if (lockCount === 0) {
      originalOverflow = document.body.style.overflow;
      originalTouchAction = document.body.style.touchAction;
      originalPaddingRight = document.body.style.paddingRight;

      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
      if (scrollbarWidth > 0) {
        document.body.style.paddingRight = `${scrollbarWidth}px`;
      }
      document.body.classList.add('modal-locked');
    }
    lockCount++;

    return () => {
      lockCount--;
      if (lockCount <= 0) {
        lockCount = 0;
        document.body.style.overflow = originalOverflow;
        document.body.style.touchAction = originalTouchAction;
        document.body.style.paddingRight = originalPaddingRight;
        document.body.classList.remove('modal-locked');
      }
    };
  }, [isLocked]);
}
