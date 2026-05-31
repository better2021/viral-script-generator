/**
 * 番茄任务 — Canvas 视觉效果
 * 星云粒子、粒子连线轨迹、浮动番茄动画
 */
import { onMounted, onUnmounted } from 'vue'

/* ========================================
 * 1. 星云背景（星空粒子 + 鼠标排斥）
 * ======================================== */
export function useStarfield(canvasRef) {
  let ctx = null
  let width = 0
  let height = 0
  let dpr = 1
  let animationId = 0
  let particles = []
  let lastTime = performance.now()
  const mouse = { x: 0, y: 0, active: false }
  const config = {
    density: 11000,
    maxParticles: 130,
    mouseRadius: 150,
    repelStrength: 0.38,
    driftSpeed: 0.18,
    twinkleRatio: 0.58
  }

  function rand(min, max) { return min + Math.random() * (max - min) }

  function createParticle() {
    const angle = rand(0, Math.PI * 2)
    const speed = rand(0.12, 1) * config.driftSpeed
    return {
      x: Math.random() * width,
      y: Math.random() * height,
      radius: rand(0.55, 2.15),
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      alpha: rand(0.3, 0.9),
      phase: Math.random() * Math.PI * 2,
      twinkleSpeed: rand(0.0015, 0.0045),
      hueShift: rand(-12, 18),
      twinkles: Math.random() < config.twinkleRatio
    }
  }

  function resize() {
    width = window.innerWidth
    height = window.innerHeight
    dpr = Math.min(window.devicePixelRatio || 1, 2)
    if (canvasRef.value) {
      canvasRef.value.width = Math.floor(width * dpr)
      canvasRef.value.height = Math.floor(height * dpr)
      canvasRef.value.style.width = `${width}px`
      canvasRef.value.style.height = `${height}px`
      ctx = canvasRef.value.getContext('2d')
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    const minP = width < 640 ? 48 : 88
    const target = Math.min(config.maxParticles, Math.max(minP, Math.floor((width * height) / config.density)))
    if (particles.length > target) particles = particles.slice(0, target)
    while (particles.length < target) particles.push(createParticle())
  }

  function drawBackground() {
    const gradient = ctx.createRadialGradient(width * 0.5, height * 0.22, 0, width * 0.5, height * 0.5, Math.max(width, height))
    gradient.addColorStop(0, '#122642')
    gradient.addColorStop(0.45, '#07111f')
    gradient.addColorStop(1, '#030712')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, width, height)
  }

  function updateParticle(p, delta) {
    p.x += p.vx * delta
    p.y += p.vy * delta

    if (mouse.active) {
      const dx = p.x - mouse.x
      const dy = p.y - mouse.y
      const dist = Math.hypot(dx, dy)
      if (dist > 0 && dist < config.mouseRadius) {
        const force = (1 - dist / config.mouseRadius) * config.repelStrength * delta
        const dir = dist < config.mouseRadius * 0.42 ? 1 : -0.22
        p.x += (dx / dist) * force * dir
        p.y += (dy / dist) * force * dir
      }
    }

    if (p.x < -8) p.x = width + 8
    if (p.x > width + 8) p.x = -8
    if (p.y < -8) p.y = height + 8
    if (p.y > height + 8) p.y = -8
  }

  function drawParticle(p, time) {
    const twinkle = p.twinkles ? Math.sin(time * p.twinkleSpeed + p.phase) * 0.25 : 0
    const alpha = Math.max(0.18, Math.min(0.95, p.alpha + twinkle))
    const glow = p.radius * 4.5

    ctx.beginPath()
    ctx.fillStyle = `hsla(${210 + p.hueShift}, 92%, 84%, ${alpha * 0.9})`
    ctx.shadowColor = `hsla(${196 + p.hueShift}, 95%, 76%, ${alpha})`
    ctx.shadowBlur = glow
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
    ctx.fill()
    ctx.shadowBlur = 0
  }

  function animate(time) {
    const delta = Math.min((time - lastTime) / 16.67, 2)
    lastTime = time
    drawBackground()
    particles.forEach(p => { updateParticle(p, delta); drawParticle(p, time) })
    animationId = requestAnimationFrame(animate)
  }

  function start() {
    cancelAnimationFrame(animationId)
    lastTime = performance.now()
    animationId = requestAnimationFrame(animate)
  }

  function stop() { cancelAnimationFrame(animationId) }

  function onPointerMove(e) { mouse.x = e.clientX; mouse.y = e.clientY; mouse.active = true }
  function onPointerLeave() { mouse.active = false }
  function onBlur() { mouse.active = false }
  function onResize() { resize() }
  function onVisChange() { document.hidden ? stop() : start() }

  onMounted(() => {
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerleave', onPointerLeave)
    window.addEventListener('blur', onBlur)
    window.addEventListener('resize', onResize)
    document.addEventListener('visibilitychange', onVisChange)
    resize()
    start()
  })

  onUnmounted(() => {
    stop()
    cancelAnimationFrame(animationId)
    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('pointerleave', onPointerLeave)
    window.removeEventListener('blur', onBlur)
    window.removeEventListener('resize', onResize)
    document.removeEventListener('visibilitychange', onVisChange)
  })
}

