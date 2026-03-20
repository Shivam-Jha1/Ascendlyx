import { environment } from "../../../environments/environment"; 

export const CONFIG = {
  // API Configuration
  api: {
    baseUrl: environment.apiBaseUrl,
    timeout: environment.apiTimeout,
  },

  // Authentication
  auth: {
    tokenKey: environment.authTokenKey,
    userKey: environment.currentUserKey,
    sessionTimeout: environment.sessionTimeout,
  },

  // Logging
  logging: {
    level: environment.logLevel,
    enabled: true,
  },

  // Features
  features: {
    analytics: environment.enableAnalytics,
    monitoring: environment.enableMonitoring,
  },

  // Application
  app: {
    name: 'Ascendlyx',
    version: '1.0.0',
    environment: environment.production ? 'production' : 'development',
  },
};
