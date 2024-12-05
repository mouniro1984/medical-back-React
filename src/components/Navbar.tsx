import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { UserCircle, Calendar, Users, LogOut, Activity } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';

const Navbar = () => {
  const location = useLocation();
  const { logout } = useAuth();
  const navigate = useNavigate();

  const isActive = (path: string) => location.pathname === path;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { path: '/', icon: Activity, label: 'Dashboard' },
    { path: '/patients', icon: Users, label: 'Patients' },
    { path: '/appointments', icon: Calendar, label: 'Rendez-vous' },
  ];

  return (
    <motion.div 
      initial={{ x: -100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className="w-64 min-h-screen bg-gradient-to-b from-blue-50 to-white shadow-lg"
    >
      <div className="p-6">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
          MedPortal
        </h1>
      </div>
      
      <nav className="mt-6 space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex items-center px-6 py-3.5 text-gray-700 hover:bg-blue-50 transition-all duration-200 ${
              isActive(item.path) 
                ? 'bg-blue-100 text-blue-600 border-r-4 border-blue-600' 
                : 'hover:border-r-4 hover:border-blue-300'
            }`}
          >
            <item.icon className={`w-5 h-5 mr-3 ${
              isActive(item.path) ? 'text-blue-600' : 'text-gray-500'
            }`} />
            <span className="font-medium">{item.label}</span>
          </Link>
        ))}
        
        <button
          onClick={handleLogout}
          className="flex items-center w-full px-6 py-3.5 text-gray-700 hover:bg-red-50 hover:text-red-600 transition-all duration-200 mt-auto"
        >
          <LogOut className="w-5 h-5 mr-3" />
          <span className="font-medium">Déconnexion</span>
        </button>
      </nav>
    </motion.div>
  );
};

export default Navbar;