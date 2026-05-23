/* eslint-disable react/no-unknown-property */
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

export type AntigravityProps = {
  count?: number;
  magnetRadius?: number;
  ringRadius?: number;
  waveSpeed?: number;
  waveAmplitude?: number;
  particleSize?: number;
  lerpSpeed?: number;
  /** How quickly the magnetic target follows the pointer (0–1). */
  mouseLerpSpeed?: number;
  color?: string;
  autoAnimate?: boolean;
  particleVariance?: number;
  rotationSpeed?: number;
  depthFactor?: number;
  pulseSpeed?: number;
  particleShape?: "capsule" | "sphere" | "box" | "tetrahedron";
  fieldStrength?: number;
  /** Opacity when pointer is idle (0–1). */
  minOpacity?: number;
  /** Opacity at full pointer activity (0–1). */
  maxOpacity?: number;
  /** Hold full visibility this long after the last move (ms). */
  idleHoldMs?: number;
  /** 0–1 lerp per frame while pointer is moving. */
  fadeInLerp?: number;
  /** 0–1 lerp per frame while fading out after idle. */
  fadeOutLerp?: number;
  /** Particle color at low activity. */
  colorIdle?: string;
  /** Particle color at full activity. */
  colorActive?: string;
  /** How many depth/radial bands stagger in/out (higher = more steps). */
  layerBands?: number;
};

type Particle = {
  t: number;
  factor: number;
  speed: number;
  xFactor: number;
  yFactor: number;
  zFactor: number;
  mx: number;
  my: number;
  mz: number;
  cx: number;
  cy: number;
  cz: number;
  vx: number;
  vy: number;
  vz: number;
  randomRadiusOffset: number;
  /** 0 = back / inner, 1 = front / outer — controls stagger order. */
  layerNorm: number;
  visibility: number;
};

function layerTargetVisibility(
  activity: number,
  layerNorm: number,
  fadingIn: boolean,
  spread: number,
): number {
  if (fadingIn) {
    const start = layerNorm * (1 - spread);
    if (activity <= start) return 0;
    if (activity >= start + spread) return 1;
    return (activity - start) / spread;
  }

  const end = 1 - layerNorm * (1 - spread);
  if (activity >= end) return 1;
  if (activity <= end - spread) return 0;
  return (activity - (end - spread)) / spread;
}

function createParticles(count: number, width: number, height: number): Particle[] {
  const temp: Particle[] = [];
  const maxR = Math.hypot(width / 2, height / 2) || 1;

  for (let i = 0; i < count; i++) {
    const x = (Math.random() - 0.5) * width;
    const y = (Math.random() - 0.5) * height;
    const z = (Math.random() - 0.5) * 20;
    const radial = Math.hypot(x, y) / maxR;
    const depth = (z + 10) / 20;
    const layerNorm = Math.min(1, Math.max(0, depth * 0.5 + radial * 0.5));

    temp.push({
      t: Math.random() * 100,
      factor: 20 + Math.random() * 100,
      speed: 0.01 + Math.random() / 200,
      xFactor: -50 + Math.random() * 100,
      yFactor: -50 + Math.random() * 100,
      zFactor: -50 + Math.random() * 100,
      mx: x,
      my: y,
      mz: z,
      cx: x,
      cy: y,
      cz: z,
      vx: 0,
      vy: 0,
      vz: 0,
      randomRadiusOffset: (Math.random() - 0.5) * 2,
      layerNorm,
      visibility: 0,
    });
  }

  return temp;
}

