import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";

const ProfileContext = createContext();

export function ProfileProvider({ children }) {
  const [profiles, setProfiles] = useState([]);
  const navigate = useNavigate();
  const [activeProfile, setActiveProfile] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("activeProfile")) || null;
    } catch {
      return null;
    }
  });
  const [loadingProfiles, setLoadingProfiles] = useState(true);

  const fetchProfiles = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      toast.error("Token not found");
      setTimeout(() => {
        navigate("/login");
      }, 2000);
      setLoadingProfiles(false);
      return;
    }
    try {
      const res = await axios.get("http://localhost:3000/api/profile", {
        headers: { token },
      });
      const data = res.data || [];
      setProfiles(data);

      // Keep stored activeProfile in sync; if it's gone, pick first
      const stored = JSON.parse(
        localStorage.getItem("activeProfile") || "null",
      );
      const stillValid = stored && data.find((p) => p.id === stored.id);
      if (!stillValid && data.length > 0) {
        setActiveProfile(data[0]);
        localStorage.setItem("activeProfile", JSON.stringify(data[0]));
      } else if (stillValid) {
        const fresh = data.find((p) => p.id === stored.id);
        setActiveProfile(fresh);
        localStorage.setItem("activeProfile", JSON.stringify(fresh));
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingProfiles(false);
    }
  }, []);

  useEffect(() => {
    fetchProfiles();
    if (activeProfile == null) {
      toast.error("Failed To Load Profile Please Reselect Profile");
      setTimeout(() => {
        navigate("/profiles");
      }, 1000);
    }
  }, []);

  const switchProfile = useCallback((profile) => {
    setActiveProfile(profile);
    localStorage.setItem("activeProfile", JSON.stringify(profile));
  }, []);

  return (
    <ProfileContext.Provider
      value={{
        profiles,
        activeProfile,
        switchProfile,
        fetchProfiles,
        loadingProfiles,
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  return useContext(ProfileContext);
}
