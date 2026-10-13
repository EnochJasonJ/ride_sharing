import React, { useState, useEffect } from 'react';
import { api, socket } from '../api/client';
import { MapPin, Navigation, History, LogOut, Car } from 'lucide-react';

const PassengerDashboard = ({ user, setUser }: { user: any; setUser: (user: any) => void }) => {
  const [pickup, setPickup] = useState({ lat: 0, lng: 0 });
  const [dropoff, setDropoff] = useState({ lat: 0, lng: 0 });
  const [rides, setRides] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void fetchRides();
    const interval = window.setInterval(() => void fetchRides(), 5000);
    const handleRideUpdate = () => void fetchRides();
    socket.on('ride_update', handleRideUpdate);

    return () => {
      window.clearInterval(interval);
      socket.off('ride_update', handleRideUpdate);
    };
  }, []);

  const fetchRides = async () => {
    try {
      const { data } = await api.get('/rides');
      setRides(data);
    } catch (err) {
      console.error('Failed to fetch rides', err);
    }
  };

  const requestRide = async () => {
    setLoading(true);
    try {
      await api.post('/rides', {
        pickupLat: pickup.lat,
        pickupLng: pickup.lng,
        dropoffLat: dropoff.lat,
        dropoffLng: dropoff.lng,
      });
      fetchRides();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Ride request failed');
    } finally {
      setLoading(false);
    }
  };

  const cancelRide = async (id: string) => {
    try {
      await api.post(`/rides/${id}/cancel`, {});
      fetchRides();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Cancellation failed');
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
          <Car /> <span className="hidden sm:inline">RideHail MVP</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-gray-600">Hello, {user.name}</span>
          <button onClick={handleLogout} className="p-2 hover:bg-gray-100 rounded-full text-gray-500">
            <LogOut size={20} />
          </button>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Navigation className="text-blue-600" /> Request a Ride
          </h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <div className="col-span-2 text-sm text-gray-500 mb-1">Pickup (Lat, Lng)</div>
              <input type="number" step="any" className="px-3 py-2 border rounded-lg" 
                       value={pickup.lat} onChange={e => setPickup({...pickup, lat: parseFloat(e.target.value)})} placeholder="Lat" />
              <input type="number" step="any" className="px-3 py-2 border rounded-lg" 
                       value={pickup.lng} onChange={e => setPickup({...pickup, lng: parseFloat(e.target.value)})} placeholder="Lng" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="col-span-2 text-sm text-gray-500 mb-1">Drop-off (Lat, Lng)</div>
              <input type="number" step="any" className="px-3 py-2 border rounded-lg" 
                       value={dropoff.lat} onChange={e => setDropoff({...dropoff, lat: parseFloat(e.target.value)})} placeholder="Lat" />
              <input type="number" step="any" className="px-3 py-2 border rounded-lg" 
                       value={dropoff.lng} onChange={e => setDropoff({...dropoff, lng: parseFloat(e.target.value)})} placeholder="Lng" />
            </div>
            <button 
              onClick={requestRide} 
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:bg-blue-300"
            >
              {loading ? 'Searching...' : 'Request Ride Now'}
            </button>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <History className="text-blue-600" /> My Rides
          </h2>
          <div className="space-y-4">
            {rides.length === 0 ? (
              <p className="text-gray-400 text-center py-8">No rides found</p>
            ) : (
              rides.map(ride => (
                <div key={ride.id} className="p-4 border rounded-lg flex justify-between items-center">
                  <div className="overflow-hidden">
                    <p className="font-medium truncate">Status: <span className="text-blue-600">{ride.status}</span></p>
                    <p className="text-sm text-gray-500">Fare: ${ride.estimatedFare}</p>
                    {ride.trip && (
                      <p className="text-xs text-gray-400 truncate">Driver: {ride.trip.driverProfile?.user?.name}</p>
                    )}
                  </div>
                  {ride.status !== 'CANCELLED' && ride.status !== 'COMPLETED' && (
                    <button onClick={() => cancelRide(ride.id)} className="ml-4 text-red-500 text-sm hover:underline shrink-0">
                      Cancel
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default PassengerDashboard;
