<template>
  <section class="pomodoro-section">
    <h2 class="pomodoro-heading">
      <span class="bounce">🍅</span> 番茄钟 <span class="bounce" style="animation-delay: 0.2s">🍅</span>
    </h2>

    <div class="controls-row">
      <label class="control-group">
        <span class="control-label">预设</span>
        <select
          class="control-select"
          :value="preset"
          @change="onPresetChange"
          :disabled="phaseLocked || isAlarm"
        >
          <option v-for="p in PRESET_MINUTES" :key="p" :value="String(p)">{{ p }} 分钟</option>
          <option :value="CUSTOM_PRESET">自定义</option>
        </select>
      </label>
      <label class="control-group">
        <span class="control-label">分钟</span>
        <input
          type="number"
          class="control-input"
          :value="minutes"
          @input="onMinutesInput"
          @change="onMinutesChange"
          min="1"
          max="180"
          step="1"
          :disabled="phaseLocked || isAlarm"
        />
      </label>
      <label class="control-group">
        <span class="control-label">提醒音乐</span>
        <div class="ringtone-row">
          <select
            class="control-select ringtone-select"
            :value="ringtone"
            @change="onRingtoneChange"
            :disabled="isAlarm"
          >
            <option value="warm">温暖和弦</option>
            <option value="bright">轻快琶音</option>
            <option value="soft">舒缓低音</option>
          </select>
          <button
            type="button"
            class="preview-btn"
            :disabled="isAlarm"
            @click="previewRingtone"
            aria-label="试听当前提醒音乐"
            title="试听一次"
          >
            <svg viewBox="0 0 24 24" class="icon-svg" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M11 5 6 9H2v6h4l5 4V5z"></path>
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
            </svg>
          </button>
        </div>
      </label>
    </div>

    <p class="timer-display" :class="{ 'timer-alarm': isAlarm }" aria-live="polite" aria-atomic="true">
      {{ display }}
    </p>

    <div class="action-row">
      <button
        type="button"
        class="btn btn-primary"
        :disabled="!canStart"
        @click="start"
      >
        🍅 开始
      </button>
      <button
        type="button"
        class="btn btn-secondary"
        :disabled="!canPause"
        @click="pause"
      >
        ⏸️ 暂停
      </button>
      <button
        type="button"
        class="btn btn-secondary"
        :disabled="!canResume"
        @click="resume"
      >
        ▶️ 继续
      </button>
      <button
        type="button"
        class="btn btn-ghost"
        :disabled="!canReset"
        @click="reset"
      >
        🔄 重置
      </button>
    </div>
  </section>
</template>

<script setup>
import { usePomodoro } from '../composables/usePomodoro.js'

const {
  phase, minutes, preset, ringtone, display,
  phaseLocked, isAlarm, canStart, canPause, canResume, canReset,
  setMinutes, setPreset, setRingtone,
  start, pause, resume, reset, previewRingtone,
  PRESET_MINUTES, CUSTOM_PRESET
} = usePomodoro()

function onPresetChange(e) {
  setPreset(e.target.value)
}

function onMinutesInput(e) {
  const val = e.target.value
  if (val === '') return
  const n = Math.floor(Number(val))
  if (Number.isFinite(n)) {
    setMinutes(n)
  }
}

function onMinutesChange(e) {
  const n = Math.floor(Number(e.target.value))
  if (Number.isFinite(n) && n >= 1 && n <= 180) {
    setMinutes(n)
  } else {
    setMinutes(25)
  }
}

function onRingtoneChange(e) {
  setRingtone(e.target.value)
}
</script>

<style scoped>
.pomodoro-section {
  border-radius: 1rem;
  border: 1px solid rgba(255, 255, 255, 0.7);
  background: rgba(253, 247, 239, 0.9);
  padding: 1.25rem;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.8);
  transition: all 0.3s;
  cursor: default;
}
.pomodoro-section:hover {
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  transform: scale(1.01);
}

.pomodoro-heading {
  margin-bottom: 0.75rem;
  text-align: center;
  font-size: 0.875rem;
  font-weight: 500;
  color: #78716c;
}

.bounce {
  display: inline-block;
  animation: bounce 1.2s ease infinite;
}
@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-6px); }
}

.controls-row {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
  font-size: 0.875rem;
}

.control-group {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  color: #78716c;
}

.control-label {
  font-size: 0.75rem;
  color: #a8a29e;
}

.control-select,
.control-input {
  min-width: 7.5rem;
  border-radius: 0.75rem;
  border: 1px solid #e7e5e4;
  background: rgba(255, 255, 255, 0.9);
  padding: 0.5rem 0.75rem;
  color: #47413c;
  outline: none;
  font-size: 0.875rem;
  font-family: inherit;
}
.control-select:focus,
.control-input:focus {
  box-shadow: 0 0 0 2px rgba(71, 65, 60, 0.15);
}
.control-select:disabled,
.control-input:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.control-input {
  width: 5.5rem;
  min-width: unset;
}

.ringtone-row {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.ringtone-select {
  min-width: 6.5rem;
  flex: 1;
}

.preview-btn {
  display: grid;
  height: 2.625rem;
  width: 2.5rem;
  place-items: center;
  border-radius: 0.75rem;
  border: 1px solid #e7e5e4;
  background: rgba(255, 255, 255, 0.9);
  color: #47413c;
  cursor: pointer;
  transition: background 0.2s;
  flex-shrink: 0;
}
.preview-btn:hover {
  background: #fff;
}
.preview-btn:disabled {
  pointer-events: none;
  opacity: 0.4;
}

.icon-svg {
  height: 1.25rem;
  width: 1.25rem;
}

.timer-display {
  margin-bottom: 0.25rem;
  text-align: center;
  font-family: 'SF Mono', 'SFMono-Regular', 'Menlo', 'Consolas', monospace;
  font-size: 2.25rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.025em;
  color: #47413c;
  transition: color 0.3s;
}
.timer-display.timer-alarm {
  color: #e11d48;
  animation: pulse 1s ease-in-out infinite;
}
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

@media (min-width: 640px) {
  .timer-display {
    font-size: 3rem;
  }
}

.action-row {
  margin-top: 0.75rem;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.btn {
  border-radius: 0.75rem;
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
  border: none;
}
.btn:hover:not(:disabled) {
  transform: translateY(-0.125rem);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}
.btn:active:not(:disabled) {
  transform: scale(0.95);
}
.btn:disabled {
  pointer-events: none;
  opacity: 0.4;
}

.btn-primary {
  background: #47413c;
  color: #fff;
}
.btn-primary:hover:not(:disabled) {
  background: #57534e;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  box-shadow: 0 0 0 2px rgba(242, 201, 194, 0.5);
}

.btn-secondary {
  border: 1px solid #e7e5e4;
  background: rgba(255, 255, 255, 0.9);
  color: #47413c;
}

.btn-ghost {
  border: 1px solid #e7e5e4;
  background: rgba(255, 250, 243, 0.9);
  color: #47413c;
}
</style>
