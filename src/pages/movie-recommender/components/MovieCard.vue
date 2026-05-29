<template>
  <div class="mcard" @click="$emit('select', movie.id)">
    <div class="poster">
      <img v-if="movie.poster" :src="movie.poster" :alt="movie.title" loading="lazy" class="poster-img" />
      <div v-else class="poster-fallback" :style="{ background: `linear-gradient(135deg, ${colors[0]}, ${colors[1]})` }">
        <span class="poster-char">{{ movie.title.charAt(0) }}</span>
      </div>
      <span class="rating">{{ movie.rating }}</span>
    </div>
    <div class="info">
      <div class="title" :title="movie.title">{{ movie.title }}</div>
      <div class="meta">
        <span>{{ movie.year }}</span>
        <span class="dot" v-if="movie.genres.length">·</span>
        <span>{{ movie.genres.slice(0, 2).join('/') }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { getPosterColors } from '../services/movieApi.js'

const props = defineProps({
  movie: { type: Object, required: true },
})

defineEmits(['select'])

const colors = computed(() => getPosterColors(props.movie.id))
</script>

<style scoped>
.mcard {
  border-radius: var(--radius-md);
  overflow: hidden;
  background: rgba(255, 255, 255, 0.05);
  border: 0.5px solid var(--border-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
}
.mcard:hover {
  background: rgba(255, 255, 255, 0.08);
  transform: translateY(-2px);
  border-color: var(--accent);
}
.poster {
  position: relative;
  aspect-ratio: 2 / 3;
  overflow: hidden;
}
.poster-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.poster-fallback {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.poster-char {
  font-size: 36px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.7);
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}
.rating {
  position: absolute;
  top: 8px;
  right: 8px;
  font-size: 11px;
  font-weight: 600;
  color: #fff;
  background: rgba(0, 0, 0, 0.5);
  padding: 2px 6px;
  border-radius: 4px;
}
.info {
  padding: 10px 12px 12px;
}
.title {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.meta {
  font-size: 12px;
  color: var(--text-tertiary);
  margin-top: 4px;
}
.dot {
  margin: 0 4px;
}
</style>
