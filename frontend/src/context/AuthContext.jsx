import { createContext, useContext, useEffect, useState } from "react";
import { login as apiLogin } from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem("sentrychain_user");
    const token = localStorage.getItem("sentrychain_token");
    if (storedUser && token) {
      setUser(JSON.parse(storedUser));
    }
    setReady(true);
  }, []);

  async function login(username, password) {
    const data = await apiLogin(username, password);
    localStorage.setItem("sentrychain_token", data.access_token);
    localStorage.setItem("sentrychain_user", JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  }

  function logout() {
    localStorage.removeItem("sentrychain_token");
    localStorage.removeItem("sentrychain_user");
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, ready }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
