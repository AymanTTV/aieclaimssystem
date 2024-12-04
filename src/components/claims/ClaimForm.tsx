import React, { useState } from 'react';
import { addDoc, collection } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { Upload } from 'lucide-react';
import toast from 'react-hot-toast';

interface ClaimFormProps {
  onClose: () => void;
}

const ClaimForm: React.FC<ClaimFormProps> = ({ onClose }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    location: '',
    description: '',
    involvedParties: '',
    insuranceRef: '',
  });
  const [images, setImages] = useState<FileList | null>(null);
  const [documents, setDocuments] = useState<FileList | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const imageUrls: string[] = [];
      const documentUrls: string[] = [];

      // Upload images
      if (images) {
        for (let i = 0; i < images.length; i++) {
          const image = images[i];
          const imageRef = ref(storage, `claims/images/${Date.now()}_${image.name}`);
          const snapshot = await uploadBytes(imageRef, image);
          const url = await getDownloadURL(snapshot.ref);
          imageUrls.push(url);
        }
      }

      // Upload documents
      if (documents) {
        for (let i = 0; i < documents.length; i++) {
          const document = documents[i];
          const documentRef = ref(storage, `claims/documents/${Date.now()}_${document.name}`);
          const snapshot = await uploadBytes(documentRef, document);
          const url = await getDownloadURL(snapshot.ref);
          documentUrls.push(url);
        }
      }

      await addDoc(collection(db, 'claims'), {
        date: new Date(formData.date),
        location: formData.location,
        description: formData.description,
        involvedParties: formData.involvedParties.split(',').map(p => p.trim()),
        insuranceRef: formData.insuranceRef,
        images: imageUrls,
        documents: documentUrls,
        status: 'submitted',
        driverId: user?.id,
        createdAt: new Date(),
      });

      toast.success('Claim submitted successfully');
      onClose();
    } catch (error) {
      console.error('Error submitting claim:', error);
      toast.error('Failed to submit claim');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">Date</label>
        <input
          type="date"
          value={formData.date}
          onChange={(e) => setFormData({ ...formData, date: e.target.value })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Location</label>
        <input
          type="text"
          value={formData.location}
          onChange={(e) => setFormData({ ...formData, location: e.target.value })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Description</label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={3}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Involved Parties</label>
        <input
          type="text"
          value={formData.involvedParties}
          onChange={(e) => setFormData({ ...formData, involvedParties: e.target.value })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
          placeholder="Separate multiple parties with commas"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Insurance Reference</label>
        <input
          type="text"
          value={formData.insuranceRef}
          onChange={(e) => setFormData({ ...formData, insuranceRef: e.target.value })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Images</label>
        <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
          <div className="space-y-1 text-center">
            <Upload className="mx-auto h-12 w-12 text-gray-400" />
            <div className="flex text-sm text-gray-600">
              <label className="relative cursor-pointer bg-white rounded-md font-medium text-primary hover:text-primary-dark focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary">
                <span>Upload images</span>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => setImages(e.target.files)}
                  className="sr-only"
                />
              </label>
              <p className="pl-1">or drag and drop</p>
            </div>
            <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB each</p>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Supporting Documents</label>
        <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
          <div className="space-y-1 text-center">
            <Upload className="mx-auto h-12 w-12 text-gray-400" />
            <div className="flex text-sm text-gray-600">
              <label className="relative cursor-pointer bg-white rounded-md font-medium text-primary hover:text-primary-dark focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary">
                <span>Upload documents</span>
                <input
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx"
                  onChange={(e) => setDocuments(e.target.files)}
                  className="sr-only"
                />
              </label>
              <p className="pl-1">or drag and drop</p>
            </div>
            <p className="text-xs text-gray-500">PDF, DOC up to 10MB each</p>
          </div>
        </div>
      </div>

      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-white bg-primary border border-transparent rounded-md hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
        >
          {loading ? 'Submitting...' : 'Submit Claim'}
        </button>
      </div>
    </form>
  );
};

export default ClaimForm;