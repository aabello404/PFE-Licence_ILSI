import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { useAuthStore } from "../store/useAuthStore";
import { User } from "../types";

interface AuthContextType {
  currentUser: User | null;
  login: (email: string, password?: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
  isAuthReady: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const { user: currentUser, setUser, clearUser } = useAuthStore();
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    setIsAuthReady(true);
  }, []);

  const login = async (email: string, password?: string) => {
    const response = await fetch("http://localhost:3000/auth/signin", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });
    const data = await response.json();
    if (response.ok) {
      // Extract token and role from backend response

      const userData = {
        ...data,
        role: String(data.role).toUpperCase() as User["role"],
      };

      setUser(userData);
      localStorage.setItem("medvision_user", JSON.stringify(userData));
      localStorage.setItem("medvision_token", data.token);

      return true;
    }

    return false;
    // const foundUser = mockUsers.find(
    //   u => u.email === email && (u.password === password || u.password === undefined)
    // );
    // if (foundUser) {
    //   const userToStore = { ...foundUser };
    //   delete userToStore.password; // Don't store password in context/localStorage
    //   setUser(userToStore);
    //   localStorage.setItem('medvision_user', JSON.stringify(userToStore));
    //   return true;
    // }
    // return false;
  };

  const logout = () => {
    clearUser();
    localStorage.removeItem("medvision_user");
    localStorage.removeItem("medvision_token");
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        login,
        logout,
        isAuthenticated: !!currentUser,
        isAuthReady,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
