import React, { memo } from 'react';

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
}

/**
 * Reusable refresh button with spinning icon
 */
export const RefreshButton = memo(({ onClick, isLoading, text, title, className }: RefreshButtonProps) => {
  return (
    <button
      className={`bullet-journal-refresh-btn ${className || ''}`}
      onClick={onClick}
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
