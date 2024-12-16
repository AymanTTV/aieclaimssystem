import React, { useState, useEffect } from 'react';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { User } from '../types';
import { Upload, UserCircle, Phone, MapPin, Mail, Building } from 'lucide-react';
import toast from 'react-hot-toast';

// Maximum file size (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const Profile = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    phoneNumber: '',
    address: '',
    image: null as File | null,
  });

  useEffect(() => {
    const fetchUserDetails = async () => {
      if (user?.id) {
        const userDoc = await getDoc(doc(db, 'users', user.id));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setFormData(prev => ({
            ...prev,
            name: userData.name || '',
            phoneNumber: userData.phoneNumber || '',
            address: userData.address || '',
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

      await updateDoc(doc(db, 'users', user.id), {
        name: formData.name,
        phoneNumber: formData.phoneNumber,
        address: formData.address,
        photoURL,
        updatedAt: new Date()
      });

      toast.success('Profile updated successfully');
      setEditMode(false);
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
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
            <h2 className="mt-4 text-xl font-semibold text-gray-900">
              {formData.name}
            </h2>
            <p className="text-sm text-gray-500 capitalize">{user?.role}</p>
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

            <div className="flex items-start">
              <MapPin className="h-5 w-5 text-gray-400 mr-2 mt-1" />
              <div className="flex-1">
                <p className="text-sm text-gray-500">Address</p>
                {editMode ? (
                  <textarea
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    rows={3}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                  />
                ) : (
                  <p className="text-gray-900">{formData.address || 'Not provided'}</p>
                )}
              </div>
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