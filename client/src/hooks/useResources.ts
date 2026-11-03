import { useEffect, useState } from 'react';
import { fetchResources } from '../api/campushubApi';
import type { Resource, ResourceType } from '../../../shared/api';
import { getErrorMessage } from '../utils/errorMessage.ts';

interface ResourceState {
  resources: Resource[];
  loading: boolean;
  error: string | null;
}

export const useResources = (type: ResourceType | undefined, refreshKey: number): ResourceState => {
  const [state, setState] = useState<ResourceState>({ resources: [], loading: true, error: null });

  useEffect((): (() => void) => {
    const controller = new AbortController();
    const load = async (): Promise<void> => {
      setState({ resources: [], loading: true, error: null });
      try {
        const resources = await fetchResources(type, controller.signal);
        if (!controller.signal.aborted) setState({ resources, loading: false, error: null });
      } catch (error: unknown) {
        if (!controller.signal.aborted) {
          setState({
            resources: [],
            loading: false,
            error: getErrorMessage(error, 'Unable to load campus resources.'),
          });
        }
      }
    };
    void load();
    return (): void => controller.abort();
  }, [type, refreshKey]);

  return state;
};
