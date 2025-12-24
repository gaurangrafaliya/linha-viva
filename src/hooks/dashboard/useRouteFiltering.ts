import { useMemo, useState, useEffect } from 'react';
import { GTFSRoute } from '@/types/gtfs';
import { DashboardLookups } from './useDashboardData';

export const compareRoutes = (a: GTFSRoute, b: GTFSRoute) => {
  const getPriority = (shortName: string) => {
    if (shortName.endsWith('M')) return 11;
    if (shortName.startsWith('Z')) return 10;
    
    const num = parseInt(shortName);
    if (isNaN(num)) return 12;

    if (num < 200) return 0;
    if (num < 300) return 1;
    if (num < 400) return 2;
    if (num < 500) return 3;
    if (num < 600) return 4;
    if (num < 700) return 5;
    if (num < 800) return 6;
    if (num < 900) return 7;
    if (num < 1000) return 8;
    
    return 9;
  };

  const priorityA = getPriority(a.shortName);
  const priorityB = getPriority(b.shortName);

  if (priorityA !== priorityB) {
    return priorityA - priorityB;
  }

  return a.shortName.localeCompare(b.shortName, undefined, { numeric: true, sensitivity: 'base' });
};

export const useRouteFiltering = (
  routes: GTFSRoute[],
  searchTerm: string,
  selectedLines: string[],
  lookups: DashboardLookups | null
) => {
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const filteredRoutes = useMemo(() => {
    let result = routes;

    if (selectedLines.length > 0) {
      result = result.filter(route => selectedLines.includes(route.shortName));
    }

    const lowerSearch = debouncedSearchTerm.toLowerCase();

    if (debouncedSearchTerm) {
      const scoredResults = result
        .map(route => {
          let score = -1;

          if (route.shortName.toLowerCase() === lowerSearch) {
            score = 1000;
          }
          else if (route.shortName.toLowerCase().startsWith(lowerSearch)) {
            score = 800;
          }
          else if (route.longName.toLowerCase().includes(lowerSearch)) {
            score = route.longName.toLowerCase().startsWith(lowerSearch) ? 600 : 400;
          }
          else if (lookups) {
            const stopNames = lookups.routeStopNamesMap.get(route.id);
            if (stopNames) {
              for (const name of stopNames) {
                if (name.includes(lowerSearch)) {
                  score = 100;
                  break;
                }
              }
            }
          }

          return { route, score };
        })
        .filter(item => item.score >= 0);

      return scoredResults
        .sort((a, b) => {
          if (b.score !== a.score) {
            return b.score - a.score;
          }
          return compareRoutes(a.route, b.route);
        })
        .map(item => item.route);
    }

    return [...result].sort(compareRoutes);
  }, [routes, debouncedSearchTerm, selectedLines, lookups]);

  return { filteredRoutes, debouncedSearchTerm };
};

