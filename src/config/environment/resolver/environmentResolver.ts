import EnvironmentDetector from '../detector/detector';
import { FetchCIEnvironmentVariables } from './fetchCIEnvironmentVariables';
import { FetchLocalEnvironmentVariables } from './fetchLocalEnvironmentVariables';
import { Credentials } from '../../types/auth/credentials.types';
import { EnvironmentStage } from '../dotenv/types';
import ErrorHandler from '../../../utils/errors/errorHandler';

export class EnvironmentResolver {
  private fetchCIEnvironmentVariables: FetchCIEnvironmentVariables;
  private FetchLocalEnvironmentVariables: FetchLocalEnvironmentVariables;

  constructor(
    fetchCIEnvironmentVariables: FetchCIEnvironmentVariables,
    fetchLocalEnvironmentVariables: FetchLocalEnvironmentVariables,
  ) {
    this.fetchCIEnvironmentVariables = fetchCIEnvironmentVariables;
    this.FetchLocalEnvironmentVariables = fetchLocalEnvironmentVariables;
  }

  public async getAppVersion(): Promise<string> {
    return this.getEnvironmentValue(
      () => this.fetchCIEnvironmentVariables.getAppVersion(),
      () => this.FetchLocalEnvironmentVariables.getAppVersion(),
      'getAppVersion',
      'Failed to get app version',
    );
  }

  public async getTestPlatform(): Promise<string> {
    return this.getEnvironmentValue(
      () => this.fetchCIEnvironmentVariables.getTestPlatform(),
      () => this.FetchLocalEnvironmentVariables.getTestPlatform(),
      'getTestPlatform',
      'Failed to get test platform',
    );
  }

  public async getTestType(): Promise<string> {
    return this.getEnvironmentValue(
      () => this.fetchCIEnvironmentVariables.getTestType(),
      () => this.FetchLocalEnvironmentVariables.getTestType(),
      'getTestType',
      'Failed to get test type',
    );
  }

  public async getApiBaseUrl(): Promise<string> {
    return this.getEnvironmentValue(
      () => this.fetchCIEnvironmentVariables.getApiBaseUrl(),
      () => this.FetchLocalEnvironmentVariables.getApiBaseUrl(),
      'getApiBaseUrl',
      'Failed to get API base URL',
    );
  }

  public async getPortalBaseUrl(): Promise<string> {
    return this.getEnvironmentValue(
      () => this.fetchCIEnvironmentVariables.getPortalBaseUrl(),
      () => this.FetchLocalEnvironmentVariables.getPortalBaseUrl(),
      'getPortalBaseUrl',
      'Failed to get portal base URL',
    );
  }

  public async getAdminCredentials(
    environmentForSecretKeyVariable: EnvironmentStage,
  ): Promise<Credentials> {
    return this.getEnvironmentValue(
      () => this.fetchCIEnvironmentVariables.getAdminCredentials(),
      () =>
        this.FetchLocalEnvironmentVariables.getAdminCredentials(environmentForSecretKeyVariable),
      'getAdminCredentials',
      'Failed to get admin credentials',
    );
  }

  public async getPortalCredentials(
    environmentForSecretKeyVariable: EnvironmentStage,
  ): Promise<Credentials> {
    return this.getEnvironmentValue(
      () => this.fetchCIEnvironmentVariables.getPortalCredentials(),
      () =>
        this.FetchLocalEnvironmentVariables.getPortalCredentials(environmentForSecretKeyVariable),
      'getPortalCredentials',
      'Failed to get portal credentials',
    );
  }

  public async getTokenCredentials(
    environmentForSecretKeyVariable: EnvironmentStage,
  ): Promise<Credentials> {
    return this.getEnvironmentValue(
      () => this.fetchCIEnvironmentVariables.getTokenCredentials(),
      () =>
        this.FetchLocalEnvironmentVariables.getTokenCredentials(environmentForSecretKeyVariable),
      'getTokenCredentials',
      'Failed to get token credentials',
    );
  }

  /**
   * Generic method to fetch environment variables based on environment
   * @param ciMethod - Method to call in CI environment
   * @param localMethod - Method to call in local environment
   * @param methodName - Name of the calling method for error tracking
   * @param errorMessage - Error message for failures
   */
  private async getEnvironmentValue<T>(
    ciMethod: () => Promise<T>,
    localMethod: () => Promise<T>,
    methodName: string,
    errorMessage: string,
  ): Promise<T> {
    try {
      return await (EnvironmentDetector.isCI() ? ciMethod() : localMethod());
    } catch (error) {
      ErrorHandler.captureError(error, methodName, errorMessage);
      throw error;
    }
  }
}
