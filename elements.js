export class ElementManager {
    constructor() {
        this.elements = [];
        this.selectedIndex = null;
    }

    addElement(type = "text", initialData = {}) {
        let element = { type };

        switch (type) {
            case "text":
                element = {
                    type: "text",
                    text: initialData.text || "Text",
                    x: 640,
                    y: 360,
                    size: 48,
                    color: "#ffffff",
                    font: "Arial",
                    anchor: "middle-center",
                    offsetX: 0,
                    offsetY: 0,
                    bold: false,
                    italic: false,
                    dropShadow: false
                };
                break;
            case "song-title":
                element = {
                    type: "song-title",
                    text: "Song Title",
                    x: 640,
                    y: 100,
                    size: 64,
                    color: "#ffffff",
                    font: "Arial",
                    anchor: "top-center",
                    offsetX: 0,
                    offsetY: 0,
                    bold: false,
                    italic: false,
                    dropShadow: false
                };
                break;
            case "song-artist":
                element = {
                    type: "song-artist",
                    text: "Artist Name",
                    x: 640,
                    y: 180,
                    size: 36,
                    color: "#cccccc",
                    font: "Arial",
                    anchor: "top-center",
                    offsetX: 0,
                    offsetY: 0,
                    bold: false,
                    italic: false,
                    dropShadow: false
                };
                break;
            case "visualizer":
                element = {
                    type: "visualizer",
                    enabled: true
                };
                break;
            case "background":
                element = {
                    type: "background",
                    enabled: true
                };
                break;
        }

        this.elements.push(element);
        return this.elements.length - 1;
    }

    deleteElement(index) {
        this.elements.splice(index, 1);
        if (this.selectedIndex === index) {
            this.selectedIndex = null;
        }
    }

    selectElement(index) {
        this.selectedIndex = index;
    }

    getSelectedElement() {
        return this.selectedIndex !== null ? this.elements[this.selectedIndex] : null;
    }

    updateElement(index, updates) {
        if (index < this.elements.length) {
            Object.assign(this.elements[index], updates);
        }
    }

    getElements() {
        return this.elements;
    }

    getSelectedIndex() {
        return this.selectedIndex;
    }

    clearSelection() {
        this.selectedIndex = null;
    }
}
