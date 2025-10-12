<template>
  <div class="h-screen flex flex-col">
    <!-- Header -->
    <header class="bg-white shadow-sm border-b">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4">
            <button
              @click="router.push('/')"
              class="p-2 hover:bg-gray-100 rounded-full"
            >
              <svg
                class="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
            </button>
            <div>
              <h1 class="text-2xl font-bold text-gray-900">
                {{ dataset?.name }}
              </h1>
              <p class="text-sm text-gray-600 mt-1">
                {{ dataset?.description }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </header>

    <!-- Tabs -->
    <div class="bg-white border-b">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav class="flex space-x-8">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            @click="activeTab = tab.id"
            :class="[
              'py-4 px-1 border-b-2 font-medium text-sm',
              activeTab === tab.id
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
            ]"
          >
            {{ tab.label }}
          </button>
        </nav>
      </div>
    </div>

    <!-- Content -->
    <main class="flex-1 overflow-y-auto bg-gray-50">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <!-- Branches Tab -->
        <div v-if="activeTab === 'branches'">
          <div class="flex justify-between items-center mb-6">
            <h2 class="text-lg font-semibold">Branches</h2>
            <button
              @click="showCheckoutModal = true"
              class="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
            >
              Checkout Branch
            </button>
          </div>

          <div class="space-y-4">
            <div
              v-for="branch in branches"
              :key="branch.id"
              class="bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow"
            >
              <div class="flex items-center justify-between">
                <div class="flex-1">
                  <div class="flex items-center gap-2">
                    <h3 class="text-lg font-semibold">{{ branch.name }}</h3>
                    <span
                      v-if="branch.isMain"
                      class="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded"
                    >
                      Main
                    </span>
                    <span
                      :class="[
                        'px-2 py-1 text-xs font-medium rounded',
                        branch.status === 'active'
                          ? 'bg-blue-100 text-blue-800'
                          : branch.status === 'merged'
                          ? 'bg-gray-100 text-gray-800'
                          : 'bg-red-100 text-red-800',
                      ]"
                    >
                      {{ branch.status }}
                    </span>
                  </div>
                  <p class="text-sm text-gray-600 mt-1">
                    Created
                    {{ new Date(branch.createdAt).toLocaleDateString() }}
                  </p>
                </div>

                <button
                  v-if="branch.status === 'active'"
                  @click="openMapEditor(branch.id)"
                  class="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
                >
                  Open Map
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Merge Requests Tab -->
        <div v-if="activeTab === 'merge-requests'">
          <h2 class="text-lg font-semibold mb-6">Merge Requests</h2>

          <div class="space-y-4">
            <div
              v-for="mr in mergeRequests"
              :key="mr.id"
              class="bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer"
              @click="router.push(`/merge-requests/${mr.id}`)"
            >
              <div class="flex items-start justify-between">
                <div class="flex-1">
                  <div class="flex items-center gap-2">
                    <h3 class="text-lg font-semibold">
                      {{ mr.sourceBranch?.name }} → {{ mr.targetBranch?.name }}
                    </h3>
                    <span
                      :class="[
                        'px-2 py-1 text-xs font-medium rounded',
                        mr.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : mr.status === 'approved'
                          ? 'bg-green-100 text-green-800'
                          : mr.status === 'conflict'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-gray-100 text-gray-800',
                      ]"
                    >
                      {{ mr.status }}
                    </span>
                  </div>
                  <p class="text-sm text-gray-600 mt-2">
                    {{ mr.description || "No description provided" }}
                  </p>
                  <p class="text-xs text-gray-500 mt-2">
                    Created by {{ mr.createdBy?.name }} on
                    {{ new Date(mr.createdAt).toLocaleDateString() }}
                  </p>
                </div>
              </div>
            </div>

            <div v-if="!mergeRequests.length" class="text-center py-12">
              <p class="text-gray-500">No merge requests yet</p>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- Checkout Branch Modal -->
    <teleport to="body">
      <div v-if="showCheckoutModal" class="fixed inset-0 z-50 overflow-y-auto">
        <div class="flex items-center justify-center min-h-screen px-4">
          <div
            class="fixed inset-0 bg-gray-500 bg-opacity-75"
            @click="showCheckoutModal = false"
          ></div>

          <div class="relative bg-white rounded-lg p-6 max-w-md w-full">
            <h3 class="text-lg font-semibold mb-4">Checkout New Branch</h3>

            <form @submit.prevent="handleCheckout">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Branch Name
                </label>
                <input
                  v-model="newBranchName"
                  type="text"
                  required
                  placeholder="feature/my-changes"
                  pattern="^[a-z0-9\-\/]+$"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
                <p class="text-xs text-gray-500 mt-1">
                  Use lowercase letters, numbers, hyphens, and forward slashes
                </p>
              </div>

              <div class="mt-4 flex gap-2">
                <button
                  type="submit"
                  :disabled="checkingOut"
                  class="flex-1 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
                >
                  {{ checkingOut ? "Creating..." : "Checkout" }}
                </button>
                <button
                  type="button"
                  @click="showCheckoutModal = false"
                  class="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </teleport>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useDatasetStore } from "../stores/dataset";

const route = useRoute();
const router = useRouter();
const datasetStore = useDatasetStore();

const activeTab = ref("branches");
const showCheckoutModal = ref(false);
const newBranchName = ref("");
const checkingOut = ref(false);

const tabs = [
  { id: "branches", label: "Branches" },
  { id: "merge-requests", label: "Merge Requests" },
];

const dataset = computed(() => datasetStore.currentDataset);
const branches = computed(() => datasetStore.branches);
const mergeRequests = computed(() => datasetStore.mergeRequests);

onMounted(async () => {
  await datasetStore.fetchDataset(route.params.id);
  await datasetStore.fetchBranches(route.params.id);
  await datasetStore.fetchMergeRequests(route.params.id);
});

const openMapEditor = (branchId) => {
  router.push(`/map/${route.params.id}/${branchId}`);
};

const handleCheckout = async () => {
  checkingOut.value = true;
  try {
    const branch = await datasetStore.checkoutBranch(
      route.params.id,
      newBranchName.value
    );
    showCheckoutModal.value = false;
    newBranchName.value = "";

    // Open the new branch in map editor
    router.push(`/map/${route.params.id}/${branch.id}`);
  } catch (error) {
    console.error("Failed to checkout branch:", error);
    alert(
      error.response?.data?.message ||
        "Failed to checkout branch. Please try again."
    );
  } finally {
    checkingOut.value = false;
  }
};
</script>
