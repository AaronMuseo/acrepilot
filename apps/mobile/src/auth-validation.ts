import { identitySchema, passwordSchema, verifySchema } from '../../../packages/contracts';
import type { MessageKey } from '../../../packages/translations';
export type AuthErrors = Partial<Record<'identity' | 'password' | 'code', MessageKey>>;
export function validateAuth(mode: 'password' | 'requestCode' | 'verify', values: {identity: string; password: string; code: string}): AuthErrors {
  const errors: AuthErrors = {};
  if (mode !== 'verify') {
    if (!values.identity.trim()) errors.identity = 'identityRequired';
    else if (!identitySchema.safeParse(values.identity).success) errors.identity = 'identityInvalid';
  }
  if (mode === 'password') {
    if (!values.password.length) errors.password = 'passwordRequired';
    else if (!passwordSchema.safeParse(values.password).success) errors.password = 'passwordLength';
  }
  if (mode === 'verify' && !verifySchema.shape.code.safeParse(values.code).success) errors.code = 'codeFormat';
  return errors;
}