/* ========================================
 * 2. 粒子连线轨迹
 * ======================================== */
export function useParticleTrail(canvasRef) {
  let ctx = null
  let width = 0
  let height = 0
  let dpr = 1
  let animationId = 0
  let particles = []
  let mouseX = 0
  let mouseY = 0
  let isMouseActive = false
  let mouseTimeout = 0

  const config = {
    particleCount: 45,
    maxDistance: 180,
    lineDistance: 120,
    attractionStrength: 0.03,
    repulsionStrength: 0.05,
    mouseRadius: 100,
    defaultSpeed: 0.3
  }

  function rand(min, max) { return min + Math.random() * (max - min) }

  function createParticle() {
    const angle = rand(0, Math.PI * 2)
    const speed = rand(0.2, 0.8) * config.defaultSpeed
    return {
      x: Math.random() * width,
      y: Math.random() * height,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: rand(1.5, 3.5),
      alpha: rand(0.4, 0.9),
      hue: rand(180, 240)
    }
  }

  function resize() {
    width = window.innerWidth
    height = window.innerHeight
    dpr = Math.min(window.devicePixelRatio || 1, 2)
    if (canvasRef.value) {
      canvasRef.value.width = Math.floor(width * dpr)
      canvasRef.value.height = Math.floor(height * dpr)
      canvasRef.value.style.width = `${width}px`
      canvasRef.value.style.height = `${height}px`
      ctx = canvasRef.value.getContext('2d')
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    while (particles.length < config.particleCount) particles.push(createParticle())
    while (particles.length > config.particleCount) particles.pop()
  }

  function updateParticle(p) {
    if (isMouseActive) {
      const dx = mouseX - p.x
      const dy = mouseY - p.y
      const dist = Math.hypot(dx, dy)
      if (dist < config.mouseRadius) {
        const force = (1 - dist / config.mouseRadius) * config.repulsionStrength
        p.vx -= (dx / dist) * force
        p.vy -= (dy / dist) * force
      } else if (dist < config.maxDistance) {
        const force = (1 - dist / config.maxDistance) * config.attractionStrength
        p.vx += (dx / dist) * force
        p.vy += (dy / dist) * force
      }
    }
    p.vx *= 0.98
    p.vy *= 0.98
    const speed = Math.hypot(p.vx, p.vy)
    if (speed < config.defaultSpeed * 0.3) {
      const angle = rand(0, Math.PI * 2)
      p.vx += Math.cos(angle) * config.defaultSpeed * 0.05
      p.vy += Math.sin(angle) * config.defaultSpeed * 0.05
    }
    p.x += p.vx
    p.y += p.vy
    if (p.x < -10) p.x = width + 10
    if (p.x > width + 10) p.x = -10
    if (p.y < -10) p.y = height + 10
    if (p.y > height + 10) p.y = -10
  }

  function drawParticle(p) {
    ctx.beginPath()
    ctx.fillStyle = `hsla(${p.hue}, 85%, 75%, ${p.alpha})`
    ctx.shadowColor = `hsla(${p.hue}, 90%, 70%, ${p.alpha})`
    ctx.shadowBlur = p.radius * 3
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
    ctx.fill()
    ctx.shadowBlur = 0
  }

  function drawLines() {
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x
        const dy = particles[i].y - particles[j].y
        const dist = Math.hypot(dx, dy)
        if (dist < config.lineDistance) {
          const opacity = (1 - dist / config.lineDistance) * 0.4
          ctx.beginPath()
          ctx.strokeStyle = `hsla(210, 70%, 70%, ${opacity})`
          ctx.lineWidth = 0.5
          ctx.moveTo(particles[i].x, particles[i].y)
          ctx.lineTo(particles[j].x, particles[j].y)
          ctx.stroke()
        }
      }
    }
  }

  function animate() {
    ctx.clearRect(0, 0, width, height)
    particles.forEach(p => updateParticle(p))
    drawLines()
    particles.forEach(p => drawParticle(p))
    animationId = requestAnimationFrame(animate)
  }

  function start() { cancelAnimationFrame(animationId); animationId = requestAnimationFrame(animate) }
  function stop() { cancelAnimationFrame(animationId) }

  function onMouseMove(e) {
    mouseX = e.clientX; mouseY = e.clientY; isMouseActive = true
    clearTimeout(mouseTimeout)
    mouseTimeout = setTimeout(() => { isMouseActive = false }, 1000)
  }
  function onMouseLeave() { isMouseActive = false }
  function onResize() { resize() }

  onMounted(() => {
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseleave', onMouseLeave)
    window.addEventListener('resize', onResize)
    resize()
    start()
  })

  onUnmounted(() => {
    stop()
    cancelAnimationFrame(animationId)
    document.removeEventListener('mousemove', onMouseMove)
    document.removeEventListener('mouseleave', onMouseLeave)
    window.removeEventListener('resize', onResize)
  })
}

