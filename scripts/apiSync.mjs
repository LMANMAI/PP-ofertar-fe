// Copia el contrato de la API desde el repo del backend (../PP-ofertar/openapi.json).
// Uso: npm run api:sync && npm run api:types
import { copyFileSync, existsSync } from "node:fs";

const origen = "../PP-ofertar/openapi.json";
if (!existsSync(origen)) {
	console.error(`No encuentro ${origen}. Clonalo junto a este repo o copiá openapi.json a mano en src/api/.`);
	process.exit(1);
}
copyFileSync(origen, "src/api/openapi.json");
console.log("src/api/openapi.json actualizado. Ahora: npm run api:types");
