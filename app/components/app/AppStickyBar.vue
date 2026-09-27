<!-- Teleported because AppPullToRefresh translates the page content, and a
     transformed ancestor becomes the containing block for `fixed` — the bar
     would anchor to the bottom of the page instead of the viewport. -->
<template>
  <Teleport to="body">
    <div class="fixed inset-x-0 bottom-0 z-50 border-t border-gray-100 bg-white/90 backdrop-blur-xl lg:left-68">
      <div class="mx-auto w-full px-5 py-3 md:max-lg:max-w-105 lg:max-w-4xl lg:px-12">
        <slot />
      </div>
    </div>
  </Teleport>
</template>
