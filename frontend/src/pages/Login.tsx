import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Package, ArrowRight } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('role', data.user.role);
        localStorage.setItem('name', data.user.name);
        
        if (data.user.role === 'AGENT') {
          navigate('/agent');
        } else if (data.user.role === 'ADMIN') {
          navigate('/admin');
        } else {
          navigate('/dashboard');
        }
      } else {
        alert(data.error || 'Login failed');
      }
    } catch (err) {
      alert('Network error');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md">
        
        <div className="flex justify-center mb-8">
          <div className="w-16 h-16 bg-brand-500 rounded-2xl flex items-center justify-center shadow-lg shadow-brand-500/30">
            <Package className="w-8 h-8 text-white" />
          </div>
        </div>
        
        <div className="glass-panel p-8 rounded-3xl">
          <h2 className="text-2xl font-bold text-center text-slate-900 mb-2">Welcome Back</h2>
          <p className="text-center text-slate-500 mb-8 text-sm">Sign in to track your deliveries</p>
          
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Email</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all"
                placeholder="you@example.com"
                required
              />
            </div>
            
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Password</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all"
                placeholder="••••••••"
                required
              />
            </div>
            
            <button 
              type="submit" 
              className="w-full bg-brand-500 hover:bg-brand-600 text-white font-semibold py-3 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center group"
            >
              <span>Sign In</span>
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </button>
          </form>
          
          <div className="mt-8 text-center text-sm text-slate-500">
            Don't have an account? <Link to="/register" className="text-brand-600 font-semibold hover:underline">Create one</Link>
          </div>
        </div>
        
      </div>
    </div>
  );
}
