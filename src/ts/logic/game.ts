/* eslint-disable max-lines */
import { isToggledOn, toggle } from 'components/button';
import { shuffle } from 'utils/array';
import { inFact } from 'utils/in-fact';
import { Serializable } from 'utils/serializable';
import { State } from 'utils/state';


interface Cloneable<T> {
    clone(): T;
}

interface Renderable<T=void> {
    render(target: T): void;
}

class InvalidHTMLCellError extends Error {

    constructor() {
        super('Invalid cell, please check your html structure');
    }

}

declare type CellUpdateCallback = () => void;

class HTMLCell {

    private element: HTMLDivElement;

    readonly value: HTMLDivElement;

    readonly notes: Array<HTMLDivElement>;

    private callback?: CellUpdateCallback;

    constructor(element: HTMLDivElement) {
        this.element = element;
        this.element.addEventListener(
            'click',
            () => void this.clickHandler()
        );

        const value = this.element.querySelector<HTMLDivElement>('.value');
        const notes = Array.from(this.element.querySelectorAll<HTMLParagraphElement>('.note'));
        if (value === null || notes.length !== 9) {
            throw new InvalidHTMLCellError();
        }

        notes.sort((a, b) => parseInt(a.dataset.value || '') - parseInt(b.dataset.value || ''));

        this.value = value;
        this.notes = notes;
    }

    get classList() {
        return this.element.classList;
    }

    setCallback(callback: CellUpdateCallback) {
        this.callback = callback;
    }

    clickHandler() {
        if (this.callback === undefined) {
            return;
        }

        this.callback();
    }

}

declare type CellValue = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9][number];
declare type NonEmptyCellValue = Exclude<CellValue, 0>;

declare type CellClassName =
        'locked'
        | 'selected-by-value' | 'selected-by-position' | 'active'
        | 'experimental' | 'hinted'
        | 'conflicting' | 'solved'

declare type SelectionState = 'not-selected' | 'by-value' | 'by-position';

class Cell extends Serializable implements Cloneable<Cell>, Renderable<HTMLCell> {

    private static allClasses: Array<CellClassName> = [
        'locked',
        'selected-by-value',
        'selected-by-position',
        'active',
        'experimental',
        'hinted',
        'conflicting',
        'solved'
    ];

    row: number;

    column: number;

    value: CellValue;

    isConflicting = false;

    isSolved = false;

    isLocked = false;

    isHinted = false;

    selection: SelectionState = 'not-selected';

    isActive = false;

    experimentalValue: CellValue = 0;

    notes: Set<NonEmptyCellValue> = new Set();

    constructor(row: number, column: number, value: CellValue) {
        super();

        this.row = row;
        this.column = column;
        this.value = value;
    }

    toggleNote(value: NonEmptyCellValue) {
        if (this.notes.has(value)) {
            this.notes.delete(value);
            return;
        }

        this.notes.add(value);
    }

    getValue() {
        return this.value || this.experimentalValue;
    }

    clone(): Cell {
        return new Cell(this.row, this.column, this.value);
    }

    protected serializeNotes() {
        return [...this.notes];
    }

    protected deserializeNotes(value: any) {
        if (!Array.isArray(value)) {
            return;
        }

        this.notes = new Set(value);
    }

    // eslint-disable-next-line complexity
    render(target: HTMLCell): void {
        const classesToAdd = new Set<CellClassName>();

        if (this.isLocked) {
            classesToAdd.add('locked');
        }

        if (this.selection !== 'not-selected') {
            classesToAdd.add(`selected-${this.selection}`);
        }

        if (this.isActive) {
            classesToAdd.add('active');
        }

        if (this.isConflicting) {
            classesToAdd.add('conflicting');
        }

        if (this.isSolved) {
            classesToAdd.add('solved');
        }

        if (this.isHinted) {
            classesToAdd.add('hinted');
        }

        let renderedValue = false;
        let renderedExperimentalValue = false;

        if (this.value !== 0) {
            target.value.innerHTML = this.value.toString();
            renderedValue = true;
        }

        if (!renderedValue && this.experimentalValue !== 0) {
            target.value.innerHTML = this.experimentalValue.toString();
            renderedExperimentalValue = true;
        }

        if (!renderedValue && renderedExperimentalValue) {
            classesToAdd.add('experimental');
        }

        if (!renderedValue && !renderedExperimentalValue) {
            target.value.innerHTML = '';
        }

        target.classList.add(...classesToAdd);
        const classesToRemove = Cell.allClasses.filter(className => !classesToAdd.has(className));
        target.classList.remove(...classesToRemove);

        for (let i = 1; i < 10; i++) {
            const shouldDisableNote = renderedValue || renderedExperimentalValue || !this.notes.has(i as NonEmptyCellValue);
            if (shouldDisableNote) {
                target.notes[i - 1].classList.add('hidden');
                continue;
            }

            target.notes[i - 1].classList.remove('hidden');
        }
    }

}

