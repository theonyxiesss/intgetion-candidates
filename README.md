# INTGETION Candidates Service

Candidate profiles for INTGETION JOB LIST: headline, desired titles, work hours and days, formats, employment types, salary, skills with levels, experience, preferences (categories, sectors, seniority, company sizes), visibility, the morning-brief switch, and profile completeness.

Runs as its own HTTP process with its own tables and migration. Developed separately; the platform is not wired to it yet.

## Run

```bash
npm install
cp .env.example .env   # fill in values
npm run migrate        # candidate tables only
npm run dev            # http://localhost:4060
```

Checks: `npm run typecheck`, `npm test`. Integration tests run only when `DATABASE_URL` is set (and need `DATABASE_MIGRATION_URL`).

## How callers talk to it

Every request except `GET /health` needs `Authorization: Bearer <CANDIDATES_SERVICE_TOKEN>`. Own routes and `GET /v1/candidates/:id` need `x-user-id` (the viewer). Answers are `cache-control: no-store`. Errors are `{ "error": { "code", "message", "details?" } }`.

## API

| Method | Path | Who | What |
|---|---|---|---|
| GET | `/health` | — | `{ ok }` |
| GET | `/v1/me/candidate` | person | own profile, 404 if none |
| PATCH | `/v1/me/candidate` | person | save the whole form; unknown skills come back in `unrecognizedSkills` |
| POST | `/v1/me/candidate/patch` | person | partial update (assistant) |
| PUT | `/v1/me/candidate/visibility` | person | `{ hidden }` |
| GET / PUT | `/v1/me/candidate/agent-briefs` | person | `{ enabled }` |
| GET | `/v1/candidates/:id` | viewer | the profile, if the viewer is the candidate or an employer allowed to see it; otherwise 404 |
| GET | `/v1/candidates/:id/exists` | module | `{ exists }` |
| POST | `/v1/candidates/:id/completeness` | module | `{ contactEmail }` → recompute and store the score |
| POST | `/v1/storefronts` | module | `{ userIds }` → public seller cards (no contacts) |

## What it calls

| Service | Call | For |
|---|---|---|
| taxonomy (`TAXONOMY_URL`) | `POST /v1/skills/normalize` | turn typed skills into catalog skills |
| contacts (`CONTACTS_URL`) | `GET /v1/contacts/:id/email` | completeness counts a contact email |
| users (`USERS_URL`) | `POST /v1/users/:id/profile/facts` | name, place and languages live in the shared profile (D509) |
| platform (`PLATFORM_URL`) | `GET /api/internal/candidates/employer-can-see?viewerId&candidateId` → `{ allowed }` | employer access, until applications is extracted |

Writing the shared facts happens inside the profile transaction: if users refuses, the profile save fails too (D509). In-process use passes the transaction to the port, so both commit together.

## Data

Tables owned by candidates: `candidate_profiles`, `candidate_skills`, `candidate_experience`, `candidate_preferences`, function `candidate_titles_valid`. One migration, `migrations/0005_candidates.sql`, holds their final shape: it was taken from a database migrated to the latest platform state, and a schema dump of the result matches the platform exactly. On a live database it changes nothing; applied by `npm run migrate`, tracked in `candidates_schema_migrations`, checked against a non-superuser owner with rows present.

Reads (never writes) `skills` (taxonomy) for skill names and `user_profiles` (users) for name and time zone. Shared types (`employment_type`, `work_format`, `job_seniority`, `salary_*`, `company_size`, `skill_level`) are also used by jobs and companies; the migration creates them only when missing. Needs `users`, helpers `public.set_updated_at` and `public.enable_rls_deny_all`, roles `app_rw`, `anon`, `authenticated`. CI creates stand-ins from `test/sql/platform-stub.sql`.

## Packages inside

- `.` — service functions, `updateCandidateInput`, completeness, `setCandidatesPorts`
- `./ports` — `setCandidatesPorts()`
- `./server` — `createApp()` HTTP handler

Depends on `@intgetion/kit` (v0.3.0) and `@intgetion/taxonomy` (v0.2.0, marker vocabulary) by git tag. Profile pages stay in the platform.
