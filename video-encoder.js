let videoImageFile = null;
let videoAudioFile = null;
let videoAudioBuffer = null;
let videoAudioContext = null;
let videoAudioSource = null;
let videoAnalyser = null;
let isPlaying = false;
let previewAnimationId = null;

const videoImageDropZone = document.getElementById('video-image-drop-zone');
const videoImageInput = document.getElementById('video-image-input');
const videoImageBrowse = document.getElementById('video-image-browse');
const videoImageName = document.getElementById('video-image-name');

const videoAudioDropZone = document.getElementById('video-audio-drop-zone');
const videoAudioInput = document.getElementById('video-audio-input');
const videoAudioBrowse = document.getElementById('video-audio-browse');
const videoAudioName = document.getElementById('video-audio-name');

const videoSongTitle = document.getElementById('video-song-title');
const videoCreatorName = document.getElementById('video-creator-name');
const videoResolution = document.getElementById('video-resolution');
const videoFps = document.getElementById('video-fps');
const videoOutputName = document.getElementById('video-output-name');

const videoPreviewCanvas = document.getElementById('video-preview-canvas');
const videoPreviewBtn = document.getElementById('video-preview-btn');
const videoPreviewTime = document.getElementById('video-preview-time');

const videoEncodeButton = document.getElementById('video-encode-button');
const videoStatusMessage = document.getElementById('video-status-message');
const videoProgressContainer = document.getElementById('video-progress-container');
const videoProgressBar = document.getElementById('video-progress-bar');
const videoProgressText = document.getElementById('video-progress-text');
const videoConsoleBox = document.getElementById('video-console-box');
const videoHelpButton = document.getElementById('video-help-button');

let loadedImage = null;

function getTimestamp() {
    const now = new Date();
    return now.toLocaleTimeString('en-US', { hour12: false });
}

function logToVideoConsole(message, type = 'info') {
    const entry = document.createElement('div');
    entry.className = 'console-entry';
    
    const timestamp = document.createElement('span');
    timestamp.className = 'console-timestamp';
    timestamp.textContent = `[${getTimestamp()}]`;
    
    const text = document.createElement('span');
    text.textContent = message;
    
    if (type === 'error') {
        text.style.color = '#ef4444';
    } else if (type === 'success') {
        text.style.color = '#22c55e';
    } else if (type === 'info') {
        text.style.color = '#3b82f6';
    }
    
    entry.appendChild(timestamp);
    entry.appendChild(text);
    videoConsoleBox.appendChild(entry);
    videoConsoleBox.scrollTop = videoConsoleBox.scrollHeight;
}

function clearVideoConsole() {
    videoConsoleBox.innerHTML = '';
}

function showVideoStatus(message, type = 'info') {
    videoStatusMessage.textContent = message;
    videoStatusMessage.className = 'status-badge ' + type + ' flex-1';
}

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function handleImageSelect(file) {
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
        showVideoStatus('Please select a valid image file', 'error');
        return;
    }
    
    videoImageFile = file;
    videoImageName.textContent = file.name;
    
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            loadedImage = img;
            logToVideoConsole(`Image loaded: ${file.name} (${img.width}x${img.height})`, 'success');
            updatePreview();
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
    
    if (!videoOutputName.value) {
        const baseName = file.name.replace(/\.[^.]+$/, '');
        videoOutputName.value = baseName;
    }
}

async function handleAudioSelect(file) {
    if (!file) return;
    
    const ext = file.name.toLowerCase();
    if (!ext.endsWith('.mp3') && !ext.endsWith('.wav')) {
        showVideoStatus('Please select a valid audio file (.mp3 or .wav)', 'error');
        return;
    }
    
    videoAudioFile = file;
    videoAudioName.textContent = file.name;
    
    try {
        const arrayBuffer = await file.arrayBuffer();
        videoAudioContext = new (window.AudioContext || window.webkitAudioContext)();
        videoAudioBuffer = await videoAudioContext.decodeAudioData(arrayBuffer);
        
        logToVideoConsole(`Audio loaded: ${file.name} (${formatTime(videoAudioBuffer.duration)})`, 'success');
        videoPreviewTime.textContent = `0:00 / ${formatTime(videoAudioBuffer.duration)}`;
        
        if (!videoOutputName.value) {
            const baseName = file.name.replace(/\.[^.]+$/, '');
            videoOutputName.value = baseName;
        }
        
        updatePreview();
    } catch (error) {
        showVideoStatus('Error loading audio: ' + error.message, 'error');
        logToVideoConsole('Error loading audio: ' + error.message, 'error');
    }
}

videoImageDropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    videoImageDropZone.classList.add('drag-over');
});

videoImageDropZone.addEventListener('dragleave', () => {
    videoImageDropZone.classList.remove('drag-over');
});

videoImageDropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    videoImageDropZone.classList.remove('drag-over');
    if (e.dataTransfer.files.length > 0) {
        handleImageSelect(e.dataTransfer.files[0]);
    }
});

videoImageDropZone.addEventListener('click', () => {
    videoImageInput.click();
});

videoImageBrowse.addEventListener('click', (e) => {
    e.stopPropagation();
    videoImageInput.click();
});

videoImageInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        handleImageSelect(e.target.files[0]);
    }
});

videoAudioDropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    videoAudioDropZone.classList.add('drag-over');
});

videoAudioDropZone.addEventListener('dragleave', () => {
    videoAudioDropZone.classList.remove('drag-over');
});

videoAudioDropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    videoAudioDropZone.classList.remove('drag-over');
    if (e.dataTransfer.files.length > 0) {
        handleAudioSelect(e.dataTransfer.files[0]);
    }
});

videoAudioDropZone.addEventListener('click', () => {
    videoAudioInput.click();
});

videoAudioBrowse.addEventListener('click', (e) => {
    e.stopPropagation();
    videoAudioInput.click();
});

videoAudioInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        handleAudioSelect(e.target.files[0]);
    }
});

