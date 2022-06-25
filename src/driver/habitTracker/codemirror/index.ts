import {CMBlockMarkerHelper} from "../../../utils/CMBlockMarkerHelper";
import {DEFAULT_SETTINGS, renderTable} from "../utils/habitTrackerRender";

module.exports = {
    default: function(_context) {
        return {
            plugin: function (CodeMirror) {
                CodeMirror.defineOption("habitTracker", [], async function(cm, val, old) {
                    // Block Katex Math Render
                    new CMBlockMarkerHelper(cm, null, /^\s*```habitt/, /^\s*```/, (beginMatch, endMatch, content) => {
                        const r = renderTable(content, DEFAULT_SETTINGS);
                        if (r !== 'error') {
                            return r as HTMLElement;
                        } else {
                            const div = document.createElement('div');
                            div.textContent = content;
                            return div;
                        }
                    }, 'habitTracker-marker', '===> Folded Habit Tracker Block <===', true, true);
                });
            },
            codeMirrorOptions: {
                'habitTracker': true,
            },
            assets: function() {
                return [
                    {
                        name: 'styles.css'
                    }
                ];
            }
        }
    },
}
