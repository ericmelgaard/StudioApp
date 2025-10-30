import { useState, useEffect } from 'react';

interface Concept {
  id: number;
  name: string;
}

interface Company {
  id: number;
  name: string;
  concept_id: number;
}

interface LocationGroup {
  id: number;
  name: string;
  company_id: number;
}

interface Store {
  id: number;
  name: string;
  location_group_id: number;
}

export interface LocationState {
  concept?: Concept;
  company?: Company;
  group?: LocationGroup;
  store?: Store;
}

export function useLocation() {
  const [location, setLocation] = useState<LocationState>(() => {
    const saved = localStorage.getItem('selectedLocation');
    return saved ? JSON.parse(saved) : {};
  });

  useEffect(() => {
    localStorage.setItem('selectedLocation', JSON.stringify(location));
  }, [location]);

  const getLocationDisplay = (): string => {
    if (location.store) {
      return location.store.name;
    }
    if (location.group) {
      return location.group.name;
    }
    if (location.company) {
      return location.company.name;
    }
    if (location.concept) {
      return location.concept.name;
    }
    return 'Select Location';
  };

  const getLocationBreadcrumb = (): string => {
    const parts: string[] = [];
    if (location.concept) parts.push(location.concept.name);
    if (location.company) parts.push(location.company.name);
    if (location.group) parts.push(location.group.name);
    if (location.store) parts.push(location.store.name);
    return parts.join(' > ') || 'No location selected';
  };

  return {
    location,
    setLocation,
    getLocationDisplay,
    getLocationBreadcrumb,
  };
}
