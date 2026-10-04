// Corre todos los scripts/verify*.ts; falla si alguno falla.
import { readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";

const files = readdirSync("scripts").filter((f) => /^verify.*\.ts$/.test(f));
let failed = 0;
for (const f of files) {
	const r = spawnSync("npx", ["tsx", `scripts/${f}`], { stdio: "inherit", shell: true });
	if (r.status !== 0) {
		console.error(`FALLO: ${f}`);
		failed++;
	}
}
process.exit(failed ? 1 : 0);
