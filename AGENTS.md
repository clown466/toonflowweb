# Toonflow Web Agent Notes

## Repositories

- Frontend repository: `https://github.com/clown466/toonflowweb`
- Backend repository: `https://github.com/clown466/toonflowback`
- Keep frontend and backend commits separate.

## Commit Habit

After a frontend change is implemented and verified successfully, create a focused local git commit for that successful change.

- Run the relevant verification first, usually `git diff --check` and `npm run build-only` for frontend changes.
- Commit only files that belong to the completed change.
- Do not include unrelated user edits or unfinished work in the commit.
- Use a concise commit message describing the result.
- Do not push to GitHub unless the user explicitly asks to upload/push.

## Development Modes

- Fast frontend development: `npm run dev:hot` or `npm run dev:hot:backend`.
- Production-style frontend preview uses a built `dist/` copied into the backend static web directory.
- See `docs/dev-hot-reload.md` for the current hot-reload workflow.
