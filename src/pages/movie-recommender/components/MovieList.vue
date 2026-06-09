<template>
  <!-- 电影列表 - Apple/Stripe 风格 -->
  <div class="movie-list">
    <div class="movie-grid">
      <MovieCard
        v-for="movie in movies"
        :key="movie.id"
        :movie="movie"
        @select="$emit('select', $event)"
      />
    </div>
  </div>
</template>

<script setup>
import MovieCard from './MovieCard.vue'

defineProps({
  movies: { type: Array, required: true },
})

defineEmits(['select'])
</script>

<style scoped>
.movie-list {
  width: 100%;
}

.movie-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 16px;
}
</style>
