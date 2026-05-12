import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import HotspotManager from "./HotspotManager.js";

const DEFAULT_CAMERA_POSITION = new THREE.Vector3(-89, -3, -24.6);
const DEFAULT_TARGET = new THREE.Vector3(-60, -2.8, -24.4);
const DEFAULT_MOVE_SPEED = 10;
const DEFAULT_ROTATE_SPEED = 1;

const toVector3 = (value, fallback) => {
  if (value instanceof THREE.Vector3) {
    return value.clone();
  }
  if (Array.isArray(value) && value.length === 3) {
    return new THREE.Vector3(value[0], value[1], value[2]);
  }
  return fallback.clone();
};

export default class SceneManager {
  constructor(container, options = {}) {
    this.container = container;
    this.options = options;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.debug = Boolean(options.debug);
    this.debugHelpers = [];
    this.hotspotManager = null;
    this.pointer = new THREE.Vector2();
    this.pointerRaycaster = new THREE.Raycaster();
    this.pointerCallback = null;
    this.pointerTrackingActive = false;
    this.pickableMeshes = [];
    this.clock = new THREE.Clock();
    this.model = null;
    this.isRunning = false;
    this.onResize = this.onResize.bind(this);
    this.animate = this.animate.bind(this);
    this.onPointerMove = this.onPointerMove.bind(this);
    this.onPointerLeave = this.onPointerLeave.bind(this);

    this.cameraPosition = toVector3(
      options.cameraPosition,
      DEFAULT_CAMERA_POSITION
    );
    this.targetPosition = toVector3(options.targetPosition, DEFAULT_TARGET);
    this.hotspotsConfig = Array.isArray(options.hotspots)
      ? options.hotspots
      : null;
    this.onHotspotClick =
      typeof options.onHotspotClick === "function"
        ? options.onHotspotClick
        : null;
    this.bounds = null;
    if (options.bounds) {
      this.setBounds(options.bounds);
    } else if (Array.isArray(options.boundsPoints)) {
      this.setBoundsFromPoints(options.boundsPoints);
    }
    this.moveState = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      up: false,
      down: false,
      rotateLeft: false,
      rotateRight: false,
    };
    const speed = Number(options.moveSpeed);
    this.moveSpeed = Number.isFinite(speed) ? speed : DEFAULT_MOVE_SPEED;
    const rotateSpeed = Number(options.rotateSpeed);
    this.rotateSpeed = Number.isFinite(rotateSpeed)
      ? rotateSpeed
      : DEFAULT_ROTATE_SPEED;
  }

  init() {
    if (!this.container) {
      throw new Error("SceneManager requires a mount container.");
    }

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x050505);

    if (this.debug) {
      const axes = new THREE.AxesHelper(2);
      this.scene.add(axes);
      this.debugHelpers.push(axes);
    }

    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;

    this.camera = new THREE.PerspectiveCamera(70, width / height, 0.1, 800);
    this.camera.position.copy(this.cameraPosition);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.container.appendChild(this.renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    const pointLight = new THREE.PointLight(0xffffff, 1.1, 0, 2);
    pointLight.position.set(0, 2.5, 0);
    this.scene.add(ambientLight, pointLight);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.rotateSpeed = 0.01;
    this.controls.enableDamping = true;
    this.controls.enablePan = false;
    this.controls.enableZoom = false;
    if (this.debug) {
      this.controls.enablePan = true;
      this.controls.enableZoom = true;
    }
    this.controls.target.copy(this.targetPosition);
    this.applyBoundsToCamera();
    const clampAngle = THREE.MathUtils.degToRad(180);
    const offset = new THREE.Vector3()
      .copy(this.camera.position)
      .sub(this.controls.target);
    const spherical = new THREE.Spherical().setFromVector3(offset);
    const epsilon = 0.000001;
    this.controls.minPolarAngle = Math.max(
      epsilon,
      spherical.phi - clampAngle
    );
    this.controls.maxPolarAngle = Math.min(
      Math.PI - epsilon,
      spherical.phi + clampAngle
    );
    this.controls.minAzimuthAngle = spherical.theta - clampAngle;
    this.controls.maxAzimuthAngle = spherical.theta + clampAngle;
    this.controls.update();

    this.hotspotManager = new HotspotManager({
      scene: this.scene,
      camera: this.camera,
      domElement: this.renderer.domElement,
      debug: this.debug,
      onClick: (hotspot) => {
        if (this.onHotspotClick) {
          this.onHotspotClick(hotspot);
        }
      },
    });

    if (this.hotspotsConfig) {
      this.setHotspots(this.hotspotsConfig);
    }

    window.addEventListener("resize", this.onResize);
  }

  loadModel(url, onProgress) {
    const loader = new GLTFLoader();
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath("https://www.gstatic.com/draco/v1/decoders/");
    loader.setDRACOLoader(dracoLoader);

    return new Promise((resolve, reject) => {
      loader.load(
        url,
        (gltf) => {
          this.model = gltf.scene;
          this.scene.add(this.model);
          this.pickableMeshes = [];
          this.model.traverse((object) => {
            if (object.isMesh) {
              this.pickableMeshes.push(object);
            }
          });
          dracoLoader.dispose();
          resolve(gltf);
        },
        (event) => {
          if (onProgress && event.total) {
            const percent = Math.min(
              99,
              Math.round((event.loaded / event.total) * 100)
            );
            onProgress(percent);
          }
        },
        (error) => {
          dracoLoader.dispose();
          reject(error);
        }
      );
    });
  }

  start() {
    if (this.isRunning) {
      return;
    }
    this.isRunning = true;
    this.animate();
  }

  animate() {
    if (!this.isRunning) {
      return;
    }
    requestAnimationFrame(this.animate);
    const delta = this.clock.getDelta();
    this.updateMovement(delta);
    if (this.hotspotManager) {
      this.hotspotManager.update(delta);
    }
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  updateMovement(delta) {
    if (!this.camera || !this.controls) {
      return;
    }

    const {
      forward,
      backward,
      left,
      right,
      up,
      down,
      rotateLeft,
      rotateRight,
    } = this.moveState;
    const hasTranslation = forward || backward || left || right || up || down;
    const hasRotation = rotateLeft || rotateRight;
    if (!hasTranslation && !hasRotation) {
      return;
    }

    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);

    const walkDir = dir.clone();
    walkDir.y = 0;
    if (walkDir.lengthSq() === 0) {
      return;
    }
    walkDir.normalize();

    const rightDir = new THREE.Vector3();
    rightDir.crossVectors(new THREE.Vector3(0, 1, 0), walkDir).normalize();

    const distance = this.moveSpeed * delta;
    const offset = new THREE.Vector3();

    if (forward) {
      offset.addScaledVector(walkDir, distance);
    }
    if (backward) {
      offset.addScaledVector(walkDir, -distance);
    }
    if (left) {
      offset.addScaledVector(rightDir, distance);
    }
    if (right) {
      offset.addScaledVector(rightDir, -distance);
    }
    if (up) {
      offset.y += distance;
    }
    if (down) {
      offset.y -= distance;
    }

    if (offset.lengthSq() > 0) {
      const nextPosition = this.camera.position.clone().add(offset);
      const clampedPosition = this.clampPosition(nextPosition);
      const appliedOffset = clampedPosition.sub(this.camera.position);

      if (appliedOffset.lengthSq() > 0) {
        this.camera.position.add(appliedOffset);
        this.controls.target.add(appliedOffset);
      }
    }

    if (hasRotation) {
      const rotateDirection = (rotateLeft ? 1 : 0) + (rotateRight ? -1 : 0);
      if (rotateDirection !== 0) {
        const angle = this.rotateSpeed * delta * rotateDirection;
        const relTarget = new THREE.Vector3();
        relTarget.subVectors(this.controls.target, this.camera.position);
        const upAxis = new THREE.Vector3(0, 1, 0)
          .applyQuaternion(this.camera.quaternion)
          .normalize();
        relTarget.applyAxisAngle(upAxis, angle);
        this.controls.target.copy(this.camera.position).add(relTarget);
      }
    }
  }

  onResize() {
    if (!this.renderer || !this.camera) {
      return;
    }
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  dispose() {
    this.isRunning = false;
    window.removeEventListener("resize", this.onResize);

    this.disablePointerTracking();

    if (this.hotspotManager) {
      this.hotspotManager.dispose();
      this.hotspotManager = null;
    }

    if (this.controls) {
      this.controls.dispose();
    }

    if (this.scene) {
      this.debugHelpers.forEach((helper) => this.scene.remove(helper));
      this.debugHelpers = [];
      this.scene.traverse((object) => {
        if (!object.isMesh) {
          return;
        }
        if (object.geometry) {
          object.geometry.dispose();
        }
        const material = object.material;
        if (Array.isArray(material)) {
          material.forEach((item) => item.dispose());
        } else if (material) {
          material.dispose();
        }
      });
    }

    if (this.renderer) {
      this.renderer.dispose();
      if (this.renderer.domElement?.parentNode) {
        this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
      }
    }
  }

  getViewState() {
    if (!this.camera || !this.controls) {
      return null;
    }

    return {
      cameraPosition: this.camera.position.toArray(),
      targetPosition: this.controls.target.toArray(),
      distance: this.camera.position.distanceTo(this.controls.target),
    };
  }

  enablePointerTracking(callback) {
    if (!this.renderer || !this.camera) {
      return;
    }
    this.pointerCallback = typeof callback === "function" ? callback : null;
    if (this.pointerTrackingActive) {
      return;
    }
    this.pointerTrackingActive = true;
    this.renderer.domElement.addEventListener(
      "pointermove",
      this.onPointerMove
    );
    this.renderer.domElement.addEventListener(
      "pointerleave",
      this.onPointerLeave
    );
  }

  disablePointerTracking() {
    if (!this.pointerTrackingActive || !this.renderer) {
      this.pointerCallback = null;
      this.pointerTrackingActive = false;
      return;
    }
    this.renderer.domElement.removeEventListener(
      "pointermove",
      this.onPointerMove
    );
    this.renderer.domElement.removeEventListener(
      "pointerleave",
      this.onPointerLeave
    );
    this.pointerCallback = null;
    this.pointerTrackingActive = false;
  }

  onPointerMove(event) {
    if (!this.pointerCallback || !this.camera || !this.renderer) {
      return;
    }
    if (!this.pickableMeshes || this.pickableMeshes.length === 0) {
      this.pointerCallback(null);
      return;
    }

    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.pointerRaycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.pointerRaycaster.intersectObjects(
      this.pickableMeshes,
      true
    );
    if (hits.length > 0) {
      this.pointerCallback(hits[0].point.clone());
    } else {
      this.pointerCallback(null);
    }
  }

  onPointerLeave() {
    if (this.pointerCallback) {
      this.pointerCallback(null);
    }
  }

  setMoveState(direction, isActive) {
    if (!direction || !(direction in this.moveState)) {
      return;
    }
    this.moveState[direction] = Boolean(isActive);
  }

  stopMovement() {
    Object.keys(this.moveState).forEach((key) => {
      this.moveState[key] = false;
    });
  }

  addHotspot(config) {
    if (!this.hotspotManager) {
      return null;
    }
    return this.hotspotManager.addHotspot(config);
  }

  setHotspots(hotspots) {
    if (!this.hotspotManager) {
      return;
    }
    this.hotspotManager.clear();
    hotspots.forEach((hotspot) => {
      this.hotspotManager.addHotspot(hotspot);
    });
  }

  setHotspotActive(id, isActive) {
    if (!this.hotspotManager) {
      return;
    }
    this.hotspotManager.setActive(id, isActive);
  }

  setBounds(bounds) {
    if (!bounds || !bounds.min || !bounds.max) {
      this.bounds = null;
      return;
    }
    const min = toVector3(bounds.min);
    const max = toVector3(bounds.max);
    this.bounds = { min, max };
  }

  setBoundsFromPoints(points) {
    if (!Array.isArray(points) || points.length === 0) {
      this.bounds = null;
      return;
    }

    const first = toVector3(points[0]);
    const min = first.clone();
    const max = first.clone();

    points.slice(1).forEach((point) => {
      const vec = toVector3(point);
      min.min(vec);
      max.max(vec);
    });

    this.bounds = { min, max };
  }

  clampPosition(position) {
    if (!this.bounds) {
      return position.clone();
    }
    const { min, max } = this.bounds;
    return new THREE.Vector3(
      THREE.MathUtils.clamp(position.x, min.x, max.x),
      THREE.MathUtils.clamp(position.y, min.y, max.y),
      THREE.MathUtils.clamp(position.z, min.z, max.z)
    );
  }

  applyBoundsToCamera() {
    if (!this.bounds || !this.camera || !this.controls) {
      return;
    }
    const clamped = this.clampPosition(this.camera.position);
    const offset = clamped.sub(this.camera.position);
    if (offset.lengthSq() === 0) {
      return;
    }
    this.camera.position.add(offset);
    this.controls.target.add(offset);
  }
}
