<template>
  <div class="h-screen flex flex-col">
    <!-- Header -->
    <header class="bg-white shadow-sm border-b border-gray-200 z-10">
      <div class="px-4 py-3 flex items-center justify-between">
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
            <h1 class="text-lg font-semibold text-gray-900">
              {{ currentBranch?.name || "Loading..." }}
            </h1>
            <p class="text-sm text-gray-600">{{ currentDataset?.name }}</p>
          </div>

          <!-- Branch Info Badge -->
          <div v-if="!currentBranch?.isMain" class="flex items-center gap-2">
            <span
              class="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded"
            >
              Working Branch
            </span>
            <button
              @click="checkMainUpdates"
              class="text-sm text-blue-600 hover:text-blue-700 font-medium"
              title="Check for updates from main"
            >
              <svg
                class="w-4 h-4 inline mr-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Check Updates
            </button>
          </div>

          <!-- Active MR Indicator -->
          <div v-if="hasActiveMR" class="flex items-center gap-2">
            <span
              class="px-2 py-1 text-xs font-medium bg-orange-100 text-orange-800 rounded"
            >
              Has Active MR
            </span>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <!-- Draw Tools - Only show if user can edit -->
          <div
            v-if="canEditBranch"
            class="flex items-center gap-1 border-r pr-2 mr-2"
          >
            <button
              @click="setDrawMode('select')"
              :class="[
                'p-2 rounded hover:bg-gray-100',
                drawMode === 'select'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-700',
              ]"
              title="Select"
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
                  d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"
                />
              </svg>
            </button>

            <!-- Edit Mode Button -->
            <button
              @click="toggleEditMode"
              :class="[
                'p-2 rounded hover:bg-gray-100',
                editMode ? 'bg-green-100 text-green-700' : 'text-gray-700',
              ]"
              title="Edit Mode (Move/Reshape)"
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
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
            </button>

            <button
              @click="setDrawMode('point')"
              :class="[
                'p-2 rounded hover:bg-gray-100',
                drawMode === 'point'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-700',
              ]"
              title="Point"
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
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </button>
            <button
              @click="setDrawMode('line')"
              :class="[
                'p-2 rounded hover:bg-gray-100',
                drawMode === 'line'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-700',
              ]"
              title="Line"
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
                  d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
                />
              </svg>
            </button>
            <button
              @click="setDrawMode('polygon')"
              :class="[
                'p-2 rounded hover:bg-gray-100',
                drawMode === 'polygon'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-700',
              ]"
              title="Polygon"
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
                  d="M4 5a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 011-1V5a1 1 0 011-1h4a1 1 0 011 1v14a1 1 0 01-1 1h-4a1 1 0 01-1-1v-2a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5z"
                />
              </svg>
            </button>
            <button
              v-if="drawMode !== 'select' || editMode"
              @click="cancelDrawing"
              class="p-2 rounded hover:bg-gray-100 text-red-600"
              title="Cancel Drawing/Editing"
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
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <!-- Actions -->
          <button
            v-if="canEditBranch"
            @click="saveChanges"
            :disabled="!hasUnsavedChanges"
            class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save Changes
          </button>

          <button
            v-if="!currentBranch?.isMain && canEditBranch"
            @click="prepareCreateMergeRequest"
            :disabled="hasActiveMR || checkingActiveMR"
            :class="[
              'px-4 py-2 rounded-md',
              hasActiveMR || checkingActiveMR
                ? 'bg-gray-400 text-gray-700 cursor-not-allowed'
                : 'bg-green-600 text-white hover:bg-green-700',
            ]"
            :title="
              hasActiveMR
                ? 'This branch already has an active merge request'
                : 'Create Merge Request'
            "
          >
            {{ checkingActiveMR ? "Checking..." : "Create MR" }}
          </button>
        </div>
      </div>

      <!-- Edit Mode Banner -->
      <div
        v-if="editMode && canEditBranch"
        class="px-4 py-2 bg-green-50 border-t border-green-200"
      >
        <div class="flex items-center gap-2 text-sm text-green-800">
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
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
            />
          </svg>
          <span class="font-medium">
            Edit Mode Active: Click and drag features to move/reshape them.
            Click "Save Changes" when done.
          </span>
        </div>
      </div>

      <!-- Permission Warning Banner -->
      <div
        v-if="!canEditBranch && !checkingPermission"
        class="px-4 py-2 bg-red-50 border-t border-red-200"
      >
        <div class="flex items-center gap-2 text-sm text-red-800">
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
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <span class="font-medium">
            Read-only mode: {{ editPermissionReason }}
          </span>
        </div>
      </div>

      <!-- Warning Banner for Main Updates -->
      <div
        v-if="mainHasUpdates"
        class="px-4 py-2 bg-yellow-50 border-t border-yellow-200"
      >
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2 text-sm text-yellow-800">
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
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <span class="font-medium">
              Main branch has {{ mainUpdatesCount }} update(s). You may
              encounter conflicts when creating a merge request.
            </span>
          </div>
          <button
            @click="showUpdatesModal = true"
            class="text-yellow-800 hover:text-yellow-900 font-medium underline"
          >
            View Changes
          </button>
        </div>
      </div>
    </header>

    <!-- Map Container -->
    <div class="flex-1 relative">
      <div ref="mapContainer" class="absolute inset-0"></div>

      <!-- Feature Info Panel -->
      <div
        v-if="selectedFeature"
        class="absolute top-4 right-4 w-80 bg-white rounded-lg shadow-lg p-4 max-h-96 overflow-y-auto z-[1000]"
      >
        <div class="flex justify-between items-start mb-4">
          <h3 class="text-lg font-semibold">Feature Properties</h3>
          <button
            @click="closeFeaturePanel"
            class="text-gray-400 hover:text-gray-600"
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
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div class="space-y-3">
          <div v-for="(value, key) in selectedFeature.properties" :key="key">
            <label class="block text-sm font-medium text-gray-700 mb-1">
              {{ key }}
            </label>
            <input
              v-model="selectedFeature.properties[key]"
              type="text"
              :disabled="!canEditBranch"
              class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
          </div>

          <div v-if="canEditBranch">
            <button
              @click="addProperty"
              class="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              + Add Property
            </button>
          </div>
        </div>

        <div v-if="canEditBranch" class="mt-4 flex gap-2">
          <button
            @click="updateFeatureProperties"
            class="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
          >
            Update
          </button>
          <button
            @click="deleteSelectedFeature"
            class="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
          >
            Delete
          </button>
        </div>

        <!-- Read-only message -->
        <div v-else class="mt-4 text-sm text-gray-500 text-center">
          Read-only: {{ editPermissionReason }}
        </div>
      </div>

      <!-- Legend -->
      <div
        class="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-4 z-[1000]"
      >
        <h4 class="text-sm font-semibold mb-2">Features</h4>
        <div class="text-sm text-gray-600">Total: {{ mapFeatures.size }}</div>
        <div
          v-if="branchChangesInfo"
          class="mt-2 text-xs text-gray-500 border-t pt-2"
        >
          <div>Added: {{ branchChangesInfo.added }}</div>
          <div>Modified: {{ branchChangesInfo.modified }}</div>
          <div>Deleted: {{ branchChangesInfo.deleted }}</div>
        </div>
      </div>
    </div>

    <!-- Main Updates Modal -->
    <teleport to="body">
      <div v-if="showUpdatesModal" class="fixed inset-0 z-50 overflow-y-auto">
        <div class="flex items-center justify-center min-h-screen px-4">
          <div
            class="fixed inset-0 bg-gray-500 bg-opacity-75"
            @click="showUpdatesModal = false"
          ></div>

          <div
            class="relative bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
          >
            <div class="flex justify-between items-start mb-4">
              <h3 class="text-lg font-semibold">Updates from Main Branch</h3>
              <button
                @click="showUpdatesModal = false"
                class="text-gray-400 hover:text-gray-600"
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
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div v-if="mainUpdates" class="space-y-4">
              <div class="bg-blue-50 p-4 rounded">
                <p class="text-sm text-blue-800">
                  The main branch has {{ mainUpdates.updatedCount }} change(s)
                  since you created this branch. These changes may conflict with
                  yours when you create a merge request.
                </p>
              </div>

              <div
                v-for="update in mainUpdates.updates"
                :key="update.feature.id"
                class="border rounded p-3"
              >
                <div class="flex items-start justify-between mb-2">
                  <span class="text-sm font-medium text-gray-900">
                    Feature: {{ update.feature.id.substring(0, 8) }}...
                  </span>
                  <span
                    :class="[
                      'px-2 py-1 text-xs font-medium rounded',
                      update.updateType === 'added_in_main'
                        ? 'bg-green-100 text-green-800'
                        : update.updateType === 'modified_in_main'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800',
                    ]"
                  >
                    {{ update.updateType.replace("_", " ").toUpperCase() }}
                  </span>
                </div>
                <div v-if="update.branchVersion" class="text-xs text-gray-600">
                  Your version: v{{ update.branchVersion }} | Main version: v{{
                    update.mainVersion
                  }}
                </div>
              </div>
            </div>

            <div class="mt-6 flex justify-end">
              <button
                @click="showUpdatesModal = false"
                class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      </div>
    </teleport>

    <!-- Merge Request Preparation Modal -->
    <teleport to="body">
      <div
        v-if="showMergeRequestModal"
        class="fixed inset-0 overflow-y-auto"
        style="z-index: 10000"
      >
        <div class="flex items-center justify-center min-h-screen px-4">
          <div
            class="fixed inset-0 bg-gray-500 bg-opacity-75"
            style="z-index: 10001"
            @click="closeMergeRequestModal"
          ></div>

          <div
            class="relative bg-white rounded-lg p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto"
            style="z-index: 10002"
          >
            <h3 class="text-lg font-semibold mb-4">Create Merge Request</h3>

            <!-- Loading State -->
            <div v-if="loadingChanges" class="text-center py-8">
              <div
                class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"
              ></div>
              <p class="mt-2 text-sm text-gray-600">Analyzing changes...</p>
            </div>

            <!-- No Changes -->
            <div v-else-if="!hasAnyChanges" class="text-center py-8">
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
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <p class="mt-2 text-gray-600">No changes to merge</p>
              <p class="text-sm text-gray-500">
                Make some changes before creating a merge request
              </p>
              <button
                @click="closeMergeRequestModal"
                class="mt-4 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Close
              </button>
            </div>

            <!-- Changes Summary -->
            <div v-else>
              <!-- Conflict Warning -->
              <div
                v-if="mainHasUpdates"
                class="mb-4 bg-yellow-50 border border-yellow-200 rounded p-4"
              >
                <div class="flex items-start gap-2">
                  <svg
                    class="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0"
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
                  <div class="flex-1">
                    <h4 class="text-sm font-medium text-yellow-800">
                      Potential Conflicts
                    </h4>
                    <p class="text-sm text-yellow-700 mt-1">
                      The main branch has {{ mainUpdatesCount }} update(s). Your
                      merge request may have conflicts that need to be resolved.
                    </p>
                  </div>
                </div>
              </div>

              <!-- Changes Summary Cards -->
              <div class="grid grid-cols-3 gap-3 mb-6">
                <div class="bg-green-50 border border-green-200 rounded p-3">
                  <div class="text-2xl font-bold text-green-700">
                    {{ branchChangesInfo?.added || 0 }}
                  </div>
                  <div class="text-sm text-green-600">Added</div>
                </div>
                <div class="bg-blue-50 border border-blue-200 rounded p-3">
                  <div class="text-2xl font-bold text-blue-700">
                    {{ branchChangesInfo?.modified || 0 }}
                  </div>
                  <div class="text-sm text-blue-600">Modified</div>
                </div>
                <div class="bg-red-50 border border-red-200 rounded p-3">
                  <div class="text-2xl font-bold text-red-700">
                    {{ branchChangesInfo?.deleted || 0 }}
                  </div>
                  <div class="text-sm text-red-600">Deleted</div>
                </div>
              </div>

              <!-- Changes List -->
              <div class="mb-4 max-h-60 overflow-y-auto border rounded">
                <div
                  v-for="change in branchChanges?.changes"
                  :key="change.feature.id"
                  class="p-3 border-b last:border-b-0 hover:bg-gray-50"
                >
                  <div class="flex items-center justify-between">
                    <span class="text-sm font-medium text-gray-900">
                      {{ change.feature.properties?.name || "Unnamed Feature" }}
                    </span>
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
                      {{ change.changeType.toUpperCase() }}
                    </span>
                  </div>
                  <div class="text-xs text-gray-500 mt-1">
                    ID: {{ change.feature.id.substring(0, 16) }}...
                  </div>
                </div>
              </div>

              <!-- Description -->
              <textarea
                v-model="mergeRequestDescription"
                rows="4"
                placeholder="Describe your changes..."
                class="w-full px-3 py-2 border border-gray-300 rounded-md"
              ></textarea>

              <!-- Actions -->
              <div class="mt-4 flex gap-2">
                <button
                  @click="createMergeRequest"
                  :disabled="creatingMR"
                  class="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                  {{ creatingMR ? "Creating..." : "Create Merge Request" }}
                </button>
                <button
                  @click="closeMergeRequestModal"
                  class="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </teleport>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, computed, toRaw, markRaw } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useDatasetStore } from "../stores/dataset";
