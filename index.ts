import { registerRootComponent } from 'expo';

import App from './App';

// Expo's web template ships <html lang="en">, so a screen reader would read
// this Spanish app with English pronunciation.
if (typeof document !== 'undefined') document.documentElement.lang = 'es';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
