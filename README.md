# Linha Viva Porto

**Linha Viva Porto** is a minimal web app that visualizes the **live positions of STCP buses in Porto** on an animated map.  

It provides a **smooth, GPU-accelerated, real-time view of buses in motion**, designed for locals who want to see their city’s transit come alive.

---

## ✨ Features

- Live visualization of STCP bus positions
- Smooth, GPU-accelerated animations for hundreds of buses
- Periodic updates from the public STCP bus location API
- Lightweight, frontend-only architecture
- Ready for future enhancements (GTFS integration, delays, backend caching)

---

## 🧠 Data Sources

- **Static data (stored in repo)**  
  Preprocessed GTFS JSON file containing stops, routes, trips, and scheduled times.  
  This file is committed to the repository for offline reference.

- **Live bus positions (fetched from API)**  
  Urban Platform – Bus Location (STCP)  
  [OpenData Porto](https://opendata.porto.digital/dataset/urban-platform-bus-location)  
  The app fetches this periodically (~10–15s) to display real-time positions.

---

## 🗺️ Tech Stack

- **Runtime / Tooling**
  - [Bun](https://bun.sh/) for fast builds, dev server, and package management

- **Frontend**
  - React + TypeScript
  - Vite (bundled with Bun)
  - Mapbox GL JS or MapLibre GL JS for animated maps

- **Data fetching**
  - Native `fetch` API
  - Periodic polling of live bus positions

- **Rendering & animation**
  - GeoJSON sources for buses
  - `requestAnimationFrame` interpolation for smooth movement

No backend, no database, no auth — intentionally minimal.

---

## 🏗️ Architecture

Browser
├── Static GTFS JSON (committed in repo)
├── Periodic fetch → STCP Live API
├── Interpolated bus positions
└── Map rendering (WebGL via Mapbox GL / MapLibre)

yaml
Copiar código

All logic runs client-side.

---

## 🚀 Getting Started

### Prerequisites
- [Bun](https://bun.sh/) (latest)

### Install dependencies
```bash
bun install
Run locally
bash
Copiar código
bun dev
Then open the URL shown in your terminal.
```

## 🎞️ Animation Strategy

Bus movement is animated by:

- Fetching live positions at fixed intervals
- Storing previous and next coordinates per vehicle
- Interpolating positions using requestAnimationFrame
- Updating a GeoJSON source on each animation frame
- This avoids marker “teleporting” and scales well to hundreds of moving vehicles.

## ⚠️ Notes & Limitations

Depends on the public STCP API; avoid aggressive polling

- Data quality (GPS accuracy, update frequency) depends on STCP
- Delay / lateness calculations are out of scope for now
- Static GTFS file is included in the repo for reference and offline use


## 📜 License

This project is open-source and uses public open data.
Check the original datasets for their respective licenses.

## 🙌 Acknowledgements

- STCP – Sociedade de Transportes Colectivos do Porto
- Porto Digital Open Data Portal