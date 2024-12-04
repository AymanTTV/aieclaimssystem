import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage, storageMetadata } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { User } from '../types';
import { UserCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import RoleSelector from './RoleSelector';
import ProfileImageUpload from './ProfileImageUpload';

const Profile = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    role: user?.role || 'driver',
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
            role: userData.role || 'driver',
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

  const handleImageChange = (file: File | null) => {
    setFormData(prev => ({ ...prev, image: file }));
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
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
          ...storageMetadata,
          contentType: formData.image.type,
        });
        photoURL = await getDownloadURL(snapshot.ref);
      }

      await updateDoc(doc(db, 'users', user.id), {
        name: formData.name,
        role: formData.role,
        phoneNumber: formData.phoneNumber,
        address: formData.address,
        photoURL,
        profileCompleted: true,
      });

      toast.success('Profile updated successfully');
      navigate('/');
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          {imagePreview ? (
            <img
              src={imagePreview}
              alt="Profile"
              className="h-24 w-24 rounded-full object-cover"
            />
          ) : (
            <UserCircle className="h-24 w-24 text-gray-300" />
          )}
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Complete Your Profile
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Name
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
              />
            </div>

            <RoleSelector
              currentRole={formData.role}
              onChange={(role) => setFormData({ ...formData, role })}
              disabled={user?.role === 'admin'}
            />

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Phone Number
              </label>
              <input
                type="tel"
                required
                value={formData.phoneNumber}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Address
              </label>
              <textarea
                required
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                rows={3}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
              />
            </div>

            <ProfileImageUpload
              imagePreview={imagePreview}
              onImageChange={handleImageChange}
            />

            <button
              type="submit"
              disabled={loading}
              className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                loading ? 'bg-gray-400' : 'bg-primary hover:bg-primary-600'
              } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary`}
            >
              {loading ? 'Updating...' : 'Update Profile'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Profile;