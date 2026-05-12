import * as THREE from "three";

const DEFAULT_COLOR = 0xf7d59c;
const DEFAULT_RADIUS = 0.6;
const DEFAULT_PULSE_SPEED = 2.4;

const toVector3 = (value, fallback = new THREE.Vector3()) => {
  if (value instanceof THREE.Vector3) {
    return value.clone();
  }
  if (Array.isArray(value) && value.length === 3) {
    return new THREE.Vector3(value[0], value[1], value[2]);
  }
  return fallback.clone();
};

export default class HotspotManager {
  constructor({ scene, camera, domElement, onClick, debug = false }) {
    this.scene = scene;
    this.camera = camera;
    this.domElement = domElement;
    this.onClick = onClick;
    this.debug = debug;
    this.hotspots = new Map();
    this.hoveredId = null;
    this.pointer = new THREE.Vector2();
    this.raycaster = new THREE.Raycaster();
    this.time = 0;
    this.pulseSpeed = DEFAULT_PULSE_SPEED;

    this.onPointerMove = this.onPointerMove.bind(this);
    this.onPointerDown = this.onPointerDown.bind(this);
    this.onPointerLeave = this.onPointerLeave.bind(this);

    if (this.domElement) {
      this.domElement.addEventListener("pointermove", this.onPointerMove);
      this.domElement.addEventListener("pointerdown", this.onPointerDown);
      this.domElement.addEventListener("pointerleave", this.onPointerLeave);
    }
  }

  addHotspot(config) {
    if (!config || !config.id) {
      throw new Error("Hotspot id is required.");
    }

    if (this.hotspots.has(config.id)) {
      this.removeHotspot(config.id);
    }

    const radius = Number(config.radius) || DEFAULT_RADIUS;
    const position = toVector3(config.position);
    const color = config.color ?? DEFAULT_COLOR;
    const active = config.active !== false;
    const baseOpacity = this.debug ? 0.25 : 0.15;
    const pulse = config.pulse !== false;
    const steadyOnClick = Boolean(config.steadyOnClick);
    const steadyOpacity = Number.isFinite(config.steadyOpacity)
      ? config.steadyOpacity
      : null;

    const geometry = new THREE.SphereGeometry(radius, 16, 16);
    const material = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: baseOpacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(position);
    mesh.visible = active;
    mesh.name = `hotspot:${config.id}`;
    mesh.userData.hotspotId = config.id;
    mesh.userData.isHotspot = true;

    this.scene.add(mesh);

    const entry = {
      id: config.id,
      mesh,
      material,
      active,
      pulse,
      steady: false,
      steadyOnClick,
      steadyOpacity,
      pulseOffset: Math.random() * Math.PI * 2,
      isHovered: false,
      data: {
        ...config,
        position: position.toArray(),
        radius,
      },
    };

    this.hotspots.set(config.id, entry);
    return entry;
  }

  removeHotspot(id) {
    const entry = this.hotspots.get(id);
    if (!entry) {
      return;
    }
    this.scene.remove(entry.mesh);
    entry.mesh.geometry.dispose();
    entry.material.dispose();
    this.hotspots.delete(id);

    if (this.hoveredId === id) {
      this.hoveredId = null;
    }
  }

  setActive(id, isActive) {
    const entry = this.hotspots.get(id);
    if (!entry) {
      return;
    }
    entry.active = Boolean(isActive);
    entry.mesh.visible = entry.active;
    if (!entry.active) {
      this.setHoverState(id, false);
    }
  }

  update(delta) {
    this.time += delta;

    this.hotspots.forEach((entry) => {
      if (!entry.active || !entry.mesh.visible) {
        return;
      }

      if (entry.steady) {
        const lockedOpacity =
          entry.steadyOpacity ?? (this.debug ? 0.6 : 0.45);
        entry.material.opacity = lockedOpacity;
        entry.mesh.scale.setScalar(1.1);
        return;
      }

      if (entry.isHovered) {
        entry.material.opacity = this.debug ? 0.65 : 0.55;
        entry.mesh.scale.setScalar(1.35);
        return;
      }

      if (!entry.pulse) {
        entry.material.opacity = this.debug ? 0.3 : 0.2;
        entry.mesh.scale.setScalar(1.0);
        return;
      }

      const minOpacity = this.debug ? 0.25 : 0.12;
      const maxOpacity = this.debug ? 0.7 : 0.45;
      const pulse =
        (Math.sin(this.time * this.pulseSpeed + entry.pulseOffset) + 1) / 2;
      entry.material.opacity =
        minOpacity + (maxOpacity - minOpacity) * pulse;
      entry.mesh.scale.setScalar(1.0 + 0.12 * pulse);
    });
  }

