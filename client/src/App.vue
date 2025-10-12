<template>
  <div id="app" class="h-screen flex flex-col bg-gray-50">
    <router-view />
  </div>
</template>

<script setup>
import { onMounted } from "vue";
import { useAuthStore } from "./stores/auth";

const authStore = useAuthStore();

onMounted(() => {
  if (authStore.token) {
    console.log("User authenticated:", authStore.user?.email);
  }
});
</script>
