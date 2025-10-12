<template>
  <div class="h-screen flex flex-col">
    <!-- Header -->
    <header class="bg-white shadow-sm border-b">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4">
            <button
              @click="router.back()"
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
              <h1 class="text-xl font-bold text-gray-900">
                Merge Request: {{ mergeRequest?.sourceBranch?.name }} →
                {{ mergeRequest?.targetBranch?.name }}
              </h1>
              <p class="text-sm text-gray-600 mt-1">
                {{ mergeRequest?.description }}
              </p>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <span
              :class="[
                'px-3 py-1 text-sm font-medium rounded-full',
                mergeRequest?.status === 'pending'
                  ? 'bg-yellow-100 text-yellow-800'
                  : mergeRequest?.status === 'approved'
                  ? 'bg-green-100 text-green-800'
                  : mergeRequest?.status === 'conflict'
                  ? 'bg-red-100 text-red-800'
                  : 'bg-gray-100 text-gray-800',
              ]"
            >
              {{ mergeRequest?.status }}
            </span>

            <!-- Admin Actions -->
            <template
              v-if="authStore.isAdmin && mergeRequest?.status === 'pending'"
            >
              <button
                @click="handleApprove"
                class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                Approve
              </button>
              <button
                @click="showRejectModal = true"
                class="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Reject
              </button>
            </template>
          </div>
        </div>
      </div>
    </header>

    <!-- Content -->
    <main class="flex-1 overflow-y-auto bg-gray-50">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <!-- Statistics -->
        <div v-if="statistics" class="grid grid-cols-4 gap-4 mb-6">
          <div class="bg-white p-4 rounded-lg shadow">
            <div class="text-2xl font-bold text-gray-900">
              {{ statistics.totalChanges }}
            </div>
            <div class="text-sm text-gray-600">Total Changes</div>
          </div>
          <div class="bg-white p-4 rounded-lg shadow">
            <div class="text-2xl font-bold text-green-600">
              {{ statistics.changeTypeBreakdown?.add || 0 }}
            </div>
            <div class="text-sm text-gray-600">Added</div>
          </div>
          <div class="bg-white p-4 rounded-lg shadow">
            <div class="text-2xl font-bold text-blue-600">
              {{ statistics.changeTypeBreakdown?.modify || 0 }}
            </div>
            <div class="text-sm text-gray-600">Modified</div>
          </div>
          <div class="bg-white p-4 rounded-lg shadow">
            <div class="text-2xl font-bold text-red-600">
              {{ statistics.changeTypeBreakdown?.delete || 0 }}
            </div>
            <div class="text-sm text-gray-600">Deleted</div>
          </div>
        </div>

        <!-- Conflicts -->
        <div v-if="conflicts.length" class="mb-6">
          <div class="bg-red-50 border border-red-200 rounded-lg p-4">
            <div class="flex items-center gap-2 mb-4">
              <svg
                class="w-5 h-5 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <h3 class="text-lg font-semibold text-red-900">
                {{ conflicts.length }} Conflict(s) Found
              </h3>
              <button
                @click="autoResolveAll"
                class="ml-auto px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
              >
                Auto-resolve (Keep Mine)
              </button>
            </div>

            <div class="space-y-3">
              <div
                v-for="conflict in conflicts"
                :key="conflict.id"
                class="bg-white p-3 rounded border border-red-200"
              >
                <div class="flex justify-between items-start">
                  <div class="flex-1">
                    <p class="font-medium text-sm">
                      {{ conflict.conflictData?.reason }}
                    </p>
                    <p class="text-xs text-gray-600 mt-1">
                      Feature ID: {{ conflict.featureId }}
                    </p>
                  </div>
                  <div class="flex gap-2">
                    <button
                      @click="resolveConflict(conflict.id, 'keep_source')"
                      class="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Keep Mine
                    </button>
                    <button
                      @click="resolveConflict(conflict.id, 'keep_target')"
                      class="px-3 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700"
                    >
                      Keep Theirs
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Changes List -->
        <div class="bg-white rounded-lg shadow">
          <div class="px-6 py-4 border-b border-gray-200">
            <h3 class="text-lg font-semibold">Changes</h3>
          </div>
          <div class="divide-y divide-gray-200">
            <div
              v-for="change in changes"
              :key="change.id"
              class="px-6 py-4 hover:bg-gray-50"
            >
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <span
                    :class="[
                      'px-2 py-1 text-xs font-medium rounded',
                      change.changeType === 'add'
                        ? 'bg-green-100 text-green-800'
                        : change.changeType === 'modify'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-red-100 text-red-800',
                    ]"
                  >
                    {{ change.changeType }}
                  </span>
                  <span class="text-sm text-gray-900">
                    Feature:
                    {{
                      change.afterData?.properties?.name ||
                      change.featureId.slice(0, 8)
                    }}
                  </span>
                </div>
                <span
                  v-if="change.hasConflict"
                  class="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded"
                >
                  Conflict
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- Reject Modal -->
    <teleport to="body">
      <div v-if="showRejectModal" class="fixed inset-0 z-50 overflow-y-auto">
        <div class="flex items-center justify-center min-h-screen px-4">
          <div
            class="fixed inset-0 bg-gray-500 bg-opacity-75"
            @click="showRejectModal = false"
          ></div>

          <div class="relative bg-white rounded-lg p-6 max-w-md w-full">
            <h3 class="text-lg font-semibold mb-4">Reject Merge Request</h3>

            <textarea
              v-model="rejectComment"
              rows="4"
              required
              placeholder="Please provide a reason for rejection..."
              class="w-full px-3 py-2 border border-gray-300 rounded-md"
            ></textarea>

            <div class="mt-4 flex gap-2">
              <button
                @click="handleReject"
                :disabled="!rejectComment"
                class="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                Reject
              </button>
              <button
                @click="showRejectModal = false"
                class="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </teleport>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useAuthStore } from "../stores/auth";
