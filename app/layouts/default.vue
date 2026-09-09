<template>
  <div class="min-h-screen bg-[#f8f9fb]">
    <AppSidebar />
    <div class="w-full lg:ml-68 lg:w-[calc(100%-17rem)]">
      <div class="relative mx-auto min-h-screen w-full md:max-lg:max-w-105 md:max-lg:overflow-hidden md:max-lg:shadow-2xl">
        <div class="animate-page-in pb-28">
          <slot />
        </div>
      </div>
    </div>
    <AppBottomNav />
  </div>
</template>
