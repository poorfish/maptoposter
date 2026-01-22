# Mapster

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fpoorfish%2Fmaptoposter)

A React web application for creating beautiful, minimalist map posters for any location in the world. Search for a city, customize the theme and layout, then download your poster as SVG or PNG.

## Features

- **Interactive Map** - Pan and zoom to select any location worldwide
- **Location Search** - Find cities using OpenStreetMap Nominatim
- **20 Themes** - From classic Noir to Neon Cyberpunk, Midnight Gold to Nordic Light
- **Custom Typography** - Choose from 5 font families
- **Flexible Layouts** - Portrait/landscape orientation, multiple aspect ratios (2:3, 3:4, 4:5, 1:1)
- **Export Options** - Download as high-resolution PNG or scalable SVG

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Usage

1. **Search** for a city or pan the map to your desired location
2. **Adjust** the poster radius using the slider
3. **Click "Refresh Preview"** to generate the map poster
4. **Customize** theme, font, and layout in the settings panel
5. **Download** as PNG or SVG

## Available Themes

| Theme | Style |
|-------|-------|
| Feature-Based | Classic black & white hierarchy |
| Noir | Pure black background, white roads |
| Midnight Blue | Navy with gold accents |
| Midnight Gold | Black with brushed gold |
| Neon Cyberpunk | Electric pink and cyan |
| Blueprint | Architectural aesthetic |
| Warm Beige | Vintage sepia tones |
| Pastel Dream | Soft muted pastels |
| Japanese Ink | Minimalist ink wash |
| Forest | Deep greens and sage |
| Ocean | Blues and teals |
| Terracotta | Mediterranean warmth |
| Sunset | Warm oranges and pinks |
| Autumn | Burnt oranges and reds |
| Copper Patina | Oxidized copper aesthetic |
| Monochrome Blue | Single blue color family |
| Gradient Roads | Smooth gradient shading |
| Contrast Zones | High contrast urban density |
| Emerald City | Dark green with silver highlights |
| Nordic Light | Scandinavian minimalism |

## Tech Stack

- **React 18** with Vite
- **Leaflet** for interactive maps
- **OpenStreetMap** Overpass API for map data
- **Pure SVG** rendering for crisp exports

## Development

```bash
npm run dev      # Start dev server
npm run build    # Build for production
npm run preview  # Preview production build
```

## Acknowledgments

This project is built upon the excellent work of [originalankur/maptoposter](https://github.com/originalankur/maptoposter). We've extended the original concept with:

- **Rebranded UI** - Renamed to Mapster with custom branding and icon
- **Enhanced UX** - Improved menu interactions and button states
- **Dark Theme Integration** - Consistent dark color scheme across all UI elements
- **Better Layout** - Optimized split-pane design for desktop use

We're grateful to the original creators for open-sourcing this fantastic tool and making it possible for others to build upon their work.

## License

MIT
