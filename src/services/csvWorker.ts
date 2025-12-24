
import { WorkerMessageType, WorkerResultType } from "../enums/worker";
import { calculateDistance } from "../lib/geoUtils";
import { GTFSShape, GTFSStop } from "../types/gtfs";

const handleParseCsv = (text: string, requestId: number) => {
  const lines = text.trim().split('\n');
  if (lines.length < 2) {
    self.postMessage({ type: WorkerResultType.PARSE_CSV_RESULT, result: [], requestId });
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
  
  self.postMessage({ type: WorkerResultType.PARSE_CSV_RESULT, result, requestId });
};

const handleProcessShapes = (text: string, requestId: number) => {
  const lines = text.trim().split('\n');
  if (lines.length < 2) {
    self.postMessage({ type: WorkerResultType.PROCESS_SHAPES_RESULT, shapesByShapeId: {}, requestId });
    return;
  }

  const headers = lines[0].split(',').map((h: string) => h.trim());
  const shapesByShapeId = new Map<string, GTFSShape[]>();
  
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
    
    shapesByShapeId.get(shapeId)!.push({
      shapeId,
      lat: parseFloat(values[latIdx]),
      lng: parseFloat(values[lngIdx]),
      sequence: parseInt(values[seqIdx]),
    });
  }

  for (const shapes of shapesByShapeId.values()) {
    shapes.sort((a, b) => a.sequence - b.sequence);
  }

  const result: Record<string, GTFSShape[]> = {};
  for (const [id, shapes] of shapesByShapeId.entries()) {
    result[id] = shapes;
  }

  self.postMessage({ type: WorkerResultType.PROCESS_SHAPES_RESULT, shapesByShapeId: result, requestId });
};

const handleCalculateStopPositions = (data: { stops: GTFSStop[], shape: { lat: number, lng: number }[] }, requestId: number) => {
  const { stops, shape } = data;
  const stopPositionsOnRoute: number[] = [];
  
  stops.forEach((stop) => {
    let closestStopPointIndex = 0;
    let minStopDistance = Infinity;
    shape.forEach((point, index) => {
      const distance = calculateDistance(stop.lat, stop.lng, point.lat, point.lng);
      if (distance < minStopDistance) {
        minStopDistance = distance;
        closestStopPointIndex = index;
      }
    });
    stopPositionsOnRoute.push(closestStopPointIndex);
  });

  self.postMessage({ type: WorkerResultType.CALCULATE_STOP_POSITIONS_RESULT, result: stopPositionsOnRoute, requestId });
};

self.onmessage = (e: MessageEvent) => {
  const { type, text, data, requestId } = e.data;

  switch (type) {
    case WorkerMessageType.PARSE_CSV:
      handleParseCsv(text, requestId);
      break;
    case WorkerMessageType.PROCESS_SHAPES:
      handleProcessShapes(text, requestId);
      break;
    case WorkerMessageType.CALCULATE_STOP_POSITIONS:
      handleCalculateStopPositions(data, requestId);
      break;
    default:
      console.warn(`Unknown message type: ${type}`);
  }
};
