import initializeGame from 'pages/game';
import initializeNewPuzzle from 'pages/new-puzzle';
import initializeSelection from 'pages/selection';
import initializeTemplates from 'utils/template';
import initializeButtons from 'components/button';

initializeButtons();
initializeTemplates();

initializeNewPuzzle();
initializeSelection();
initializeGame();
