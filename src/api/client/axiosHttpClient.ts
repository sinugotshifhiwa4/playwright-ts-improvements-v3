import axios, { AxiosResponse, AxiosRequestConfig } from 'axios';
import https from 'https';
import EnvironmentDetector from '../../config/environment/detector/detector';
import { ErrorCategory } from '../../utils/../config/types/enums/error-category.enum';
import { HTTP_MEDIA_TYPES } from './httpMediaType';
import ApiErrorHandler from '../../utils/errors/apiErrorHandler';
import ErrorHandler from '../../utils/errors/errorHandler';

export class AxiosHttpClient {
  private readonly defaultHeaders: Record<string, string>;
  private readonly httpsAgent?: https.Agent;

  /**
   * Initializes the HttpClient with default headers and SSL configuration.
   */
  constructor() {
    this.defaultHeaders = {
      'Content-Type': HTTP_MEDIA_TYPES.APPLICATION_JSON,
    };

    // Only create HTTPS agent for development environment
    if (EnvironmentDetector.isDevelopment()) {
      this.httpsAgent = new https.Agent({
        rejectUnauthorized: false,
      });
    }
  }

  /**
   * Creates axios configuration with appropriate SSL handling
   */
  private createAxiosConfig(headers?: Record<string, string>): AxiosRequestConfig {
    const config: AxiosRequestConfig = {
      headers: { ...this.defaultHeaders, ...headers },
    };

    if (this.httpsAgent) {
      config.httpsAgent = this.httpsAgent;
    }

    return config;
  }

  private createHeaders(authorizationHeader?: string): {
    [key: string]: string;
  } {
    const headers = { ...this.defaultHeaders };
    if (authorizationHeader) {
      headers['Authorization'] = authorizationHeader;
    }
    return headers;
  }

  /**
   * Sends an HTTP request using the specified method, endpoint, payload, and headers.
   * Returns both successful and error responses without throwing.
   *
   * @template T - The expected response type.
   * @param method - The HTTP method to use for the request
   * @param endpoint - The URL endpoint to which the request is sent.
   * @param payload - The optional payload to be included in the request body.
   * @param headers - Optional headers to be included in the request.
   * @returns A promise that resolves with the Axios response (success or error).
   * @throws Will only throw for non-HTTP errors (network issues, timeouts, etc.)
   */
  private async sendRequest<T>(
    method: 'get' | 'post' | 'put' | 'patch' | 'delete',
    endpoint: string,
    payload?: unknown,
    headers?: Record<string, string>,
  ): Promise<AxiosResponse<T>> {
    try {
      const config = this.createAxiosConfig(headers);

      // Use appropriate axios method based on HTTP verb
      switch (method) {
        case 'get':
        case 'delete':
          return await axios[method]<T>(endpoint, config);
        case 'post':
        case 'put':
        case 'patch':
          return await axios[method]<T>(endpoint, payload, config);
        default:
          throw new Error(`Unsupported HTTP method: ${method}`);
      }
    } catch (error) {
      return this.handleRequestError<T>(error, method, endpoint);
    }
  }

  // Public HTTP method implementations
  async get<T>(endpoint: string, authorization?: string): Promise<AxiosResponse<T>> {
    const headers = this.createHeaders(authorization);
    return this.sendRequest<T>('get', endpoint, undefined, headers);
  }

  async post<T>(
    endpoint: string,
    payload?: unknown,
    authorization?: string,
  ): Promise<AxiosResponse<T>> {
    const headers = this.createHeaders(authorization);
    return this.sendRequest<T>('post', endpoint, payload, headers);
  }

  async put<T>(
    endpoint: string,
    payload?: unknown,
    authorization?: string,
  ): Promise<AxiosResponse<T>> {
    const headers = this.createHeaders(authorization);
    return this.sendRequest<T>('put', endpoint, payload, headers);
  }

  async patch<T>(
    endpoint: string,
    payload?: unknown,
    authorization?: string,
  ): Promise<AxiosResponse<T>> {
    const headers = this.createHeaders(authorization);
    return this.sendRequest<T>('patch', endpoint, payload, headers);
  }

  async delete<T>(endpoint: string, authorization?: string): Promise<AxiosResponse<T>> {
    const headers = this.createHeaders(authorization);
    return this.sendRequest<T>('delete', endpoint, undefined, headers);
  }

  /**
   * Handles request errors consistently by always returning an error response
   */
  private handleRequestError<T>(
    error: unknown,
    method: string,
    endpoint: string,
  ): AxiosResponse<T> {
    const methodUpper = method.toUpperCase();

    if (axios.isAxiosError(error)) {
      ApiErrorHandler.captureApiError(
        error,
        `${methodUpper} Request`,
        `${methodUpper} request failed for ${endpoint}`,
      );

      if (error.response) {
        return error.response as AxiosResponse<T>;
      }

      // For network errors, timeouts, etc. where there's no HTTP response,
      // create a synthetic error response
      ErrorHandler.logAndContinue(
        `${methodUpper} request failed for ${endpoint}: ${error.message}`,
        'AxiosHttpClient.sendRequest',
      );

      // Return a synthetic error response for network issues
      return {
        data: null as T,
        status: 0, // 0 indicates network/connection error
        statusText: ErrorCategory.NETWORK,
        headers: {},
        config: error.config || {},
        request: error.request,
      } as AxiosResponse<T>;
    }

    // Handle non-Axios errors by creating a synthetic error response
    ErrorHandler.captureError(
      error,
      'AxiosHttpClient.sendRequest',
      `${methodUpper} request failed for ${endpoint}`,
    );

    // Return a synthetic error response for unexpected errors
    return {
      data: null as T,
      status: 0,
      statusText: ErrorCategory.UNKNOWN,
      headers: {},
      config: {} as AxiosRequestConfig,
      request: null,
    } as AxiosResponse<T>;
  }
}
