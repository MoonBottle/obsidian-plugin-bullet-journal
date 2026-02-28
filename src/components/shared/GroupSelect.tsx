import React, { memo } from 'react';
import { t } from '../../i18n';

export interface GroupOption {
  id: string;
  name: string;
}

export interface GroupSelectProps {
  /** Available groups to display */
  groups: GroupOption[];
  /** Currently selected group ID */
  value: string;
  /** Handle group change */
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  /** Additional CSS class name */
  className?: string;
  /** Inline styles */
  style?: React.CSSProperties;
}

const SELECT_STYLE: React.CSSProperties = {
  fontSize: '12px',
  padding: '4px 24px 4px 8px',
  border: '1px solid var(--background-modifier-border)',
  borderRadius: '4px',
  backgroundColor: 'var(--background-primary)',
  color: 'var(--text-normal)'
};

/**
 * Reusable group select dropdown component
 */
export const GroupSelect = memo(({ groups, value, onChange, className, style }: GroupSelectProps) => {
  if (groups.length === 0) return null;

  return (
    <div className={`bullet-journal-group-filter ${className || ''}`}>
      <select
        value={value}
        onChange={onChange}
        className="bullet-journal-group-select"
        style={{ ...SELECT_STYLE, ...style }}
      >
        <option value="">{t('settings').projectGroups.allGroups}</option>
        {groups.map(group => (
          <option key={group.id} value={group.id}>
            {group.name || t('settings').projectGroups.unnamed}
          </option>
        ))}
      </select>
    </div>
  );
});

GroupSelect.displayName = 'GroupSelect';
