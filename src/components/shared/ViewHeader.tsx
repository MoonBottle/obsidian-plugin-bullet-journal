import React, { memo, ReactNode } from 'react';

export interface ViewHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export const ViewHeader = memo(({ title, subtitle, actions }: ViewHeaderProps) => {
  return (
    <div className="bullet-journal-header">
      <div className="bullet-journal-header-left">
        <h2 className="bullet-journal-title">{title}</h2>
        {subtitle && <p className="bullet-journal-subtitle">{subtitle}</p>}
      </div>
      {actions && (
        <div className="bullet-journal-header-right">
          {actions}
        </div>
      )}
    </div>
  );
});

ViewHeader.displayName = 'ViewHeader';
