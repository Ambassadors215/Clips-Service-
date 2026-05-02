#!/usr/bin/env node
// SAFE NO-OP. Earlier versions of this script POSTed to /pause to "probe"
// the API, which actually paused the production project. The Vercel UI is
// the only sane way to flip the project-level "live" flag if it ever sticks
// at false; do NOT call /pause from automation.
//
// Use scripts/vercel-unpause.mjs to restore service if a pause occurred.
console.log("vercel-set-live: refusing to call /pause endpoints (destructive). Use the Vercel dashboard if you need to toggle live state.");
process.exit(0);