function AntigravityInner({
  count = 300,
  magnetRadius = 10,
  ringRadius = 10,
  waveSpeed = 0.4,
  waveAmplitude = 1,
  particleSize = 2,
  lerpSpeed = 0.1,
  mouseLerpSpeed = 0.12,
  color = "#FF9FFC",
  autoAnimate = false,
  particleVariance = 1,
  rotationSpeed = 0,
  depthFactor = 1,
  pulseSpeed = 3,
  particleShape = "capsule",
  fieldStrength = 10,
  minOpacity = 0,
  maxOpacity = 0.92,
  idleHoldMs = 520,
  fadeInLerp = 0.14,
  fadeOutLerp = 0.038,
  colorIdle,
  colorActive,
  layerBands = 10,
}: AntigravityProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);
  const { viewport, gl } = useThree();
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const idleColor = useMemo(
    () => new THREE.Color(colorIdle ?? color),
    [color, colorIdle],
  );
  const activeColor = useMemo(
    () => new THREE.Color(colorActive ?? "#4f8cff"),
    [colorActive],
  );
  const particleColor = useMemo(() => new THREE.Color(), []);
  const layerSpread = useMemo(() => Math.min(0.42, 0.22 + 0.8 / layerBands), [layerBands]);

  const particlesRef = useRef<Particle[]>([]);
  const viewportSizeRef = useRef({ width: 0, height: 0 });

  /** NDC pointer from window events — canvas is pointer-events-none behind content. */
  const pointerNdc = useRef({ x: 0, y: 0 });
  const lastMousePos = useRef({ x: 0, y: 0 });
  const lastMouseMoveTime = useRef(0);
  const virtualMouse = useRef({ x: 0, y: 0 });
  const mouseInitialized = useRef(false);
  const activityRef = useRef(0);
  const reduceMotionRef = useRef(false);

  useEffect(() => {
    const mesh = meshRef.current;
    if (mesh?.instanceColor) {
      mesh.instanceColor = null;
    }
  }, []);

  useEffect(() => {
    const updatePointer = (clientX: number, clientY: number) => {
      const rect = gl.domElement.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;

      pointerNdc.current = {
        x: ((clientX - rect.left) / rect.width) * 2 - 1,
        y: -((clientY - rect.top) / rect.height) * 2 + 1,
      };
    };

    const markPointerActive = () => {
      lastMouseMoveTime.current = Date.now();
    };

    const onMouseMove = (e: MouseEvent) => {
      updatePointer(e.clientX, e.clientY);
      markPointerActive();
    };

    const onTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (touch) {
        updatePointer(touch.clientX, touch.clientY);
        markPointerActive();
      }
    };

    const onTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (touch) {
        updatePointer(touch.clientX, touch.clientY);
        markPointerActive();
      }
    };

    reduceMotionRef.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    window.addEventListener("mousemove", onMouseMove, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchstart", onTouchStart, { passive: true });

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchstart", onTouchStart);
    };
  }, [gl]);

  useEffect(() => {
    const width = viewport.width || 100;
    const height = viewport.height || 100;
    const prev = viewportSizeRef.current;

    const sizeChanged =
      Math.abs(prev.width - width) > 0.5 || Math.abs(prev.height - height) > 0.5;

    if (!sizeChanged && particlesRef.current.length === count) return;

    const scaleX = prev.width > 0 ? width / prev.width : 1;
    const scaleY = prev.height > 0 ? height / prev.height : 1;

    if (particlesRef.current.length === count && prev.width > 0) {
      particlesRef.current.forEach((p) => {
        p.mx *= scaleX;
        p.my *= scaleY;
        p.cx *= scaleX;
        p.cy *= scaleY;
      });
    } else {
      particlesRef.current = createParticles(count, width, height);
      virtualMouse.current = { x: 0, y: 0 };
      mouseInitialized.current = false;
    }

    viewportSizeRef.current = { width, height };
  }, [count, viewport.width, viewport.height]);

  useFrame((state) => {
    const mesh = meshRef.current;
    const particles = particlesRef.current;
    if (!mesh || particles.length === 0) return;

    const { viewport: v } = state;
    const m = pointerNdc.current;

    const mouseDist = Math.sqrt(
      (m.x - lastMousePos.current.x) ** 2 + (m.y - lastMousePos.current.y) ** 2,
    );

    const mouseMoved = mouseDist > 0.002;

    if (mouseMoved) {
      lastMouseMoveTime.current = Date.now();
      lastMousePos.current = { x: m.x, y: m.y };
    }

    const recentlyActive = Date.now() - lastMouseMoveTime.current < idleHoldMs;
    const targetActivity = reduceMotionRef.current
      ? 0.35
      : mouseMoved || recentlyActive
        ? 1
        : 0;
    const fadingIn = targetActivity > activityRef.current + 0.0005;
    const fadeLerp = fadingIn ? fadeInLerp : fadeOutLerp;
    activityRef.current += (targetActivity - activityRef.current) * fadeLerp;

    const activity = activityRef.current;

    let destX = (m.x * v.width) / 2;
    let destY = (m.y * v.height) / 2;

    if (autoAnimate && !mouseMoved && Date.now() - lastMouseMoveTime.current > 2000) {
      const time = state.clock.getElapsedTime();
      destX = Math.sin(time * 0.5) * (v.width / 4);
      destY = Math.cos(time * 0.5 * 2) * (v.height / 4);
    }

    if (!mouseInitialized.current) {
      virtualMouse.current = { x: destX, y: destY };
      mouseInitialized.current = true;
    }

    if (mouseMoved || autoAnimate || activity > 0.05) {
      const follow = mouseLerpSpeed * (autoAnimate ? 1 : Math.max(activity, 0.25));
      virtualMouse.current.x += (destX - virtualMouse.current.x) * follow;
      virtualMouse.current.y += (destY - virtualMouse.current.y) * follow;
    }

    const targetX = virtualMouse.current.x;
    const targetY = virtualMouse.current.y;

    const globalRotation = state.clock.getElapsedTime() * rotationSpeed;
    const shouldAnimate = activity > 0.05 || autoAnimate;
    let visibilitySum = 0;

    particles.forEach((particle, i) => {
      let { t, speed, mx, my, mz, cz, randomRadiusOffset, layerNorm } = particle;

      const layerTarget = reduceMotionRef.current
        ? activity * 0.35
        : layerTargetVisibility(activity, layerNorm, fadingIn, layerSpread);

      const particleFadeLerp = fadingIn
        ? fadeInLerp * (1.05 - layerNorm * 0.35)
        : fadeOutLerp * (0.85 + layerNorm * 0.45);

      particle.visibility +=
        (layerTarget - particle.visibility) * particleFadeLerp;

      const vis = particle.visibility;
      visibilitySum += vis;
      const motionStrength = autoAnimate ? 1 : vis * activity;

      if (shouldAnimate && vis > 0.02) {
        t = particle.t += speed / 2;
      }

      const projectionFactor = 1 - cz / 50;
      const projectedTargetX = targetX * projectionFactor;
      const projectedTargetY = targetY * projectionFactor;

      // Use home position (mx, my) for magnet test — keeps the field spread across the viewport.
      const dx = mx - projectedTargetX;
      const dy = my - projectedTargetY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      let targetPos = { x: mx, y: my, z: mz * depthFactor };

      if (shouldAnimate && dist < magnetRadius) {
        const angle = Math.atan2(dy, dx) + globalRotation;

        const wave = Math.sin(t * waveSpeed + angle) * (0.5 * waveAmplitude);
        const deviation = randomRadiusOffset * (5 / (fieldStrength + 0.1));

        const currentRingRadius = ringRadius + wave + deviation;

        targetPos.x = projectedTargetX + currentRingRadius * Math.cos(angle);
        targetPos.y = projectedTargetY + currentRingRadius * Math.sin(angle);
        targetPos.z = mz * depthFactor + Math.sin(t) * (1 * waveAmplitude * depthFactor);
      }

      if (shouldAnimate && vis > 0.02) {
        const step = lerpSpeed * motionStrength;
        particle.cx += (targetPos.x - particle.cx) * step;
        particle.cy += (targetPos.y - particle.cy) * step;
        particle.cz += (targetPos.z - particle.cz) * step;
      }

      dummy.position.set(particle.cx, particle.cy, particle.cz);

      dummy.lookAt(projectedTargetX, projectedTargetY, particle.cz);
      dummy.rotateX(Math.PI / 2);

      const currentDistToMouse = Math.sqrt(
        (particle.cx - projectedTargetX) ** 2 + (particle.cy - projectedTargetY) ** 2,
      );

      const distFromRing = Math.abs(currentDistToMouse - ringRadius);
      let scaleFactor = 1 - distFromRing / 10;

      scaleFactor = Math.max(0, Math.min(1, scaleFactor));

      const visEase = vis * vis * (3 - 2 * vis);

      const finalScale =
        scaleFactor *
        (0.8 + Math.sin(t * pulseSpeed) * 0.2 * particleVariance) *
        particleSize *
        motionStrength *
        visEase;

      dummy.scale.set(finalScale, finalScale, finalScale);

      dummy.updateMatrix();

      mesh.setMatrixAt(i, dummy.matrix);
    });

    const material = materialRef.current;
    if (material) {
      const avgVis = visibilitySum / particles.length;
      const colorMix = Math.min(1, avgVis * (0.35 + activity * 0.65));
      material.opacity = minOpacity + avgVis * activity * (maxOpacity - minOpacity);
      particleColor.copy(idleColor).lerp(activeColor, colorMix);
      material.color.copy(particleColor);
    }

    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      {particleShape === "capsule" && <capsuleGeometry args={[0.1, 0.4, 4, 8]} />}
      {particleShape === "sphere" && <sphereGeometry args={[0.2, 16, 16]} />}
      {particleShape === "box" && <boxGeometry args={[0.3, 0.3, 0.3]} />}
      {particleShape === "tetrahedron" && <tetrahedronGeometry args={[0.3]} />}
      <meshBasicMaterial ref={materialRef} color={colorActive ?? color} transparent opacity={0} />
    </instancedMesh>
  );
}

export default function Antigravity(props: AntigravityProps) {
  return (
    <Canvas
      camera={{ position: [0, 0, 50], fov: 35 }}
      dpr={[1, 1.75]}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      style={{ background: "transparent", width: "100%", height: "100%" }}
    >
      <AntigravityInner {...props} />
    </Canvas>
  );
}
