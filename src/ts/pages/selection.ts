import { activatePage } from 'utils/page';

const newPuzzleButton = document.getElementById('new-puzzle-button');
newPuzzleButton?.addEventListener('click', () => {
    activatePage('new-puzzle');
});

const scanPuzzleButton = document.getElementById('scan-puzzle-button');
scanPuzzleButton?.addEventListener('click', () => {
    activatePage('scan');
});
