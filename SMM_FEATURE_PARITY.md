# SMM Simplified → Combined Feature Parity

Target: every production workflow from SMM Simplified remains accessible from the Combined dashboard without modifying the SMM-Simplified repository.

## Migrated / active
- Social analytics shell
- Content Performance
- Audience Analytics
- Posting Schedule
- Competitor Benchmarking
- Brand-scoped Content Calendar (basic migrated calendar)
- Workspace Hub
- Reports + PDF export
- Active Brand context
- Brand Intelligence editor
- Content Generator consuming Active Brand Intelligence
- Brand Intelligence upload + AI extraction (current slice)

## Remaining parity blocks
1. Supabase Auth + user-role foundation
2. Brand database persistence + brand-level RLS/membership
3. Quick Brief draft persistence
4. Gemini + Tavily live research
5. Five Story Angles generation
6. Full Storytelling Brief route/editor
7. Slide edit/reorder/delete
8. AI Improve
9. Human QC + invalidation after edits
10. Schedule Brief
11. Production Content Calendar parity (drag/drop, Quick Move)
12. Ready to Design / Designed state
13. External design-file link
14. Task assignment + team overview
15. Brand alignment panel/check
16. Role/access management screens
17. Analytics shell alignment with active brand

## Non-regression rules
- Do not modify SMM-Simplified.
- Do not replace working Combined social analytics modules.
- Do not weaken Supabase RLS when database/auth is migrated.
- Do not commit secrets.
- AI outputs must remain case-led, evidence-backed, and Bahasa Indonesia by default.
- Final parity requires Vercel build success and route-level smoke tests for each migrated block.
