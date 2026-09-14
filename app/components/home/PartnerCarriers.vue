<template>
  <div>
    <h2 class="mb-3 text-base font-bold text-gray-800">
      Mitra Pengiriman
    </h2>
    <div class="rounded-3xl bg-white p-5 shadow-card lg:shadow-card-flat">
      <div class="flex flex-wrap justify-center gap-x-8 gap-y-5">
        <NuxtLink
          v-for="partner in PARTNER_BADGES"
          :key="partner.courierCode"
          v-ripple.dark
          to="/kirim"
          class="group flex cursor-pointer flex-col items-center gap-1.5 rounded-2xl py-1 text-center"
        >
          <AppCourierLogo
            :code="partner.courierCode"
            :label="partner.label"
            class="pointer-events-none size-12 rounded-full text-sm shadow-xs transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-card-hover"
          />
          <span class="pointer-events-none text-center text-sm font-semibold leading-tight text-gray-500">{{ partner.label }}</span>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
