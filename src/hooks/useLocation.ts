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

interface NavigationHistoryEntry {
  location: LocationState;
  timestamp: number;
}

export function useLocation() {
  const [location, setLocation] = useState<LocationState>(() => {
    const saved = localStorage.getItem('selectedLocation');
    return saved ? JSON.parse(saved) : {};
  });

  const [navigationHistory, setNavigationHistory] = useState<NavigationHistoryEntry[]>(() => {
    const saved = localStorage.getItem('navigationHistory');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('selectedLocation', JSON.stringify(location));

    // Dispatch custom event to notify other components
    window.dispatchEvent(new CustomEvent('locationChange', { detail: location }));
  }, [location]);

  useEffect(() => {
    // Listen for location changes from other components
    const handleLocationChange = (e: Event) => {
      const customEvent = e as CustomEvent<LocationState>;
      setLocation(customEvent.detail);
    };

    window.addEventListener('locationChange', handleLocationChange);

    return () => {
      window.removeEventListener('locationChange', handleLocationChange);
    };
  }, []);

  const setLocationWithHistory = (newLocation: LocationState) => {
    const entry: NavigationHistoryEntry = {
      location: newLocation,
      timestamp: Date.now()
    };

    const updatedHistory = [...navigationHistory, entry].slice(-10);
    setNavigationHistory(updatedHistory);
    localStorage.setItem('navigationHistory', JSON.stringify(updatedHistory));

    setLocation(newLocation);
  };

  const navigateBack = (): LocationState | null => {
    if (navigationHistory.length < 2) {
      return null;
    }

    const previousEntry = navigationHistory[navigationHistory.length - 2];
    const updatedHistory = navigationHistory.slice(0, -1);

    setNavigationHistory(updatedHistory);
    localStorage.setItem('navigationHistory', JSON.stringify(updatedHistory));
    setLocation(previousEntry.location);

    return previousEntry.location;
  };

  const canNavigateBack = (): boolean => {
    return navigationHistory.length >= 2;
  };

  const getPreviousLocation = (): LocationState | null => {
    if (navigationHistory.length < 2) {
      return null;
    }
    return navigationHistory[navigationHistory.length - 2].location;
  };

  const clearHistory = () => {
    setNavigationHistory([]);
    localStorage.removeItem('navigationHistory');
  };

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
    setLocation: setLocationWithHistory,
    navigateBack,
    canNavigateBack,
    getPreviousLocation,
    clearHistory,
    getLocationDisplay,
    getLocationBreadcrumb,
  };
}
