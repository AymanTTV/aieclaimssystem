import React, { useState } from 'react';
import { useVehicles } from '../hooks/useVehicles';
import { useAccidents } from '../hooks/useAccidents';
import Card from '../components/Card';
import AccidentCard from '../components/AccidentCard';
import AccidentForm from '../components/AccidentForm';
import { Plus } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { User } from '../types';

const Accidents = () => {
  const { vehicles, loading: vehiclesLoading } = useVehicles();
  const { accidents, loading: accidentsLoading } = useAccidents();
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [drivers, setDrivers] = useState<Record<string, User>>({});

  React.useEffect(() => {
    const fetchDrivers = async () => {
      const uniqueDriverIds = [...new Set(accidents.map(accident => accident.driverId))];
      const driverData: Record<string, User> = {};

      for (const driverId of uniqueDriverIds) {
        const driverDoc = await getDoc(doc(db, 'users', driverId));
        if (driverDoc.exists()) {
          driverData[driverId] = { id: driverDoc.id, ...driverDoc.data() } as User;
        }
      }

      setDrivers(driverData);
    };

    if (accidents.length > 0) {
      fetchDrivers();
    }
  }, [accidents]);

  if (vehiclesLoading || accidentsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const vehicleMap = vehicles.reduce((acc, vehicle) => {
    acc[vehicle.id] = vehicle;
    return acc;
  }, {} as Record<string, typeof vehicles[0]>);

  const filteredAccidents = selectedVehicle
    ? accidents.filter(accident => accident.vehicleId === selectedVehicle)
    : accidents;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Accidents</h1>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
        >
          <Plus className="w-5 h-5 mr-2" />
          Report Accident
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <Card title="Filter by Vehicle">
            <div className="space-y-2">
              <button
                onClick={() => setSelectedVehicle(null)}
                className={`w-full text-left px-3 py-2 rounded-md text-sm ${
                  !selectedVehicle
                    ? 'bg-primary text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                All Vehicles
              </button>
              {vehicles.map(vehicle => (
                <button
                  key={vehicle.id}
                  onClick={() => setSelectedVehicle(vehicle.id)}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm ${
                    selectedVehicle === vehicle.id
                      ? 'bg-primary text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {vehicle.make} {vehicle.model} - {vehicle.registrationNumber}
                </button>
              ))}
            </div>
          </Card>
        </div>

        <div className="lg:col-span-3">
          <div className="space-y-4">
            {filteredAccidents.map(accident => (
              <AccidentCard
                key={accident.id}
                accident={accident}
                vehicle={vehicleMap[accident.vehicleId]}
                driver={drivers[accident.driverId]}
              />
            ))}
            {filteredAccidents.length === 0 && (
              <div className="text-center py-12 bg-white rounded-lg">
                <p className="text-gray-500">No accidents reported</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              Report Accident
            </h2>
            <AccidentForm
              vehicle={vehicles[0]}
              onClose={() => setShowForm(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Accidents;