import { TypedDataRevision, shortString, type StarknetType, type TypedData } from 'starknet';
import type { GenericTypedData, StarknetSigningConfig } from './types';
import { TypedDataError } from './errors';
import { getGlobalConfig } from './config';

/**
 * Type helper for extracting field types from a schema.
 */
export type RealizedGenericData<KEY extends keyof T, T extends Record<string, StarknetType[]>> = {
  [K in T[KEY][number]['name']]: any;
};

/**
 * Interface for a signature template.
 */
export interface SignatureTemplate<KEY extends string, U extends TypedData['types']> {
  readonly id: KEY;
  getRequest(
    data: RealizedGenericData<KEY, U>,
    config?: Partial<StarknetSigningConfig>
  ): GenericTypedData<RealizedGenericData<KEY, U>>;
  validate(data: GenericTypedData<RealizedGenericData<KEY, U>>): void;
}

/**
 * Recursively validates data against a Starknet type definition.
 * Supports: felt, string, shortstring, and nested custom types.
 *
 * @throws TypedDataError if validation fails
 */
export function validateType(
  types: TypedData['types'],
  type: StarknetType | StarknetType[],
  data: any
): void {
  if (Array.isArray(type)) {
    // Check that all fields of data are defined in the type
    const dataFields = Object.keys(data);
    const typeFields = type.map((t) => t.name);
    const unknownFields = dataFields.filter((f) => !typeFields.includes(f));
    if (unknownFields.length > 0) {
      throw new TypedDataError(unknownFields[0], new TypedDataError('unexpected field'));
    }

    for (const field of type) {
      if (!(field.name in data)) {
        throw new TypedDataError(field.name, new TypedDataError('missing field'));
      }
      try {
        validateType(types, field, data[field.name]);
      } catch (error) {
        throw new TypedDataError(field.name, error as TypedDataError);
      }
    }
    return;
  }

  switch (type.type) {
    case 'shortstring':
      if (typeof data !== 'string' || !shortString.isShortString(data)) {
        throw new TypedDataError('Not a shortstring');
      }
      break;
    case 'string':
      if (typeof data !== 'string') {
        throw new TypedDataError('Not a string');
      }
      break;
    case 'felt':
      if (typeof data !== 'string' && typeof data !== 'bigint' && typeof data !== 'number') {
        throw new TypedDataError('Not a felt');
      }
      break;
    case 'enum':
    case 'merkletree':
      throw new TypedDataError(`Type ${type.type} not supported`);
    default:
      // Check if it is a nested type
      if (!(type.type in types)) {
        throw new TypedDataError(`Type ${type.type} not found in defined types`);
      }
      return validateType(types, types[type.type], data);
  }
}

/**
 * Creates a signature template for generating and validating typed data.
 *
 * @param primaryType - The name of the primary type in the schema
 * @param types - The type definitions following Starknet typed data spec
 * @returns A template object with getRequest and validate methods
 *
 * @example
 * const LoginTemplate = createTemplate('Login', {
 *   Login: [
 *     { name: 'username', type: 'string' },
 *     { name: 'timestamp', type: 'felt' }
 *   ]
 * });
 *
 * const request = LoginTemplate.getRequest({ username: 'alice', timestamp: Date.now() });
 * LoginTemplate.validate(request); // Throws if invalid
 */
export function createTemplate<U extends TypedData['types'], KEY extends keyof U & string>(
  primaryType: KEY,
  types: U
): SignatureTemplate<KEY, U> {
  return {
    get id() {
      return primaryType;
    },

    getRequest(
      data: RealizedGenericData<KEY, U>,
      config?: Partial<StarknetSigningConfig>
    ): GenericTypedData<RealizedGenericData<KEY, U>> {
      const effectiveConfig = { ...getGlobalConfig(), ...config };

      return {
        domain: {
          name: effectiveConfig.domainName,
          chainId: effectiveConfig.chainId,
          version: effectiveConfig.domainVersion || '1',
          revision: TypedDataRevision.ACTIVE
        },
        message: data,
        primaryType,
        types: {
          ...types,
          StarknetDomain: [
            { name: 'name', type: 'shortstring' },
            { name: 'version', type: 'shortstring' },
            { name: 'chainId', type: 'shortstring' },
            { name: 'revision', type: 'shortstring' }
          ]
        }
      };
    },

    validate(data: GenericTypedData<RealizedGenericData<KEY, U>>): void {
      try {
        validateType(data.types, data.types[data.primaryType], data.message);
      } catch (error) {
        throw new TypedDataError(data.primaryType, error as TypedDataError);
      }
    }
  };
}
