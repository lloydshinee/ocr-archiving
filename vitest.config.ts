import { defineConfig } from "vitest/config"
import path from "path"

export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    globals: true,
    env: {
      NEXT_PUBLIC_SUPABASE_URL: "http://localhost:8000",
      NEXT_PUBLIC_SUPABASE_ANON_KEY:
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzgzMzM0NzAyLCJleHAiOjE5NDEwMTQ3MDJ9.asY2_7QeAGb_FhBeIR1B_djuwjXhjywVBf3GkOE3-bo",
      SUPABASE_SERVICE_ROLE_KEY:
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3ODMzMzQ3MDIsImV4cCI6MTk0MTAxNDcwMn0.pv3AcMLVyU06DwsRi-rqhDOrR8bUNdQJOATIdEC3gyw",
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname),
    },
  },
})
