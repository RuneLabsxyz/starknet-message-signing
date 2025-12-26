import { describe, it, expect, beforeEach } from 'vitest';
import { createTemplate, validateType, TypedDataError, setGlobalConfig, resetGlobalConfig } from '../src';

describe('createTemplate', () => {
  beforeEach(() => {
    resetGlobalConfig();
    setGlobalConfig({
      chainId: 'SN_SEPOLIA',
      domainName: 'TestApp'
    });
  });

  it('creates a template with correct id', () => {
    const template = createTemplate('Login', {
      Login: [
        { name: 'username', type: 'string' },
        { name: 'timestamp', type: 'felt' }
      ]
    });

    expect(template.id).toBe('Login');
  });

  it('generates valid typed data request', () => {
    const template = createTemplate('Login', {
      Login: [
        { name: 'username', type: 'string' },
        { name: 'timestamp', type: 'felt' }
      ]
    });

    const request = template.getRequest({
      username: 'alice',
      timestamp: 1234567890
    });

    expect(request.domain.name).toBe('TestApp');
    expect(request.domain.chainId).toBe('SN_SEPOLIA');
    expect(request.domain.version).toBe('1');
    expect(request.primaryType).toBe('Login');
    expect(request.message.username).toBe('alice');
    expect(request.message.timestamp).toBe(1234567890);
    expect(request.types.Login).toEqual([
      { name: 'username', type: 'string' },
      { name: 'timestamp', type: 'felt' }
    ]);
    expect(request.types.StarknetDomain).toBeDefined();
  });

  it('allows config override per request', () => {
    const template = createTemplate('Login', {
      Login: [{ name: 'username', type: 'string' }]
    });

    const request = template.getRequest(
      { username: 'alice' },
      { domainName: 'OtherApp', chainId: 'SN_MAIN' }
    );

    expect(request.domain.name).toBe('OtherApp');
    expect(request.domain.chainId).toBe('SN_MAIN');
  });

  it('validates correct typed data without throwing', () => {
    const template = createTemplate('Login', {
      Login: [
        { name: 'username', type: 'string' },
        { name: 'timestamp', type: 'felt' }
      ]
    });

    const request = template.getRequest({
      username: 'alice',
      timestamp: 1234567890
    });

    expect(() => template.validate(request)).not.toThrow();
  });

  it('throws on missing field', () => {
    const template = createTemplate('Login', {
      Login: [
        { name: 'username', type: 'string' },
        { name: 'timestamp', type: 'felt' }
      ]
    });

    const request = template.getRequest({
      username: 'alice',
      timestamp: 1234567890
    });

    // Remove timestamp from message
    delete (request.message as any).timestamp;

    expect(() => template.validate(request)).toThrow(TypedDataError);
    expect(() => template.validate(request)).toThrow(/missing field/);
  });

  it('throws on extra field', () => {
    const template = createTemplate('Login', {
      Login: [{ name: 'username', type: 'string' }]
    });

    const request = template.getRequest({ username: 'alice' });
    (request.message as any).extraField = 'unexpected';

    expect(() => template.validate(request)).toThrow(TypedDataError);
    expect(() => template.validate(request)).toThrow(/unexpected field/);
  });
});

describe('validateType', () => {
  const types = {
    TestStruct: [
      { name: 'stringField', type: 'string' },
      { name: 'feltField', type: 'felt' },
      { name: 'shortField', type: 'shortstring' }
    ],
    NestedStruct: [
      { name: 'inner', type: 'TestStruct' },
      { name: 'value', type: 'felt' }
    ]
  };

  it('validates string type', () => {
    expect(() =>
      validateType(types, { name: 'test', type: 'string' }, 'hello')
    ).not.toThrow();

    expect(() =>
      validateType(types, { name: 'test', type: 'string' }, 123)
    ).toThrow('Not a string');
  });

  it('validates felt type with string', () => {
    expect(() =>
      validateType(types, { name: 'test', type: 'felt' }, '123')
    ).not.toThrow();
  });

  it('validates felt type with number', () => {
    expect(() =>
      validateType(types, { name: 'test', type: 'felt' }, 123)
    ).not.toThrow();
  });

  it('validates felt type with bigint', () => {
    expect(() =>
      validateType(types, { name: 'test', type: 'felt' }, BigInt(123))
    ).not.toThrow();
  });

  it('rejects invalid felt type', () => {
    expect(() =>
      validateType(types, { name: 'test', type: 'felt' }, { invalid: true })
    ).toThrow('Not a felt');
  });

  it('validates shortstring type', () => {
    expect(() =>
      validateType(types, { name: 'test', type: 'shortstring' }, 'short')
    ).not.toThrow();
  });

  it('rejects too long shortstring', () => {
    const tooLong = 'a'.repeat(32); // shortstring max is 31 chars
    expect(() =>
      validateType(types, { name: 'test', type: 'shortstring' }, tooLong)
    ).toThrow('Not a shortstring');
  });

  it('validates nested types', () => {
    expect(() =>
      validateType(types, types.NestedStruct, {
        inner: {
          stringField: 'hello',
          feltField: 123,
          shortField: 'short'
        },
        value: 456
      })
    ).not.toThrow();
  });

  it('rejects invalid nested types', () => {
    expect(() =>
      validateType(types, types.NestedStruct, {
        inner: {
          stringField: 123, // Should be string
          feltField: 123,
          shortField: 'short'
        },
        value: 456
      })
    ).toThrow('Not a string');
  });

  it('rejects unsupported enum type', () => {
    expect(() =>
      validateType(types, { name: 'test', type: 'enum' }, 'value')
    ).toThrow('Type enum not supported');
  });

  it('rejects unsupported merkletree type', () => {
    expect(() =>
      validateType(types, { name: 'test', type: 'merkletree' }, 'value')
    ).toThrow('Type merkletree not supported');
  });

  it('rejects unknown types', () => {
    expect(() =>
      validateType(types, { name: 'test', type: 'UnknownType' }, 'value')
    ).toThrow('Type UnknownType not found');
  });
});

describe('TypedDataError', () => {
  it('creates error with message', () => {
    const error = new TypedDataError('Something went wrong');
    expect(error.message).toBe('Something went wrong');
    expect(error.fieldInfo).toEqual([]);
  });

  it('builds field path from nested errors', () => {
    const innerError = new TypedDataError('Not a string');
    const outerError = new TypedDataError('fieldName', innerError);

    expect(outerError.message).toBe('Not a string');
    expect(outerError.fieldInfo).toEqual(['fieldName']);
  });

  it('builds deep field path', () => {
    const innerError = new TypedDataError('Not a felt');
    const middleError = new TypedDataError('innerField', innerError);
    const outerError = new TypedDataError('outerField', middleError);

    expect(outerError.fieldInfo).toEqual(['outerField', 'innerField']);
    expect(outerError.toString()).toBe('TypedDataError: outerField->innerField: Not a felt');
  });
});
