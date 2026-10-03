import {
  getSellableClassifications,
  isHarvestSellableByWeight,
  parseList,
} from "./salesUtils";

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
  } catch {
    payload = payloadText;
  }

  if (!response.ok) {
    const error = new Error(
      payload?.detail || payload?.message || `Error ${response.status}`
    );
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
}

export const salesService = {
  // Clients
  getClients: async (farmId, filters = {}) => {
    const query = buildQuery(filters);
    const data = await apiRequest(
      `/farms/${farmId}/clients/${query ? `?${query}` : ""}`
    );
    return parseList(data);
  },

  getClient: async (farmId, clientId) => {
    return apiRequest(`/farms/${farmId}/clients/${clientId}/`);
  },

  createClient: async (farmId, payload) => {
    return apiRequest(`/farms/${farmId}/clients/`, {
      method: "POST",
      body: payload,
    });
  },

  updateClient: async (farmId, clientId, payload) => {
    return apiRequest(`/farms/${farmId}/clients/${clientId}/`, {
      method: "PATCH",
      body: payload,
    });
  },

  canDeleteClient: async (farmId, clientId) => {
    return apiRequest(`/farms/${farmId}/clients/${clientId}/can-delete/`);
  },

  deleteClient: async (farmId, clientId) => {
    return apiRequest(`/farms/${farmId}/clients/${clientId}/`, {
      method: "DELETE",
    });
  },

  // Sales
  getSales: async (farmId, filters = {}) => {
    const query = buildQuery(filters);
    const data = await apiRequest(
      `/farms/${farmId}/sales/${query ? `?${query}` : ""}`
    );
    return parseList(data);
  },

  getSale: async (farmId, saleId) => {
    return apiRequest(`/farms/${farmId}/sales/${saleId}/`);
  },

  createSale: async (farmId, payload) => {
    return apiRequest(`/farms/${farmId}/sales/create/`, {
      method: "POST",
      body: payload,
    });
  },

  canEditSale: async (farmId, saleId) => {
    return apiRequest(`/farms/${farmId}/sales/${saleId}/can-edit/`);
  },

  editSale: async (farmId, saleId, payload) => {
    return apiRequest(`/farms/${farmId}/sales/${saleId}/edit/`, {
      method: "PATCH",
      body: payload,
    });
  },

  updateSaleObservations: async (farmId, saleId, observations) => {
    return apiRequest(`/farms/${farmId}/sales/${saleId}/observations/`, {
      method: "PATCH",
      body: { observations },
    });
  },

  getSalesByClient: async (farmId, clientId) => {
    const data = await apiRequest(
      `/farms/${farmId}/sales/by-client/${clientId}/`
    );
    return parseList(data);
  },

  getSalesByClassification: async (farmId, classificationId) => {
    const data = await apiRequest(
      `/farms/${farmId}/sales/by-harvest-classification/${classificationId}/`
    );
    return parseList(data);
  },

  // Sale details
  getSaleDetailsBySale: async (farmId, saleId) => {
    const data = await apiRequest(
      `/farms/${farmId}/sale-details/by-sale/${saleId}/`
    );
    return parseList(data);
  },

  updateSaleDetail: async (farmId, detailId, payload) => {
    return apiRequest(`/farms/${farmId}/sale-details/${detailId}/`, {
      method: "PATCH",
      body: payload,
    });
  },

  canEditSaleDetail: async (farmId, detailId) => {
    return apiRequest(`/farms/${farmId}/sale-details/${detailId}/can-edit/`);
  },

  // Harvests & classifications
  getHarvests: async (farmId) => {
    const data = await apiRequest(`/farms/${farmId}/harvests/`);
    return parseList(data);
  },

  /** Cosechas con peso vendible (> 0) en cabecera o en al menos una clasificación. */
  getHarvestsWithSellableStock: async (farmId) => {
    const harvests = await salesService.getHarvests(farmId);

    const results = await Promise.all(
      harvests.map(async (harvest) => {
        if (isHarvestSellableByWeight(harvest)) {
          return harvest;
        }
        try {
          const classifications = await salesService.getHarvestClassifications(
            farmId,
            harvest.id
          );
          return getSellableClassifications(classifications).length > 0
            ? harvest
            : null;
        } catch {
          return null;
        }
      })
    );

    return results.filter(Boolean);
  },

  getHarvestClassifications: async (farmId, harvestId) => {
    const data = await apiRequest(
      `/farms/${farmId}/harvests/${harvestId}/classifications/?only_available=true`
    );
    return parseList(data);
  },
};