  clear() {
    Array.from(this.hotspots.keys()).forEach((id) => this.removeHotspot(id));
  }

  dispose() {
    if (this.domElement) {
      this.domElement.removeEventListener("pointermove", this.onPointerMove);
      this.domElement.removeEventListener("pointerdown", this.onPointerDown);
      this.domElement.removeEventListener("pointerleave", this.onPointerLeave);
    }
    this.clear();
  }

  onPointerMove(event) {
    if (event.pointerType === "touch") {
      return;
    }
    const hit = this.getHit(event);
    const nextId = hit?.userData?.hotspotId ?? null;
    this.updateHover(nextId);
  }

  onPointerDown(event) {
    const hit = this.getHit(event);
    const nextId = hit?.userData?.hotspotId ?? null;
    if (nextId) {
      this.updateHover(nextId);
      const entry = this.hotspots.get(nextId);
      if (entry && entry.active) {
        if (entry.steadyOnClick) {
          entry.steady = true;
          entry.pulse = false;
        }
        if (typeof entry.data.onClick === "function") {
          entry.data.onClick(entry.data);
        }
        if (typeof this.onClick === "function") {
          this.onClick(entry.data);
        }
      }
    } else {
      this.updateHover(null);
    }
  }

  onPointerLeave() {
    this.updateHover(null);
  }

  isRotatedLayout() {
    if (typeof window === "undefined" || !window.matchMedia) {
      return false;
    }
    return window.matchMedia(
      "(max-width: 900px) and (orientation: portrait)"
    ).matches;
  }

  getHit(event) {
    if (!this.camera || !this.domElement || this.hotspots.size === 0) {
      return null;
    }

    const rect = this.domElement.getBoundingClientRect();
    if (this.isRotatedLayout()) {
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const vX = event.clientX - centerX;
      const vY = event.clientY - centerY;
      const unrotX = -vY;
      const unrotY = vX;
      const unrotWidth = rect.height;
      const unrotHeight = rect.width;
      const localX = unrotX + unrotWidth / 2;
      const localY = unrotY + unrotHeight / 2;
      this.pointer.x = (localX / unrotWidth) * 2 - 1;
      this.pointer.y = -(localY / unrotHeight) * 2 + 1;
    } else {
      this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    }

    this.raycaster.setFromCamera(this.pointer, this.camera);

    const objects = [];
    this.hotspots.forEach((entry) => {
      if (entry.active) {
        objects.push(entry.mesh);
      }
    });

    const intersections = this.raycaster.intersectObjects(objects, false);
    return intersections.length > 0 ? intersections[0].object : null;
  }

  updateHover(nextId) {
    if (this.hoveredId === nextId) {
      return;
    }

    if (this.hoveredId) {
      this.setHoverState(this.hoveredId, false);
      const prevEntry = this.hotspots.get(this.hoveredId);
      if (prevEntry && typeof prevEntry.data.onHoverOut === "function") {
        prevEntry.data.onHoverOut(prevEntry.data);
      }
    }

    this.hoveredId = nextId;

    if (nextId) {
      this.setHoverState(nextId, true);
      const nextEntry = this.hotspots.get(nextId);
      if (nextEntry && typeof nextEntry.data.onHoverIn === "function") {
        nextEntry.data.onHoverIn(nextEntry.data);
      }
    }
  }

  setHoverState(id, isHovered) {
    const entry = this.hotspots.get(id);
    if (!entry) {
      return;
    }
    entry.isHovered = Boolean(isHovered);
  }
}