import api from "../services/api";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-draw";
import "leaflet-draw/dist/leaflet.draw.css";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

const route = useRoute();
const router = useRouter();
const datasetStore = useDatasetStore();

const mapContainer = ref(null);
const map = ref(null);
const drawnItems = ref(null);
const drawControl = ref(null);
const selectedFeature = ref(null);
const selectedLayer = ref(null);
const features = ref([]);
const hasUnsavedChanges = ref(false);
const drawMode = ref("select");
const editMode = ref(false);
const showMergeRequestModal = ref(false);
const showUpdatesModal = ref(false);
const mergeRequestDescription = ref("");
const branchChanges = ref(null);
const mainUpdates = ref(null);
const loadingChanges = ref(false);
const creatingMR = ref(false);
const mapFeatures = ref(new Map());
const hasActiveMR = ref(false);
const checkingActiveMR = ref(false);
const canEditBranch = ref(true);
const editPermissionReason = ref("");
const checkingPermission = ref(false);

const currentDataset = computed(() => datasetStore.currentDataset);
const currentBranch = computed(() => datasetStore.currentBranch);

const hasAnyChanges = computed(() => {
  return branchChanges.value?.hasChanges || false;
});

const branchChangesInfo = computed(() => {
  if (!branchChanges.value?.changes) return null;

  const changes = branchChanges.value.changes;
  return {
    added: changes.filter((c) => c.changeType === "add").length,
    modified: changes.filter((c) => c.changeType === "modify").length,
    deleted: changes.filter((c) => c.changeType === "delete").length,
  };
});