declare type Coords = [number, number];

declare type BacktrackingPurpose = 'puzzle-generation' | 'solution-count' | 'solution-list';
declare type BacktrackingResult<P extends BacktrackingPurpose> =
    P extends 'puzzle-generation'
        ? Board | undefined
        : P extends 'solution-count'
            ? number
            : Array<Board>;

class IncorrectCellsShapeError extends Error {

    constructor() {
        super('cells must be a 9x9 matrix');
    }

}

class Board extends Serializable implements Cloneable<Board>, Renderable<HTMLCell[][]> {

    cells: Cell[][];

    constructor(cells?: Cell[][] | CellValue[][]) {
        super();

        if (cells) {
            if (!Board.typeCheckCells(cells)) {
                throw new IncorrectCellsShapeError();
            }

            if (!Board.isNumberMatrix(cells)) {
                this.cells = cells;
                return;
            }
        }

        this.cells = new Array(9);
        for (let i = 0; i < 9; i++) {
            this.cells[i] = new Array(9);
            for (let j = 0; j < 9; j++) {
                this.cells[i][j] = new Cell(i, j, cells ? cells[i][j] : 0);
            }
        }
    }

    private static typeCheckCells(cells: any): cells is any[][] {
        if (!Array.isArray(cells)) {
            return false;
        }

        for (const row of cells) {
            if (!Array.isArray(row) || row.length !== 9) {
                return false;
            }
        }

        if (cells.length !== 9) {
            return false;
        }

        return true;
    }

    protected serializeCells() {
        const serialized = new Array(9);
        for (let i = 0; i < 9; i++) {
            serialized[i] = new Array(9);

            for (let j = 0; j < 9; j++) {
                serialized[i][j] = this.cells[i][j].serialize();
            }
        }

        return serialized;
    }

    protected deserializeCells(value: any) {
        if (!Board.typeCheckCells(value)) {
            return;
        }

        for (let i = 0; i < 9; i++) {
            for (let j = 0; j < 9; j++) {
                this.cells[i][j].deserialize(value[i][j]);
            }
        }
    }

    choicesForCell(row: number, column: number): Array<NonEmptyCellValue> {
        const availableValues: Set<NonEmptyCellValue> = new Set([
            1, 2, 3,
            4, 5, 6,
            7, 8, 9
        ]);

        const coordsToCheck = [
            ...Board.rowIndices(row),
            ...Board.columnIndices(column),
            ...Board.boxIndicesByCell(row, column),
        ];

        for (const [localRow, localColumn] of coordsToCheck) {
            const cell = this.cells[localRow][localColumn];
            if (cell.getValue() !== 0) {
                availableValues.delete(cell.getValue() as NonEmptyCellValue);
            }
        }

        return Array.from(availableValues);
    }

    private checkValues(indices: IterableIterator<Coords>): [boolean, Array<Coords>] {
        const valuePositions: Map<NonEmptyCellValue, Array<Coords>> = new Map();
        let seenDuplicates = false;

        for (const [row, column] of indices) {
            const value = this.cells[row][column].getValue();

            if (value === 0) {
                continue;
            }

            if (valuePositions.has(value)) {
                seenDuplicates = true;
                valuePositions.get(value)?.push([row, column]);
            } else {
                valuePositions.set(value, [[row, column]]);
            }

        }

        const badCoords = [...valuePositions.values()].filter(coordsArray => coordsArray.length > 1).flat();

        return [!seenDuplicates, badCoords];
    }

    checkRow(row: number) {
        return this.checkValues(Board.rowIndices(row));
    }

    checkColumn(column: number) {
        return this.checkValues(Board.columnIndices(column));
    }

    checkBox(boxRow: number, boxColumn: number) {
        return this.checkValues(Board.boxIndices(boxRow, boxColumn));

    }

    checkBoxByCell(cellRow: number, cellColumn: number) {
        return this.checkValues(Board.boxIndicesByCell(cellRow, cellColumn));
    }

