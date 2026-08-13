import { useState, useEffect, useMemo } from 'react';
import { ServiceOrder } from '../types';

let servicesCache: ServiceOrder[] | null = null;

async function loadServices(): Promise<ServiceOrder[]> {
  if (servicesCache) return servicesCache;
  
  const response = await fetch('/data/services.json');
  const data: ServiceOrder[] = await response.json();
  servicesCache = data;
  return data;
}

export function useServices() {
  const [services, setServices] = useState<ServiceOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadServices()
      .then(setServices)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return { services, loading, error };
}

export function useService(serviceId: string) {
  const { services, loading, error } = useServices();

  const service = useMemo(
    () => services.find(s => s.id === serviceId) || null,
    [services, serviceId]
  );

  return { service, loading, error };
}
