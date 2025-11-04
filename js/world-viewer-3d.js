import { getBlockFromChunk } from './mca-reader.js';

class WorldViewer3D {
  constructor(container) {
    this.container = container;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.worldMesh = null;
    this.boundingBox = null;
    this.isDragging = false;
    this.dragStart = null;
    this.dragEnd = null;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.mcaFiles = null;
    this.worldData = null;
    this.onBoundsChange = null;
    this.boundingBoxHelper = null;
    this.currentYBounds = { minY: -64, maxY: 320 };
    
    this.init();
  }

  init() {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0e16);

    this.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 10000);
    this.camera.position.set(50, 50, 50);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.container.appendChild(this.renderer.domElement);

    this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.4);
    directionalLight.position.set(1, 1, 1);
    this.scene.add(directionalLight);

    const gridHelper = new THREE.GridHelper(200, 20, 0x444444, 0x222222);
    this.scene.add(gridHelper);

    const axesHelper = new THREE.AxesHelper(50);
    this.scene.add(axesHelper);

    this.renderer.domElement.addEventListener('mousedown', this.onMouseDown.bind(this));
    this.renderer.domElement.addEventListener('mousemove', this.onMouseMove.bind(this));
    this.renderer.domElement.addEventListener('mouseup', this.onMouseUp.bind(this));

    window.addEventListener('resize', this.onWindowResize.bind(this));

    this.animate();
  }

  async loadWorld(mcaFiles, sampleSize = 50) {
    this.mcaFiles = mcaFiles;
    
    const placeholder = document.getElementById('viewer-placeholder');
    if (placeholder) placeholder.style.display = 'none';

    if (this.worldMesh) {
      this.scene.remove(this.worldMesh);
    }

    const regionKeys = Object.keys(mcaFiles);
    if (regionKeys.length === 0) {
      console.warn('No region files found');
      return;
    }

    const firstRegionKey = regionKeys[0];
    const regionData = mcaFiles[firstRegionKey];
    
    console.log(`Loading preview from region ${firstRegionKey}...`);
    
    const geometry = new THREE.BufferGeometry();
    const positions = [];
    const colors = [];
    const blockColorMap = this.getBlockColorMap();

    const [regionX, regionZ] = firstRegionKey.split(',').map(Number);
    const worldOffsetX = regionX * 512;
    const worldOffsetZ = regionZ * 512;

    try {
      const JSZip = window.JSZip;
      const parsedRegion = await this.parseMCARegion(regionData.data);
      
      let blockCount = 0;
      const maxBlocks = 10000;

      for (const [chunkKey, chunkData] of parsedRegion) {
        if (blockCount >= maxBlocks) break;
        
        const [localX, localZ] = chunkKey.split(',').map(Number);
        const absoluteChunkX = regionX * 32 + localX;
        const absoluteChunkZ = regionZ * 32 + localZ;
        const chunkWorldX = absoluteChunkX * 16;
        const chunkWorldZ = absoluteChunkZ * 16;

        for (let y = -64; y < 120; y += 2) {
          if (blockCount >= maxBlocks) break;
          for (let lx = 0; lx < 16; lx += 2) {
            if (blockCount >= maxBlocks) break;
            for (let lz = 0; lz < 16; lz += 2) {
              if (blockCount >= maxBlocks) break;
              
              const blockName = getBlockFromChunk(chunkData, lx, y, lz);
              if (blockName && blockName !== 'minecraft:air' && blockName !== 'minecraft:cave_air') {
                const x = chunkWorldX + lx;
                const z = chunkWorldZ + lz;
                
                positions.push(x, y, z);
                
                const color = blockColorMap[blockName] || blockColorMap['default'];
                colors.push(color.r, color.g, color.b);
                blockCount++;
              }
            }
          }
        }
      }

      console.log(`Loaded ${blockCount} blocks for preview`);

      const positionsArray = new Float32Array(positions);
      const colorsArray = new Float32Array(colors);
      
      geometry.setAttribute('position', new THREE.BufferAttribute(positionsArray, 3));
      geometry.setAttribute('color', new THREE.BufferAttribute(colorsArray, 3));

      const material = new THREE.PointsMaterial({ 
        size: 2, 
        vertexColors: true,
        sizeAttenuation: true
      });

      this.worldMesh = new THREE.Points(geometry, material);
      this.scene.add(this.worldMesh);

      geometry.computeBoundingBox();
      const box = geometry.boundingBox;
      const center = new THREE.Vector3();
      box.getCenter(center);
      
      this.camera.position.set(
        center.x + 100,
        center.y + 100,
        center.z + 100
      );
      this.controls.target.copy(center);
      this.controls.update();

      console.log('World preview loaded successfully');
    } catch (error) {
      console.error('Error loading world preview:', error);
    }
  }

  async parseMCARegion(arrayBuffer) {
    const { readMCAFile } = await import('./mca-reader.js');
    return await readMCAFile(arrayBuffer);
  }

  getBlockColorMap() {
    return {
      'minecraft:stone': { r: 0.5, g: 0.5, b: 0.5 },
      'minecraft:grass_block': { r: 0.4, g: 0.8, b: 0.2 },
      'minecraft:dirt': { r: 0.6, g: 0.4, b: 0.2 },
      'minecraft:oak_log': { r: 0.4, g: 0.3, b: 0.1 },
      'minecraft:oak_leaves': { r: 0.2, g: 0.6, b: 0.2 },
      'minecraft:water': { r: 0.2, g: 0.4, b: 0.8 },
      'minecraft:sand': { r: 0.9, g: 0.9, b: 0.6 },
      'minecraft:sandstone': { r: 0.9, g: 0.8, b: 0.5 },
      'minecraft:cobblestone': { r: 0.4, g: 0.4, b: 0.4 },
      'minecraft:bedrock': { r: 0.2, g: 0.2, b: 0.2 },
      'default': { r: 0.7, g: 0.7, b: 0.7 }
    };
  }

  onMouseDown(event) {
    if (event.button !== 0) return;
    
    event.preventDefault();
    
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    
    const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const intersection = new THREE.Vector3();
    this.raycaster.ray.intersectPlane(groundPlane, intersection);

    if (intersection) {
      this.isDragging = true;
      this.dragStart = intersection.clone();
      this.dragEnd = intersection.clone();
      this.updateBoundingBox();
    }
  }

  onMouseMove(event) {
    if (!this.isDragging) return;

    event.preventDefault();

    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    
    const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const intersection = new THREE.Vector3();
    this.raycaster.ray.intersectPlane(groundPlane, intersection);

    if (intersection) {
      this.dragEnd = intersection.clone();
      this.updateBoundingBox();
    }
  }

  onMouseUp(event) {
    if (event.button !== 0 || !this.isDragging) return;
    
    this.isDragging = false;
    
    if (this.dragStart && this.dragEnd) {
      const minX = Math.min(this.dragStart.x, this.dragEnd.x);
      const maxX = Math.max(this.dragStart.x, this.dragEnd.x);
      const minZ = Math.min(this.dragStart.z, this.dragEnd.z);
      const maxZ = Math.max(this.dragStart.z, this.dragEnd.z);

      if (this.onBoundsChange) {
        this.onBoundsChange({
          x1: Math.floor(minX),
          z1: Math.floor(minZ),
          x2: Math.floor(maxX),
          z2: Math.floor(maxZ)
        });
      }
    }
  }

  updateBoundingBox() {
    if (!this.dragStart || !this.dragEnd) return;

    if (this.boundingBoxHelper) {
      this.scene.remove(this.boundingBoxHelper);
    }

    const minX = Math.min(this.dragStart.x, this.dragEnd.x);
    const maxX = Math.max(this.dragStart.x, this.dragEnd.x);
    const minZ = Math.min(this.dragStart.z, this.dragEnd.z);
    const maxZ = Math.max(this.dragStart.z, this.dragEnd.z);
    
    const minY = this.currentYBounds.minY;
    const maxY = this.currentYBounds.maxY;

    const width = maxX - minX;
    const height = maxY - minY;
    const depth = maxZ - minZ;

    const boxGeometry = new THREE.BoxGeometry(width, height, depth);
    const boxMaterial = new THREE.MeshBasicMaterial({ 
      color: 0x0d59f2, 
      transparent: true, 
      opacity: 0.2,
      side: THREE.DoubleSide
    });
    const boxMesh = new THREE.Mesh(boxGeometry, boxMaterial);
    
    boxMesh.position.set(
      minX + width / 2,
      minY + height / 2,
      minZ + depth / 2
    );

    const edges = new THREE.EdgesGeometry(boxGeometry);
    const lineMaterial = new THREE.LineBasicMaterial({ color: 0x0d59f2, linewidth: 2 });
    const lineSegments = new THREE.LineSegments(edges, lineMaterial);
    lineSegments.position.copy(boxMesh.position);

    const group = new THREE.Group();
    group.add(boxMesh);
    group.add(lineSegments);

    this.boundingBoxHelper = group;
    this.scene.add(this.boundingBoxHelper);
  }

  setBounds(x1, y1, z1, x2, y2, z2) {
    this.dragStart = new THREE.Vector3(x1, y1, z1);
    this.dragEnd = new THREE.Vector3(x2, y2, z2);
    this.currentYBounds = {
      minY: Math.min(y1, y2),
      maxY: Math.max(y1, y2)
    };
    this.updateBoundingBox();
  }

  onWindowResize() {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  animate() {
    requestAnimationFrame(this.animate.bind(this));
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  destroy() {
    if (this.renderer) {
      this.renderer.dispose();
      if (this.container.contains(this.renderer.domElement)) {
        this.container.removeChild(this.renderer.domElement);
      }
    }
    window.removeEventListener('resize', this.onWindowResize.bind(this));
  }
}

export { WorldViewer3D };