const mainHasUpdates = computed(() => {
  return mainUpdates.value?.hasUpdates || false;
});

const mainUpdatesCount = computed(() => {
  return mainUpdates.value?.updatedCount || 0;
});

const initializeMap = () => {
  const rawMap = L.map(mapContainer.value, {
    center: [21.0278, 105.8342],
    zoom: 12,
    zoomControl: true,
  });

  map.value = markRaw(rawMap);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution:
      '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
  }).addTo(map.value);

  const rawDrawnItems = new L.FeatureGroup();
  drawnItems.value = markRaw(rawDrawnItems);
  map.value.addLayer(drawnItems.value);

  const rawDrawControl = new L.Control.Draw({
    position: "topright",
    draw: {
      polyline: false,
      polygon: false,
      circle: false,
      rectangle: false,
      marker: false,
      circlemarker: false,
    },
    edit: {
      featureGroup: drawnItems.value,
      remove: false,
    },
  });

  drawControl.value = markRaw(rawDrawControl);
  map.value.addControl(drawControl.value);

  map.value.on(L.Draw.Event.CREATED, handleFeatureCreated);
  map.value.on("draw:edited", handleFeatureEdited);
  map.value.on("draw:deleted", handleFeatureDeleted);

  drawnItems.value.on("click", handleFeatureClick);
};

