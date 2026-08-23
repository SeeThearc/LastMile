import { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { Package, Map, History, User, LogOut } from 'lucide-react';

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;
  
  const role = localStorage.getItem('role');
  const name = localStorage.getItem('name') || 'User';

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center">
      
      <nav className="fixed top-6 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none">
        <div className="glass-panel px-6 py-3 rounded-full flex items-center space-x-8 pointer-events-auto">
          
          <Link to="/dashboard" className="flex items-center space-x-2 text-brand-600 font-bold text-lg mr-4">
            <Package className="w-6 h-6" />
            <span>LastMile</span>
          </Link>

          <div className="flex space-x-2">
            <Link 
              to="/dashboard" 
              className={`flex items-center space-x-2 px-4 py-2 rounded-full transition-all ${
                isActive('/dashboard') ? 'bg-brand-500 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Map className="w-4 h-4" />
              <span className="text-sm font-medium">Tracking</span>
            </Link>
            
            <Link 
              to="/create" 
              className={`flex items-center space-x-2 px-4 py-2 rounded-full transition-all ${
                isActive('/create') ? 'bg-brand-500 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Package className="w-4 h-4" />
              <span className="text-sm font-medium">New Order</span>
            </Link>

            <Link 
              to="/history" 
              className={`flex items-center space-x-2 px-4 py-2 rounded-full transition-all ${
                isActive('/history') ? 'bg-brand-500 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <History className="w-4 h-4" />
              <span className="text-sm font-medium">History</span>
            </Link>

            {role === 'ADMIN' && (
              <Link 
                to="/admin" 
                className={`flex items-center space-x-2 px-4 py-2 rounded-full transition-all ${
                  isActive('/admin') ? 'bg-slate-900 text-white shadow-md' : 'text-red-600 hover:bg-red-50'
                }`}
              >
                <span className="text-sm font-medium">Admin</span>
              </Link>
            )}
          </div>

          <div className="pl-4 border-l border-slate-200 relative">
            <button 
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex items-center space-x-2 text-slate-500 hover:text-slate-900 transition-colors focus:outline-none"
            >
              <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center">
                <User className="w-4 h-4" />
              </div>
            </button>

            {isProfileOpen && (
              <div className="absolute right-0 mt-4 w-48 bg-white border border-slate-100 shadow-xl rounded-2xl overflow-hidden animate-in fade-in slide-in-from-top-2">
                <div className="p-4 border-b border-slate-50">
                  <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Signed in as</p>
                  <p className="text-sm font-bold text-slate-900 truncate">{name}</p>
                </div>
                <div className="p-2">
                  <button 
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-50 rounded-xl flex items-center gap-2 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </nav>

      <main className="w-full max-w-5xl px-6 pt-32 pb-16 flex-1">
        <Outlet />
      </main>
      
    </div>
  );
}
