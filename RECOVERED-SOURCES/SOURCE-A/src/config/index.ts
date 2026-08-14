/**
 * SMS — School Management System
 * System Configuration Baseline
 */

export const SYSTEM_CONFIG = {
  name: 'SMS — School Management System',
  shortName: 'SMS',
  version: '1.0.0-foundation',
  copyright: {
    author: 'Eng. Jan Gamal Zikry',
    email: 'Jan.Zikry@Gmail.com',
    phone: '02 0100 36 345 38',
    notice: '© Eng. Jan Gamal Zikry',
  },
  server: {
    port: parseInt(process.env.PORT || '3000', 10),
    host: '0.0.0.0',
    env: process.env.NODE_ENV || 'development',
    corsOrigin: process.env.CORS_ORIGIN || '*',
  },
  database: {
    url: process.env.DATABASE_URL || 'file:./dev.db',
  },
} as const;

export default SYSTEM_CONFIG;
