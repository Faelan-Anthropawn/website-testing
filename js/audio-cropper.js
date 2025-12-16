let cropperAudioFile = null;
let cropperAudioBuffer = null;
let cropperAudioContext = null;
let cropperSourceNode = null;
let cropperGainNode = null;
let isPlaying = false;
let playStartTime = 0;
let playOffset = 0;
let animationFrameId = null;
let selectionStart = 0;
let selectionEnd = 0;
let zoomLevel = 1;
let waveformData = null;

const dropZone = document.getElementById('cropper-drop-zone');
const fileInput = document.getElementById('cropper-file-input');
const browseButton = document.getElementById('cropper-browse-button');
const fileNameDisplay = document.getElementById('cropper-file-name');
const editorSection = document.getElementById('cropper-editor');
const waveformCanvas = document.getElementById('cropper-waveform');
const waveformContainer = document.getElementById('cropper-waveform-container');
const selectionDiv = document.getElementById('cropper-selection');
const playheadDiv = document.getElementById('cropper-playhead');
const timeStartDisplay = document.getElementById('cropper-time-start');
const timeEndDisplay = document.getElementById('cropper-time-end');
const playBtn = document.getElementById('cropper-play-btn');
const stopBtn = document.getElementById('cropper-stop-btn');
const currentTimeDisplay = document.getElementById('cropper-current-time');
const durationDisplay = document.getElementById('cropper-duration');
const seekSlider = document.getElementById('cropper-seek');
const selStartInput = document.getElementById('cropper-sel-start');
const selEndInput = document.getElementById('cropper-sel-end');
const selectAllBtn = document.getElementById('cropper-select-all');
const clearSelectionBtn = document.getElementById('cropper-clear-selection');
const playSelectionBtn = document.getElementById('cropper-play-selection');
const fadeInToggle = document.getElementById('cropper-fade-in-toggle');
const fadeOutToggle = document.getElementById('cropper-fade-out-toggle');
const fadeInControls = document.getElementById('cropper-fade-in-controls');
const fadeOutControls = document.getElementById('cropper-fade-out-controls');
const fadeInDuration = document.getElementById('cropper-fade-in-duration');
const fadeOutDuration = document.getElementById('cropper-fade-out-duration');
const previewFadeInBtn = document.getElementById('cropper-preview-fade-in');
const previewFadeOutBtn = document.getElementById('cropper-preview-fade-out');
const outputNameInput = document.getElementById('cropper-output-name');
const outputFormatSelect = document.getElementById('cropper-output-format');
const saveSelectionBtn = document.getElementById('cropper-save-selection');
const removeSelectionBtn = document.getElementById('cropper-remove-selection');
const statusMessage = document.getElementById('cropper-status-message');
const consoleBox = document.getElementById('cropper-console-box');
const zoomInBtn = document.getElementById('cropper-zoom-in');
const zoomOutBtn = document.getElementById('cropper-zoom-out');
const helpButton = document.getElementById('cropper-help-button');

function getTimestamp() {
    const now = new Date();
    return now.toLocaleTimeString('en-US', { hour12: false });
}

function logToConsole(message, type = 'info') {
    const entry = document.createElement('div');
    entry.className = 'console-entry';
    
    const timestamp = document.createElement('span');
    timestamp.className = 'console-timestamp';
    timestamp.textContent = `[${getTimestamp()}]`;
    
    const text = document.createElement('span');
    text.textContent = message;
    
    if (type === 'error') text.style.color = '#ef4444';
    else if (type === 'success') text.style.color = '#22c55e';
    else if (type === 'info') text.style.color = '#3b82f6';
    
    entry.appendChild(timestamp);
    entry.appendChild(text);
    consoleBox.appendChild(entry);
    consoleBox.scrollTop = consoleBox.scrollHeight;
}

function clearConsole() {
    consoleBox.innerHTML = '';
}

function showStatus(message, type = 'info') {
    statusMessage.textContent = message;
    statusMessage.className = 'status-badge ' + type;
}

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
}

function parseTime(timeStr) {
    const match = timeStr.match(/(\d+):(\d+)\.?(\d*)/);
    if (!match) return 0;
    const mins = parseInt(match[1]) || 0;
    const secs = parseInt(match[2]) || 0;
    const ms = parseInt(match[3].padEnd(3, '0')) || 0;
    return mins * 60 + secs + ms / 1000;
}