import api from "../services/api";

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

const mergeRequest = ref(null);
const changes = ref([]);
const conflicts = ref([]);
const statistics = ref(null);
const showRejectModal = ref(false);
const rejectComment = ref("");

onMounted(async () => {
  await loadMergeRequest();
});

const loadMergeRequest = async () => {
  try {
    const [mrRes, changesRes, conflictsRes, statsRes] = await Promise.all([
      api.getMergeRequest(route.params.id),
      api.getMergeRequestChanges(route.params.id),
      api.getMergeRequestConflicts(route.params.id),
      api.getMergeRequestStatistics(route.params.id),
    ]);

    mergeRequest.value = mrRes.data;
    changes.value = changesRes.data;
    conflicts.value = conflictsRes.data;
    statistics.value = statsRes.data;
  } catch (error) {
    console.error("Failed to load merge request:", error);
  }
};

const resolveConflict = async (changeId, resolution) => {
  try {
    await api.resolveConflict(changeId, resolution);
    await loadMergeRequest();
  } catch (error) {
    console.error("Failed to resolve conflict:", error);
    alert("Failed to resolve conflict");
  }
};

const autoResolveAll = async () => {
  if (!confirm("Auto-resolve all conflicts by keeping your changes?")) return;

  try {
    await api.autoResolveConflicts(route.params.id, "keep_source");
    await loadMergeRequest();
    alert("All conflicts resolved!");
  } catch (error) {
    console.error("Failed to auto-resolve:", error);
    alert("Failed to auto-resolve conflicts");
  }
};

const handleApprove = async () => {
  if (!confirm("Approve this merge request?")) return;

  try {
    await api.approveMergeRequest(route.params.id);
    alert("Merge request approved!");
    await loadMergeRequest();
  } catch (error) {
    console.error("Failed to approve:", error);
    alert(error.response?.data?.message || "Failed to approve merge request");
  }
};

const handleReject = async () => {
  try {
    await api.rejectMergeRequest(route.params.id, rejectComment.value);
    showRejectModal.value = false;
    rejectComment.value = "";
    alert("Merge request rejected");
    await loadMergeRequest();
  } catch (error) {
    console.error("Failed to reject:", error);
    alert("Failed to reject merge request");
  }
};
</script>
