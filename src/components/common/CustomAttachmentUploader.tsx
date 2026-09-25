// src/components/common/CustomAttachmentUploader.tsx
import React, { useRef, useState } from 'react';
import { 
  Upload, 
  Trash2, 
  ExternalLink, 
  FileText, 
  Image as ImageIcon, 
  Loader2, 
  Check, 
  Plus
} from 'lucide-react';
import toast from 'react-hot-toast';
import { CustomAttachment, formatFileSize, uploadCustomAttachment } from '../../utils/attachmentUpload';

interface CustomAttachmentUploaderProps {
  attachments: CustomAttachment[];
  onChange: (attachments: CustomAttachment[]) => void;
  moduleContext: 'rentals' | 'invoices' | 'claims' | 'maintenance';
  recordId?: string;
  className?: string;
}

export const CustomAttachmentUploader: React.FC<CustomAttachmentUploaderProps> = ({
  attachments,
  onChange,
  moduleContext,
  recordId,
  className = '',
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const fileList = Array.from(files);
    const newItems: CustomAttachment[] = fileList.map((f) => ({
      id: `custom_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      name: f.name,
      size: f.size,
      type: f.type,
      url: '',
      isUploading: true,
      selected: true,
    }));

    // Optimistically add items with upload spinner
    const updated = [...attachments, ...newItems];
    onChange(updated);

    toast.loading(`Uploading ${fileList.length} attachment${fileList.length > 1 ? 's' : ''}...`, {
      id: 'upload_attachments',
    });

    try {
      let currentList = updated;
      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        const targetId = newItems[i].id;
        try {
          const url = await uploadCustomAttachment(file, moduleContext, recordId);
          currentList = currentList.map((item) =>
            item.id === targetId ? { ...item, url, isUploading: false } : item
          );
          onChange(currentList);
        } catch (err: any) {
          console.error('File upload failed:', file.name, err);
          currentList = currentList.filter((item) => item.id !== targetId);
          onChange(currentList);
          toast.error(`Failed to upload "${file.name}"`);
        }
      }
      toast.success(
        `${fileList.length} file${fileList.length > 1 ? 's' : ''} uploaded and attached!`,
        { id: 'upload_attachments' }
      );
    } catch {
      toast.dismiss('upload_attachments');
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleToggle = (id: string) => {
    onChange(
      attachments.map((a) => (a.id === id ? { ...a, selected: !a.selected } : a))
    );
  };

  const handleDelete = (id: string) => {
    onChange(attachments.filter((a) => a.id !== id));
  };

  const isImage = (type: string, name: string) =>
    type.startsWith('image/') || /\.(png|jpe?g|webp|gif|svg)$/i.test(name);

  return (
    <div className={`space-y-2.5 ${className}`}>
      {/* Upload Trigger Dropzone / Button */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        className={`relative flex items-center justify-between p-3 rounded-xl border-2 border-dashed transition-all ${
          isDragging
            ? 'border-indigo-500 bg-indigo-50/80 ring-2 ring-indigo-500/20'
            : 'border-indigo-200 bg-indigo-50/40 hover:bg-indigo-50/80 hover:border-indigo-300'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.png,.jpg,.jpeg,.webp,.gif,.txt"
          onChange={(e) => handleFiles(e.target.files)}
          className="hidden"
        />

        <div className="flex items-center gap-2.5 flex-1 min-w-0 pr-2">
          <div className="p-2 bg-indigo-600 text-white rounded-lg shrink-0 shadow-2xs">
            <Upload className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-xs font-bold text-indigo-950 block truncate">
              Upload Additional File / Custom Attachment
            </span>
            <span className="text-[11px] text-slate-500 block truncate">
              Attach PDFs, extra images/photos, workshop receipts, or documents
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-indigo-700 bg-white hover:bg-indigo-50 border border-indigo-200 rounded-lg shadow-2xs transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          Browse Files
        </button>
      </div>

      {/* Uploaded Custom Attachments List */}
      {attachments.length > 0 && (
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 px-1">
            <span>Extra Uploaded Files ({attachments.length}):</span>
            <span className="text-indigo-600">
              {attachments.filter((a) => a.selected).length} selected to attach
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {attachments.map((item) => {
              const isImg = isImage(item.type, item.name);
              const isSelected = item.selected !== false;

              return (
                <div
                  key={item.id}
                  className={`flex items-center justify-between p-2.5 rounded-xl border text-xs transition-all ${
                    isSelected
                      ? 'bg-indigo-50/70 border-indigo-300 ring-1 ring-indigo-400/20 shadow-2xs'
                      : 'bg-white border-slate-200 opacity-75 hover:opacity-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      disabled={item.isUploading}
                      onChange={() => handleToggle(item.id)}
                      className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 shrink-0 cursor-pointer"
                    />

                    <div
                      className={`p-1.5 rounded-lg shrink-0 ${
                        isImg ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'
                      }`}
                    >
                      {isImg ? <ImageIcon className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-slate-900 truncate" title={item.name}>
                        {item.name}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-500">
                        <span>{formatFileSize(item.size)}</span>
                        {item.isUploading ? (
                          <span className="inline-flex items-center gap-1 text-amber-600 font-medium">
                            <Loader2 className="w-2.5 h-2.5 animate-spin" /> Uploading...
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-0.5 text-emerald-600 font-medium">
                            <Check className="w-2.5 h-2.5" /> Attached
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {item.url && !item.isUploading && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(item.url, '_blank', 'noopener,noreferrer');
                        }}
                        className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-md transition-colors"
                        title="View / Open file"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(item.id);
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                      title="Remove attachment"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
