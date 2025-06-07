import CryptoService from '../../../cryptography/services/encryptionService';
import { Credentials } from '../../../config/types/auth/credentials.types';
import SanitizationConfig from '../../../utils/sanitization/sanitizationConfig';
import ENV from '../variables/variables';
import ErrorHandler from '../../../utils/errors/errorHandler';

export class FetchLocalEnvironmentVariables {
  public async getAppVersion(): Promise<string> {
    return this.getEnvironmentVariable(
      () => ENV.APP_VERSION,
      'APP_VERSION',
      'getAppVersion',
      'Failed to get local app version',
      false,
    );
  }

  public async getTestPlatform(): Promise<string> {
    return this.getEnvironmentVariable(
      () => ENV.TEST_PLATFORM,
      'TEST_PLATFORM',
      'getTestPlatform',
      'Failed to get local test platform',
      false,
    );
  }

  public async getTestType(): Promise<string> {
    return this.getEnvironmentVariable(
      () => ENV.TEST_TYPE,
      'TEST_TYPE',
      'getTestType',
      'Failed to get local test type',
      false,
    );
  }

  /**
   * Get API base URL from local environment
   */
  public async getApiBaseUrl(): Promise<string> {
    return this.getEnvironmentVariable(
      () => ENV.API_BASE_URL,
      'API_URL',
      'getApiBaseUrl',
      'Failed to get local API base URL',
      false,
    );
  }

  /**
   * Decrypts credentials using the provided secret key
   */
  private async decryptCredentials(
    username: string,
    password: string,
    secretKey: string,
  ): Promise<Credentials> {
    try {
      return {
        username: await CryptoService.decrypt(username, secretKey),
        password: await CryptoService.decrypt(password, secretKey),
      };
    } catch (error) {
      ErrorHandler.captureError(error, 'decryptCredentials', 'Failed to decrypt credentials');
      throw error;
    }
  }

  /**
   * Verifies that the provided credentials contain both a username and password
   */
  private verifyCredentials(credentials: Credentials): void {
    if (!credentials.username || !credentials.password) {
      ErrorHandler.logAndThrow(
        'Invalid credentials: Missing username or password.',
        'FetchLocalEnvironmentVariables',
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
    sanitize: boolean = true,
  ): Promise<string> {
    try {
      const value = getValue();
      this.validateEnvironmentVariable(value, variableName);
      return sanitize ? SanitizationConfig.sanitizeString(value) : value;
    } catch (error) {
      ErrorHandler.captureError(error, methodName, errorMessage);
      throw error;
    }
  }
}
