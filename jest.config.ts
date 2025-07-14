import nextJest from "next/jest";
import type { Config } from "jest";

const createJestConfig = nextJest({
  dir: "./",
});

const customJestConfig: Config = {
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1", // ← mapeia `@/` para `src/`
  },
  moduleDirectories: ["node_modules", "<rootDir>/src"],
};

export default createJestConfig(customJestConfig);
