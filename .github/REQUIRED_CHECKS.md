# Required CI checks (Mark-AI)

Use these checks in **GitHub → Settings → Branches → Branch protection rules** for `main`.

## Required (blocks merge)

| Check name     | Job            | What it runs                                      |
|----------------|----------------|---------------------------------------------------|
| **Quality Gate** | `quality-gate` | Fails if Frontend CI or Backend CI did not succeed |

`Quality Gate` is the single check to require on pull requests. It aggregates:

- **Frontend CI** — `eslint`, `tsc --noEmit`, `vitest run`, `vite build`
- **Backend CI** — `ruff check`, `mypy`, `pytest` (Postgres 16 service)

You may also require **Frontend CI** and **Backend CI** individually if you prefer granular status.

## Not required for merge (informational / deploy only)

| Check name       | When it runs                         |
|------------------|--------------------------------------|
| Deploy Backend   | Push to `main` only, after quality   |
| Deploy Frontend  | Push to `main` only, after backend deploy |

Deploy jobs **skip successfully** when Vercel secrets are missing (`VERCEL_TOKEN`, `VERCEL_ORG_ID`, project IDs). They do not run on pull requests. Broken code still cannot merge: **Quality Gate** must pass first, and deploy jobs depend on Frontend CI and Backend CI.

## Production

Production deploy runs only on **push to `main`** after both quality jobs succeed. Configure Vercel secrets in the repository to enable deploy; without them, quality gates still protect `main`.
