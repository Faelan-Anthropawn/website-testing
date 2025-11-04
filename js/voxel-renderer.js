import { readMCAFile, getBlockFromChunk } from './mca-reader.js';

export class VoxelRenderer {
  constructor(container) {
    this.container = container;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.worldData = null;
    this.voxelMeshes = [];
    this.boundingBox = null;
    this.boundingBoxHelper = null;
    this.isDragging = false;
    this.dragHandle = null;
    this.centerHandle = null;
    this.mouse = new THREE.Vector2();
    this.raycaster = new THREE.Raycaster();
    this.boundingBoxMin = { x: 0, y: 0, z: 0 };
    this.boundingBoxMax = { x: 10, y: 10, z: 10 };
    this.parsedChunks = new Map();
    
    this.init();
  }

  init() {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x101622);

    this.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    this.camera.position.set(30, 30, 30);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.container.appendChild(this.renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(50, 50, 50);
    this.scene.add(directionalLight);

    const gridHelper = new THREE.GridHelper(100, 100, 0x3b4354, 0x1b1f27);
    this.scene.add(gridHelper);

    const axesHelper = new THREE.AxesHelper(20);
    this.scene.add(axesHelper);

    this.createBoundingBox();

    this.setupControls();
    this.setupEventListeners();

    this.animate();
  }

  createBoundingBox() {
    const geometry = new THREE.BoxGeometry(
      this.boundingBoxMax.x - this.boundingBoxMin.x,
      this.boundingBoxMax.y - this.boundingBoxMin.y,
      this.boundingBoxMax.z - this.boundingBoxMin.z
    );
    
    const edges = new THREE.EdgesGeometry(geometry);
    const material = new THREE.LineBasicMaterial({ color: 0x0d59f2, linewidth: 2 });
    this.boundingBoxHelper = new THREE.LineSegments(edges, material);
    
    const centerX = (this.boundingBoxMin.x + this.boundingBoxMax.x) / 2;
    const centerY = (this.boundingBoxMin.y + this.boundingBoxMax.y) / 2;
    const centerZ = (this.boundingBoxMin.z + this.boundingBoxMax.z) / 2;
    this.boundingBoxHelper.position.set(centerX, centerY, centerZ);
    
    this.scene.add(this.boundingBoxHelper);

    this.createHandles();
    this.createCenterHandle();
  }

  createCenterHandle() {
    if (this.centerHandle) {
      this.scene.remove(this.centerHandle);
    }
    
    const centerX = (this.boundingBoxMin.x + this.boundingBoxMax.x) / 2;
    const centerY = (this.boundingBoxMin.y + this.boundingBoxMax.y) / 2;
    const centerZ = (this.boundingBoxMin.z + this.boundingBoxMax.z) / 2;
    
    const handleGeometry = new THREE.SphereGeometry(1, 16, 16);
    const handleMaterial = new THREE.MeshBasicMaterial({ 
      color: 0xffa500,
      transparent: true,
      opacity: 0.8
    });
    
    this.centerHandle = new THREE.Mesh(handleGeometry, handleMaterial);
    this.centerHandle.position.set(centerX, centerY, centerZ);
    this.centerHandle.userData = { type: 'centerHandle' };
    this.scene.add(this.centerHandle);
  }

  createHandles() {
    if (this.handles) {
      this.handles.forEach(handle => this.scene.remove(handle));
    }
    
    this.handles = [];
    const handleGeometry = new THREE.SphereGeometry(0.5, 16, 16);
    const xzHandleMaterial = new THREE.MeshBasicMaterial({ color: 0x0d59f2 });
    const topHandleMaterial = new THREE.MeshBasicMaterial({ color: 0x22c55e });
    const bottomHandleMaterial = new THREE.MeshBasicMaterial({ color: 0xef4444 });

    const corners = [
      [this.boundingBoxMin.x, this.boundingBoxMin.y, this.boundingBoxMin.z, false, true],
      [this.boundingBoxMax.x, this.boundingBoxMin.y, this.boundingBoxMin.z, false, true],
      [this.boundingBoxMin.x, this.boundingBoxMax.y, this.boundingBoxMin.z, true, false],
      [this.boundingBoxMax.x, this.boundingBoxMax.y, this.boundingBoxMin.z, true, false],
      [this.boundingBoxMin.x, this.boundingBoxMin.y, this.boundingBoxMax.z, false, true],
      [this.boundingBoxMax.x, this.boundingBoxMin.y, this.boundingBoxMax.z, false, true],
      [this.boundingBoxMin.x, this.boundingBoxMax.y, this.boundingBoxMax.z, true, false],
      [this.boundingBoxMax.x, this.boundingBoxMax.y, this.boundingBoxMax.z, true, false],
    ];

    corners.forEach(([x, y, z, isTop, isBottom], index) => {
      let material;
      if (isTop) material = topHandleMaterial;
      else if (isBottom) material = bottomHandleMaterial;
      else material = xzHandleMaterial;
      
      const handle = new THREE.Mesh(handleGeometry, material.clone());
      handle.position.set(x, y, z);
      handle.userData = { 
        type: 'handle', 
        cornerIndex: index,
        isTopHandle: isTop,
        isBottomHandle: isBottom
      };
      this.handles.push(handle);
      this.scene.add(handle);
    });
  }

