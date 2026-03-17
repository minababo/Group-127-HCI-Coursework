import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import AppTopNav from "./AppTopNav";
import {
  formatPreviewDistance,
  getPreviewSceneData,
  getRoomFloorOutline,
  getRoomWallSegments,
} from "../utils/preview3d";
import "./Preview3DPage.css";

const furnitureModelLoader = new GLTFLoader();
const furnitureModelPromiseCache = new Map();

function disposeMaterial(material) {
  if (Array.isArray(material)) {
    material.forEach(disposeMaterial);
    return;
  }

  material?.dispose?.();
}

function disposeObjectTree(root) {
  root?.traverse?.((object) => {
    if (object.geometry) {
      object.geometry.dispose();
    }

    if (object.material) {
      disposeMaterial(object.material);
    }
  });
}

function disposeScene(scene) {
  disposeObjectTree(scene);
}

function formatStatValue(value) {
  if (!Number.isFinite(value)) {
    return "--";
  }

  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }

  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }

  return String(Math.round(value));
}

function captureCameraState(camera, controls) {
  return {
    position: camera.position.clone(),
    target: controls.target.clone(),
    zoom: camera.zoom,
  };
}

function applyCameraState(camera, controls, cameraState) {
  if (!cameraState) {
    return;
  }

  camera.position.copy(cameraState.position);
  camera.zoom = cameraState.zoom;
  camera.updateProjectionMatrix();
  controls.target.copy(cameraState.target);
  controls.update();
}

function getFloorGridStep(roomSpan) {
  if (roomSpan <= 3) {
    return 0.25;
  }

  if (roomSpan <= 6) {
    return 0.5;
  }

  if (roomSpan <= 10) {
    return 0.75;
  }

  return 1;
}

function collectPolygonIntersections(points, axisValue, axis) {
  const intersections = [];

  for (let index = 0; index < points.length; index += 1) {
    const start = points[index];
    const end = points[(index + 1) % points.length];

    if (axis === "x") {
      if (
        (start.x <= axisValue && end.x > axisValue) ||
        (end.x <= axisValue && start.x > axisValue)
      ) {
        const progress = (axisValue - start.x) / (end.x - start.x);
        intersections.push(THREE.MathUtils.lerp(start.y, end.y, progress));
      }
    } else if (
      (start.y <= axisValue && end.y > axisValue) ||
      (end.y <= axisValue && start.y > axisValue)
    ) {
      const progress = (axisValue - start.y) / (end.y - start.y);
      intersections.push(THREE.MathUtils.lerp(start.x, end.x, progress));
    }
  }

  return intersections.sort((left, right) => left - right);
}

function createFloorGrid(points, roomSpan) {
  const step = getFloorGridStep(roomSpan);
  const majorStep = step * 4;
  const tolerance = step * 0.08;
  const bounds = points.reduce(
    (currentBounds, point) => ({
      minX: Math.min(currentBounds.minX, point.x),
      maxX: Math.max(currentBounds.maxX, point.x),
      minY: Math.min(currentBounds.minY, point.y),
      maxY: Math.max(currentBounds.maxY, point.y),
    }),
    {
      minX: Number.POSITIVE_INFINITY,
      maxX: Number.NEGATIVE_INFINITY,
      minY: Number.POSITIVE_INFINITY,
      maxY: Number.NEGATIVE_INFINITY,
    },
  );
  const majorLinePositions = [];
  const minorLinePositions = [];
  const pushLine = (positions, startX, startZ, endX, endZ) => {
    positions.push(startX, 0, startZ, endX, 0, endZ);
  };
  const isMajorLine = (value) =>
    Math.abs(value) < tolerance ||
    Math.abs(Math.round(value / majorStep) * majorStep - value) < tolerance;

  for (
    let x = Math.ceil(bounds.minX / step) * step;
    x < bounds.maxX;
    x += step
  ) {
    const intersections = collectPolygonIntersections(points, x, "x");
    for (let index = 0; index + 1 < intersections.length; index += 2) {
      const positions = isMajorLine(x) ? majorLinePositions : minorLinePositions;
      pushLine(positions, x, intersections[index], x, intersections[index + 1]);
    }
  }

  for (
    let z = Math.ceil(bounds.minY / step) * step;
    z < bounds.maxY;
    z += step
  ) {
    const intersections = collectPolygonIntersections(points, z, "y");
    for (let index = 0; index + 1 < intersections.length; index += 2) {
      const positions = isMajorLine(z) ? majorLinePositions : minorLinePositions;
      pushLine(positions, intersections[index], z, intersections[index + 1], z);
    }
  }

  const grid = new THREE.Group();
  grid.position.y = 0.001;

  if (minorLinePositions.length > 0) {
    const minorGeometry = new THREE.BufferGeometry();
    minorGeometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(minorLinePositions, 3),
    );
    const minorLines = new THREE.LineSegments(
      minorGeometry,
      new THREE.LineBasicMaterial({
        color: "#e5e7eb",
        transparent: true,
        opacity: 0.45,
        depthWrite: false,
      }),
    );
    grid.add(minorLines);
  }

  if (majorLinePositions.length > 0) {
    const majorGeometry = new THREE.BufferGeometry();
    majorGeometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(majorLinePositions, 3),
    );
    const majorLines = new THREE.LineSegments(
      majorGeometry,
      new THREE.LineBasicMaterial({
        color: "#cbd5e1",
        transparent: true,
        opacity: 0.6,
        depthWrite: false,
      }),
    );
    grid.add(majorLines);
  }

  return grid;
}

