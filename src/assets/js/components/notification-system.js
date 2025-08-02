/**
 * Notification System for Material MAP
 * Provides a unified way to display notifications to the user
 */

/**
 * Notification types
 * @enum {string}
 */
export const NotificationType = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info'
};

/**
 * Notification System
 */
class NotificationSystem {
  constructor() {
    this.container = null;
    this.initialize();
  }

  /**
   * Initialize the notification container
   */
  initialize() {
    // Create container if it doesn't exist
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.className = 'notification-container';
      this.container.setAttribute('role', 'alert');
      this.container.setAttribute('aria-live', 'polite');
      
      // Style the container
      Object.assign(this.container.style, {
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: '10000',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        maxWidth: '350px'
      });
      
      document.body.appendChild(this.container);
    }
  }

  /**
   * Show a notification
   * @param {string} message - The notification message
   * @param {NotificationType} type - The notification type
   * @param {number} duration - Duration in milliseconds
   * @returns {HTMLElement} The notification element
   */
  show(message, type = NotificationType.INFO, duration = 3000) {
    this.initialize();
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    // Style the notification
    const colors = {
      [NotificationType.SUCCESS]: '#10B981',
      [NotificationType.WARNING]: '#F59E0B',
      [NotificationType.ERROR]: '#EF4444',
      [NotificationType.INFO]: '#3B82F6'
    };
    
    Object.assign(notification.style, {
      padding: '12px 20px',
      borderRadius: '8px',
      color: 'white',
      fontWeight: '500',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      backgroundColor: colors[type] || colors[NotificationType.INFO],
      opacity: '0',
      transform: 'translateY(-20px)',
      transition: 'all 0.3s ease'
    });
    
    // Add to container
    this.container.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
      notification.style.opacity = '1';
      notification.style.transform = 'translateY(0)';
    }, 10);
    
    // Remove after duration
    if (duration > 0) {
      setTimeout(() => {
        this.dismiss(notification);
      }, duration);
    }
    
    return notification;
  }

  /**
   * Dismiss a notification
   * @param {HTMLElement} notification - The notification element
   */
  dismiss(notification) {
    if (!notification || !notification.parentNode) return;
    
    notification.style.opacity = '0';
    notification.style.transform = 'translateY(-20px)';
    
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }

  /**
   * Show a success notification
   * @param {string} message - The notification message
   * @param {number} duration - Duration in milliseconds
   * @returns {HTMLElement} The notification element
   */
  success(message, duration) {
    return this.show(message, NotificationType.SUCCESS, duration);
  }

  /**
   * Show an error notification
   * @param {string} message - The notification message
   * @param {number} duration - Duration in milliseconds
   * @returns {HTMLElement} The notification element
   */
  error(message, duration) {
    return this.show(message, NotificationType.ERROR, duration);
  }

  /**
   * Show a warning notification
   * @param {string} message - The notification message
   * @param {number} duration - Duration in milliseconds
   * @returns {HTMLElement} The notification element
   */
  warning(message, duration) {
    return this.show(message, NotificationType.WARNING, duration);
  }

  /**
   * Show an info notification
   * @param {string} message - The notification message
   * @param {number} duration - Duration in milliseconds
   * @returns {HTMLElement} The notification element
   */
  info(message, duration) {
    return this.show(message, NotificationType.INFO, duration);
  }

  /**
   * Show a network status notification
   * @param {string} message - The notification message
   * @param {boolean} isOnline - Whether the network is online
   */
  networkStatus(message, isOnline) {
    const type = isOnline ? NotificationType.SUCCESS : NotificationType.WARNING;
    return this.show(message, type, 3000);
  }
}

// Create a singleton instance
const notificationSystem = new NotificationSystem();

// For backward compatibility
window.notify = notificationSystem;

export default notificationSystem;