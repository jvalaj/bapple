/**
 * Liquid Glass UI - JavaScript Utilities
 * Simple, accessible JavaScript for interactive components
 */

const LiquidGlass = (function() {
  'use strict';

  // Modal functionality
  const modal = {
    /**
     * Open a modal by ID
     * @param {string} modalId - The ID of the modal to open
     */
    open: function(modalId) {
      const modal = document.getElementById(modalId);
      if (!modal) {
        console.error(`Modal with ID "${modalId}" not found`);
        return;
      }

      modal.classList.add('lg-modal-open');
      document.body.style.overflow = 'hidden';

      // Focus management for accessibility
      const firstFocusable = modal.querySelector(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (firstFocusable) {
        firstFocusable.focus();
      }

      // Trap focus within modal
      this._trapFocus(modal);

      // Handle escape key
      this._handleEscape(modalId);
    },

    /**
     * Close a modal by ID
     * @param {string} modalId - The ID of the modal to close
     */
    close: function(modalId) {
      const modal = document.getElementById(modalId);
      if (!modal) return;

      modal.classList.remove('lg-modal-open');
      document.body.style.overflow = '';

      // Remove event listeners
      document.removeEventListener('keydown', this._escapeHandler);
    },

    /**
     * Trap focus within modal for accessibility
     * @private
     */
    _trapFocus: function(modal) {
      const focusableElements = modal.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      
      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      modal.addEventListener('keydown', function(e) {
        if (e.key !== 'Tab') return;

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      });
    },

    /**
     * Handle escape key to close modal
     * @private
     */
    _handleEscape: function(modalId) {
      this._escapeHandler = function(e) {
        if (e.key === 'Escape') {
          modal.close(modalId);
        }
      };
      document.addEventListener('keydown', this._escapeHandler);
    }
  };

  // Toast/Notification functionality
  const toast = {
    /**
     * Show a toast notification
     * @param {Object} options - Toast configuration
     * @param {string} options.message - The message to display
     * @param {string} options.type - Type of toast (info, success, warning, danger)
     * @param {number} options.duration - Duration in milliseconds (default: 3000)
     */
    show: function(options) {
      const defaults = {
        message: '',
        type: 'info',
        duration: 3000,
        position: 'top-right'
      };

      const config = { ...defaults, ...options };

      // Create toast container if it doesn't exist
      let container = document.getElementById('lg-toast-container');
      if (!container) {
        container = document.createElement('div');
        container.id = 'lg-toast-container';
        container.style.cssText = `
          position: fixed;
          top: calc(60px + env(safe-area-inset-top));
          left: 16px;
          right: 16px;
          margin-left: auto;
          z-index: 9999;
          display: flex;
          flex-direction: column;
          gap: 12px;
          max-width: 400px;
        `;
        document.body.appendChild(container);
      }

      // Create toast element
      const toastEl = document.createElement('div');
      toastEl.className = `lg-toast lg-toast-${config.type}`;
      toastEl.setAttribute('role', 'alert');
      toastEl.setAttribute('aria-live', 'polite');
      
      const icons = {
        info: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>',
        success: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>',
        warning: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>',
        danger: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>'
      };

      toastEl.innerHTML = `
        <div class="lg-toast-icon">${icons[config.type] || icons.info}</div>
        <div class="lg-toast-message">${config.message}</div>
        <button class="lg-toast-close" aria-label="Close notification">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      `;

      // Add styles dynamically
      toastEl.style.cssText = `
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 16px;
        background: rgba(29, 29, 31, 0.78);
        color: #f5f5f7;
        -webkit-backdrop-filter: blur(20px) saturate(180%);
        backdrop-filter: blur(20px) saturate(180%);
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 18px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.35);
        animation: lg-toast-slide-in 0.3s ease-out;
      `;

      // Add to container
      container.appendChild(toastEl);

      // Close button functionality
      const closeBtn = toastEl.querySelector('.lg-toast-close');
      closeBtn.onclick = () => this._remove(toastEl);

      // Auto remove after duration
      if (config.duration > 0) {
        setTimeout(() => this._remove(toastEl), config.duration);
      }

      return toastEl;
    },

    /**
     * Remove toast element
     * @private
     */
    _remove: function(toastEl) {
      toastEl.style.animation = 'lg-toast-slide-out 0.3s ease-out';
      setTimeout(() => {
        if (toastEl.parentNode) {
          toastEl.parentNode.removeChild(toastEl);
        }
      }, 300);
    }
  };

  // Dropdown functionality
  const dropdown = {
    /**
     * Toggle dropdown visibility
     * @param {string} dropdownId - The ID of the dropdown to toggle
     */
    toggle: function(dropdownId) {
      const dropdown = document.getElementById(dropdownId);
      if (!dropdown) return;

      const isOpen = dropdown.classList.contains('lg-dropdown-open');
      
      // Close all other dropdowns
      document.querySelectorAll('.lg-dropdown-open').forEach(el => {
        el.classList.remove('lg-dropdown-open');
      });

      if (!isOpen) {
        dropdown.classList.add('lg-dropdown-open');
        
        // Close on outside click
        setTimeout(() => {
          document.addEventListener('click', function closeDropdown(e) {
            if (!dropdown.contains(e.target)) {
              dropdown.classList.remove('lg-dropdown-open');
              document.removeEventListener('click', closeDropdown);
            }
          });
        }, 0);
      }
    }
  };

  // Tabs functionality
  const tabs = {
    /**
     * Switch to a specific tab
     * @param {string} tabId - The ID of the tab panel to show
     * @param {string} groupId - The ID of the tab group
     */
    switch: function(tabId, groupId) {
      const group = document.getElementById(groupId);
      if (!group) return;

      // Hide all tab panels in this group
      group.querySelectorAll('.lg-tab-panel').forEach(panel => {
        panel.classList.remove('lg-tab-panel-active');
      });

      // Deactivate all tab buttons
      group.querySelectorAll('.lg-tab-button').forEach(button => {
        button.classList.remove('lg-tab-button-active');
        button.setAttribute('aria-selected', 'false');
      });

      // Show selected tab panel
      const panel = document.getElementById(tabId);
      if (panel) {
        panel.classList.add('lg-tab-panel-active');
      }

      // Activate selected tab button
      const button = group.querySelector(`[data-tab="${tabId}"]`);
      if (button) {
        button.classList.add('lg-tab-button-active');
        button.setAttribute('aria-selected', 'true');
      }
    }
  };

  // Utility functions
  const utils = {
    /**
     * Debounce function for performance optimization
     * @param {Function} func - The function to debounce
     * @param {number} wait - Wait time in milliseconds
     */
    debounce: function(func, wait) {
      let timeout;
      return function executedFunction(...args) {
        const later = () => {
          clearTimeout(timeout);
          func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
      };
    },

    /**
     * Throttle function for performance optimization
     * @param {Function} func - The function to throttle
     * @param {number} limit - Time limit in milliseconds
     */
    throttle: function(func, limit) {
      let inThrottle;
      return function(...args) {
        if (!inThrottle) {
          func.apply(this, args);
          inThrottle = true;
          setTimeout(() => inThrottle = false, limit);
        }
      };
    }
  };

  // Initialize event listeners when DOM is ready
  function init() {
    // Add keyboard navigation for modals
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') {
        const openModal = document.querySelector('.lg-modal-open');
        if (openModal) {
          const modalId = openModal.id;
          modal.close(modalId);
        }
      }
    });

    // Add animation styles if not already present
    if (!document.getElementById('lg-animations')) {
      const style = document.createElement('style');
      style.id = 'lg-animations';
      style.textContent = `
        @keyframes lg-toast-slide-in {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        
        @keyframes lg-toast-slide-out {
          from {
            transform: translateX(0);
            opacity: 1;
          }
          to {
            transform: translateX(100%);
            opacity: 0;
          }
        }

        .lg-toast-icon {
          width: 20px;
          height: 20px;
          flex-shrink: 0;
        }

        .lg-toast-message {
          flex: 1;
          font-size: 14px;
        }

        .lg-toast-close {
          color: inherit;
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: none;
          cursor: pointer;
          opacity: 0.6;
          transition: opacity 0.2s;
        }

        .lg-toast-close:hover {
          opacity: 1;
        }

        .lg-toast-close svg {
          width: 16px;
          height: 16px;
        }

        .lg-toast-info .lg-toast-icon {
          color: rgba(90, 200, 250, 1);
        }

        .lg-toast-success .lg-toast-icon {
          color: rgba(52, 199, 89, 1);
        }

        .lg-toast-warning .lg-toast-icon {
          color: rgba(255, 149, 0, 1);
        }

        .lg-toast-danger .lg-toast-icon {
          color: rgba(255, 59, 48, 1);
        }
      `;
      document.head.appendChild(style);
    }
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Public API
  return {
    modal,
    toast,
    dropdown,
    tabs,
    utils
  };
})();

