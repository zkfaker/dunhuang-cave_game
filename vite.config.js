import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/dunhuang_257_cave_game/",
  plugins: [react()],
  server: {
    host: true,
  },
});
