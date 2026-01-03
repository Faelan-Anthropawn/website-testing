import { AudioManager } from "./audio.js";
import { Visualizer } from "./visualizer.js";
import { ElementManager } from "./elements.js";
import { ExportManager } from "./export.js";
import { PreviewPlayer } from "./preview.js";
import { EventHandler } from "./events.js";

class App {
    constructor() {
        this.canvas = document.getElementById("canvas");
        this.audioManager = new AudioManager();
        this.visualizer = new Visualizer(this.canvas);
        this.elementManager = new ElementManager();
        this.exportManager = new ExportManager(this.audioManager, this.visualizer);
        this.previewPlayer = new PreviewPlayer(this.audioManager, this.visualizer, this.canvas);
        this.eventHandler = new EventHandler(
            this.audioManager,
            this.visualizer,
            this.elementManager,
            this.exportManager,
            this.previewPlayer
        );
    }

    init() {
        this.eventHandler.setupFileHandlers(() => this.updateUI());
        this.eventHandler.setupCanvasHandlers(this.canvas, () => this.updateUI());
        this.eventHandler.setupElementControls(() => this.updateUI());
        this.eventHandler.setupPreviewControls(() => this.updateUI());
        this.eventHandler.setupExportModal();
        
        // Wire up upload audio button
        const uploadBtn = document.getElementById("uploadAudioBtn");
        if (uploadBtn) {
            uploadBtn.addEventListener("click", () => {
                document.getElementById("audioFile").click();
            });
        }
        
        this.startPreviewTimer();
        this.updateUI();
    }

    startPreviewTimer() {
        setInterval(() => {
            if (this.previewPlayer.getIsPlaying()) {
                this.updatePreviewUI();
            }
        }, 100);
    }

    updatePreviewUI() {
        const duration = this.previewPlayer.getDuration();
        const currentTime = this.previewPlayer.getCurrentTime();
        
        if (duration > 0) {
            const timeSlider = document.getElementById("timeSlider");
            const timeDisplay = document.getElementById("currentTime");
            if (timeSlider) timeSlider.max = duration;
            if (timeSlider) timeSlider.value = currentTime;
            if (timeDisplay) timeDisplay.textContent = this.formatTime(currentTime);
        }
    }

    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    updateUI() {
        this.updateElementsList();
        this.updateSelectedElementControls();
        this.eventHandler.setupElementControls(() => this.updateUI());
        this.redrawCanvas();
    }

    updateElementsList() {
        const list = document.getElementById("elementsList");
        const elements = this.elementManager.getElements();

        if (elements.length === 0) {
            list.innerHTML = '<div class="text-slate-500 text-xs text-center py-8">No elements yet</div>';
            return;
        }

        const typeLabels = {
            text: "📝",
            "song-title": "🎵",
            "song-artist": "🎤",
            visualizer: "🎛️",
            background: "🖼️",
            glitch: "⚡"
        };

        list.innerHTML = elements.map((el, idx) => {
            const label = typeLabels[el.type] || "📦";
            const displayText = el.text ? `${label} ${el.text.substring(0, 20)}${el.text.length > 20 ? '...' : ''}` : `${label} ${el.type}`;
            
            return `
                <div class="card p-3 cursor-pointer transition-all ${this.elementManager.getSelectedIndex() === idx ? 'bg-primary/20 border-primary/50' : 'hover:bg-slate-700/50'}" onclick="window.app.selectElement(${idx})">
                    <div class="flex justify-between items-center">
                        <span class="text-sm truncate">${displayText}</span>
                        <button onclick="window.app.deleteElement(${idx}); event.stopPropagation();" class="text-slate-400 hover:text-red-400 text-lg leading-none">×</button>
                    </div>
                </div>
            `;
        }).join("");
    }

