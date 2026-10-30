<template>
  <v-main>
    <div class="text-center py-16" data-testid="not-found-page">
      <v-icon icon="mdi-compass-off-outline" size="64" class="mb-4 text-medium-emphasis" />
      <h1 class="text-h4 mb-2">{{ $t('errors.404') }}</h1>
      <p class="text-medium-emphasis mb-6">{{ $t('errors.404Body') }}</p>
      <v-btn color="primary" :to="{ name: 'dashboard' }">{{ $t('errors.goHome') }}</v-btn>
    </div>
  </v-main>
</template>
