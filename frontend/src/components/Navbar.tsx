import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, LogOut, ShoppingBag, Sparkles } from 'lucide-react';

export const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="bg-white/80 backdrop-blur-md border-b border-white/20 shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
                <div className="flex">
                    <div className="flex-shrink-0 flex items-center">
                        <Link to="/dashboard" className="flex items-center space-x-2 text-xl font-bold gradient-text hover:scale-105 transition-transform duration-200">
                            <Sparkles className="h-6 w-6 text-blue-600" />
                            <span>SaaS Market</span>
                        </Link>
                    </div>
                    <div className="hidden sm:ml-8 sm:flex sm:space-x-1">
                        {user?.role === 'developer' && (
                            <Link to="/dashboard" className="text-gray-600 hover:text-blue-600 hover:bg-blue-50 inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 group">
                                <LayoutDashboard className="mr-2 h-4 w-4 group-hover:scale-110 transition-transform duration-200" />
                                Dashboard
                            </Link>
                        )}
                         <Link to="/marketplace" className="text-gray-600 hover:text-blue-600 hover:bg-blue-50 inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 group">
                             <ShoppingBag className="mr-2 h-4 w-4 group-hover:scale-110 transition-transform duration-200" />
                            Marketplace
                        </Link>
                    </div>
                </div>
                <div className="flex items-center space-x-4">
                    <div className="hidden sm:block">
                        <span className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                            {user?.email}
                        </span>
                    </div>
                     <button 
                        onClick={handleLogout} 
                        className="text-gray-500 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg transition-all duration-200 group"
                        title="Logout"
                    >
                        <LogOut className="h-5 w-5 group-hover:scale-110 transition-transform duration-200" />
                    </button>
                </div>
            </div>
        </div>
    </nav>
  );
};