const loadFeatures = async () => {
  try {
    await datasetStore.fetchFeatures(route.params.branchId);
    features.value = datasetStore.features;

    const rawDrawnItems = toRaw(drawnItems.value);
    rawDrawnItems.clearLayers();
    mapFeatures.value.clear();

    features.value.forEach((feature) => {
      addFeatureToMap(feature);
    });

    console.log(`Loaded ${features.value.length} features`);
  } catch (error) {
    console.error("Failed to load features:", error);
  }
};

const addFeatureToMap = (feature) => {
  try {
    const layer = L.geoJSON(feature.geometry, {
      pointToLayer: (feature, latlng) => {
        return L.marker(latlng);
      },
      style: {
        color: "#3b82f6",
        weight: 3,
        opacity: 0.8,
        fillOpacity: 0.3,
      },
    }).getLayers()[0];

    const rawLayer = markRaw(layer);

    rawLayer.feature = {
      type: "Feature",
      properties: { ...feature.properties } || {},
      geometry: feature.geometry,
      id: feature.id,
    };

    const rawDrawnItems = toRaw(drawnItems.value);
    rawDrawnItems.addLayer(rawLayer);
    mapFeatures.value.set(feature.id, rawLayer);
  } catch (error) {
    console.error("Error adding feature to map:", error, feature);
  }
};