    isSolved(): boolean {
        for (let i = 0; i < 9; i++) {
            if (!this.checkRow(i)[0] || !this.checkColumn(i)[0]) {
                return false;
            }

            const [x, y] = [Math.floor(i / 3), i % 3];

            if (!this.checkBox(x, y)[0]) {
                return false;
            }

            for (let j = 0; j < 9; j++) {
                if (this.cells[i][j].getValue() === 0) {
                    return false;
                }
            }
        }

        return true;
    }

    toString(): string {
        return this.cells.map(row => row.map(cell => (cell.getValue() !== 0 ? cell.getValue() : ' ')).join(' ')).join('\n');
    }

    clone(): Board {
        const clonedCells = this.cells.map(row => row.map(cell => cell.clone()));

        return new Board(clonedCells);
    }

    render(target: HTMLCell[][]): void {
        for (let i = 0; i < 9; i++) {
            for (let j = 0; j < 9; j++) {
                this.cells[i][j].render(target[i][j]);
            }
        }
    }

    private static isNumberMatrix(cells: Cell[][] | CellValue[][]): cells is CellValue[][] {
        return typeof cells[0][0] === 'number';
    }

    static *rowIndices(row: number): IterableIterator<Coords> {
        for (let column = 0; column < 9; column++) {
            yield [row, column];
        }
    }

    static *columnIndices(column: number): IterableIterator<Coords> {
        for (let row = 0; row < 9; row++) {
            yield [row, column];
        }
    }

    static *boxIndices(boxRow: number, boxColumn: number): IterableIterator<Coords> {
        const boxStartRow = boxRow * 3;
        const boxStartColumn = boxColumn * 3;

        for (let dx = 0; dx < 3; dx++) {
            for (let dy = 0; dy < 3; dy++) {
                yield [boxStartRow + dx, boxStartColumn + dy];
            }
        }
    }

    static *boxIndicesByCell(cellRow: number, cellColumn: number): IterableIterator<Coords>{
        const boxRow = Math.floor(cellRow / 3);
        const boxColumn = Math.floor(cellColumn / 3);

        yield* Board.boxIndices(boxRow, boxColumn);
    }

    // eslint-disable-next-line complexity
    private static backtrack<P extends BacktrackingPurpose>(board: Board, purpose: P): BacktrackingResult<P> {
        if (board.isSolved()) {
            let result;
            switch (purpose) {
                case 'puzzle-generation':
                    result = board;
                    break;

                case 'solution-count':
                    result = 1;
                    break;

                default:
                    result = [board.clone()];
            }

            return result as BacktrackingResult<P>;
        }

        let result;
        switch (purpose) {
            case 'puzzle-generation':
                result = undefined;
                break;

            case 'solution-count':
                result = 0;
                break;

            default:
                result = [];
        }

        for (let i = 0; i < 81; i++) {
            const row = Math.floor(i / 9);
            const column = i % 9;

            if (board.cells[row][column].getValue() !== 0) {
                continue;
            }

            let choices = board.choicesForCell(row, column);
            if (purpose === 'puzzle-generation') {
                choices = shuffle(choices);
            }

            for (const choice of choices) {
                board.cells[row][column].value = choice;

                const continuation = Board.backtrack(board, purpose);

                switch (purpose) {
                    case 'puzzle-generation':
                        if (continuation !== undefined) {
                            return continuation;
                        }
                        break;
                    case 'solution-count':
                        result = (result as number) + (continuation as number);
                        break;
                    default:
                        result = [...result as Array<Board>, ...continuation as Array<Board>];
                }
            }

            board.cells[row][column].value = 0;
            break;
        }

        return result as BacktrackingResult<P>;
    }

    static solve(board:Board): Array<Board> {
        return Board.backtrack(board, 'solution-list');
    }

    static getNumberOfSolutions(board: Board): number {
        return Board.backtrack(board, 'solution-count');
    }

    static generate(board: Board = new Board()): Board | undefined {
        return Board.backtrack(board, 'puzzle-generation');
    }

}

export declare type Difficulty = 'easy' | 'medium' | 'hard';

declare type WritingMode = 'value' | 'experimental-value' | 'notes';

class GameState extends State<GameState> implements Renderable {

    protected static ignoredFields = new Set<string>([
        'htmlCells',
        'notesButton',
        'experimentButton',
        'infoParagraph',
        ...State.ignoredFields,
    ]);

    static cutoffs: Record<Difficulty, [number, number, number]> = {
        easy: [40, 55, 1],
        medium: [55, 65, 2],
        hard: [65, 75, 4]
    };

