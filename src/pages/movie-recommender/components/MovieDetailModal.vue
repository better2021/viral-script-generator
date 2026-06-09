<template>
  <!-- 电影详情弹窗 - Apple/Stripe 风格 -->
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-dialog">
      <button class="modal-close" @click="$emit('close')">
        <i class="ti ti-x"></i>
      </button>

      <div class="modal-body">
        <div class="modal-sidebar">
          <img v-if="movie.poster" :src="movie.poster" :alt="movie.title" class="modal-poster" />
          <div v-else class="modal-poster modal-poster--fallback" :style="{ background: `linear-gradient(135deg, ${colors[0]}, ${colors[1]})` }">
            <span class="poster-char">{{ movie.title.charAt(0) }}</span>
          </div>
        </div>

        <div class="modal-content">
          <h2 class="modal-title">{{ movie.title }}</h2>
          <p class="modal-original" v-if="movie.originalTitle">{{ movie.originalTitle }}</p>

          <div class="modal-tags">
            <span class="tag tag--year">{{ movie.year }}</span>
            <span class="tag tag--rating">{{ movie.rating }}</span>
            <span class="tag" v-for="g in movie.genres" :key="g">{{ g }}</span>
          </div>

          <p class="modal-summary">{{ movie.summary }}</p>

          <div class="modal-detail">
            <span class="detail-label">导演</span>
            <span>{{ movie.director || '暂无信息' }}</span>
          </div>
          <div class="modal-detail" v-if="movie.cast">
            <span class="detail-label">主演</span>
            <span>{{ movie.cast }}</span>
          </div>

          <div class="modal-links" v-if="watchLinks.length">
            <span class="detail-label">观看</span>
            <div class="links-wrap">
              <a
                v-for="link in watchLinks"
                :key="link.label"
                :href="link.url"
                target="_blank"
                rel="noopener"
                class="watch-link"
              ><i :class="link.icon"></i> {{ link.label }}</a>
            </div>
          </div>
        </div>
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

defineEmits(['close'])

const colors = computed(() => getPosterColors(props.movie.id))

/** 生成各平台的观看/搜索链接 */
const watchLinks = computed(() => {
  const title = encodeURIComponent(props.movie.title)
  const links = []
  if (props.movie.homepage) {
    links.push({ label: '官网', url: props.movie.homepage, icon: 'ti ti-external-link' })
  }
  if (props.movie.imdbId) {
    links.push({ label: 'IMDb', url: `https://www.imdb.com/title/${props.movie.imdbId}`, icon: 'ti ti-brand-imdb' })
  }
  links.push(
    { label: '豆瓣', url: `https://search.douban.com/movie/subject_search?search_text=${title}`, icon: 'ti ti-bookmark' },
    { label: 'B站', url: `https://search.bilibili.com/all?keyword=${title}%20%E7%94%B5%E5%BD%B1`, icon: 'ti ti-brand-bilibili' },
  )
  return links
})
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(24px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 20px;
  animation: overlayIn 0.3s ease;
}

@keyframes overlayIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.modal-dialog {
  background: #121214;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  max-width: 600px;
  width: 100%;
  max-height: 85vh;
  overflow-y: auto;
  position: relative;
  box-shadow: 0 25px 60px rgba(0, 0, 0, 0.5);
  animation: dialogIn 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes dialogIn {
  from { opacity: 0; transform: scale(0.95) translateY(10px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}

.modal-close {
  position: absolute;
  top: 14px;
  right: 14px;
  width: 34px;
  height: 34px;
  border: none;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.06);
  color: var(--text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1;
  font-size: 16px;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}
.modal-close:hover {
  background: rgba(255, 255, 255, 0.12);
  color: var(--text-primary);
  transform: scale(1.05);
}

.modal-body {
  display: flex;
  gap: 24px;
  padding: 28px;
}

.modal-sidebar {
  flex-shrink: 0;
  width: 170px;
}

.modal-poster {
  width: 100%;
  aspect-ratio: 2 / 3;
  border-radius: 14px;
  object-fit: cover;
  display: block;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
}
.modal-poster--fallback {
  display: flex;
  align-items: center;
  justify-content: center;
}
.poster-char {
  font-size: 52px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.6);
  text-shadow: 0 2px 12px rgba(0, 0, 0, 0.3);
}

.modal-content {
  flex: 1;
  min-width: 0;
}

.modal-title {
  font-size: 22px;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.3;
  letter-spacing: -0.3px;
}

.modal-original {
  font-size: 13px;
  color: var(--text-tertiary);
  margin-top: 3px;
}

.modal-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 14px;
}

.tag {
  font-size: 11px;
  padding: 4px 10px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.06);
  color: var(--text-secondary);
  font-weight: 500;
  letter-spacing: 0.02em;
}
.tag--year { background: rgba(255, 255, 255, 0.08); }
.tag--rating {
  background: rgba(99, 102, 241, 0.12);
  color: var(--accent);
  font-weight: 600;
}

.modal-summary {
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.8;
  margin-top: 16px;
}

.modal-detail {
  display: flex;
  gap: 8px;
  font-size: 13px;
  color: var(--text-primary);
  margin-top: 10px;
  line-height: 1.6;
}
.detail-label {
  color: var(--text-tertiary);
  flex-shrink: 0;
  width: 3em;
}

.modal-links {
  display: flex;
  gap: 8px;
  font-size: 13px;
  margin-top: 16px;
  line-height: 1.5;
  align-items: flex-start;
}
.links-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.watch-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 5px 12px;
  font-size: 12px;
  font-weight: 500;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-secondary);
  text-decoration: none;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}
.watch-link:hover {
  background: rgba(99, 102, 241, 0.1);
  color: var(--accent);
  border-color: rgba(99, 102, 241, 0.2);
}
</style>