const checkEditPermission = async () => {
  try {
    checkingPermission.value = true;
    const response = await api.canEditBranch(route.params.branchId);
    canEditBranch.value = response.data.canEdit;
    editPermissionReason.value = response.data.reason || "";

    if (!canEditBranch.value) {
      console.log(`Cannot edit branch: ${editPermissionReason.value}`);
    }
  } catch (error) {
    console.error("Failed to check edit permission:", error);
    canEditBranch.value = false;
    editPermissionReason.value = "Failed to verify edit permissions";
  } finally {
    checkingPermission.value = false;
  }
};

const checkActiveMergeRequest = async () => {
  if (currentBranch.value?.isMain) return;

  try {
    checkingActiveMR.value = true;
    const response = await api.checkBranchHasActiveMergeRequest(
      route.params.branchId
    );
    hasActiveMR.value = response.data.hasActiveMergeRequest;
  } catch (error) {
    console.error("Failed to check for active merge request:", error);
  } finally {
    checkingActiveMR.value = false;
  }
};

const toggleEditMode = () => {
  if (!canEditBranch.value && !editMode.value) {
    alert(
      editPermissionReason.value ||
        "You don't have permission to edit this branch"
    );
    return;
  }

  const rawMap = toRaw(map.value);
  const rawDrawnItems = toRaw(drawnItems.value);

  if (!editMode.value) {
    editMode.value = true;
    drawMode.value = "select";

    if (rawMap._drawingHandler) {
      try {
        rawMap._drawingHandler.disable();
        rawMap._drawingHandler = null;
      } catch (e) {
        console.error("Error canceling drawing:", e);
      }
    }

    let enabledCount = 0;
    rawDrawnItems.eachLayer((layer) => {
      if (layer.editing) {
        layer.editing.enable();
        enabledCount++;
      }
    });

    console.log(`Edit mode enabled on ${enabledCount} layers`);
  } else {
    editMode.value = false;

    let disabledCount = 0;
    rawDrawnItems.eachLayer((layer) => {
      if (layer.editing && layer.editing.enabled()) {
        if (layer.feature && layer.feature.id) {
          const newGeometry = layer.toGeoJSON().geometry;
          const oldGeometry = JSON.stringify(layer.feature.geometry);
          const newGeometryStr = JSON.stringify(newGeometry);

          if (oldGeometry !== newGeometryStr) {
            layer.feature.geometry = newGeometry;
            hasUnsavedChanges.value = true;
            console.log(`Feature ${layer.feature.id} was modified`);
          }
        }
        layer.editing.disable();
        disabledCount++;
      }
    });

    console.log(`Edit mode disabled on ${disabledCount} layers`);
  }
};

const setDrawMode = (mode) => {
  if (!canEditBranch.value && mode !== "select") {
    alert(
      editPermissionReason.value ||
        "You don't have permission to edit this branch"
    );
    return;
  }

  if (editMode.value) {
    toggleEditMode();
  }

  drawMode.value = mode;

  const rawMap = toRaw(map.value);

  if (rawMap._drawingHandler) {
    try {
      rawMap._drawingHandler.disable();
    } catch (e) {
      console.log("Error disabling drawing handler:", e);
    }
  }

  if (mode === "select") {
    return;
  }

  if (mode === "point") {
    const markerDrawer = new L.Draw.Marker(rawMap, {
      icon: new L.Icon.Default(),
      repeatMode: false,
      zIndexOffset: 2000,
    });

    rawMap._drawingHandler = markRaw(markerDrawer);
    markerDrawer.enable();
  } else if (mode === "line") {
    const polylineDrawer = new L.Draw.Polyline(rawMap, {
      allowIntersection: true,
      showLength: true,
      metric: true,
      feet: false,
      nautic: false,
      repeatMode: false,
      shapeOptions: {
        color: "#3b82f6",
        weight: 3,
        opacity: 0.8,
      },
    });

    rawMap._drawingHandler = markRaw(polylineDrawer);
    polylineDrawer.enable();
  } else if (mode === "polygon") {
    const polygonDrawer = new L.Draw.Polygon(rawMap, {
      allowIntersection: false,
      showArea: true,
      metric: true,
      repeatMode: false,
      shapeOptions: {
        color: "#3b82f6",
        weight: 3,
        opacity: 0.8,
        fillOpacity: 0.3,
      },
    });

    rawMap._drawingHandler = markRaw(polygonDrawer);
    polygonDrawer.enable();
  }
};

