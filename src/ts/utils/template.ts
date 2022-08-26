const templates: Record<string, string> = {};

export function setTemplate(name: string, template: string) {
    templates[name] = template;
}

export function getTemplate(name: string) {
    return templates[name];
}

export function renderString(template: string, context: Record<string, any>, prefix = '') {
    let result = template;
    for (const [key, value] of Object.entries(context)) {
        const keyWithPrefix = prefix === '' ? key : `${prefix}.${key}`;

        if (typeof value === 'object') {
            result = renderString(result, value, keyWithPrefix);
            continue;
        }

        const regex = new RegExp(`\\{\\{\\s*${keyWithPrefix}\\s*\\}\\}`, 'g');
        result = result.replace(regex, value.toString());
    }

    return result;
}

export function renderTemplate(name: string, context: Record<string, any>) {
    if (!(name in templates)) {
        throw Error(`Template not found: ${name}`);
    }

    const template = templates[name];
    return renderString(template, context);
}

export function renderStringToElements(
    elementsOrSelector: string | HTMLElement | Array<HTMLElement>,
    context: Record<string, any>
) {
    const elements = typeof elementsOrSelector === 'string'
        ? Array.from(document.querySelectorAll(elementsOrSelector))
        : Array.isArray(elementsOrSelector)
            ? elementsOrSelector
            : [elementsOrSelector];

    elements.forEach(element => {
        const res = renderString(element.innerHTML, context);
        element.innerHTML = res;
    });
}

export default function initialize() {
    const templatesContainer = document.querySelector<HTMLDivElement>('.templates');

    templatesContainer?.querySelectorAll<HTMLDivElement>('.template').forEach(template => {
        const name = template.dataset.name;
        if (!name) {
            return;
        }

        setTemplate(name, template.innerHTML);
    });

    templatesContainer?.remove();
}
