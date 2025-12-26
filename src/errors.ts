/**
 * Error class for typed data validation errors with field path tracking.
 * Enables precise error messages like "Login->username->value: Not a string"
 */
export class TypedDataError extends Error {
  fieldInfo: string[] = [];

  constructor(fieldOrError: string | string[], childError?: TypedDataError) {
    if (childError === undefined) {
      super(fieldOrError as string);
      this.fieldInfo = [];
    } else {
      super(childError.message);
      if (Array.isArray(fieldOrError)) {
        this.fieldInfo = [...fieldOrError, ...childError.fieldInfo];
      } else {
        this.fieldInfo = [fieldOrError, ...childError.fieldInfo];
      }
    }
    Object.setPrototypeOf(this, TypedDataError.prototype);
  }

  toString(): string {
    if (this.fieldInfo.length === 0) {
      return `TypedDataError: ${this.message}`;
    }
    return `TypedDataError: ${this.fieldInfo.join('->')}: ${this.message}`;
  }
}
