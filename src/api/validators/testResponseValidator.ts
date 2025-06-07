import { AxiosResponse, AxiosError } from 'axios';
import { CustomError } from '../../utils/errors/customError';
import { ErrorCategory } from '../../config/types/enums/error-category.enum';
import TestExpectationRegistry from '../registry/testExpectationRegistry';
import ApiResponseHandler from './apiResponseHandler';
import ErrorHandler from '../../utils/errors/errorHandler';
import logger from '../../utils/logging/loggerManager';

export default class TestResponseValidator {
  /**
   * General method to validate any response with proper context checking
   * @param response - The API response
   * @param expectedStatusCode - The expected status code
   * @param context - The operation context
   * @param forceTestType - Optional: force a specific test type validation
   * @param allowEmptyResponse - Optional: allow empty response data (default: false)
   */
  public static validateResponse(
    response: AxiosResponse | null,
    expectedStatusCode: number,
    context: string,
    forceTestType?: 'positive' | 'negative',
    allowEmptyResponse: boolean = false,
  ): void {
    const isNegativeTest = TestExpectationRegistry.isNegativeTest(context);
    const actualTestType = isNegativeTest ? 'negative' : 'positive';

    this.logTestTypeDiscrepancy(forceTestType, actualTestType, context);

    // Route to appropriate validation method
    if (isNegativeTest) {
      this.validateNegativeTestResponse(response, expectedStatusCode, context);
    } else {
      this.validatePositiveTestResponse(response, expectedStatusCode, context, allowEmptyResponse);
    }
  }

  /**
   * Validates API responses for positive test flows with comprehensive error handling.
   */
  private static validatePositiveTestResponse(
    response: AxiosResponse | null,
    expectedStatusCode: number,
    context: string,
    allowEmptyResponse: boolean = false,
  ): void {
    try {
      const validatedResponse = ApiResponseHandler.assertResponseNotNull(response, context);
      this.validateStatusCode(validatedResponse.status, expectedStatusCode, context);
      ApiResponseHandler.validateResponseData(validatedResponse, context, allowEmptyResponse);
      ApiResponseHandler.validateHttpStatus(validatedResponse);
    } catch (error) {
      if (this.isExpectedNegativeTestFailure(error, context)) {
        return;
      }

      ErrorHandler.captureError(
        error,
        'validatePositiveTestResponse',
        'Failed to validate API response',
      );
      throw error;
    }
  }

