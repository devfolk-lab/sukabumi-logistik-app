<script setup lang="ts">
import type { ModalProps, DrawerProps } from '@nuxt/ui'

/**
 * Bottom-sheet drawer on phones, centred modal on desktop. The breakpoint is
 * `lg`, the same one that swaps the bottom nav for the sidebar, so every
 * dialog follows the shell it is opened from.
 */
const props = withDefaults(defineProps<{
  title?: string
  description?: string
  /**
   * Slot overrides applied to whichever surface is rendered. `content` is
   * modal-only: it carries the modal's width, and the drawer always spans the
   * phone frame.
   */
  ui?: ModalProps['ui'] & DrawerProps['ui']
}>(), {
  title: undefined,
  description: undefined,
  ui: undefined
})

const open = defineModel<boolean>('open', { default: false })

// The app is client-rendered, so the query resolves before first paint.
const isDesktop = useMediaQuery('(min-width: 1024px)')

// Nuxt UI gives the overlay and the sheet no z-index, so the z-50 sticky bar
// and bottom nav would stay on top of an open dialog.
const modalUi = computed(() => ({
  ...props.ui,
  overlay: ['z-60', props.ui?.overlay].filter(Boolean).join(' '),
  content: ['z-60', props.ui?.content].filter(Boolean).join(' ')
}))
const drawerUi = computed(() => ({
  ...props.ui,
  overlay: ['z-60', props.ui?.overlay].filter(Boolean).join(' '),
  content: 'z-60 mx-auto rounded-t-3xl md:max-lg:max-w-105'
}))
</script>

<template>
  <UModal
    v-if="isDesktop"
    v-model:open="open"
    :title="title"
    :description="description"
    :ui="modalUi"
  >
    <template
      v-if="$slots.body"
      #body
    >
      <slot name="body" />
    </template>
    <template
      v-if="$slots.footer"
      #footer
    >
      <slot name="footer" />
    </template>
  </UModal>

  <UDrawer
    v-else
    v-model:open="open"
    :title="title"
    :description="description"
    :ui="drawerUi"
  >
    <template
      v-if="$slots.body"
      #body
    >
      <slot name="body" />
    </template>
    <template
      v-if="$slots.footer"
      #footer
    >
      <slot name="footer" />
    </template>
  </UDrawer>
</template>
