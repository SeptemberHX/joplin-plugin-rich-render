import { debounce } from "ts-debounce";
import CodeMirror, {TextMarker} from "codemirror";

export class CMBlockMarkerHelper {

    marker2LineWidget;

    /**
     * Constructor
     * @param editor Codemirror editor
     * @param blockRegexp Target content block regexp without the begin-token and end-token
     * @param blockStartTokenRegexp The regexp for the begin-token of the target block.
     * @param blockEndTokenRegex The regexp for the end-token of the target block.
     *                           It only works when the begin-token is matched
     * @param renderer Custom renderer function
     * @param MARKER_CLASS_NAME Target marker class name
     * @param foldedInlineText The matched block will be replaced with the given foldedInlineText with an appended rendered widget
     * @param clearOnClick Whether we clear the marker with the rendered content when it is clicked by the mouse
     * @param codeBlock? Whether it is matched as a code block or not. For code blocks, more works need to do
     *                   to erase the background color
     */
    constructor(private readonly editor: CodeMirror.Editor,
                private readonly blockRegexp: RegExp,
                private readonly blockStartTokenRegexp: RegExp,
                private readonly blockEndTokenRegex: RegExp,
                private readonly renderer: (beginMatch, endMatch, content) => HTMLElement,
                private readonly MARKER_CLASS_NAME: string,
                private readonly foldedInlineText: string,
                private readonly clearOnClick: boolean,
                private readonly codeBlock?: boolean
    ) {
        this.marker2LineWidget = {};
        this.init();
    }

    /**
     * Init everything at the beginning
     * @private
     */
    private init() {
        this.process();
        const debounceProcess = debounce(this.process.bind(this), 100);
        this.editor.on('cursorActivity', debounceProcess);
        this.editor.on('viewportChange', debounceProcess);
        // this.editor.on('cursorActivity', this.unfoldAtCursor.bind(this));
    }

    /**
     * Process current view port to render the target block in the editor with the given marker class name
     * @private
     */
    private process() {
        // First, find all math elements
        // We'll only render the viewport
        const viewport = this.editor.getViewport()
        let blockRangeList = [];
        let meetBeginToken = false;
        let prevBeginTokenLineNumber = -1;
        let beginMatch = null;
        for (let i = viewport.from; i < viewport.to; i++) {
            const line = this.editor.getLine(i);

            // if we find the start token, then we will try to find the end token
            if (!meetBeginToken && this.blockStartTokenRegexp.test(line)) {
                beginMatch = line.match(this.blockStartTokenRegexp);
                meetBeginToken = true;
                prevBeginTokenLineNumber = i;
                continue;
            }

            // only find the end token when we met start token before
            //   if found, we save the block line area to blockRangeList
            if (meetBeginToken && this.blockEndTokenRegex.test(line)) {
                blockRangeList.push({
                    from: prevBeginTokenLineNumber,
                    to: i,
                    beginMatch: beginMatch,
                    endMatch: line.match(this.blockEndTokenRegex)
                });
                meetBeginToken = false;
                prevBeginTokenLineNumber = -1;
            }
        }

        // we need to check the left lines if we meet the begin token without end token in current view port
        if (meetBeginToken) {
            for (let i = viewport.to; i < this.editor.lineCount(); ++i) {
                const line = this.editor.getLine(i);
                if (this.blockEndTokenRegex.test(line)) {
                    blockRangeList.push({
                        from: prevBeginTokenLineNumber,
                        to: i,
                        beginMatch: beginMatch,
                        endMatch: line.match(this.blockEndTokenRegex)
                    });
                    break;
                }
            }
        }

        // nothing to do here. Just return
        if (blockRangeList.length === 0) {
            return;
        }

        // improve performance by updating dom only once even with multiple operations
        this.editor.operation(() => {
            this._markRanges(blockRangeList);
        });
        if (this.codeBlock) {
            for (const el of document.getElementsByClassName('CodeMirror-widget')) {
                if (el.parentElement && el.parentElement.parentElement.className.includes('cm-jn-code-block')) {
                    const codeblockDiv = el.parentElement.parentElement.parentElement;
                    if (codeblockDiv && codeblockDiv.children[0].className.includes('cm-jn-code-block-background')) {
                        codeblockDiv.removeChild(codeblockDiv.firstChild);
                    }
                }
            }
        }
    }

