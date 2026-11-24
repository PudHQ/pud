import { defineConfig } from "@pud/cli";
import { leanAdapter } from "@pud/cli/lean";

const pud = defineConfig({ adapter: leanAdapter() });

export default pud;
