import winston, { format } from 'winston';
import moment from 'moment-timezone';
import path from 'path';
import fs from 'fs';
import { DEFAULT_LOGGER_CONFIG } from '../../../src/config/types/config/logger.types';
import type { EnvironmentStage } from '../../../src/config/environment/dotenv/types';

export default class WinstonLoggerFactory {
  /**
   * Creates a custom log format using winston's format.printf()
   * @returns {winston.Logform.Format} A winston format object
   */
  public static logCustomFormat() {
    // Remove try-catch as format.printf doesn't throw errors during creation
    return winston.format.printf(({ level, message, timestamp, ...meta }) => {
      const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
      return `${timestamp} [${level.toUpperCase()}]: ${message}${metaStr}`;
    });
  }

  /**
   * Creates a custom timestamp format using winston's format.timestamp()
   * @returns {winston.Logform.Format} A winston format object
   */
  public static customTimestampFormat() {
    return winston.format.timestamp({
      format: () =>
        moment().tz(DEFAULT_LOGGER_CONFIG.TIME_ZONE).format(DEFAULT_LOGGER_CONFIG.DATE_FORMAT),
    });
  }

  /**
   * Creates file transports for different log levels
   * @param loggingDir - The directory where log files will be saved
   * @returns Object containing all file transports
   */
  public static createFileTransports(loggingDir: string) {
    const timestampFormat = this.customTimestampFormat();
    const customFormat = this.logCustomFormat();

    const baseTransportConfig = {
      maxsize: DEFAULT_LOGGER_CONFIG.LOG_FILE_LIMIT,
      format: winston.format.combine(timestampFormat, customFormat),
    };

    return {
      info: new winston.transports.File({
        ...baseTransportConfig,
        filename: this.resolvePath(loggingDir, DEFAULT_LOGGER_CONFIG.LOG_FILE_INFO),
        level: DEFAULT_LOGGER_CONFIG.LOG_LEVEL_INFO,
        format: winston.format.combine(
          this.levelFilter(DEFAULT_LOGGER_CONFIG.LOG_LEVEL_INFO),
          timestampFormat,
          customFormat,
        ),
      }),
      warn: new winston.transports.File({
        ...baseTransportConfig,
        filename: this.resolvePath(loggingDir, DEFAULT_LOGGER_CONFIG.LOG_FILE_WARN),
        level: DEFAULT_LOGGER_CONFIG.LOG_LEVEL_WARN,
        format: winston.format.combine(
          this.levelFilter(DEFAULT_LOGGER_CONFIG.LOG_LEVEL_WARN),
          timestampFormat,
          customFormat,
        ),
      }),
      error: new winston.transports.File({
        ...baseTransportConfig,
        filename: this.resolvePath(loggingDir, DEFAULT_LOGGER_CONFIG.LOG_FILE_ERROR),
        level: DEFAULT_LOGGER_CONFIG.LOG_LEVEL_ERROR,
        format: winston.format.combine(
          this.levelFilter(DEFAULT_LOGGER_CONFIG.LOG_LEVEL_ERROR),
          timestampFormat,
          customFormat,
        ),
      }),
      debug: new winston.transports.File({
        ...baseTransportConfig,
        filename: this.resolvePath(loggingDir, DEFAULT_LOGGER_CONFIG.LOG_FILE_DEBUG),
        level: DEFAULT_LOGGER_CONFIG.LOG_LEVEL_DEBUG,
        format: winston.format.combine(
          this.levelFilter(DEFAULT_LOGGER_CONFIG.LOG_LEVEL_DEBUG),
          timestampFormat,
          customFormat,
        ),
      }),
    };
  }

  /**
   * Creates a console transport with environment-appropriate log level
   */
  public static createConsoleTransport() {
    const timestampFormat = this.customTimestampFormat();
    const customFormat = this.logCustomFormat();

    // Determine log level based on environment
    const environment = (process.env.ENV as EnvironmentStage) || 'dev';
    const consoleLevel = this.getConsoleLogLevel(environment);

    return new winston.transports.Console({
      level: consoleLevel,
      format: winston.format.combine(
        timestampFormat,
        winston.format.colorize({ all: true }), // Colorize entire message
        customFormat,
      ),
    });
  }

  /**
   * Creates a winston logger with all transports
   * @param loggingDir - The directory where log files will be saved
   * @returns {winston.Logger} The configured logger instance
   */
  public static createLogger(loggingDir: string): winston.Logger {
    this.ensureDirExists(loggingDir);

    const fileTransports = this.createFileTransports(loggingDir);
    const consoleTransport = this.createConsoleTransport();

    return winston.createLogger({
      level: DEFAULT_LOGGER_CONFIG.LOG_LEVEL_DEBUG, // Set to lowest level, let transports filter
      transports: [
        fileTransports.info,
        fileTransports.warn,
        fileTransports.error,
        fileTransports.debug,
        consoleTransport,
      ],
      // Add error handling for the logger itself
      exceptionHandlers: [
        new winston.transports.File({
          filename: this.resolvePath(loggingDir, 'exceptions.log'),
        }),
      ],
      rejectionHandlers: [
        new winston.transports.File({
          filename: this.resolvePath(loggingDir, 'rejections.log'),
        }),
      ],
    });
  }

  /**
   * Determines console log level based on environment
   */
  private static getConsoleLogLevel(environment: EnvironmentStage): string {
    const levelMap = {
      prod: DEFAULT_LOGGER_CONFIG.LOG_LEVEL_ERROR,
      uat: DEFAULT_LOGGER_CONFIG.LOG_LEVEL_INFO,
      dev: DEFAULT_LOGGER_CONFIG.LOG_LEVEL_DEBUG,
    };
    return levelMap[environment] || DEFAULT_LOGGER_CONFIG.LOG_LEVEL_DEBUG;
  }

  /**
   * Resolves a file path by combining directory and filename
   */
  public static resolvePath(dirpath: string, fileName: string): string {
    return path.resolve(dirpath, fileName);
  }

  /**
   * Ensures directory exists, creates if necessary
   */
  public static ensureDirExists(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  /**
   * Creates a level filter format
   */
  private static levelFilter(level: string) {
    return format(info => {
      return info.level === level ? info : false;
    })();
  }
}
