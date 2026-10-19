<template>
  <div class="flex min-h-screen flex-col bg-[#f8f9fb] lg:flex-row">
    <div class="relative hidden flex-col justify-between overflow-hidden bg-linear-135 from-[#002144] via-[#003366] to-[#004080] p-10 lg:flex lg:basis-2/5 lg:p-14">
      <div class="absolute top-0 right-0 size-80 -translate-y-1/3 translate-x-1/4 rounded-full bg-white/5" />
      <div class="absolute bottom-0 left-0 size-56 translate-y-1/3 -translate-x-1/4 rounded-full bg-secondary/10" />
      <AppLogo
        variant="mark"
        class="relative z-10"
      />
      <div class="relative z-10 flex flex-1 items-center">
        <p class="w-full text-left text-4xl font-extrabold leading-tight text-balance text-white xl:text-5xl">
          Semua kebutuhan pengiriman, dalam satu tempat.
        </p>
      </div>
    </div>
    <div class="flex flex-1 items-center justify-center px-6 pt-[max(2rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))] lg:p-12">
      <div class="animate-page-in w-full max-w-md">
        <!-- On a phone the brand panel is hidden, so the logo heads the form. -->
        <div class="mb-8 flex justify-center lg:hidden">
          <AppLogo class="h-16 max-w-full" />
        </div>
        <slot />
      </div>
    </div>
  </div>
</template>
