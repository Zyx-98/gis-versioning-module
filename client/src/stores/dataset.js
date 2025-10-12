import { defineStore } from 'pinia'
import api from '../services/api'

export const useDatasetStore = defineStore('dataset', {
  state: () => ({
    datasets: [],
    currentDataset: null,
    branches: [],
    currentBranch: null,
    features: [],
    mergeRequests: [],
    loading: false,
    error: null,
  }),

  getters: {
    mainBranch: (state) => state.branches.find(b => b.isMain),
    activeBranches: (state) => state.branches.filter(b => b.status === 'active' && !b.isMain),
    pendingMergeRequests: (state) => state.mergeRequests.filter(mr => mr.status === 'pending'),
  },

  actions: {
    // Datasets
    async fetchDatasets() {
      this.loading = true
      this.error = null
      try {
        const response = await api.getDatasets()
        this.datasets = response.data
        return response.data
      } catch (error) {
        this.error = error.response?.data?.message || 'Failed to fetch datasets'
        throw error
      } finally {
        this.loading = false
      }
    },

    async fetchDataset(id) {
      this.loading = true
      this.error = null
      try {
        const response = await api.getDataset(id)
        this.currentDataset = response.data
        return response.data
      } catch (error) {
        this.error = error.response?.data?.message || 'Failed to fetch dataset'
        throw error
      } finally {
        this.loading = false
      }
    },

    async createDataset(data) {
      this.loading = true
      this.error = null
      try {
        const response = await api.createDataset(data)
        this.datasets.push(response.data)
        return response.data
      } catch (error) {
        this.error = error.response?.data?.message || 'Failed to create dataset'
        throw error
      } finally {
        this.loading = false
      }
    },

    // Branches
    async fetchBranches(datasetId) {
      this.loading = true
      this.error = null
      try {
        const response = await api.getDatasetBranches(datasetId)
        this.branches = response.data
        return response.data
      } catch (error) {
        this.error = error.response?.data?.message || 'Failed to fetch branches'
        throw error
      } finally {
        this.loading = false
      }
    },

    async checkoutBranch(datasetId, branchName) {
      this.loading = true
      this.error = null
      try {
        const response = await api.checkoutBranch({ datasetId, branchName })
        this.branches.push(response.data)
        return response.data
      } catch (error) {
        this.error = error.response?.data?.message || 'Failed to checkout branch'
        throw error
      } finally {
        this.loading = false
      }
    },

    setCurrentBranch(branch) {
      this.currentBranch = branch
    },

    // Features
    async fetchFeatures(branchId, includeDeleted = false) {
      this.loading = true
      this.error = null
      try {
        const response = await api.getBranchFeatures(branchId, includeDeleted)
        this.features = response.data
        return response.data
      } catch (error) {
        this.error = error.response?.data?.message || 'Failed to fetch features'
        throw error
      } finally {
        this.loading = false
      }
    },

    async addFeature(branchId, featureData) {
      this.error = null
      try {
        const response = await api.addFeature(branchId, featureData)
        this.features.push(response.data)
        return response.data
      } catch (error) {
        this.error = error.response?.data?.message || 'Failed to add feature'
        throw error
      }
    },

    async updateFeature(branchId, featureId, featureData) {
      this.error = null
      try {
        const response = await api.updateFeature(branchId, featureId, featureData)
        const index = this.features.findIndex(f => f.id === featureId)
        if (index !== -1) {
          this.features[index] = response.data
        }
        return response.data
      } catch (error) {
        this.error = error.response?.data?.message || 'Failed to update feature'
        throw error
      }
    },

    async deleteFeature(branchId, featureId) {
      this.error = null
      try {
        await api.deleteFeature(branchId, featureId)
        const index = this.features.findIndex(f => f.id === featureId)
        if (index !== -1) {
          this.features.splice(index, 1)
        }
      } catch (error) {
        this.error = error.response?.data?.message || 'Failed to delete feature'
        throw error
      }
    },

    // Merge Requests
    async fetchMergeRequests(datasetId) {
      this.loading = true
      this.error = null
      try {
        const response = await api.getDatasetMergeRequests(datasetId)
        this.mergeRequests = response.data
        return response.data
      } catch (error) {
        this.error = error.response?.data?.message || 'Failed to fetch merge requests'
        throw error
      } finally {
        this.loading = false
      }
    },

    async createMergeRequest(data) {
      this.loading = true
      this.error = null
      try {
        const response = await api.createMergeRequest(data)
        this.mergeRequests.push(response.data)
        return response.data
      } catch (error) {
        this.error = error.response?.data?.message || 'Failed to create merge request'
        throw error
      } finally {
        this.loading = false
      }
    },

    clearError() {
      this.error = null
    },

    clearCurrentDataset() {
      this.currentDataset = null
      this.branches = []
      this.currentBranch = null
      this.features = []
      this.mergeRequests = []
    },
  },
})