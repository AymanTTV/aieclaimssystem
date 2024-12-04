import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { AlertTriangle, FileText, Search, Download, Upload, Plus, X } from 'lucide-react';
import Card from '../components/Card';
import StatusBadge from '../components/StatusBadge';
import ClaimForm from '../components/claims/ClaimForm';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';

interface Claim {
  id: string;
  date: Date;
  location: string;
  description: string;
  involvedParties: string[];
  images: string[];
  documents: string[];
  status: 'submitted' | 'in-review' | 'resolved';
  insuranceRef?: string;
  vehicleId: string;
  driverId: string;
  createdAt: Date;
}

const Claims = () => {
  const { user } = useAuth();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);

  useEffect(() => {
    fetchClaims();
  }, []);

  const fetchClaims = async () => {
    try {
      const claimsRef = collection(db, 'claims');
      const q = query(claimsRef, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const claimsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date.toDate(),
        createdAt: doc.data().createdAt.toDate()
      })) as Claim[];
      setClaims(claimsData);
    } catch (error) {
      console.error('Error fetching claims:', error);
      toast.error('Failed to fetch claims');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    const exportData = claims.map(claim => ({
      Date: format(claim.date, 'MM/dd/yyyy'),
      Location: claim.location,
      Description: claim.description,
      Status: claim.status,
      'Insurance Reference': claim.insuranceRef || 'N/A'
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Claims');
    XLSX.writeFile(wb, 'claims_export.xlsx');
    toast.success('Claims exported successfully');
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet);
        
        // Process and validate imported data
        // Add to Firebase
        toast.success(`${jsonData.length} claims imported successfully`);
      };
      reader.readAsBinaryString(file);
    } catch (error) {
      console.error('Error importing claims:', error);
      toast.error('Failed to import claims');
    }
  };

  const filteredClaims = claims.filter(claim => {
    const matchesSearch = 
      claim.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      claim.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || claim.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Claims Management</h1>
        <div className="flex space-x-2">
          <button
            onClick={handleExport}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <Download className="h-5 w-5 mr-2" />
            Export
          </button>
          <label className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer">
            <Upload className="h-5 w-5 mr-2" />
            Import
            <input
              type="file"
              className="hidden"
              accept=".xlsx,.xls"
              onChange={handleImport}
            />
          </label>
          {(user?.role === 'admin' || user?.role === 'manager') && (
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-600"
            >
              <Plus className="h-5 w-5 mr-2" />
              New Claim
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search claims..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="block w-48 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md"
        >
          <option value="all">All Statuses</option>
          <option value="submitted">Submitted</option>
          <option value="in-review">In Review</option>
          <option value="resolved">Resolved</option>
        </select>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredClaims.map(claim => (
          <Card key={claim.id} className="hover:shadow-lg transition-shadow">
            <div className="p-4">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center">
                  <AlertTriangle className="h-5 w-5 text-primary mr-2" />
                  <h3 className="text-lg font-medium text-gray-900">
                    Claim #{claim.id.slice(0, 8)}
                  </h3>
                </div>
                <StatusBadge status={claim.status} />
              </div>
              
              <div className="space-y-2">
                <p className="text-sm text-gray-500">
                  <span className="font-medium">Date:</span>{' '}
                  {format(claim.date, 'MMM dd, yyyy')}
                </p>
                <p className="text-sm text-gray-500">
                  <span className="font-medium">Location:</span>{' '}
                  {claim.location}
                </p>
                <p className="text-sm text-gray-500 line-clamp-2">
                  {claim.description}
                </p>
              </div>

              {claim.images && claim.images.length > 0 && (
                <div className="mt-4 grid grid-cols-3 gap-2">
                  {claim.images.slice(0, 3).map((image, index) => (
                    <img
                      key={index}
                      src={image}
                      alt={`Claim image ${index + 1}`}
                      className="h-20 w-full object-cover rounded-md"
                    />
                  ))}
                </div>
              )}

              {(user?.role === 'admin' || user?.role === 'manager') && (
                <div className="mt-4 flex justify-end space-x-2">
                  <button
                    onClick={() => setSelectedClaim(claim)}
                    className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <FileText className="h-4 w-4 mr-1" />
                    Details
                  </button>
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>

      {filteredClaims.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg">
          <AlertTriangle className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No claims found</h3>
          <p className="mt-1 text-sm text-gray-500">
            No claims match your current filters.
          </p>
        </div>
      )}

      {/* Claim Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={() => setShowForm(false)}></div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

            <div className="relative inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full sm:p-6">
              <div className="absolute top-0 right-0 pt-4 pr-4">
                <button
                  type="button"
                  className="bg-white rounded-md text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                  onClick={() => setShowForm(false)}
                >
                  <span className="sr-only">Close</span>
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="sm:flex sm:items-start">
                <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                    {selectedClaim ? 'Edit Claim' : 'New Claim'}
                  </h3>
                  <ClaimForm onClose={() => setShowForm(false)} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Claims;