async function handleFileSelect(file) {
    if (!file) return;
    
    const ext = file.name.toLowerCase();
    if (!ext.endsWith('.mp3') && !ext.endsWith('.wav')) {
        showStatus('Please select a valid audio file (.mp3 or .wav)', 'error');
        return;
    }
    
    cropperAudioFile = file;
    fileNameDisplay.textContent = file.name;
    
    if (!outputNameInput.value) {
        const baseName = file.name.replace(/\.(mp3|wav)$/i, '');
        outputNameInput.value = baseName + '_cropped';
    }
    
    showStatus('Loading audio file...', 'info');
    logToConsole('Loading: ' + file.name, 'info');
    
    try {
        const arrayBuffer = await file.arrayBuffer();
        cropperAudioContext = new (window.AudioContext || window.webkitAudioContext)();
        cropperAudioBuffer = await cropperAudioContext.decodeAudioData(arrayBuffer);
        
        selectionStart = 0;
        selectionEnd = cropperAudioBuffer.duration;
        
        updateTimeDisplays();
        generateWaveformData();
        drawWaveform();
        
        editorSection.classList.remove('hidden');
        showStatus('Audio loaded: ' + formatTime(cropperAudioBuffer.duration), 'success');
        logToConsole('Loaded successfully. Duration: ' + formatTime(cropperAudioBuffer.duration), 'success');
        logToConsole('Channels: ' + cropperAudioBuffer.numberOfChannels + ', Sample Rate: ' + cropperAudioBuffer.sampleRate + ' Hz', 'info');
    } catch (error) {
        showStatus('Error loading audio: ' + error.message, 'error');
        logToConsole('Error: ' + error.message, 'error');
    }
}

function generateWaveformData() {
    if (!cropperAudioBuffer) return;
    
    const channelData = cropperAudioBuffer.getChannelData(0);
    const samples = 2000;
    const blockSize = Math.floor(channelData.length / samples);
    waveformData = new Float32Array(samples);
    
    for (let i = 0; i < samples; i++) {
        let sum = 0;
        for (let j = 0; j < blockSize; j++) {
            sum += Math.abs(channelData[i * blockSize + j]);
        }
        waveformData[i] = sum / blockSize;
    }
}

function drawWaveform() {
    if (!waveformData || !waveformCanvas) return;
    
    const ctx = waveformCanvas.getContext('2d');
    const width = waveformContainer.clientWidth;
    const height = waveformContainer.clientHeight;
    
    waveformCanvas.width = width;
    waveformCanvas.height = height;
    
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);
    
    const samplesPerPixel = waveformData.length / (width * zoomLevel);
    const centerY = height / 2;
    
    ctx.fillStyle = '#6366f1';
    
    for (let x = 0; x < width; x++) {
        const startSample = Math.floor(x * samplesPerPixel);
        const endSample = Math.floor((x + 1) * samplesPerPixel);
        
        let max = 0;
        for (let i = startSample; i < endSample && i < waveformData.length; i++) {
            if (waveformData[i] > max) max = waveformData[i];
        }
        
        const barHeight = max * height * 0.8;
        ctx.fillRect(x, centerY - barHeight / 2, 1, barHeight);
    }
    
    updateSelectionDisplay();
}

function updateTimeDisplays() {
    if (!cropperAudioBuffer) return;
    
    timeStartDisplay.textContent = formatTime(0);
    timeEndDisplay.textContent = formatTime(cropperAudioBuffer.duration);
    durationDisplay.textContent = formatTime(cropperAudioBuffer.duration);
    selStartInput.value = formatTime(selectionStart);
    selEndInput.value = formatTime(selectionEnd);
}

function updateSelectionDisplay() {
    if (!cropperAudioBuffer || !waveformContainer) return;
    
    const width = waveformContainer.clientWidth;
    const duration = cropperAudioBuffer.duration;
    
    const startX = (selectionStart / duration) * width;
    const endX = (selectionEnd / duration) * width;
    
    selectionDiv.style.left = startX + 'px';
    selectionDiv.style.width = (endX - startX) + 'px';
    selectionDiv.classList.remove('hidden');
}

function updatePlayhead() {
    if (!cropperAudioBuffer || !isPlaying) return;
    
    const currentTime = playOffset + (cropperAudioContext.currentTime - playStartTime);
    const width = waveformContainer.clientWidth;
    const x = (currentTime / cropperAudioBuffer.duration) * width;
    
    playheadDiv.style.left = x + 'px';
    currentTimeDisplay.textContent = formatTime(currentTime);
    seekSlider.value = (currentTime / cropperAudioBuffer.duration) * 100;
    
    if (currentTime < cropperAudioBuffer.duration) {
        animationFrameId = requestAnimationFrame(updatePlayhead);
    } else {
        stopPlayback();
    }
}

