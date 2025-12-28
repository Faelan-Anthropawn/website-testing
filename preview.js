export class PreviewPlayer {
    constructor(audioManager, visualizer, canvas) {
        this.audioManager = audioManager;
        this.visualizer = visualizer;
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");

        this.audioContext = null;
        this.source = null;
        this.analyser = null;
        this.dataArray = null;

        this.isPlaying = false;
        this.startTime = 0;
        this.pausedTime = 0;
        this.currentTime = 0;
        this.rafId = null;

        this.backgroundImage = null;
        this.customTexts = [];
    }

    ensureContext() {
        if (!this.audioContext) {
            this.audioContext =
                this.audioManager.audioContext ||
                new (window.AudioContext || window.webkitAudioContext)();
        }
    }

    play(backgroundImage, customTexts) {
        if (this.isPlaying) return;

        const buffer = this.audioManager.getAudioBuffer();
        if (!buffer) return;

        this.backgroundImage = backgroundImage;
        this.customTexts = Array.isArray(customTexts) ? customTexts : [];

        this.ensureContext();

        this.source = this.audioContext.createBufferSource();
        this.source.buffer = buffer;

        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 2048;

        if (!this.dataArray || this.dataArray.length !== this.analyser.frequencyBinCount) {
            this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
        }

        this.source.connect(this.analyser);
        this.analyser.connect(this.audioContext.destination);

        this.startTime = this.audioContext.currentTime - this.pausedTime;
        this.source.start(0, this.pausedTime);

        this.isPlaying = true;

        const render = () => {
            if (!this.isPlaying) return;

            this.currentTime = this.audioContext.currentTime - this.startTime;

            if (this.currentTime >= buffer.duration) {
                this.stop();
                return;
            }

            const hasVisualizer = this.customTexts.some(el => el?.type === "visualizer");
            if (hasVisualizer) {
                this.analyser.getByteFrequencyData(this.dataArray);
            }

            this.visualizer.drawFrame(
                this.ctx,
                this.canvas.width,
                this.canvas.height,
                hasVisualizer ? this.dataArray : null,
                this.backgroundImage,
                this.customTexts
            );

            this.rafId = requestAnimationFrame(render);
        };

        this.rafId = requestAnimationFrame(render);
    }

    pause() {
        if (!this.isPlaying) return;

        this.isPlaying = false;
        this.pausedTime = this.currentTime;

        if (this.rafId) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }

        if (this.source) {
            try { this.source.stop(); } catch {}
            this.source.disconnect();
            this.source = null;
        }

        if (this.analyser) {
            this.analyser.disconnect();
            this.analyser = null;
        }
    }

    stop() {
        this.pause();
        this.currentTime = 0;
        this.pausedTime = 0;
    }

    seek(time) {
        const buffer = this.audioManager.getAudioBuffer();
        if (!buffer) return;

        const clamped = Math.max(0, Math.min(time, buffer.duration));
        this.currentTime = clamped;
        this.pausedTime = clamped;

        if (this.isPlaying) {
            this.pause();
            this.play(this.backgroundImage, this.customTexts);
        }
    }

    setRenderData(backgroundImage, customTexts) {
        this.backgroundImage = backgroundImage;
        this.customTexts = Array.isArray(customTexts) ? customTexts : [];
    }

    getCurrentTime() {
        return this.currentTime;
    }

    getDuration() {
        return this.audioManager.getDuration();
    }

    getIsPlaying() {
        return this.isPlaying;
    }
}
