export class Visualizer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");

        this.BAR_COUNT = 64;
        this.FREQ_START_INDEX = 6;

        // envelopes
        this.fastValues = new Float32Array(this.BAR_COUNT);
        this.slowValues = new Float32Array(this.BAR_COUNT);
        this.peakHold = new Float32Array(this.BAR_COUNT);

        // beat energy
        this.beatEnergy = 0;
    }

    /* ---------------- FRAME ---------------- */

    drawFrame(ctx, width, height, frequencyData, backgroundImage, customTexts) {
        ctx.clearRect(0, 0, width, height);

        if (backgroundImage) {
            ctx.drawImage(backgroundImage, 0, 0, width, height);
        }

        if (frequencyData && this.hasVisualizer(customTexts)) {
            this.drawBars(ctx, width, height, frequencyData);
        } else {
            this.fastValues.fill(0);
            this.slowValues.fill(0);
            this.peakHold.fill(0);
            this.beatEnergy = 0;
        }

        this.drawText(ctx, width, height, customTexts);
    }

    drawPreview(backgroundImage, customTexts, selectedElementIndex) {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;

        ctx.clearRect(0, 0, w, h);

        if (backgroundImage) {
            ctx.drawImage(backgroundImage, 0, 0, w, h);
        }

        this.drawTextPreview(ctx, w, h, customTexts, selectedElementIndex);

        // Apply glitch if enabled
        if (customTexts && customTexts.some(el => el.type === "glitch" && el.enabled)) {
            const glitchEl = customTexts.find(el => el.type === "glitch");
            this.applyGlitch(ctx, w, h, glitchEl.intensity, glitchEl.glitchType);
        }
    }

    applyGlitch(ctx, width, height, intensity = 50, glitchType = "rgb") {
        const strengthFactor = intensity / 100;
        
        if (glitchType === "rgb") {
            this.drawRGBGlitch(ctx, width, height, strengthFactor);
        } else if (glitchType === "box") {
            const boxCount = Math.ceil(strengthFactor * 3);
            for (let i = 0; i < boxCount; i++) {
                this.drawBoxGlitch(ctx, width, height);
            }
        } else if (glitchType === "line") {
            this.drawGlitchLines(ctx, width, height, strengthFactor);
        }
    }

    drawRGBGlitch(ctx, width, height, strength) {
        const imgData = ctx.getImageData(0, 0, width, height);
        const maxShift = Math.ceil(strength * 20);
        const rOffset = Math.round(-maxShift + Math.random() * maxShift * 2);
        const gOffset = Math.round(-maxShift + Math.random() * maxShift * 2);
        const bOffset = Math.round(-maxShift + Math.random() * maxShift * 2);

        const arr = new Uint8ClampedArray(imgData.data);
        for (let i = 0; i < arr.length; i += 4) {
            if (i + rOffset * 4 >= 0) arr[i + 0 + rOffset * 4] = imgData.data[i + 0];
            if (i + gOffset * 4 >= 0) arr[i + 1 + gOffset * 4] = imgData.data[i + 1];
            if (i + bOffset * 4 >= 0) arr[i + 2 + bOffset * 4] = imgData.data[i + 2];
        }
        const glitch = new ImageData(arr, imgData.width, imgData.height);
        ctx.putImageData(glitch, 0, 0);
    }

    drawBoxGlitch(ctx, width, height) {
        const randX = Math.random() * width;
        const randY = Math.random() * height;
        const randW = 10 + Math.random() * 60;
        const randH = 10 + Math.random() * 60;
        const randDestX = Math.random() * width;
        const randDestY = Math.random() * height;

        let x = Math.min(randX, width - randW);
        let y = Math.min(randY, height - randH);

        const imgData = ctx.getImageData(x, y, randW, randH);
        ctx.putImageData(imgData, randDestX, randDestY);
    }

    drawGlitchLines(ctx, width, height, strength) {
        const lineCount = Math.ceil(strength * 5);
        for (let i = 0; i < lineCount; i++) {
            const y = Math.random() * height;
            const lineHeight = 1 + Math.random() * 3;
            const shift = Math.round(strength * 30);
            const xOffset = Math.round(-shift + Math.random() * shift * 2);

            const imgData = ctx.getImageData(0, y, width, lineHeight);
            ctx.putImageData(imgData, xOffset, y);
        }
    }

    hasVisualizer(customTexts) {
        return Array.isArray(customTexts) &&
            customTexts.some(el => el && el.type === "visualizer");
    }

    /* ---------------- BARS ---------------- */

    drawBars(ctx, width, height, frequencyData) {
        const barAreaHeight = height * 0.1;
        const barWidth = width / this.BAR_COUNT;
        const gap = barWidth * 0.18;
        const radius = Math.min(6, barWidth * 0.35);

        const fftSize = frequencyData.length;
        const minBin = this.FREQ_START_INDEX;
        const maxBin = Math.floor(fftSize * 0.6);

        const MIN_BAR_HEIGHT = 2;

        let frameEnergy = 0;

        ctx.save();

        for (let i = 0; i < this.BAR_COUNT; i++) {
            const t = i / (this.BAR_COUNT - 1);

            /* ----- frequency mapping ----- */
            const logFactor = 0.8;
            const centerBin =
                minBin * Math.pow(maxBin / minBin, t * logFactor) +
                (maxBin - minBin) * t * (1 - logFactor);

            const binWidth = Math.min(12, Math.max(2, Math.floor(4 + t * 6)));
            const startBin = Math.max(minBin, Math.floor(centerBin - binWidth * 0.5));
            const endBin = Math.min(maxBin, startBin + binWidth);

            /* ----- energy ----- */
            let peak = 0;
            for (let b = startBin; b <= endBin; b++) {
                peak = Math.max(peak, frequencyData[b] / 255);
            }

            const value = Math.pow(peak, 0.9);
            frameEnergy += value;

            /* ---------- FAST ENVELOPE (motion) ---------- */
            const fastPrev = this.fastValues[i];
            const fastSpeed = value > fastPrev ? 0.65 : 0.25;
            this.fastValues[i] = fastPrev + (value - fastPrev) * fastSpeed;

            /* ---------- SLOW ENVELOPE (sustain, bass-biased) ---------- */
            const slowPrev = this.slowValues[i];
            const sustainBias = 1 - t; // bass sustains longer
            const slowUp = 0.05 + sustainBias * 0.08;
            const slowDown = 0.015 + t * 0.03;

            const slowSpeed = value > slowPrev ? slowUp : slowDown;
            this.slowValues[i] = slowPrev + (value - slowPrev) * slowSpeed;

            /* ---------- PEAK HOLD ---------- */
            const peakPrev = this.peakHold[i];
            if (value > peakPrev) {
                this.peakHold[i] = value;
            } else {
                this.peakHold[i] = peakPrev * (0.965 - t * 0.02);
            }

            /* ---------- BLEND ---------- */
            const blended =
                this.slowValues[i] * 0.65 +
                this.fastValues[i] * 0.25 +
                this.peakHold[i] * 0.1;

            if (blended < 0.01) continue;

            let barHeight = blended * barAreaHeight;
            if (barHeight < MIN_BAR_HEIGHT) barHeight = MIN_BAR_HEIGHT;

            const x = i * barWidth + gap * 0.5;
            const y = height - barHeight;

            ctx.fillStyle = `hsl(${210 + t * 100}, 85%, ${42 + blended * 30}%)`;
            this.roundRect(ctx, x, y, barWidth - gap, barHeight, radius);
        }

        /* ---------- BEAT REACTIVE SCALING ---------- */
        const avgEnergy = frameEnergy / this.BAR_COUNT;
        const beatPrev = this.beatEnergy;
        const beatRise = avgEnergy > beatPrev ? 0.15 : 0.05;
        this.beatEnergy = beatPrev + (avgEnergy - beatPrev) * beatRise;

        ctx.restore();

        // subtle global pulse (safe, non-destructive)
        ctx.globalAlpha = 1 + this.beatEnergy * 0.15;
    }

    /* ---------------- ROUNDED RECT ---------------- */

    roundRect(ctx, x, y, w, h, r) {
        if (ctx.roundRect) {
            ctx.beginPath();
            ctx.roundRect(x, y, w, h, r);
            ctx.fill();
            return;
        }

        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
        ctx.fill();
    }

    /* ---------------- TEXT (UNCHANGED) ---------------- */

    buildFontString(size, font, bold, italic) {
        return `${bold ? "bold " : ""}${italic ? "italic " : ""}${size}px ${font}`;
    }

    getAnchorPosition(textObj) {
        const ctx = this.ctx;
        ctx.font = this.buildFontString(textObj.size, textObj.font, textObj.bold, textObj.italic);

        const metrics = ctx.measureText(textObj.text);
        let x = textObj.x;
        let y = textObj.y;

        if (textObj.anchor?.includes("center")) x -= metrics.width / 2;
        if (textObj.anchor?.includes("right")) x -= metrics.width;
        if (textObj.anchor?.includes("middle")) y -= textObj.size / 2;
        if (textObj.anchor?.includes("bottom")) y -= textObj.size;

        return { x, y };
    }

    drawTextPreview(ctx, width, height, customTexts, selectedIndex) {
        if (!customTexts?.length) return;

        const scaleX = width / 1280;
        const scaleY = height / 720;

        customTexts.forEach((text, idx) => {
            if (text.type === "visualizer" || text.type === "background") return;

            const size = Math.round(text.size * scaleY);
            ctx.font = this.buildFontString(size, text.font, text.bold, text.italic);
            ctx.textBaseline = "top";
            ctx.textAlign = "left";
            ctx.fillStyle = text.color || "#fff";

            const scaledText = {
                ...text,
                size,
                x: text.x * scaleX,
                y: text.y * scaleY
            };

            const pos = this.getAnchorPosition(scaledText);
            
            // Apply offsets
            const finalX = pos.x + (text.offsetX || 0) * scaleX;
            const finalY = pos.y + (text.offsetY || 0) * scaleY;

            // Draw drop shadow if enabled
            if (text.dropShadow) {
                ctx.fillStyle = "rgba(0,0,0,0.8)";
                ctx.fillText(text.text, finalX + 2, finalY + 2);
                ctx.fillText(text.text, finalX + 4, finalY + 4);
            }

            // Draw main text
            ctx.fillStyle = text.color || "#fff";
            ctx.fillText(text.text, finalX, finalY);

            if (idx === selectedIndex) {
                const m = ctx.measureText(text.text);
                ctx.strokeStyle = "#00ff00";
                ctx.lineWidth = 2;
                ctx.strokeRect(finalX - 5, finalY - 5, m.width + 10, size + 10);
            }
        });
    }

    drawText(ctx, width, height, customTexts) {
        if (!customTexts?.length) return;

        const scaleX = width / 1280;
        const scaleY = height / 720;

        customTexts.forEach(text => {
            if (text.type === "visualizer" || text.type === "background") return;

            const size = Math.round(text.size * scaleY);
            ctx.font = this.buildFontString(size, text.font, text.bold, text.italic);
            ctx.textBaseline = "top";
            ctx.textAlign = "left";

            const scaledText = {
                ...text,
                size,
                x: text.x * scaleX,
                y: text.y * scaleY
            };

            const pos = this.getAnchorPosition(scaledText);

            // Apply offsets
            const finalX = pos.x + (text.offsetX || 0) * scaleX;
            const finalY = pos.y + (text.offsetY || 0) * scaleY;

            // Draw drop shadow if enabled
            if (text.dropShadow) {
                ctx.fillStyle = "rgba(0,0,0,0.8)";
                ctx.fillText(text.text, finalX + 2, finalY + 2);
                ctx.fillText(text.text, finalX + 4, finalY + 4);
            }

            // Draw main text
            ctx.fillStyle = text.color || "#fff";
            ctx.fillText(text.text, finalX, finalY);
        });
    }
}
