export class PreviewPlayer {
    constructor(audioManager, visualizer, canvas) {
        this.audioManager = audioManager;
        this.visualizer = visualizer;
        this.canvas = canvas;
        this.isPlaying = false;
        this.currentTime = 0;
        this.audioSource = null;
        this.analyser = null;
        this.audioContext = null;
        this.startTime = 0;
        this.pausedTime = 0;
        this.animationId = null;
        this.dataArray = null;
    }

    play(backgroundImage, customTexts) {
        if (this.isPlaying) return;

        const audioBuffer = this.audioManager.getAudioBuffer();
        if (!audioBuffer) {
            alert("Please load an audio file first");
            return;
        }

        // Create or reuse audio context
        if (!this.audioContext) {
            this.audioContext = this.audioManager.audioContext || new (window.AudioContext || window.webkitAudioContext)();
        }

        this.audioSource = this.audioContext.createBufferSource();
        this.audioSource.buffer = audioBuffer;

        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 2048;
        this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);

        this.audioSource.connect(this.analyser);
        this.analyser.connect(this.audioContext.destination);

        this.isPlaying = true;
        this.startTime = this.audioContext.currentTime - this.pausedTime;
        this.audioSource.start(0, this.pausedTime);

        const textsArray = Array.isArray(customTexts) ? customTexts : [];

        const render = () => {
            if (!this.isPlaying) return;

            this.currentTime = this.audioContext.currentTime - this.startTime;
            this.analyser.getByteFrequencyData(this.dataArray);

            this.visualizer.drawFrame(
                this.canvas.getContext("2d"),
                this.canvas.width,
                this.canvas.height,
                this.dataArray,
                backgroundImage,
                textsArray
            );

            if (this.currentTime < audioBuffer.duration) {
                this.animationId = requestAnimationFrame(render);
            } else {
                this.stop();
            }
        };

        render();
    }

    pause() {
        if (!this.isPlaying) return;

        this.isPlaying = false;
        this.pausedTime = this.currentTime;

        if (this.audioSource) {
            this.audioSource.stop();
        }

        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
    }

    stop() {
        this.pause();
        this.currentTime = 0;
        this.pausedTime = 0;
    }

    seek(time) {
        const audioBuffer = this.audioManager.getAudioBuffer();
        if (!audioBuffer) return;

        this.pausedTime = Math.max(0, Math.min(time, audioBuffer.duration));
        this.currentTime = this.pausedTime;

        if (this.isPlaying) {
            this.pause();
            this.play(this.lastBackgroundImage, this.lastCustomTexts);
        }
    }

    setRenderData(backgroundImage, customTexts) {
        this.lastBackgroundImage = backgroundImage;
        this.lastCustomTexts = customTexts;
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
