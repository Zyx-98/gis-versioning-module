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
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div>
            <h1 class="text-lg font-semibold text-gray-900">{{ currentBranch?.name || 'Loading...' }}</h1>
            <p class="text-sm text-gray-600">{{ currentDataset?.name }}</p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <!-- Draw Tools -->
          <div class="flex items-center gap-1 border-r pr-2 mr-2">
            <button
              @click="changeTool('simple_select')"
              :class="[
                'p-2 rounded hover:bg-gray-100',
                activeTool === 'simple_select' ? 'bg-blue-100 text-blue-700' : 'text-gray-700'
              ]"
              title="Select"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
              </svg>
            </button>
            <button
              @click="changeTool('draw_point')"
              :class="[
                'p-2 rounded hover:bg-gray-100',
                activeTool === 'draw_point' ? 'bg-blue-100 text-blue-700' : 'text-gray-700'
              ]"
              title="Point"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
            <button
              @click="changeTool('draw_line_string')"
              :class="[
                'p-2 rounded hover:bg-gray-100',
                activeTool === 'draw_line_string' ? 'bg-blue-100 text-blue-700' : 'text-gray-700'
              ]"
              title="Line"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
              </svg>
            </button>
            <button
              @click="changeTool('draw_polygon')"
              :class="[
                'p-2 rounded hover:bg-gray-100',
                activeTool === 'draw_polygon' ? 'bg-blue-100 text-blue-700' : 'text-gray-700'
              ]"
              title="Polygon"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 5a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 011-1V5a1 1 0 011-1h4a1 1 0 011 1v14a1 1 0 01-1 1h-4a1 1 0 01-1-1v-2a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5z" />
              </svg>
            </button>
          </div>

          <!-- Actions -->
          <button
            @click="saveChanges"
            :disabled="!hasChanges"
            class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save Changes
          </button>

          <button
            v-if="!currentBranch?.isMain"
            @click="showMergeRequestModal = true"
            :disabled="!hasChanges"
            class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
          >
            Create MR
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
        class="absolute top-4 right-4 w-80 bg-white rounded-lg shadow-lg p-4 max-h-96 overflow-y-auto"
      >
        <div class="flex justify-between items-start mb-4">
          <h3 class="text-lg font-semibold">Feature Properties</h3>
          <button
            @click="selectedFeature = null"
            class="text-gray-400 hover:text-gray-600"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
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
              class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <button
              @click="addProperty"
              class="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              + Add Property
            </button>
          </div>
        </div>

        <div class="mt-4 flex gap-2">
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
      </div>

      <!-- Legend -->
      <div class="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-4">
        <h4 class="text-sm font-semibold mb-2">Features</h4>
        <div class="text-sm text-gray-600">
          Total: {{ features.length }}
        </div>
      </div>
    </div>

    <!-- Merge Request Modal -->
    <teleport to="body">
      <div v-if="showMergeRequestModal" class="fixed inset-0 z-50 overflow-y-auto">
        <div class="flex items-center justify-center min-h-screen px-4">
          <div class="fixed inset-0 bg-gray-500 bg-opacity-75" @click="showMergeRequestModal = false"></div>
          
          <div class="relative bg-white rounded-lg p-6 max-w-md w-full">
            <h3 class="text-lg font-semibold mb-4">Create Merge Request</h3>
            
            <textarea
              v-model="mergeRequestDescription"
              rows="4"
              placeholder="Describe your changes..."
              class="w-full px-3 py-2 border border-gray-300 rounded-md"
            ></textarea>

            <div class="mt-4 flex gap-2">
              <button
                @click="createMergeRequest"
                class="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                Create
              </button>
              <button
                @click="showMergeRequestModal = false"
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
import { ref, onMounted, onBeforeUnmount, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useDatasetStore } from '../stores/dataset'
import mapboxgl from 'mapbox-gl'
import MapboxDraw from '@mapbox/mapbox-gl-draw'

const route = useRoute()
const router = useRouter()
const datasetStore = useDatasetStore()

const mapContainer = ref(null)
const map = ref(null)
const draw = ref(null)
const selectedFeature = ref(null)
const features = ref([])
const hasChanges = ref(false)
const activeTool = ref('simple_select')
const showMergeRequestModal = ref(false)
const mergeRequestDescription = ref('')

const currentDataset = computed(() => datasetStore.currentDataset)
const currentBranch = computed(() => datasetStore.currentBranch)

// Set a dummy token to prevent authentication (we're using OSM tiles)
mapboxgl.accessToken = 'pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw'