const cancelDrawing = () => {
  const rawMap = toRaw(map.value);

  if (rawMap && rawMap._drawingHandler) {
    try {
      rawMap._drawingHandler.disable();
      rawMap._drawingHandler = null;
    } catch (e) {
      console.error("Error canceling drawing:", e);
    }
  }

  if (editMode.value) {
    toggleEditMode();
  }

  drawMode.value = "select";
};

const handleFeatureCreated = (e) => {
  if (!canEditBranch.value) {
    alert(
      editPermissionReason.value ||
        "You don't have permission to edit this branch"
    );
    const rawDrawnItems = toRaw(drawnItems.value);
    rawDrawnItems.removeLayer(e.layer);
    return;
  }

  hasUnsavedChanges.value = true;
  const layer = e.layer;

  const rawLayer = markRaw(layer);

  const tempId =
    "temp_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);

  rawLayer.feature = {
    type: "Feature",
    properties: {
      name: "New Feature",
      created: new Date().toISOString(),
    },
    geometry: rawLayer.toGeoJSON().geometry,
    id: tempId,
  };

  const rawDrawnItems = toRaw(drawnItems.value);
  rawDrawnItems.addLayer(rawLayer);
  mapFeatures.value.set(tempId, rawLayer);

  console.log(`Created new feature: ${tempId}`);
  drawMode.value = "select";
};

const handleFeatureEdited = (e) => {
  if (!canEditBranch.value) {
    alert(
      editPermissionReason.value ||
        "You don't have permission to edit this branch"
    );
    return;
  }

  hasUnsavedChanges.value = true;

  let editedCount = 0;
  e.layers.eachLayer((layer) => {
    if (layer.feature && layer.feature.id) {
      layer.feature.geometry = layer.toGeoJSON().geometry;
      editedCount++;
      console.log(`Edited feature: ${layer.feature.id}`);
    }
  });

  console.log(`Total edited features: ${editedCount}`);
};

const handleFeatureDeleted = (e) => {
  if (!canEditBranch.value) {
    alert(
      editPermissionReason.value ||
        "You don't have permission to edit this branch"
    );
    return;
  }

  hasUnsavedChanges.value = true;

  let deletedCount = 0;
  e.layers.eachLayer((layer) => {
    if (layer.feature && layer.feature.id) {
      mapFeatures.value.delete(layer.feature.id);
      deletedCount++;
      console.log(`Deleted feature: ${layer.feature.id}`);
    }
  });

  console.log(`Total deleted features: ${deletedCount}`);

  const rawDrawnItems = toRaw(drawnItems.value);
  const rawSelectedLayer = toRaw(selectedLayer.value);

  if (rawSelectedLayer && !rawDrawnItems.hasLayer(rawSelectedLayer)) {
    closeFeaturePanel();
  }
};

const handleFeatureClick = (e) => {
  const layer = e.layer;

  if (layer.feature) {
    selectedLayer.value = layer;
    selectedFeature.value = {
      id: layer.feature.id,
      geometry: layer.feature.geometry,
      properties: { ...layer.feature.properties },
    };
  }
};

const closeFeaturePanel = () => {
  selectedFeature.value = null;
  selectedLayer.value = null;
};

const updateFeatureProperties = () => {
  if (!canEditBranch.value) {
    alert(
      editPermissionReason.value ||
        "You don't have permission to edit this branch"
    );
    return;
  }

  if (selectedFeature.value && selectedLayer.value) {
    const rawLayer = toRaw(selectedLayer.value);

    rawLayer.feature.properties = {
      ...selectedFeature.value.properties,
    };
    hasUnsavedChanges.value = true;
  }
};

