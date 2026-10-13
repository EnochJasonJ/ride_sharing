import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { BarChart3, Users, Car, Map, LogOut } from 'lucide-react';

const AdminDashboard = ({ user, setUser }: { user: any; setUser: (user: any) => void }) => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const { data } = await api.get('/admin/stats');
      setStats(data);
    } catch (err) {
      console.error('Failed to fetch stats');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    setUser(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-2 font-bold text-xl text-blue-600">
          <BarChart3 /> <span className="hidden sm:inline">RideHail Admin</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-gray-600">Admin: {user.name}</span>
          <button onClick={handleLogout} className="p-2 hover:bg-gray-100 rounded-full text-gray-500">
            <LogOut size={20} />
          </button>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6">System Overview</h1>
        
        {loading ? (
          <div className="flex justify-center py-12">Loading stats...</div>
        ) : stats ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
              <div className="bg-blue-100 p-3 rounded-full text-blue-600">
                <Users size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Users</p>
                <p className="text-2xl font-bold">{stats.totalUsers}</p>
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
              <div className="bg-green-100 p-3 rounded-full text-green-600">
                <Car size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-500">Active Drivers</p>
                <p className="text-2xl font-bold">{stats.activeDrivers}</p>
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
              <div className="bg-purple-100 p-3 rounded-full text-purple-600">
                <Map size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Rides</p>
                <p className="text-2xl font-bold">{stats.totalRides}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 text-center py-12">
            <p className="text-gray-500">No stats available. Please implement the /api/admin/stats endpoint.</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminDashboard;