function startPlayback(startTime = 0, endTime = null, fadeIn = 0, fadeOut = 0) {
    if (!cropperAudioBuffer) return;
    
    stopPlayback();
    
    const duration = endTime ? endTime - startTime : cropperAudioBuffer.duration - startTime;
    
    cropperSourceNode = cropperAudioContext.createBufferSource();
    cropperSourceNode.buffer = cropperAudioBuffer;
    
    cropperGainNode = cropperAudioContext.createGain();
    cropperSourceNode.connect(cropperGainNode);
    cropperGainNode.connect(cropperAudioContext.destination);
    
    if (fadeIn > 0) {
        cropperGainNode.gain.setValueAtTime(0, cropperAudioContext.currentTime);
        cropperGainNode.gain.linearRampToValueAtTime(1, cropperAudioContext.currentTime + fadeIn);
    }
    
    if (fadeOut > 0) {
        cropperGainNode.gain.setValueAtTime(1, cropperAudioContext.currentTime + duration - fadeOut);
        cropperGainNode.gain.linearRampToValueAtTime(0, cropperAudioContext.currentTime + duration);
    }
    
    cropperSourceNode.start(0, startTime, duration);
    cropperSourceNode.onended = () => {
        if (isPlaying) stopPlayback();
    };
    
    playStartTime = cropperAudioContext.currentTime;
    playOffset = startTime;
    isPlaying = true;
    
    playBtn.innerHTML = '<span class="material-symbols-outlined text-2xl">pause</span>';
    animationFrameId = requestAnimationFrame(updatePlayhead);
}

function stopPlayback() {
    if (cropperSourceNode) {
        try {
            cropperSourceNode.stop();
        } catch (e) {}
        cropperSourceNode = null;
    }
    
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
    
    isPlaying = false;
    playBtn.innerHTML = '<span class="material-symbols-outlined text-2xl">play_arrow</span>';
}

function extractSelection(keepSelection) {
    if (!cropperAudioBuffer) return null;
    
    const sampleRate = cropperAudioBuffer.sampleRate;
    const channels = cropperAudioBuffer.numberOfChannels;
    const startSample = Math.floor(selectionStart * sampleRate);
    const endSample = Math.floor(selectionEnd * sampleRate);
    
    let newLength, newBuffer;
    
    if (keepSelection) {
        newLength = endSample - startSample;
        newBuffer = cropperAudioContext.createBuffer(channels, newLength, sampleRate);
        
        for (let ch = 0; ch < channels; ch++) {
            const sourceData = cropperAudioBuffer.getChannelData(ch);
            const destData = newBuffer.getChannelData(ch);
            for (let i = 0; i < newLength; i++) {
                destData[i] = sourceData[startSample + i];
            }
        }
    } else {
        const beforeLength = startSample;
        const afterLength = cropperAudioBuffer.length - endSample;
        newLength = beforeLength + afterLength;
        
        if (newLength <= 0) return null;
        
        newBuffer = cropperAudioContext.createBuffer(channels, newLength, sampleRate);
        
        for (let ch = 0; ch < channels; ch++) {
            const sourceData = cropperAudioBuffer.getChannelData(ch);
            const destData = newBuffer.getChannelData(ch);
            
            for (let i = 0; i < beforeLength; i++) {
                destData[i] = sourceData[i];
            }
            for (let i = 0; i < afterLength; i++) {
                destData[beforeLength + i] = sourceData[endSample + i];
            }
        }
    }
    
    return newBuffer;
}

function applyFades(buffer, fadeInSecs, fadeOutSecs) {
    const sampleRate = buffer.sampleRate;
    const channels = buffer.numberOfChannels;
    const fadeInSamples = Math.floor(fadeInSecs * sampleRate);
    const fadeOutSamples = Math.floor(fadeOutSecs * sampleRate);
    
    for (let ch = 0; ch < channels; ch++) {
        const data = buffer.getChannelData(ch);
        
        for (let i = 0; i < fadeInSamples && i < data.length; i++) {
            data[i] *= i / fadeInSamples;
        }
        
        for (let i = 0; i < fadeOutSamples && i < data.length; i++) {
            const idx = data.length - 1 - i;
            data[idx] *= i / fadeOutSamples;
        }
    }
    
    return buffer;
}

