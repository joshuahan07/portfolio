import { useEffect, useRef, useState } from "react";
import SkillTuner from "@/components/SkillTuner";
import ElectricNameIntro from "@/components/ElectricNameIntro";
import SignalLock from "@/components/SignalLock";

type AvoidBox = { x: number; y: number; w: number; h: number }

function insideBox(x: number, y: number, box: AvoidBox) {
  return x > box.x && x < box.x + box.w && y > box.y && y < box.y + box.h
}

class Particle {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  canvas: HTMLCanvasElement
  avoid: AvoidBox | null

  constructor(canvas: HTMLCanvasElement, avoid: AvoidBox | null) {
    this.canvas = canvas
    this.avoid = avoid
    let x = Math.random() * canvas.width
    let y = Math.random() * canvas.height
    if (avoid) {
      for (let tries = 0; tries < 12 && insideBox(x, y, avoid); tries++) {
        x = Math.random() * canvas.width
        y = Math.random() * canvas.height
      }
    }
    this.x = x
    this.y = y
    this.vx = (Math.random() - 0.5) * 0.18
    this.vy = (Math.random() - 0.5) * 0.18
    this.radius = Math.random() * 2 + 1
  }

  update() {
    this.x += this.vx
    this.y += this.vy
    if (this.x < 0 || this.x > this.canvas.width) this.vx *= -1
    if (this.y < 0 || this.y > this.canvas.height) this.vy *= -1

    // Nudge back out if it drifts into the name's keep-out zone, so dots
    // stay around the name rather than drifting across it.
    if (this.avoid && insideBox(this.x, this.y, this.avoid)) {
      const cx = this.avoid.x + this.avoid.w / 2
      const cy = this.avoid.y + this.avoid.h / 2
      const dx = this.x - cx || 0.01
      const dy = this.y - cy || 0.01
      const len = Math.hypot(dx, dy) || 1
      this.vx += (dx / len) * 0.06
      this.vy += (dy / len) * 0.06
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.beginPath()
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(56, 189, 248, 0.6)'
    ctx.fill()
  }
}

type Point = { x: number; y: number }

type Bolt = {
  path: Point[]
  branch: Point[] | null
  life: number
  decay: number
  maxAlpha: number
}

/** Midpoint-displacement jagged path — the same technique real lightning-bolt
 *  renderers use so a bolt reads as electricity rather than a straight line. */
function jaggedPath(x1: number, y1: number, x2: number, y2: number, offset: number, generations: number): Point[] {
  let pts: Point[] = [{ x: x1, y: y1 }, { x: x2, y: y2 }]
  let amp = offset

  for (let g = 0; g < generations; g++) {
    const next: Point[] = [pts[0]]
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i]
      const b = pts[i + 1]
      const mx = (a.x + b.x) / 2
      const my = (a.y + b.y) / 2
      const dx = b.x - a.x
      const dy = b.y - a.y
      const len = Math.hypot(dx, dy) || 1
      const shove = (Math.random() - 0.5) * amp
      next.push({ x: mx - (dy / len) * shove, y: my + (dx / len) * shove })
      next.push(b)
    }
    pts = next
    amp *= 0.55
  }

  return pts
}

function buildBranch(path: Point[]): Point[] | null {
  if (path.length < 3) return null
  const idx = 1 + Math.floor(Math.random() * (path.length - 2))
  const from = path[idx]
  const to = path[Math.min(idx + 1, path.length - 1)]
  const angle = Math.atan2(to.y - from.y, to.x - from.x) + (Math.random() - 0.5) * 1.8
  const reach = 16 + Math.random() * 30
  return jaggedPath(from.x, from.y, from.x + Math.cos(angle) * reach, from.y + Math.sin(angle) * reach, reach * 0.55, 3)
}

function makeBolt(x1: number, y1: number, x2: number, y2: number, maxAlpha: number): Bolt {
  const span = Math.hypot(x2 - x1, y2 - y1)
  const offset = Math.min(48, 16 + span * 0.42)
  const path = jaggedPath(x1, y1, x2, y2, offset, 4)
  return {
    path,
    branch: Math.random() < 0.7 ? buildBranch(path) : null,
    life: 1,
    decay: 3.2 + Math.random() * 2.4, // life units per second — bolt holds ~150-300ms
    maxAlpha,
  }
}

function makeSpark(x: number, y: number): Bolt {
  const angle = Math.random() * Math.PI * 2
  const reach = 18 + Math.random() * 34
  const path = jaggedPath(x, y, x + Math.cos(angle) * reach, y + Math.sin(angle) * reach, reach * 0.5, 3)
  return {
    path,
    branch: Math.random() < 0.5 ? buildBranch(path) : null,
    life: 1,
    decay: 4.5 + Math.random() * 3,
    maxAlpha: 0.75 + Math.random() * 0.25,
  }
}

/** Three additive passes (wide haze, mid glow, hot core) traced once and
 *  stroked with `lighter` compositing so overlapping bolts actually glow
 *  brighter and bloom into each other, the way real electricity renders,
 *  instead of reading as thin semi-transparent lines. */
