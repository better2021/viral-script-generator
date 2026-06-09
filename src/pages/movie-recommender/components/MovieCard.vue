<template>
  <!-- 电影卡片 - Apple/Stripe 风格 -->
  <div class="movie-card" @click="$emit('select', movie.id)">
    <div class="card-poster">
      <img v-if="movie.poster" :src="movie.poster" :alt="movie.title" loading="lazy" class="poster-img" />
      <div v-else class="poster-fallback" :style="{ background: `linear-gradient(135deg, ${colors[0]}, ${colors[1]})` }">
        <span class="poster-char">{{ movie.title.charAt(0) }}</span>
      </div>
      <div class="card-rating">
        <i class="ti ti-star"></i>
        {{ movie.rating }}
      </div>
    </div>
    <div class="card-body">
      <h3 class="card-title" :title="movie.title">{{ movie.title }}</h3>
      <div class="card-meta">
        <span>{{ movie.year }}</span>
        <span class="meta-dot" v-if="movie.genres.length"></span>
        <span>{{ movie.genres.slice(0, 2).join(' / ') }}</span>
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
.movie-card {
  border-radius: 14px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--border-secondary);
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.movie-card:hover {
  background: rgba(255, 255, 255, 0.06);
  transform: translateY(-4px);
  border-color: rgba(99, 102, 241, 0.3);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.3), 0 0 40px rgba(99, 102, 241, 0.05);
}

.card-poster {
  position: relative;
  aspect-ratio: 2 / 3;
  overflow: hidden;
}
.poster-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}
.movie-card:hover .poster-img {
  transform: scale(1.05);
}
.poster-fallback {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.poster-char {
  font-size: 40px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.6);
  text-shadow: 0 2px 12px rgba(0, 0, 0, 0.3);
}

.card-rating {
  position: absolute;
  top: 8px;
  right: 8px;
  font-size: 11px;
  font-weight: 600;
  color: #fff;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(8px);
  padding: 3px 8px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  gap: 2px;
}
.card-rating i {
  font-size: 10px;
  color: #fbbf24;
}

.card-body {
  padding: 12px 14px 14px;
}

.card-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  letter-spacing: -0.2px;
}

.card-meta {
  font-size: 12px;
  color: var(--text-tertiary);
  margin-top: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.meta-dot {
  margin: 0 4px;
}
</style>
