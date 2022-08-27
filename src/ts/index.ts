import initializeButtons from 'components/button';
import initializeGame from 'pages/game';
import initializeNewPuzzle from 'pages/new-puzzle';
import initializeScan from 'pages/scan';
import initializeSelection from 'pages/selection';
import initializeTemplates from 'utils/template';

initializeButtons();
initializeTemplates();

initializeNewPuzzle();
initializeSelection();
initializeScan();
initializeGame();
