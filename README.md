# Linha Viva Porto

**Linha Viva Porto** is a web app that visualizes the **live positions of STCP buses in Porto** on an interactive map.  

It provides a **smooth, GPU-accelerated, real-time view of buses in motion** with route details, stop information, and bus tracking capabilities.

---

## ✨ Features

### Map & Visualization
- **Live bus positions** - Real-time visualization of all STCP buses on an interactive map
- **Smooth animations** - GPU-accelerated animations for hundreds of buses using WebGL
- **Multiple map styles** - Switch between different map styles (Voyager, Positron, Dark Matter)
- **Interactive bus selection** - Click any bus to view detailed information
- **Visual focus** - Selected buses remain at full opacity while others fade out
- **Route visualization** - View route paths and stops when selecting a route or bus

### Route Management
- **Route dashboard** - Browse all available routes with filtering and search
- **Route filtering** - Filter buses by specific route lines
- **Route details** - View complete route information including:
  - Route path visualization
  - All stops along the route
  - Active buses on the route
  - Direction switching (Outbound/Inbound)
  - Stop timeline with progression tracking

### Bus Tracking
- **Bus selection** - Select individual buses to track their position
- **Active buses list** - See all active buses for a selected route and direction
- **Direction detection** - Automatically detect bus direction based on position
- **Route progression** - Track which stops a bus has passed and which are next

### User Interface
- **Search functionality** - Search routes by name or number
- **Network statistics** - View total routes and active buses count
- **Collapsible dashboard** - Expandable sidebar for route management
- **Responsive design** - Optimized for various screen sizes

---

## 🧠 Data Sources

### Static Data (GTFS)
Preprocessed GTFS data stored in the repository:
- Routes and route metadata
- Stops and stop locations
- Trips and trip schedules
- Route shapes and paths
- Calendar and service dates

**Location:** `public/data/stcp/`

### Live Data (API)
**Urban Platform – Bus Location (STCP)**  
[OpenData Porto](https://opendata.porto.digital/dataset/urban-platform-bus-location)

- Real-time bus positions (latitude, longitude, bearing)
- Bus line information
- Periodic updates (~10–15s intervals)

---

## 🗺️ Tech Stack

### Runtime & Tooling
- **[Bun](https://bun.sh/)** - Fast JavaScript runtime, package manager, and bundler
- **Vite** - Build tool and dev server (bundled with Bun)

### Frontend Framework
- **React 18** - UI library
- **TypeScript** - Type-safe development
- **TailwindCSS** - Utility-first CSS framework

### Mapping & Visualization
- **MapLibre GL JS** - Open-source map rendering library
- **WebGL** - GPU-accelerated rendering
- **GeoJSON** - Geographic data format

### State Management
- **React Context API** - Global state management
- Custom hooks for data fetching and map interactions

### Data Processing
- **GTFS parsing** - Client-side GTFS data processing
- **CSV Workers** - Web Workers for parsing large GTFS files
- **Geospatial calculations** - Distance and direction calculations

---

## 🏗️ Architecture

```
Browser (Client-Side)
├── Static GTFS Data (public/data/stcp/)
│   ├── routes.txt
│   ├── stops.txt
│   ├── trips.txt
│   ├── shapes.txt
│   └── ...
├── Periodic API Fetch → STCP Live Bus Positions
├── React Components
│   ├── MapContainer (MapLibre GL)
│   ├── RouteDashboard (Route list & filtering)
│   ├── RouteDetail (Route information & stops)
│   └── NetworkStats (Live statistics)
├── Context Providers
│   ├── AppContext (Global state)
│   └── RouteDetailContext (Route-specific state)
├── Custom Hooks
│   ├── useBusPositions (Live bus data)
│   ├── useBusLayer (Map bus rendering)
│   ├── useRouteLayer (Route path rendering)
│   └── useRouteDetailData (Route information)
└── Services
    ├── busService (API integration)
    └── gtfsService (GTFS data parsing)
```

**All logic runs client-side** - No backend, no database, no authentication.

---

## 🚀 Getting Started

### Prerequisites
- **[Bun](https://bun.sh/)** (latest version)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd linha-viva
   ```

2. **Install dependencies**
   ```bash
   bun install
   ```

3. **Run development server**
   ```bash
   bun dev
   ```

4. **Open in browser**
   Navigate to the URL shown in your terminal (typically `http://localhost:5173`)

### Building for Production

```bash
bun run build
```

The production build will be in the `dist/` directory.

---

## 🎞️ Animation Strategy

Bus movement is animated smoothly using:

1. **Periodic API fetching** - Fetch live positions at fixed intervals (~10-15s)
2. **Position interpolation** - Store previous and next coordinates per vehicle
3. **RequestAnimationFrame** - Interpolate positions between API updates
4. **GeoJSON updates** - Update map source on each animation frame
5. **GPU acceleration** - WebGL rendering handles hundreds of moving vehicles efficiently

This approach:
- ✅ Avoids marker "teleporting"
- ✅ Provides smooth, continuous movement
- ✅ Scales well to hundreds of buses
- ✅ Maintains 60fps performance

---

## 📁 Project Structure

```
src/
├── components/
│   ├── dashboard/          # Dashboard UI components
│   │   ├── RouteDashboard.tsx
│   │   ├── RouteDetail/    # Route detail components
│   │   ├── FloatingSearch.tsx
│   │   └── NetworkStats.tsx
│   └── map/                # Map-related components
│       ├── MapContainer.tsx
│       └── MapZoomControls.tsx
├── context/                # React Context providers
│   ├── AppContext.tsx
│   └── RouteDetailContext.tsx
├── hooks/                  # Custom React hooks
│   ├── dashboard/          # Dashboard-related hooks
│   ├── map/               # Map-related hooks
│   └── useBusPositions.ts
├── services/              # Data services
│   ├── busService.ts      # STCP API integration
│   ├── gtfsService.ts     # GTFS data parsing
│   └── csvWorker.ts       # CSV parsing worker
├── types/                 # TypeScript type definitions
├── constants/             # App constants
└── lib/                   # Utility functions
```

---

## ⚠️ Notes & Limitations

- **API dependency** - App depends on the public STCP API; avoid aggressive polling
- **Data quality** - GPS accuracy and update frequency depend on STCP's data quality
- **Browser compatibility** - Requires modern browser with WebGL support
- **GTFS data** - Static GTFS files are included in the repo for offline reference
- **No delay calculations** - Real-time delay/lateness calculations are not currently implemented

---

## 🔮 Future Enhancements

Potential features for future development:
- Real-time delay and lateness calculations
- Backend caching layer for improved performance
- Historical data analysis
- User preferences and saved routes
- Mobile app version
- Offline mode with cached data

---

## 📜 License

This project is open-source and uses public open data.  
Check the original datasets for their respective licenses.

---

## 🙌 Acknowledgements

- **STCP** – Sociedade de Transportes Colectivos do Porto
- **Porto Digital** – Open Data Portal
- **MapLibre** – Open-source mapping library
- **OpenStreetMap** – Map data provider
