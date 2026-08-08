# Shadowframe AI v0.3.6 - What's New

Shadowframe AI v0.3.6 is our cleaned-up public release pass for the Windows installer experience.

This release focuses on making the public build easier to install, easier to understand, and more reliable for first-time users.

## What’s new in v0.3.6

- Public release packaging has been finalized into a cleaner release flow.
- The public installer now boots into the correct `public` profile automatically.
- Public uploads are validated before they ever reach the generation runtime.
- The installer is clearer about what edition is being installed.
- The public bundle ships SFW sample prompts only.
- Public model packs can be fetched automatically during setup instead of requiring a manual side-by-side installer layout.

## Reliability improvements

This release also includes behind-the-scenes hardening work:

- fixes for startup path issues on installs with spaces in folder names
- fixes for public installer package handoff timing
- fixes for a public app initialization crash
- end-to-end validation of the public installer flow

## Why this matters

The goal of v0.3.6 is simple:

make Shadowframe easier for a new Windows user to download, install, launch, and understand without needing to manually wire the whole stack together.

## Where to get it

- GitHub release page for release notes and checksums
- Hugging Face public bundle for the full installer download
