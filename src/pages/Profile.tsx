import React, { useState, useEffect } from 'react';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { User } from '../types';
import { Upload, UserCircle, Phone, MapPin, Mail, Building } from 'lucide-react';
import toast from 'react-hot-toast';
import { splitFullName, combineFullName, splitFullAddress, combineFullAddress } from '../utils/nameAddressUtils';

// Maximum file size (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const Profile = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const initialName = splitFullName(user?.name || '');
  const [formData, setFormData] = useState({
    firstName: initialName.firstName,
    middleName: initialName.middleName,
    lastName: initialName.lastName,
    phoneNumber: '',
    buildingFlat: '',
    streetName: '',
    townCity: '',
    postcode: '',
    country: '',
    image: null as File | null,
  });

  useEffect(() => {
    const fetchUserDetails = async () => {
      if (user?.id) {
        const userDoc = await getDoc(doc(db, 'users', user.id));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const nameParts = splitFullName(userData.name || user?.name || '');
          const addrParts = splitFullAddress(userData.address || '');
          setFormData(prev => ({
            ...prev,
            firstName: userData.firstName || nameParts.firstName,
            middleName: userData.middleName || nameParts.middleName,
            lastName: userData.lastName || nameParts.lastName,
            phoneNumber: userData.phoneNumber || '',
            buildingFlat: userData.buildingFlat || addrParts.buildingFlat,
            streetName: userData.streetName || addrParts.streetName,
            townCity: userData.townCity || addrParts.townCity,
            postcode: userData.postcode || addrParts.postcode,
            country: userData.country || addrParts.country,
          }));
          if (userData.photoURL) {
            setImagePreview(userData.photoURL);
          }
        }
      }
    };

    fetchUserDetails();
  }, [user]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      toast.error('Please upload a valid image file (JPEG, PNG, or WebP)');
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      toast.error('Image size should be less than 10MB');
      return;
    }

    setFormData({ ...formData, image: file });
    
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    setLoading(true);

    try {
      let photoURL = user.photoURL || '';
      
      if (formData.image) {
        const imageRef = ref(storage, `profile-pictures/${user.id}`);
        const snapshot = await uploadBytes(imageRef, formData.image, {
          contentType: formData.image.type,
          customMetadata: {
            'Cache-Control': 'public,max-age=7200',
            'Access-Control-Allow-Origin': '*'
          }
        });
        photoURL = await getDownloadURL(snapshot.ref);
      }

      const combinedName = combineFullName(formData.firstName, formData.middleName, formData.lastName);
      const combinedAddress = combineFullAddress(
        formData.buildingFlat,
        formData.streetName,
        formData.townCity,
        formData.postcode,
        formData.country
      );

      await updateDoc(doc(db, 'users', user.id), {
        name: combinedName,
        firstName: formData.firstName,
        middleName: formData.middleName,
        lastName: formData.lastName,
        phoneNumber: formData.phoneNumber,
        address: combinedAddress,
        buildingFlat: formData.buildingFlat,
        streetName: formData.streetName,
        townCity: formData.townCity,
        postcode: formData.postcode,
        country: formData.country,
        photoURL,
        updatedAt: new Date()
      });

      toast.success('Profile updated successfully');
      setEditMode(false);
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md overflow-hidden">
      <div className="md:flex">
        {/* Profile Image Section */}
        <div className="md:w-1/3 bg-gray-50 p-8">
          <div className="text-center">
            <div className="relative inline-block">
              {imagePreview ? (
                <img
                  src={imagePreview}
                  alt="Profile"
                  className="h-32 w-32 rounded-full object-cover mx-auto"
                />
              ) : (
                <UserCircle className="h-32 w-32 text-gray-300 mx-auto" />
              )}
              {editMode && (
                <label className="absolute bottom-0 right-0 bg-white rounded-full p-2 shadow-lg cursor-pointer">
                  <Upload className="h-5 w-5 text-gray-500" />
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleImageChange}
                  />
                </label>
              )}
            </div>
            <div className="mt-4">
              <p className="text-sm text-gray-500">First Name: <span className="font-semibold text-gray-900">{formData.firstName || '-'}</span></p>
              {formData.middleName && <p className="text-sm text-gray-500">Middle Name: <span className="font-semibold text-gray-900">{formData.middleName}</span></p>}
              <p className="text-sm text-gray-500">Last Name: <span className="font-semibold text-gray-900">{formData.lastName || '-'}</span></p>
            </div>
            <p className="text-sm text-gray-500 capitalize mt-2">{user?.role}</p>
          </div>
        </div>

        {/* Profile Details Section */}
        <div className="md:w-2/3 p-8">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-medium text-gray-900">Profile Details</h3>
            {!editMode ? (
              <button
                onClick={() => setEditMode(true)}
                className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary-600"
              >
                Edit Profile
              </button>
            ) : (
              <div className="space-x-2">
                <button
                  onClick={() => setEditMode(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary-600"
                >
                  Save Changes
                </button>
              </div>
            )}
          </div>

          <div className="space-y-4">
            {editMode && (
              <div className="space-y-3 border-b pb-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700">First Name</label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700">Middle Name</label>
                  <input
                    type="text"
                    value={formData.middleName}
                    onChange={(e) => setFormData({ ...formData, middleName: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700">Last Name</label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                  />
                </div>
              </div>
            )}

            <div className="flex items-center">
              <Mail className="h-5 w-5 text-gray-400 mr-2" />
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <p className="text-gray-900">{user?.email}</p>
              </div>
            </div>

            <div className="flex items-center">
              <Phone className="h-5 w-5 text-gray-400 mr-2" />
              <div>
                <p className="text-sm text-gray-500">Phone Number</p>
                {editMode ? (
                  <input
                    type="tel"
                    value={formData.phoneNumber}
                    onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                  />
                ) : (
                  <p className="text-gray-900">{formData.phoneNumber || 'Not provided'}</p>
                )}
              </div>
            </div>

            <div className="border-t pt-3">
              <p className="text-sm font-medium text-gray-700 mb-2">Address Details</p>
              {editMode ? (
                <div className="space-y-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-600">Building Name / Flat Number</label>
                    <input
                      type="text"
                      value={formData.buildingFlat}
                      onChange={(e) => setFormData({ ...formData, buildingFlat: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600">Street Name</label>
                    <input
                      type="text"
                      value={formData.streetName}
                      onChange={(e) => setFormData({ ...formData, streetName: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600">Town / City</label>
                    <input
                      type="text"
                      value={formData.townCity}
                      onChange={(e) => setFormData({ ...formData, townCity: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600">Postcode</label>
                    <input
                      type="text"
                      value={formData.postcode}
                      onChange={(e) => setFormData({ ...formData, postcode: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600">Country</label>
                    <input
                      type="text"
                      value={formData.country}
                      onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                    />
                  </div>
                </div>
              ) : (
                <div className="text-sm space-y-1 bg-gray-50 p-3 rounded-md">
                  <p><span className="text-gray-500">Building Name / Flat Number:</span> {formData.buildingFlat || '-'}</p>
                  <p><span className="text-gray-500">Street Name:</span> {formData.streetName || '-'}</p>
                  <p><span className="text-gray-500">Town / City:</span> {formData.townCity || '-'}</p>
                  <p><span className="text-gray-500">Postcode:</span> {formData.postcode || '-'}</p>
                  <p><span className="text-gray-500">Country:</span> {formData.country || '-'}</p>
                </div>
              )}
            </div>

            <div className="flex items-center">
              <Building className="h-5 w-5 text-gray-400 mr-2" />
              <div>
                <p className="text-sm text-gray-500">Role</p>
                <p className="text-gray-900 capitalize">{user?.role}</p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Profile;