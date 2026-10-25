import {build} from 'esbuild';
await build({stdin:{contents:"export {initializeApp} from 'firebase/app'; export {getAuth,GoogleAuthProvider,signInWithPopup,setPersistence,inMemoryPersistence,signOut} from 'firebase/auth';",resolveDir:process.cwd()},bundle:true,format:'esm',platform:'browser',target:['es2020'],minify:true,outfile:'public/vendor/firebase.js',legalComments:'eof'});
