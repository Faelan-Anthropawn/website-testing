export class EventHandler {
    constructor(audioManager, visualizer, elementManager, exportManager, previewPlayer) {
        this.audioManager = audioManager;
        this.visualizer = visualizer;
        this.elementManager = elementManager;
        this.exportManager = exportManager;
        this.previewPlayer = previewPlayer;
        this.backgroundImage = null;
        this.draggingIndex = null;
        this.dragOffsetX = 0;
        this.dragOffsetY = 0;
    }

    setupFileHandlers(updateUI) {
        document.getElementById("audioFile").addEventListener("change", async (e) => {
            if (e.target.files[0]) {
                await this.audioManager.loadAudioFromFile(e.target.files[0]);
                updateUI();
            }
        });

        document.getElementById("imageFile").addEventListener("change", async (e) => {
            if (e.target.files[0]) {
                this.backgroundImage = await this.loadImage(e.target.files[0]);
                updateUI();
            }
        });
    }

    setupCanvasHandlers(canvas, updateUI) {
        canvas.addEventListener("click", (e) => {
            const { x, y } = this.getCanvasCoordinates(canvas, e);
            for (let i = this.elementManager.getElements().length - 1; i >= 0; i--) {
                const element = this.elementManager.getElements()[i];
                const bounds = this.visualizer.getTextBounds(element);

                if (x >= bounds.left && x <= bounds.right && y >= bounds.top && y <= bounds.bottom) {
                    this.elementManager.selectElement(i);
                    updateUI();
                    return;
                }
            }
            this.elementManager.clearSelection();
            updateUI();
        });
    }

    setupElementControls(updateUI) {
        // Add Element button - toggle submenu
        const addBtn = document.getElementById("addElementBtn");
        if (addBtn) {
            addBtn.removeEventListener("click", this.addBtnHandler);
            this.addBtnHandler = (e) => {
                e.preventDefault();
                e.stopPropagation();
                const menu = document.getElementById("addElementMenu");
                if (menu) menu.classList.toggle("hidden");
            };
            addBtn.addEventListener("click", this.addBtnHandler);
        }

        // Submenu options
        const songTitleBtn = document.getElementById("addSongTitle");
        if (songTitleBtn) {
            songTitleBtn.removeEventListener("click", this.songTitleHandler);
            this.songTitleHandler = (e) => {
                e.preventDefault();
                e.stopPropagation();
                const songName = document.getElementById("songName")?.value || "Song Title";
                const artistName = document.getElementById("artistName")?.value || "Artist Name";
                this.elementManager.addElement("song-title", { text: songName });
                this.elementManager.addElement("song-artist", { text: artistName });
                const menu = document.getElementById("addElementMenu");
                if (menu) menu.classList.add("hidden");
                updateUI();
            };
            songTitleBtn.addEventListener("click", this.songTitleHandler);
        }

        const textBtn = document.getElementById("addText");
        if (textBtn) {
            textBtn.removeEventListener("click", this.textHandler);
            this.textHandler = (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.elementManager.addElement("text");
                const menu = document.getElementById("addElementMenu");
                if (menu) menu.classList.add("hidden");
                updateUI();
            };
            textBtn.addEventListener("click", this.textHandler);
        }

        const vizBtn = document.getElementById("addVisualizer");
        if (vizBtn) {
            vizBtn.removeEventListener("click", this.vizHandler);
            this.vizHandler = (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.elementManager.addElement("visualizer");
                const menu = document.getElementById("addElementMenu");
                if (menu) menu.classList.add("hidden");
                updateUI();
            };
            vizBtn.addEventListener("click", this.vizHandler);
        }

        const bgBtn = document.getElementById("addBackground");
        if (bgBtn) {
            bgBtn.removeEventListener("click", this.bgHandler);
            this.bgHandler = (e) => {
                e.preventDefault();
                e.stopPropagation();
                document.getElementById("imageFile")?.click();
                const menu = document.getElementById("addElementMenu");
                if (menu) menu.classList.add("hidden");
            };
            bgBtn.addEventListener("click", this.bgHandler);
        }

        // Text element handlers
        document.getElementById("elementText").addEventListener("input", (e) => {
            const selected = this.elementManager.getSelectedElement();
            if (selected && selected.text !== undefined) {
                selected.text = e.target.value;
                updateUI();
            }
        });

        document.getElementById("elementSize").addEventListener("input", (e) => {
            const selected = this.elementManager.getSelectedElement();
            if (selected && selected.size !== undefined) {
                selected.size = parseInt(e.target.value);
                updateUI();
            }
        });

        document.getElementById("elementColor").addEventListener("input", (e) => {
            const selected = this.elementManager.getSelectedElement();
            if (selected) {
                selected.color = e.target.value;
                updateUI();
            }
        });

        document.getElementById("elementFont").addEventListener("change", (e) => {
            const selected = this.elementManager.getSelectedElement();
            if (selected) {
                selected.font = e.target.value;
                updateUI();
            }
        });

        const boldCheckbox = document.getElementById("elementBold");
        if (boldCheckbox) {
            boldCheckbox.addEventListener("change", (e) => {
                const selected = this.elementManager.getSelectedElement();
                if (selected && ["text", "song-title", "song-artist"].includes(selected.type)) {
                    selected.bold = e.target.checked === true;
                    updateUI();
                }
            });
        }

        const italicCheckbox = document.getElementById("elementItalic");
        if (italicCheckbox) {
            italicCheckbox.addEventListener("change", (e) => {
                const selected = this.elementManager.getSelectedElement();
                if (selected && ["text", "song-title", "song-artist"].includes(selected.type)) {
                    selected.italic = e.target.checked === true;
                    updateUI();
                }
            });
        }

        const shadowCheckbox = document.getElementById("elementDropShadow");
        if (shadowCheckbox) {
            shadowCheckbox.addEventListener("change", (e) => {
                const selected = this.elementManager.getSelectedElement();
                if (selected && ["text", "song-title", "song-artist"].includes(selected.type)) {
                    selected.dropShadow = e.target.checked === true;
                    updateUI();
                }
            });
        }

        document.getElementById("elementOffsetX").addEventListener("input", (e) => {
            const selected = this.elementManager.getSelectedElement();
            if (selected) {
                selected.offsetX = parseInt(e.target.value) || 0;
                updateUI();
            }
        });

        document.getElementById("elementOffsetY").addEventListener("input", (e) => {
            const selected = this.elementManager.getSelectedElement();
            if (selected) {
                selected.offsetY = parseInt(e.target.value) || 0;
                updateUI();
            }
        });

        document.getElementById("deleteElement").addEventListener("click", () => {
            const index = this.elementManager.getSelectedIndex();
            if (index !== null) {
                this.elementManager.deleteElement(index);
                updateUI();
            }
        });
    }

    setupExportModal() {
        const exportBtn = document.getElementById("exportBtn");
        const exportModal = document.getElementById("exportModal");
        const exportCancel = document.getElementById("exportCancel");
        const beginRender = document.getElementById("beginRender");

        exportBtn.addEventListener("click", () => {
            exportModal.classList.remove("hidden");
        });

        exportCancel.addEventListener("click", () => {
            exportModal.classList.add("hidden");
        });

        exportModal.addEventListener("click", (e) => {
            if (e.target === exportModal) {
                exportModal.classList.add("hidden");
            }
        });

        beginRender.addEventListener("click", async () => {
            await this.startRender(beginRender, exportModal);
        });
    }

    async startRender(renderBtn, exportModal) {
        if (!this.audioManager.getAudioBuffer()) {
            alert("Please load an audio file first");
            return;
        }

        const width = 2560;
        const height = 1440;
        const fps = 50;
        const songName = document.getElementById("songName").value;

        renderBtn.disabled = true;
        renderBtn.textContent = "Rendering...";

        try {
            const blob = await this.exportManager.renderVideo(
                width,
                height,
                fps,
                this.backgroundImage,
                this.elementManager.getElements(),
                songName
            );

            if (blob) {
                this.exportManager.downloadVideo(blob, songName);
            }
        } catch (err) {
            console.error("Render error:", err);
            alert("Error rendering video. Check console for details.");
        } finally {
            renderBtn.disabled = false;
            renderBtn.textContent = "Begin Render";
            exportModal.classList.add("hidden");
        }
    }

    getCanvasCoordinates(canvas, event) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        return {
            x: (event.clientX - rect.left) * scaleX,
            y: (event.clientY - rect.top) * scaleY
        };
    }

    setupPreviewControls(updateUI) {
        document.getElementById("playBtn").addEventListener("click", () => {
            if (this.previewPlayer.getIsPlaying()) {
                this.previewPlayer.pause();
                document.getElementById("playBtn").textContent = "▶ Play";
            } else {
                this.previewPlayer.setRenderData(this.backgroundImage, this.elementManager.getElements());
                this.previewPlayer.play(this.backgroundImage, this.elementManager.getElements());
                document.getElementById("playBtn").textContent = "⏸ Pause";
            }
        });

        document.getElementById("stopBtn").addEventListener("click", () => {
            this.previewPlayer.stop();
            document.getElementById("playBtn").textContent = "▶ Play";
            document.getElementById("timeSlider").value = 0;
            document.getElementById("timeDisplay").textContent = "0:00";
            updateUI();
        });

        document.getElementById("timeSlider").addEventListener("change", (e) => {
            const time = parseFloat(e.target.value);
            this.previewPlayer.seek(time);
            if (!this.previewPlayer.getIsPlaying()) {
                updateUI();
            }
        });
    }

    async loadImage(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => resolve(img);
                img.onerror = reject;
                img.src = e.target.result;
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }
}