function buildMaterial(color, shadingMode, overrides = {}) {
  if (shadingMode === "wireframe") {
    return new THREE.MeshBasicMaterial({
      color,
      wireframe: true,
      transparent: true,
      opacity: overrides.opacity ?? 1,
    });
  }

  if (shadingMode === "solid") {
    return new THREE.MeshStandardMaterial({
      color,
      flatShading: true,
      roughness: overrides.roughness ?? 0.92,
      metalness: overrides.metalness ?? 0.02,
      ...overrides,
    });
  }

  return new THREE.MeshStandardMaterial({
    color,
    roughness: overrides.roughness ?? 0.76,
    metalness: overrides.metalness ?? 0.05,
    ...overrides,
  });
}

function getFurnitureMaterialOptions(shadingMode) {
  return {
    roughness: shadingMode === "realistic" ? 0.66 : 0.84,
    metalness: shadingMode === "realistic" ? 0.07 : 0.01,
  };
}

function addFurnitureEdges(mesh) {
  const furnitureEdges = new THREE.LineSegments(
    new THREE.EdgesGeometry(mesh.geometry),
    new THREE.LineBasicMaterial({ color: "#49586b" }),
  );
  mesh.add(furnitureEdges);
}

function applyFurnitureAppearance(root, item, shadingMode) {
  const materialOptions = getFurnitureMaterialOptions(shadingMode);

  root.traverse((object) => {
    if (!object.isMesh) {
      return;
    }

    object.material = buildMaterial(item.color, shadingMode, materialOptions);
    object.castShadow = shadingMode !== "wireframe";
    object.receiveShadow = shadingMode !== "wireframe";

    if (shadingMode === "solid") {
      addFurnitureEdges(object);
    }
  });
}

function cloneFurnitureModel(template) {
  const clone = template.clone(true);

  clone.traverse((object) => {
    if (object.isMesh && object.geometry) {
      object.geometry = object.geometry.clone();
    }
  });

  return clone;
}

function normalizeFurnitureModelTemplate(sourceScene) {
  const modelRoot = sourceScene.clone(true);
  const template = new THREE.Group();
  template.add(modelRoot);
  template.updateMatrixWorld(true);

  const modelBounds = new THREE.Box3().setFromObject(template);
  const modelSize = modelBounds.getSize(new THREE.Vector3());
  const modelCenter = modelBounds.getCenter(new THREE.Vector3());

  modelRoot.position.sub(modelCenter);
  modelRoot.updateMatrixWorld(true);

  return {
    template,
    size: modelSize,
  };
}

