import type { ReactElement } from 'react';
import type { Resource, ResourceType } from '../../../shared/api';
import styles from './ResourceCard.module.css';

interface ResourceCardProps {
  resource: Resource;
  selected: boolean;
  onSelect: (resource: Resource) => void;
}

const typeLabels: Record<ResourceType, string> = {
  ROOM: 'Room',
  EQUIPMENT: 'Equipment',
  LAB: 'Lab',
};

export const ResourceCard = ({ resource, selected, onSelect }: ResourceCardProps): ReactElement => (
  <li className={styles.card}>
    <div className={styles.topLine}>
      <span className={styles.type}>{typeLabels[resource.type]}</span>
      <span className={resource.isAvailable ? styles.available : styles.unavailable}>
        {resource.isAvailable ? 'Available' : 'Unavailable'}
      </span>
    </div>
    <h3>{resource.name}</h3>
    <p>{resource.location}</p>
    <button
      className={styles.select}
      type="button"
      disabled={!resource.isAvailable}
      aria-pressed={selected}
      aria-label={`${selected ? 'Selected' : 'Book'} ${resource.name}`}
      onClick={(): void => onSelect(resource)}
    >
      {!resource.isAvailable
        ? 'Unavailable'
        : selected
          ? 'Selected for booking'
          : 'Book this resource'}
    </button>
  </li>
);