function strokePass(ctx: CanvasRenderingContext2D, pts: Point[], alpha: number, widthScale = 1) {
  ctx.beginPath()
  ctx.moveTo(pts[0].x, pts[0].y)
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y)

  ctx.strokeStyle = `rgba(56, 189, 248, ${Math.min(1, alpha * 0.55)})`
  ctx.lineWidth = 7.5 * widthScale
  ctx.stroke()

  ctx.strokeStyle = `rgba(129, 210, 255, ${Math.min(1, alpha * 0.95)})`
  ctx.lineWidth = 3 * widthScale
  ctx.stroke()

  ctx.strokeStyle = `rgba(240, 253, 255, ${Math.min(1, alpha * 1.3)})`
  ctx.lineWidth = 1.1 * widthScale
  ctx.stroke()
}

function drawBolt(ctx: CanvasRenderingContext2D, bolt: Bolt) {
  const flicker = bolt.life * bolt.maxAlpha * (0.75 + Math.random() * 0.35)
  strokePass(ctx, bolt.path, flicker)
  if (bolt.branch) strokePass(ctx, bolt.branch, flicker * 0.7, 0.65)
}

function drawMouseGlow(ctx: CanvasRenderingContext2D, x: number, y: number, power: number) {
  if (power <= 0.01) return
  const r = 90 * power
  const g = ctx.createRadialGradient(x, y, 0, x, y, r)
  g.addColorStop(0, `rgba(200, 235, 255, ${0.55 * power})`)
  g.addColorStop(0.35, `rgba(56, 189, 248, ${0.28 * power})`)
  g.addColorStop(1, "rgba(56, 189, 248, 0)")
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fill()
}