function loadFurnitureModelTemplate(modelPath) {
  if (!modelPath) {
    return Promise.reject(new Error("Missing model path"));
  }

  const cachedTemplatePromise = furnitureModelPromiseCache.get(modelPath);
  if (cachedTemplatePromise) {
    return cachedTemplatePromise;
  }

  const nextTemplatePromise = furnitureModelLoader
    .loadAsync(modelPath)
    .then((gltf) => normalizeFurnitureModelTemplate(gltf.scene))
    .catch((error) => {
      furnitureModelPromiseCache.delete(modelPath);
      throw error;
    });

  furnitureModelPromiseCache.set(modelPath, nextTemplatePromise);
  return nextTemplatePromise;
}

function createFallbackFurnitureMesh(item, shadingMode) {
  const furnitureMesh = new THREE.Mesh(
    new THREE.BoxGeometry(item.width, item.meshHeight, item.depth),
    buildMaterial(
      item.color,
      shadingMode,
      getFurnitureMaterialOptions(shadingMode),
    ),
  );
  furnitureMesh.position.set(item.position.x, item.position.y, item.position.z);
  furnitureMesh.rotation.y = item.rotationY;
  furnitureMesh.castShadow = shadingMode !== "wireframe";
  furnitureMesh.receiveShadow = shadingMode !== "wireframe";

  if (shadingMode === "solid") {
    addFurnitureEdges(furnitureMesh);
  }

  return furnitureMesh;
}

async function createFurnitureObject(item, shadingMode) {
  if (!item.modelPath) {
    return createFallbackFurnitureMesh(item, shadingMode);
  }

  try {
    const { template, size } = await loadFurnitureModelTemplate(item.modelPath);
    const furnitureModel = cloneFurnitureModel(template);
    const safeSize = {
      x: Math.max(size.x, 0.001),
      y: Math.max(size.y, 0.001),
      z: Math.max(size.z, 0.001),
    };

    furnitureModel.scale.set(
      item.width / safeSize.x,
      item.meshHeight / safeSize.y,
      item.depth / safeSize.z,
    );
    furnitureModel.position.set(
      item.position.x,
      item.position.y,
      item.position.z,
    );
    furnitureModel.rotation.y = item.rotationY;
    applyFurnitureAppearance(furnitureModel, item, shadingMode);

    return furnitureModel;
  } catch (error) {
    console.warn(`Failed to load preview model for ${item.type}.`, error);
    return createFallbackFurnitureMesh(item, shadingMode);
  }
}

function ArrowLeftIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path
        d="M7.59 2.79a.67.67 0 0 1 .1.94L4.27 8l3.42 4.27a.67.67 0 1 1-1.05.84l-3.79-4.74a.67.67 0 0 1 0-.84l3.79-4.74a.67.67 0 0 1 .95-.1Z"
        fill="currentColor"
      />
      <path
        d="M13.36 8c0 .37-.3.67-.67.67H3.31a.67.67 0 0 1 0-1.34h9.38c.37 0 .67.3.67.67Z"
        fill="currentColor"
      />
    </svg>
  );
}

function LayersIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path
        d="M8 1.2 1.9 4.2 8 7.2l6.1-3L8 1.2Zm-5.9 5.4L8 9.5l5.9-2.9M2.1 9l5.9 2.9L13.9 9"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.2"
      />
    </svg>
  );
}

function CubeIcon() {
  return (
    <svg viewBox="0 0 12 12" aria-hidden="true">
      <path
        d="M6 1 2 3.2v5.6L6 11l4-2.2V3.2L6 1Zm0 0v5m-4-2.8L6 5.9l4-2.7"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.1"
      />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg viewBox="0 0 12 12" aria-hidden="true">
      <circle
        cx="6"
        cy="6"
        r="2.1"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.1"
      />
      <path
        d="M6 1.1v1.3M6 9.6v1.3M1.1 6h1.3M9.6 6h1.3M2.53 2.53l.92.92M8.55 8.55l.92.92M9.47 2.53l-.92.92M3.45 8.55l-.92.92"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.1"
      />
    </svg>
  );
}