    updateSelectedElementControls() {
        const controls = document.getElementById("selectedElementControls");
        const selected = this.elementManager.getSelectedElement();

        if (!controls) return;

        if (!selected) {
            controls.classList.add("hidden");
            return;
        }

        controls.classList.remove("hidden");

        // Show/hide editor sections based on element type
        const textSection = document.getElementById("textEditorSection");
        const visualizerSection = document.getElementById("visualizerEditorSection");
        const glitchSection = document.getElementById("glitchEditorSection");
        const imageSection = document.getElementById("imageEditorSection");

        if (textSection) textSection.classList.add("hidden");
        if (visualizerSection) visualizerSection.classList.add("hidden");
        if (glitchSection) glitchSection.classList.add("hidden");
        if (imageSection) imageSection.classList.add("hidden");

        const offsetXInput = document.getElementById("elementOffsetX");
        const offsetYInput = document.getElementById("elementOffsetY");
        const genericOffsetSection = document.getElementById("genericOffsetSection");

        if (selected.type === "glitch") {
            if (genericOffsetSection) genericOffsetSection.classList.add("hidden");
        } else {
            if (genericOffsetSection) genericOffsetSection.classList.remove("hidden");
            if (offsetXInput) offsetXInput.value = selected.offsetX || 0;
            if (offsetYInput) offsetYInput.value = selected.offsetY || 0;
        }

        if (["text", "song-title", "song-artist"].includes(selected.type)) {
            if (textSection) textSection.classList.remove("hidden");
            const textInput = document.getElementById("elementText");
            const sizeInput = document.getElementById("elementSize");
            const colorInput = document.getElementById("elementColor");
            const fontInput = document.getElementById("elementFont");
            const boldInput = document.getElementById("elementBold");
            const italicInput = document.getElementById("elementItalic");
            const shadowInput = document.getElementById("elementDropShadow");

            if (textInput) textInput.value = selected.text || "";
            if (sizeInput) sizeInput.value = selected.size || 48;
            if (colorInput) colorInput.value = selected.color || "#ffffff";
            if (fontInput) fontInput.value = selected.font || "Inter";
            if (boldInput) boldInput.checked = selected.bold || false;
            if (italicInput) italicInput.checked = selected.italic || false;
            if (shadowInput) shadowInput.checked = selected.dropShadow || false;
        } else if (selected.type === "visualizer") {
            if (visualizerSection) visualizerSection.classList.remove("hidden");
            const barWidthInput = document.getElementById("vizBarWidth");
            const barGapInput = document.getElementById("vizBarGap");
            const colorInput = document.getElementById("vizColor");
            if (barWidthInput) barWidthInput.value = selected.barWidth || 4;
            if (barGapInput) barGapInput.value = selected.barGap || 2;
            if (colorInput) colorInput.value = selected.color || "#7C8CF8";
        } else if (selected.type === "glitch") {
            if (glitchSection) glitchSection.classList.remove("hidden");
            const minIntensityInput = document.getElementById("glitchMinIntensity");
            const maxIntensityInput = document.getElementById("glitchMaxIntensity");
            const sensitivityInput = document.getElementById("glitchSensitivity");
            const typeInput = document.getElementById("glitchType");
            const freqInput = document.getElementById("glitchFollowFrequency");
            
            if (minIntensityInput) {
                minIntensityInput.value = selected.minIntensity !== undefined ? selected.minIntensity : 10;
                document.getElementById("glitchMinIntensityValue").textContent = (minIntensityInput.value) + "%";
            }
            if (maxIntensityInput) {
                maxIntensityInput.value = selected.maxIntensity !== undefined ? selected.maxIntensity : 80;
                document.getElementById("glitchMaxIntensityValue").textContent = (maxIntensityInput.value) + "%";
            }
            if (sensitivityInput) {
                sensitivityInput.value = selected.sensitivity || 50;
                document.getElementById("glitchSensitivityValue").textContent = (selected.sensitivity || 50) + "%";
            }
            if (typeInput) typeInput.value = selected.glitchType || "rgb";
            if (freqInput) freqInput.value = selected.followFrequency || "volume";
        } else if (selected.type === "image") {
            if (imageSection) imageSection.classList.remove("hidden");
            const scaleInput = document.getElementById("imageElementScale");
            if (scaleInput) {
                scaleInput.value = selected.scale || 50;
                document.getElementById("imageElementScaleValue").textContent = (selected.scale || 50) + "%";
            }
        }
    }

    redrawCanvas() {
        this.visualizer.drawPreview(
            this.eventHandler.backgroundImage,
            this.elementManager.getElements(),
            this.elementManager.getSelectedIndex()
        );
    }

    selectElement(idx) {
        this.elementManager.selectElement(idx);
        this.updateUI();
    }

    deleteElement(idx) {
        this.elementManager.deleteElement(idx);
        this.updateUI();
    }
}

const app = new App();
window.app = app;
app.init();
