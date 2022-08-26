export function inFact(condition: boolean, message?: string): asserts condition{
    if (condition) {
        return;
    }

    const errorMessage = message || 'condition did not hold';
    throw new Error(errorMessage);
}