function BoltIcon() {
  return (
    <svg viewBox="0 0 12 12" aria-hidden="true">
      <path
        d="M6.76 1.4 3.2 6.05h2.15L4.74 10.6 8.8 5.95H6.62l.14-.47.97-4.08h-.97Z"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.1"
      />
    </svg>
  );
}

function PointerIcon() {
  return (
    <svg viewBox="0 0 12 12" aria-hidden="true">
      <path
        d="M2 1.5 8.1 6l-2.8.46L6.8 10 5.2 10.6 3.7 7.1 2 8.6V1.5Z"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.05"
      />
    </svg>
  );
}

function PanIcon() {
  return (
    <svg viewBox="0 0 12 12" aria-hidden="true">
      <path
        d="M2.1 6h7.8M6 2.1V9.9M8.2 3.8 9.9 6 8.2 8.2M3.8 3.8 2.1 6 3.8 8.2"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.05"
      />
    </svg>
  );
}

function ZoomIcon() {
  return (
    <svg viewBox="0 0 12 12" aria-hidden="true">
      <circle
        cx="5.2"
        cy="5.2"
        r="2.9"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.05"
      />
      <path
        d="M7.36 7.36 10 10M5.2 3.95v2.5M3.95 5.2h2.5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.05"
      />
    </svg>
  );
}

function CameraIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path
        d="M6.2 5.1h1.6l1-1.6h2.4l1 1.6h1.6c1.2 0 2.2 1 2.2 2.2v6.1c0 1.2-1 2.2-2.2 2.2H6.2C5 15.6 4 14.6 4 13.4V7.3c0-1.2 1-2.2 2.2-2.2Z"
        fill="none"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.4"
      />
      <circle
        cx="10"
        cy="10.2"
        r="2.7"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
      />
    </svg>
  );
}

function ResetIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path
        d="M13.33 7.33A5.33 5.33 0 1 1 8 2.67c1.3 0 2.5.47 3.42 1.25"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.4"
      />
      <path
        d="M11.88 1.88v3.04H14.9"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.4"
      />
    </svg>
  );
}

