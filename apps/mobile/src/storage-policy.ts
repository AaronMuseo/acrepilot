// Expo Go is an explicit fixture-only exception; native builds still fail closed.
export function storagePolicy(ownerId: string, expoGo: boolean, verificationKind: string) {
  if (!/^[a-f0-9-]{36}$/.test(ownerId)) throw new Error('INVALID_OWNER');
  if (expoGo && verificationKind !== 'development_fixture') throw new Error('EXPO_GO_REQUIRES_FIXTURE_ACCOUNT');
  return { encrypted: !expoGo, filename: `${expoGo ? 'expo-go-fixture' : 'account'}-${ownerId}.db` };
}