// Using free OpenStreetMap tiles
const initializeMap = () => {
  map.value = new mapboxgl.Map({
    container: mapContainer.value,
    style: {
      version: 8,
      sources: {
        'osm-tiles': {
          type: 'raster',
          tiles: [
            'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
            'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
            'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png'
          ],
          tileSize: 256,
          attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }
      },
      layers: [
        {
          id: 'osm-tiles',
          type: 'raster',
          source: 'osm-tiles',
          minzoom: 0,
          maxzoom: 19
        }
      ]
    },
    center: [105.8342, 21.0278], // Hanoi center
    zoom: 12
  })

  // Initialize Mapbox Draw
  draw.value = new MapboxDraw({
    displayControlsDefault: false,
    controls: {},
    defaultMode: 'simple_select'
  })

  map.value.addControl(draw.value)
  map.value.addControl(new mapboxgl.NavigationControl(), 'top-right')

  // Map events
  map.value.on('draw.create', handleFeatureCreated)
  map.value.on('draw.update', handleFeatureUpdated)
  map.value.on('draw.delete', handleFeatureDeleted)
  map.value.on('draw.selectionchange', handleSelectionChange)
}

const loadFeatures = async () => {
  try {
    await datasetStore.fetchFeatures(route.params.branchId)
    features.value = datasetStore.features

    // Add features to map
    features.value.forEach(feature => {
      const drawFeature = {
        id: feature.id,
        type: 'Feature',
        geometry: feature.geometry,
        properties: feature.properties
      }
      draw.value.add(drawFeature)
    })
  } catch (error) {
    console.error('Failed to load features:', error)
  }
}

const changeTool = (mode) => {
  activeTool.value = mode
  draw.value.changeMode(mode)
}

const handleFeatureCreated = (e) => {
  hasChanges.value = true
  const feature = e.features[0]
  
  // Add default properties
  feature.properties = {
    name: 'New Feature',
    created: new Date().toISOString()
  }
  
  draw.value.setFeatureProperty(feature.id, 'name', 'New Feature')
}

const handleFeatureUpdated = (e) => {
  hasChanges.value = true
}

const handleFeatureDeleted = (e) => {
  hasChanges.value = true
}

const handleSelectionChange = (e) => {
  if (e.features.length > 0) {
    const feature = e.features[0]
    selectedFeature.value = {
      id: feature.id,
      geometry: feature.geometry,
      properties: { ...feature.properties }
    }
  } else {
    selectedFeature.value = null
  }
}

const updateFeatureProperties = () => {
  if (selectedFeature.value) {
    // Update properties in draw
    Object.entries(selectedFeature.value.properties).forEach(([key, value]) => {
      draw.value.setFeatureProperty(selectedFeature.value.id, key, value)
    })
    hasChanges.value = true
  }
}

const deleteSelectedFeature = () => {
  if (selectedFeature.value) {
    draw.value.delete(selectedFeature.value.id)
    selectedFeature.value = null
    hasChanges.value = true
  }
}

const addProperty = () => {
  const key = prompt('Property name:')
  if (key && selectedFeature.value) {
    selectedFeature.value.properties[key] = ''
  }
}

const saveChanges = async () => {
  try {
    const allFeatures = draw.value.getAll()
    
    // Process each feature
    for (const feature of allFeatures.features) {
      const existingFeature = features.value.find(f => f.id === feature.id)
      
      if (!existingFeature) {
        // New feature
        await datasetStore.addFeature(route.params.branchId, {
          geometry: feature.geometry,
          properties: feature.properties
        })
      } else {
        // Updated feature
        await datasetStore.updateFeature(
          route.params.branchId,
          feature.id,
          {
            geometry: feature.geometry,
            properties: feature.properties
          }
        )
      }
    }

    hasChanges.value = false
    alert('Changes saved successfully!')
    await loadFeatures()
  } catch (error) {
    console.error('Failed to save changes:', error)
    alert('Failed to save changes. Please try again.')
  }
}

const createMergeRequest = async () => {
  try {
    await datasetStore.createMergeRequest({
      sourceBranchId: route.params.branchId,
      description: mergeRequestDescription.value
    })
    
    showMergeRequestModal.value = false
    mergeRequestDescription.value = ''
    alert('Merge request created successfully!')
    router.push(`/datasets/${route.params.datasetId}`)
  } catch (error) {
    console.error('Failed to create merge request:', error)
    alert('Failed to create merge request. Please try again.')
  }
}

onMounted(async () => {
  // Load dataset and branch info
  await datasetStore.fetchDataset(route.params.datasetId)
  await datasetStore.fetchBranches(route.params.datasetId)
  const branch = datasetStore.branches.find(b => b.id === route.params.branchId)
  datasetStore.setCurrentBranch(branch)

  // Initialize map
  initializeMap()
  
  map.value.on('load', () => {
    loadFeatures()
  })
})

onBeforeUnmount(() => {
  if (map.value) {
    map.value.remove()
  }
})
</script>