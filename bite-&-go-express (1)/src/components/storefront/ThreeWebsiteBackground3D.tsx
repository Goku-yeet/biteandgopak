import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface ThreeWebsiteBackground3DProps {
  className?: string;
}

/**
 * ThreeWebsiteBackground3D
 * Provides modern 3D ambient WebGL depth for the website background:
 * - Floating golden amber ember particles
 * - 3D wireframe geometric rings and perspective grid
 * - Interactive mouse/pointer parallax tracking in 3D space
 */
export const ThreeWebsiteBackground3D: React.FC<ThreeWebsiteBackground3DProps> = ({
  className = 'absolute inset-0 pointer-events-none z-0 overflow-hidden',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || 450;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 100);
    camera.position.z = 18;

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // 2. 3D Particles Constellation (Golden / Flame Embers)
    const particleCount = 280;
    const posArray = new Float32Array(particleCount * 3);
    const speedArray = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount * 3; i += 3) {
      posArray[i] = (Math.random() - 0.5) * 35; // x
      posArray[i + 1] = (Math.random() - 0.5) * 20; // y
      posArray[i + 2] = (Math.random() - 0.5) * 20; // z

      speedArray[i] = (Math.random() - 0.5) * 0.008;
      speedArray[i + 1] = 0.005 + Math.random() * 0.012; // upward thermal drift
      speedArray[i + 2] = (Math.random() - 0.5) * 0.008;
    }

    const particlesGeometry = new THREE.BufferGeometry();
    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));

    // Particle texture canvas
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
      gradient.addColorStop(0, 'rgba(251, 191, 36, 1)');
      gradient.addColorStop(0.3, 'rgba(245, 158, 11, 0.7)');
      gradient.addColorStop(0.8, 'rgba(217, 119, 6, 0.2)');
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 32, 32);
    }
    const particleTexture = new THREE.CanvasTexture(canvas);

    const particlesMaterial = new THREE.PointsMaterial({
      size: 0.55,
      map: particleTexture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const particlesMesh = new THREE.Points(particlesGeometry, particlesMaterial);
    scene.add(particlesMesh);

    // 3. 3D Geometric Floating Rings (Website Depth & Tech Flair)
    const ringsGroup = new THREE.Group();

    // Ring 1 (Torus)
    const torusGeom1 = new THREE.TorusGeometry(6, 0.08, 16, 64);
    const torusMat1 = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      wireframe: true,
      transparent: true,
      opacity: 0.18,
    });
    const torus1 = new THREE.Mesh(torusGeom1, torusMat1);
    torus1.position.set(8, -1, -5);
    torus1.rotation.x = Math.PI / 3;
    ringsGroup.add(torus1);

    // Ring 2 (Icosahedron wireframe)
    const icoGeom = new THREE.IcosahedronGeometry(3.5, 1);
    const icoMat = new THREE.MeshBasicMaterial({
      color: 0xd97706,
      wireframe: true,
      transparent: true,
      opacity: 0.12,
    });
    const ico = new THREE.Mesh(icoGeom, icoMat);
    ico.position.set(-9, 2, -6);
    ringsGroup.add(ico);

    // Subtle 3D Perspective Plane Grid
    const gridHelper = new THREE.GridHelper(30, 20, 0xf59e0b, 0x332211);
    gridHelper.position.set(0, -7, -4);
    gridHelper.rotation.x = 0.2;
    (gridHelper.material as THREE.Material).transparent = true;
    (gridHelper.material as THREE.Material).opacity = 0.08;
    ringsGroup.add(gridHelper);

    scene.add(ringsGroup);

    // 4. Mouse interaction parallax
    let mouseX = 0;
    let mouseY = 0;
    let targetX = 0;
    let targetY = 0;

    const handleMouseMove = (event: MouseEvent) => {
      const windowHalfX = window.innerWidth / 2;
      const windowHalfY = window.innerHeight / 2;
      mouseX = (event.clientX - windowHalfX) * 0.0006;
      mouseY = (event.clientY - windowHalfY) * 0.0006;
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    // 5. Handle Resize
    const handleResize = () => {
      if (!container) return;
      const newWidth = container.clientWidth || window.innerWidth;
      const newHeight = container.clientHeight || 450;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };

    window.addEventListener('resize', handleResize);

    // 6. Animation loop
    let animationId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Smooth camera dampening following cursor
      targetX += (mouseX - targetX) * 0.05;
      targetY += (mouseY - targetY) * 0.05;

      camera.position.x = targetX * 10;
      camera.position.y = -targetY * 8;
      camera.lookAt(0, 0, 0);

      // Rotate 3D rings
      torus1.rotation.z = elapsedTime * 0.12;
      torus1.rotation.y = elapsedTime * 0.08;

      ico.rotation.x = elapsedTime * 0.15;
      ico.rotation.y = elapsedTime * 0.1;

      // Drift ember particles
      const positions = particlesGeometry.attributes.position.array as Float32Array;
      for (let i = 0; i < particleCount * 3; i += 3) {
        positions[i + 1] += speedArray[i + 1];
        positions[i] += Math.sin(elapsedTime + i) * 0.004;

        // Reset if drifted beyond top
        if (positions[i + 1] > 14) {
          positions[i + 1] = -12;
          positions[i] = (Math.random() - 0.5) * 35;
        }
      }
      particlesGeometry.attributes.position.needsUpdate = true;

      renderer.render(scene, camera);
    };

    animate();

    // Cleanup
    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);

      if (container && renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }

      particlesGeometry.dispose();
      particlesMaterial.dispose();
      particleTexture.dispose();
      torusGeom1.dispose();
      torusMat1.dispose();
      icoGeom.dispose();
      icoMat.dispose();
      gridHelper.geometry.dispose();
      (gridHelper.material as THREE.Material).dispose();
      renderer.dispose();
    };
  }, []);

  return <div ref={containerRef} className={className} aria-hidden="true" />;
};
