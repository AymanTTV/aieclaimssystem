import React, { useState } from 'react';
import { useVehicles } from '../hooks/useVehicles';
import { useRentals } from '../hooks/useRentals';
import RentalCard from '../components/RentalCard';
import RentalForm from '../components/RentalForm';
import { exportRentals } from '../utils/RentalsExport';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { User } from '../types';
import { Plus } from 'lucide-react';

const Rentals = () => {
  const { vehicles, loading: vehiclesLoading } = useVehicles();
  const { rentals, loading: rentalsLoading } = useRentals();
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [renters, setRenters] = useState<Record<string, User>>({});

  React.useEffect(() => {
    const fetchRenters = async () => {
      const uniqueRenterIds = [...new Set(rentals.map((rental) => rental.renterId))];
      const renterData: Record<string, User> = {};

      for (const renterId of uniqueRenterIds) {
        const renterDoc = await getDoc(doc(db, 'users', renterId));
        if (renterDoc.exists()) {
          renterData[renterId] = { id: renterDoc.id, ...renterDoc.data() } as User;
        }
      }

      setRenters(renterData);
    };

    if (rentals.length > 0) {
      fetchRenters();
    }
  }, [rentals]);

  const handleSearch = (query: string) => {
    setSearchQuery(query.toLowerCase());
  };

  const handleImport = (file: File) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      const text = event.target?.result;
      if (!text) return;

      const importedRentals = JSON.parse(text as string);
      importedRentals.forEach((rental: any) => {
        // Handle rental import
      });
    };

    reader.readAsText(file);
  };

  if (vehiclesLoading || rentalsLoading) {
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

  const filteredRentals = rentals
    .filter((rental) => (selectedVehicle ? rental.vehicleId === selectedVehicle : true))
    .filter((rental) => {
      const renter = renters[rental.renterId];
      const vehicle = vehicleMap[rental.vehicleId];
      return (
        rental.id.toLowerCase().includes(searchQuery) ||
        (renter && renter.name?.toLowerCase().includes(searchQuery)) ||
        (vehicle && vehicle.registrationNumber?.toLowerCase().includes(searchQuery))
      );
    });

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Rentals</h1>
        <div className="flex space-x-4">
          <input
            type="text"
            placeholder="Search rentals..."
            onChange={(e) => handleSearch(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm w-64 focus:ring-primary focus:border-primary"
          />
          <button
            className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-600"
            onClick={() => setShowForm(true)}
          >
            <Plus className="w-5 h-5 inline mr-2" />
            Schedule Rental
          </button>
          <label className="cursor-pointer bg-secondary text-white px-4 py-2 rounded-md hover:bg-secondary-600">
            Import
            <input
              type="file"
              accept=".json"
              onChange={(e) => e.target.files && handleImport(e.target.files[0])}
              className="hidden"
            />
          </label>
          <button
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            onClick={() => exportRentals(rentals)}
          >
            Export
          </button>
        </div>
      </div>

      {/* Filter Section */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="font-semibold text-lg mb-4">Filter by Vehicle</h3>
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
              {vehicles.map((vehicle) => (
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
          </div>
        </div>

        {/* Rentals List Section */}
        <div className="lg:col-span-3">
          <div className="space-y-4">
            {filteredRentals.map((rental) => (
              <RentalCard
                key={rental.id}
                rental={rental}
                vehicle={vehicleMap[rental.vehicleId]}
                renter={renters[rental.renterId]}
              />
            ))}
            {filteredRentals.length === 0 && (
              <div className="text-center py-12 bg-white rounded-lg">
                <p className="text-gray-500">No rentals found</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Rental Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Schedule Rental</h2>
            <RentalForm
              vehicles={vehicles}
              onClose={() => setShowForm(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Rentals;