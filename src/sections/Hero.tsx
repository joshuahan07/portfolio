import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import RollingSkillTicker from "@/components/RollingSkillTicker";

class Particle {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  canvas: HTMLCanvasElement

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.x = Math.random() * canvas.width
    this.y = Math.random() * canvas.height
    this.vx = (Math.random() - 0.5) * 0.5
    this.vy = (Math.random() - 0.5) * 0.5
    this.radius = Math.random() * 2 + 1
  }

  update() {
    this.x += this.vx
    this.y += this.vy
    if (this.x < 0 || this.x > this.canvas.width) this.vx *= -1
    if (this.y < 0 || this.y > this.canvas.height) this.vy *= -1
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.beginPath()
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(139, 92, 246, 0.6)'
    ctx.fill()
  }
}

function useTypewriter(
  text: string,
  speed = 80,
  delay = 500,
  startWhen = true,
) {
  const [display, setDisplay] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    let intervalHandle: ReturnType<typeof setInterval> | undefined

    if (!startWhen) {
      setDisplay('')
      setDone(false)
      return () => {}
    }

    setDisplay('')
    setDone(false)
    let i = 0

    const timeoutHandle = setTimeout(() => {
      intervalHandle = setInterval(() => {
        if (i < text.length) {
          setDisplay(text.slice(0, i + 1))
          i++
        } else {
          if (intervalHandle) clearInterval(intervalHandle)
          intervalHandle = undefined
          setDone(true)
        }
      }, speed)
    }, delay)

    return () => {
      if (timeoutHandle) clearTimeout(timeoutHandle)
      if (intervalHandle) clearInterval(intervalHandle)
    }
  }, [text, speed, delay, startWhen])

  return { display, done };
}

export default function Hero() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const heroRef = useRef<HTMLElement>(null)
  const particlesRef = useRef<Particle[]>([])
  const rafRef = useRef<number>(0)
  const mouseRef = useRef({ x: 0, y: 0 })

  const name = useTypewriter("Joshua Han", 72, 200);
  const subtitle = useTypewriter("Developer · Founder · Student", 42, 200);

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
      const count = Math.floor((canvas.width * canvas.height) / 15000)
      particlesRef.current = Array.from({ length: Math.max(count, 40) }, () => new Particle(canvas))
    }

    resize()
    const resizeObserver = new ResizeObserver(() => resize())
    resizeObserver.observe(hero)

    const onMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY }
    }
    window.addEventListener('mousemove', onMouseMove)

    const animate = () => {
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
            ctx.strokeStyle = `rgba(139, 92, 246, ${alpha})`
            ctx.lineWidth = 1
            ctx.stroke()
          }
        }

        // Mouse connection
        const mdx = particles[i].x - mouseRef.current.x
        const mdy = particles[i].y - mouseRef.current.y
        const mdist = Math.sqrt(mdx * mdx + mdy * mdy)
        if (mdist < 200) {
          ctx.beginPath()
          ctx.moveTo(particles[i].x, particles[i].y)
          ctx.lineTo(mouseRef.current.x, mouseRef.current.y)
          const alpha = (1 - mdist / 200) * 0.4
          ctx.strokeStyle = `rgba(6, 182, 212, ${alpha})`
          ctx.lineWidth = 1.5
          ctx.stroke()
        }
      }

      rafRef.current = requestAnimationFrame(animate)
    }

    rafRef.current = requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(rafRef.current)
      resizeObserver.disconnect()
      window.removeEventListener('mousemove', onMouseMove)
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
        <h1 className="mb-4 text-6xl font-bold tracking-tighter sm:text-7xl md:mb-5 md:text-8xl lg:text-9xl">
          <span
            data-text="Joshua Han"
            {...(name.done ? { "data-cursor-hover": true } : {})}
            className={`hero-name-glitch text-white ${name.done ? "hero-glitch-ready" : "pointer-events-none"}`}
          >
            {name.display}
          </span>
          {!name.done ? (
            <span className="text-violet-400 animate-pulse-glow">|</span>
          ) : null}
        </h1>

        <p className="min-h-[2.75rem] text-xl sm:text-2xl md:text-3xl text-slate-400 font-light tracking-wide">
          <span>{subtitle.display}</span>
          {!subtitle.done ? (
            <span className="text-cyan-400 animate-pulse-glow">|</span>
          ) : null}
        </p>

        <div
          className={`mt-8 flex gap-4 justify-center transition-all duration-1000 md:mt-9 ${subtitle.done ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
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
          className={`hero-bottom mt-auto flex w-full shrink-0 flex-col items-center gap-2 transition-all duration-1000 ${subtitle.done ? "opacity-100 translate-y-0" : "pointer-events-none opacity-0 translate-y-4"}`}
        >
          <div className="animate-bounce pb-1">
            <ChevronDown className="h-6 w-6 text-slate-500" />
          </div>
          <div
            id="hero-skill-ticker"
            className="relative left-1/2 w-screen max-w-[100vw] -translate-x-1/2"
          >
            <RollingSkillTicker />
          </div>
        </div>
      </div>
    </section>
  )
}
