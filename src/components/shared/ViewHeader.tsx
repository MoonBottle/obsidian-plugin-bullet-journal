import React, { memo, ReactNode } from 'react';

export interface ViewHeaderProps {
  /** Title text */
  title: string;
  /** Subtitle text */
  subtitle?: string;
  /** Right side actions */
  actions?: ReactNode;
}

/**
 * Reusable view header component
 */
export const ViewHeader = memo(({ title, subtitle, actions }: ViewHeaderProps) => {
  return (
    <div className="hk-work-header">
      <div className="hk-work-header-left">
        <h2 className="hk-work-title">{title}</h2>
        {subtitle && <p className="hk-work-subtitle">{subtitle}</p>}
      </div>
      {actions && (
        <div className="hk-work-header-right">
          {actions}
        </div>
      )}
    </div>
  );
});

ViewHeader.displayName = 'ViewHeader';
