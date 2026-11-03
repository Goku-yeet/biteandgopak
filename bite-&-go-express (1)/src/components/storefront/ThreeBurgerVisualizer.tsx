import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  RotateCcw,
  Sparkles,
  Layers,
  Eye,
  Maximize2,
  Flame,
  Award,
  Utensils,
  ChevronRight,
  Info,
} from 'lucide-react';

export type ThreeDishPreset = 'smash_burger' | 'crispy_zinger' | 'loaded_fries';

interface ThreeBurgerVisualizerProps {
  initialPreset?: ThreeDishPreset;
  interactive?: boolean;
  className?: string;
  onSelectDish?: (preset: ThreeDishPreset) => void;
  showControls?: boolean;
  compact?: boolean;
}

export const ThreeBurgerVisualizer: React.FC<ThreeBurgerVisualizerProps> = ({
  initialPreset = 'smash_burger',
  interactive = true,
  className = '',
  onSelectDish,
  showControls = true,
  compact = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [preset, setPreset] = useState<ThreeDishPreset>(initialPreset);
  const [isExploded, setIsExploded] = useState(false);
  const [autoRotate, setAutoRotate] = useState(true);
  const [activeLayerInfo, setActiveLayerInfo] = useState<string | null>(null);

  // References to animated 3D layer objects
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const modelGroupRef = useRef<THREE.Group | null>(null);
  const animFrameIdRef = useRef<number | null>(null);

  // Array of layers for the exploded view animation
  const layersRef = useRef<Array<{ mesh: THREE.Object3D; baseY: number; explodedY: number; label: string }>>([]);

  // Touch and drag rotation tracking
  const isDraggingRef = useRef(false);
  const previousPointerPosRef = useRef({ x: 0, y: 0 });
  const rotationVelocityRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    setPreset(initialPreset);
  }, [initialPreset]);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const width = container.clientWidth || 400;
    const height = container.clientHeight || 340;

    // 1. Scene Setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // 2. Camera Setup
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 1.8, 5.2);
    cameraRef.current = camera;

    // 3. Renderer Setup
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    rendererRef.current = renderer;

    // 4. Studio Culinary Lighting Rig
    const ambientLight = new THREE.AmbientLight(0xfff7ed, 0.85); // Warm ambient
    scene.add(ambientLight);

    const mainKeyLight = new THREE.DirectionalLight(0xfffbeb, 2.2); // Warm golden overhead key
    mainKeyLight.position.set(3, 6, 4);
    scene.add(mainKeyLight);

    const rimLight = new THREE.DirectionalLight(0xf59e0b, 2.6); // Amber rim light for sizzle
    rimLight.position.set(-4, 3, -3);
    scene.add(rimLight);

    const bottomFillLight = new THREE.DirectionalLight(0x78350f, 0.7); // Subtle warm bounce
    bottomFillLight.position.set(0, -3, 2);
    scene.add(bottomFillLight);

    // 5. Build Model Container
    const modelGroup = new THREE.Group();
    scene.add(modelGroup);
    modelGroupRef.current = modelGroup;

    // Materials Library with realistic PBR properties
    const bunMaterial = new THREE.MeshStandardMaterial({
      color: 0xd97706, // Golden brioche
      roughness: 0.38,
      metalness: 0.04,
    });

    const bunBottomMaterial = new THREE.MeshStandardMaterial({
      color: 0xb45309,
      roughness: 0.45,
    });

    const sesameMaterial = new THREE.MeshStandardMaterial({
      color: 0xfef3c7,
      roughness: 0.6,
    });

    const smashPattyMaterial = new THREE.MeshStandardMaterial({
      color: 0x1f0e06, // Deep charred sear
      roughness: 0.85,
      metalness: 0.1,
    });

    const zingerFilletMaterial = new THREE.MeshStandardMaterial({
      color: 0xc2410c, // Crispy spiced batter
      roughness: 0.78,
      metalness: 0.05,
    });

    const cheddarMaterial = new THREE.MeshStandardMaterial({
      color: 0xf59e0b, // Golden molten cheddar
      roughness: 0.22,
      metalness: 0.05,
    });

    const tomatoMaterial = new THREE.MeshStandardMaterial({
      color: 0xdc2626, // Crimson ripe tomato
      roughness: 0.15,
      metalness: 0.02,
    });

    const lettuceMaterial = new THREE.MeshStandardMaterial({
      color: 0x16a34a, // Leafy fresh green
      roughness: 0.5,
      side: THREE.DoubleSide,
    });

    const onionMaterial = new THREE.MeshStandardMaterial({
      color: 0x78350f,
      roughness: 0.3,
    });

    const plateMaterial = new THREE.MeshStandardMaterial({
      color: 0x09090b,
      roughness: 0.75,
      metalness: 0.2,
    });

    const fryMaterial = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      roughness: 0.4,
    });

    // Serving Pedestal Slate Plate
    const plateGeom = new THREE.CylinderGeometry(1.9, 2.0, 0.08, 48);
    const plateMesh = new THREE.Mesh(plateGeom, plateMaterial);
    plateMesh.position.y = -0.92;
    modelGroup.add(plateMesh);

    // Build Specific Preset Dish
    layersRef.current = [];

    if (preset === 'smash_burger') {
      // Layer 1: Bottom Brioche Bun
      const bottomBunGeom = new THREE.CylinderGeometry(1.2, 1.15, 0.3, 32);
      const bottomBun = new THREE.Mesh(bottomBunGeom, bunBottomMaterial);
      bottomBun.position.y = -0.65;
      modelGroup.add(bottomBun);
      layersRef.current.push({
        mesh: bottomBun,
        baseY: -0.65,
        explodedY: -1.3,
        label: 'Toasted Brioche Base',
      });

      // Layer 2: Crispy Green Lettuce
      const lettuceGroup = new THREE.Group();
      const lettuceGeom = new THREE.CylinderGeometry(1.35, 1.3, 0.06, 16);
      const lettuce = new THREE.Mesh(lettuceGeom, lettuceMaterial);
      lettuceGroup.add(lettuce);
      lettuceGroup.position.y = -0.42;
      modelGroup.add(lettuceGroup);
      layersRef.current.push({
        mesh: lettuceGroup,
        baseY: -0.42,
        explodedY: -0.9,
        label: 'Fresh Crisp Lettuce',
      });

      // Layer 3: Juicy Lower Smash Beef Patty (Craggy Jagged Crust)
      const patty1Geom = new THREE.CylinderGeometry(1.32, 1.34, 0.24, 28);
      // Displace vertices to create authentic irregular smash sear
      const posAttr1 = patty1Geom.attributes.position;
      for (let i = 0; i < posAttr1.count; i++) {
        const x = posAttr1.getX(i);
        const z = posAttr1.getZ(i);
        const radius = Math.sqrt(x * x + z * z);
        if (radius > 1.0) {
          const jitter = (Math.sin(i * 3.7) + Math.cos(i * 5.1)) * 0.06;
          posAttr1.setX(i, x + jitter);
          posAttr1.setZ(i, z + jitter);
        }
      }
      patty1Geom.computeVertexNormals();
      const patty1 = new THREE.Mesh(patty1Geom, smashPattyMaterial);
      patty1.position.y = -0.22;
      modelGroup.add(patty1);
      layersRef.current.push({
        mesh: patty1,
        baseY: -0.22,
        explodedY: -0.5,
        label: 'Prime Smashed Beef Patty (400°F)',
      });

      // Layer 4: Melting Wisconsin Cheddar Layer 1
      const cheeseGeom1 = new THREE.BoxGeometry(1.7, 0.04, 1.7);
      const cheese1 = new THREE.Mesh(cheeseGeom1, cheddarMaterial);
      cheese1.rotation.y = 0.35;
      cheese1.position.y = -0.06;
      modelGroup.add(cheese1);
      layersRef.current.push({
        mesh: cheese1,
        baseY: -0.06,
        explodedY: -0.15,
        label: 'Melted Wisconsin Cheddar',
      });

      // Layer 5: Grilled Caramelized Onions & Sliced Tomato
      const veggieGroup = new THREE.Group();
      const tomatoGeom1 = new THREE.CylinderGeometry(0.55, 0.55, 0.08, 20);
      const tomato1 = new THREE.Mesh(tomatoGeom1, tomatoMaterial);
      tomato1.position.set(-0.35, 0, 0.1);
      const tomato2 = new THREE.Mesh(tomatoGeom1, tomatoMaterial);
      tomato2.position.set(0.35, 0, -0.1);
      veggieGroup.add(tomato1, tomato2);

      // Onions
      const onionGeom = new THREE.TorusGeometry(0.38, 0.05, 8, 24);
      const onion1 = new THREE.Mesh(onionGeom, onionMaterial);
      onion1.rotation.x = Math.PI / 2;
      onion1.position.set(0, 0.05, 0);
      veggieGroup.add(onion1);

      veggieGroup.position.y = 0.08;
      modelGroup.add(veggieGroup);
      layersRef.current.push({
        mesh: veggieGroup,
        baseY: 0.08,
        explodedY: 0.25,
        label: 'Ripe Tomatoes & Caramelized Onions',
      });

      // Layer 6: Upper Smash Beef Patty
      const patty2Geom = new THREE.CylinderGeometry(1.3, 1.32, 0.22, 28);
      const patty2 = new THREE.Mesh(patty2Geom, smashPattyMaterial);
      patty2.position.y = 0.26;
      modelGroup.add(patty2);
      layersRef.current.push({
        mesh: patty2,
        baseY: 0.26,
        explodedY: 0.65,
        label: 'Dual 100% Halal Smash Patty',
      });

      // Layer 7: Melted Cheddar Layer 2
      const cheeseGeom2 = new THREE.BoxGeometry(1.68, 0.04, 1.68);
      const cheese2 = new THREE.Mesh(cheeseGeom2, cheddarMaterial);
      cheese2.rotation.y = 0.78;
      cheese2.position.y = 0.42;
      modelGroup.add(cheese2);
      layersRef.current.push({
        mesh: cheese2,
        baseY: 0.42,
        explodedY: 1.0,
        label: 'Double Cheese Cascade',
      });

      // Layer 8: Golden Glazed Brioche Top Bun Dome with Sesame Seeds
      const topBunGroup = new THREE.Group();
      // Hemisphere dome
      const topBunGeom = new THREE.SphereGeometry(1.25, 32, 20, 0, Math.PI * 2, 0, Math.PI * 0.48);
      const topBunMesh = new THREE.Mesh(topBunGeom, bunMaterial);
      topBunMesh.scale.set(1, 0.68, 1);
      topBunGroup.add(topBunMesh);

      // Sesame Seeds scattered
      const seedGeom = new THREE.SphereGeometry(0.024, 8, 8);
      seedGeom.scale(1, 0.4, 2);
      for (let s = 0; s < 45; s++) {
        const phi = Math.random() * Math.PI * 0.35;
        const theta = Math.random() * Math.PI * 2;
        const rad = 1.25;
        const x = rad * Math.sin(phi) * Math.cos(theta);
        const z = rad * Math.sin(phi) * Math.sin(theta);
        const y = rad * Math.cos(phi) * 0.68;
        const seed = new THREE.Mesh(seedGeom, sesameMaterial);
        seed.position.set(x, y + 0.01, z);
        seed.lookAt(0, y, 0);
        topBunGroup.add(seed);
      }

      topBunGroup.position.y = 0.54;
      modelGroup.add(topBunGroup);
      layersRef.current.push({
        mesh: topBunGroup,
        baseY: 0.54,
        explodedY: 1.45,
        label: 'Golden Brioche Sesame Dome',
      });
    } else if (preset === 'crispy_zinger') {
      // Crispy Zinger 3D Model
      const bottomBunGeom = new THREE.CylinderGeometry(1.2, 1.15, 0.32, 32);
      const bottomBun = new THREE.Mesh(bottomBunGeom, bunBottomMaterial);
      bottomBun.position.y = -0.6;
      modelGroup.add(bottomBun);
      layersRef.current.push({ mesh: bottomBun, baseY: -0.6, explodedY: -1.2, label: 'Toasted Sesame Bun Base' });

      // Shredded Iceberg Lettuce
      const lettuceGroup = new THREE.Group();
      for (let i = 0; i < 18; i++) {
        const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.03, 0.6), lettuceMaterial);
        leaf.position.set((Math.random() - 0.5) * 1.5, 0, (Math.random() - 0.5) * 1.5);
        leaf.rotation.y = Math.random() * Math.PI;
        lettuceGroup.add(leaf);
      }
      lettuceGroup.position.y = -0.38;
      modelGroup.add(lettuceGroup);
      layersRef.current.push({ mesh: lettuceGroup, baseY: -0.38, explodedY: -0.7, label: 'Crunchy Iceberg Lettuce' });

      // Whole Jumbo Crispy Spiced Zinger Fillet
      const zingerGeom = new THREE.CylinderGeometry(1.35, 1.4, 0.45, 24);
      // Rough batter displacement
      const posAttr = zingerGeom.attributes.position;
      for (let i = 0; i < posAttr.count; i++) {
        const x = posAttr.getX(i);
        const y = posAttr.getY(i);
        const z = posAttr.getZ(i);
        const noise = (Math.sin(x * 6) + Math.cos(z * 6) + Math.sin(y * 8)) * 0.08;
        posAttr.setX(i, x + noise);
        posAttr.setY(i, y + noise);
        posAttr.setZ(i, z + noise);
      }
      zingerGeom.computeVertexNormals();
      const zingerFillet = new THREE.Mesh(zingerGeom, zingerFilletMaterial);
      zingerFillet.position.y = -0.05;
      modelGroup.add(zingerFillet);
      layersRef.current.push({
        mesh: zingerFillet,
        baseY: -0.05,
        explodedY: 0.1,
        label: '24-Hour Spiced Crispy Fillet',
      });

      // Creamy Spicy Zinger Mayo Sauce
      const sauceGeom = new THREE.CylinderGeometry(1.1, 1.2, 0.08, 20);
      const sauceMesh = new THREE.Mesh(sauceGeom, cheddarMaterial);
      sauceMesh.position.y = 0.28;
      modelGroup.add(sauceMesh);
      layersRef.current.push({ mesh: sauceMesh, baseY: 0.28, explodedY: 0.7, label: 'Bite & Go Secret Pepper Sauce' });

      // Top Sesame Bun Dome
      const topBunGroup = new THREE.Group();
      const topBunGeom = new THREE.SphereGeometry(1.25, 32, 20, 0, Math.PI * 2, 0, Math.PI * 0.5);
      const topBunMesh = new THREE.Mesh(topBunGeom, bunMaterial);
      topBunMesh.scale.set(1, 0.7, 1);
      topBunGroup.add(topBunMesh);
      topBunGroup.position.y = 0.42;
      modelGroup.add(topBunGroup);
      layersRef.current.push({ mesh: topBunGroup, baseY: 0.42, explodedY: 1.35, label: 'Golden Toasted Brioche Bun' });
    } else {
      // Loaded Crinkle Fries Model
      const friesGroup = new THREE.Group();
      const fryGeom = new THREE.BoxGeometry(0.18, 0.18, 1.4);
      for (let f = 0; f < 32; f++) {
        const fry = new THREE.Mesh(fryGeom, fryMaterial);
        const radius = Math.random() * 0.8;
        const angle = Math.random() * Math.PI * 2;
        fry.position.set(
          Math.cos(angle) * radius,
          -0.6 + Math.random() * 0.7,
          Math.sin(angle) * radius
        );
        fry.rotation.set(
          (Math.random() - 0.5) * 0.6,
          Math.random() * Math.PI,
          (Math.random() - 0.5) * 0.6
        );
        friesGroup.add(fry);
      }
      modelGroup.add(friesGroup);
      layersRef.current.push({ mesh: friesGroup, baseY: 0, explodedY: -0.3, label: 'Golden Crinkle Fries' });

      // Molten Cheese River Mound
      const cheeseLavaGeom = new THREE.SphereGeometry(0.75, 16, 12);
      cheeseLavaGeom.scale(1.2, 0.35, 1.2);
      const cheeseLava = new THREE.Mesh(cheeseLavaGeom, cheddarMaterial);
      cheeseLava.position.y = -0.15;
      modelGroup.add(cheeseLava);
      layersRef.current.push({ mesh: cheeseLava, baseY: -0.15, explodedY: 0.4, label: 'Molten Cheddar River' });

      // Pickled Jalapeno slices on top
      const jalapenoGroup = new THREE.Group();
      const jalaGeom = new THREE.TorusGeometry(0.2, 0.08, 8, 16);
      for (let j = 0; j < 6; j++) {
        const jala = new THREE.Mesh(jalaGeom, lettuceMaterial);
        jala.position.set((Math.random() - 0.5) * 0.9, 0.1 + Math.random() * 0.1, (Math.random() - 0.5) * 0.9);
        jala.rotation.x = Math.PI / 2 + (Math.random() - 0.5) * 0.3;
        jalapenoGroup.add(jala);
      }
      modelGroup.add(jalapenoGroup);
      layersRef.current.push({ mesh: jalapenoGroup, baseY: 0.1, explodedY: 0.9, label: 'Pickled Spicy Jalapenos' });
    }

    // Gentle camera angle tilt
    modelGroup.rotation.x = 0.22;

    // 6. Animation Loop with smooth damping
    let lastTime = performance.now();
    const animate = (currentTime: number) => {
      animFrameIdRef.current = requestAnimationFrame(animate);

      const delta = (currentTime - lastTime) / 1000;
      lastTime = currentTime;

      // Handle continuous idle rotation
      if (autoRotate && !isDraggingRef.current && modelGroupRef.current) {
        modelGroupRef.current.rotation.y += 0.8 * delta;
      }

      // Smooth inertia from dragging
      if (!isDraggingRef.current && modelGroupRef.current) {
        modelGroupRef.current.rotation.y += rotationVelocityRef.current.x;
        modelGroupRef.current.rotation.x += rotationVelocityRef.current.y;
        rotationVelocityRef.current.x *= 0.92;
        rotationVelocityRef.current.y *= 0.92;
      }

      // Smooth layer position interpolation for exploded view
      const targetIsExploded = isExploded;
      layersRef.current.forEach((layer) => {
        const targetY = targetIsExploded ? layer.explodedY : layer.baseY;
        layer.mesh.position.y += (targetY - layer.mesh.position.y) * 0.1;
      });

      renderer.render(scene, camera);
    };

    animFrameIdRef.current = requestAnimationFrame(animate);

    // 7. Resize Observer for fluid responsiveness
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        const h = entry.contentRect.height;
        if (w > 0 && h > 0 && cameraRef.current && rendererRef.current) {
          cameraRef.current.aspect = w / h;
          cameraRef.current.updateProjectionMatrix();
          rendererRef.current.setSize(w, h);
        }
      }
    });
    resizeObserver.observe(container);

    // 8. Cleanup on unmount or preset change
    return () => {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
      resizeObserver.disconnect();

      // Dispose Three.js objects
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else if (obj.material) {
            obj.material.dispose();
          }
        }
      });
      renderer.dispose();
    };
  }, [preset, isExploded, autoRotate]);

  // Pointer Drag Handlers for 360° Inspection
  const handlePointerDown = (e: React.PointerEvent) => {
    if (!interactive) return;
    isDraggingRef.current = true;
    previousPointerPosRef.current = { x: e.clientX, y: e.clientY };
    rotationVelocityRef.current = { x: 0, y: 0 };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current || !modelGroupRef.current) return;
    const deltaX = e.clientX - previousPointerPosRef.current.x;
    const deltaY = e.clientY - previousPointerPosRef.current.y;
    previousPointerPosRef.current = { x: e.clientX, y: e.clientY };

    const rotSpeed = 0.007;
    modelGroupRef.current.rotation.y += deltaX * rotSpeed;
    modelGroupRef.current.rotation.x = Math.max(
      -0.2,
      Math.min(0.65, modelGroupRef.current.rotation.x + deltaY * rotSpeed)
    );

    rotationVelocityRef.current = { x: deltaX * rotSpeed * 0.6, y: deltaY * rotSpeed * 0.6 };
  };

  const handlePointerUp = () => {
    isDraggingRef.current = false;
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full min-h-[300px] flex flex-col items-center justify-center select-none overflow-hidden rounded-2xl bg-gradient-to-b from-neutral-900/90 via-neutral-950 to-neutral-950 border border-neutral-800 shadow-2xl group ${className}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      {/* 3D WebGL Canvas */}
      <canvas ref={canvasRef} className="w-full h-full cursor-grab active:cursor-grabbing block" />

      {/* Top Floating Badges */}
      <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-full bg-neutral-950/80 backdrop-blur-md border border-amber-500/40 text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5 shadow-md pointer-events-auto">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin" style={{ animationDuration: '6s' }} />
            <span>Interactive 3D View (360°)</span>
          </span>
        </div>

        <div className="flex items-center gap-1 pointer-events-auto">
          <button
            type="button"
            onClick={() => setAutoRotate((prev) => !prev)}
            className={`p-1.5 rounded-lg border text-xs font-semibold backdrop-blur-md transition-colors cursor-pointer ${
              autoRotate
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                : 'bg-neutral-950/80 border-neutral-800 text-neutral-400 hover:text-white'
            }`}
            title={autoRotate ? 'Pause 360° rotation' : 'Resume auto-rotation'}
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => setIsExploded((prev) => !prev)}
            className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold backdrop-blur-md transition-all flex items-center gap-1 cursor-pointer ${
              isExploded
                ? 'bg-amber-500 text-neutral-950 border-amber-400 shadow-lg shadow-amber-500/20'
                : 'bg-neutral-950/80 border-neutral-800 text-neutral-200 hover:border-amber-500/40'
            }`}
            title="Inspect 7-Layer Fresh Ingredients in 3D Exploded View"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{isExploded ? 'Assembled' : 'Explode Layers'}</span>
          </button>
        </div>
      </div>

      {/* Exploded View Ingredients Legend */}
      {isExploded && (
        <div className="absolute left-3 bottom-14 max-w-[210px] sm:max-w-xs space-y-1 bg-neutral-950/90 backdrop-blur-md border border-neutral-800 p-2.5 rounded-xl shadow-xl animate-in fade-in slide-in-from-bottom-2 pointer-events-auto">
          <div className="flex items-center justify-between text-[10px] font-mono text-neutral-400 border-b border-neutral-800 pb-1">
            <span className="font-bold text-amber-400">7-LAYER FRESH BOM</span>
            <span>100% Halal</span>
          </div>
          <div className="space-y-0.5 text-[10.5px]">
            {layersRef.current.map((layer, idx) => (
              <div
                key={idx}
                onMouseEnter={() => setActiveLayerInfo(layer.label)}
                onMouseLeave={() => setActiveLayerInfo(null)}
                className="flex items-center gap-1.5 text-neutral-300 hover:text-amber-300 transition-colors"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                <span className="truncate">{layer.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Preset Switcher Tabs at Bottom */}
      {showControls && (
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2 pointer-events-auto">
          <div className="flex items-center gap-1 bg-neutral-950/90 backdrop-blur-md border border-neutral-800 p-1 rounded-xl shadow-lg">
            <button
              type="button"
              onClick={() => {
                setPreset('smash_burger');
                if (onSelectDish) onSelectDish('smash_burger');
              }}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                preset === 'smash_burger'
                  ? 'bg-amber-500 text-neutral-950 shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              🍔 Double Smash
            </button>
            <button
              type="button"
              onClick={() => {
                setPreset('crispy_zinger');
                if (onSelectDish) onSelectDish('crispy_zinger');
              }}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                preset === 'crispy_zinger'
                  ? 'bg-amber-500 text-neutral-950 shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              🍗 Zinger Fillet
            </button>
            <button
              type="button"
              onClick={() => {
                setPreset('loaded_fries');
                if (onSelectDish) onSelectDish('loaded_fries');
              }}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                preset === 'loaded_fries'
                  ? 'bg-amber-500 text-neutral-950 shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              🍟 Loaded Fries
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-1 text-[10px] text-neutral-400 bg-neutral-950/80 backdrop-blur-md px-2.5 py-1 rounded-lg border border-neutral-800 pointer-events-none">
            <span>🖱️ Drag to Rotate 360°</span>
          </div>
        </div>
      )}
    </div>
  );
};
