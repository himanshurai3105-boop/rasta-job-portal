import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import api from "../api/axios.js";
import { calculateCompletion, COMPLETION_THRESHOLD } from "../utils/profileCompletion.js";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const markedUserRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem("rasta_token");
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .get("/auth/me")
      .then((res) => setUser(res.data.data))
      .catch(() => localStorage.removeItem("rasta_token"))
      .finally(() => setLoading(false));
  }, []);

  // Profile pehli baar 80%+ hote hi "completed" flag save kar do,
  // taaki baad mein login par dobara Profile page par na bheja jaye
  useEffect(() => {
    if (!user || user.role !== "jobseeker" || user.profileCompleted) return;
    if (calculateCompletion(user) < COMPLETION_THRESHOLD) return;
    if (markedUserRef.current === user._id) return;

    markedUserRef.current = user._id;
    api
      .put("/auth/me", { profileCompleted: true })
      .then(() => {
        setUser((prev) => (prev && prev._id === user._id ? { ...prev, profileCompleted: true } : prev));
      })
      .catch(() => {
        markedUserRef.current = null;
      });
  }, [user]);

  // Token save hone ke baad poora profile laata hai, taaki Profile page par saari purani details dikhein
  const loadFullUser = async (basicData) => {
    try {
      const me = await api.get("/auth/me");
      setUser(me.data.data);
      return me.data.data;
    } catch (err) {
      setUser(basicData);
      return basicData;
    }
  };

  const login = async (email, password) => {
    const res = await api.post("/auth/login", { email, password });
    localStorage.setItem("rasta_token", res.data.data.token);
    return loadFullUser(res.data.data);
  };

  const register = async (payload) => {
    const res = await api.post("/auth/register", payload);
    localStorage.setItem("rasta_token", res.data.data.token);
    return loadFullUser(res.data.data);
  };

  const logout = () => {
    localStorage.removeItem("rasta_token");
    markedUserRef.current = null;
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);