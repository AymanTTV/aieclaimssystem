import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import FormField from '../ui/FormField';
import { LegalHandler } from '../../types/legalHandler';
import toast from 'react-hot-toast';
import { addLegalHandler, updateLegalHandler } from '../../utils/legalHandlers';

interface LegalHandlerFormProps {
  legalHandler?: LegalHandler;
  onClose: () => void;
  onSuccess: (handler: LegalHandler) => void;
}

const legalHandlerFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address').min(1, 'Email is required'),
  address: z.string().min(1, 'Address is required'),
  phone: z.string().min(1, 'Phone number is required'),
});

type LegalHandlerFormData = z.infer<typeof legalHandlerFormSchema>;

const LegalHandlerForm: React.FC<LegalHandlerFormProps> = ({
  legalHandler,
  onClose,
  onSuccess,
}) => {
  const isEditMode = !!legalHandler;

  const {
    register,
    getValues, // Use getValues to manually retrieve form data
    formState: { errors, isSubmitting },
  } = useForm<LegalHandlerFormData>({
    resolver: zodResolver(legalHandlerFormSchema),
    defaultValues: isEditMode
      ? legalHandler
      : { name: '', email: '', address: '', phone: '' },
  });

  // This function will now be called directly by the submit button
  const handleManualSubmit = async (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent default button behavior
    e.stopPropagation(); // Stop event from bubbling up to parent forms/elements

    const data = getValues(); // Manually get the form data

    // Manually trigger validation
    const result = legalHandlerFormSchema.safeParse(data);
    if (!result.success) {
      // If validation fails, react-hook-form's errors object should be updated
      // but we can also toast a generic error for the user.
      toast.error('Please correct the form errors.');
      console.error('Validation errors:', result.error.errors);
      return;
    }

    console.log('LegalHandlerForm handleManualSubmit triggered. Data:', data);

    try {
      if (isEditMode && legalHandler?.id) {
        await updateLegalHandler(legalHandler.id, data);
        toast.success('Legal Handler updated successfully!');
        onSuccess({ ...legalHandler, ...data });
      } else {
        const newHandler = await addLegalHandler(data);
        toast.success('Legal Handler added successfully!');
        onSuccess(newHandler);
      }
      onClose();
    } catch (error) {
      console.error('Error saving legal handler:', error);
      toast.error('Failed to save legal handler.');
    }
  };

  return (
    // IMPORTANT CHANGE: Replaced <form> with <div> to avoid nested form issues.
    // The submission is now handled by the button's onClick event.
    <div className="space-y-4">
      <FormField
        label="Name"
        error={errors.name?.message}
        {...register('name')}
        required
      />
      <FormField
        label="Email"
        type="email"
        error={errors.email?.message}
        {...register('email')}
        required
      />
      <FormField
        label="Address"
        error={errors.address?.message}
        {...register('address')}
        required
      />
      <FormField
        label="Phone Number"
        type="tel"
        error={errors.phone?.message}
        {...register('phone')}
        required
      />
      <div className="flex justify-end space-x-3 mt-6">
        <button
          type="button" // Explicitly set to "button"
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          disabled={isSubmitting}
        >
          Cancel
        </button>
        <button
          type="button" // IMPORTANT: Set to "button" and call handleManualSubmit
          onClick={handleManualSubmit} // This button now triggers the save logic
          className="px-4 py-2 text-sm font-medium text-white bg-primary border border-transparent rounded-md hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Saving...' : isEditMode ? 'Update Handler' : 'Add Handler'}
        </button>
      </div>
    </div>
  );
};

export default LegalHandlerForm;
