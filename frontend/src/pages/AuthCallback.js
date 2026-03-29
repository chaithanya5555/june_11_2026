import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function AuthCallback() {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const hasProcessed = useRef(false);

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;
    const hash = window.location.hash;
    const match = hash.match(/session_id=([^&]+)/);
    if (!match) { navigate('/'); return; }
    (async () => {
      try {
        const res = await axios.post(`${API}/auth/session`, { session_id: match[1] }, { withCredentials: true });
        setUser(res.data);
        navigate('/dashboard', { state: { user: res.data }, replace: true });
      } catch { navigate('/'); }
    })();
  }, [navigate, setUser]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-white/20 border-t-[#007AFF] rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm text-white/40">Signing you in...</p>
      </div>
    </div>
  );
}