function Preview3DViewport({
  design,
  shadingMode,
  lightingIntensity,
  renderQuality,
  onExportReady,
  onResetReady,
  onRenderStatsChange,
}) {
  const containerRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const savedCameraStateRef = useRef(null);
  const defaultCameraStateRef = useRef(null);
  const sceneData = useMemo(() => getPreviewSceneData(design), [design]);
  const floorOutline = useMemo(
    () => getRoomFloorOutline(sceneData.room),
    [sceneData.room],
  );
  const wallSegments = useMemo(
    () => getRoomWallSegments(sceneData.room),
    [sceneData.room],
  );

  const handleResetCamera = useCallback(() => {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    const defaultCameraState = defaultCameraStateRef.current;

    if (!camera || !controls || !defaultCameraState) {
      return;
    }

    applyCameraState(camera, controls, defaultCameraState);
    savedCameraStateRef.current = {
      position: defaultCameraState.position.clone(),
      target: defaultCameraState.target.clone(),
      zoom: defaultCameraState.zoom,
    };
  }, []);

  useEffect(() => {
    onResetReady?.(handleResetCamera);

    return () => {
      onResetReady?.(null);
    };
  }, [handleResetCamera, onResetReady]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return undefined;
    }

    const roomSpan = Math.max(sceneData.room.width, sceneData.room.length);
    const lightScale = Math.max(0.35, lightingIntensity / 75);
    const shadowMapSize = renderQuality === "ultra" ? 2048 : 1024;
    const pixelRatioLimit = renderQuality === "ultra" ? 2 : 1.35;
    const backgroundColor =
      shadingMode === "wireframe"
        ? "#f5f7fb"
        : shadingMode === "solid"
          ? "#f0f3f8"
          : "#f3ede2";

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(backgroundColor);
    scene.fog =
      shadingMode === "realistic"
        ? new THREE.Fog(backgroundColor, roomSpan * 1.55, roomSpan * 3.6)
        : null;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      preserveDrawingBuffer: true,
    });
    renderer.shadowMap.enabled = shadingMode !== "wireframe";
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping =
      shadingMode === "realistic"
        ? THREE.ACESFilmicToneMapping
        : THREE.NoToneMapping;
    renderer.toneMappingExposure =
      shadingMode === "realistic" ? 1 + (lightingIntensity - 65) / 180 : 1;
    renderer.setPixelRatio(
      Math.min(window.devicePixelRatio || 1, pixelRatioLimit),
    );
    container.replaceChildren(renderer.domElement);

    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 200);
    camera.position.set(
      roomSpan * 1.08,
      sceneData.room.wallHeight * 0.88,
      roomSpan * 1.16,
    );

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.enablePan = true;
    controls.enableZoom = true;
    controls.minDistance = Math.max(roomSpan * 0.65, 2.2);
    controls.maxDistance = Math.max(roomSpan * 3.8, 8);
    controls.minPolarAngle = Math.PI / 7;
    controls.maxPolarAngle = Math.PI / 2.02;
    controls.screenSpacePanning = true;
    controls.target.set(0, sceneData.room.wallHeight * 0.3, 0);
    controls.mouseButtons = {
      LEFT: THREE.MOUSE.ROTATE,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.PAN,
    };
    cameraRef.current = camera;
    controlsRef.current = controls;
    defaultCameraStateRef.current = captureCameraState(camera, controls);

    if (savedCameraStateRef.current) {
      applyCameraState(camera, controls, savedCameraStateRef.current);
    }

    scene.add(
      new THREE.AmbientLight(
        "#ffffff",
        shadingMode === "wireframe" ? 1.2 : 0.58 * lightScale,
      ),
    );

    const hemisphereLight = new THREE.HemisphereLight(
      "#fffdf8",
      "#c6d0dc",
      shadingMode === "wireframe" ? 0.95 : 0.92 * lightScale,
    );
    hemisphereLight.position.set(0, sceneData.room.wallHeight * 1.5, 0);
    scene.add(hemisphereLight);

    const keyLight = new THREE.DirectionalLight(
      "#fff8eb",
      shadingMode === "wireframe" ? 0.45 : 1.18 * lightScale,
    );
    keyLight.position.set(
      roomSpan * 0.85,
      sceneData.room.wallHeight * 1.65,
      roomSpan * 0.58,
    );
    keyLight.castShadow = shadingMode !== "wireframe";
    keyLight.shadow.mapSize.set(shadowMapSize, shadowMapSize);
    keyLight.shadow.bias = -0.0002;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(
      "#dce8f6",
      shadingMode === "wireframe" ? 0.35 : 0.44 * lightScale,
    );
    fillLight.position.set(
      -roomSpan * 0.9,
      sceneData.room.wallHeight * 1.25,
      -roomSpan * 0.8,
    );
    scene.add(fillLight);

    const outerFloor = new THREE.Mesh(
      new THREE.PlaneGeometry(roomSpan * 4, roomSpan * 4),
      buildMaterial("#e1cfb5", shadingMode, {
        roughness: 0.96,
        metalness: 0,
      }),
    );
    outerFloor.rotation.x = -Math.PI / 2;
    outerFloor.position.y = -0.02;
    outerFloor.receiveShadow = shadingMode !== "wireframe";
    scene.add(outerFloor);

    const centeredFloorPoints = floorOutline.map(
      (point) =>
        new THREE.Vector2(
          point.x - sceneData.room.width / 2,
          point.z - sceneData.room.length / 2,
        ),
    );
    const floorShape = new THREE.Shape(centeredFloorPoints);
    const floorGeometry = new THREE.ShapeGeometry(floorShape);
    floorGeometry.rotateX(-Math.PI / 2);
    const floor = new THREE.Mesh(
      floorGeometry,
      buildMaterial(sceneData.room.floorColor, shadingMode, {
        roughness: 0.92,
        metalness: 0.02,
      }),
    );
    floor.receiveShadow = shadingMode !== "wireframe";
    scene.add(floor);

    if (shadingMode === "wireframe" || shadingMode === "solid") {
      const floorGrid = createFloorGrid(centeredFloorPoints, roomSpan);
      scene.add(floorGrid);
    }

    if (shadingMode !== "realistic") {
      const floorEdges = new THREE.LineSegments(
        new THREE.EdgesGeometry(floorGeometry),
        new THREE.LineBasicMaterial({ color: "#a7b4c3" }),
      );
      floorEdges.position.y = 0.004;
      scene.add(floorEdges);
    }

    if (shadingMode === "realistic") {
      const sunlightPatch = new THREE.Mesh(
        new THREE.CircleGeometry(roomSpan * 0.62, 48),
        new THREE.MeshBasicMaterial({
          color: "#fff5d7",
          transparent: true,
          opacity: 0.18 * lightScale,
        }),
      );
      sunlightPatch.rotation.x = -Math.PI / 2;
      sunlightPatch.position.set(-roomSpan * 0.06, 0.015, roomSpan * 0.08);
      scene.add(sunlightPatch);
    }

    wallSegments.forEach((wall) => {
      const wallMesh = new THREE.Mesh(
        new THREE.BoxGeometry(
          wall.length,
          sceneData.room.wallHeight,
          sceneData.room.wallThickness,
        ),
        buildMaterial(sceneData.room.wallColor, shadingMode, {
          roughness: 0.84,
          metalness: 0.02,
          transparent: shadingMode === "realistic",
          opacity: shadingMode === "realistic" ? 0.95 : 1,
        }),
      );
      wallMesh.position.set(
        wall.centerX,
        sceneData.room.wallHeight / 2,
        wall.centerZ,
      );
      wallMesh.rotation.y = wall.rotationY;
      wallMesh.castShadow = shadingMode !== "wireframe";
      wallMesh.receiveShadow = shadingMode !== "wireframe";
      scene.add(wallMesh);
    });

    let isDisposed = false;
    let statsDirty = true;

    const loadFurnitureModels = async () => {
      const furnitureObjects = await Promise.all(
        sceneData.furniture.map((item) => createFurnitureObject(item, shadingMode)),
      );

      if (isDisposed) {
        furnitureObjects.forEach((object) => disposeObjectTree(object));
        return;
      }

      furnitureObjects.forEach((object) => scene.add(object));
      statsDirty = true;
    };

    void loadFurnitureModels();

    const exportScene = () => {
      const safeRoomName =
        sceneData.room.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "") || "furnitureviz-preview";
      const anchor = document.createElement("a");
      anchor.download = `${safeRoomName}-3d-preview.png`;
      anchor.href = renderer.domElement.toDataURL("image/png");
      anchor.click();
    };

    onExportReady?.(exportScene);

    const resizeScene = () => {
      const width = Math.max(container.clientWidth, 1);
      const height = Math.max(container.clientHeight, 1);

      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    };

    resizeScene();

    let animationFrameId = 0;
    const renderScene = () => {
      animationFrameId = window.requestAnimationFrame(renderScene);
      controls.update();
      renderer.render(scene, camera);

      if (statsDirty) {
        statsDirty = false;
        onRenderStatsChange?.({
          polygons: formatStatValue(renderer.info.render.triangles),
          drawCalls: formatStatValue(renderer.info.render.calls),
        });
      }
    };

    renderScene();

    const resizeObserver =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => resizeScene())
        : null;

    resizeObserver?.observe(container);

    return () => {
      isDisposed = true;
      savedCameraStateRef.current = captureCameraState(camera, controls);
      window.cancelAnimationFrame(animationFrameId);
      resizeObserver?.disconnect();
      controls.dispose();
      onExportReady?.(null);
      cameraRef.current = null;
      controlsRef.current = null;
      disposeScene(scene);
      renderer.dispose();
      container.replaceChildren();
    };
  }, [
    design,
    floorOutline,
    lightingIntensity,
    onExportReady,
    onResetReady,
    onRenderStatsChange,
    renderQuality,
    sceneData,
    shadingMode,
    wallSegments,
  ]);

  return (
    <div className="preview3d-stage-card">
      <div ref={containerRef} className="preview3d-stage-canvas" />
      <div className="preview3d-stage-overlay" />
    </div>
  );
}