export default function Hero() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const heroRef = useRef<HTMLElement>(null)
  const particlesRef = useRef<Particle[]>([])
  const rafRef = useRef<number>(0)
  const mouseRef = useRef({ x: 0, y: 0, active: false })
  const boltsRef = useRef<Map<number, Bolt>>(new Map())
  const sparksRef = useRef<Bolt[]>([])
  const lastSparkRef = useRef(0)
  const lastMoveTimeRef = useRef(0)
  const glowRef = useRef({ power: 0 })
  const lastFrameRef = useRef(0)
  const nameHeadingRef = useRef<HTMLHeadingElement>(null)
  const [nameRevealed, setNameRevealed] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    const hero = heroRef.current
    if (!canvas || !hero) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      const rect = hero.getBoundingClientRect()
      const w = Math.max(1, Math.floor(rect.width))
      const h = Math.max(1, Math.floor(rect.height))
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w
        canvas.height = h
      }

      const h1 = nameHeadingRef.current
      let avoid: AvoidBox | null = null
      if (h1) {
        const hr = h1.getBoundingClientRect()
        const pad = 56
        avoid = {
          x: hr.left - rect.left - pad,
          y: hr.top - rect.top - pad,
          w: hr.width + pad * 2,
          h: hr.height + pad * 2,
        }
      }

      const count = Math.floor((canvas.width * canvas.height) / 9000)
      particlesRef.current = Array.from({ length: Math.max(count, 70) }, () => new Particle(canvas, avoid))
    }

    resize()
    const resizeObserver = new ResizeObserver(() => resize())
    resizeObserver.observe(hero)

    const onMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY, active: true }
      lastMoveTimeRef.current = performance.now()
    }
    const onMouseLeave = () => {
      mouseRef.current = { ...mouseRef.current, active: false }
    }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseleave', onMouseLeave)

    const animate = () => {
      const now = performance.now()
      const dt = Math.min(0.05, (now - lastFrameRef.current) / 1000 || 0.016)
      lastFrameRef.current = now

      ctx.clearRect(0, 0, canvas.width, canvas.height)
      const particles = particlesRef.current

      particles.forEach((p) => {
        p.update()
        p.draw(ctx)
      })

      // Draw connections
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x
          const dy = particles[i].y - particles[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 150) {
            ctx.beginPath()
            ctx.moveTo(particles[i].x, particles[i].y)
            ctx.lineTo(particles[j].x, particles[j].y)
            const alpha = (1 - dist / 150) * 0.25
            ctx.strokeStyle = `rgba(56, 189, 248, ${alpha})`
            ctx.lineWidth = 1
            ctx.stroke()
          }
        }
      }

      // Intro sequence — a lightning strike hits where the name will appear,
      // Mouse tether — persistent crackling lightning bolts instead of a
      // plain line. Each bolt holds its jagged shape for ~150-300ms and
      // fades out, rather than being re-randomized every single frame.
      const bolts = boltsRef.current
      const mouse = mouseRef.current
      const glow = glowRef.current

      // Only spawn new bolts/sparks while the cursor is actually moving —
      // existing ones still finish their natural fade, but nothing new
      // fires once the cursor sits still.
      const moving = mouse.active && now - lastMoveTimeRef.current < 100

      glow.power += ((moving ? 1 : 0) - glow.power) * Math.min(1, dt * 6)

      for (const [key, bolt] of bolts) {
        bolt.life -= bolt.decay * dt
        if (bolt.life <= 0) bolts.delete(key)
      }

      if (moving) {
        for (let i = 0; i < particles.length; i++) {
          if (bolts.has(i)) continue
          const mdx = particles[i].x - mouse.x
          const mdy = particles[i].y - mouse.y
          const mdist = Math.sqrt(mdx * mdx + mdy * mdy)
          if (mdist < 200) {
            const maxAlpha = Math.min(1, (1 - mdist / 200) * 1.3)
            bolts.set(i, makeBolt(particles[i].x, particles[i].y, mouse.x, mouse.y, maxAlpha))
          }
        }
      }

      // Idle crackle — small sparks fire off the cursor itself so it reads
      // as live electricity even when no dot is close enough to arc to.
      const sparks = sparksRef.current
      for (let i = sparks.length - 1; i >= 0; i--) {
        sparks[i].life -= sparks[i].decay * dt
        if (sparks[i].life <= 0) sparks.splice(i, 1)
      }
      if (moving && now - lastSparkRef.current > 90 && sparks.length < 5) {
        lastSparkRef.current = now
        sparks.push(makeSpark(mouse.x, mouse.y))
      }

      if (bolts.size > 0 || sparks.length > 0 || glow.power > 0.01) {
        ctx.globalCompositeOperation = 'lighter'
        drawMouseGlow(ctx, mouse.x, mouse.y, glow.power)
        for (const bolt of bolts.values()) {
          drawBolt(ctx, bolt)
        }
        for (const spark of sparks) {
          drawBolt(ctx, spark)
        }
        ctx.globalCompositeOperation = 'source-over'
      }

      rafRef.current = requestAnimationFrame(animate)
    }

    rafRef.current = requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(rafRef.current)
      resizeObserver.disconnect()
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseleave', onMouseLeave)
    }
  }, [])

  return (
    <section
      ref={heroRef}
      id="hero"
      className="hero-viewport relative flex h-[100dvh] max-h-[100dvh] min-h-[100dvh] w-full flex-col overflow-hidden"
    >
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 z-0 h-full w-full"
        style={{ background: 'radial-gradient(ellipse at center, #12121a 0%, #0a0a0f 100%)' }}
      />

      <ElectricNameIntro anchorRef={nameHeadingRef} onRevealed={() => setNameRevealed(true)} />

      {/* Subtle grid overlay */}
      <div
        className="pointer-events-none absolute inset-0 z-[1] h-full opacity-[0.03]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      <div className="relative z-10 flex min-h-0 flex-1 flex-col px-6 pb-0 pt-[clamp(5.5rem,11vh,7.5rem)] text-center">
        <div className="flex min-h-0 flex-1 flex-col justify-center">
        {/* The name is drawn by ElectricNameIntro on canvas; this keeps it in
            the DOM (invisible) so it's still real text for SEO/screen readers,
            and reserves the same layout space the visible heading used to. */}
        <h1
          ref={nameHeadingRef}
          className="mb-4 text-6xl font-bold tracking-tighter sm:text-7xl md:mb-5 md:text-8xl lg:text-9xl"
          style={{ color: "transparent" }}
        >
          Joshua Han
        </h1>

        <div className="min-h-[2.75rem]">
          {nameRevealed ? (
            <SignalLock
              text="Developer · Founder · Student"
              delayMs={100}
              className="text-xl sm:text-2xl md:text-3xl text-slate-400 tracking-wide"
              style={{ fontFamily: '"Arial Black", "Helvetica Neue", Impact, sans-serif', fontWeight: 900 }}
            />
          ) : null}
        </div>

        <div
          className={`mt-8 flex gap-4 justify-center transition-all duration-1000 delay-500 md:mt-9 ${nameRevealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
        >
          <a
            href="#projects"
            onClick={(e) => {
              e.preventDefault()
              document.querySelector('#projects')?.scrollIntoView({ behavior: 'smooth' })
            }}
            className="group relative px-8 py-4 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold transition-all overflow-hidden"
          >
            <span className="relative z-10">View My Work</span>
            <div className="absolute inset-0 bg-gradient-to-r from-violet-400 to-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity" />
          </a>
          <a
            href="#connect"
            onClick={(e) => {
              e.preventDefault()
              document.querySelector('#connect')?.scrollIntoView({ behavior: 'smooth' })
            }}
            className="px-8 py-4 rounded-xl glass text-white font-semibold hover:bg-white/10 transition-all"
          >
            Get In Touch
          </a>
        </div>
        </div>

        <div
          className={`hero-bottom mt-auto flex w-full shrink-0 flex-col items-center gap-2 transition-all duration-1000 delay-500 ${nameRevealed ? "opacity-100 translate-y-0" : "pointer-events-none opacity-0 translate-y-4"}`}
        >
          <div
            id="hero-skill-ticker"
            className="relative left-1/2 w-screen max-w-[100vw] -translate-x-1/2 border-t border-white/10 bg-[#08080f]/95 px-6 py-3"
          >
            <SkillTuner
              items={["Shipping", "Founding", "Building", "Hacking", "Designing", "Prototyping", "Iterating"]}
              height={90}
            />
          </div>
        </div>
      </div>
    </section>
  )
}
