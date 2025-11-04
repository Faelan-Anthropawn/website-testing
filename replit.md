# Faelan's Minecraft Converter

## Overview
This is a client-side static website for converting Minecraft structures between different formats. All processing happens in the browser - no files are uploaded to a server.

## Features
- **Schematic Converter**: Convert .schem, .schematic, and .litematic files to Build Packs, McStructure, or Command Dumps
- **World Converter**: Extract regions from Minecraft Java world files (.zip) and convert them to various formats

## Project Structure
- `index.html` - Main landing page with links to both converters
- `schematic.html` - Schematic file converter interface
- `world.html` - World file converter interface
- `app.js` - JavaScript for schematic converter (ES6 module)
- `world-converter.js` - JavaScript for world converter (ES6 module)
- `server.js` - Node.js static file server for local development
- `js/` - Utility modules for file processing, transformations, and conversions
  - `schematic-reader.js` - Reads schematic files
  - `world-reader.js` - Reads Minecraft world files
  - `translation.js` - Block translation data
  - `rotation.js` - Rotation transformations
  - `mirroring.js` - Mirroring transformations
  - `hollowing.js` - Hollow build feature
  - `structure-void.js` - Gravity block support
  - `command-writer.js` - Generate Minecraft commands
  - `structure-converter.js` - Convert to McStructure format
  - `pack.js` - Build pack generation
  - `block-stream.js` - Streaming block processing
  - `output-sinks.js` - Output format handlers
  - `mca-reader.js` - Minecraft region file reader

## Technologies
- **Frontend**: HTML, CSS (Tailwind via CDN), JavaScript (ES6 Modules)
- **Backend**: Node.js HTTP server for development
- **Libraries**: 
  - JSZip for zip file handling
  - Pako for gzip compression/decompression

## Running Locally
The project uses a simple Node.js HTTP server configured to run on port 5000:
```bash
node server.js
```

## Recent Changes
- **2025-11-03**: Initial setup and major optimization
  - Fixed world.html file upload button issue by using inline HTML file input instead of dynamic creation
  - Added proper IDs to form elements for JavaScript interaction
  - **Major performance improvement**: Refactored world converter to extract regions as schematics, then use the existing heavily optimized schematic processing pipeline
    - Eliminated complex streaming approach that caused timeouts
    - Now reuses all schematic converter code (rotation, mirroring, hollowing, output generation)
    - Single extraction pass followed by in-memory transformations
    - Reduced recommended size warning from 5M to 1M blocks for better UX
  - Configured deployment for autoscale hosting
  - Added .gitignore for Node.js projects

## Configuration
- Server binds to `0.0.0.0:5000` for Replit compatibility
- Cache control headers set to prevent browser caching issues
- CORS enabled for local development
- File input accepts: .schem, .schematic, .litematic, .zip, .mca files

## Deployment
The project is configured for autoscale deployment on Replit, suitable for static websites with client-side processing.
