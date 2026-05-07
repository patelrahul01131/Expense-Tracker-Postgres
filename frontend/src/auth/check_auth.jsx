import axios from "axios";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

const CheckAuth = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  if (!token) {
    toast.error("Token not found");
    navigate("/login");
    return false;
  }

  try {
    const response = axios.get("http://localhost:3000/api/auth/check", {
      headers: {
        token,
      },
    });
    return response.data.message;
  } catch (error) {
    toast.error("Token not found");
    navigate("/login");
    return false;
  }
};

export default CheckAuth;
