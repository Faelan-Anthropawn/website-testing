export class AudioManager {
    constructor() {
        this.audioBuffer = null;
        this.audioContext = null;
    }

    async loadAudioFromFile(file) {
        const buf = await file.arrayBuffer();
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.audioBuffer = await this.audioContext.decodeAudioData(buf);
        return this.audioBuffer;
    }

    getAudioBuffer() {
        return this.audioBuffer;
    }

    getDuration() {
        return this.audioBuffer ? this.audioBuffer.duration : 0;
    }

    createAnalyser(fftSize = 256) {
        const analyser = this.audioContext.createAnalyser();
        analyser.fftSize = fftSize;
        return analyser;
    }

    createSource() {
        const source = this.audioContext.createBufferSource();
        source.buffer = this.audioBuffer;
        return source;
    }
}
