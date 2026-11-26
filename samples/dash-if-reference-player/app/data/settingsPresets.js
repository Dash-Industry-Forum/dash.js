/**
 * Presets offered in the settings drawer.
 *
 * Applying a preset first resets every setting to the reference player's defaults and then
 * applies `settings`, so the result does not depend on what was set before. To add a preset,
 * add one entry: `settings` is a partial settings object, as passed to player.updateSettings().
 */

const SETTINGS_PRESETS = [
    {
        id: 'low-latency-live',
        name: 'Low latency live',
        description: 'Starting values of the low-latency sample: 3 s target latency with live catch-up.',
        settings: {
            streaming: {
                delay: {
                    liveDelay: 3
                },
                liveCatchup: {
                    enabled: true,
                    maxDrift: 0,
                    liveThreshold: 30,
                    playbackRate: {
                        min: -0.1,
                        max: 0.1
                    },
                    mode: 'liveCatchupModeDefault'
                }
            }
        }
    }
];

export default SETTINGS_PRESETS;
