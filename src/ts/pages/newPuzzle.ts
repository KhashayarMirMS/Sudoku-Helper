import { Difficulty, generateGame } from 'logic/game';
import { activatePage } from 'utils/page';

document.querySelectorAll<HTMLButtonElement>('button.difficulty-selection-button').forEach(button => {
    button.addEventListener('click', () => {
        generateGame(button.dataset['difficulty'] as Difficulty);
        activatePage('main');
    });
});
