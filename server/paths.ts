import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Source and compiled server directories are both direct children of the workspace.
const moduleDirectory = fileURLToPath(new URL('.', import.meta.url));
export const workspace = process.env.YOSIS_WORKSPACE
  ? path.resolve(process.env.YOSIS_WORKSPACE)
  : path.resolve(moduleDirectory, '..');
export const dataDirectory = path.resolve(process.env.YOSIS_DATA_DIR ?? workspace);