/* ========================================
 * 3. 浮动番茄 emoji
 * ======================================== */
export function useFloatingTomatoes(containerRef) {
  const numTomatoes = 8
  let tomatoes = []

  function createTomatoes() {
    if (!containerRef.value) return
    containerRef.value.innerHTML = ''
    tomatoes = []

    for (let i = 0; i < numTomatoes; i++) {
      const el = document.createElement('div')
      el.textContent = '🍅'
      el.style.cssText = `
        position: absolute;
        pointer-events: none;
        font-size: ${Math.random() * 20 + 16}px;
        left: ${Math.random() * 100}%;
        top: ${Math.random() * 100}%;
        opacity: ${Math.random() * 0.3 + 0.1};
        animation: floatTomato ${Math.random() * 10 + 15}s ease-in-out infinite;
        animation-delay: ${Math.random() * 5}s;
        filter: blur(${Math.random() * 0.5}px);
        transition: opacity 0.3s, transform 0.3s;
      `
      el.addEventListener('mouseenter', () => {
        el.style.opacity = '0.8'
        el.style.transform = 'scale(1.5)'
      })
      el.addEventListener('mouseleave', () => {
        el.style.opacity = ''
        el.style.transform = ''
      })
      containerRef.value.appendChild(el)
      tomatoes.push(el)
    }
  }

  onMounted(() => {
    // Add keyframes if not already added
    if (!document.getElementById('pomodoro-float-keyframes')) {
      const style = document.createElement('style')
      style.id = 'pomodoro-float-keyframes'
      style.textContent = `
        @keyframes floatTomato {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          25% { transform: translateY(-20px) rotate(10deg); }
          50% { transform: translateY(-10px) rotate(-5deg); }
          75% { transform: translateY(-25px) rotate(5deg); }
        }
      `
      document.head.appendChild(style)
    }
    createTomatoes()
  })

  onUnmounted(() => {
    if (containerRef.value) containerRef.value.innerHTML = ''
    tomatoes = []
  })
}
