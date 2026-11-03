# BranchDesk

A lightweight Git-first desktop file editor. The current M0 slice supports opening a local Git repository, lazy directory browsing, editor tabs, UTF-8 editing/saving, manual Git status refresh, and a working-tree changes list.

## Run

Install Node.js and the stable Rust toolchain, then:

```sh
npm install
npm run tauri dev
```

`npm run dev` opens a browser preview; local repository access requires the desktop app. `npm run build` checks TypeScript and builds the frontend. Run `cargo check --manifest-path src-tauri/Cargo.toml` for the desktop backend.

## Current limits

Git panel supports file-level stage/unstage, read-only Monaco Diff (working/index/commit), commit, the latest 200 commits, changed-file details, branch listing/creation/switch/merge/safe deletion. Open it using the branch button, left Git icon, or Changes heading. Unsaved documents block writes; checkout and merge require a clean working tree. Full DAG rendering, conflict continuation/abort, rollback, remote push/pull and pagination remain pending. Bare repositories, binary files, files over 5 MB and non-UTF-8 content are rejected. External disk modifications block saving; editor content remains available. Filesystem watching, ignored-file filtering, persistent layout, preview tabs, and full conflict recovery are not implemented yet. Saving currently uses direct writes and is not crash-atomic. Do not treat this development build as a finished editor.

Reference designs are in `prototypes/`.
