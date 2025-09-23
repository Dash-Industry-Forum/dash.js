# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is dash.js, a JavaScript implementation for MPEG DASH media playback in browsers using Media Source Extensions (MSE) and Encrypted Media Extensions (EME). The codebase is based on the Dash Industry Forum reference implementation with custom extensions for alternative media presentations.

## Common Development Commands

### Build Commands
- `npm run build` - Full build (modern + legacy)
- `npm run build-modern` - Build modern version only
- `npm run build-legacy` - Build legacy version only
- `npm run dev` - Development build with TypeScript compilation and webpack watch mode
- `npm start` - Start webpack dev server

### Testing
- `npm test` - Run unit tests (Karma)
- `npm run test-functional` - Run functional tests
- `npm run lint` - Run ESLint on source files
- `npm run prebuild` - Clean dist, compile TypeScript, run tests and lint

### Documentation
- `npm run doc` - Generate JSDoc documentation

## Architecture Overview

### Core Structure
The codebase follows a modular architecture with clear separation of concerns:

- **`src/core/`** - Foundation classes (EventBus, FactoryMaker, Logger, Utils)
- **`src/dash/`** - DASH-specific implementations (parsers, controllers, value objects)
- **`src/streaming/`** - Media streaming logic (MediaPlayer, controllers, models)
- **`src/mss/`** - Microsoft Smooth Streaming support
- **`src/offline/`** - Offline playback capabilities

### Key Components

#### MediaPlayer (`src/streaming/MediaPlayer.js`)
The main facade providing the public API. Coordinates all other components and manages the overall player lifecycle.

#### MediaManager (`src/streaming/MediaManager.js`)
Handles alternative media presentations and switching between main and alternative content. Manages video element lifecycle and prebuffering.

#### Controllers
- **PlaybackController** - Controls playback state and seeking
- **AbrController** - Adaptive bitrate logic
- **StreamController** - Stream management and switching
- **BufferController** - Buffer management per stream type
- **AlternativeMediaController** - Alternative content switching logic

#### Models
- **VideoModel** - Video element abstraction
- **ManifestModel** - Manifest data management
- **MediaPlayerModel** - Player configuration and settings

### Factory Pattern
The codebase extensively uses the FactoryMaker pattern for dependency injection and singleton management. Most components are registered as factories using `FactoryMaker.getSingletonFactory()`.

### Event System
Built around a centralized EventBus system with strongly-typed events defined in `Events.js`. Components communicate through events rather than direct coupling.

### Alternative Media Presentations
This fork includes custom functionality for switching between main and alternative content streams:
- MediaManager handles video element switching
- AlternativeMediaController manages the switching logic
- Supports prebuffering of alternative content for seamless transitions

## Development Notes

### TypeScript
The project uses TypeScript for development with type definitions in `index.d.ts`. Run `tsc` to compile before building.

### Testing Framework
- **Unit Tests**: Karma + Mocha + Chai + Sinon
- **Functional Tests**: Karma with browser automation
- Tests are located in `test/unit/` and `test/functional/`

### Build System
Uses Webpack with separate configurations for modern and legacy builds in `build/webpack/`.

### Code Style
- ESLint configuration enforces coding standards
- JSDoc comments for API documentation
- Factory pattern for component instantiation