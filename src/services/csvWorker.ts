// Web Worker for parsing CSV and heavy GTFS data processing

// Helper function for distance
const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371e3;
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

self.onmessage = (e: MessageEvent) => {
  const { type, text, data, requestId } = e.data;

  if (type === 'PARSE_CSV') {
    const lines = text.trim().split('\n');
    if (lines.length < 2) {
      self.postMessage({ type: 'PARSE_CSV_RESULT', result: [], requestId });
      return;
    }

    const headers = lines[0].split(',').map((h: string) => h.trim());
    const result = new Array(lines.length - 1);
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',');
      const obj: Record<string, string> = {};
      for (let j = 0; j < headers.length; j++) {
        obj[headers[j]] = values[j]?.trim() || '';
      }
      result[i - 1] = obj;
    }
    
    self.postMessage({ type: 'PARSE_CSV_RESULT', result, requestId });
  }

  if (type === 'PROCESS_SHAPES') {
    const lines = text.trim().split('\n');
    if (lines.length < 2) {
      self.postMessage({ type: 'PROCESS_SHAPES_RESULT', shapesByShapeId: {}, requestId });
      return;
    }

    const headers = lines[0].split(',').map((h: string) => h.trim());
    const shapesByShapeId = new Map();
    
    const latIdx = headers.indexOf('shape_pt_lat');
    const lngIdx = headers.indexOf('shape_pt_lon');
    const idIdx = headers.indexOf('shape_id');
    const seqIdx = headers.indexOf('shape_pt_sequence');

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',');
      const shapeId = values[idIdx]?.trim();
      if (!shapeId) continue;

      if (!shapesByShapeId.has(shapeId)) {
        shapesByShapeId.set(shapeId, []);
      }
      
      shapesByShapeId.get(shapeId).push({
        shapeId,
        lat: parseFloat(values[latIdx]),
        lng: parseFloat(values[lngIdx]),
        sequence: parseInt(values[seqIdx]),
      });
    }

    for (const [id, shapes] of shapesByShapeId.entries()) {
      shapes.sort((a: any, b: any) => a.sequence - b.sequence);
    }

    const result: Record<string, any> = {};
    for (const [id, shapes] of shapesByShapeId.entries()) {
      result[id] = shapes;
    }

    self.postMessage({ type: 'PROCESS_SHAPES_RESULT', shapesByShapeId: result, requestId });
  }

  if (type === 'CALCULATE_STOP_POSITIONS') {
    const { stops, shape } = data;
    const stopPositionsOnRoute: number[] = [];
    
    stops.forEach((stop: any) => {
      let closestStopPointIndex = 0;
      let minStopDistance = Infinity;
      shape.forEach((point: any, index: number) => {
        const distance = calculateDistance(stop.lat, stop.lng, point.lat, point.lng);
        if (distance < minStopDistance) {
          minStopDistance = distance;
          closestStopPointIndex = index;
        }
      });
      stopPositionsOnRoute.push(closestStopPointIndex);
    });

    self.postMessage({ type: 'CALCULATE_STOP_POSITIONS_RESULT', result: stopPositionsOnRoute, requestId });
  }
};
