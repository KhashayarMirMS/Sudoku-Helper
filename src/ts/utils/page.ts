export function activatePage(pageOrSelector: HTMLDivElement | string | undefined, hideOtherPages = true) {
    if (hideOtherPages) {
        Array.from(document.querySelectorAll('.page.active')).forEach(page => page.classList.remove('active'));
    }

    let page;

    if (typeof pageOrSelector === 'string') {
        page = document.querySelector<HTMLDivElement>(`.page[data-title="${pageOrSelector}"]`);
    } else {
        page = pageOrSelector;
    }

    page?.classList.add('active');
}

const initialPage = Array.from(document.querySelectorAll<HTMLDivElement>('.page')).find(page => 'initial' in page.dataset);
activatePage(initialPage);
