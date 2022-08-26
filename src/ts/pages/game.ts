import { cleanUp, restoreLastGame, setup } from 'logic/game';
import { inFact } from 'utils/in-fact';
import { activatePage } from 'utils/page';
import { renderTemplate } from 'utils/template';

export default function initialize() {
    let tableTemplate = '';

    for (let row = 0; row < 9; row++) {
        for (let column = 0; column < 9; column++) {
            tableTemplate += `${renderTemplate('cell', { row, column }) }\n`;
        }
    }

    tableTemplate = tableTemplate.trim();

    const htmlTable = document.getElementById('table') as HTMLDivElement;
    htmlTable.innerHTML = tableTemplate;

    const cells = Array.from(htmlTable.querySelectorAll<HTMLDivElement>('.cell'));

    const buttonPanel = document.querySelector<HTMLDivElement>('.button-panel');
    inFact(buttonPanel !== null);

    const menuButton = buttonPanel.querySelector<HTMLButtonElement>('button.menu');
    inFact(menuButton !== null);
    menuButton.addEventListener('click', () => {
        cleanUp();
        activatePage('selection');
    });

    const infoParagraph = document.querySelector<HTMLParagraphElement>('#info');
    inFact(infoParagraph !== null);

    setup(cells, buttonPanel, infoParagraph);

    const success = restoreLastGame();

    if (!success) {
        return;
    }

    activatePage('game');
}
