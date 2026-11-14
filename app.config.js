// Extiende app.json con lo que no puede quedar en un repo público.
// GOOGLE_SERVICES_JSON es una variable de EAS de tipo archivo: al compilar,
// EAS la reemplaza por la ruta del google-services.json (Firebase, push en Android).
// Sin ella (Expo Go, web) la app arranca igual, pero Android no recibe push.
module.exports = ({ config }) => ({
	...config,
	android: {
		...config.android,
		googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? config.android?.googleServicesFile,
	},
});
