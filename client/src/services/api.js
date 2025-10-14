import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default {
  login(credentials) {
    return api.post("/auth/login", credentials);
  },

  register(userData) {
    return api.post("/auth/register", userData);
  },

  getDatasets() {
    return api.get("/datasets");
  },

  getDataset(id) {
    return api.get(`/datasets/${id}`);
  },

  createDataset(data) {
    return api.post("/datasets", data);
  },

  getDatasetBranches(datasetId) {
    return api.get(`/datasets/${datasetId}/branches`);
  },

  getDatasetMergeRequests(datasetId) {
    return api.get(`/datasets/${datasetId}/merge-requests`);
  },

  checkoutBranch(data) {
    return api.post("/branches/checkout", data);
  },

  getBranch(id) {
    return api.get(`/branches/${id}`);
  },

  deleteBranch(id) {
    return api.delete(`/branches/${id}`);
  },

  getBranchFeatures(branchId, includeDeleted = false) {
    return api.get(`/branches/${branchId}/features`, {
      params: { includeDeleted },
    });
  },

  checkForUpdates(branchId) {
    return api.get(`/branches/${branchId}/check-updates`);
  },

  getBranchChanges(branchId) {
    return api.get(`/branches/${branchId}/changes`);
  },

  addFeature(branchId, featureData) {
    return api.post(`/branches/${branchId}/features`, featureData);
  },

  updateFeature(branchId, featureId, featureData) {
    return api.put(`/branches/${branchId}/features/${featureId}`, featureData);
  },

  deleteFeature(branchId, featureId) {
    return api.delete(`/branches/${branchId}/features/${featureId}`);
  },

  createMergeRequest(data) {
    return api.post("/merge-requests", data);
  },

  getMergeRequest(id) {
    return api.get(`/merge-requests/${id}`);
  },

  updateMergeRequest(id, data) {
    return api.put(`/merge-requests/${id}`, data);
  },

  submitMergeRequestForReview(id) {
    return api.post(`/merge-requests/${id}/submit-for-review`);
  },

  cancelMergeRequest(id) {
    return api.post(`/merge-requests/${id}/cancel`);
  },

  getMergeRequestChanges(id) {
    return api.get(`/merge-requests/${id}/changes`);
  },

  getMergeRequestConflicts(id) {
    return api.get(`/merge-requests/${id}/conflicts`);
  },

  getMergeRequestStatistics(id) {
    return api.get(`/merge-requests/${id}/statistics`);
  },

  approveMergeRequest(id) {
    return api.post(`/merge-requests/${id}/approve`);
  },

  rejectMergeRequest(id, comment) {
    return api.post(`/merge-requests/${id}/reject`, { comment });
  },

  resolveConflict(changeId, resolution, manualData = null) {
    return api.post(`/merge-requests/${changeId}/conflicts/resolve`, {
      resolution,
      manualData,
    });
  },

  autoResolveConflicts(mergeRequestId, strategy) {
    return api.post(
      `/merge-requests/${mergeRequestId}/conflicts/auto-resolve`,
      {
        strategy,
      }
    );
  },

  getConflictDetails(changeId) {
    return api.get(`/merge-requests/conflicts/${changeId}/details`);
  },

  mergeProperties(changeId) {
    return api.post(`/merge-requests/conflicts/${changeId}/merge-properties`);
  },

  compareFeatures(sourceId, targetId) {
    return api.get("/merge-requests/features/compare", {
      params: { sourceId, targetId },
    });
  },
};