function bufferToWav(buffer) {
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const format = 1;
    const bitDepth = 16;
    
    const bytesPerSample = bitDepth / 8;
    const blockAlign = numChannels * bytesPerSample;
    
    const data = [];
    for (let i = 0; i < buffer.length; i++) {
        for (let ch = 0; ch < numChannels; ch++) {
            const sample = Math.max(-1, Math.min(1, buffer.getChannelData(ch)[i]));
            const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
            data.push(intSample & 0xFF);
            data.push((intSample >> 8) & 0xFF);
        }
    }
    
    const dataSize = data.length;
    const headerSize = 44;
    const totalSize = headerSize + dataSize;
    
    const arrayBuffer = new ArrayBuffer(totalSize);
    const view = new DataView(arrayBuffer);
    
    function writeString(offset, string) {
        for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
        }
    }
    
    writeString(0, 'RIFF');
    view.setUint32(4, totalSize - 8, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, format, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);
    writeString(36, 'data');
    view.setUint32(40, dataSize, true);
    
    const uint8View = new Uint8Array(arrayBuffer);
    for (let i = 0; i < data.length; i++) {
        uint8View[headerSize + i] = data[i];
    }
    
    return new Blob([arrayBuffer], { type: 'audio/wav' });
}

function bufferToMp3(buffer) {
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const mp3encoder = new lamejs.Mp3Encoder(numChannels, sampleRate, 320);
    
    const mp3Data = [];
    const sampleBlockSize = 1152;
    const samples = buffer.length;
    
    const left = buffer.getChannelData(0);
    const right = numChannels > 1 ? buffer.getChannelData(1) : left;
    
    const leftInt16 = new Int16Array(samples);
    const rightInt16 = new Int16Array(samples);
    
    for (let i = 0; i < samples; i++) {
        leftInt16[i] = Math.max(-32768, Math.min(32767, Math.round(left[i] * 32767)));
        rightInt16[i] = Math.max(-32768, Math.min(32767, Math.round(right[i] * 32767)));
    }
    
    for (let i = 0; i < samples; i += sampleBlockSize) {
        const leftChunk = leftInt16.subarray(i, i + sampleBlockSize);
        const rightChunk = rightInt16.subarray(i, i + sampleBlockSize);
        
        let mp3buf;
        if (numChannels === 1) {
            mp3buf = mp3encoder.encodeBuffer(leftChunk);
        } else {
            mp3buf = mp3encoder.encodeBuffer(leftChunk, rightChunk);
        }
        
        if (mp3buf.length > 0) {
            mp3Data.push(mp3buf);
        }
    }
    
    const end = mp3encoder.flush();
    if (end.length > 0) {
        mp3Data.push(end);
    }
    
    return new Blob(mp3Data, { type: 'audio/mp3' });
}

function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
});

dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('drag-over');
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    if (e.dataTransfer.files.length > 0) {
        handleFileSelect(e.dataTransfer.files[0]);
    }
});

dropZone.addEventListener('click', () => fileInput.click());
browseButton.addEventListener('click', (e) => {
    e.stopPropagation();
    fileInput.click();
});
fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        handleFileSelect(e.target.files[0]);
    }
});

let isDragging = false;
let dragStartX = 0;

waveformContainer.addEventListener('mousedown', (e) => {
    if (!cropperAudioBuffer) return;
    
    isDragging = true;
    const rect = waveformContainer.getBoundingClientRect();
    dragStartX = e.clientX - rect.left;
    
    const clickTime = (dragStartX / rect.width) * cropperAudioBuffer.duration;
    selectionStart = clickTime;
    selectionEnd = clickTime;
    updateSelectionDisplay();
    updateTimeDisplays();
});

document.addEventListener('mousemove', (e) => {
    if (!isDragging || !cropperAudioBuffer) return;
    
    const rect = waveformContainer.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const clickTime = (x / rect.width) * cropperAudioBuffer.duration;
    
    if (clickTime < (dragStartX / rect.width) * cropperAudioBuffer.duration) {
        selectionStart = clickTime;
        selectionEnd = (dragStartX / rect.width) * cropperAudioBuffer.duration;
    } else {
        selectionStart = (dragStartX / rect.width) * cropperAudioBuffer.duration;
        selectionEnd = clickTime;
    }
    
    updateSelectionDisplay();
    updateTimeDisplays();
});

document.addEventListener('mouseup', () => {
    isDragging = false;
});

playBtn.addEventListener('click', () => {
    if (isPlaying) {
        stopPlayback();
    } else {
        startPlayback(0);
    }
});

