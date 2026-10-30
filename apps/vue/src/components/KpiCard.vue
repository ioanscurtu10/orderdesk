<script setup lang="ts">
defineProps<{ title: string; value: string; icon: string; loading?: boolean }>()
</script>

<template>
  <v-card class="pa-4 h-100">
    <div class="d-flex align-center justify-space-between mb-2">
      <span class="text-body-2 text-medium-emphasis">{{ title }}</span>
      <v-icon :icon="icon" color="primary" size="20" />
    </div>
    <v-skeleton-loader v-if="loading" type="heading" class="mt-1" />
    <div v-else class="od-kpi-value od-tabular" data-testid="kpi-value">{{ value }}</div>
  </v-card>
</template>
