export function isToggledOn(button: HTMLButtonElement): boolean {
    if (!button.classList.contains('toggle')) {
        return false;
    }

    return button.dataset.toggled !== undefined;
}

export function toggle(button: HTMLButtonElement) {
    if (!button.classList.contains('toggle')) {
        return;
    }

    if (isToggledOn(button)) {
        delete button.dataset.toggled;
        button.classList.add('outlined');
    } else {
        button.dataset.toggled = '';
        button.classList.remove('outlined');
    }
}

function setupToggleButton(button: HTMLButtonElement) {
    button.addEventListener('click', () => {
        toggle(button);
    }, true);
}

export default function initialize() {
    document.querySelectorAll<HTMLButtonElement>('button.toggle').forEach(setupToggleButton);
}