  setupControls() {
    this.controls = {
      rotateSpeed: 0.005,
      isRotating: false,
      previousMousePosition: { x: 0, y: 0 }
    };
  }

  setupEventListeners() {
    window.addEventListener('resize', this.onWindowResize.bind(this));
    this.renderer.domElement.addEventListener('mousedown', this.onMouseDown.bind(this));
    this.renderer.domElement.addEventListener('mousemove', this.onMouseMove.bind(this));
    this.renderer.domElement.addEventListener('mouseup', this.onMouseUp.bind(this));
    this.renderer.domElement.addEventListener('wheel', this.onWheel.bind(this));
  }

  onWindowResize() {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  onMouseDown(event) {
    this.mouse.x = (event.offsetX / this.renderer.domElement.clientWidth) * 2 - 1;
    this.mouse.y = -(event.offsetY / this.renderer.domElement.clientHeight) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    
    const centerIntersect = this.raycaster.intersectObject(this.centerHandle);
    if (centerIntersect.length > 0) {
      this.isDragging = true;
      this.dragHandle = this.centerHandle;
      this.dragStartMouse = { x: event.clientX, y: event.clientY };
      this.dragStartBox = {
        minX: this.boundingBoxMin.x,
        minY: this.boundingBoxMin.y,
        minZ: this.boundingBoxMin.z,
        maxX: this.boundingBoxMax.x,
        maxY: this.boundingBoxMax.y,
        maxZ: this.boundingBoxMax.z
      };
      this.renderer.domElement.style.cursor = 'move';
      return;
    }
    
    const intersects = this.raycaster.intersectObjects(this.handles);

    if (intersects.length > 0) {
      this.isDragging = true;
      this.dragHandle = intersects[0].object;
      this.renderer.domElement.style.cursor = 'move';
    } else {
      this.controls.isRotating = true;
      this.controls.previousMousePosition = { x: event.clientX, y: event.clientY };
      this.renderer.domElement.style.cursor = 'grab';
    }
  }

  onMouseMove(event) {
    if (this.isDragging && this.dragHandle) {
      if (this.dragHandle.userData.type === 'centerHandle') {
        this.mouse.x = (event.offsetX / this.renderer.domElement.clientWidth) * 2 - 1;
        this.mouse.y = -(event.offsetY / this.renderer.domElement.clientHeight) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.camera);
        
        const centerY = (this.dragStartBox.minY + this.dragStartBox.maxY) / 2;
        const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -centerY);
        const intersection = new THREE.Vector3();
        this.raycaster.ray.intersectPlane(plane, intersection);

        if (intersection) {
          const width = this.dragStartBox.maxX - this.dragStartBox.minX;
          const height = this.dragStartBox.maxY - this.dragStartBox.minY;
          const length = this.dragStartBox.maxZ - this.dragStartBox.minZ;
          
          const newCenterX = Math.round(intersection.x);
          const newCenterZ = Math.round(intersection.z);
          
          this.boundingBoxMin.x = newCenterX - width / 2;
          this.boundingBoxMax.x = newCenterX + width / 2;
          this.boundingBoxMin.z = newCenterZ - length / 2;
          this.boundingBoxMax.z = newCenterZ + length / 2;
          
          this.updateBoundingBox();
        }
        return;
      }
      
      this.mouse.x = (event.offsetX / this.renderer.domElement.clientWidth) * 2 - 1;
      this.mouse.y = -(event.offsetY / this.renderer.domElement.clientHeight) * 2 + 1;

      this.raycaster.setFromCamera(this.mouse, this.camera);
      
      const isTopHandle = this.dragHandle.userData.isTopHandle;
      const isBottomHandle = this.dragHandle.userData.isBottomHandle;
      const cornerIndex = this.dragHandle.userData.cornerIndex;
      
      if (isTopHandle || isBottomHandle) {
        const handlePos = this.dragHandle.position;
        const cameraDir = new THREE.Vector3()
          .subVectors(this.camera.position, handlePos)
          .normalize();
        const verticalPlaneNormal = new THREE.Vector3(cameraDir.x, 0, cameraDir.z).normalize();
        const verticalPlane = new THREE.Plane().setFromNormalAndCoplanarPoint(
          verticalPlaneNormal,
          handlePos
        );
        
        const intersection = new THREE.Vector3();
        this.raycaster.ray.intersectPlane(verticalPlane, intersection);
        
        if (intersection) {
          const y = Math.round(intersection.y);
          
          if (isTopHandle) {
            this.boundingBoxMax.y = Math.max(y, this.boundingBoxMin.y + 1);
          } else {
            this.boundingBoxMin.y = Math.min(y, this.boundingBoxMax.y - 1);
          }
          
          this.updateBoundingBox();
        }
      } else {
        const centerY = (this.boundingBoxMin.y + this.boundingBoxMax.y) / 2;
        const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -centerY);
        const intersection = new THREE.Vector3();
        this.raycaster.ray.intersectPlane(plane, intersection);

        if (intersection) {
          const x = Math.round(intersection.x);
          const z = Math.round(intersection.z);
          
          if (cornerIndex % 2 === 0) {
            this.boundingBoxMin.x = Math.min(x, this.boundingBoxMax.x - 1);
          } else {
            this.boundingBoxMax.x = Math.max(x, this.boundingBoxMin.x + 1);
          }
          
          if (cornerIndex >= 4) {
            this.boundingBoxMax.z = Math.max(z, this.boundingBoxMin.z + 1);
          } else {
            this.boundingBoxMin.z = Math.min(z, this.boundingBoxMax.z - 1);
          }

          this.updateBoundingBox();
        }
      }
    } else if (this.controls.isRotating) {
      const deltaX = event.clientX - this.controls.previousMousePosition.x;
      const deltaY = event.clientY - this.controls.previousMousePosition.y;

      const radius = this.camera.position.length();
      const theta = Math.atan2(this.camera.position.x, this.camera.position.z);
      const phi = Math.acos(this.camera.position.y / radius);

      const newTheta = theta - deltaX * this.controls.rotateSpeed;
      const newPhi = Math.max(0.1, Math.min(Math.PI - 0.1, phi - deltaY * this.controls.rotateSpeed));

      this.camera.position.x = radius * Math.sin(newPhi) * Math.sin(newTheta);
      this.camera.position.y = radius * Math.cos(newPhi);
      this.camera.position.z = radius * Math.sin(newPhi) * Math.cos(newTheta);
      this.camera.lookAt(0, 0, 0);

      this.controls.previousMousePosition = { x: event.clientX, y: event.clientY };
    }
  }

  onMouseUp() {
    this.isDragging = false;
    this.dragHandle = null;
    this.controls.isRotating = false;
    this.renderer.domElement.style.cursor = 'default';
  }

  onWheel(event) {
    event.preventDefault();
    const delta = event.deltaY;
    const zoomSpeed = 0.1;
    
    const direction = this.camera.position.clone().normalize();
    this.camera.position.addScaledVector(direction, delta * zoomSpeed);
    
    const minDistance = 5;
    const maxDistance = 200;
    const distance = this.camera.position.length();
    if (distance < minDistance) {
      this.camera.position.multiplyScalar(minDistance / distance);
    } else if (distance > maxDistance) {
      this.camera.position.multiplyScalar(maxDistance / distance);
    }
  }

  updateBoundingBox() {
    this.scene.remove(this.boundingBoxHelper);
    
    const geometry = new THREE.BoxGeometry(
      this.boundingBoxMax.x - this.boundingBoxMin.x,
      this.boundingBoxMax.y - this.boundingBoxMin.y,
      this.boundingBoxMax.z - this.boundingBoxMin.z
    );
    
    const edges = new THREE.EdgesGeometry(geometry);
    const material = new THREE.LineBasicMaterial({ color: 0x0d59f2, linewidth: 2 });
    this.boundingBoxHelper = new THREE.LineSegments(edges, material);
    
    const centerX = (this.boundingBoxMin.x + this.boundingBoxMax.x) / 2;
    const centerY = (this.boundingBoxMin.y + this.boundingBoxMax.y) / 2;
    const centerZ = (this.boundingBoxMin.z + this.boundingBoxMax.z) / 2;
    this.boundingBoxHelper.position.set(centerX, centerY, centerZ);
    
    this.scene.add(this.boundingBoxHelper);
    this.createHandles();
    this.createCenterHandle();
  }

  async loadWorldData(mcaFiles) {
    this.clearVoxels();
    this.parsedChunks.clear();
    
    if (!mcaFiles || Object.keys(mcaFiles).length === 0) {
      console.warn('No world data to visualize');
      return;
    }

    let minX = Infinity, maxX = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;
    
    console.log(`Parsing ${Object.keys(mcaFiles).length} region file(s)...`);

    for (const [key, region] of Object.entries(mcaFiles)) {
      const regionX = region.x * 512;
      const regionZ = region.z * 512;
      
      minX = Math.min(minX, regionX);
      maxX = Math.max(maxX, regionX + 512);
      minZ = Math.min(minZ, regionZ);
      maxZ = Math.max(maxZ, regionZ + 512);

      try {
        const chunks = await readMCAFile(region.data);
        this.parsedChunks.set(key, { chunks, regionX, regionZ });
        
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const sampleRate = 4;
        
        for (const [chunkKey, chunkData] of chunks.entries()) {
          const [chunkX, chunkZ] = chunkKey.split(',').map(Number);
          const worldChunkX = regionX + (chunkX * 16);
          const worldChunkZ = regionZ + (chunkZ * 16);
          
          for (let y = 60; y < 100; y += sampleRate) {
            for (let x = 0; x < 16; x += sampleRate) {
              for (let z = 0; z < 16; z += sampleRate) {
                const block = getBlockFromChunk(chunkData, x, y, z);
                
                if (block && !block.includes('air') && !block.includes('cave_air')) {
                  const material = this.getBlockMaterial(block);
                  const mesh = new THREE.Mesh(geometry, material);
                  mesh.position.set(worldChunkX + x, y, worldChunkZ + z);
                  this.voxelMeshes.push(mesh);
                  this.scene.add(mesh);
                }
              }
            }
          }
        }
        
        console.log(`Parsed region ${key}: ${chunks.size} chunks, ${this.voxelMeshes.length} blocks rendered`);
      } catch (error) {
        console.warn(`Failed to parse region ${key}:`, error);
      }
    }

    this.boundingBoxMin = { x: minX, y: 60, z: minZ };
    this.boundingBoxMax = { x: minX + 32, y: 80, z: minZ + 32 };
    this.updateBoundingBox();

    const centerX = (minX + maxX) / 2;
    const centerZ = (minZ + maxZ) / 2;
    this.camera.position.set(
      centerX + 100,
      100,
      centerZ + 100
    );
    this.camera.lookAt(centerX, 64, centerZ);
    
    console.log(`Loaded ${Object.keys(mcaFiles).length} region(s), rendered ${this.voxelMeshes.length} blocks`);
  }
  
  getBlockMaterial(blockName) {
    const colorMap = {
      'stone': 0x7f7f7f,
      'grass': 0x5a8c3a,
      'dirt': 0x8b6914,
      'sand': 0xf4e4b3,
      'gravel': 0x8a8a8a,
      'log': 0x6b4423,
      'oak': 0x6b4423,
      'leaves': 0x3d7d2e,
      'water': 0x4060ff,
      'lava': 0xff6600,
      'cobblestone': 0x6b6b6b,
      'planks': 0xb08050,
      'wood': 0xb08050,
      'bedrock': 0x2a2a2a
    };
    
    let color = 0x8b8b8b;
    for (const [key, value] of Object.entries(colorMap)) {
      if (blockName.toLowerCase().includes(key)) {
        color = value;
        break;
      }
    }
    
    return new THREE.MeshLambertMaterial({ color });
  }

  clearVoxels() {
    this.voxelMeshes.forEach(mesh => {
      this.scene.remove(mesh);
      mesh.geometry.dispose();
      mesh.material.dispose();
    });
    this.voxelMeshes = [];
  }

  getBoundingBoxCoordinates() {
    return {
      x1: Math.floor(this.boundingBoxMin.x),
      y1: Math.floor(this.boundingBoxMin.y),
      z1: Math.floor(this.boundingBoxMin.z),
      x2: Math.floor(this.boundingBoxMax.x),
      y2: Math.floor(this.boundingBoxMax.y),
      z2: Math.floor(this.boundingBoxMax.z)
    };
  }

  setBoundingBoxCoordinates(x1, y1, z1, x2, y2, z2) {
    this.boundingBoxMin = { x: x1, y: y1, z: z1 };
    this.boundingBoxMax = { x: x2, y: y2, z: z2 };
    this.updateBoundingBox();
  }

  animate() {
    requestAnimationFrame(this.animate.bind(this));
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.clearVoxels();
    
    if (this.handles) {
      this.handles.forEach(handle => {
        this.scene.remove(handle);
        handle.geometry.dispose();
        handle.material.dispose();
      });
    }
    
    if (this.boundingBoxHelper) {
      this.scene.remove(this.boundingBoxHelper);
      this.boundingBoxHelper.geometry.dispose();
      this.boundingBoxHelper.material.dispose();
    }
    
    if (this.renderer) {
      this.renderer.dispose();
      this.container.removeChild(this.renderer.domElement);
    }
    
    window.removeEventListener('resize', this.onWindowResize.bind(this));
  }
}
