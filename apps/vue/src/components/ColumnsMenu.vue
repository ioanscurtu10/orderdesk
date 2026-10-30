<script setup lang="ts">
defineProps<{ columns: Array<{ key: string; title: string }>; visible: string[] }>()
const emit = defineEmits<{ toggle: [key: string] }>()
</script>

<template>
  <v-menu :close-on-content-click="false">
    <template #activator="{ props }">
      <v-btn
        v-bind="props"
        variant="outlined"
        prepend-icon="mdi-view-column-outline"
        data-testid="columns-menu"
      >
        {{ $t('app.columns') }}
      </v-btn>
    </template>
    <v-list density="compact" min-width="220">
      <v-list-item
        v-for="c in columns"
        :key="c.key"
        :data-testid="`column-toggle-${c.key}`"
        @click="emit('toggle', c.key)"
      >
        <template #prepend>
          <v-checkbox-btn :model-value="visible.includes(c.key)" density="compact" tabindex="-1" />
        </template>
        <v-list-item-title>{{ c.title }}</v-list-item-title>
      </v-list-item>
    </v-list>
  </v-menu>
</template>
