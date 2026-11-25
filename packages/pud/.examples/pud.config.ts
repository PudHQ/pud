import { defineConfig } from "@pud.dev/lib";
import { leanAdapter } from "@pud.dev/lib/lean";

const pud = defineConfig({ adapter: leanAdapter() });

export default pud;
