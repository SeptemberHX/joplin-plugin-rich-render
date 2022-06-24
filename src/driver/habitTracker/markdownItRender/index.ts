import {DEFAULT_SETTINGS, renderTable} from "../utils/habitTrackerRender";

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

export function habitFenceRenderer(markdownIt, _options) {
    const defaultRender = markdownIt.renderer.rules.fence || function (tokens, idx, options, env, self) {
        return self.renderToken(tokens, idx, options, env, self);
    };

    markdownIt.renderer.rules.fence = function (tokens, idx, options, env, self) {
        // console.log(tokens, idx);
        const token = tokens[idx];
        if (token.info !== 'habitt') {
            return defaultRender(tokens, idx, options, env, self);
        }

        // @ts-ignore
        return renderTable(token.content, DEFAULT_SETTINGS).outerHTML;
    }
}
