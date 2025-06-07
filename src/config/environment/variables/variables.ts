/**
 * Runtime environment variables
 */
import type { EnvironmentStage } from '../dotenv/types';

export default class EnvironmentVariables {
  // Configuration
  public static readonly APP_VERSION = process.env.APP_VERSION!;
  public static readonly TEST_PLATFORM = process.env.TEST_PLATFORM!;
  public static readonly TEST_TYPE = process.env.TEST_TYPE!;

  // API
  public static readonly API_BASE_URL = process.env.API_BASE_URL!;

  public static readonly PORTAL_BASE_URL = process.env.PORTAL_BASE_URL!;

  public static readonly ADMIN_USERNAME = process.env.ADMIN_USERNAME!;
  public static readonly ADMIN_PASSWORD = process.env.ADMIN_PASSWORD!;

  public static readonly PORTAL_USERNAME = process.env.PORTAL_USERNAME!;
  public static readonly PORTAL_PASSWORD = process.env.PORTAL_PASSWORD!;

  public static readonly TOKEN_USERNAME = process.env.TOKEN_USERNAME!;
  public static readonly TOKEN_PASSWORD = process.env.TOKEN_PASSWORD!;

  // Environment detection
  public static readonly ENV = (process.env.ENV as EnvironmentStage) || 'dev';
}
