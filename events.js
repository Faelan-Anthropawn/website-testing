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
            // Click handler for future text selection on canvas
            // For now, users select elements from the left sidebar
            const { x, y } = this.getCanvasCoordinates(canvas, e);
            // Text bounds calculation would go here
        });
    }

    setupElementControls(updateUI) {
        // Add Element button - open modal
        const addBtn = document.getElementById("addElementBtn");
        if (addBtn) {
            addBtn.removeEventListener("click", this.addBtnHandler);
            this.addBtnHandler = (e) => {
                e.preventDefault();
                e.stopPropagation();
                const modal = document.getElementById("addElementModal");
                if (modal) modal.classList.remove("hidden");
            };
            addBtn.addEventListener("click", this.addBtnHandler);
        }

        // Close modal button
        const closeModal = document.getElementById("closeAddModal");
        if (closeModal) {
            closeModal.removeEventListener("click", this.closeModalHandler);
            this.closeModalHandler = () => {
                const modal = document.getElementById("addElementModal");
                if (modal) modal.classList.add("hidden");
            };
            closeModal.addEventListener("click", this.closeModalHandler);
        }

        // Close modal when clicking outside
        const modal = document.getElementById("addElementModal");
        if (modal) {
            modal.removeEventListener("click", this.modalBackdropHandler);
            this.modalBackdropHandler = (e) => {
                if (e.target === modal) {
                    modal.classList.add("hidden");
                }
            };
            modal.addEventListener("click", this.modalBackdropHandler);
        }

        // Modal options
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
                const modal = document.getElementById("addElementModal");
                if (modal) modal.classList.add("hidden");
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
                const modal = document.getElementById("addElementModal");
                if (modal) modal.classList.add("hidden");
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
                const modal = document.getElementById("addElementModal");
                if (modal) modal.classList.add("hidden");
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
                const modal = document.getElementById("addElementModal");
                if (modal) modal.classList.add("hidden");
            };
            bgBtn.addEventListener("click", this.bgHandler);
        }

        const glitchBtn = document.getElementById("addGlitch");
        if (glitchBtn) {
            glitchBtn.removeEventListener("click", this.glitchHandler);
            this.glitchHandler = (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.elementManager.addElement("glitch");
                const modal = document.getElementById("addElementModal");
                if (modal) modal.classList.add("hidden");
                updateUI();
            };
            glitchBtn.addEventListener("click", this.glitchHandler);
        }

        // Glitch element handlers
        const glitchEnabled = document.getElementById("glitchEnabled");
        if (glitchEnabled) {
            glitchEnabled.removeEventListener("change", this.glitchEnabledHandler);
            this.glitchEnabledHandler = (e) => {
                const selected = this.elementManager.getSelectedElement();
                if (selected && selected.type === "glitch") {
                    selected.enabled = e.target.checked;
                    updateUI();
                }
            };
            glitchEnabled.addEventListener("change", this.glitchEnabledHandler);
        }

        const glitchIntensity = document.getElementById("glitchIntensity");
        if (glitchIntensity) {
            glitchIntensity.removeEventListener("input", this.glitchIntensityHandler);
            this.glitchIntensityHandler = (e) => {
                const selected = this.elementManager.getSelectedElement();
                if (selected && selected.type === "glitch") {
                    selected.intensity = parseInt(e.target.value) || 50;
                    document.getElementById("glitchIntensityValue").textContent = (selected.intensity) + "%";
                    updateUI();
                }
            };
            glitchIntensity.addEventListener("input", this.glitchIntensityHandler);
        }

        const glitchType = document.getElementById("glitchType");
        if (glitchType) {
            glitchType.removeEventListener("change", this.glitchTypeHandler);
            this.glitchTypeHandler = (e) => {
                const selected = this.elementManager.getSelectedElement();
                if (selected && selected.type === "glitch") {
                    selected.glitchType = e.target.value;
                    updateUI();
                }
            };
            glitchType.addEventListener("change", this.glitchTypeHandler);
        }

        // Text element handlers
        const elementText = document.getElementById("elementText");
        if (elementText) {
            elementText.removeEventListener("input", this.textInputHandler);
            this.textInputHandler = (e) => {
                const selected = this.elementManager.getSelectedElement();
                if (selected && selected.text !== undefined) {
                    selected.text = e.target.value;
                    updateUI();
                }
            };
            elementText.addEventListener("input", this.textInputHandler);
        }

        const elementSize = document.getElementById("elementSize");
        if (elementSize) {
            elementSize.removeEventListener("input", this.sizeInputHandler);
            this.sizeInputHandler = (e) => {
                const selected = this.elementManager.getSelectedElement();
                if (selected && selected.size !== undefined) {
                    selected.size = parseInt(e.target.value);
                    updateUI();
                }
            };
            elementSize.addEventListener("input", this.sizeInputHandler);
        }

        const elementColor = document.getElementById("elementColor");
        if (elementColor) {
            elementColor.removeEventListener("input", this.colorInputHandler);
            this.colorInputHandler = (e) => {
                const selected = this.elementManager.getSelectedElement();
                if (selected) {
                    selected.color = e.target.value;
                    updateUI();
                }
            };
            elementColor.addEventListener("input", this.colorInputHandler);
        }

        const elementFont = document.getElementById("elementFont");
        if (elementFont) {
            elementFont.removeEventListener("change", this.fontChangeHandler);
            this.fontChangeHandler = (e) => {
                const selected = this.elementManager.getSelectedElement();
                if (selected) {
                    selected.font = e.target.value;
                    updateUI();
                }
            };
            elementFont.addEventListener("change", this.fontChangeHandler);
        }

        const boldCheckbox = document.getElementById("elementBold");
        if (boldCheckbox) {
            boldCheckbox.removeEventListener("change", this.boldChangeHandler);
            this.boldChangeHandler = (e) => {
                const selected = this.elementManager.getSelectedElement();
                if (selected && ["text", "song-title", "song-artist"].includes(selected.type)) {
                    selected.bold = e.target.checked === true;
                    updateUI();
                }
            };
            boldCheckbox.addEventListener("change", this.boldChangeHandler);
        }

        const italicCheckbox = document.getElementById("elementItalic");
        if (italicCheckbox) {
            italicCheckbox.removeEventListener("change", this.italicChangeHandler);
            this.italicChangeHandler = (e) => {
                const selected = this.elementManager.getSelectedElement();
                if (selected && ["text", "song-title", "song-artist"].includes(selected.type)) {
                    selected.italic = e.target.checked === true;
                    updateUI();
                }
            };
            italicCheckbox.addEventListener("change", this.italicChangeHandler);
        }

        const shadowCheckbox = document.getElementById("elementDropShadow");
        if (shadowCheckbox) {
            shadowCheckbox.removeEventListener("change", this.shadowChangeHandler);
            this.shadowChangeHandler = (e) => {
                const selected = this.elementManager.getSelectedElement();
                if (selected && ["text", "song-title", "song-artist"].includes(selected.type)) {
                    selected.dropShadow = e.target.checked === true;
                    updateUI();
                }
            };
            shadowCheckbox.addEventListener("change", this.shadowChangeHandler);
        }

        const elementOffsetX = document.getElementById("elementOffsetX");
        if (elementOffsetX) {
            elementOffsetX.removeEventListener("input", this.offsetXHandler);
            this.offsetXHandler = (e) => {
                const selected = this.elementManager.getSelectedElement();
                if (selected) {
                    selected.offsetX = parseInt(e.target.value) || 0;
                    updateUI();
                }
            };
            elementOffsetX.addEventListener("input", this.offsetXHandler);
        }

        const elementOffsetY = document.getElementById("elementOffsetY");
        if (elementOffsetY) {
            elementOffsetY.removeEventListener("input", this.offsetYHandler);
            this.offsetYHandler = (e) => {
                const selected = this.elementManager.getSelectedElement();
                if (selected) {
                    selected.offsetY = parseInt(e.target.value) || 0;
                    updateUI();
                }
            };
            elementOffsetY.addEventListener("input", this.offsetYHandler);
        }

        const deleteElement = document.getElementById("deleteElement");
        if (deleteElement) {
            deleteElement.removeEventListener("click", this.deleteElementHandler);
            this.deleteElementHandler = () => {
                const index = this.elementManager.getSelectedIndex();
                if (index !== null) {
                    this.elementManager.deleteElement(index);
                    updateUI();
                }
            };
            deleteElement.addEventListener("click", this.deleteElementHandler);
        }
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