const deleteSelectedFeature = () => {
  if (!canEditBranch.value) {
    alert(
      editPermissionReason.value ||
        "You don't have permission to edit this branch"
    );
    return;
  }

  if (selectedLayer.value) {
    const rawDrawnItems = toRaw(drawnItems.value);
    const rawLayer = toRaw(selectedLayer.value);

    rawDrawnItems.removeLayer(rawLayer);
    if (selectedFeature.value && selectedFeature.value.id) {
      mapFeatures.value.delete(selectedFeature.value.id);
    }
    hasUnsavedChanges.value = true;
    closeFeaturePanel();
  }
};

const addProperty = () => {
  const key = prompt("Property name:");
  if (key && selectedFeature.value) {
    selectedFeature.value.properties[key] = "";
  }
};

const checkMainUpdates = async () => {
  try {
    mainUpdates.value = await datasetStore.checkForMainUpdates(
      route.params.branchId
    );

    if (mainUpdates.value.hasUpdates) {
      showUpdatesModal.value = true;
    } else {
      alert("No updates in main branch");
    }
  } catch (error) {
    console.error("Failed to check for updates:", error);
    alert("Failed to check for updates");
  }
};

const prepareCreateMergeRequest = async () => {
  if (hasUnsavedChanges.value) {
    alert("Please save your changes first before creating a merge request");
    return;
  }

  // Check again before creating
  await checkActiveMergeRequest();

  if (hasActiveMR.value) {
    alert(
      "This branch already has an active merge request. Please complete or cancel the existing merge request before creating a new one."
    );
    return;
  }

  loadingChanges.value = true;
  showMergeRequestModal.value = true;

  try {
    branchChanges.value = await datasetStore.fetchBranchChanges(
      route.params.branchId
    );

    mainUpdates.value = await datasetStore.checkForMainUpdates(
      route.params.branchId
    );

    if (branchChanges.value.hasChanges) {
      const summary = `${branchChangesInfo.value.added} added, ${branchChangesInfo.value.modified} modified, ${branchChangesInfo.value.deleted} deleted`;
      mergeRequestDescription.value = `Changes summary: ${summary}`;
    }
  } catch (error) {
    console.error("Failed to prepare merge request:", error);
    alert("Failed to load changes. Please try again.");
    showMergeRequestModal.value = false;
  } finally {
    loadingChanges.value = false;
  }
};

const closeMergeRequestModal = () => {
  showMergeRequestModal.value = false;
  mergeRequestDescription.value = "";
  branchChanges.value = null;
};

