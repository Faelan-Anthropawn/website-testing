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
        // Validation helper with unique listener management
        if (!this.inputHandlers) this.inputHandlers = new Map();

        const handleNumberInput = (id, property, min = -Infinity, max = Infinity, isInt = true) => {
            const input = document.getElementById(id);
            if (!input) return;

            // Remove old listeners if they exist to prevent duplication
            const oldHandlers = this.inputHandlers.get(id);
            if (oldHandlers) {
                input.removeEventListener("input", oldHandlers.input);
                input.removeEventListener("blur", oldHandlers.blur);
            }

            const inputHandler = (e) => {
                const selected = this.elementManager.getSelectedElement();
                if (!selected) return;
                const val = e.target.value;
                if (val === "" || val === "-" || val === ".") {
                    input.classList.add("border-yellow-500");
                    return;
                }
                const num = isInt ? parseInt(val) : parseFloat(val);
                if (!isNaN(num)) {
                    selected[property] = num;
                    input.classList.remove("border-red-500", "border-yellow-500");
                    updateUI();
                } else {
                    input.classList.add("border-red-500");
                }
            };

            const blurHandler = (e) => {
                const selected = this.elementManager.getSelectedElement();
                if (!selected) return;
                const val = e.target.value;
                const num = isInt ? parseInt(val) : parseFloat(val);
                if (isNaN(num)) {
                    input.value = selected[property] || 0;
                    input.classList.remove("border-red-500", "border-yellow-500");
                } else {
                    const clamped = Math.max(min, Math.min(max, num));
                    selected[property] = clamped;
                    input.value = clamped;
                    input.classList.remove("border-red-500", "border-yellow-500");
                    updateUI();
                }
            };

            input.addEventListener("input", inputHandler);
            input.addEventListener("blur", blurHandler);
            this.inputHandlers.set(id, { input: inputHandler, blur: blurHandler });
        };

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

        // Replace existing individual handlers with the new helper
        handleNumberInput("elementSize", "size", 1, 500);
        handleNumberInput("vizBarWidth", "barWidth", 1, 100);
        handleNumberInput("vizBarGap", "barGap", 0, 100);
        handleNumberInput("elementOffsetX", "offsetX");
        handleNumberInput("elementOffsetY", "offsetY");

        // Modal options
        const songTitleBtn = document.getElementById("addSongTitle");
        if (songTitleBtn) {
            songTitleBtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                const songName = document.getElementById("songName")?.value || "Song Title";
                const artistName = document.getElementById("artistName")?.value || "Artist Name";
                this.elementManager.addElement("song-title", { text: songName });
                this.elementManager.addElement("song-artist", { text: artistName });
                document.getElementById("addElementModal")?.classList.add("hidden");
                updateUI();
            };
        }

        const textBtn = document.getElementById("addText");
        if (textBtn) {
            textBtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.elementManager.addElement("text");
                document.getElementById("addElementModal")?.classList.add("hidden");
                updateUI();
            };
        }

        const vizBtn = document.getElementById("addVisualizer");
        if (vizBtn) {
            vizBtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.elementManager.addElement("visualizer");
                document.getElementById("addElementModal")?.classList.add("hidden");
                updateUI();
            };
        }

        const bgBtn = document.getElementById("addBackground");
        if (bgBtn) {
            bgBtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                document.getElementById("imageFile")?.click();
                document.getElementById("addElementModal")?.classList.add("hidden");
            };
        }

        const glitchBtn = document.getElementById("addGlitch");
        if (glitchBtn) {
            glitchBtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.elementManager.addElement("glitch");
                document.getElementById("addElementModal")?.classList.add("hidden");
                updateUI();
            };
        }

        const imageElBtn = document.getElementById("addImageElement");
        if (imageElBtn) {
            imageElBtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                const input = document.createElement("input");
                input.type = "file";
                input.accept = "image/*";
                input.onchange = async (ie) => {
                    if (ie.target.files[0]) {
                        const img = await this.loadImage(ie.target.files[0]);
                        this.elementManager.addElement("image", { image: img });
                        document.getElementById("addElementModal")?.classList.add("hidden");
                        updateUI();
                    }
                };
                input.click();
            };
        }

        const imageScale = document.getElementById("imageElementScale");
        if (imageScale) {
            imageScale.removeEventListener("input", this.imageScaleHandler);
            this.imageScaleHandler = (e) => {
                const selected = this.elementManager.getSelectedElement();
                if (selected && selected.type === "image") {
                    selected.scale = parseInt(e.target.value) || 50;
                    document.getElementById("imageElementScaleValue").textContent = selected.scale + "%";
                    updateUI();
                }
            };
            imageScale.addEventListener("input", this.imageScaleHandler);
        }

        const replaceImageBtn = document.getElementById("replaceImageBtn");
        if (replaceImageBtn) {
            replaceImageBtn.removeEventListener("click", this.replaceImageHandler);
            this.replaceImageHandler = () => {
                const selected = this.elementManager.getSelectedElement();
                if (selected && selected.type === "image") {
                    const input = document.createElement("input");
                    input.type = "file";
                    input.accept = "image/*";
                    input.onchange = async (ie) => {
                        if (ie.target.files[0]) {
                            selected.image = await this.loadImage(ie.target.files[0]);
                            updateUI();
                        }
                    };
                    input.click();
                }
            };
            replaceImageBtn.addEventListener("click", this.replaceImageHandler);
        }


        const glitchMinIntensity = document.getElementById("glitchMinIntensity");
        if (glitchMinIntensity) {
            glitchMinIntensity.removeEventListener("input", this.glitchMinHandler);
            this.glitchMinHandler = (e) => {
                const selected = this.elementManager.getSelectedElement();
                if (selected && selected.type === "glitch") {
                    selected.minIntensity = parseInt(e.target.value) || 0;
                    document.getElementById("glitchMinIntensityValue").textContent = selected.minIntensity + "%";
                    updateUI();
                }
            };
            glitchMinIntensity.addEventListener("input", this.glitchMinHandler);
        }

        const glitchMaxIntensity = document.getElementById("glitchMaxIntensity");
        if (glitchMaxIntensity) {
            glitchMaxIntensity.removeEventListener("input", this.glitchMaxHandler);
            this.glitchMaxHandler = (e) => {
                const selected = this.elementManager.getSelectedElement();
                if (selected && selected.type === "glitch") {
                    selected.maxIntensity = parseInt(e.target.value) || 0;
                    document.getElementById("glitchMaxIntensityValue").textContent = selected.maxIntensity + "%";
                    updateUI();
                }
            };
            glitchMaxIntensity.addEventListener("input", this.glitchMaxHandler);
        }

        const glitchSensitivity = document.getElementById("glitchSensitivity");
        if (glitchSensitivity) {
            glitchSensitivity.removeEventListener("input", this.glitchSensitivityHandler);
            this.glitchSensitivityHandler = (e) => {
                const selected = this.elementManager.getSelectedElement();
                if (selected && selected.type === "glitch") {
                    selected.sensitivity = parseInt(e.target.value) || 50;
                    document.getElementById("glitchSensitivityValue").textContent = (selected.sensitivity) + "%";
                    updateUI();
                }
            };
            glitchSensitivity.addEventListener("input", this.glitchSensitivityHandler);
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

        const glitchFollowFrequency = document.getElementById("glitchFollowFrequency");
        if (glitchFollowFrequency) {
            glitchFollowFrequency.removeEventListener("change", this.glitchFollowHandler);
            this.glitchFollowHandler = (e) => {
                const selected = this.elementManager.getSelectedElement();
                if (selected && selected.type === "glitch") {
                    selected.followFrequency = e.target.value;
                    updateUI();
                }
            };
            glitchFollowFrequency.addEventListener("change", this.glitchFollowHandler);
        }

        // Visualizer element handlers
        const vizBarWidth = document.getElementById("vizBarWidth");
        // Handlers moved to handleNumberInput helper

        const vizBarGap = document.getElementById("vizBarGap");
        // Handlers moved to handleNumberInput helper

        const vizColor = document.getElementById("vizColor");
        if (vizColor) {
            vizColor.removeEventListener("input", this.vizColorHandler);
            this.vizColorHandler = (e) => {
                const selected = this.elementManager.getSelectedElement();
                if (selected && selected.type === "visualizer") {
                    selected.color = e.target.value;
                    updateUI();
                }
            };
            vizColor.addEventListener("input", this.vizColorHandler);
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
        // Handlers moved to handleNumberInput helper

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
        // Handlers moved to handleNumberInput helper

        const elementOffsetY = document.getElementById("elementOffsetY");
        // Handlers moved to handleNumberInput helper

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