    difficulty: Difficulty = 'easy';

    board: Board = new Board();

    solution: Board = new Board();

    numberOfSolutions = 0;

    isSolved = false;

    htmlCells: HTMLCell[][] = [];

    activeCell?: Cell;

    writingMode: WritingMode = 'value';

    notesButton?: HTMLButtonElement;

    experimentButton?: HTMLButtonElement;

    infoParagraph?: HTMLParagraphElement;

    protected serializeBoard() {
        return this.board.serialize();
    }

    protected deserializeBoard(value: any) {
        this.board.deserialize(value);
    }

    protected serializeSolution() {
        return this.solution.serialize();
    }

    protected deserializeSolution(value: any) {
        this.solution.deserialize(value);
    }

    restore(data: string) {
        this.deserialize(data);
        inFact(this.experimentButton !== undefined && this.notesButton !== undefined);
        switch (this.writingMode) {
            case 'experimental-value':
                if (!isToggledOn(this.experimentButton)) {
                    toggle(this.experimentButton);
                }
                break;
            case 'notes':
                if (!isToggledOn(this.notesButton)) {
                    toggle(this.notesButton);
                }

                break;
        }
    }

    setupHTML(cells: HTMLDivElement[], buttonPanel: HTMLDivElement, infoParagraph: HTMLParagraphElement) {
        this.infoParagraph = infoParagraph;

        const htmlCells = cells.map(cell => new HTMLCell(cell));

        const reshapedCells = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => htmlCells.slice(i * 9, (i * 9) + 9));
        reshapedCells.forEach((row, rowIndex) => {
            row.forEach((cell, columnIndex) => {
                cell.setCallback(() => void this.activateCell(rowIndex, columnIndex));
            });
        });

        this.htmlCells = reshapedCells;

        for (let i = 1; i <= 9; i++) {
            const setValueButton = buttonPanel.querySelector(`button.set-value[data-value="${i}"]`);
            inFact(setValueButton !== null);

            setValueButton.addEventListener(
                'click',
                () => void this.setActiveCellValue(i as CellValue)
            );
        }

        const eraseButton = buttonPanel.querySelector<HTMLButtonElement>('.erase');
        inFact(eraseButton !== null);
        eraseButton.addEventListener(
            'click',
            () => void this.setActiveCellValue(0)
        );

        const notesButton = buttonPanel.querySelector<HTMLButtonElement>('.notes');
        inFact(notesButton !== null);
        this.notesButton = notesButton;
        notesButton.addEventListener(
            'click',
            () => void this.toggleNotesMode()
        );

        const hintButton = buttonPanel.querySelector<HTMLButtonElement>('.hint');
        inFact(hintButton !== null);
        hintButton.addEventListener(
            'click',
            () => void this.addHint()
        );

        const experimentButton = buttonPanel.querySelector<HTMLButtonElement>('.experiment');
        inFact(experimentButton !== null);
        this.experimentButton = experimentButton;
        experimentButton.addEventListener(
            'click',
            () => void this.toggleExperimentalMode()
        );

