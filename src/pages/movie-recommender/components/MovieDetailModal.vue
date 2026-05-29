<template>
  <div class="overlay" @click.self="$emit('close')">
    <div class="modal">
      <button class="close-btn" @click="$emit('close')">
        <i class="ti ti-x"></i>
      </button>

      <div class="modal-body">
        <div class="poster-col">
          <img v-if="movie.poster" :src="movie.poster" :alt="movie.title" class="poster-img" />
          <div v-else class="poster" :style="{ background: `linear-gradient(135deg, ${colors[0]}, ${colors[1]})` }">
            <span class="poster-char">{{ movie.title.charAt(0) }}</span>
          </div>
        </div>

        <div class="info-col">
          <h2 class="title">{{ movie.title }}</h2>
          <p class="original" v-if="movie.originalTitle">{{ movie.originalTitle }}</p>

          <div class="tags">
            <span class="tag">{{ movie.year }}</span>
            <span class="tag rate">{{ movie.rating }}</span>
            <span class="tag" v-for="g in movie.genres" :key="g">{{ g }}</span>
          </div>

          <p class="summary">{{ movie.summary }}</p>

          <div class="detail-row">
            <span class="dlbl">导演</span>
            <span>{{ movie.director || '暂无信息' }}</span>
          </div>
          <div class="detail-row" v-if="movie.cast">
            <span class="dlbl">主演</span>
            <span>{{ movie.cast }}</span>
          </div>

          <!-- 观看地址 -->
          <div class="watch-links" v-if="watchLinks.length">
            <span class="dlbl">观看</span>
            <div class="links-wrap">
              <a
                v-for="link in watchLinks"
                :key="link.label"
                :href="link.url"
                target="_blank"
                rel="noopener"
                class="watch-link"
              ><i :class="link.icon" aria-hidden="true"></i> {{ link.label }}</a>
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
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 20px;
}
.modal {
  background: #1c1c1e;
  border: 0.5px solid var(--border-primary);
  border-radius: var(--radius-lg);
  max-width: 560px;
  width: 100%;
  max-height: 80vh;
  overflow-y: auto;
  position: relative;
}
.close-btn {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  color: var(--text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1;
  transition: all 0.2s ease;
}
.close-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  color: var(--text-primary);
}
.modal-body {
  display: flex;
  gap: 20px;
  padding: 24px;
}
.poster-col {
  flex-shrink: 0;
  width: 160px;
}
.poster {
  aspect-ratio: 2 / 3;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
}
.poster-img {
  width: 100%;
  aspect-ratio: 2 / 3;
  border-radius: var(--radius-md);
  object-fit: cover;
  display: block;
}
.poster-char {
  font-size: 48px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.7);
  text-shadow: 0 2px 12px rgba(0, 0, 0, 0.3);
}
.info-col {
  flex: 1;
  min-width: 0;
}
.title {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
  line-height: 1.3;
}
.original {
  font-size: 13px;
  color: var(--text-tertiary);
  margin-top: 2px;
}
.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 12px;
}
.tag {
  font-size: 12px;
  padding: 3px 10px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.08);
  color: var(--text-secondary);
}
.tag.rate {
  background: rgba(0, 122, 255, 0.15);
  color: var(--accent);
  font-weight: 600;
}
.summary {
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.7;
  margin-top: 14px;
}
.detail-row {
  display: flex;
  gap: 8px;
  font-size: 13px;
  color: var(--text-primary);
  margin-top: 10px;
  line-height: 1.5;
}
.dlbl {
  color: var(--text-tertiary);
  flex-shrink: 0;
  width: 2.5em;
}
.watch-links {
  display: flex;
  gap: 8px;
  font-size: 13px;
  margin-top: 14px;
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
  padding: 4px 10px;
  font-size: 12px;
  border-radius: var(--radius-md);
  background: rgba(255, 255, 255, 0.06);
  color: var(--text-secondary);
  text-decoration: none;
  transition: all 0.2s ease;
  white-space: nowrap;
}
.watch-link:hover {
  background: rgba(0, 122, 255, 0.12);
  color: var(--accent);
}
</style>
