import {habitFenceRenderer} from "./habitTrackerRender";

export default function (context) {
    return {
        plugin: function (markdownIt, _options) {
            const pluginId = context.pluginId;

            habitFenceRenderer(markdownIt, _options);
        },
        assets: function() {
            return [
                {
                    name: 'styles.css'
                }
            ];
        },
    }
}