import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "../stores/auth";

const routes = [
  {
    path: "/login",
    name: "Login",
    component: () => import("../views/Login.vue"),
    meta: { requiresAuth: false },
  },
  {
    path: "/",
    name: "Dashboard",
    component: () => import("../views/Dashboard.vue"),
    meta: { requiresAuth: true },
  },
  {
    path: "/datasets/:id",
    name: "DatasetDetail",
    component: () => import("../views/DatasetDetail.vue"),
    meta: { requiresAuth: true },
  },
  {
    path: "/map/:datasetId/:branchId",
    name: "MapEditor",
    component: () => import("../views/MapEditor.vue"),
    meta: { requiresAuth: true },
  },
  {
    path: "/merge-requests/:id",
    name: "MergeRequestDetail",
    component: () => import("../views/MergeRequestDetail.vue"),
    meta: { requiresAuth: true },
  },
  {
    path: "/:pathMatch(.*)*",
    redirect: "/",
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to, from, next) => {
  const authStore = useAuthStore();

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    next("/login");
  } else if (to.path === "/login" && authStore.isAuthenticated) {
    next("/");
  } else {
    next();
  }
});

export default router;
