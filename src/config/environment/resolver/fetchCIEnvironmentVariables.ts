import { Credentials } from '../../../config/types/auth/credentials.types';
import { CIEnvironmentVariables } from '../../../config/types/config/ci-environment.types';
import SanitizationConfig from '../../../utils/sanitization/sanitizationConfig';
import ErrorHandler from '../../../utils/errors/errorHandler';

export class FetchCIEnvironmentVariables {
  // Store CI credentials from environment variables
  private readonly ciEnvironmentVariables: CIEnvironmentVariables = {
    appVersion: process.env.CI_APP_VERSION!,
    testPlatform: process.env.CI_TEST_PLATFORM!,
    testType: process.env.CI_TEST_TYPE!,
    apiBaseUrl: process.env.CI_API_BASE_URL!,
    portalBaseUrl: process.env.CI_PORTAL_BASE_URL!,
    adminUsername: process.env.CI_ADMIN_USERNAME!,
    adminPassword: process.env.CI_ADMIN_PASSWORD!,
    portalUsername: process.env.CI_PORTAL_USERNAME!,
    portalPassword: process.env.CI_PORTAL_PASSWORD!,
    tokenUsername: process.env.CI_TOKEN_USERNAME!,
    tokenPassword: process.env.CI_TOKEN_PASSWORD!,
  };

  public async getAppVersion(): Promise<string> {
    return this.getEnvironmentVariable(
      () => this.ciEnvironmentVariables.appVersion,
      'CI_APP_VERSION',
      'getAppVersion',
      'Failed to get CI app version',
    );
  }

  public async getTestPlatform(): Promise<string> {
    return this.getEnvironmentVariable(
      () => this.ciEnvironmentVariables.testPlatform,
      'CI_TEST_PLATFORM',
      'getTestPlatform',
      'Failed to get CI test platform',
    );
  }

  public async getTestType(): Promise<string> {
    return this.getEnvironmentVariable(
      () => this.ciEnvironmentVariables.testType,
      'CI_TEST_TYPE',
      'getTestType',
      'Failed to get CI test type',
    );
  }

  /**
   * Get API base URL from CI environment variables
   */
  public async getApiBaseUrl(): Promise<string> {
    return this.getEnvironmentVariable(
      () => this.ciEnvironmentVariables.apiBaseUrl,
      'CI_API_BASE_URL',
      'getApiBaseUrl',
      'Failed to get CI API base URL',
    );
  }

  /**
   * Get portal base URL from CI environment variables
   */
  public async getPortalBaseUrl(): Promise<string> {
    return this.getEnvironmentVariable(
      () => this.ciEnvironmentVariables.portalBaseUrl,
      'CI_PORTAL_BASE_URL',
      'getPortalBaseUrl',
      'Failed to get CI portal base URL',
    );
  }

  public async getAdminCredentials(): Promise<Credentials> {
    this.verifyCredentials({
      username: this.ciEnvironmentVariables.adminUsername,
      password: this.ciEnvironmentVariables.adminPassword,
    });
    return {
      username: SanitizationConfig.sanitizeString(this.ciEnvironmentVariables.adminUsername),
      password: SanitizationConfig.sanitizeString(this.ciEnvironmentVariables.adminPassword),
    };
  }

  public async getPortalCredentials(): Promise<Credentials> {
    this.verifyCredentials({
      username: this.ciEnvironmentVariables.portalUsername,
      password: this.ciEnvironmentVariables.portalPassword,
    });
    return {
      username: SanitizationConfig.sanitizeString(this.ciEnvironmentVariables.portalUsername),
      password: SanitizationConfig.sanitizeString(this.ciEnvironmentVariables.portalPassword),
    };
  }

  public async getTokenCredentials(): Promise<Credentials> {
    this.verifyCredentials({
      username: this.ciEnvironmentVariables.tokenUsername,
      password: this.ciEnvironmentVariables.tokenPassword,
    });
    return {
      username: SanitizationConfig.sanitizeString(this.ciEnvironmentVariables.tokenUsername),
      password: SanitizationConfig.sanitizeString(this.ciEnvironmentVariables.tokenPassword),
    };
  }

  /**
   * Verifies that the provided credentials contain both a username and password
   */
  private verifyCredentials(credentials: Credentials): void {
    if (!credentials.username || !credentials.password) {
      ErrorHandler.logAndThrow(
        'Invalid credentials: Missing username or password.',
        'FetchCIEnvironmentVariables',
      );
    }
  }

  /**
   * Validates that an environment variable is not empty
   */
  private validateEnvironmentVariable(value: string, variableName: string): void {
    if (!value || value.trim() === '') {
      throw new Error(`Environment variable ${variableName} is not set or is empty`);
    }
  }

  /**
   * Generic method to retrieve and validate environment variables
   */
  private async getEnvironmentVariable(
    getValue: () => string,
    variableName: string,
    methodName: string,
    errorMessage: string,
  ): Promise<string> {
    try {
      const value = getValue();
      this.validateEnvironmentVariable(value, variableName);
      return SanitizationConfig.sanitizeString(value);
    } catch (error) {
      ErrorHandler.captureError(error, methodName, errorMessage);
      throw error;
    }
  }
}
