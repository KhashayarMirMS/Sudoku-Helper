/* eslint-disable new-cap */
import { inFact } from 'utils/in-fact';

declare global {
    const cv: any;
}

function isNearZeroOr90Degrees(radians: number): boolean {
    const degrees = radians * 180 / Math.PI;
    for (const milestone of [0, 90, 180]) {
        if (Math.abs(degrees - milestone) < 5) {
            return true;
        }
    }

    return false;
}

export default async function initialize() {
    const startButton = document.querySelector<HTMLButtonElement>('#start-scan');
    inFact(startButton !== null);
    const video = document.querySelector<HTMLVideoElement>('#camera-video');
    inFact(video !== null);
    const canvas = document.querySelector<HTMLCanvasElement>('#output');
    inFact(canvas !== null);
    const { width: canvasWidth, height: canvasHeight } = canvas.getBoundingClientRect();
    [canvas.width, canvas.height] = [canvasWidth, canvasHeight];
    const ctx = canvas.getContext('2d');

    let playing = false;
    let stream: MediaStream | undefined = undefined;

    function showFrame() {
        inFact(canvas !== null && ctx !== null && video !== null);
        const { width, height } = video.getBoundingClientRect();
        const canvasSize = (0.7 * width);
        const startX = (canvasSize - width) / 2;
        const startY = (canvasSize - height) / 2;
        ctx.drawImage(video, startX, startY);

        const src = cv.imread(canvas);
        const copy = src.clone();

        cv.cvtColor(copy, copy, cv.COLOR_RGBA2GRAY, 0);
        cv.Canny(copy, copy, 200, 400);
        // You can try more different parameters
        const lines = new cv.Mat();
        cv.HoughLines(copy, lines, 1, Math.PI / 180, 80, 0, 0, 0, Math.PI);

        for (let i = 0; i < lines.rows; ++i) {
            const rho = lines.data32F[i * 2];
            const theta = lines.data32F[(i * 2) + 1];

            if (!isNearZeroOr90Degrees(theta)) {
                continue;
            }

            const a = Math.cos(theta);
            const b = Math.sin(theta);
            const x0 = a * rho;
            const y0 = b * rho;
            const startPoint = { x: x0 - (1000 * b), y: y0 + (1000 * a) };
            const endPoint = { x: x0 + (1000 * b), y: y0 - (1000 * a) };
            cv.line(src, startPoint, endPoint, [255, 0, 0, 255], 1);
        }
        cv.imshow(canvas, src);
        src.delete();
        copy.delete();
        lines.delete();


        if (playing) {
            requestAnimationFrame(showFrame);
        }
    }


    startButton.addEventListener('click', async() => {
        if (playing) {
            video.pause();
            playing = false;
            return;
        }

        playing = true;

        if (stream === undefined) {
            // eslint-disable-next-line require-atomic-updates
            stream = await navigator.mediaDevices.getUserMedia({
                audio: false,
                video: {
                    facingMode: 'environment'
                }
            });

            video.srcObject = stream;
        }

        video.play();
        requestAnimationFrame(showFrame);

    });
}
