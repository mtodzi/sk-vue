<template>
  <MainLayout> </MainLayout>
</template>

<script setup>
import MainLayout from '../components/MainLayout.vue'
</script>

<style scoped>
.order-card {
  border: 1px solid #dee2e6;
  background-color: #fff;
}
.order-header {
  background-color: #dc3545;
  color: white;
  padding: 6px 15px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.header-actions .btn {
  background-color: #fff;
  border: none;
  padding: 2px 8px;
  margin-left: 5px;
  border-radius: 4px;
  font-size: 14px;
}
.icon-lock {
  color: #0dcaf0;
}
.icon-print {
  color: #000;
}
.icon-edit {
  color: #198754;
}
.order-body {
  padding: 10px 15px;
  font-size: 0.95rem;
  text-align: center;
}
.client-title {
  font-weight: 700;
  font-size: 1.05rem;
  margin-bottom: 4px;
}
.orders-container {
  display: grid;
  grid-template-columns: 1fr;
  gap: 15px;
}
@media (min-width: 768px) {
  .orders-container {
    grid-template-columns: 1fr 1fr;
  }
}
@media (max-width: 575.98px) {
  .order-header {
    flex-direction: column;
    align-items: flex-start;
  }
  .order-header > span {
    margin-bottom: 0.5rem;
  }
  .order-header .header-actions {
    align-self: flex-end;
  }
}
</style>
