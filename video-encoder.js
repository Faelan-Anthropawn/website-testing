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

function drawFrame(canvas, ctx, width, height, frequencyData, songTitle, creatorName, image) {
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
    
    const barCount = 64;
    const barWidth = width / barCount;
    const barMaxHeight = height * 0.15;
    const barGap = 2;
    const bottomPadding = height * 0.02;
    
    if (frequencyData && frequencyData.length > 0) {
        const bucketSize = Math.floor(frequencyData.length / barCount);
        
        for (let i = 0; i < barCount; i++) {
            let sum = 0;
            for (let j = 0; j < bucketSize; j++) {
                sum += frequencyData[i * bucketSize + j];
            }
            const avg = sum / bucketSize;
            const barHeight = (avg / 255) * barMaxHeight;
            
            const x = i * barWidth + barGap / 2;
            const y = height - barHeight - bottomPadding;
            
            const gradient = ctx.createLinearGradient(x, y + barHeight, x, y);
            gradient.addColorStop(0, 'rgba(99, 102, 241, 0.8)');
            gradient.addColorStop(0.5, 'rgba(139, 92, 246, 0.9)');
            gradient.addColorStop(1, 'rgba(168, 85, 247, 1)');
            
            ctx.fillStyle = gradient;
            ctx.fillRect(x, y, barWidth - barGap, barHeight);
        }
    }
    
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
    
    const dummyFrequencyData = new Uint8Array(128);
    for (let i = 0; i < 128; i++) {
        dummyFrequencyData[i] = Math.random() * 100 + 50;
    }
    
    drawFrame(
        canvas, 
        ctx, 
        canvas.width, 
        canvas.height, 
        dummyFrequencyData, 
        videoSongTitle.value || 'Song Title', 
        videoCreatorName.value || 'Creator Name',
        loadedImage
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
        
        function animate() {
            if (!isPlaying) return;
            
            videoAnalyser.getByteFrequencyData(frequencyData);
            
            const elapsed = videoAudioContext.currentTime - previewStartTime;
            videoPreviewTime.textContent = `${formatTime(elapsed)} / ${formatTime(videoAudioBuffer.duration)}`;
            
            if (elapsed >= videoAudioBuffer.duration) {
                stopPreview();
                return;
            }
            
            drawFrame(
                canvas, 
                ctx, 
                canvas.width, 
                canvas.height, 
                frequencyData, 
                videoSongTitle.value || 'Song Title', 
                videoCreatorName.value || 'Creator Name',
                loadedImage
            );
            
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

function analyzeAudioForVisualization(audioBuffer, fps) {
    const duration = audioBuffer.duration;
    const totalFrames = Math.ceil(duration * fps);
    const samplesPerFrame = Math.floor(audioBuffer.sampleRate / fps);
    const channelData = audioBuffer.getChannelData(0);
    const frequencyDataPerFrame = [];
    
    for (let frame = 0; frame < totalFrames; frame++) {
        const startSample = frame * samplesPerFrame;
        const endSample = Math.min(startSample + samplesPerFrame, channelData.length);
        
        const freqData = new Uint8Array(128);
        const chunkSize = Math.max(1, Math.floor((endSample - startSample) / 128));
        
        for (let i = 0; i < 128; i++) {
            let sum = 0;
            let count = 0;
            for (let j = 0; j < chunkSize; j++) {
                const idx = startSample + i * chunkSize + j;
                if (idx < channelData.length) {
                    sum += Math.abs(channelData[idx]);
                    count++;
                }
            }
            const avg = count > 0 ? sum / count : 0;
            freqData[i] = Math.min(255, Math.floor(avg * 600 + Math.random() * 20));
        }
        
        frequencyDataPerFrame.push(freqData);
    }
    
    return frequencyDataPerFrame;
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
    const { width, height, fps, totalFrames, frequencyDataPerFrame, songTitle, creatorName, image, onProgress } = options;
    
    const renderCanvas = document.createElement('canvas');
    renderCanvas.width = width;
    renderCanvas.height = height;
    const renderCtx = renderCanvas.getContext('2d');
    
    const stream = renderCanvas.captureStream(fps);
    const videoTrack = stream.getVideoTracks()[0];
    
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') 
        ? 'video/webm;codecs=vp9'
        : MediaRecorder.isTypeSupported('video/webm;codecs=vp8')
            ? 'video/webm;codecs=vp8'
            : 'video/webm';
    
    const videoBitrate = width >= 3840 ? 35000000 : 
                        width >= 2560 ? 16000000 : 
                        width >= 1920 ? 8000000 : 5000000;
    
    const mediaRecorder = new MediaRecorder(stream, {
        mimeType: mimeType,
        videoBitsPerSecond: videoBitrate
    });
    
    const videoChunks = [];
    mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
            videoChunks.push(e.data);
        }
    };
    
    return new Promise((resolve, reject) => {
        mediaRecorder.onstop = () => {
            const videoBlob = new Blob(videoChunks, { type: 'video/webm' });
            resolve({ blob: videoBlob, codec: mimeType });
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
                image
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
            onProgress: (frame, total) => {
                const progress = 10 + Math.round((frame / total) * 80);
                updateProgress(progress);
                
                const currentSecond = Math.floor(frame / fps);
                if (currentSecond > lastLoggedSecond && currentSecond % 10 === 0) {
                    showVideoStatus(`Rendering: ${formatTime(currentSecond)} / ${formatTime(duration)}`, 'info');
                    lastLoggedSecond = currentSecond;
                }
            }
        });
        
        logToVideoConsole(`Video codec used: ${result.codec}`, 'info');
        logToVideoConsole('Video frames rendered', 'success');
        updateProgress(92);
        
        showVideoStatus('Converting audio...', 'info');
        logToVideoConsole('Converting audio to WAV...', 'info');
        
        const audioBlob = audioBufferToWav(videoAudioBuffer);
        
        logToVideoConsole('Audio converted', 'success');
        updateProgress(95);
        
        showVideoStatus('Downloading files...', 'info');
        logToVideoConsole('Preparing downloads...', 'info');
        
        const videoUrl = URL.createObjectURL(result.blob);
        const audioUrl = URL.createObjectURL(audioBlob);
        
        const videoLink = document.createElement('a');
        videoLink.href = videoUrl;
        videoLink.download = `${outputName}_video.webm`;
        document.body.appendChild(videoLink);
        videoLink.click();
        document.body.removeChild(videoLink);
        
        await new Promise(r => setTimeout(r, 500));
        
        const audioLink = document.createElement('a');
        audioLink.href = audioUrl;
        audioLink.download = `${outputName}_audio.wav`;
        document.body.appendChild(audioLink);
        audioLink.click();
        document.body.removeChild(audioLink);
        
        URL.revokeObjectURL(videoUrl);
        URL.revokeObjectURL(audioUrl);
        
        updateProgress(100);
        showVideoStatus('Files generated successfully!', 'success');
        logToVideoConsole(`Video saved: ${outputName}_video.webm`, 'success');
        logToVideoConsole(`Audio saved: ${outputName}_audio.wav`, 'success');
        logToVideoConsole('=== Generation Complete ===', 'success');
        logToVideoConsole('', 'info');
        logToVideoConsole('Next steps to create final video:', 'info');
        logToVideoConsole('1. Use FFmpeg: ffmpeg -i video.webm -i audio.wav -c:v copy -c:a aac output.mp4', 'info');
        logToVideoConsole('2. Or use HandBrake / online converters to merge', 'info');
        logToVideoConsole('3. YouTube also accepts WebM directly!', 'info');
        
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
                <li>Merge the output files using FFmpeg or similar tool</li>
            </ol>
            
            <h3 class="text-xl font-bold text-white mb-2">Video Settings</h3>
            <ul class="list-disc list-inside mb-4 leading-tight">
                <li><strong class="text-white">Resolution</strong> - 720p to 4K (1440p default for YouTube)</li>
                <li><strong class="text-white">Frame Rate</strong> - 24-60 fps (50 fps default)</li>
            </ul>
            
            <h3 class="text-xl font-bold text-white mb-2">Output Files</h3>
            <ul class="list-disc list-inside mb-4 leading-tight">
                <li><strong class="text-white">Video (WebM)</strong> - Visual with audio bars</li>
                <li><strong class="text-white">Audio (WAV)</strong> - High quality audio</li>
            </ul>
            
            <h3 class="text-xl font-bold text-white mb-2">Merging to MP4</h3>
            <p class="leading-tight mb-2">Use FFmpeg (free command-line tool):</p>
            <code class="block bg-surface-900 p-2 rounded text-sm text-green-400 mb-2">ffmpeg -i video.webm -i audio.wav -c:v copy -c:a aac output.mp4</code>
            <p class="leading-tight">Or use HandBrake, Adobe Premiere, or online converters.</p>
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
