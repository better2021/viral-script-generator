<template>
  <div class="mlist">
    <div class="grid">
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
.mlist {
  width: 100%;
}
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 12px;
}
</style>