// Example usage demonstrations (can be removed in production)
console.log('🌊 Liquid Glass UI loaded successfully!');
console.log('Available methods:', {
  'Modal': 'LiquidGlass.modal.open(id) / close(id)',
  'Toast': 'LiquidGlass.toast.show({message, type, duration})',
  'Dropdown': 'LiquidGlass.dropdown.toggle(id)',
  'Tabs': 'LiquidGlass.tabs.switch(tabId, groupId)'
});

// Make it available globally
if (typeof window !== 'undefined') {
  window.LiquidGlass = LiquidGlass;
}

// ========================================
// Preloader
// ========================================
// Fastlane's loading screen: blank white with a thin progress bar for at least 2s, so the heavy work
// (3D phone, backdrop, fonts) happens behind it. The page then reveals and the phone flies in.
(function() {
  'use strict';

  const MIN = 2000;
  const MAX = 8000;
  const root = document.documentElement;
  const bar = document.querySelector('.lg-preloader-bar span');
  const t0 = performance.now();
  let duoReady = false;
  let assetsReady = false;
  let shown = 0;
  let done = false;

  function reveal() {
    if (done) return;
    done = true;
    root.classList.add('lg-loaded');
    document.body.classList.remove('lg-loading');
    // Same task as lg-loaded, so the hero can decide what to show before anything paints
    document.dispatchEvent(new Event('lg:reveal'));
    const preloader = document.querySelector('.lg-preloader');
    if (preloader) {
      preloader.setAttribute('aria-busy', 'false');
      setTimeout(() => preloader.remove(), 600);
    }
    // Scrolling is locked while loading, so a #section link never got there on its own.
    if (location.hash.length > 1) {
      const target = document.getElementById(location.hash.slice(1));
      if (target) target.scrollIntoView();
    }
  }

  // The 3D phone says when it's ready (or failed) from its iframe
  window.addEventListener('message', (event) => {
    if (event.origin !== location.origin) return;
    if (event.data === 'duo:ready' || event.data === 'duo:failed') duoReady = true;
  });

  // The backdrop is the whole look, so wait for it and the fonts too
  const backdrop = new Image();
  backdrop.src = window.matchMedia('(min-width: 1024px)').matches
    ? 'assets/pro.webp'
    : 'assets/pro-mobile.webp';
  const backdropReady = backdrop.decode ? backdrop.decode() : Promise.resolve();
  const fontsReady = document.fonts ? document.fonts.ready : Promise.resolve();
  Promise.all([backdropReady, fontsReady]).then(() => { assetsReady = true; }, () => { assetsReady = true; });

  // The bar eases toward the time elapsed, holding at 90% until everything is in
  function tick(now) {
    const t = now - t0;
    const ok = (duoReady && assetsReady) || t > MAX;
    const target = Math.min(t / MIN, ok ? 1 : 0.9);
    shown += (target - shown) * 0.18;
    if (bar) bar.style.transform = `scaleX(${Math.min(shown, 1).toFixed(4)})`;
    if (ok && t >= MIN && shown > 0.985) {
      if (bar) bar.style.transform = 'scaleX(1)';
      setTimeout(reveal, 120);
      return;
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
})();
