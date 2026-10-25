import {initializeApp,getAuth,GoogleAuthProvider,signInWithPopup,setPersistence,inMemoryPersistence,signOut} from './vendor/firebase.js';
let auth=null;
export async function prepareGoogle(config){auth||=getAuth(initializeApp(config));await setPersistence(auth,inMemoryPersistence);}
export async function googleLogin(){
 const provider=new GoogleAuthProvider();provider.setCustomParameters({prompt:'select_account'});
 const credential=await signInWithPopup(auth,provider);
 try{const response=await fetch('/auth/firebase',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({idToken:await credential.user.getIdToken(),refreshToken:credential.user.refreshToken})});const data=await response.json();if(!response.ok)throw new Error(data.error||'Google login failed');location.replace('/');}finally{await signOut(auth);}
}
