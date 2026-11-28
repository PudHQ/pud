import { defineConfig } from "pud.dev";
import { leanAdapter } from "pud.dev/lean";

export default defineConfig({ adapter: leanAdapter({ replay: true }) });
