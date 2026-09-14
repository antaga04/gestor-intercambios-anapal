// Vercel serverless entry: the Express app is built by `pnpm build` into dist/.
// Excluded from `tsc` (dist may not exist yet); Vercel compiles it on deploy.
// @ts-expect-error dist is a build artifact
import app from '../dist/index.js';

export default app;
