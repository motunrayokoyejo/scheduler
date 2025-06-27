# Outreach Scheduler

A scheduling system that finds optimal times for feedback conversations based on calendar availability and user preferences. Built with NestJS and TypeScript.

## Quick Start

```bash
npm install
mkdir -p data
npm run start:dev

# In another terminal
npm run seed
```

API available at <http://localhost:3000>  
API docs at <https://documenter.getpostman.com/view/12450883/2sB2xFeSiW>

## Architecture

### Strategy Pattern

Different users need different scheduling approaches. Sales teams might want aggressive scheduling to maximize touchpoints, while executives prefer conservative scheduling for quality interactions.

```typescript
interface ISchedulingStrategy {
  findOptimalMoments(context: SchedulingContext): Promise<SchedulingMoment[]>;
}
```

Both strategies inherit shared gap-finding logic but apply different selection criteria.

### Database Design

Using SQLite for development (zero setup) with TypeORM for easy PostgreSQL migration. Entities model user preferences and scheduled conversations with proper relationships.

## Design Decisions

**Strategy Pattern**  
Different scheduling needs require different algorithms. This pattern makes strategies pluggable without changing core logic. Adding a new "MorningOnly" strategy would be trivial.

**Why SQLite?**  
Eliminates setup friction while demonstrating real database patterns. Production migration to PostgreSQL requires only config changes. same entities, same queries.

**Mock Calendar Service**  
Uses user ID hashing to create consistent but varied meeting patterns.

**Why Confidence + Reasoning?**  
Users need to understand automated decisions. The system explains "Tuesday 10:30 AM, Prime conversation time, 45min buffer" vs just "Tuesday 10:30 AM".

## Testing

```bash
npm test
```
