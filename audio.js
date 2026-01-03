export class AudioAnalyzer {
    constructor(audioContext, fftSize = 4096) {
        this.audioContext = audioContext;
        this.analyser = audioContext.createAnalyser();
        this.analyser.fftSize = fftSize;
        this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    }

    getFrequencyData() {
        this.analyser.getByteFrequencyData(this.dataArray);
        return this.dataArray;
    }

    getAnalyser() {
        return this.analyser;
    }
}

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

    createAnalyzer(fftSize = 2048) {
        return new AudioAnalyzer(this.audioContext, fftSize);
    }

    createSource() {
        const source = this.audioContext.createBufferSource();
        source.buffer = this.audioBuffer;
        return source;
    }
}
