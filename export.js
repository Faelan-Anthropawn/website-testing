export class ExportManager {
    constructor(audioManager, visualizer) {
        this.audioManager = audioManager;
        this.visualizer = visualizer;
    }

    async renderVideo(width, height, fps, backgroundImage, customTexts, songName) {
        const audioBuffer = this.audioManager.getAudioBuffer();
        if (!audioBuffer) {
            throw new Error("No audio buffer loaded");
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");

        const audioCtx = new AudioContext();

        const source = audioCtx.createBufferSource();
        source.buffer = audioBuffer;

        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 2048;

        const dest = audioCtx.createMediaStreamDestination();

        source.connect(analyser);
        analyser.connect(dest);
        source.connect(audioCtx.destination); // audio playback only

        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        const videoStream = canvas.captureStream(fps);
        videoStream.addTrack(dest.stream.getAudioTracks()[0]);

        const recorder = new MediaRecorder(videoStream, {
            mimeType: "video/webm; codecs=vp9,opus",
            videoBitsPerSecond: 12_000_000
        });

        const chunks = [];
        recorder.ondataavailable = e => chunks.push(e.data);

        const textsArray = Array.isArray(customTexts) ? customTexts : [];
        const hasVisualizer = textsArray.some(el => el.type === "visualizer");

        recorder.start();
        source.start();

        const startTime = audioCtx.currentTime;
        const duration = audioBuffer.duration;

        // --- fixed timestep rendering ---
        const frameDuration = 1 / fps;
        let lastFrameTime = 0;

        return new Promise((resolve, reject) => {
            const render = () => {
                const t = audioCtx.currentTime - startTime;

                if (t - lastFrameTime >= frameDuration) {
                    lastFrameTime += frameDuration;

                    if (hasVisualizer) {
                        analyser.getByteFrequencyData(dataArray);
                    }

                    this.visualizer.drawFrame(
                        ctx,
                        width,
                        height,
                        hasVisualizer ? dataArray : null,
                        backgroundImage,
                        textsArray
                    );
                }

                if (t <= duration + frameDuration) {
                    requestAnimationFrame(render);
                } else {
                    recorder.stop();
                }
            };

            recorder.onstop = () => {
                const blob = new Blob(chunks, { type: "video/webm" });
                resolve(blob);
            };

            recorder.onerror = e => {
                reject(new Error("Render failed: " + e.error));
            };

            render();
        });
    }

    downloadVideo(blob, songName) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${songName || "audio"}.webm`;
        a.click();
        URL.revokeObjectURL(url);
    }
}
