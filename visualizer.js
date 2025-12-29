export class Visualizer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");

        this.BAR_COUNT = 64;
        this.FREQ_START_INDEX = 6;

        this.smoothValues = new Float32Array(this.BAR_COUNT);

        // Tuned for visualizers (not meters)
        this.attackSpeed = 0.6;   // rise speed
        this.decaySpeed = 0.08;   // fall speed
    }

    drawPreview(backgroundImage, customTexts, selectedElementIndex) {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;

        ctx.clearRect(0, 0, w, h);

        if (backgroundImage) {
            ctx.drawImage(backgroundImage, 0, 0, w, h);
        }

        this.drawText(ctx, w, h, customTexts, selectedElementIndex);
    }

    drawFrame(ctx, width, height, frequencyData, backgroundImage, customTexts) {
        ctx.clearRect(0, 0, width, height);

        if (backgroundImage) {
            ctx.drawImage(backgroundImage, 0, 0, width, height);
        }

        if (frequencyData && this.hasVisualizer(customTexts)) {
            this.drawBars(ctx, width, height, frequencyData);
        } else {
            // hard reset when visualizer disabled
            this.smoothValues.fill(0);
        }

        this.drawText(ctx, width, height, customTexts);
    }

    hasVisualizer(customTexts) {
        return Array.isArray(customTexts) &&
            customTexts.some(el => el && el.type === "visualizer");
    }

    drawBars(ctx, width, height, frequencyData) {
    const barAreaHeight = height * 0.5; // increase to fill ~50% of screen
    const barWidth = width / this.BAR_COUNT;
    const gap = barWidth * 0.18;
    const radius = Math.min(6, barWidth * 0.35);

    const fftSize = frequencyData.length;
    const minBin = this.FREQ_START_INDEX;
    const maxBin = Math.floor(fftSize * 0.6);

    const MIN_BAR_HEIGHT = 2; // minimum visible height for enabled bars

    ctx.save();

    for (let i = 0; i < this.BAR_COUNT; i++) {
        const t = i / (this.BAR_COUNT - 1);

        // logarithmic + slight linear mix to prevent left bars from repeating
        const logFactor = 0.8;
        const centerBin = minBin * Math.pow(maxBin / minBin, t * logFactor) + (maxBin - minBin) * t * (1 - logFactor);

        const binWidth = Math.min(12, Math.max(2, Math.floor(4 + t * 6)));
        const startBin = Math.max(minBin, Math.floor(centerBin - binWidth * 0.5));
        const endBin = Math.min(maxBin, startBin + binWidth);

        // compute peak energy
        let peak = 0;
        for (let b = startBin; b <= endBin; b++) {
            peak = Math.max(peak, frequencyData[b] / 255);
        }

        // slight perceptual shaping, less aggressive
        let value = peak * 1.05;

        // temporal smoothing with frequency-dependent speed
        const prev = this.smoothValues[i];
        const speed = value > prev 
            ? 0.5 - 0.3 * t  // slower rise for low freqs
            : 0.05 + 0.1 * t; // faster decay for high freqs
        const smoothed = prev + (value - prev) * speed;

        // hard silence cutoff
        this.smoothValues[i] = smoothed < 0.01 ? 0 : smoothed;

        // calculate bar height with minimum height enforced
        let barHeight = this.smoothValues[i] * barAreaHeight;
        if (barHeight > 0 && barHeight < MIN_BAR_HEIGHT) barHeight = MIN_BAR_HEIGHT;

        const x = i * barWidth + gap * 0.5;
        const y = height - barHeight;

        ctx.fillStyle = `hsl(${210 + t * 100}, 85%, ${42 + value * 22}%)`;
        this.roundRect(ctx, x, y, barWidth - gap, barHeight, radius);
    }

    ctx.restore();
}

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

    // ---------- text system unchanged ----------
    buildFontString(size, font, bold, italic) {
        return `${bold ? "bold " : ""}${italic ? "italic " : ""}${size}px ${font}`;
    }

    getAnchorPosition(textObj, canvasWidth = this.canvas.width, canvasHeight = this.canvas.height) {
        const ctx = this.ctx;
        ctx.font = this.buildFontString(textObj.size, textObj.font, textObj.bold, textObj.italic);

        const metrics = ctx.measureText(textObj.text);
        const textWidth = metrics.width;
        const textHeight = textObj.size;

        const parts = (textObj.anchor || "top-left").toLowerCase().split("-");
        let v = "top", h = "left";

        for (const p of parts) {
            if (p === "top" || p === "middle" || p === "bottom") v = p;
            if (p === "left" || p === "center" || p === "right") h = p;
        }

        let x = textObj.x;
        let y = textObj.y;

        if (h === "center") x -= textWidth / 2;
        else if (h === "right") x -= textWidth;

        if (v === "middle") y -= textHeight / 2;
        else if (v === "bottom") y -= textHeight;

        return {
            x: x + (textObj.offsetX || 0),
            y: y + (textObj.offsetY || 0)
        };
    }

    drawText(ctx, width, height, customTexts, selectedIndex) {
        if (!customTexts?.length) return;

        const scaleX = width / 1280;
        const scaleY = height / 720;

        customTexts.forEach((text, idx) => {
            if (text.type === "visualizer" || text.type === "background") return;

            const size = Math.round(text.size * scaleY);
            ctx.font = this.buildFontString(size, text.font, text.bold, text.italic);
            ctx.textBaseline = "top";
            ctx.textAlign = "left";

            const scaled = {
                ...text,
                size,
                x: text.x * scaleX,
                y: text.y * scaleY,
                offsetX: (text.offsetX || 0) * scaleX,
                offsetY: (text.offsetY || 0) * scaleY
            };

            const pos = this.getAnchorPosition(scaled, width, height);

            if (text.dropShadow) {
                ctx.fillStyle = "rgba(0,0,0,0.7)";
                ctx.fillText(text.text, pos.x + 3, pos.y + 3);
            }

            ctx.fillStyle = text.color || "#fff";
            ctx.fillText(text.text, pos.x, pos.y);

            if (idx === selectedIndex) {
                const m = ctx.measureText(text.text);
                ctx.strokeStyle = "#00ff00";
                ctx.lineWidth = 2;
                ctx.strokeRect(pos.x - 5, pos.y - 5, m.width + 10, size + 10);
            }
        });
    }
}
