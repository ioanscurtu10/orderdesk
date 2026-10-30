<template>
  <div class="text-center py-16" data-testid="forbidden-page">
    <v-icon icon="mdi-shield-lock-outline" size="64" color="warning" class="mb-4" />
    <h1 class="text-h4 mb-2">{{ $t('errors.403') }}</h1>
    <p class="text-medium-emphasis mb-6">{{ $t('errors.403Body') }}</p>
    <v-btn color="primary" :to="{ name: 'dashboard' }">{{ $t('errors.goHome') }}</v-btn>
  </div>
</template>
