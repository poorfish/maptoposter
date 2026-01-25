![Banner](public/banner.jpg)

English | [简体中文](README_CN.md)

# Mapster

A premium React web application designed to create beautiful, minimalist map posters for any location on Earth. Mapster combines powerful map data visualization with a sophisticated, glassmorphism-inspired UI to deliver a studio-quality design experience.

**Live Demo:** [mymapster.vercel.app](https://mymapster.vercel.app/)

## Key Features

- **Interactive Global Mapping** - Precise location selection with integrated panning, zooming, and city search.
- **High-Fidelity Exports** - Download your creations as production-ready high-resolution PNGs or scalable SVGs.
- **Flexible Personalization** - Choose from 20+ professionally curated themes, 5+ premium font families, and multiple aspect ratios (Portrait, Landscape).
- **Mobile-First Optimization** - Deeply refined for mobile browsers, featuring adaptive "Bottom Sheet" menus and robust viewport handling.
- **Aesthetic 3D Reflections** - Experience your poster on a virtual gallery floor with realistic trapezoidal reflections and synced metadata.
- **Glassmorphism Design System** - A sleek, modern interface featuring adaptive blur effects and smooth micro-animations.
- **Progressive Composition** - Informative loading states that guide you through the asynchronous poster generation process.

## Screenshots

![Mapster Application](screenshots/app-screenshot.png)

## Quick Start

### Deploy with Vercel
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fpoorfish%2Fmapster)

### Local Setup
```bash
# Clone and install dependencies
git clone https://github.com/poorfish/mapster.git
cd mapster
npm install

# Launch the development studio
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Customization Options

| Category | Available Selections |
|----------|-------|
| **Themes** | Noir, Midnight Gold, Cyberpunk, Forest, Ocean, Blueprint, and more (20+ total) |
| **Typography** | Inter, Playfair Display, Montserrat, Courier Prime, Outfit, Nunito |
| **Layouts** | Portrait, Landscape |
| **Ratios** | 2:3, 3:4, 4:5, 1:1, 16:9 |

## Tech Stack

- **React 18** (Powered by **Vite** for lightning-fast HMR)
- **Leaflet** for high-performance map interaction
- **OSM Overpass API** for real-time geographic data fetching
- **SVG Engine** for resolution-independent rendering

## Acknowledgments

Mapster is inspired by and built upon the core concepts of [originalankur/maptoposter](https://github.com/originalankur/maptoposter). We have significantly elevated the experience with:

- **Premium Visual Language** - A complete redesign focused on depth, light, and modern aesthetics.
- **Robust Cross-Platform Support** - Native-feeling interactions on mobile Safari with fixed viewport logic.
- **Asynchronous Architecture** - Improved data fetching and error handling for a reliable user experience.

We are grateful to the open-source community and the original creators for providing the foundation for this creative tool.

## License

MIT
