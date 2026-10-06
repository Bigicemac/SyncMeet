import { createContext, useContext, useState } from "react";
import { request } from "../lib/api";

const AuthContext = createContext(null);

const readStored = () => {
  try {
    return JSON.parse(localStorage.getItem("syncmeet-auth"));
  } catch {
    return null;
  }
};

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(readStored);
  const [loading, setLoading] = useState(false);

  const save = (value) => {
    if (value) localStorage.setItem("syncmeet-auth", JSON.stringify(value));
    else localStorage.removeItem("syncmeet-auth");
    setAuth(value);
  };

  const login = async (email, password) => {
    const cleanEmail = String(email || "").trim().toLowerCase();
    const data = await request("/api/auth/login", {
      method: "POST",
      body: { email: cleanEmail, password },
    });
    const user = data.user ?? {
      id: data.id,
      name: data.name,
      email: data.email,
    };
    save({ token: data.token, user });
  };

  const register = async (name, email, password) => {
    const cleanEmail = String(email || "").trim().toLowerCase();
    await request("/api/auth/register", {
      method: "POST",
      body: { name: name?.trim(), email: cleanEmail, password },
    });
    await login(cleanEmail, password);
  };

  const logout = () => save(null);

  return (
    <AuthContext.Provider
      value={{
        token: auth?.token,
        user: auth?.user,
        loading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
