import { useState } from 'react';
import type { ReactElement } from 'react';
import type { Resource, ResourceType } from '../api/types';
import { ResourceCard } from './ResourceCard';
import styles from './ResourceList.module.css';
import shared from './Reservation.module.css';

interface ResourceListProps {
  resources: Resource[];
  loading: boolean;
  error: string | null;
  selectedResourceId: string | null;
  onRefresh: () => void;
  onSelectResource: (resource: Resource) => void;
}

interface ResourceFilter {
  label: string;
  type: ResourceType | undefined;
}

const filters: ResourceFilter[] = [
  { label: 'All resources', type: undefined },
  { label: 'Study rooms', type: 'ROOM' },
  { label: 'Equipment', type: 'EQUIPMENT' },
  { label: 'Labs', type: 'LAB' },
];

export const ResourceList = ({
  resources,
  loading,
  error,
  selectedResourceId,
  onRefresh,
  onSelectResource,
}: ResourceListProps): ReactElement => {
  const [type, setType] = useState<ResourceType>();
  const visibleResources = resources.filter(
    (resource: Resource): boolean => !type || resource.type === type,
  );
  return (
    <section aria-labelledby="resources-title">
      <div className={shared.heading}>
        <h2 id="resources-title">Explore resources</h2>
        <button type="button" disabled={loading} onClick={onRefresh}>
          Refresh resources
        </button>
      </div>
      <div className={styles.filters} role="group" aria-label="Filter resources by type">
        {filters.map((filter: ResourceFilter): ReactElement => (
          <button
            key={filter.label}
            type="button"
            aria-pressed={type === filter.type}
            onClick={(): void => setType(filter.type)}
          >
            {filter.label}
          </button>
        ))}
      </div>
      <div aria-busy={loading}>
        {loading && (
          <p className={shared.message} role="status">
            Loading campus resources…
          </p>
        )}
        {error && (
          <p className={shared.error} role="alert">
            {error} Use Refresh resources to try again.
          </p>
        )}
        {!loading && !error && visibleResources.length === 0 && (
          <p className={shared.message} role="status">
            No resources found for this category.
          </p>
        )}
        {!loading && !error && visibleResources.length > 0 && (
          <ul className={styles.resources}>
            {visibleResources.map((resource: Resource): ReactElement => (
              <ResourceCard
                key={resource.id}
                resource={resource}
                selected={selectedResourceId === resource.id}
                onSelect={onSelectResource}
              />
            ))}
          </ul>
        )}
      </div>
      <p className={shared.hint}>
        Availability reflects the resource listing. A reservation time slot is checked when you
        book.
      </p>
    </section>
  );
};
