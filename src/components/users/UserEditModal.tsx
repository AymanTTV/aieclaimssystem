// src/components/users/UserEditModal.tsx
import React, { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth, db, storage } from '../../lib/firebase';
import { User } from '../../types';
import toast from 'react-hot-toast';
import { Building2, Mail, Phone, ShieldCheck, User as UserIcon, MapPin, Upload, UserCircle, Key, AlertCircle } from 'lucide-react';
import { combineFullName, combineFullAddress, splitFullName, splitFullAddress } from '../../utils/nameAddressUtils';

interface UserEditModalProps {
  user: User;
  onClose: () => void;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const UserEditModal: React.FC<UserEditModalProps> = ({ user, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false); // New state for custom confirmation
  const [imagePreview, setImagePreview] = useState<string | null>(user.photoURL || null);
  
  const initialName = user.firstName
    ? { firstName: user.firstName, middleName: user.middleName || '', lastName: user.lastName || '' }
    : splitFullName(user.name);

  const initialAddress = (user.buildingFlat || user.streetName)
    ? {
        buildingFlat: user.buildingFlat || '',
        streetName: user.streetName || '',
        townCity: user.townCity || '',
        postcode: user.postcode || '',
        country: user.country || '',
      }
    : splitFullAddress(user.address);

  const [formData, setFormData] = useState({
    name: user.name || '',
    firstName: initialName.firstName,
    middleName: initialName.middleName,
    lastName: initialName.lastName,
    role: user.role,
    companyName: user.companyName || '',
    phoneNumber: user.phoneNumber || '',
    address: user.address || '',
    buildingFlat: initialAddress.buildingFlat,
    streetName: initialAddress.streetName,
    townCity: initialAddress.townCity,
    postcode: initialAddress.postcode,
    country: initialAddress.country,
    image: null as File | null,
  });

  const handleFirstNameChange = (firstName: string) => {
    setFormData(prev => {
      const name = combineFullName(firstName, prev.middleName, prev.lastName);
      return { ...prev, firstName, name };
    });
  };

  const handleMiddleNameChange = (middleName: string) => {
    setFormData(prev => {
      const name = combineFullName(prev.firstName, middleName, prev.lastName);
      return { ...prev, middleName, name };
    });
  };

  const handleLastNameChange = (lastName: string) => {
    setFormData(prev => {
      const name = combineFullName(prev.firstName, prev.middleName, lastName);
      return { ...prev, lastName, name };
    });
  };

  const handleBuildingFlatChange = (buildingFlat: string) => {
    setFormData(prev => {
      const address = combineFullAddress(buildingFlat, prev.streetName, prev.townCity, prev.postcode, prev.country);
      return { ...prev, buildingFlat, address };
    });
  };

  const handleStreetNameChange = (streetName: string) => {
    setFormData(prev => {
      const address = combineFullAddress(prev.buildingFlat, streetName, prev.townCity, prev.postcode, prev.country);
      return { ...prev, streetName, address };
    });
  };

  const handleTownCityChange = (townCity: string) => {
    setFormData(prev => {
      const address = combineFullAddress(prev.buildingFlat, prev.streetName, townCity, prev.postcode, prev.country);
      return { ...prev, townCity, address };
    });
  };

  const handlePostcodeChange = (postcode: string) => {
    setFormData(prev => {
      const address = combineFullAddress(prev.buildingFlat, prev.streetName, prev.townCity, postcode, prev.country);
      return { ...prev, postcode, address };
    });
  };

  const handleCountryChange = (country: string) => {
    setFormData(prev => {
      const address = combineFullAddress(prev.buildingFlat, prev.streetName, prev.townCity, prev.postcode, country);
      return { ...prev, country, address };
    });
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      toast.error('Please upload a valid image file (JPEG, PNG, or WebP)');
      return;
    }

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

  const confirmPasswordReset = async () => {
    setResettingPassword(true);
    try {
      await sendPasswordResetEmail(auth, user.email);
      toast.success('Password reset email sent successfully!');
      setShowResetConfirm(false); // Close the confirmation overlay on success
    } catch (error: any) {
      console.error('Error sending reset email:', error);
      toast.error(error.message || 'Failed to send reset email');
    } finally {
      setResettingPassword(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let photoURL = user.photoURL || '';
      
      // Upload new image if selected
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

      // Update Firestore document
      await updateDoc(doc(db, 'users', user.id), {
        name: formData.name,
        firstName: formData.firstName,
        middleName: formData.middleName,
        lastName: formData.lastName,
        role: formData.role,
        companyName: formData.role === 'company' ? formData.companyName : null,
        phoneNumber: formData.phoneNumber,
        address: formData.address,
        buildingFlat: formData.buildingFlat,
        streetName: formData.streetName,
        townCity: formData.townCity,
        postcode: formData.postcode,
        country: formData.country,
        photoURL,
        updatedAt: new Date(),
      });

      toast.success('User updated successfully');
      onClose();
    } catch (error: any) {
      console.error('Error updating user:', error);
      toast.error(error.message || 'Failed to update user');
    } finally {
      setLoading(false);
    }
  };

  const inputBaseClass = "mt-1.5 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm px-3 py-2 bg-white";

  return (
    // Added 'relative' and overflow-hidden to contain the absolute overlay
    <div className="relative overflow-hidden">
      
      {/* --- INLINE CONFIRMATION OVERLAY --- */}
      {showResetConfirm && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/95 backdrop-blur-sm rounded-lg border border-gray-100 p-6">
          <div className="text-center max-w-sm w-full bg-white p-6 rounded-2xl shadow-xl border border-gray-200">
            <div className="mx-auto flex items-center justify-center h-14 w-14 rounded-full bg-amber-100 mb-4 border-4 border-amber-50">
              <Key className="h-7 w-7 text-amber-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Reset Password?</h3>
            <p className="text-sm text-gray-500 mb-6">
              This will immediately send a password reset link to <br/>
              <strong className="text-gray-900 mt-1 inline-block">{user.email}</strong>
            </p>
            <div className="flex justify-center gap-3">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                disabled={resettingPassword}
                className="px-5 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmPasswordReset}
                disabled={resettingPassword}
                className="px-5 py-2.5 text-sm font-semibold text-white bg-amber-600 border border-transparent rounded-lg hover:bg-amber-700 disabled:opacity-50 transition-colors flex items-center shadow-sm"
              >
                {resettingPassword ? 'Sending...' : 'Yes, Send Email'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MAIN FORM --- */}
      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Profile Image Section */}
        <div className="flex justify-center mb-6 pt-2">
          <div className="relative inline-block">
            {imagePreview ? (
              <img src={imagePreview} alt="Profile" className="h-24 w-24 rounded-full object-cover mx-auto shadow-sm border border-gray-200" />
            ) : (
              <div className="h-24 w-24 rounded-full bg-blue-50 flex items-center justify-center border border-blue-100">
                 <UserCircle className="h-16 w-16 text-blue-300 mx-auto" />
              </div>
            )}
            <label className="absolute bottom-0 right-0 bg-white border border-gray-200 rounded-full p-1.5 shadow-sm cursor-pointer hover:bg-gray-50 transition-colors">
              <Upload className="h-4 w-4 text-gray-500" />
              <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Role Field & Reset Trigger */}
          <div className="md:col-span-2 bg-gray-50 p-4 rounded-xl border border-gray-200 flex justify-between items-center gap-4">
            <div className="flex-1">
              <label className="block text-sm font-semibold text-gray-700 mb-1 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-600" /> System Role
              </label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as User['role'] })}
                className={inputBaseClass}
                required
              >
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
                <option value="finance">Finance</option>
                <option value="claims">Claims</option>
                <option value="company">Company</option>
                <option value="member">Member</option>
              </select>
            </div>
            
            {/* Password Reset Trigger Button */}
            <div className="flex flex-col items-end pt-5">
               <button
                  type="button"
                  onClick={() => setShowResetConfirm(true)}
                  className="flex items-center px-4 py-2 text-sm font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors shadow-sm"
               >
                  <Key className="w-4 h-4 mr-2" />
                  Reset Password
               </button>
            </div>
          </div>

          {/* Conditional Company Name */}
          {formData.role === 'company' && (
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-gray-400" /> Company Name
              </label>
              <input
                type="text"
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                className={inputBaseClass}
                placeholder="e.g. Acme Corporation"
                required
              />
            </div>
          )}

          {/* First Name */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
              <UserIcon className="w-4 h-4 text-gray-400" /> First Name
            </label>
            <input
              type="text"
              value={formData.firstName}
              onChange={(e) => handleFirstNameChange(e.target.value)}
              className={inputBaseClass}
              required
            />
          </div>

          {/* Middle Name */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
              <UserIcon className="w-4 h-4 text-gray-400" /> Middle Name
            </label>
            <input
              type="text"
              value={formData.middleName}
              onChange={(e) => handleMiddleNameChange(e.target.value)}
              className={inputBaseClass}
            />
          </div>

          {/* Last Name */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
              <UserIcon className="w-4 h-4 text-gray-400" /> Last Name
            </label>
            <input
              type="text"
              value={formData.lastName}
              onChange={(e) => handleLastNameChange(e.target.value)}
              className={inputBaseClass}
              required
            />
          </div>

          {/* Email (Read Only) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
              <Mail className="w-4 h-4 text-gray-400" /> Email Address
            </label>
            <input
              type="email"
              value={user.email}
              disabled
              className={`${inputBaseClass} bg-gray-100 text-gray-500 cursor-not-allowed`}
            />
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
              <Phone className="w-4 h-4 text-gray-400" /> Phone Number
            </label>
            <input
              type="tel"
              value={formData.phoneNumber}
              onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
              className={inputBaseClass}
              placeholder="+44 7000 000000"
            />
          </div>

          {/* Building Name / Flat Number */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-gray-400" /> Building Name / Flat Number
            </label>
            <input
              type="text"
              value={formData.buildingFlat}
              onChange={(e) => handleBuildingFlatChange(e.target.value)}
              className={inputBaseClass}
              placeholder="Flat 4B, Victoria Court"
            />
          </div>

          {/* Street Name */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-gray-400" /> Street Name
            </label>
            <input
              type="text"
              value={formData.streetName}
              onChange={(e) => handleStreetNameChange(e.target.value)}
              className={inputBaseClass}
              placeholder="Oxford Street"
            />
          </div>

          {/* Town / City */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-gray-400" /> Town / City
            </label>
            <input
              type="text"
              value={formData.townCity}
              onChange={(e) => handleTownCityChange(e.target.value)}
              className={inputBaseClass}
              placeholder="London"
            />
          </div>

          {/* Postcode */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-gray-400" /> Postcode
            </label>
            <input
              type="text"
              value={formData.postcode}
              onChange={(e) => handlePostcodeChange(e.target.value)}
              className={inputBaseClass}
              placeholder="W1D 1BS"
            />
          </div>

          {/* Country */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-gray-400" /> Country
            </label>
            <input
              type="text"
              value={formData.country}
              onChange={(e) => handleCountryChange(e.target.value)}
              className={inputBaseClass}
              placeholder="United Kingdom"
            />
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || showResetConfirm}
            className="px-6 py-2.5 text-sm font-semibold text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 disabled:opacity-50 shadow-sm"
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default UserEditModal;