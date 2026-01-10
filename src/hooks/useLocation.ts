import { useState, useEffect } from 'react';
import { UserRole } from '../lib/supabase';

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

function getLocationKey(userId?: string, role?: UserRole): string {
  if (userId) {
    return `selectedLocation_${userId}`;
  }
  return role ? `selectedLocation_${role}` : 'selectedLocation';
}

function getHistoryKey(userId?: string, role?: UserRole): string {
  if (userId) {
    return `navigationHistory_${userId}`;
  }
  return role ? `navigationHistory_${role}` : 'navigationHistory';
}

export function useLocation(role?: UserRole, userId?: string) {
  const locationKey = getLocationKey(userId, role);
  const historyKey = getHistoryKey(userId, role);

  const [location, setLocation] = useState<LocationState>(() => {
    const saved = localStorage.getItem(locationKey);
    return saved ? JSON.parse(saved) : {};
  });

  const [navigationHistory, setNavigationHistory] = useState<NavigationHistoryEntry[]>(() => {
    const saved = localStorage.getItem(historyKey);
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem(locationKey, JSON.stringify(location));

    // Dispatch custom event to notify other components
    window.dispatchEvent(new CustomEvent('locationChange', { detail: location }));
  }, [location, locationKey]);

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
    localStorage.setItem(historyKey, JSON.stringify(updatedHistory));

    setLocation(newLocation);
  };

  const navigateBack = (): LocationState | null => {
    if (navigationHistory.length < 2) {
      return null;
    }

    const previousEntry = navigationHistory[navigationHistory.length - 2];
    const updatedHistory = navigationHistory.slice(0, -1);

    setNavigationHistory(updatedHistory);
    localStorage.setItem(historyKey, JSON.stringify(updatedHistory));
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
    localStorage.removeItem(historyKey);
  };

  const resetLocation = () => {
    setLocation({});
    setNavigationHistory([]);
    localStorage.removeItem(locationKey);
    localStorage.removeItem(historyKey);
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
    resetLocation,
    getLocationDisplay,
    getLocationBreadcrumb,
  };
}
