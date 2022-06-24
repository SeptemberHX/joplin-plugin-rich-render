import joplin from 'api';
import {ContentScriptType} from "../api/types";

joplin.plugins.register({
	onStart: async function() {
		await joplin.contentScripts.register(
			ContentScriptType.MarkdownItPlugin,
			'rich-render-habit',
			'./driver/habitTracker/markdownItRender/index.js'
		);
		await joplin.contentScripts.register(
			ContentScriptType.CodeMirrorPlugin,
			'cm-rich-render-habit',
			'./driver/habitTracker/codemirror/index.js'
		);
	},
});
