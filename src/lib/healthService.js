const API_BASE = "https://backend-pongase-trucha.onrender.com/api";

function buildQuery(params = {}) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.append(key, value);
    }
  });

  return query.toString();
}

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("access");
}

async function apiRequest(path, { method = "GET", body, headers = {} } = {}) {
  const token = getToken();
  const requestHeaders = {
    "Content-Type": "application/json",
    ...headers,
  };

  if (token) {
    requestHeaders.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: requestHeaders,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const payloadText = await response.text();
  let payload = null;

  try {
    payload = payloadText ? JSON.parse(payloadText) : null;
  } catch (error) {
    payload = payloadText;
  }

  if (!response.ok) {
    const error = new Error(payload?.detail || payload?.message || `Error ${response.status}`);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
}

export const healthService = {
  // 1. GET /api/health/options/
  getHealthOptions: async () => {
    return apiRequest(`/health/options/`);
  },

  getProducts: async (farmId) => {
    return apiRequest(`/farms/${farmId}/products/`);
  },

  getUnits: async () => {
    return apiRequest(`/unit/`);
  },

  getCycleBatches: async (farmId, pondId, cycleId) => {
    return apiRequest(`/farms/${farmId}/ponds/${pondId}/cycles/${cycleId}/cycle-batches/`);
  },

  // 2. GET/POST /api/farms/{farm_pk}/ponds/{pond_pk}/cycles/{cycle_pk}/health-stats/
  getHealthStats: async (farmId, pondId, cycleId, filters = {}) => {
    const query = buildQuery(filters);
    return apiRequest(`/farms/${farmId}/ponds/${pondId}/cycles/${cycleId}/health-stats/${query ? `?${query}` : ""}`);
  },

  createHealthStat: async (farmId, pondId, cycleId, payload, isCombined = false) => {
    const endpoint = isCombined 
      ? `/farms/${farmId}/ponds/${pondId}/cycles/${cycleId}/health-stats/with-fish-evaluation/` 
      : `/farms/${farmId}/ponds/${pondId}/cycles/${cycleId}/health-stats/`;
    return apiRequest(endpoint, {
      method: "POST",
      body: payload,
    });
  },

  // 3. GET/PATCH/DELETE /api/farms/{farm_pk}/ponds/{pond_pk}/cycles/{cycle_pk}/health-stats/{health_stat_id}/
  getHealthStatById: async (farmId, pondId, cycleId, healthStatId) => {
    return apiRequest(`/farms/${farmId}/ponds/${pondId}/cycles/${cycleId}/health-stats/${healthStatId}/`);
  },

  updateHealthStat: async (farmId, pondId, cycleId, healthStatId, payload) => {
    return apiRequest(`/farms/${farmId}/ponds/${pondId}/cycles/${cycleId}/health-stats/${healthStatId}/`, {
      method: "PATCH",
      body: payload,
    });
  },

  deleteHealthStat: async (farmId, pondId, cycleId, healthStatId, confirm = true) => {
    return apiRequest(`/farms/${farmId}/ponds/${pondId}/cycles/${cycleId}/health-stats/${healthStatId}/?confirm=${confirm}`, {
      method: "DELETE",
    });
  },

  // 4. GET /api/farms/{farm_pk}/ponds/{pond_pk}/cycles/{cycle_pk}/health-stats/{health_stat_id}/treatment-plans/occupied-ranges/
  getTreatmentPlanOccupiedRanges: async (farmId, pondId, cycleId, healthStatId) => {
    return apiRequest(`/farms/${farmId}/ponds/${pondId}/cycles/${cycleId}/health-stats/${healthStatId}/treatment-plans/occupied-ranges/`);
  },

  // 5. GET/POST /api/farms/{farm_pk}/ponds/{pond_pk}/cycles/{cycle_pk}/health-stats/{health_stat_id}/treatment-plans/
  getTreatmentPlans: async (farmId, pondId, cycleId, healthStatId, filters = {}) => {
    const query = buildQuery(filters);
    return apiRequest(`/farms/${farmId}/ponds/${pondId}/cycles/${cycleId}/health-stats/${healthStatId}/treatment-plans/${query ? `?${query}` : ""}`);
  },

  createTreatmentPlan: async (farmId, pondId, cycleId, healthStatId, payload) => {
    return apiRequest(`/farms/${farmId}/ponds/${pondId}/cycles/${cycleId}/health-stats/${healthStatId}/treatment-plans/`, {
      method: "POST",
      body: payload,
    });
  },

  // 6. GET /api/farms/{farm_pk}/ponds/{pond_pk}/cycles/{cycle_pk}/treatment-events/
  getCycleTreatmentEvents: async (farmId, pondId, cycleId, filters = {}) => {
    const query = buildQuery(filters);
    return apiRequest(`/farms/${farmId}/ponds/${pondId}/cycles/${cycleId}/treatment-events/${query ? `?${query}` : ""}`);
  },

  // 7. GET/PATCH/DELETE /api/farms/{farm_pk}/ponds/{pond_pk}/cycles/{cycle_pk}/health-stats/{health_stat_id}/treatment-plans/{plan_id}/
  getTreatmentPlanById: async (farmId, pondId, cycleId, healthStatId, planId) => {
    return apiRequest(`/farms/${farmId}/ponds/${pondId}/cycles/${cycleId}/health-stats/${healthStatId}/treatment-plans/${planId}/`);
  },

  updateTreatmentPlan: async (farmId, pondId, cycleId, healthStatId, planId, payload) => {
    const token = getToken();
    const response = await fetch(`${API_BASE}/farms/${farmId}/ponds/${pondId}/cycles/${cycleId}/health-stats/${healthStatId}/treatment-plans/${planId}/`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    });

    const text = await response.text();
    let payloadData = null;

    try {
      payloadData = text ? JSON.parse(text) : null;
    } catch (error) {
      payloadData = text;
    }

    if (!response.ok) {
      const error = new Error(payloadData?.detail || payloadData?.message || `Error ${response.status}`);
      error.status = response.status;
      error.payload = payloadData;
      throw error;
    }

    return { status: response.status, payload: payloadData };
  },

  deleteTreatmentPlan: async (farmId, pondId, cycleId, healthStatId, planId) => {
    return apiRequest(`/farms/${farmId}/ponds/${pondId}/cycles/${cycleId}/health-stats/${healthStatId}/treatment-plans/${planId}/`, {
      method: "DELETE",
    });
  },

  // 8. GET /api/farms/{farm_pk}/ponds/{pond_pk}/cycles/{cycle_pk}/health-stats/{health_stat_id}/treatment-plans/{plan_id}/treatment-events/
  getTreatmentPlanEvents: async (farmId, pondId, cycleId, healthStatId, planId, filters = {}) => {
    const query = buildQuery(filters);
    return apiRequest(`/farms/${farmId}/ponds/${pondId}/cycles/${cycleId}/health-stats/${healthStatId}/treatment-plans/${planId}/treatment-events/${query ? `?${query}` : ""}`);
  },

  // 9. GET/PATCH /api/farms/{farm_pk}/ponds/{pond_pk}/cycles/{cycle_pk}/health-stats/{health_stat_id}/treatment-plans/{plan_id}/treatment-events/{event_id}/
  getTreatmentEventById: async (farmId, pondId, cycleId, healthStatId, planId, eventId) => {
    return apiRequest(`/farms/${farmId}/ponds/${pondId}/cycles/${cycleId}/health-stats/${healthStatId}/treatment-plans/${planId}/treatment-events/${eventId}/`);
  },

  updateTreatmentEvent: async (farmId, pondId, cycleId, healthStatId, planId, eventId, payload) => {
    return apiRequest(`/farms/${farmId}/ponds/${pondId}/cycles/${cycleId}/health-stats/${healthStatId}/treatment-plans/${planId}/treatment-events/${eventId}/`, {
      method: "PATCH",
      body: payload,
    });
  },
};
