# SMM Simplified → Combined Feature Parity

## Implemented in Slice 05 branch
- Active Brand shared context + persistent selection
- Brand Intelligence editor per active brand
- Brand Intelligence upload + Gemini extraction
- Human review after extraction
- Quick Brief / Brief Studio with autosave
- Topic Lock: user topic outranks brand expertise
- Gemini + Tavily live research
- Case relevance validation (topic relevance + campaign alignment >= 7/10)
- 5 case-led Story Angles
- Campaign History per active brand
- Full Storytelling Brief generation
- AI Quality Review + automatic revision when initial quality is weak
- Human editable story sections
- Reorder / drag-drop / delete sections
- AI Improve + re-score
- Human QC with invalidation after edits
- Scheduling
- Production Content Calendar
- Quick Move / drag-drop schedule
- Ready to Design / Designed workflow
- External Canva / Drive design-file link
- Team Tasks workspace
- Users & Access UI foundation
- Role / permission catalog (super_admin, manager, content_writer, designer, viewer)
- Brand Alignment QC
- Supabase Auth client/server foundation + login route
- Supabase persistence bridge for Campaigns and Briefs
- Brand-scoped RLS / membership foundation
- Browser storage retained as graceful fallback during rollout

## Still requires validation / activation
1. Apply `supabase/migrations/20260906_smm_persistence_foundation.sql` to the target Supabase project.
2. Confirm Vercel has NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, GEMINI_API_KEY, TAVILY_API_KEY and optional GEMINI_MODEL.
3. Smoke-test authenticated cross-device Campaign/Brief hydration.
4. Move Team Tasks from local fallback to Supabase task_assignments in the UI.
5. Activate permission enforcement only after owner/admin bootstrap and brand memberships are verified.
6. Run full Vercel build/type validation and fix blockers before merge.
7. Final parity audit against SMM branches: brand-overview, content expansion, calendar expansion, task assignment, users/access.

## Integrity rules
- SMM-Simplified repository remains read-only.
- Do not fake live Instagram/Meta API connectivity.
- Gemini/Tavily secrets stay server-side.
- Brand Intelligence is a guardrail; it must not override the user Topic Lock.
- Keep existing Social Analytics functionality intact while adding SMM workflows.
