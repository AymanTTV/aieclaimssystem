// src/pages/members/Profile.tsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { auth, db } from '../../lib/firebase';
import { updateProfile } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { combineFullName, combineFullAddress, splitFullName, splitFullAddress } from '../../utils/nameAddressUtils';
import CommunicationHistoryTimeline from '../../components/common/CommunicationHistoryTimeline';

export default function Profile() {
  const { user } = useAuth();
  const [profileTab, setProfileTab] = useState<'profile' | 'history'>('profile');

  const initialName = user?.firstName
    ? { firstName: user.firstName, middleName: user.middleName || '', lastName: user.lastName || '' }
    : splitFullName(user?.name || '');

  const initialAddress = (user?.buildingFlat || user?.streetName)
    ? {
        buildingFlat: user.buildingFlat || '',
        streetName: user.streetName || '',
        townCity: user.townCity || '',
        postcode: user.postcode || '',
        country: user.country || 'United Kingdom',
      }
    : splitFullAddress(user?.address || '');

  const [name, setName]                   = useState(user?.name || '');
  const [firstName, setFirstName]         = useState(initialName.firstName);
  const [middleName, setMiddleName]       = useState(initialName.middleName);
  const [lastName, setLastName]           = useState(initialName.lastName);

  const [address, setAddress]             = useState(user?.address || '');
  const [buildingFlat, setBuildingFlat]   = useState(initialAddress.buildingFlat);
  const [streetName, setStreetName]       = useState(initialAddress.streetName);
  const [townCity, setTownCity]           = useState(initialAddress.townCity);
  const [postcode, setPostcode]           = useState(initialAddress.postcode);
  const [country, setCountry]             = useState(initialAddress.country || 'United Kingdom');

  const [saving, setSaving]               = useState(false);

  useEffect(() => {
    if (user) {
      const parsedName = user.firstName
        ? { firstName: user.firstName, middleName: user.middleName || '', lastName: user.lastName || '' }
        : splitFullName(user.name || '');
      const parsedAddress = (user.buildingFlat || user.streetName)
        ? {
            buildingFlat: user.buildingFlat || '',
            streetName: user.streetName || '',
            townCity: user.townCity || '',
            postcode: user.postcode || '',
            country: user.country || 'United Kingdom',
          }
        : splitFullAddress(user.address || '');

      setName(user.name || combineFullName(parsedName.firstName, parsedName.middleName, parsedName.lastName));
      setFirstName(parsedName.firstName);
      setMiddleName(parsedName.middleName);
      setLastName(parsedName.lastName);

      setAddress(user.address || combineFullAddress(parsedAddress.buildingFlat, parsedAddress.streetName, parsedAddress.townCity, parsedAddress.postcode, parsedAddress.country));
      setBuildingFlat(parsedAddress.buildingFlat);
      setStreetName(parsedAddress.streetName);
      setTownCity(parsedAddress.townCity);
      setPostcode(parsedAddress.postcode);
      setCountry(parsedAddress.country || 'United Kingdom');
    }
  }, [user]);

  const handleFirstNameChange = (val: string) => {
    setFirstName(val);
    setName(combineFullName(val, middleName, lastName));
  };

  const handleMiddleNameChange = (val: string) => {
    setMiddleName(val);
    setName(combineFullName(firstName, val, lastName));
  };

  const handleLastNameChange = (val: string) => {
    setLastName(val);
    setName(combineFullName(firstName, middleName, val));
  };

  const handleBuildingFlatChange = (val: string) => {
    setBuildingFlat(val);
    setAddress(combineFullAddress(val, streetName, townCity, postcode, country));
  };

  const handleStreetNameChange = (val: string) => {
    setStreetName(val);
    setAddress(combineFullAddress(buildingFlat, val, townCity, postcode, country));
  };

  const handleTownCityChange = (val: string) => {
    setTownCity(val);
    setAddress(combineFullAddress(buildingFlat, streetName, val, postcode, country));
  };

  const handlePostcodeChange = (val: string) => {
    setPostcode(val);
    setAddress(combineFullAddress(buildingFlat, streetName, townCity, val, country));
  };

  const handleCountryChange = (val: string) => {
    setCountry(val);
    setAddress(combineFullAddress(buildingFlat, streetName, townCity, postcode, val));
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await updateProfile(auth.currentUser!, { displayName: name });
      await updateDoc(doc(db, 'users', user.id), {
        name,
        firstName,
        middleName,
        lastName,
        address,
        buildingFlat,
        streetName,
        townCity,
        postcode,
        country,
      });
      toast.success('Profile updated');
    } catch (err: any) {
      toast.error(err.message || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Member Profile</h1>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200">
        <button
          type="button"
          onClick={() => setProfileTab('profile')}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition cursor-pointer ${
            profileTab === 'profile'
              ? 'border-rose-600 text-rose-600 font-bold'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          My Profile Details
        </button>
        <button
          type="button"
          onClick={() => setProfileTab('history')}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition cursor-pointer ${
            profileTab === 'history'
              ? 'border-rose-600 text-rose-600 font-bold'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          Communication History
        </button>
      </div>

      {profileTab === 'profile' ? (
        <div className="max-w-lg space-y-6">
      
      <div>
        <label className="block text-sm font-medium text-gray-700">First Name</label>
        <input
          type="text"
          value={firstName}
          disabled={saving}
          onChange={e => handleFirstNameChange(e.target.value)}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
          placeholder="First Name"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Middle Name</label>
        <input
          type="text"
          value={middleName}
          disabled={saving}
          onChange={e => handleMiddleNameChange(e.target.value)}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
          placeholder="Middle Name"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Last Name</label>
        <input
          type="text"
          value={lastName}
          disabled={saving}
          onChange={e => handleLastNameChange(e.target.value)}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
          placeholder="Last Name"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Building Name / Flat Number</label>
        <input
          type="text"
          value={buildingFlat}
          disabled={saving}
          onChange={e => handleBuildingFlatChange(e.target.value)}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
          placeholder="Building Name / Flat Number"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Street Name</label>
        <input
          type="text"
          value={streetName}
          disabled={saving}
          onChange={e => handleStreetNameChange(e.target.value)}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
          placeholder="Street Name"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Town / City</label>
        <input
          type="text"
          value={townCity}
          disabled={saving}
          onChange={e => handleTownCityChange(e.target.value)}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
          placeholder="Town / City"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Postcode</label>
        <input
          type="text"
          value={postcode}
          disabled={saving}
          onChange={e => handlePostcodeChange(e.target.value)}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
          placeholder="Postcode"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Country</label>
        <input
          type="text"
          value={country}
          disabled={saving}
          onChange={e => handleCountryChange(e.target.value)}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
          placeholder="Country"
        />
      </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className={`py-2 px-4 rounded-md text-white ${
            saving ? 'bg-primary/70' : 'bg-primary hover:bg-primary-dark'
          } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary cursor-pointer`}
        >
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
      ) : (
        <div className="space-y-4">
          <CommunicationHistoryTimeline
            recordId={user?.id}
            recipientRole="Member"
            matchKeys={[
              user?.id,
              user?.email,
              user?.name,
              user?.phoneNumber,
            ].filter(Boolean)}
            title="My Communication History"
            description="Chronological log of WhatsApp notifications, email statements, and updates sent to your account."
          />
        </div>
      )}
    </div>
  );
}
