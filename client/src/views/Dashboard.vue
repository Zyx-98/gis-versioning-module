<template>
  <div class="h-screen flex flex-col">
    <!-- Header -->
    <header class="bg-white shadow-sm border-b border-gray-200">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div class="flex justify-between items-center">
          <div>
            <h1 class="text-2xl font-bold text-gray-900">
              GIS Versioning System
            </h1>
            <p class="text-sm text-gray-600 mt-1">
              Welcome, {{ authStore.user?.name }}
            </p>
          </div>
          <div class="flex items-center gap-4">
            <span
              class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium"
              :class="
                authStore.isAdmin
                  ? 'bg-purple-100 text-purple-800'
                  : 'bg-blue-100 text-blue-800'
              "
            >
              {{ authStore.user?.role }}
            </span>
            <button
              @click="handleLogout"
              class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="flex-1 overflow-y-auto bg-gray-50">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <!-- Actions -->
        <div class="mb-6 flex justify-between items-center">
          <h2 class="text-xl font-semibold text-gray-900">Datasets</h2>
          <button
            v-if="authStore.isAdmin"
            @click="showCreateDataset = true"
            class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
          >
            <svg
              class="w-5 h-5 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 4v16m8-8H4"
              />
            </svg>
            New Dataset
          </button>
        </div>

        <!-- Loading -->
        <div
          v-if="datasetStore.loading"
          class="flex justify-center items-center py-12"
        >
          <div class="spinner"></div>
        </div>

        <!-- Datasets Grid -->
        <div
          v-else-if="datasetStore.datasets.length"
          class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          <div
            v-for="dataset in datasetStore.datasets"
            :key="dataset.id"
            class="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer"
            @click="router.push(`/datasets/${dataset.id}`)"
          >
            <div class="p-6">
              <div class="flex items-start justify-between">
                <div class="flex-1">
                  <h3 class="text-lg font-semibold text-gray-900 mb-2">
                    {{ dataset.name }}
                  </h3>
                  <p class="text-sm text-gray-600 mb-4">
                    {{ dataset.description || "No description" }}
                  </p>
                </div>
                <span
                  class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                >
                  {{ dataset.geoType }}
                </span>
              </div>
              <div class="mt-4 flex items-center text-sm text-gray-500">
                <svg
                  class="w-4 h-4 mr-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                {{ new Date(dataset.createdAt).toLocaleDateString() }}
              </div>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div v-else class="text-center py-12">
          <svg
            class="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
            />
          </svg>
          <h3 class="mt-2 text-sm font-medium text-gray-900">No datasets</h3>
          <p class="mt-1 text-sm text-gray-500">
            Get started by creating a new dataset.
          </p>
        </div>
      </div>
    </main>

    <!-- Create Dataset Modal -->
    <teleport to="body">
      <div v-if="showCreateDataset" class="fixed inset-0 z-50 overflow-y-auto">
        <div
          class="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0"
        >
          <div
            class="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
            @click="showCreateDataset = false"
          ></div>

          <div
            class="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6"
          >
            <form @submit.prevent="handleCreateDataset">
              <div>
                <h3 class="text-lg font-medium text-gray-900 mb-4">
                  Create New Dataset
                </h3>

                <div class="space-y-4">
                  <div>
                    <label class="block text-sm font-medium text-gray-700"
                      >Name</label
                    >
                    <input
                      v-model="newDataset.name"
                      type="text"
                      required
                      class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                    />
                  </div>

                  <div>
                    <label class="block text-sm font-medium text-gray-700"
                      >Description</label
                    >
                    <textarea
                      v-model="newDataset.description"
                      rows="3"
                      class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                    ></textarea>
                  </div>

                  <div>
                    <label class="block text-sm font-medium text-gray-700"
                      >Geometry Type</label
                    >
                    <select
                      v-model="newDataset.geoType"
                      required
                      class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                    >
                      <option value="point">Point</option>
                      <option value="line">Line</option>
                      <option value="polygon">Polygon</option>
                      <option value="multipoint">MultiPoint</option>
                      <option value="multiline">MultiLine</option>
                      <option value="multipolygon">MultiPolygon</option>
                    </select>
                  </div>
                </div>
              </div>

              <div
                class="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense"
              >
                <button
                  type="submit"
                  :disabled="creatingDataset"
                  class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary-600 text-base font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:col-start-2 sm:text-sm disabled:opacity-50"
                >
                  {{ creatingDataset ? "Creating..." : "Create" }}
                </button>
                <button
                  type="button"
                  @click="showCreateDataset = false"
                  class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:col-start-1 sm:text-sm"
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
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "../stores/auth";
import { useDatasetStore } from "../stores/dataset";

const router = useRouter();
const authStore = useAuthStore();
const datasetStore = useDatasetStore();

const showCreateDataset = ref(false);
const creatingDataset = ref(false);
const newDataset = ref({
  name: "",
  description: "",
  geoType: "point",
});

onMounted(async () => {
  await datasetStore.fetchDatasets();
});

const handleLogout = () => {
  authStore.logout();
  router.push("/login");
};

const handleCreateDataset = async () => {
  creatingDataset.value = true;
  try {
    await datasetStore.createDataset(newDataset.value);
    showCreateDataset.value = false;
    newDataset.value = { name: "", description: "", geoType: "point" };
  } catch (error) {
    console.error("Failed to create dataset:", error);
    alert("Failed to create dataset. Please try again.");
  } finally {
    creatingDataset.value = false;
  }
};
</script>
