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

export const feedingService = {
  getFeedingSchedules: async (farmId, filters = {}) => {
    const query = buildQuery(filters);
    return apiRequest(`/farms/${farmId}/feeding-schedules/${query ? `?${query}` : ""}`);
  },

  getFeedingOptions: async () => {
    return apiRequest(`/feeding/options/`);
  },

  createFeedingSchedule: async (farmId, payload, confirmWarnings = false) => {
    const qs = confirmWarnings ? "?confirm_warnings=true" : "";
    return apiRequest(`/farms/${farmId}/feeding-schedules/${qs}`, {
      method: "POST",
      body: payload,
    });
  },

  updateFeedingSchedule: async (farmId, scheduleId, payload, confirmWarnings = false) => {
    const qs = confirmWarnings ? "?confirm_warnings=true" : "";
    return apiRequest(`/farms/${farmId}/feeding-schedules/${scheduleId}/${qs}`, {
      method: "PATCH",
      body: payload,
    });
  },

  getScheduleVersions: async (farmId, scheduleId) => {
    return apiRequest(`/farms/${farmId}/feeding-schedules/${scheduleId}/versions/`);
  },

  getScheduleFeedingPlans: async (farmId, scheduleId, cycleId) => {
    const query = buildQuery({ cycle: cycleId });
    return apiRequest(`/farms/${farmId}/feeding-schedules/${scheduleId}/feeding-plans/${query ? `?${query}` : ""}`);
  },

  getFeedingEvents: async (farmId, scheduleId, planId, filters = {}) => {
    const query = buildQuery(filters);
    return apiRequest(`/farms/${farmId}/feeding-schedules/${scheduleId}/feeding-plans/${planId}/feeding-events/${query ? `?${query}` : ""}`);
  },

  getCycleFeedingPlans: async (farmId, pondId, cycleId, feedingScheduleId) => {
    const query = buildQuery({ feeding_schedule: feedingScheduleId });
    return apiRequest(`/farms/${farmId}/ponds/${pondId}/cycles/${cycleId}/feeding-plans/${query ? `?${query}` : ""}`);
  },

  getCycleFeedingPlanById: async (farmId, pondId, cycleId, planId) => {
    return apiRequest(`/farms/${farmId}/ponds/${pondId}/cycles/${cycleId}/feeding-plans/${planId}/`);
  },

  createFeedingPlan: async (farmId, pondId, cycleId, payload) => {
    return apiRequest(`/farms/${farmId}/ponds/${pondId}/cycles/${cycleId}/feeding-plans/`, {
      method: "POST",
      body: payload,
    });
  },

  updateFeedingPlan: async (farmId, pondId, cycleId, planId, payload) => {
    const token = getToken();
    const response = await fetch(`${API_BASE}/farms/${farmId}/ponds/${pondId}/cycles/${cycleId}/feeding-plans/${planId}/`, {
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

  deleteFeedingPlan: async (farmId, pondId, cycleId, planId) => {
    return apiRequest(`/farms/${farmId}/ponds/${pondId}/cycles/${cycleId}/feeding-plans/${planId}/`, {
      method: "DELETE",
    });
  },

  getUnits: async () => {
    return apiRequest(`/unit/`);
  },

  updateFeedingEvent: async (farmId, pondId, cycleId, planId, eventId, payload) => {
    return apiRequest(`/farms/${farmId}/ponds/${pondId}/cycles/${cycleId}/feeding-plans/${planId}/feeding-events/${eventId}/`, {
      method: "PATCH",
      body: payload,
    });
  },

  getOccupiedRanges: async (farmId, cycleId) => {
    return apiRequest(`/farms/${farmId}/cycles/${cycleId}/feeding-plans/occupied-ranges/`);
  },
};
