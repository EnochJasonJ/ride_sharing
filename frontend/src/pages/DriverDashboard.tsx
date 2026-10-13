import React, { useState, useEffect } from 'react';
import { api, socket } from '../api/client';
import { MapPin, LogOut, Car, CheckCircle, Play, Square } from 'lucide-react';

const DriverDashboard = ({ user, setUser }: { user: any; setUser: (user: any) => void }) => {
  const [isAvailable, setIsAvailable] = useState(false);
  const [location, setLocation] = useState({ lat: 0, lng: 0 });
  const [activeTrip, setActiveTrip] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchActiveTrip();

    socket.on('ride_assigned', (trip) => {
      console.log('Ride assigned to driver:', trip);
      setActiveTrip(trip);
    });

    return () => { socket.off('ride_assigned'); };
  }, []);

  const fetchActiveTrip = async () => {
    try {
      const { data } = await api.get('/drivers/me/trip');
      setActiveTrip(data);
    } catch (err) {
      setActiveTrip(null);
    }
  };

  const toggleAvailability = async () => {
    setLoading(true);
    try {
      await api.patch('/drivers/availability', { available: !isAvailable });
      setIsAvailable(!isAvailable);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Update failed');
    } finally {
      setLoading(false);
    }
  };

  const updateLocation = async () => {
    try {
      await api.patch('/drivers/location', location);
    } catch (err: any) {
      console.error('Location update failed');
    }
  };

  const handleTripAction = async (action: 'start' | 'complete') => {
    if (!activeTrip) return;
    try {
      const { data } = await api.post(`/trips/${activeTrip.id}/${action}`, {});
      setActiveTrip(data);
      if (action === 'complete') {
        setIsAvailable(true);
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Action failed');
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
          <Car /> <span className="hidden sm:inline">RideHail Driver</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-gray-600">Driver: {user.name}</span>
          <button onClick={handleLogout} className="p-2 hover:bg-gray-100 rounded-full text-gray-500">
            <LogOut size={20} />
          </button>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <MapPin className="text-blue-600" /> Status & Location
          </h2>
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <span className="font-medium">Available for rides</span>
              <button 
                onClick={toggleAvailability} 
                disabled={loading}
                className={`w-12 h-6 rounded-full transition-colors relative ${isAvailable ? 'bg-green-500' : 'bg-gray-300'}`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${isAvailable ? 'right-1' : 'left-1'}`} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="col-span-2 text-sm text-gray-500 mb-1">Current Coordinates</div>
              <input type="number" step="any" className="px-3 py-2 border rounded-lg" 
                     value={location.lat} onChange={e => setLocation({...location, lat: parseFloat(e.target.value)})} placeholder="Lat" />
              <input type="number" step="any" className="px-3 py-2 border rounded-lg" 
                     value={location.lng} onChange={e => setLocation({...location, lng: parseFloat(e.target.value)})} placeholder="Lng" />
            </div>
            <button 
              onClick={updateLocation}
              className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition"
            >
              Update Location
            </button>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Car className="text-blue-600" /> Active Trip
          </h2>
          {activeTrip ? (
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg">
                <p className="text-sm text-blue-600 font-bold uppercase mb-2">{activeTrip.status}</p>
                <div className="space-y-2">
                  <p className="text-sm"><strong>Pickup:</strong> {activeTrip.rideRequest?.pickupLat}, {activeTrip.rideRequest?.pickupLng}</p>
                  <p className="text-sm"><strong>Drop-off:</strong> {activeTrip.rideRequest?.dropoffLat}, {activeTrip.rideRequest?.dropoffLng}</p>
                </div>
              </div>
              <div className="flex gap-2">
                {activeTrip.status === 'NOT_STARTED' && (
                  <button onClick={() => handleTripAction('start')} className="flex-1 bg-green-600 text-white py-2 rounded-lg font-semibold flex items-center justify-center gap-2 hover:bg-green-700 transition">
                    <Play size={16} /> Start Trip
                  </button>
                )}
                {activeTrip.status === 'STARTED' && (
                  <button onClick={() => handleTripAction('complete')} className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-semibold flex items-center justify-center gap-2 hover:bg-blue-700 transition">
                    <CheckCircle size={16} /> Complete Trip
                  </button>
                )}
                {activeTrip.status === 'COMPLETED' && (
                  <p className="text-center w-full text-green-600 font-medium py-2">Trip Finished!</p>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-400">No active trip. Go online to receive requests.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default DriverDashboard;
