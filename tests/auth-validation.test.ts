import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateAuth } from '../apps/mobile/src/auth-validation';
import { messages } from '../packages/translations';
test('sign-in shows separate translated errors for empty and malformed fields', () => {
  const errors = validateAuth('password', {identity: '', password: '', code: ''});
  assert.deepEqual(errors, {identity: 'identityRequired', password: 'passwordRequired'});
  for (const key of Object.values(errors)) { assert.ok(messages.en[key]); assert.ok(messages.sw[key]); }
  assert.deepEqual(validateAuth('password', {identity: '0712345678', password: 'short', code: ''}), {identity: 'identityInvalid', password: 'passwordLength'});
  assert.deepEqual(validateAuth('password', {identity: '  DEMO@example.test ', password: 'test passphrase 2026', code: ''}), {});
});
test('code sign-in does not require a password and verification requires exactly six digits', () => {
  assert.deepEqual(validateAuth('requestCode', {identity: '+254712345678', password: '', code: ''}), {});
  for (const code of ['', '12345', '1234567', '12a456']) assert.deepEqual(validateAuth('verify', {identity: '', password: '', code}), {code: 'codeFormat'});
  assert.deepEqual(validateAuth('verify', {identity: '', password: '', code: '123456'}), {});
});
