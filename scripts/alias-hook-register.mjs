import { register } from 'node:module';
import { pathToFileURL } from 'node:url';

// Loader hooks must be registered from a separate module that runs first.
register('./alias-hook.mjs', pathToFileURL('./scripts/'));
