<template>
  <article class="card" :title="`${movie.primaryTitle} (${movie.startYear})`">
    <img
      :src="movie.poster_path"
      :alt="movie.primaryTitle"
      loading="lazy"
      @error="onError"
    />
    <div class="meta">
      <h3>{{ movie.primaryTitle }} <small>({{ movie.startYear }})</small></h3>
      <small v-if="movie.average_rating">Rating: <strong>{{ movie.average_rating }}</strong></small>
    </div>
  </article>
</template>

<script setup>
const props = defineProps({
  movie: { type: Object, required: true }
})
function onError(e) {
  // fallback mínimo si falta la imagen
  e.target.src = 'data:image/svg+xml;utf8,' + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="600">
      <rect width="100%" height="100%" fill="#111820"/>
      <text x="50%" y="50%" fill="#7c8aa5" font-family="Arial" font-size="20" text-anchor="middle">No image</text>
    </svg>`
  )
}
</script>
