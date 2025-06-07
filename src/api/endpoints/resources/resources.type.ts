// Types
export type ResourceType =
  | 'Application'
  | 'Application Feature'
  | 'Certificate'
  | 'Login Event'
  | 'User';

export enum ApplicationModelEndpointRoot {
  REST_V1 = '/rest/v1',
  API_V1 = '/api/v1',
}

// Types for parameter validation
export type PrimitiveParameterValue = string | number | boolean;
export type ParameterDictionary = Record<string, PrimitiveParameterValue>;