  private static validateNegativeTestResponse(
    response: AxiosResponse | null,
    expectedStatusCode: number,
    context: string,
  ): void {
    const isNegativeTest = TestExpectationRegistry.isNegativeTest(context);

    this.logNegativeTestContextInfo(isNegativeTest, context, expectedStatusCode);

    try {
      // Handle null response for negative tests
      if (!response && isNegativeTest) {
        logger.info(`Null response received as expected for negative test [${context}]`);
        return;
      }

      const validatedResponse = ApiResponseHandler.assertResponseNotNull(response, context);

      // Check if status is valid for negative test
      if (isNegativeTest && this.isValidNegativeTestStatus(validatedResponse.status, context)) {
        logger.info(
          `Negative test [${context}] passed as expected with status: ${validatedResponse.status}`,
        );
        return;
      }

      // Route validation based on test type
      if (isNegativeTest) {
        this.handleNegativeTestResponse(validatedResponse.status, context);
      } else {
        this.validateStatusCode(validatedResponse.status, expectedStatusCode, context);
      }
    } catch (error) {
      if (isNegativeTest && this.handleNegativeTestError(error, context)) {
        return;
      }

      logger.error(
        `Response Validation Failed in [${context}]: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      throw error;
    }
  }

  /**
   * Validates if the actual status code matches the registered expectations.
   * ALWAYS prioritizes registered expectations over the passed expectedStatusCode parameter.
   */
  private static validateStatusCode(actual: number, expected: number, context: string): void {
    const expectation = TestExpectationRegistry.getExpectation(context);
    const registeredExpectedCodes = expectation?.expectedStatusCodes || [];

    // Priority 1: Check registered expectations
    if (registeredExpectedCodes.length > 0) {
      return this.validateAgainstRegisteredExpectations(
        actual,
        expected,
        context,
        registeredExpectedCodes,
      );
    }

    // Priority 2: Fallback to passed parameter
    return this.validateAgainstPassedParameter(actual, expected, context);
  }

  /**
   * Validates status code against registered expectations
   */
  private static validateAgainstRegisteredExpectations(
    actual: number,
    expected: number,
    context: string,
    registeredExpectedCodes: number[],
  ): void {
    if (registeredExpectedCodes.includes(actual)) {
      logger.info(
        `Status validation PASSED [${context}]: ${actual} matches registered expectation [${registeredExpectedCodes.join(', ')}]`,
      );
      return;
    }

    const errorMessage = `Status validation FAILED [${context}] - Registered expectation: [${registeredExpectedCodes.join(' or ')}], Actual: ${actual}`;
    logger.error(errorMessage, {
      context,
      registeredExpectedCodes,
      actualStatusCode: actual,
      passedExpectedCode: expected,
      isNegativeTest: TestExpectationRegistry.isNegativeTest(context),
      validationSource: 'registered_expectations',
    });

    throw new CustomError(
      ErrorCategory.CONSTRAINT,
      {
        context,
        registeredExpectedCodes,
        actualStatusCode: actual,
        passedExpectedCode: expected,
      },
      errorMessage,
    );
  }

  /**
   * Validates status code against passed parameter (fallback)
   */
  private static validateAgainstPassedParameter(
    actual: number,
    expected: number,
    context: string,
  ): void {
    logger.warn(
      `No registered expectations found for [${context}], falling back to passed parameter: ${expected}`,
    );

    if (actual === expected) {
      logger.info(`Status validation PASSED [${context}]: ${actual} (fallback validation)`);
      return;
    }

    // Check negative test alternative logic
    if (
      TestExpectationRegistry.isNegativeTest(context) &&
      this.isValidNegativeTestStatus(actual, context)
    ) {
      return;
    }

    this.throwStatusCodeMismatchError(actual, expected, context);
  }

  /**
   * Handles status validation for negative test responses
   */
  private static handleNegativeTestResponse(status: number, context: string): void {
    if (this.isValidNegativeTestStatus(status, context)) {
      return;
    }

    const expectation = TestExpectationRegistry.getExpectation(context);
    const expectedCodes = expectation?.expectedStatusCodes || [];
    const errorMessage = `Negative test [${context}] status code mismatch - Expected: ${expectedCodes.join(' or ')}, Received: ${status}`;

    logger.error(errorMessage, {
      context,
      expectedStatusCodes: expectedCodes,
      actualStatusCode: status,
      isNegativeTest: true,
    });

    throw new CustomError(
      ErrorCategory.CONSTRAINT,
      {
        context,
        expectedStatusCodes: expectedCodes,
        actualStatusCode: status,
        isNegativeTest: true,
      },
      errorMessage,
    );
  }

  /**
   * Checks if a status code is valid for a negative test
   */
  private static isValidNegativeTestStatus(actual: number, context: string): boolean {
    if (TestExpectationRegistry.isExpectedStatus(context, actual)) {
      logger.info(`Received expected status code ${actual} for negative test: ${context}`);
      return true;
    }

    const expectation = TestExpectationRegistry.getExpectation(context);
    const expectedCodes = expectation?.expectedStatusCodes || [];

    logger.error(
      `Status code mismatch in negative test [${context}] - Expected: ${expectedCodes.join(' or ')}, Received: ${actual}`,
      {
        context,
        expectedStatusCodes: expectedCodes,
        actualStatusCode: actual,
        isNegativeTest: true,
      },
    );

    return false;
  }

  /**
   * Handles error responses in negative test context
   */
  private static handleNegativeTestError(error: unknown, context: string): boolean {
    // Expected failure for negative test
    if (this.isExpectedNegativeTestFailure(error, context)) {
      logger.info(`Expected failure handled in negative test [${context}]`);
      return true;
    }

    // Constraint violation - must fail
    if (error instanceof CustomError && error.category === ErrorCategory.CONSTRAINT) {
      ErrorHandler.logAndThrow(
        `Negative test validation failed [${context}]: ${error.message}`,
        'handleNegativeTestError',
      );
    }

    // Handle AxiosError with response
    if (error instanceof AxiosError && error.response) {
      return this.handleAxiosErrorInNegativeTest(error, context);
    }

    // Handle non-HTTP errors
    return this.handleNonHttpErrorInNegativeTest(error, context);
  }

  /**
   * Handles AxiosError in negative test context
   */
  private static handleAxiosErrorInNegativeTest(error: AxiosError, context: string): boolean {
    const actualStatus = error.response!.status;
    const expectation = TestExpectationRegistry.getExpectation(context);
    const registeredExpectedCodes = expectation?.expectedStatusCodes || [];

    if (registeredExpectedCodes.length === 0) {
      ErrorHandler.logAndThrow(
        `Negative test [${context}] has no registered expected status codes for validation`,
        'handleNegativeTestError',
      );
    }

    if (registeredExpectedCodes.includes(actualStatus)) {
      logger.info(
        `Negative test [${context}] PASSED - Status ${actualStatus} matches registered expectations [${registeredExpectedCodes.join(', ')}]`,
      );
      return true;
    } else {
      ErrorHandler.logAndThrow(
        `Negative test [${context}] failed: Expected status [${registeredExpectedCodes.join(' or ')}], but received ${actualStatus}`,
        'handleNegativeTestError',
      );
    }

    return false;
  }

  /**
   * Handles non-HTTP errors in negative test context
   */
  private static handleNonHttpErrorInNegativeTest(error: unknown, context: string): boolean {
    const errorMessage = error instanceof Error ? error.message : String(error);

    logger.info(`Non-HTTP error in negative test [${context}]: ${errorMessage}`, {
      context,
      errorType: 'NON_HTTP_ERROR',
      error: errorMessage,
    });

    logger.info(`Non-HTTP error treated as expected behavior in negative test [${context}]`);
    return true;
  }

  /**
   * Logs test type discrepancy information
   */
  private static logTestTypeDiscrepancy(
    forceTestType: 'positive' | 'negative' | undefined,
    actualTestType: string,
    context: string,
  ): void {
    if (forceTestType && forceTestType !== actualTestType) {
      const expectation = TestExpectationRegistry.getExpectation(context);
      logger.info(`Test type information for context '${context}'`, {
        context,
        registeredType: actualTestType,
        forcedType: forceTestType,
        testExpectation: {
          expectedStatusCodes: expectation?.expectedStatusCodes || [],
          isNegativeTest: expectation?.isNegativeTest || false,
        },
        message: `Context is registered as ${actualTestType} test but validation requested as ${forceTestType}`,
      });
    }
  }

  /**
   * Logs negative test context information
   */
  private static logNegativeTestContextInfo(
    isNegativeTest: boolean,
    context: string,
    expectedStatusCode: number,
  ): void {
    if (!isNegativeTest) {
      const expectation = TestExpectationRegistry.getExpectation(context);
      logger.info(`Context '${context}' is registered as positive test`, {
        context,
        method: 'validateNegativeTestResponse',
        expectedStatusCode,
        isNegativeTest: false,
        testExpectation: {
          expectedStatusCodes: expectation?.expectedStatusCodes || [],
          isNegativeTest: expectation?.isNegativeTest || false,
        },
        message: 'This context is configured for positive test scenarios',
      });
    }
  }

  /**
   * Check if an error is an expected failure in a negative test
   */
  private static isExpectedNegativeTestFailure(error: unknown, context: string): boolean {
    if (error instanceof CustomError && error.category === ErrorCategory.EXPECTED_FAILURE) {
      logger.info(`Expected failure in negative test [${context}]: ${error.message}`);
      return true;
    }
    return false;
  }

  /**
   * Throws an error for status code mismatch
   */
  private static throwStatusCodeMismatchError(
    actual: number,
    expected: number,
    context: string,
  ): void {
    const errorMessage = `Status code mismatch [${context}] - Expected: ${expected}, Received: ${actual}.`;
    logger.error(errorMessage);
    throw new CustomError(ErrorCategory.CONSTRAINT, { context }, errorMessage);
  }
}