        document.addEventListener(
            'keydown',
            // eslint-disable-next-line complexity
            (event: KeyboardEvent) => {
                for (let i = 1; i < 10; i++) {
                    if (event.key === i.toString()) {
                        this.setActiveCellValue(i as CellValue);
                        return;
                    }
                }

                let [dx, dy] = [0, 0];

                switch(event.key) {
                    case 'Backspace':
                        this.setActiveCellValue(0);
                        return;
                    case 'h':
                        this.addHint();
                        return;
                    case 'n':
                        this.toggleNotesMode();
                        return;
                    case 'e':
                        this.toggleExperimentalMode();
                        return;
                    case 'ArrowUp':
                        dx = -1;
                        break;
                    case 'ArrowDown':
                        dx += 1;
                        break;
                    case 'ArrowLeft':
                        dy = -1;
                        break;
                    case 'ArrowRight':
                        dy += 1;
                        break;
                }

                if (dx === 0 && dy === 0) {
                    return;
                }

                if (this.activeCell === undefined) {
                    this.activateCell(0, 0);
                    return;
                }

                this.activateCell(this.activeCell.row + dx, this.activeCell.column + dy);
            }
        );
    }

    toggleNotesMode() {
        const shouldTurnOn = this.writingMode !== 'notes';
        inFact(this.notesButton !== undefined);
        inFact(this.experimentButton !== undefined);

        if (shouldTurnOn) {
            this.writingMode = 'notes';

            if (!isToggledOn(this.notesButton)) {
                toggle(this.notesButton);
            }

            if (isToggledOn(this.experimentButton)) {
                toggle(this.experimentButton);
            }

            return;
        }

        this.writingMode = 'value';
        if (isToggledOn(this.notesButton)) {
            toggle(this.notesButton);
        }
    }

    toggleExperimentalMode() {
        const shouldTurnOn = this.writingMode !== 'experimental-value';
        inFact(this.notesButton !== undefined);
        inFact(this.experimentButton !== undefined);

        if (shouldTurnOn) {
            this.writingMode = 'experimental-value';

            if (!isToggledOn(this.experimentButton)) {
                toggle(this.experimentButton);
            }

            if (isToggledOn(this.notesButton)) {
                toggle(this.notesButton);
            }

            return;
        }

        const realActiveCell = this.activeCell;
        const cellsToRestore: Array<Cell> = [];
        for (let i = 0; i < 9; i++) {
            for (let j = 0; j < 9; j++) {
                const cell = this.board.cells[i][j];

                if (cell.experimentalValue === 0) {
                    continue;
                }

                cellsToRestore.push(cell);
            }
        }

        let i = 0;
        const intervalId = setInterval(() => {
            if (i === cellsToRestore.length) {
                clearInterval(intervalId);
                this.writingMode = 'value';
                if (realActiveCell !== undefined) {
                    this.activateCell(realActiveCell.row, realActiveCell.column);
                }
                return;
            }

            const cell = cellsToRestore[i];
            i++;

            this.activateCell(cell.row, cell.column);
            this.setActiveCellValue(0);
        }, 150);

        if (isToggledOn(this.experimentButton)) {
            toggle(this.experimentButton);
        }
    }

    addHint() {
        THE_LOOP:
        for(let i = 0; i < 9; i++) {
            for (let j = 0; j < 9; j++) {
                const cell = this.board.cells[i][j];
                if (cell.isLocked || cell.isHinted) {
                    continue;
                }

                if (cell.getValue() !== 0) {
                    if (cell.getValue() !== this.solution.cells[i][j].getValue()) {
                        cell.isHinted = true;
                        break THE_LOOP;
                    }

                    continue;
                }

                if (this.board.choicesForCell(i, j).length === 1) {
                    cell.isHinted = true;
                    break THE_LOOP;
                }
            }
        }

        this.notifyListeners();
    }

    activateCell(row: number, column: number) {
        if (this.isSolved) {
            return;
        }

        if (row < 0 || row > 8 || column < 0 || column > 8) {
            return;
        }

        const activeCell = this.board.cells[row][column];
        const hasValue = activeCell.getValue() !== 0;

        const coordsToSelect = new Set([
            ...Board.rowIndices(row),
            ...Board.columnIndices(column),
            ...Board.boxIndicesByCell(row, column),
        ].map(([x, y]) => `${x}${y}`));

        for (let i = 0; i < 9; i++) {
            for (let j = 0; j < 9; j++) {
                const cell = this.board.cells[i][j];
                cell.isActive = false;

                if (coordsToSelect.has(`${i}${j}`)) {
                    cell.selection = 'by-position';
                    continue;
                }

                if (hasValue && cell.getValue() === activeCell.getValue()) {
                    cell.selection = 'by-value';
                    continue;
                }

                cell.selection = 'not-selected';
            }
        }

        activeCell.selection = 'not-selected';
        activeCell.isActive = true;
        this.activeCell = activeCell;
    }

    deactivateCells() {
        for (let i = 0; i < 9; i++) {
            for (let j = 0; j < 9; j++) {
                const cell = this.board.cells[i][j];
                cell.selection = 'not-selected';
            }
        }

        if (this.activeCell === undefined) {
            return;
        }

        this.activeCell.isActive = false;
        this.activeCell = undefined;
    }

    // eslint-disable-next-line complexity
    setActiveCellValue(value: CellValue) {
        if (this.activeCell === undefined || this.activeCell.isLocked) {
            return;
        }

        switch (this.writingMode) {
            case 'value':
                this.activeCell.value = value;
                break;
            case 'experimental-value':
                this.activeCell.experimentalValue = value;
                break;
            case 'notes':
                if (value === 0) {
                    return;
                }
                this.activeCell.toggleNote(value);
                break;
        }
        this.activateCell(this.activeCell.row, this.activeCell.column);

        if (value !== 0 && this.board.isSolved()) {
            this.isSolved = true;
            this.deactivateCells();

            const pulsed = new Set<Cell>();

            const intervalId = setInterval(() => {
                if (pulsed.size === 81) {
                    clearInterval(intervalId);
                    return;
                }

                const newSet = new Set<Cell>();

                const numberOfCells = Math.min(Math.floor(Math.random() * 7) + 3, 81 - pulsed.size);

                while(newSet.size < numberOfCells) {
                    const [row, column] = [Math.floor(Math.random() * 9), Math.floor(Math.random() * 9)];
                    const cell = this.board.cells[row][column];
                    if (pulsed.has(cell) || newSet.has(cell)) {
                        continue;
                    }

                    newSet.add(cell);
                }


                for (const cell of newSet) {
                    cell.isSolved = true;
                    const turnOffDelay = Math.floor(Math.random() * 300) + 700;
                    pulsed.add(cell);

                    setTimeout(() => {
                        cell.isSolved = false;
                        cell.isLocked = true;

                        this.notifyListeners();
                    }, turnOffDelay);
                }

                // render separately for animation
                this.notifyListeners();

            }, 40);

            return;
        }

        const conflictingPositions = new Set();

        for (let i = 0; i < 9; i++) {
            const [rowStatus, rowPositions] = this.board.checkRow(i);
            if (!rowStatus) {
                for (const [row, column] of rowPositions) {
                    conflictingPositions.add(`${row}${column}`);
                }
            }

            const [columnStatus, columnPositions] = this.board.checkColumn(i);
            if (!columnStatus) {
                for (const [row, column] of columnPositions) {
                    conflictingPositions.add(`${row}${column}`);
                }
            }

            const [x, y] = [Math.floor(i / 3), i % 3];
            const [boxStatus, boxPositions] = this.board.checkBox(x, y);
            if (!boxStatus) {
                for (const [row, column] of boxPositions) {
                    conflictingPositions.add(`${row}${column}`);
                }
            }
        }

        for (let i = 0; i < 9; i++) {
            for (let j = 0; j < 9; j++) {
                this.board.cells[i][j].isConflicting = conflictingPositions.has(`${i}${j}`);
            }
        }

        this.notifyListeners();
    }

    render() {
        if (this.infoParagraph !== undefined){
            this.infoParagraph.innerHTML = `Difficulty: ${this.difficulty}<br />Number of solutions: ${this.numberOfSolutions}`;
        }
        this.board.render(this.htmlCells);
    }

}

