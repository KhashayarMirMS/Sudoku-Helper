import { activatePage } from 'utils/page';

export default function initialize() {
    const newPuzzleButton = document.getElementById('new-puzzle-button');
    newPuzzleButton?.addEventListener('click', () => {
        activatePage('new-puzzle');
    });

    const scanPuzzleButton = document.getElementById('scan-puzzle-button');
    scanPuzzleButton?.addEventListener('click', () => {
        activatePage('scan');
    });
}
