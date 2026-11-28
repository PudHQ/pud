import { defineConfig } from "pud.dev";
import { leanAdapter } from "pud.dev/lean";

const pud = defineConfig({ adapter: leanAdapter() });

export default pud;
