# SMM Simplified → Combined Full Parity Matrix

Source of truth: `dickymaul7/SMM-Simplified` branch `feature/content-expansion-v1`.
Target: `dickymaul7/Social-Media-Dashboard-Combined-` branch `feature/smm-simplified-full-parity`.

Goal: preserve all existing Combined capabilities while bringing the completed SMM Simplified workflow and AI/editorial skills into Combined.

| Capability | Combined parity implementation | Status |
|---|---|---|
| Active Brand context | `components/active-brand.tsx` + dashboard selectors | Existing |
| Login / Supabase session | `app/login/page.tsx`, `components/auth-guard.tsx` | Existing |
| Users, roles, permissions | `app/users-access`, `lib/access-control.ts`, workspace roles | Existing |
| Invite flow | `app/api/admin/invite`, `app/users-access/invite` | Existing Combined enhancement |
| Overview | `app/page.tsx` | Existing |
| Production Overview | `components/dashboard/production-overview.tsx` | Existing Combined enhancement |
| Brands | `app/brands/page.tsx` | Existing |
| Brand Intelligence | dashboard + `brand-intelligence-context` + extract API | Existing |
| Brief Studio / Quick Brief | `app/content-generator/page.tsx` | Existing + upgraded |
| Topic Lock | Content Generator + `/api/ai/angles` prompt contract | Existing |
| Story Angle generation | `/api/ai/angles` | Existing + upgraded |
| Selectable Story Angle Count 1–10 | Content Generator + `/api/ai/angles` | Migrated from SMM |
| DeepSeek structured generation | `lib/ai/core.ts` | Existing |
| Tavily global live research | `lib/ai/tavily.ts` | Existing |
| Indonesia News research | `lib/ai/indonesia-news.ts` + `/api/ai/angles` | Migrated from SMM |
| Case-led research / analogous cases | `/api/ai/angles` | Existing |
| Campaign history | `lib/smm-workflow.ts` + Content Generator | Existing |
| Campaign / Story Angle review | `app/campaign/[id]` | Existing |
| Full Content Brief | `app/brief/[id]` + brief API/engine | Existing |
| Human QC | Brief workflow and expansion workflow | Existing |
| Brand Alignment | `components/brand-alignment-widget.tsx`, API | Existing |
| LinkedIn expansion | `app/brief/[id]/expansion/[channel]`, expansion API | Existing |
| SEO/GEO expansion | same expansion route/page | Existing |
| Derivative alignment / QC | expansion alignment API + page | Existing |
| Multi-channel Calendar | `components/dashboard/content-calendar.tsx` | Existing |
| Cross-brand Calendar filters | Content Calendar | Existing Combined enhancement |
| Drag / reschedule | Content Calendar | Existing |
| QC / production / assignee filters | Content Calendar | Existing Combined enhancement |
| Task assignment | `components/task-assignment-widget.tsx` | Existing |
| Team / My Tasks | `app/tasks/page.tsx` | Existing |
| Calendar assignee visibility | Content Calendar reads workspace tasks | Existing |
| Design status | Content Calendar + `BriefRecord.production_status` | Existing |
| Upload-only final asset workflow | Buffer publisher + legacy link hider | Migrated from SMM |
| Supabase publisher storage | `database/20260908_buffer_publisher_storage.sql` | Migrated / idempotent |
| JPG / PNG / WEBP upload | Buffer publisher | Migrated |
| MP4 / MOV upload | Buffer publisher | Migrated |
| Buffer organization/channel discovery | `/api/buffer/channels` | Migrated |
| Buffer diagnostics | Buffer channel API + publisher UI | Migrated |
| Instagram account selection | Buffer publisher | Migrated |
| Caption editing before schedule | Buffer publisher | Migrated |
| Publish date + WIB time | Buffer publisher | Migrated |
| Schedule Image → Instagram post | `/api/buffer/schedule` metadata `type: post` | Migrated |
| Schedule Video → Instagram reel | `/api/buffer/schedule` metadata `type: reel` | Migrated |
| Share reel/post to feed | `metadata.instagram.shouldShareToFeed=true` | Migrated |
| Future-time validation | Buffer schedule API | Migrated |
| Buffer Post ID response | Buffer schedule API | Migrated |
| Content Performance | dashboard module | Existing Combined enhancement |
| Audience Analytics | dashboard module | Existing Combined enhancement |
| Posting Schedule | dashboard module | Existing Combined enhancement |
| Competitor Benchmarking | dashboard module | Existing Combined enhancement |
| Workspace Hub | dashboard module | Existing Combined enhancement |
| Reports | dashboard module | Existing Combined enhancement |
| Settings / QC thresholds | `app/settings`, `workspace-store` | Existing |
| Storytelling Knowledge Base | `storytelling_knowledge_base.md` | Existing v2 |
| SMM detailed editorial skills | `smm_simplified_skill_addendum.md`, loaded by `lib/ai/core.ts` | Migrated |
| Contrarian Corporate Case | knowledge + angle prompt | Parity |
| Strategic Case-to-Capability | knowledge + angle prompt | Parity |
| Case-First default | SMM skill addendum | Migrated |
| Case/Evidence → Tension → Mechanism → Insight → POV | knowledge + prompts | Parity |
| Fact vs Interpretation vs Brand POV | knowledge + prompts | Parity |
| Anti AI-slop language standard | knowledge + prompts | Parity |
| Anti-Boring Test | SMM skill addendum | Migrated |
| 10-dimension Content Quality Score | SMM skill addendum | Migrated |
| Self-Critic tests | SMM skill addendum | Migrated |
| Capability Bridge framework | SMM skill addendum | Migrated |
| Reference-content learning rule | SMM skill addendum | Migrated |
| Headline standard | SMM skill addendum | Migrated |
| Idea Generation standard | SMM skill addendum | Migrated |

## Environment dependencies

Combined Vercel must have the existing AI/Supabase environment plus:
- `BUFFER_API_KEY` — server-side only, never `NEXT_PUBLIC_*`.
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `DEEPSEEK_API_KEY`
- `TAVILY_API_KEY`

Do not commit or document secret values.

## Database dependency

The shared Supabase project needs the public bucket `smm-publisher-media` and authenticated own-folder policies. Migration is in `database/20260908_buffer_publisher_storage.sql` and is idempotent. If the SMM migration has already been applied to the same Supabase project, this migration should be a no-op for existing objects/policies.

## Compatibility strategy

Combined is not a byte-for-byte copy of SMM Simplified. Existing Combined-native implementations are retained where they already provide the same or broader capability. Only missing SMM deltas are migrated. This avoids regressing Combined-only capabilities such as analytics, reports, user invitation, portfolio filters, and governance controls.

## QA gates before merge

- Next.js production build passes.
- Existing Combined routes continue to compile.
- Quick Brief can request 1–10 angles.
- Indonesia News layer does not break global research.
- Calendar still displays Social, LinkedIn, and SEO/GEO items.
- Drag/reschedule and task assignment remain functional.
- Legacy design URL controls are hidden in Calendar.
- Upload creates a public `smm-publisher-media` URL.
- Buffer channel dropdown loads connected account(s).
- Image schedules as Instagram `post`.
- Video schedules as Instagram `reel`.
- Existing Combined analytics/reports/users-access remain intact.

No parity branch should be merged to `main` until build/CI validation completes.