stopBtn.addEventListener('click', stopPlayback);

seekSlider.addEventListener('input', () => {
    if (!cropperAudioBuffer) return;
    const time = (seekSlider.value / 100) * cropperAudioBuffer.duration;
    currentTimeDisplay.textContent = formatTime(time);
    
    const width = waveformContainer.clientWidth;
    playheadDiv.style.left = ((time / cropperAudioBuffer.duration) * width) + 'px';
});

seekSlider.addEventListener('change', () => {
    if (!cropperAudioBuffer) return;
    const time = (seekSlider.value / 100) * cropperAudioBuffer.duration;
    if (isPlaying) {
        startPlayback(time);
    }
});

selStartInput.addEventListener('change', () => {
    selectionStart = parseTime(selStartInput.value);
    if (selectionStart > selectionEnd) selectionEnd = selectionStart;
    updateSelectionDisplay();
    updateTimeDisplays();
});

selEndInput.addEventListener('change', () => {
    selectionEnd = parseTime(selEndInput.value);
    if (selectionEnd < selectionStart) selectionStart = selectionEnd;
    updateSelectionDisplay();
    updateTimeDisplays();
});

selectAllBtn.addEventListener('click', () => {
    if (!cropperAudioBuffer) return;
    selectionStart = 0;
    selectionEnd = cropperAudioBuffer.duration;
    updateSelectionDisplay();
    updateTimeDisplays();
});

clearSelectionBtn.addEventListener('click', () => {
    selectionStart = 0;
    selectionEnd = 0;
    selectionDiv.classList.add('hidden');
    updateTimeDisplays();
});

playSelectionBtn.addEventListener('click', () => {
    if (!cropperAudioBuffer || selectionStart >= selectionEnd) return;
    startPlayback(selectionStart, selectionEnd);
});

fadeInToggle.addEventListener('change', () => {
    if (fadeInToggle.checked) {
        fadeInControls.style.opacity = '1';
        fadeInControls.style.pointerEvents = 'auto';
    } else {
        fadeInControls.style.opacity = '0.5';
        fadeInControls.style.pointerEvents = 'none';
    }
});

fadeOutToggle.addEventListener('change', () => {
    if (fadeOutToggle.checked) {
        fadeOutControls.style.opacity = '1';
        fadeOutControls.style.pointerEvents = 'auto';
    } else {
        fadeOutControls.style.opacity = '0.5';
        fadeOutControls.style.pointerEvents = 'none';
    }
});

previewFadeInBtn.addEventListener('click', () => {
    if (!cropperAudioBuffer) return;
    const fadeDuration = parseFloat(fadeInDuration.value) || 1.0;
    startPlayback(selectionStart, Math.min(selectionStart + fadeDuration + 1, selectionEnd), fadeDuration, 0);
    logToConsole('Previewing fade in: ' + fadeDuration + 's', 'info');
});

previewFadeOutBtn.addEventListener('click', () => {
    if (!cropperAudioBuffer) return;
    const fadeDuration = parseFloat(fadeOutDuration.value) || 1.0;
    const previewStart = Math.max(selectionStart, selectionEnd - fadeDuration - 1);
    startPlayback(previewStart, selectionEnd, 0, fadeDuration);
    logToConsole('Previewing fade out: ' + fadeDuration + 's', 'info');
});

zoomInBtn.addEventListener('click', () => {
    zoomLevel = Math.min(zoomLevel * 1.5, 10);
    drawWaveform();
});

zoomOutBtn.addEventListener('click', () => {
    zoomLevel = Math.max(zoomLevel / 1.5, 1);
    drawWaveform();
});