const gameState = new GameState();

const storageKey = 'current-game';

gameState.addListener(() => {
    if (gameState.isSolved) {
        localStorage.removeItem(storageKey);
    } else {
        localStorage.setItem(storageKey, gameState.serialize());
    }

    gameState.render();
});

export function setup(cells: HTMLDivElement[], buttonPanel: HTMLDivElement, infoParagraph: HTMLParagraphElement) {
    gameState.silent(() => {
        gameState.setupHTML(cells, buttonPanel, infoParagraph);
    });
}

export function generateGame(difficulty: Difficulty) {
    gameState.atomic(() => {
        gameState.difficulty = difficulty;

        let board;
        do {
            board = Board.generate();
        } while(board === undefined);

        gameState.solution = board.clone();

        const cutoffRange = GameState.cutoffs[difficulty];
        const cutoff = Math.floor(Math.random() * (cutoffRange[1] - cutoffRange[0])) + cutoffRange[0];
        const maxNumberOfSolutions = cutoffRange[2];
        let currentCutoff = 0;

        while(currentCutoff < cutoff) {
            const [randomRow, randomColumn] = [Math.floor(Math.random() * 9), Math.floor(Math.random() * 9)];
            const value = board.cells[randomRow][randomColumn].getValue();
            board.cells[randomRow][randomColumn].value = 0;
            if (Board.getNumberOfSolutions(board) > maxNumberOfSolutions) {
                currentCutoff--;
                board.cells[randomRow][randomColumn].value = value;
            }

            currentCutoff++;
        }

        gameState.numberOfSolutions = Board.getNumberOfSolutions(board.clone());

        board.cells.forEach(row => {
            row.forEach(cell => {
                if (cell.getValue() !== 0) {
                    cell.isLocked = true;
                }
            });
        });

        gameState.board = board;
    });
}

export function restoreLastGame(): boolean {
    const potentialGame = localStorage.getItem(storageKey);

    if (potentialGame === null) {
        return false;
    }

    gameState.restore(potentialGame);

    return true;
}

export function cleanUp() {
    localStorage.removeItem(storageKey);
}
