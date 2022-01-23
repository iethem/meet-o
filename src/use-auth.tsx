import React, { useState, useEffect, useContext, createContext } from "react";
import * as firebase from "firebase/app";
import { getAuth, onAuthStateChanged } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAdP7moOQ3nGCOfGlYngNCO4KIgVMwBOJ4",
  authDomain: "meet-o-test.firebaseapp.com",
  projectId: "meet-o-test",
  storageBucket: "meet-o-test.appspot.com",
  messagingSenderId: "826961976362",
  appId: "1:826961976362:web:ecf32081b3e7079a467753",
};

if (!firebase.getApps().length) {
  firebase.initializeApp(firebaseConfig);
}

// interface AuthContextType {
//   user: any;
//   signin: (user: string, callback: VoidFunction) => void;
//   signout: (callback: VoidFunction) => void;
// }

const firebaseAuth = getAuth();
export const getFirebaseAuth = () => firebaseAuth;

let AuthContext = createContext<any>(null!);

export function AuthProvider({ children }: any) {
  const auth = useAuthProvider();
  return <AuthContext.Provider value={auth}>{auth.loading ? <div>Loading...</div> : children}</AuthContext.Provider>;
}

export const useAuth = () => {
  return useContext(AuthContext);
};

function useAuthProvider() {
  const [user, setUser] = useState<any>();
  const [loading, setLoading] = useState<any>(true);

  useEffect(() => {
    const firebaseAuth = getAuth();
    const unsubscribe = onAuthStateChanged(firebaseAuth, (user) => {
      if (user) {
        setUser(user);
      } else {
        setUser(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return {
    user,
    loading,
  };
}
