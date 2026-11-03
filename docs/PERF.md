# Performance work

Changes in this iteration:

- Commit polling requests file changes without loading 200 commits on every poll; unchanged results retain existing React state. Polling pauses in hidden documents.
- Directory enumeration validates the root once instead of spawning two Git processes for every child entry. Canonical child containment checks remain in place.
- File reads/writes, directory enumeration and Git status run on Tauri blocking workers rather than the window thread.
- Status refresh no longer remounts the entire expanded Project tree.
- Git graph lanes are memoized; resize updates are coalesced to animation frames.

Validation: frontend production build and two Rust tests passed. No measured frame-time or startup claims are made; actual desktop interaction and large-repository performance still require profiling.