    private _markRanges(blockRangeList) {
        for (const blockRange of blockRangeList) {
            let markExisted = false;
            this.editor.findMarksAt({line: blockRange.from, ch: 0}).find((marker) => {
                if (marker.className === this.MARKER_CLASS_NAME) {
                    markExisted = true;
                }
            });

            // if processed, then we ignore it
            if (markExisted) {
                continue;
            }

            const cursor = this.editor.getCursor();
            const doc = this.editor.getDoc();
            let from = {line: blockRange.from, ch: 0};
            let to = {line: blockRange.to, ch: this.editor.getLine(blockRange.to).length};

            const blockContentLines = [];
            for (let i = from.line + 1; i <= to.line - 1; ++i) {
                blockContentLines.push(this.editor.getLine(i));
            }

            // not fold when the cursor is in the block
            if (cursor.line < from.line || cursor.line > to.line
                || (cursor.line === from.line && cursor.ch < from.ch)
                || (cursor.line === to.line && cursor.ch > to.ch)) {
                const wrapper = document.createElement('div');
                const element = this.renderer(blockRange.beginMatch, blockRange.endMatch, blockContentLines.join('\n'));
                wrapper.appendChild(element);
                const lineWidget = doc.addLineWidget(to.line, wrapper);
                const foldMark = document.createElement('span');
                foldMark.classList.add('block-fold-marker');
                foldMark.textContent = this.foldedInlineText;
                foldMark.style.cssText = 'color: lightgray; font-size: smaller; font-style: italic;';
                const textMarker = doc.markText(
                    from,
                    to,
                    {
                        replacedWith: foldMark,
                        handleMouseEvents: true,
                        className: this.MARKER_CLASS_NAME, // class name is not renderer in DOM
                        inclusiveLeft: false,
                        inclusiveRight: false
                    },
                );

                wrapper.style.cssText = 'border: 2px solid transparent; padding: 2px; width: 100%; border-radius: 4px;';
                const editButton = document.createElement('div');
                editButton.innerHTML = `<svg viewBox="0 0 100 100" class="code-glyph" width="16" height="16"><path fill="currentColor" stroke="currentColor" d="M56.6,13.3c-1.6,0-2.9,1.2-3.2,2.7L40.1,82.7c-0.3,1.2,0.1,2.4,1,3.2c0.9,0.8,2.2,1.1,3.3,0.7c1.1-0.4,2-1.4,2.2-2.6 l13.3-66.7c0.2-1,0-2-0.7-2.8S57.6,13.3,56.6,13.3z M24.2,26.6c-1.1,0-2.1,0.5-2.8,1.4l-14.1,20c-0.8,1.2-0.8,2.7,0,3.9l14.1,20 c1.1,1.5,3.1,1.9,4.6,0.8c1.5-1.1,1.9-3.1,0.8-4.6L14.1,50l12.8-18.1c0.7-1,0.8-2.4,0.3-3.5C26.6,27.3,25.4,26.6,24.2,26.6 L24.2,26.6z M76.5,26.6c-1.2,0-2.4,0.8-2.9,1.9c-0.5,1.1-0.4,2.4,0.3,3.4L86.7,50L73.9,68.1c-0.7,1-0.8,2.2-0.3,3.3 s1.5,1.8,2.7,1.9c1.2,0.1,2.3-0.4,3-1.4l14.1-20c0.8-1.2,0.8-2.7,0-3.9l-14.1-20C78.7,27.1,77.7,26.6,76.5,26.6L76.5,26.6z"></path></svg>`;
                editButton.style.cssText = 'position: absolute; top: 8px; right: 10px; width: 24px; height: 24px;' +
                    'background-color: #7b6cd9 !important; color: #f2f2f2; border-radius: 5px; display: flex; align-items: center; justify-content: center;';
                editButton.style.visibility = 'hidden';
                if (this.clearOnClick) {
                    foldMark.onclick = (e) => {
                        lineWidget.clear();
                        clickAndClear(textMarker, this.editor)(e);
                    };
                }
                editButton.onclick = (e) => {
                    lineWidget.clear();
                    textMarker.clear();
                    doc.setCursor({line: from.line + 1, ch: 0});
                }
                wrapper.appendChild(editButton);
                wrapper.onmouseover = (e) => {
                    editButton.style.visibility = 'visible';
                    wrapper.style.border = '2px solid #19a2f0';
                };
                wrapper.onmouseleave = (e) => {
                    editButton.style.visibility = 'hidden';
                    wrapper.style.border = '2px solid transparent';
                };
                this.marker2LineWidget[textMarker] = lineWidget;
            }
        }
    }

    private unfoldAtCursor() {
        const cursor = this.editor.getCursor();
        this.editor.findMarksAt(cursor).find((marker) => {
            if (marker.className === this.MARKER_CLASS_NAME) {
                marker.clear();
                this.clearMarkerLineWidget(marker);
            }
        });
    }

    private clearMarkerLineWidget(marker) {
        if (marker in this.marker2LineWidget) {
            this.marker2LineWidget[marker].clear();
            delete this.marker2LineWidget[marker];
        }
    }
}

/**
 * Returns a callback that performs a "click and clear" operation on a rendered
 * textmarker, i.e. remove the marker and place the cursor precisely where the
 * user clicked
 *
 * @param   {TextMarker}  marker  The text marker
 * @param   {CodeMirror}  cm      The CodeMirror instance
 *
 * @return  {Function}            The callback
 */
export default function clickAndClear (
    marker: TextMarker,
    cm: CodeMirror.Editor
): (e: MouseEvent) => void {
    return (e: MouseEvent) => {
        marker.clear()
        cm.setCursor(cm.coordsChar({ left: e.clientX, top: e.clientY }))
        cm.focus()
    }
}