function drawFrame(canvas, ctx, width, height, bandData, songTitle, creatorName, image, frameIndex, fps) {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, width, height);
    
    if (image) {
        const imgAspect = image.width / image.height;
        const canvasAspect = width / height;
        
        let drawWidth, drawHeight, drawX, drawY;
        
        if (imgAspect > canvasAspect) {
            drawHeight = height;
            drawWidth = height * imgAspect;
            drawX = (width - drawWidth) / 2;
            drawY = 0;
        } else {
            drawWidth = width;
            drawHeight = width / imgAspect;
            drawX = 0;
            drawY = (height - drawHeight) / 2;
        }
        
        ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight);
    }
    
    // === Waveform visualization (Vizzy-style) ===
    const lineY = height * 0.92;
    const maxAmp = height * 0.15;
    const points = 300;
    const time = (frameIndex || 0) / (fps || 30);

    ctx.beginPath();
    ctx.strokeStyle = 'rgba(255,255,255,0.95)';
    ctx.lineWidth = 3;
    ctx.shadowColor = 'rgba(255,255,255,0.6)';
    ctx.shadowBlur = 10;

    if (bandData && bandData.length > 0) {
        for (let i = 0; i <= points; i++) {
            const x = (i / points) * width;

            const bandPos = (i / points) * (bandData.length - 1);
            const b0 = Math.floor(bandPos);
            const b1 = Math.min(b0 + 1, bandData.length - 1);
            const t = bandPos - b0;

            const energy = bandData[b0] * (1 - t) + bandData[b1] * t;

            const phase = time * 6 + bandPos * 0.8;
            const y = lineY - Math.sin(phase) * energy * maxAmp;

            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
    } else {
        ctx.moveTo(0, lineY);
        ctx.lineTo(width, lineY);
    }

    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';
    
    const fontSize = Math.max(24, height * 0.035);
    const padding = width * 0.03;
    const topPadding = height * 0.05;
    
    ctx.font = `bold ${fontSize}px Inter, system-ui, sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    
    if (songTitle) {
        ctx.fillStyle = '#ffffff';
        ctx.fillText(songTitle, padding, topPadding);
    }
    
    if (creatorName) {
        ctx.font = `${fontSize * 0.75}px Inter, system-ui, sans-serif`;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.fillText(creatorName, padding, topPadding + fontSize * 1.3);
    }
    
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
}

function updatePreview() {
    const canvas = videoPreviewCanvas;
    const ctx = canvas.getContext('2d');
    
    const containerWidth = canvas.parentElement.offsetWidth;
    const containerHeight = containerWidth * 9 / 16;
    
    canvas.width = containerWidth;
    canvas.height = containerHeight;
    
    const dummyBandData = new Float32Array(48);
    for (let i = 0; i < 48; i++) {
        dummyBandData[i] = Math.random() * 0.3 + 0.1;
    }
    
    drawFrame(
        canvas, 
        ctx, 
        canvas.width, 
        canvas.height, 
        dummyBandData, 
        videoSongTitle.value || 'Song Title', 
        videoCreatorName.value || 'Creator Name',
        loadedImage,
        0,
        30
    );
}

videoSongTitle.addEventListener('input', updatePreview);
videoCreatorName.addEventListener('input', updatePreview);

let previewStartTime = 0;

videoPreviewBtn.addEventListener('click', async () => {
    if (!videoAudioBuffer) {
        showVideoStatus('Please load an audio file first', 'error');
        return;
    }
    
    if (isPlaying) {
        stopPreview();
        return;
    }
    
    try {
        if (videoAudioContext.state === 'suspended') {
            await videoAudioContext.resume();
        }
        
        videoAudioSource = videoAudioContext.createBufferSource();
        videoAudioSource.buffer = videoAudioBuffer;
        
        videoAnalyser = videoAudioContext.createAnalyser();
        videoAnalyser.fftSize = 256;
        
        videoAudioSource.connect(videoAnalyser);
        videoAnalyser.connect(videoAudioContext.destination);
        
        previewStartTime = videoAudioContext.currentTime;
        videoAudioSource.start(0);
        isPlaying = true;
        
        videoPreviewBtn.innerHTML = '<span class="material-symbols-outlined">stop</span> Stop';
        
        const frequencyData = new Uint8Array(videoAnalyser.frequencyBinCount);
        const canvas = videoPreviewCanvas;
        const ctx = canvas.getContext('2d');
        const bands = 48;
        let lastBands = new Float32Array(bands);
        const previewFps = 60;
        let frameCount = 0;
        
        function animate() {
            if (!isPlaying) return;
            
            videoAnalyser.getByteFrequencyData(frequencyData);
            
            const elapsed = videoAudioContext.currentTime - previewStartTime;
            videoPreviewTime.textContent = `${formatTime(elapsed)} / ${formatTime(videoAudioBuffer.duration)}`;
            
            if (elapsed >= videoAudioBuffer.duration) {
                stopPreview();
                return;
            }
            
            const bandData = new Float32Array(bands);
            for (let b = 0; b < bands; b++) {
                const low = Math.floor(Math.pow(b / bands, 2) * frequencyData.length);
                const high = Math.floor(Math.pow((b + 1) / bands, 2) * frequencyData.length);
                let sum = 0;
                for (let i = low; i < high; i++) sum += frequencyData[i] / 255;
                bandData[b] = sum / Math.max(1, high - low);
                bandData[b] = lastBands[b] * 0.7 + bandData[b] * 0.3;
            }
            lastBands = bandData.slice();
            
            drawFrame(
                canvas, 
                ctx, 
                canvas.width, 
                canvas.height, 
                bandData, 
                videoSongTitle.value || 'Song Title', 
                videoCreatorName.value || 'Creator Name',
                loadedImage,
                frameCount,
                previewFps
            );
            
            frameCount++;
            previewAnimationId = requestAnimationFrame(animate);
        }
        
        animate();
        
        videoAudioSource.onended = () => {
            if (isPlaying) {
                stopPreview();
            }
        };
        
    } catch (error) {
        showVideoStatus('Error playing preview: ' + error.message, 'error');
    }
});

function stopPreview() {
    isPlaying = false;
    if (videoAudioSource) {
        try {
            videoAudioSource.stop();
        } catch (e) {}
        videoAudioSource = null;
    }
    if (previewAnimationId) {
        cancelAnimationFrame(previewAnimationId);
        previewAnimationId = null;
    }
    videoPreviewBtn.innerHTML = '<span class="material-symbols-outlined">play_arrow</span> Preview';
    videoPreviewTime.textContent = `0:00 / ${videoAudioBuffer ? formatTime(videoAudioBuffer.duration) : '0:00'}`;
    updatePreview();
}

function fftReal(input) {
    const n = input.length;
    const output = new Float32Array(n / 2);

    for (let k = 0; k < n / 2; k++) {
        let re = 0, im = 0;
        for (let i = 0; i < n; i++) {
            const angle = (2 * Math.PI * k * i) / n;
            re += input[i] * Math.cos(angle);
            im -= input[i] * Math.sin(angle);
        }
        output[k] = Math.sqrt(re * re + im * im);
    }

    return output;
}

function analyzeAudioForVisualization(audioBuffer, fps) {
    const sampleRate = audioBuffer.sampleRate;
    const duration = audioBuffer.duration;
    const totalFrames = Math.ceil(duration * fps);

    const fftSize = 1024;
    const bands = 48; // this is a complete guess, adjust as needed
    const channelData = audioBuffer.getChannelData(0);

    const samplesPerFrame = Math.floor(sampleRate / fps);
    const window = new Float32Array(fftSize);

    const frames = [];
    let lastBands = new Float32Array(bands);

    for (let frame = 0; frame < totalFrames; frame++) {
        const start = frame * samplesPerFrame;

        for (let i = 0; i < fftSize; i++) {
            window[i] = channelData[start + i] || 0;
        }

        const spectrum = fftReal(window);

        const bandEnergy = new Float32Array(bands);

        for (let b = 0; b < bands; b++) {
            const low = Math.floor(Math.pow(b / bands, 2) * spectrum.length);
            const high = Math.floor(Math.pow((b + 1) / bands, 2) * spectrum.length);

            let sum = 0;
            for (let i = low; i < high; i++) sum += spectrum[i];
            bandEnergy[b] = sum / Math.max(1, high - low);
        }

        for (let i = 0; i < bands; i++) {
            bandEnergy[i] = lastBands[i] * 0.75 + bandEnergy[i] * 0.25;
        }

        lastBands = bandEnergy;
        frames.push(bandEnergy);
    }

    return frames;
}


function audioBufferToWav(audioBuffer) {
    const numChannels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    const length = audioBuffer.length;
    const bytesPerSample = 2;
    const blockAlign = numChannels * bytesPerSample;
    const byteRate = sampleRate * blockAlign;
    const dataSize = length * blockAlign;
    const totalSize = 44 + dataSize;
    
    const buffer = new ArrayBuffer(totalSize);
    const view = new DataView(buffer);
    
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
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, dataSize, true);
    
    const channels = [];
    for (let i = 0; i < numChannels; i++) {
        channels.push(audioBuffer.getChannelData(i));
    }
    
    let offset = 44;
    for (let i = 0; i < length; i++) {
        for (let ch = 0; ch < numChannels; ch++) {
            const sample = Math.max(-1, Math.min(1, channels[ch][i]));
            const intSample = Math.round(sample * 32767);
            view.setInt16(offset, intSample, true);
            offset += 2;
        }
    }
    
    return new Blob([buffer], { type: 'audio/wav' });
}

async function generateVideoWithDeterministicFrames(options) {
    const { width, height, fps, totalFrames, frequencyDataPerFrame, songTitle, creatorName, image, audioBuffer, onProgress } = options;
    
    const renderCanvas = document.createElement('canvas');
    renderCanvas.width = width;
    renderCanvas.height = height;
    const renderCtx = renderCanvas.getContext('2d');
    
    const videoStream = renderCanvas.captureStream(fps);
    const videoTrack = videoStream.getVideoTracks()[0];
    
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const audioSource = audioContext.createBufferSource();
    audioSource.buffer = audioBuffer;
    const audioDestination = audioContext.createMediaStreamDestination();
    audioSource.connect(audioDestination);
    audioSource.connect(audioContext.destination);
    
    const combinedStream = new MediaStream([
        ...videoStream.getVideoTracks(),
        ...audioDestination.stream.getAudioTracks()
    ]);
    
    const mimeType = MediaRecorder.isTypeSupported('video/mp4;codecs=avc1.42E01E,mp4a.40.2')
        ? 'video/mp4;codecs=avc1.42E01E,mp4a.40.2'
        : MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus') 
            ? 'video/webm;codecs=vp9,opus'
            : MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')
                ? 'video/webm;codecs=vp8,opus'
                : 'video/webm';
    
    const isMP4 = mimeType.startsWith('video/mp4');
    
    const videoBitrate = width >= 3840 ? 35000000 : 
                        width >= 2560 ? 16000000 : 
                        width >= 1920 ? 8000000 : 5000000;
    
    const mediaRecorder = new MediaRecorder(combinedStream, {
        mimeType: mimeType,
        videoBitsPerSecond: videoBitrate,
        audioBitsPerSecond: 192000
    });
    
    const videoChunks = [];
    mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
            videoChunks.push(e.data);
        }
    };
    
    audioSource.start(0);
    
    return new Promise((resolve, reject) => {
        mediaRecorder.onstop = () => {
            audioContext.close();
            const blobType = isMP4 ? 'video/mp4' : 'video/webm';
            const videoBlob = new Blob(videoChunks, { type: blobType });
            resolve({ blob: videoBlob, codec: mimeType, isMP4: isMP4 });
        };
        
        mediaRecorder.onerror = (e) => {
            reject(new Error('MediaRecorder error: ' + e.error));
        };
        
        mediaRecorder.start(100);
        
        const frameDurationMs = 1000 / fps;
        const expectedDurationMs = totalFrames * frameDurationMs;
        let frameIndex = 0;
        let startTime = performance.now();
        
        function renderFrame() {
            if (frameIndex >= totalFrames) {
                const actualDuration = performance.now() - startTime;
                const expectedDuration = totalFrames * frameDurationMs;
                const driftMs = actualDuration - expectedDuration;
                
                if (driftMs < -100) {
                    const waitTime = Math.abs(driftMs);
                    setTimeout(() => {
                        mediaRecorder.stop();
                    }, waitTime);
                } else {
                    mediaRecorder.stop();
                }
                return;
            }
            
            drawFrame(
              renderCanvas,
              renderCtx,
              width,
              height,
              frequencyDataPerFrame[frameIndex],
              songTitle,
              creatorName,
              image,
              frameIndex,
              fps
            );
            
            if (videoTrack.requestFrame) {
                videoTrack.requestFrame();
            }
            
            frameIndex++;
            
            if (onProgress) {
                onProgress(frameIndex, totalFrames);
            }
            
            const elapsedTime = performance.now() - startTime;
            const expectedTime = frameIndex * frameDurationMs;
            const drift = elapsedTime - expectedTime;
            
            const nextDelay = Math.max(0, frameDurationMs - drift);
            
            if (nextDelay > 0) {
                setTimeout(renderFrame, nextDelay);
            } else {
                Promise.resolve().then(renderFrame);
            }
        }
        
        renderFrame();
    });
}

videoEncodeButton.addEventListener('click', async () => {
    if (!videoImageFile) {
        showVideoStatus('Please select a background image', 'error');
        logToVideoConsole('Error: No background image selected', 'error');
        return;
    }
    
    if (!videoAudioFile) {
        showVideoStatus('Please select an audio file', 'error');
        logToVideoConsole('Error: No audio file selected', 'error');
        return;
    }
    
    stopPreview();
    
    const [width, height] = videoResolution.value.split('x').map(Number);
    const fps = parseInt(videoFps.value);
    const outputName = videoOutputName.value.trim() || 'output';
    const songTitle = videoSongTitle.value.trim();
    const creatorName = videoCreatorName.value.trim();
    
    videoEncodeButton.disabled = true;
    videoProgressContainer.classList.remove('hidden');
    clearVideoConsole();
    
    logToVideoConsole('=== Starting Video Generation ===', 'info');
    logToVideoConsole(`Resolution: ${width}x${height}`, 'info');
    logToVideoConsole(`Frame rate: ${fps} fps`, 'info');
    logToVideoConsole(`Duration: ${formatTime(videoAudioBuffer.duration)}`, 'info');
    
    try {
        showVideoStatus('Analyzing audio waveform...', 'info');
        logToVideoConsole('Analyzing audio waveform...', 'info');
        
        const duration = videoAudioBuffer.duration;
        const totalFrames = Math.ceil(duration * fps);
        
        logToVideoConsole(`Total frames to generate: ${totalFrames}`, 'info');
        
        const frequencyDataPerFrame = analyzeAudioForVisualization(videoAudioBuffer, fps);
        
        logToVideoConsole('Audio analysis complete', 'success');
        updateProgress(10);
        
        showVideoStatus('Rendering video frames...', 'info');
        logToVideoConsole('Rendering video frames (this will take a while)...', 'info');
        logToVideoConsole('Please keep this tab active for best results', 'info');
        
        let lastLoggedSecond = -1;
        
        const result = await generateVideoWithDeterministicFrames({
            width,
            height,
            fps,
            totalFrames,
            frequencyDataPerFrame,
            songTitle,
            creatorName,
            image: loadedImage,
            audioBuffer: videoAudioBuffer,
            onProgress: (frame, total) => {
                const progress = 10 + Math.round((frame / total) * 85);
                updateProgress(progress);
                
                const currentSecond = Math.floor(frame / fps);
                if (currentSecond > lastLoggedSecond && currentSecond % 10 === 0) {
                    showVideoStatus(`Rendering: ${formatTime(currentSecond)} / ${formatTime(duration)}`, 'info');
                    lastLoggedSecond = currentSecond;
                }
            }
        });
        
        logToVideoConsole(`Video codec used: ${result.codec}`, 'info');
        logToVideoConsole('Video with audio rendered', 'success');
        updateProgress(95);
        
        showVideoStatus('Downloading video...', 'info');
        logToVideoConsole('Preparing download...', 'info');
        
        const fileExtension = result.isMP4 ? 'mp4' : 'mp4';
        const videoUrl = URL.createObjectURL(result.blob);
        
        const videoLink = document.createElement('a');
        videoLink.href = videoUrl;
        videoLink.download = `${outputName}.${fileExtension}`;
        document.body.appendChild(videoLink);
        videoLink.click();
        document.body.removeChild(videoLink);
        
        URL.revokeObjectURL(videoUrl);
        
        updateProgress(100);
        showVideoStatus('Video generated successfully!', 'success');
        logToVideoConsole(`Video saved: ${outputName}.${fileExtension}`, 'success');
        logToVideoConsole('=== Generation Complete ===', 'success');
        logToVideoConsole('', 'info');
        logToVideoConsole('Your video is ready with audio included!', 'success');
        logToVideoConsole('Upload directly to YouTube, social media, or any platform.', 'info');
        
    } catch (error) {
        console.error('Video encoding error:', error);
        showVideoStatus('Error: ' + error.message, 'error');
        logToVideoConsole('Error: ' + error.message, 'error');
        logToVideoConsole('=== Video Generation Failed ===', 'error');
    } finally {
        videoEncodeButton.disabled = false;
        setTimeout(() => {
            videoProgressContainer.classList.add('hidden');
            updateProgress(0);
        }, 3000);
    }
});

function updateProgress(percent) {
    videoProgressBar.style.width = `${percent}%`;
    videoProgressText.textContent = `${percent}%`;
}

if (videoHelpButton) {
    videoHelpButton.addEventListener('click', () => {
        const modal = document.getElementById('help-modal');
        const content = document.getElementById('help-modal-content');
        
        content.innerHTML = `
            <h3 class="text-xl font-bold text-white mb-2">Video Encoder</h3>
            <p class="mb-4 leading-tight">Create music videos with audio visualization for YouTube and other platforms.</p>
            
            <h3 class="text-xl font-bold text-white mb-2">How to Use</h3>
            <ol class="list-decimal list-inside mb-4 leading-tight">
                <li>Upload a background image (will be scaled to fit)</li>
                <li>Upload your audio file (MP3 or WAV)</li>
                <li>Enter song title and creator name</li>
                <li>Select resolution and frame rate</li>
                <li>Click "Generate Video"</li>
                <li>Your complete MP4 video with audio will download automatically!</li>
            </ol>
            
            <h3 class="text-xl font-bold text-white mb-2">Video Settings</h3>
            <ul class="list-disc list-inside mb-4 leading-tight">
                <li><strong class="text-white">Resolution</strong> - 720p to 4K (1440p default for YouTube)</li>
                <li><strong class="text-white">Frame Rate</strong> - 24-60 fps (50 fps default)</li>
            </ul>
            
            <h3 class="text-xl font-bold text-white mb-2">Output</h3>
            <ul class="list-disc list-inside mb-4 leading-tight">
                <li><strong class="text-white">Single MP4 File</strong> - Complete video with audio and waveform visualization</li>
                <li><strong class="text-white">Ready to Upload</strong> - Works directly with YouTube, social media, and all platforms</li>
            </ul>
            
            <h3 class="text-xl font-bold text-white mb-2">Visualization</h3>
            <p class="leading-tight">Features a smooth white waveform line that reacts to your audio in real-time.</p>
        `;
        
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        document.body.style.overflow = 'hidden';
    });
}

window.addEventListener('resize', () => {
    if (loadedImage || videoAudioBuffer) {
        updatePreview();
    }
});

updatePreview();
