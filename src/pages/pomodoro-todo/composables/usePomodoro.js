/**
 * 番茄任务 — 番茄钟逻辑
 * 状态机管理、RAF 驱动倒计时、Web Audio 铃声合成、浏览器通知
 */
import { ref, computed, onUnmounted } from 'vue'

const PRESET_MINUTES = [15, 20, 25, 45]
const CUSTOM_PRESET = 'custom'
const MIN_MINUTES = 1
const MAX_MINUTES = 180
const ALARM_REPEAT_MS = 3000
const TITLE_BLINK_MS = 1000

export function usePomodoro() {
  const phase = ref('idle') // idle | running | paused | alarm
  const minutes = ref(25)
  const preset = ref('25')
  const ringtone = ref('warm')
  const display = ref('25:00')

  let endAt = 0
  let remainingMs = 0
  let rafId = 0
  let lastShownTotalSec = -1
  let alarmIntervalId = 0
  let titleBlinkIntervalId = 0
  let titleBlinkToggle = false
  let audioCtx = null
  const originalTitle = document.title

  const phaseLocked = computed(() => phase.value === 'running' || phase.value === 'paused')
  const canStart = computed(() => phase.value === 'idle')
  const canPause = computed(() => phase.value === 'running')
  const canResume = computed(() => phase.value === 'paused')
  const canReset = computed(() => phase.value === 'running' || phase.value === 'paused' || phase.value === 'alarm')
  const isAlarm = computed(() => phase.value === 'alarm')

  function clampMinutes(raw) {
    const n = Math.floor(Number(raw))
    if (!Number.isFinite(n)) return MIN_MINUTES
    return Math.min(MAX_MINUTES, Math.max(MIN_MINUTES, n))
  }

  function syncPresetFromMinutes() {
    const m = clampMinutes(minutes.value)
    preset.value = PRESET_MINUTES.includes(m) ? String(m) : CUSTOM_PRESET
  }

  function syncMinutesFromPreset() {
    if (preset.value === CUSTOM_PRESET) return
    minutes.value = clampMinutes(preset.value)
  }

  function setMinutes(val) {
    minutes.value = clampMinutes(val)
    syncPresetFromMinutes()
    if (!phaseLocked.value && !isAlarm.value) {
      updateDisplayFromMinutes()
    }
  }

  function setPreset(val) {
    preset.value = val
    syncMinutesFromPreset()
    if (!phaseLocked.value && !isAlarm.value) {
      updateDisplayFromMinutes()
    }
  }

  function setRingtone(val) {
    ringtone.value = val
  }

  function updateDisplayFromMinutes() {
    display.value = formatMmSs(clampMinutes(minutes.value) * 60 * 1000)
  }

  function formatMmSs(ms) {
    const totalSec = Math.max(0, Math.ceil(ms / 1000))
    const m = Math.floor(totalSec / 60)
    const s = totalSec % 60
    return `${m}:${String(s).padStart(2, '0')}`
  }

  /* ---- Audio ---- */
  function getAudioCtx() {
    if (!audioCtx) {
      const Ctx = window.AudioContext || window.webkitAudioContext
      if (!Ctx) return null
      audioCtx = new Ctx()
    }
    return audioCtx
  }

  function scheduleWarm(ctx, t0) {
    ;[523.25, 659.25, 783.99].forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      const start = t0 + i * 0.08
      gain.gain.setValueAtTime(0.0001, start)
      gain.gain.linearRampToValueAtTime(0.72, start + 0.06)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 1.6)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(start)
      osc.stop(start + 1.65)
    })
  }

  function scheduleBright(ctx, t0) {
    ;[523.25, 587.33, 659.25, 783.99].forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'triangle'
      osc.frequency.value = freq
      const start = t0 + i * 0.11
      gain.gain.setValueAtTime(0.0001, start)
      gain.gain.linearRampToValueAtTime(0.6, start + 0.04)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.38)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(start)
      osc.stop(start + 0.42)
    })
  }

  function scheduleSoft(ctx, t0) {
    ;[220, 261.63, 329.63].forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      const start = t0 + i * 0.12
      gain.gain.setValueAtTime(0.0001, start)
      gain.gain.linearRampToValueAtTime(0.54, start + 0.08)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 2.1)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(start)
      osc.stop(start + 2.2)
    })
  }

  function playRingtoneOnce() {
    const ctx = getAudioCtx()
    if (!ctx) return
    const schedule = () => {
      const id = ringtone.value
      if (id === 'bright') scheduleBright(ctx, ctx.currentTime)
      else if (id === 'soft') scheduleSoft(ctx, ctx.currentTime)
      else scheduleWarm(ctx, ctx.currentTime)
    }
    if (ctx.state === 'suspended') {
      ctx.resume().then(schedule).catch(() => {})
    } else {
      schedule()
    }
  }

  function stopAlarmLoop() {
    if (alarmIntervalId) {
      clearInterval(alarmIntervalId)
      alarmIntervalId = 0
    }
  }

  function startAlarmLoop() {
    stopAlarmLoop()
    playRingtoneOnce()
    alarmIntervalId = setInterval(playRingtoneOnce, ALARM_REPEAT_MS)
  }

  function previewRingtone() {
    if (isAlarm.value) return
    const ctx = getAudioCtx()
    if (!ctx) return
    if (ctx.state === 'suspended') ctx.resume().catch(() => {})
    playRingtoneOnce()
  }

  /* ---- Notifications ---- */
  function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }

  function sendNotification() {
    if (!('Notification' in window)) return
    if (Notification.permission !== 'granted') return
    try {
      new Notification('🍅 番茄钟', {
        body: '时间到啦，休息一下吧！',
        icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">🍅</text></svg>'
      })
    } catch { /* ignore */ }
  }

  /* ---- Title blink ---- */
  function startTitleBlink() {
    stopTitleBlink()
    titleBlinkToggle = false
    titleBlinkIntervalId = setInterval(() => {
      document.title = titleBlinkToggle ? originalTitle : '🍅 番茄钟时间到！'
      titleBlinkToggle = !titleBlinkToggle
    }, TITLE_BLINK_MS)
  }

  function stopTitleBlink() {
    if (titleBlinkIntervalId) {
      clearInterval(titleBlinkIntervalId)
      titleBlinkIntervalId = 0
    }
    document.title = originalTitle
  }

  /* ---- Core logic ---- */
  function tick() {
    if (phase.value !== 'running') return
    const now = Date.now()
    let ms = endAt - now
    if (ms <= 0) {
      display.value = '0:00'
      completeSession()
      return
    }
    const totalSec = Math.ceil(ms / 1000)
    if (totalSec !== lastShownTotalSec) {
      lastShownTotalSec = totalSec
      display.value = formatMmSs(ms)
    }
    rafId = requestAnimationFrame(tick)
  }

  function completeSession() {
    stopRaf()
    phase.value = 'alarm'
    endAt = 0
    remainingMs = 0
    lastShownTotalSec = -1
    display.value = '0:00'
    startAlarmLoop()
    sendNotification()
    startTitleBlink()
  }

  function start() {
    if (phase.value !== 'idle') return
    requestNotificationPermission()
    const ctx = getAudioCtx()
    if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {})
    const mins = clampMinutes(minutes.value)
    remainingMs = mins * 60 * 1000
    endAt = Date.now() + remainingMs
    phase.value = 'running'
    lastShownTotalSec = -1
    display.value = formatMmSs(remainingMs)
    rafId = requestAnimationFrame(tick)
  }

  function pause() {
    if (phase.value !== 'running') return
    stopRaf()
    remainingMs = Math.max(0, endAt - Date.now())
    phase.value = 'paused'
    lastShownTotalSec = -1
    display.value = formatMmSs(remainingMs)
  }

  function resume() {
    if (phase.value !== 'paused') return
    endAt = Date.now() + remainingMs
    phase.value = 'running'
    lastShownTotalSec = -1
    rafId = requestAnimationFrame(tick)
  }

  function reset() {
    stopRaf()
    stopAlarmLoop()
    stopTitleBlink()
    phase.value = 'idle'
    endAt = 0
    remainingMs = 0
    lastShownTotalSec = -1
    updateDisplayFromMinutes()
  }

  function stopRaf() {
    if (rafId) {
      cancelAnimationFrame(rafId)
      rafId = 0
    }
  }

  /* ---- Visibility change ---- */
  function onVisibilityChange() {
    if (document.hidden) return
    if (phase.value === 'running') {
      const ms = Math.max(0, endAt - Date.now())
      lastShownTotalSec = -1
      display.value = formatMmSs(ms)
    }
    if (phase.value === 'alarm') {
      stopTitleBlink()
      sendNotification()
    }
  }

  document.addEventListener('visibilitychange', onVisibilityChange)
  window.addEventListener('focus', () => {
    if (phase.value === 'running') {
      const ms = Math.max(0, endAt - Date.now())
      lastShownTotalSec = -1
      display.value = formatMmSs(ms)
    }
  })

  onUnmounted(() => {
    stopRaf()
    stopAlarmLoop()
    stopTitleBlink()
    document.removeEventListener('visibilitychange', onVisibilityChange)
  })

  // Init display
  updateDisplayFromMinutes()

  return {
    phase, minutes, preset, ringtone, display,
    phaseLocked, canStart, canPause, canResume, canReset, isAlarm,
    setMinutes, setPreset, setRingtone,
    start, pause, resume, reset, previewRingtone,
    PRESET_MINUTES, CUSTOM_PRESET
  }
}