function SettingsActionButton({ children, isActive, onClick }) {
  return (
    <button
      type="button"
      className={`preview3d-segment-button ${isActive ? "active" : ""}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function Preview3DPage({
  username,
  design,
  onGoDashboard,
  onCreateDesign,
  onSavedDesigns,
  onBackToDesigner,
  canCreateDesign = true,
}) {
  const sceneData = useMemo(() => getPreviewSceneData(design), [design]);
  const exportPreviewRef = useRef(null);
  const resetCameraRef = useRef(null);
  const [shadingMode, setShadingMode] = useState("realistic");
  const [lightingIntensity, setLightingIntensity] = useState(75);
  const [renderQuality, setRenderQuality] = useState("standard");
  const [renderStats, setRenderStats] = useState({
    polygons: "--",
    drawCalls: "--",
  });
  const sceneSummary = `${sceneData.room.shapeLabel} | ${formatPreviewDistance(
    sceneData.room.displayWidth,
    sceneData.room.unit,
  )} x ${formatPreviewDistance(
    sceneData.room.displayLength,
    sceneData.room.unit,
  )} | ${sceneData.furniture.length} item${
    sceneData.furniture.length === 1 ? "" : "s"
  }`;

  const handleExportReady = useCallback((exportHandler) => {
    exportPreviewRef.current = exportHandler;
  }, []);

  const handleResetReady = useCallback((resetHandler) => {
    resetCameraRef.current = resetHandler;
  }, []);

  const handleRenderStatsChange = useCallback((nextStats) => {
    setRenderStats(nextStats);
  }, []);

  const handleExportPreview = useCallback(() => {
    exportPreviewRef.current?.();
  }, []);

  const handleResetCamera = useCallback(() => {
    resetCameraRef.current?.();
  }, []);

  useEffect(() => {
    const handleKeyDown = (event) => {
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }

      if (event.key.toLowerCase() !== "r") {
        return;
      }

      event.preventDefault();
      handleResetCamera();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleResetCamera]);

  return (
    <div className="preview3d-page">
      <AppTopNav
        username={username}
        activeTab="create"
        onDashboard={onGoDashboard}
        onCreateDesign={onCreateDesign}
        onSavedDesigns={onSavedDesigns}
        canCreateDesign={canCreateDesign}
      />

      <main className="preview3d-main">
        {design?.room ? (
          <section className="preview3d-shell">
            <div className="preview3d-view-area">
              <Preview3DViewport
                design={design}
                shadingMode={shadingMode}
                lightingIntensity={lightingIntensity}
                renderQuality={renderQuality}
                onExportReady={handleExportReady}
                onResetReady={handleResetReady}
                onRenderStatsChange={handleRenderStatsChange}
              />

              <button
                type="button"
                className="preview3d-back-button"
                onClick={onBackToDesigner}
              >
                <ArrowLeftIcon />
                <span>Back to 2D Editor</span>
              </button>

              <aside className="preview3d-settings-panel">
                <div className="preview3d-settings-header">
                  <div className="preview3d-settings-title">
                    <span className="preview3d-settings-title-icon">
                      <LayersIcon />
                    </span>
                    <h1>3D Preview</h1>
                  </div>
                  <span className="preview3d-settings-tag">
                    Live Scene
                  </span>
                </div>

                <section className="preview3d-settings-section">
                  <div className="preview3d-settings-label-row">
                    <span className="preview3d-settings-label">
                      <CubeIcon />
                      Shading Mode
                    </span>
                  </div>

                  <div className="preview3d-segment-row">
                    <SettingsActionButton
                      isActive={shadingMode === "wireframe"}
                      onClick={() => setShadingMode("wireframe")}
                    >
                      Wireframe
                    </SettingsActionButton>
                    <SettingsActionButton
                      isActive={shadingMode === "solid"}
                      onClick={() => setShadingMode("solid")}
                    >
                      Solid
                    </SettingsActionButton>
                    <SettingsActionButton
                      isActive={shadingMode === "realistic"}
                      onClick={() => setShadingMode("realistic")}
                    >
                      Realistic
                    </SettingsActionButton>
                  </div>
                </section>

                <section className="preview3d-settings-section">
                  <div className="preview3d-settings-label-row">
                    <span className="preview3d-settings-label">
                      <SunIcon />
                      Lighting Intensity
                    </span>
                    <strong>{lightingIntensity}%</strong>
                  </div>

                  <input
                    type="range"
                    min="35"
                    max="100"
                    value={lightingIntensity}
                    className="preview3d-slider"
                    onChange={(event) =>
                      setLightingIntensity(Number(event.target.value))
                    }
                    aria-label="Lighting intensity"
                  />
                </section>

                <section className="preview3d-settings-section">
                  <div className="preview3d-settings-label-row">
                    <span className="preview3d-settings-label">
                      <BoltIcon />
                      Render Quality
                    </span>
                  </div>

                  <div className="preview3d-segment-row preview3d-segment-row-wide">
                    <SettingsActionButton
                      isActive={renderQuality === "standard"}
                      onClick={() => setRenderQuality("standard")}
                    >
                      Standard
                    </SettingsActionButton>
                    <SettingsActionButton
                      isActive={renderQuality === "ultra"}
                      onClick={() => setRenderQuality("ultra")}
                    >
                      Ultra High
                    </SettingsActionButton>
                  </div>

                  <p className="preview3d-settings-note">
                    Ultra High may reduce interaction smoothness.
                  </p>
                </section>

                <div className="preview3d-settings-stats">
                  <div className="preview3d-settings-stat">
                    <span>Polygons</span>
                    <strong>{renderStats.polygons}</strong>
                  </div>
                  <div className="preview3d-settings-stat">
                    <span>Draw Calls</span>
                    <strong>{renderStats.drawCalls}</strong>
                  </div>
                  <div className="preview3d-settings-stat preview3d-settings-stat-wide">
                    <span>Scene</span>
                    <strong>{sceneSummary}</strong>
                  </div>
                </div>
              </aside>

              <div className="preview3d-export-stack">
                <button
                  type="button"
                  className="preview3d-reset-button"
                  onClick={handleResetCamera}
                  aria-keyshortcuts="R"
                  title="Reset camera to default view (R)"
                >
                  <ResetIcon />
                  <span>Reset Camera (R)</span>
                </button>
                <button
                  type="button"
                  className="preview3d-camera-button"
                  onClick={handleExportPreview}
                  aria-label="Save current preview as PNG"
                  title="Save current preview as PNG"
                >
                  <CameraIcon />
                </button>
                <button
                  type="button"
                  className="preview3d-export-button"
                  onClick={handleExportPreview}
                >
                  Save PNG
                </button>
              </div>

              <div className="preview3d-control-bar">
                <div
                  className="preview3d-control-item"
                  data-label="Left drag rotates"
                >
                  <span className="preview3d-control-icon">
                    <PointerIcon />
                  </span>
                  <span>Left drag rotates</span>
                </div>
                <div className="preview3d-control-divider" />
                <div
                  className="preview3d-control-item"
                  data-label="Right drag pans"
                >
                  <span className="preview3d-control-icon">
                    <PanIcon />
                  </span>
                  <span>Right drag pans</span>
                </div>
                <div className="preview3d-control-divider" />
                <div
                  className="preview3d-control-item"
                  data-label="Scroll zooms"
                >
                  <span className="preview3d-control-icon">
                    <ZoomIcon />
                  </span>
                  <span>Scroll zooms</span>
                </div>
              </div>
            </div>

            <footer className="preview3d-footer">
              <span>&copy; 2026 FurnitureViz</span>
              <span>Privacy Policy</span>
              <span>Terms of Service</span>
            </footer>
          </section>
        ) : (
          <section className="preview3d-empty-state">
            <h2>3D preview unavailable</h2>
            <p>
              Open a room from the editor or saved designs to preview it here.
            </p>
            <button
              type="button"
              className="preview3d-button button-primary"
              onClick={canCreateDesign ? onCreateDesign : onSavedDesigns}
            >
              {canCreateDesign ? "Create Design" : "View Saved Designs"}
            </button>
          </section>
        )}
      </main>
    </div>
  );
}

export default Preview3DPage;
