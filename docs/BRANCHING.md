# Branching policy

rbGyanX Mobile uses a **trunk-based** workflow:

| Branch | Purpose |
|--------|---------|
| `main` | Sole integration branch; always releasable |
| Tags | Immutable releases (`v1.1.0-build18`, `v1.0.1-build17`, …) |

## Workflow

1. Branch from `main` for features (`feature/plan-compare`, `fix/parser-edge-case`).
2. Open a pull request → review → merge to `main`.
3. Tag `main` at release: `git tag -a v1.1.0-build18 -m "..."`.
4. Delete the feature branch after merge.

We do **not** keep long-lived version branches (`v1.1.0`, `build17-followup`, etc.) on the remote after release.

## Historical branches (archived)

The following were merged and removed from the remote:

- `build17-bugfix`, `build17-followup` — v1.0.1 build 17
- `v1.1.0` — merged to `main` for v1.1.0 build 18
- `chore/update-eas-project-id`, `cursor/fix-android-dvh-import` — housekeeping / Cursor experiments

Use tags and release notes for prior versions, not stale branches.
