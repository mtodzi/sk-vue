<template>
  <div class="landing-container d-flex align-items-center justify-content-center">
    <div class="container text-center py-5">
      <i class="fas fa-cogs fa-4x text-primary mb-4"></i>
      <h1 class="display-4 fw-bold">Service Keeper</h1>
      <p class="lead my-4 col-md-8 mx-auto">
        Ваш надежный помощник для управления сервисным центром. <br />
        Эффективно управляйте заказами на ремонт, отслеживайте клиентов и ведите учет запчастей на
        складе. Все в одном месте.
      </p>
      <div class="d-grid gap-2 d-sm-flex justify-content-sm-center">
        <router-link to="/login" class="btn btn-primary btn-lg px-4 gap-3"
          >Начать работу</router-link
        >
      </div>
    </div>
  </div>
</template>

<script setup></script>

<style scoped>
.landing-container {
  min-height: 100vh;
  background-color: #f4f6f9;
}
</style>
