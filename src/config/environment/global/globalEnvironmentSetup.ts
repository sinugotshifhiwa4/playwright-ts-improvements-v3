import EnvironmentConfigLoader from '../../../utils/environment/environmentConfigManager';
import { EnvironmentSecretFileManager } from '../../../utils/environment/environmentSecretFileManager';
import ErrorHandler from '../../../utils/errors/errorHandler';

async function globalSetup(): Promise<void> {
  try {
    const environmentConfigLoader = new EnvironmentConfigLoader(new EnvironmentSecretFileManager());
    await environmentConfigLoader.initialize();
  } catch (error) {
    ErrorHandler.captureError(error, 'globalSetup', 'Global setup failed');
    throw error;
  }
}

export default globalSetup;
