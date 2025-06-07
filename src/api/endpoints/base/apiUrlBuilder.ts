import { EnvironmentResolver } from '../../../config/environment/resolver/environmentResolver';
import { ParameterDictionary, ResourceType } from '../resources/resources.type';
import ErrorHandler from '../../../utils/errors/errorHandler';
import logger from '../../../utils/logging/loggerManager';

export class ApiUrlBuilder {
  // Private properties
  private baseUrl: string | null = null;
  private initialized: boolean = false;
  private environmentResolver: EnvironmentResolver;

  /**
   * Constructor that accepts dependencies through injection
   * @param environmentResolver - The resolver to use for environment variables
   */
  constructor(environmentResolver: EnvironmentResolver) {
    this.environmentResolver = environmentResolver;
  }

  /**
   * Factory method for creating and initializing an ApiUrlBuilder instance
   *
   * @param environmentResolver - The resolver to use for environment variables
   * @returns {Promise<ApiUrlBuilder>} A promise that resolves with initialized ApiUrlBuilder
   * @throws Will throw an error if initialization fails
   */
  public static async create(environmentResolver: EnvironmentResolver): Promise<ApiUrlBuilder> {
    const builder = new ApiUrlBuilder(environmentResolver);
    await builder.initialize();
    return builder;
  }

  /**
   * Initializes the base URL for API requests by fetching it from environment variables.
   * This is the public interface for initialization.
   *
   * @returns {Promise<void>} A promise that resolves when the base URL is initialized.
   * @throws Will throw an error if the API base URL cannot be retrieved or is not set.
   */
  public async initialize(): Promise<void> {
    // Skip if already initialized
    if (this.initialized) {
      return;
    }

    try {
      const url = await this.environmentResolver.getApiBaseUrl();

      if (!url) {
        const errorMessage =
          'API Base URL is not set in the environment variable. Please check your environment configuration.';
        ErrorHandler.logAndThrow(errorMessage, 'initialize');
      }

      // Validate the URL format
      try {
        new URL(url);
      } catch (urlError) {
        const errorMessage = `${urlError} Invalid API Base URL format: ${url}`;
        ErrorHandler.logAndThrow(errorMessage, 'initialize');
      }

      logger.debug(`Loaded API Base URL: ${url}`);
      this.baseUrl = url;
      this.initialized = true;
    } catch (error) {
      ErrorHandler.captureError(error, 'initialize', 'Failed to initialize API base URL');
      throw error;
    }
  }

  /**
   * Initializes the ApiUrlBuilder if it's not already initialized,
   * but doesn't throw an error if initialization fails.
   *
   * @returns {Promise<boolean>} A promise that resolves to true if initialized successfully, false otherwise
   */
  public async initializeIfNeeded(): Promise<boolean> {
    if (this.initialized) {
      return true;
    }

    try {
      await this.initialize();
      return true;
    } catch (error) {
      logger.warn('Failed to initialize ApiUrlBuilder', error);
      return false;
    }
  }

  /**
   * Ensures the base URL is initialized before proceeding.
   * @throws Will throw an error if the base URL is not initialized.
   */
  private ensureInitialized(): void {
    if (!this.initialized || !this.baseUrl) {
      const errorMessage = 'ApiUrlBuilder is not initialized. Call initialize() first.';
      ErrorHandler.logAndThrow(errorMessage, 'ensureInitialized');
    }
  }

  /**
   * Normalizes an endpoint by ensuring it starts with a slash.
   * @param endpoint - The endpoint to normalize.
   * @returns The normalized endpoint.
   */
  private normalizeEndpoint(endpoint: string): string {
    return endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  }

  /**
   * Generates a URL for a given resource type by combining the base URL with the
   * provided endpoint. It logs the generated URL and returns it.
   *
   * @param endpoint - The endpoint to be combined with the base URL.
   * @param resourceType - The type of resource for which the URL is being generated.
   * @returns The generated URL as a string.
   * @throws If the builder is not initialized or an error occurs while generating the URL.
   */
  public generateResourceUrl(endpoint: string, resourceType: ResourceType): string {
    try {
      this.ensureInitialized();

      // Safe to assert non-null since we've checked in ensureInitialized
      const baseUrl = this.baseUrl as string;
      const normalizedEndpoint = this.normalizeEndpoint(endpoint);
      const constructedUrl = new URL(normalizedEndpoint, baseUrl).toString();

      logger.debug(`${resourceType} URL generated: ${constructedUrl}`);
      return constructedUrl;
    } catch (error) {
      ErrorHandler.captureError(
        error,
        'generateResourceUrl',
        `Failed to generate ${resourceType} URL`,
      );
      throw error;
    }
  }

  public validateParameters(params: ParameterDictionary, methodName: string): void {
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null || value === '') {
        const errorMessage = `Parameter '${key}' is required but was not provided or is empty`;
        ErrorHandler.logAndThrow(errorMessage, `${methodName}.validateParameters`);
      }
    }
  }

  public resolveEndpointId(
    template: string,
    params: Record<string, string | number>,
    options: { warnUnusedParams?: boolean } = {},
  ): string {
    try {
      this.validateInputs(template, params);

      const templateKeys = this.extractTemplateKeys(template);
      this.validateEndpointResolverParameters(templateKeys, params, options.warnUnusedParams);

      return this.replaceTemplateVariables(template, params);
    } catch (error) {
      ErrorHandler.captureError(error, 'resolveEndpointId', `Failed to resolve endpoint ID`);
      throw error;
    }
  }

  private validateInputs(template: string, params: Record<string, string | number>): void {
    if (!template) {
      ErrorHandler.logAndThrow('Template is required', 'validateInputs');
    }

    if (!params || typeof params !== 'object') {
      ErrorHandler.logAndThrow('Parameters must be a valid object', 'validateInputs');
    }
  }

  private extractTemplateKeys(template: string): Set<string> {
    const templateKeys = new Set<string>();
    const templateRegex = /\{([^}]+)\}/g;
    let match;

    while ((match = templateRegex.exec(template)) !== null) {
      templateKeys.add(match[1]);
    }

    return templateKeys;
  }

  private validateEndpointResolverParameters(
    templateKeys: Set<string>,
    params: Record<string, string | number>,
    warnUnusedParams = false,
  ): void {
    // Check for missing parameters
    const missingKeys = Array.from(templateKeys).filter(key => !(key in params));
    if (missingKeys.length > 0) {
      ErrorHandler.logAndThrow(
        `Missing parameter(s): ${missingKeys.join(', ')}`,
        'resolveEndpointId',
      );
    }

    // Conditionally warn about unused parameters
    if (warnUnusedParams) {
      const unusedKeys = Object.keys(params).filter(key => !templateKeys.has(key));
      if (unusedKeys.length > 0) {
        logger.warn(`Unused parameter(s) provided: ${unusedKeys.join(', ')}`);
      }
    }
  }

  private replaceTemplateVariables(
    template: string,
    params: Record<string, string | number>,
  ): string {
    return template.replace(/\{([^}]+)\}/g, (match, key) => {
      const value = params[key];
      if (value === null || value === undefined) {
        throw new Error(`Parameter '${key}' has null or undefined value`);
      }
      return encodeURIComponent(String(value));
    });
  }
}
