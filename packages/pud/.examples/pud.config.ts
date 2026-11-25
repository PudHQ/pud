import { defineConfig } from "@pud.dev/pud";
import { leanAdapter } from "@pud.dev/pud/lean";

const pud = defineConfig({ adapter: leanAdapter() });

export default pud;
