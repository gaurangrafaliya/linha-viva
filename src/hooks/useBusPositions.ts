import { useState, useEffect, useRef } from 'react';
import { busService } from '@/services/busService';
import { BusPosition } from '@/types/bus';

const REFRESH_INTERVAL = 15000;

export const useBusPositions = () => {
  const [positions, setPositions] = useState<BusPosition[]>([]);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchPositions = async () => {
    const data = await busService.fetchLivePositions();
    if (data.length > 0) {
      setPositions(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPositions();
    intervalRef.current = setInterval(fetchPositions, REFRESH_INTERVAL);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return { positions, loading };
};

