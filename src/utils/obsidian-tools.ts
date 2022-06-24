export { }

declare global {
    interface HTMLElement {
        createEl(type: string, options?): HTMLElement;

        createDiv(options?): HTMLElement;
    }
}

function _createEl(type: string, options?): HTMLElement {
    const el = document.createElement(type);
    if (options) {
        if ('cls' in options) {
            for (const c of options.cls.split(/\s/)) {
                if (c.length === 0) {
                    continue;
                }
                el.classList.add(c);
            }
        }
        if ('text' in options) {
            el.textContent = options.text;
        }
        if ('attr' in options) {
            for (const attrName in options.attr) {
                el.setAttribute(attrName, options.attr[attrName]);
            }
        }
    }

    return el;
}

function _createDiv(options?) {
    return _createEl('div', options);
}

export function createEl(type: string, options?): HTMLElement {
    return _createEl(type, options);
}

export function createDiv(options?) {
    return _createDiv(options);
}

HTMLElement.prototype.createEl = function (type: string, options?) {
    const el = _createEl(type, options);
    this.appendChild(el);
    return el;
}

HTMLElement.prototype.createDiv = function (options?) {
    return this.createEl('div', options);
}
