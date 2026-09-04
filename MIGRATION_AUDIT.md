# Migration Audit — Social Media Dashboard Combined

Audit date: 2026-09-04

## Current repository state

This repository currently contains a migration shell, not the full source of the team's existing social media dashboard.

### Present
- Next.js application shell
- Sidebar/navigation with:
  - Overview
  - Content Performance
  - Audience Analytics
  - Posting Schedule
  - Competitor Benchmarking
  - Content Calendar
  - Workspace Hub
  - Reports
  - Content Generator
- Overview page with static/demo metrics and charts
- Content Generator prototype
- Brand Intelligence helper module
- Basic TypeScript types
- Vercel-compatible build

### Placeholder / not yet functional
- Content Performance
- Audience Analytics
- Posting Schedule
- Competitor Benchmarking
- Content Calendar
- Workspace Hub
- Reports
- Settings
- Team / My Tasks
- Notifications
- Publishing workflow
- AI Performance Insights
- Persistent Brand Intelligence integration
- Supabase data integration
- Social platform APIs

## Important finding

The actual source implementation of the team's existing dashboard is not currently present in this GitHub repository. The repository only contains the migration shell created during this project.

Therefore, connecting the real modules cannot be completed safely by guessing their implementation.

## Target migration architecture

1. Preserve this repository as the combined product.
2. Keep SMM-Simplified untouched.
3. Bring the team's existing dashboard modules into this repository.
4. Add SMM-Simplified capabilities as additional modules:
   - Brand Intelligence
   - AI Content Generator
   - Story Angles / Case Study Research
   - Brief Studio
   - Content Calendar integration
   - AI Performance Insights
5. Unify brand selection so every module uses the active brand.
6. Unify data layer and authentication.
7. Replace demo/static values with real data only after source/API mapping is verified.

## Required source for next implementation stage

The original team dashboard source (ZIP or complete repository contents) is required to migrate its actual functionality. Once available, audit these areas before changing production code:

- app/routes/pages
- components
- API routes
- database/schema
- authentication
- social API integrations
- environment variables
- cron/background jobs
- chart/report generation
- calendar/task workflow

## Implementation order

Phase 1 — Source import and dependency reconciliation
Phase 2 — Existing dashboard modules
Phase 3 — Shared brand/workspace/data layer
Phase 4 — Brand Intelligence
Phase 5 — AI Content Generator + Story Angles
Phase 6 — Brief Studio
Phase 7 — Calendar/tasks/publishing
Phase 8 — Reports + AI Performance Insights
Phase 9 — End-to-end QA and production hardening

## Safety rule

Do not replace working dashboard-team functionality with placeholders merely to make the UI appear complete. Each module should be migrated with its actual logic/data dependencies.
