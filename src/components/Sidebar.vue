<template>
  <div class="sidebar">
    <a href="#" class="sidebar-btn" id="sidebar-close-btn" @click.prevent="$emit('close-sidebar')"
      ><i class="fas fa-bars"></i
    ></a>
    <a href="#" class="sidebar-btn" @click.prevent="router.push('/')"
      ><i class="fas fa-home"></i
    ></a>
    <a href="#" class="sidebar-btn" @click.prevent="router.push('/profile')"
      ><i class="fas fa-user-cog"></i
    ></a>
    <a href="#" class="sidebar-btn" @click.prevent="router.push('/clients')"
      ><i class="fas fa-user-tie"></i>
    </a>
    <a href="#" class="sidebar-btn" @click.prevent="router.push('/stocks')"
      ><i class="fas fa-warehouse"></i>
    </a>
    <!--<a href="#" class="sidebar-btn"><i class="fas fa-wand-magic-sparkles"></i></a>
    <a href="#" class="sidebar-btn"><i class="fas fa-users"></i></a>
    <a href="#" class="sidebar-btn"><i class="fas fa-chess-rook"></i></a>
    <a href="#" class="sidebar-btn"><i class="fas fa-cubes"></i></a>
    <a href="#" class="sidebar-btn"><i class="fas fa-sitemap"></i></a>-->

    <div class="sidebar-bottom">
      <a href="#" class="sidebar-btn" @click.prevent="$emit('logout')"
        ><i class="fas fa-door-open"></i
      ></a>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()
defineEmits(['close-sidebar', 'logout'])
</script>

<style scoped>
/* Стили, специфичные для боковой панели */
.sidebar-btn {
  width: 38px;
  height: 38px;
  background-color: #fff;
  border-radius: 3px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 8px;
  color: #212529;
  text-decoration: none;
  font-size: 18px;
}
.sidebar-btn:hover {
  background-color: #e9ecef;
  color: #000;
}
.sidebar-bottom {
  margin-top: auto;
  margin-bottom: 10px;
}
</style>
