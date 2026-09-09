<template>
  <div class="flex min-h-screen flex-col bg-[#f8f9fb] lg:flex-row">
    <div class="relative hidden flex-col justify-between overflow-hidden bg-linear-135 from-[#002144] via-[#003366] to-[#004080] p-10 lg:flex lg:basis-2/5 lg:p-14">
      <div class="absolute top-0 right-0 size-80 -translate-y-1/3 translate-x-1/4 rounded-full bg-white/5" />
      <div class="absolute bottom-0 left-0 size-56 translate-y-1/3 -translate-x-1/4 rounded-full bg-secondary/10" />
      <AppLogo
        variant="mark"
        class="relative z-10"
      />
      <div class="relative z-10">
        <p class="text-3xl font-extrabold leading-tight text-white">
          Semua kebutuhan pengiriman, dalam satu pintu.
        </p>
        <p class="mt-3 text-sm font-bold tracking-wide text-secondary">
          ANTAR LANGSUNG
        </p>
      </div>
    </div>
    <div class="flex flex-1 items-center justify-center px-6 py-8 lg:p-12">
      <div class="animate-page-in w-full max-w-md">
        <slot />
      </div>
    </div>
  </div>
</template>
