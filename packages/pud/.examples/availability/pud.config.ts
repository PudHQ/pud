import { defineConfig } from "@pud.dev/lib";
import { leanAdapter } from "@pud.dev/lib/lean";

export default defineConfig({ adapter: leanAdapter({ replay: true }) });
