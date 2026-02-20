import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import { motion } from 'framer-motion';
import { useAuthStore } from '@/store/authStore';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

export function Login() {
  const { setAuth, setLoading } = useAuthStore();

  const handleSuccess = async (response: CredentialResponse) => {
    if (!response.credential) return;
    setLoading(true);

    try {
      const res = await fetch(`${SERVER_URL}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: response.credential }),
      });

      if (!res.ok) {
        throw new Error('Authentication failed');
      }

      const data = await res.json();
      setAuth(data.user, data.token);
    } catch (err) {
      console.error('[Auth] Login failed:', err);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center felt-texture">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass p-6 sm:p-8 max-w-md w-full mx-4 space-y-6"
      >
        <div className="text-center space-y-2">
          <h1 className="font-display text-4xl sm:text-5xl font-extrabold text-gold text-shadow-lg">
            Dehla Pakad
          </h1>
          <p className="text-white/50 text-sm">The Classic Indian Card Game</p>
          <div className="flex justify-center gap-2 text-2xl">
            <span>♠</span><span className="text-red-500">♥</span>
            <span>♣</span><span className="text-red-500">♦</span>
          </div>
        </div>

        <div className="space-y-4 text-center">
          <p className="text-white/60 text-sm">Sign in to play with friends</p>
          <div className="flex justify-center">
            <GoogleLogin
              onSuccess={handleSuccess}
              onError={() => console.error('[Auth] Google login error')}
              theme="filled_black"
              shape="pill"
              size="large"
              text="signin_with"
            />
          </div>
        </div>
      </motion.div>
    </div>
  );
}
