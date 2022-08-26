import { watch } from 'chokidar';
import { exec } from 'child_process';

const supportedFormats = {
    html: /.+\.html/,
    sass: [/.+\.sass/, /.+\.scss/],
    ts: /.+\.ts/,
    static: /static\/.+/
};

/**
 * @typedef {keyof typeof supportedFormats | undefined} SourceCodeChangeType
 */

/**
 * @param {String} path
 *
 * @returns {SourceCodeChangeType}
 */
function getChangeType(path) {
    for (const [type, mappings] of Object.entries(supportedFormats)) {
        let extensions = mappings;
        if (!Array.isArray(mappings)) {
            extensions = [mappings];
        }

        for (const extensionRegex of extensions) {
            if (path.match(extensionRegex)) {
                return type;
            }
        }
    }

    return undefined;
}

watch('./src/**/*', {
    ignoreInitial: true
}).on(
    'all',
    // eslint-disable-next-line complexity
    function(_, path) {
        const changeType = getChangeType(path);

        if (changeType === undefined) {
            return;
        }

        const npmCommand = `dev:${changeType}`;

        exec(`npm run ${npmCommand}`, function(error) {
            if (error) {
                console.error(error);
            }
        });
    }
);
