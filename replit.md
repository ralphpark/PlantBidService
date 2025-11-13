# PlantBid - Plant Trading Platform

## Overview

PlantBid is a comprehensive plant trading platform that connects plant enthusiasts with local vendors. The application features an AI-powered plant recommendation system, real-time bidding functionality, integrated payment processing through PortOne, and location-based vendor discovery using Google Maps API.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript
- **Styling**: Tailwind CSS with Radix UI components
- **State Management**: React Query for server state management
- **Build Tool**: Vite for fast development and optimized builds
- **UI Components**: Comprehensive component library using Radix UI primitives

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Passport.js with local strategy and session-based auth
- **Session Storage**: PostgreSQL-backed session store

### Database Design
- **ORM**: Drizzle with PostgreSQL adapter
- **Schema Management**: Type-safe schema definitions with automated migrations
- **Key Tables**: users, plants, vendors, bids, conversations, orders, payments, notifications, password_reset_tokens

## Key Components

### AI Integration
- **Provider**: Google Gemini AI for plant recommendations
- **Functionality**: Conversational plant recommendation system with 5-step questionnaire
- **Features**: Plant identification, care advice, and personalized suggestions

### Payment Processing
- **Primary**: PortOne V2 API integration
- **PG Provider**: KG Inicis for Korean market
- **Features**: Payment processing, cancellation, webhook handling
- **Security**: Payment ID format conversion and validation

### Authentication System
- **Strategy**: Passport.js local authentication
- **Password Security**: scrypt-based password hashing
- **Session Management**: PostgreSQL session store with express-session
- **Role-based Access**: User, vendor, and admin roles
- **Password Reset**: Token-based password reset without email integration (tokens generated and displayed directly to users)

### Map Integration
- **Provider**: Google Maps API
- **Features**: Address search, geocoding, vendor location discovery
- **Functionality**: Store location management and nearby vendor search

### Business Verification
- **API**: Korean National Tax Service API
- **Purpose**: Vendor business registration number verification
- **Security**: Encrypted API key handling

## Data Flow

### User Registration Flow
1. User provides registration details
2. Business number verification (for vendors)
3. Password hashing and storage
4. Automatic vendor profile creation for vendor users

### Plant Recommendation Flow
1. User initiates AI chat session
2. AI conducts 5-step questionnaire (purpose, lighting, space, difficulty, preferences)
3. Plant recommendations generated based on responses
4. Vendor bidding process initiated for selected plants

### Payment Flow
1. Order creation with unique order ID
2. PortOne payment initialization
3. Payment processing through KG Inicis
4. Webhook confirmation handling
5. Order status updates and notifications

### Bidding System
1. AI generates plant recommendations
2. Vendors submit bids with pricing and availability
3. Users compare and select preferred vendors
4. Order creation and payment processing

## External Dependencies

### Core APIs
- **Google Gemini AI**: Plant recommendation engine
- **PortOne V2**: Payment processing and management
- **Google Maps API**: Location services and mapping
- **Korean Tax API**: Business verification services

### Development Tools
- **Drizzle Kit**: Database schema management
- **Multer**: File upload handling
- **XLSX**: Excel file processing for plant data
- **Passport.js**: Authentication middleware

### UI Libraries
- **Radix UI**: Accessible component primitives
- **Tailwind CSS**: Utility-first styling framework
- **React Query**: Server state management

## Deployment Strategy

### Environment Configuration
- **Development**: Local PostgreSQL with Vite dev server
- **Production**: Replit deployment with environment variables
- **Database**: Managed PostgreSQL instance

### Build Process
1. Frontend build using Vite
2. Backend compilation with esbuild
3. Static asset optimization
4. Database migration execution

### Environment Variables
- Payment gateway credentials (PortOne, Inicis)
- API keys (Google Maps, Gemini AI, Tax API)
- Database connection strings
- Session secrets and security keys

## Changelog

- June 27, 2025. Initial setup

## User Preferences

Preferred communication style: Simple, everyday language.