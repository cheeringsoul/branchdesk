# Git capability slice validation

- Frontend: `npm run build` passed (Monaco bundle size warning remains).
- Backend: `cargo check --release --manifest-path src-tauri/Cargo.toml` passed.
- Tests: `cargo test --manifest-path src-tauri/Cargo.toml` passed, 2 tests: reject unsafe relative paths; initialize a disposable repository, stage a filename containing spaces and read its index blob.
- Desktop user flows have not yet been manually validated; tests do not cover the complete checkout/merge/commit lifecycle.
- Current history view loads up to 200 commits and draws parent-derived lanes. Search hides the graph because filtered rows are not adjacent history.
- Pending: conflict resolution/abort, remote push/pull, rollback, full porcelain v2 status, history pagination and resilient editor reload after external Git changes.

## Git workflow completion

Added conflict listing, editor entry, mark-resolved, continue/abort merge; remote-tracking checkout creates a local tracking branch and refuses name collisions. Added selected-remote fetch/push and upstream fast-forward-only pull. No force push is exposed. Network authentication uses the installed Git credential/SSH configuration; this has only been tested against a local bare remote, not a hosted authenticated service.

`cargo test`: 5 passing tests, including remote push/fetch/pull/tracking checkout, conflicting merge, blocked premature continuation, abort and resolved continuation. Desktop UI flows still require manual acceptance.
