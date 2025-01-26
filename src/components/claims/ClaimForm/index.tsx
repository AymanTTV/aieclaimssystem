// Add this function inside the ClaimForm component
const uploadVehicleDocuments = async (documents: any) => {
  const uploadPromises = [];
  const documentUrls: Record<string, string> = {};

  for (const [key, file] of Object.entries(documents)) {
    if (file instanceof File) {
      const path = `claims/vehicle-documents/${Date.now()}_${file.name}`;
      uploadPromises.push(
        uploadFile(file, path).then(url => {
          documentUrls[key] = url;
        })
      );
    }
  }

  await Promise.all(uploadPromises);
  return documentUrls;
};

// Then update the onSubmit function:
const onSubmit = async (data: ClaimFormData) => {
  if (!user) {
    toast.error('You must be logged in to submit a claim');
    return;
  }

  try {
    setLoading(true);

    // Upload vehicle documents
    const vehicleDocumentUrls = await uploadVehicleDocuments(data.clientVehicle.documents);

    // Upload evidence files
    const evidenceUrls = {
      images: await uploadAllFiles(data.evidence.images, 'claims/images'),
      videos: await uploadAllFiles(data.evidence.videos, 'claims/videos'),
      clientVehiclePhotos: await uploadAllFiles(data.evidence.clientVehiclePhotos, 'claims/vehicle-photos'),
      engineerReport: await uploadAllFiles(data.evidence.engineerReport, 'claims/engineer-reports'),
      bankStatement: await uploadAllFiles(data.evidence.bankStatement, 'claims/bank-statements'),
      adminDocuments: await uploadAllFiles(data.evidence.adminDocuments, 'claims/admin-documents')
    };

    // Prepare claim data
    const claimData = {
      ...data,
      clientVehicle: {
        ...data.clientVehicle,
        documents: vehicleDocumentUrls
      },
      evidence: evidenceUrls,
      clientInfo: {
        ...data.clientInfo,
        dateOfBirth: new Date(data.clientInfo.dateOfBirth)
      },
      incidentDetails: {
        ...data.incidentDetails,
        date: new Date(data.incidentDetails.date)
      },
      progress: 'submitted',
      submittedBy: user.id,
      submittedAt: new Date(),
      updatedAt: new Date(),
      progressHistory: [{
        id: Date.now().toString(),
        date: new Date(),
        note: 'Claim submitted',
        author: user.name,
        status: 'submitted'
      }]
    };

    // Add to Firestore
    const docRef = await addDoc(collection(db, 'claims'), claimData);

    // Generate claim documents
    await generateClaimDocuments(docRef.id, {
      id: docRef.id,
      ...claimData
    });

    toast.success('Claim submitted successfully');
    onClose();
  } catch (error: any) {
    console.error('Error submitting claim:', error);
    toast.error(`Failed to submit claim: ${error.message}`);
  } finally {
    setLoading(false);
  }
};