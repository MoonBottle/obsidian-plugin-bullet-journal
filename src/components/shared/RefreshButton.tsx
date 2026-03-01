import React, { memo, useCallback } from 'react';
import { Notice } from 'obsidian';
import { t } from '../../i18n';

export interface RefreshButtonProps {
  /** Click handler */
  onClick: () => void;
  /** Loading state */
  isLoading?: boolean;
  /** Button text */
  text?: string;
  /** Tooltip text */
  title?: string;
  /** Additional CSS class name */
  className?: string;
  /** Whether to show notification after refresh */
  showNotification?: boolean;
  /** Custom notification message */
  notificationMessage?: string;
}

/**
 * Reusable refresh button with spinning icon and notification feedback
 */
export const RefreshButton = memo(({
  onClick,
  isLoading,
  text,
  title,
  className,
  showNotification = true,
  notificationMessage
}: RefreshButtonProps) => {
  const handleClick = useCallback(() => {
    onClick();
    if (showNotification) {
      new Notice(notificationMessage || t('common').dataRefreshed);
    }
  }, [onClick, showNotification, notificationMessage]);

  return (
    <button
      className={`bullet-journal-refresh-btn ${className || ''}`}
      onClick={handleClick}
      disabled={isLoading}
      title={title}
    >
      <svg
        className={`refresh-icon ${isLoading ? 'spinning' : ''}`}
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="23 4 23 10 17 10"></polyline>
        <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
      </svg>
      {text}
    </button>
  );
});

RefreshButton.displayName = 'RefreshButton';
