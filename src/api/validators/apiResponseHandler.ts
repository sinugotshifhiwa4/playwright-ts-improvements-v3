import { AxiosResponse } from 'axios';
import TestExpectationRegistry from '../registry/testExpectationRegistry';
import { CustomError } from '../../utils/errors/customError';
import { ErrorCategory } from '../../config/types/enums/error-category.enum';
import ErrorHandler from '../../utils/errors/errorHandler';
import logger from '../../utils/logging/loggerManager';

export default class ApiResponseHandler {
  public static validateObjectResponse<T>(response: AxiosResponse, context: string): T {
    if (!response?.data || typeof response.data !== 'object' || Array.isArray(response.data)) {
      const type = Array.isArray(response?.data) ? 'array' : typeof response?.data;
      ErrorHandler.logAndThrow(`Invalid response: expected object, received ${type}`, context);
    }
    return response.data as T;
  }

  public static validateArrayResponse<T>(response: AxiosResponse, context: string): T[] {
    if (!Array.isArray(response?.data)) {
      const type = response?.data === null ? 'null' : typeof response?.data;
      ErrorHandler.logAndThrow(`Invalid response: expected array, received ${type}`, context);
    }
    return response.data as T[];
  }

  public static extractPropertyFromResponse<T>(
    response: AxiosResponse,
    propertyPath: string,
    context: string,
  ): T {
    try {
      // Validate response structure
      const responseData = this.validateObjectResponse(response, context);
      // Extract property using dot notation support
      const extractedValue = this.getNestedProperty(
        responseData as Record<string, unknown>,
        propertyPath,
      );
      // Validate extracted value
      this.validateExtractedValue(extractedValue, propertyPath, context);
      return extractedValue as T;
    } catch (error) {
      ErrorHandler.captureError(
        error,
        context,
        `Failed to extract '${propertyPath}' from response`,
      );
      throw error;
    }
  }

  private static getNestedProperty(obj: Record<string, unknown>, path: string): unknown {
    return path.split('.').reduce((current: unknown, key: string) => {
      return (current as Record<string, unknown>)?.[key];
    }, obj);
  }

  private static validateExtractedValue(
    value: unknown,
    propertyPath: string,
    context: string,
  ): void {
    if (value === undefined) {
      ErrorHandler.logAndThrow(`Property '${propertyPath}' not found in response`, context);
    }
    if (value === null) {
      ErrorHandler.logAndThrow(`Property '${propertyPath}' is null in response`, context);
    }
  }

  /**
   * Ensures the API response is not null, throwing an error if it is.
   * Logs the status of the response if valid.
   */
  public static assertResponseNotNull(
    response: AxiosResponse | null,
    context: string,
  ): AxiosResponse {
    if (!response) {
      const errorMessage = `Received null response from [${context}].`;
      const isNegativeTest = TestExpectationRegistry.isNegativeTest(context);
      if (isNegativeTest) {
        logger.info(`Received null response as expected for negative test: ${context}`);
        throw new CustomError(ErrorCategory.EXPECTED_FAILURE, { context }, errorMessage);
      }
      throw new CustomError(ErrorCategory.CONSTRAINT, { context }, errorMessage);
    }
    return response;
  }

  /**
   * Validates response data existence and handles empty responses based on allowEmptyResponse flag
   */
  public static validateResponseData(
    response: AxiosResponse,
    context: string,
    allowEmptyResponse: boolean = false,
  ): void {
    // Handle empty response data based on allowEmptyResponse flag
    if (!response.data || response.data === '') {
      if (allowEmptyResponse) {
        logger.info('Empty response data received - treating as valid response');
        return;
      } else {
        const noDataError = new Error('No response data available');
        logger.error(noDataError.message);
        throw noDataError;
      }
    }
  }

  /**
   * Validates HTTP status codes and throws errors for >= 400
   */
  public static validateHttpStatus(response: AxiosResponse): void {
    if (response.status >= 400) {
      const {
        code = 'UNKNOWN_CODE',
        type = 'UNKNOWN_TYPE',
        message: errorMessage = 'Unspecified error occurred',
      } = response.data;

      // Create a detailed error with comprehensive information
      const detailedError = new Error(errorMessage);
      Object.assign(detailedError, {
        status: response.status,
        code,
        type,
        responseData: response.data,
      });

      // Log detailed error information
      logger.error(`HTTP Error: ${response.status}`, {
        code,
        type,
        message: errorMessage,
        fullResponse: response.data,
      });

      throw detailedError;
    }
  }
}