const saveChanges = async () => {
  if (!canEditBranch.value) {
    alert(
      editPermissionReason.value ||
        "You don't have permission to edit this branch"
    );
    return;
  }

  // Disable edit mode first if active
  if (editMode.value) {
    toggleEditMode();
  }

  try {
    const rawDrawnItems = toRaw(drawnItems.value);

    const allLayers = [];
    rawDrawnItems.eachLayer((layer) => {
      if (layer.feature && layer.feature.id) {
        allLayers.push({
          id: layer.feature.id,
          geometry: layer.toGeoJSON().geometry,
          properties: { ...layer.feature.properties },
        });
      }
    });

    console.log(`Total layers on map: ${allLayers.length}`);
    console.log(`Features in store: ${features.value.length}`);

    const currentFeatureIds = new Set(allLayers.map((f) => f.id));

    const featuresToAdd = [];
    const featuresToUpdate = [];
    const featuresToDelete = [];

    for (const layer of allLayers) {
      if (layer.id.startsWith("temp_")) {
        featuresToAdd.push(layer);
      } else {
        const existingFeature = features.value.find((f) => f.id === layer.id);

        if (existingFeature) {
          const geometryChanged =
            JSON.stringify(layer.geometry) !==
            JSON.stringify(existingFeature.geometry);
          const propertiesChanged =
            JSON.stringify(layer.properties) !==
            JSON.stringify(existingFeature.properties);

          if (geometryChanged || propertiesChanged) {
            featuresToUpdate.push(layer);
          }
        }
      }
    }

    for (const feature of features.value) {
      if (!currentFeatureIds.has(feature.id) && feature.status === "active") {
        featuresToDelete.push(feature);
      }
    }

    const totalChanges =
      featuresToAdd.length + featuresToUpdate.length + featuresToDelete.length;

    console.log(`Changes to save: ${totalChanges}`);
    console.log(`- New: ${featuresToAdd.length}`);
    console.log(`- Modified: ${featuresToUpdate.length}`);
    console.log(`- Deleted: ${featuresToDelete.length}`);

    if (totalChanges === 0) {
      alert("No changes to save");
      hasUnsavedChanges.value = false;
      return;
    }

    const confirmMessage =
      `Save ${totalChanges} change(s)?\n\n` +
      `• ${featuresToAdd.length} new feature(s)\n` +
      `• ${featuresToUpdate.length} modified feature(s)\n` +
      `• ${featuresToDelete.length} deleted feature(s)`;

    if (!confirm(confirmMessage)) {
      return;
    }

    for (const feature of featuresToAdd) {
      const response = await datasetStore.addFeature(route.params.branchId, {
        geometry: feature.geometry,
        properties: feature.properties,
      });

      const layer = mapFeatures.value.get(feature.id);
      if (layer && response.id) {
        mapFeatures.value.delete(feature.id);
        layer.feature.id = response.id;
        mapFeatures.value.set(response.id, layer);
        console.log(`Updated temp ID ${feature.id} to ${response.id}`);
      }
    }

    for (const feature of featuresToUpdate) {
      await datasetStore.updateFeature(route.params.branchId, feature.id, {
        geometry: feature.geometry,
        properties: feature.properties,
      });
    }

    for (const feature of featuresToDelete) {
      await datasetStore.deleteFeature(route.params.branchId, feature.id);
    }

    hasUnsavedChanges.value = false;
    alert(`Successfully saved ${totalChanges} change(s)!`);

    await loadFeatures();

    if (!currentBranch.value?.isMain) {
      try {
        branchChanges.value = await datasetStore.fetchBranchChanges(
          route.params.branchId
        );
      } catch (error) {
        console.error("Failed to refresh branch changes:", error);
      }
    }
  } catch (error) {
    console.error("Failed to save changes:", error);

    if (error.response?.status === 403) {
      alert(
        error.response?.data?.message ||
          "You don't have permission to edit this branch"
      );
      await checkEditPermission();
    } else {
      alert("Failed to save changes. Please try again.");
    }
  }
};

const createMergeRequest = async () => {
  if (!hasAnyChanges.value) {
    alert("No changes to merge");
    return;
  }

  creatingMR.value = true;

  try {
    const response = await datasetStore.createMergeRequest({
      sourceBranchId: route.params.branchId,
      description: mergeRequestDescription.value,
    });

    showMergeRequestModal.value = false;
    mergeRequestDescription.value = "";

    alert(
      "Merge request created as draft! You can edit it and submit for review when ready."
    );

    router.push(`/merge-requests/${response.id}`);
  } catch (error) {
    console.error("Failed to create merge request:", error);

    const errorMessage =
      error.response?.data?.message ||
      "Failed to create merge request. Please try again.";
    alert(errorMessage);

    if (errorMessage.includes("already has an active merge request")) {
      await checkActiveMergeRequest();
    }
  } finally {
    creatingMR.value = false;
  }
};

onMounted(async () => {
  await datasetStore.fetchDataset(route.params.datasetId);
  await datasetStore.fetchBranches(route.params.datasetId);
  const branch = datasetStore.branches.find(
    (b) => b.id === route.params.branchId
  );
  datasetStore.setCurrentBranch(branch);

  initializeMap();

  setTimeout(async () => {
    await loadFeatures();

    await checkEditPermission();

    if (!currentBranch.value?.isMain) {
      try {
        await checkActiveMergeRequest();

        mainUpdates.value = await datasetStore.checkForMainUpdates(
          route.params.branchId
        );
        branchChanges.value = await datasetStore.fetchBranchChanges(
          route.params.branchId
        );
      } catch (error) {
        console.error("Failed to check initial status:", error);
      }
    }
  }, 100);
});

onBeforeUnmount(() => {
  const rawMap = toRaw(map.value);

  if (rawMap) {
    try {
      rawMap.off();
      rawMap.remove();
    } catch (e) {
      console.error("Error during map cleanup:", e);
    }
  }

  map.value = null;
  drawnItems.value = null;
  drawControl.value = null;
});
</script>

<style scoped>
:deep(.leaflet-container) {
  font-family: inherit;
}

:deep(.leaflet-default-icon-path) {
  background-image: url("https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png");
}
</style>
