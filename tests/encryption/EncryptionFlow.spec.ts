import { test } from '../../fixtures/cryptography.fixture';
import {
  EnvironmentConstants,
  EnvironmentSecretKeys,
} from '../../src/config/environment/dotenv/constants';
import { EnvironmentFilePaths } from '../../src/config/environment/dotenv/mapping';

import ENV from '../../src/config/environment/variables/variables';
import logger from '../../src/utils/logging/loggerManager';

test.describe.serial('Encryption Flow @encryption', () => {
  test('Generate Secret Key @generate-key', async ({ environmentEncryptionCoordinator }) => {
    await environmentEncryptionCoordinator.generateAndStoreSecretKey(
      EnvironmentConstants.ENV_DIR,
      EnvironmentConstants.BASE_ENV_FILE,
      EnvironmentSecretKeys.UAT,
    );

    logger.info('Secret key generation completed successfully.');
  });

  test('Encrypt Credentials @encrypt', async ({ environmentEncryptionCoordinator }) => {
    const VARIABLES_TO_ENCRYPT = [ENV.PORTAL_USERNAME, ENV.PORTAL_PASSWORD];

    await environmentEncryptionCoordinator.orchestrateEnvironmentEncryption(
      EnvironmentConstants.ENV_DIR,
      EnvironmentFilePaths.uat,
      EnvironmentSecretKeys.UAT,
      VARIABLES_TO_ENCRYPT,
    );

    logger.info('Encryption process completed successfully.');
  });
});
