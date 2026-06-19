/**
 * Jest config za čistu poslovnu logiku (lib/logic).
 * Koristi ts-jest (node okruženje) — bez RN preseta, jer testirani moduli
 * nemaju React Native / Supabase zavisnosti.
 */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/lib/logic'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: { module: 'commonjs', esModuleInterop: true } }],
  },
};
