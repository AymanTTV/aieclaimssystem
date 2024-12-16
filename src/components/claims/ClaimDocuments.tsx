import React from 'react';
import { Claim } from '../../types';
import { FileText, Download, Upload, Plus } from 'lucide-react';
import { format } from 'date-fns';

interface ClaimDocumentsProps {
  claim: Claim;
  onUploadDocument: (type: 'incidentReport' | 'invoice', file: File) => Promise<void>;
  onDownloadDocument: (url: string) => void;
}

const ClaimDocuments: React.FC<ClaimDocumentsProps> = ({
  claim,
  onUploadDocument,
  onDownloadDocument,
}) => {
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'incidentReport' | 'invoice') => {
    const file = e.target.files?.[0];
    if (file) {
      await onUploadDocument(type, file);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Claim Documents</h3>

      <div className="space-y-6">
        {/* Incident Report Section */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-gray-700">Incident Report</h4>
            <label className="cursor-pointer inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
              <Upload className="h-4 w-4 mr-2" />
              Upload Report
              <input
                type="file"
                className="hidden"
                accept=".pdf,.doc,.docx"
                onChange={(e) => handleFileUpload(e, 'incidentReport')}
              />
            </label>
          </div>
          {claim.documents.incidentReport ? (
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
              <div className="flex items-center">
                <FileText className="h-5 w-5 text-gray-400 mr-2" />
                <span className="text-sm text-gray-600">Incident Report</span>
              </div>
              <button
                onClick={() => onDownloadDocument(claim.documents.incidentReport!)}
                className="text-primary hover:text-primary-600"
              >
                <Download className="h-5 w-5" />
              </button>
            </div>
          ) : (
            <p className="text-sm text-gray-500">No incident report uploaded yet</p>
          )}
        </div>

        {/* Invoices Section */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-gray-700">Invoices</h4>
            <label className="cursor-pointer inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
              <Plus className="h-4 w-4 mr-2" />
              Add Invoice
              <input
                type="file"
                className="hidden"
                accept=".pdf"
                onChange={(e) => handleFileUpload(e, 'invoice')}
              />
            </label>
          </div>
          <div className="space-y-2">
            {claim.documents.invoices.map((invoice) => (
              <div key={invoice.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                <div>
                  <div className="flex items-center">
                    <FileText className="h-5 w-5 text-gray-400 mr-2" />
                    <span className="text-sm font-medium text-gray-700">
                      {invoice.type} - £{invoice.amount}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {format(invoice.date, 'MMM dd, yyyy')}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    invoice.paid ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {invoice.paid ? 'Paid' : 'Pending'}
                  </span>
                  <button
                    onClick={() => onDownloadDocument(invoice.document)}
                    className="text-primary hover:text-primary-600"
                  >
                    <Download className="h-5 w-5" />
                  </button>
                </div>
              </div>
            ))}
            {claim.documents.invoices.length === 0 && (
              <p className="text-sm text-gray-500">No invoices uploaded yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClaimDocuments;