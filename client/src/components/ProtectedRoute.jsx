// src/components/ProtectedRoute.jsx
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { user } = useAuth();

  // ✅ Check if user is authenticated (has ownerId)
  if (!user || !user.ownerId) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;
