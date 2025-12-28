export class Visualizer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");

        this.BAR_COUNT = 64;
        this.FREQ_START_INDEX = 6;

        this.smoothValues = new Float32Array(this.BAR_COUNT);
        this.barPeaks = new Float32Array(this.BAR_COUNT);

        this.decaySpeed = 1.35;
        this.attackSpeed = 0.6;
        this.peakFalloff = 0.985;
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
        }

        this.drawText(ctx, width, height, customTexts);
    }

    hasVisualizer(customTexts) {
        return Array.isArray(customTexts) &&
            customTexts.some(el => el && el.type === "visualizer");
    }

    drawBars(ctx, width, height, frequencyData) {
        const barAreaHeight = height * 0.165;
        const barWidth = width / this.BAR_COUNT;
        const gap = barWidth * 0.18;
        const radius = Math.min(6, barWidth * 0.35);

        const fftSize = frequencyData.length;
        const minBin = this.FREQ_START_INDEX;
        const maxUsableBin = Math.floor(fftSize * 0.64);

        ctx.save();

        for (let i = 0; i < this.BAR_COUNT; i++) {
            const t = i / (this.BAR_COUNT - 1);

            const centerBin = minBin * Math.pow(
                maxUsableBin / minBin,
                t
            );

            const binWidth = Math.max(
                3,
                Math.floor(centerBin * (0.08 + t * 0.18))
            );

            let sum = 0;
            let count = 0;

            const startBin = Math.max(minBin, Math.floor(centerBin - binWidth * 0.5));
            const endBin = Math.min(maxUsableBin, startBin + binWidth);

            for (let b = startBin; b <= endBin; b++) {
                const v = frequencyData[b] / 255;
                sum += v * v;
                count++;
            }

            let value = count ? Math.sqrt(sum / count) : 0;
            value *= (0.55 + t * 0.9) * 0.65;
            value = Math.pow(value, 0.75);

            const prev = this.smoothValues[i];
            this.smoothValues[i] = value > prev
                ? prev + (value - prev) * this.attackSpeed
                : prev - (prev - value) * this.decaySpeed;

            const barHeight = this.smoothValues[i] * barAreaHeight;
            if (barHeight <= 0.5) continue;

            const x = i * barWidth + gap * 0.5;
            const y = height - barHeight;

            ctx.fillStyle = `hsl(${210 + t * 100}, 85%, ${42 + value * 22}%)`;
            this.roundRect(
                ctx,
                x,
                y,
                barWidth - gap,
                barHeight,
                radius
            );
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
