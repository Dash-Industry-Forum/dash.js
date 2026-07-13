import { defineConfig } from 'vite';

// Escalate CommonJS-in-ESM findings (and similar module-format warnings) to hard build
// errors so this project fails if the published ESM bundle regresses, see issue #5026.
const FORBIDDEN_LOG_PATTERN = /COMMONJS_VARIABLE_IN_ESM|CommonJS/i;

export default defineConfig({
    build: {
        rolldownOptions: {
            onLog(level, log, defaultHandler) {
                if (FORBIDDEN_LOG_PATTERN.test(log.code || '') || FORBIDDEN_LOG_PATTERN.test(log.message || '')) {
                    throw new Error(`Forbidden bundler warning for dashjs ESM bundle: [${log.code}] ${log.message}`);
                }
                defaultHandler(level, log);
            }
        },
        // The dashjs bundle is large by design; silence the unrelated size advisory.
        chunkSizeWarningLimit: 1500
    }
});