saveSelectionBtn.addEventListener('click', async () => {
    if (!cropperAudioBuffer || selectionStart >= selectionEnd) {
        showStatus('Please select a portion of the audio first', 'error');
        return;
    }
    
    clearConsole();
    logToConsole('=== Saving Selection ===', 'info');
    logToConsole(`Selection: ${formatTime(selectionStart)} - ${formatTime(selectionEnd)}`, 'info');
    
    showStatus('Extracting selection...', 'info');
    let buffer = extractSelection(true);
    
    if (!buffer) {
        showStatus('Error extracting selection', 'error');
        return;
    }
    
    const applyFadeIn = fadeInToggle.checked;
    const applyFadeOut = fadeOutToggle.checked;
    const fadeInDur = applyFadeIn ? parseFloat(fadeInDuration.value) || 0 : 0;
    const fadeOutDur = applyFadeOut ? parseFloat(fadeOutDuration.value) || 0 : 0;
    
    if (fadeInDur > 0 || fadeOutDur > 0) {
        logToConsole(`Applying fades: In=${fadeInDur}s, Out=${fadeOutDur}s`, 'info');
        buffer = applyFades(buffer, fadeInDur, fadeOutDur);
    }
    
    const format = outputFormatSelect.value;
    const outputName = outputNameInput.value.trim() || 'cropped_audio';
    
    showStatus('Encoding audio...', 'info');
    logToConsole('Encoding to ' + format.toUpperCase() + '...', 'info');
    
    let blob;
    if (format === 'mp3') {
        blob = bufferToMp3(buffer);
    } else {
        blob = bufferToWav(buffer);
    }
    
    const filename = `${outputName}.${format}`;
    downloadBlob(blob, filename);
    
    showStatus('Selection saved: ' + filename, 'success');
    logToConsole('Downloaded: ' + filename, 'success');
    logToConsole('=== Complete ===', 'success');
});

removeSelectionBtn.addEventListener('click', async () => {
    if (!cropperAudioBuffer || selectionStart >= selectionEnd) {
        showStatus('Please select a portion of the audio first', 'error');
        return;
    }
    
    clearConsole();
    logToConsole('=== Removing Selection ===', 'info');
    logToConsole(`Removing: ${formatTime(selectionStart)} - ${formatTime(selectionEnd)}`, 'info');
    
    showStatus('Removing selection...', 'info');
    let buffer = extractSelection(false);
    
    if (!buffer) {
        showStatus('Cannot remove entire audio', 'error');
        return;
    }
    
    const applyFadeIn = fadeInToggle.checked && selectionStart > 0;
    const applyFadeOut = fadeOutToggle.checked && selectionEnd < cropperAudioBuffer.duration;
    const fadeInDur = applyFadeIn ? parseFloat(fadeInDuration.value) || 0 : 0;
    const fadeOutDur = applyFadeOut ? parseFloat(fadeOutDuration.value) || 0 : 0;
    
    if (fadeInDur > 0 || fadeOutDur > 0) {
        logToConsole(`Applying fades at cut points`, 'info');
    }
    
    const format = outputFormatSelect.value;
    const outputName = outputNameInput.value.trim() || 'cropped_audio';
    
    showStatus('Encoding audio...', 'info');
    logToConsole('Encoding to ' + format.toUpperCase() + '...', 'info');
    
    let blob;
    if (format === 'mp3') {
        blob = bufferToMp3(buffer);
    } else {
        blob = bufferToWav(buffer);
    }
    
    const filename = `${outputName}.${format}`;
    downloadBlob(blob, filename);
    
    showStatus('Audio saved (selection removed): ' + filename, 'success');
    logToConsole('Downloaded: ' + filename, 'success');
    logToConsole('=== Complete ===', 'success');
});

helpButton.addEventListener('click', () => {
    const modal = document.getElementById('help-modal');
    const content = document.getElementById('help-modal-content');
    
    content.innerHTML = `
        <h3 class="text-xl font-bold text-white mb-2">Audio Cropper</h3>
        <p class="mb-4 leading-snug">Select and extract portions of audio files, or remove unwanted sections.</p>
        
        <h3 class="text-xl font-bold text-white mb-2">Selection</h3>
        <ul class="list-disc list-inside mb-4 leading-tight">
            <li>Click and drag on the waveform to select a region</li>
            <li>Or manually enter start/end times</li>
            <li>Use "Play Selection" to preview your selection</li>
        </ul>
        
        <h3 class="text-xl font-bold text-white mb-2">Operations</h3>
        <ul class="list-disc list-inside mb-4 leading-tight">
            <li><strong class="text-white">Save Selection</strong> — Exports only the selected portion</li>
            <li><strong class="text-white">Remove Selection</strong> — Exports everything except the selected portion</li>
        </ul>
        
        <h3 class="text-xl font-bold text-white mb-2">Fade Effects</h3>
        <ul class="list-disc list-inside mb-4 leading-tight">
            <li><strong class="text-white">Fade In</strong> — Gradually increases volume at the start</li>
            <li><strong class="text-white">Fade Out</strong> — Gradually decreases volume at the end</li>
            <li>Use "Preview" buttons to hear the fade effect</li>
        </ul>
    `;
    
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    document.body.style.overflow = 'hidden';
});

window.addEventListener('resize', () => {
    if (waveformData) {
        drawWaveform();
    }
});
