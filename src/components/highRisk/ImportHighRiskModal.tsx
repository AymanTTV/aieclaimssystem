// src/components/highRisk/ImportHighRiskModal.tsx
import React, { useState, useRef } from 'react';
import {
  Upload,
  FileSpreadsheet,
  Download,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  X,
  FileText,
  RefreshCw,
  Info,
} from 'lucide-react';
import { HighRiskDriver } from '../../types/highRiskDriver';
import {
  parseHighRiskImportFile,
  downloadHighRiskTemplate,
  ParseResult,
} from '../../services/highRiskExportImport';

interface ImportHighRiskModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingDrivers: HighRiskDriver[];
  onImportConfirm: (importedDrivers: HighRiskDriver[], mode: 'merge' | 'replace') => void;
}

export const ImportHighRiskModal: React.FC<ImportHighRiskModalProps> = ({
  isOpen,
  onClose,
  existingDrivers,
  onImportConfirm,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleProcessFile = async (selectedFile: File) => {
    setFile(selectedFile);
    setIsParsing(true);
    try {
      const result = await parseHighRiskImportFile(selectedFile, existingDrivers);
      setParseResult(result);
    } catch {
      setParseResult({
        validDrivers: [],
        skippedCount: 0,
        duplicateCount: 0,
        errors: ['An unexpected error occurred while parsing the file.'],
      });
    } finally {
      setIsParsing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleProcessFile(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleProcessFile(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleReset = () => {
    setFile(null);
    setParseResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleConfirm = () => {
    if (!parseResult || parseResult.validDrivers.length === 0) return;
    onImportConfirm(parseResult.validDrivers, importMode);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-[#111a33] border-2 border-slate-700 rounded-2xl shadow-2xl text-slate-100 my-8 overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 bg-[#0b132b] border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-red-600 text-white shadow-md shadow-red-950 flex-shrink-0">
              <Upload className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white uppercase tracking-tight flex items-center gap-2">
                <span>Import High Risk Drivers</span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-red-950/80 text-red-300 border border-red-800">
                  Bulk Registry
                </span>
              </h2>
              <p className="text-xs text-slate-400 font-medium">
                Upload CSV, Excel (.xlsx, .xls) or JSON to populate the fleet high-risk database.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Download Template Bar */}
          <div className="p-3.5 rounded-xl bg-[#0c1427] border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-slate-300">
              <Info className="w-4 h-4 text-indigo-400 flex-shrink-0" />
              <span>Need the proper format? Download our pre-formatted templates:</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => downloadHighRiskTemplate('csv')}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 font-bold transition flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-red-400" />
                <span>CSV Template</span>
              </button>
              <button
                type="button"
                onClick={() => downloadHighRiskTemplate('xlsx')}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 font-bold transition flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                <span>Excel (.xlsx) Template</span>
              </button>
            </div>
          </div>

          {/* Upload Dropzone */}
          {!file ? (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                isDragging
                  ? 'border-red-500 bg-red-950/20'
                  : 'border-slate-700 hover:border-slate-500 bg-slate-900/60 hover:bg-slate-900/90'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls,.json"
                className="hidden"
                onChange={handleFileChange}
              />
              <div className="w-14 h-14 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center mx-auto mb-3 shadow-inner">
                <FileSpreadsheet className="w-7 h-7 text-indigo-400" />
              </div>
              <h3 className="text-sm font-bold text-white mb-1">
                Click to browse or drag and drop your file here
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mb-3">
                Supports CSV spreadsheets, Excel workbooks (.xlsx, .xls), and JSON export files.
              </p>
              <span className="inline-block px-3 py-1 text-[11px] font-bold rounded-lg bg-slate-800 text-slate-300 border border-slate-700">
                Auto-detects Full Name, Badge #, Risk Level, Category & Reporting Fleet
              </span>
            </div>
          ) : (
            <div className="space-y-4">
              {/* File Info Bar */}
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-indigo-600/30 text-indigo-400 border border-indigo-500/30">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white truncate max-w-md">{file.name}</h4>
                    <p className="text-xs text-slate-400">
                      {(file.size / 1024).toFixed(1)} KB •{' '}
                      {isParsing ? 'Analyzing rows...' : `${parseResult?.validDrivers.length || 0} valid drivers ready`}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleReset}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold border border-slate-700 transition flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Change File</span>
                </button>
              </div>

              {/* Parsing State */}
              {isParsing && (
                <div className="p-8 text-center space-y-3">
                  <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin mx-auto" />
                  <p className="text-xs text-slate-300 font-bold">Parsing records and validating columns...</p>
                </div>
              )}

              {/* Parsing Errors */}
              {parseResult && parseResult.errors.length > 0 && (
                <div className="p-4 rounded-xl bg-red-950/40 border border-red-800 text-xs text-red-200 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-red-300">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>Parsing Warnings:</span>
                  </div>
                  {parseResult.errors.map((err, i) => (
                    <p key={i} className="pl-5">• {err}</p>
                  ))}
                </div>
              )}

              {/* Statistics Badges */}
              {parseResult && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800 flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-bold text-emerald-300 uppercase">Valid Records</p>
                      <p className="text-xl font-black text-white">{parseResult.validDrivers.length}</p>
                    </div>
                    <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                  </div>

                  <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-800 flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-bold text-amber-300 uppercase">Existing Matches</p>
                      <p className="text-xl font-black text-white">{parseResult.duplicateCount}</p>
                    </div>
                    <AlertTriangle className="w-6 h-6 text-amber-400" />
                  </div>

                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-bold text-slate-400 uppercase">Skipped / Empty</p>
                      <p className="text-xl font-black text-white">{parseResult.skippedCount}</p>
                    </div>
                    <AlertCircle className="w-6 h-6 text-slate-400" />
                  </div>
                </div>
              )}

              {/* Mode Selection */}
              {parseResult && parseResult.validDrivers.length > 0 && (
                <div className="p-4 rounded-xl bg-[#0c1427] border border-slate-800 space-y-3">
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-300">
                    Import Mode & Duplicate Resolution:
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label
                      className={`p-3 rounded-xl border-2 flex items-start gap-3 cursor-pointer transition ${
                        importMode === 'merge'
                          ? 'border-indigo-500 bg-indigo-950/30'
                          : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                      }`}
                    >
                      <input
                        type="radio"
                        name="importMode"
                        value="merge"
                        checked={importMode === 'merge'}
                        onChange={() => setImportMode('merge')}
                        className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                      />
                      <div className="text-xs">
                        <span className="font-bold text-white block">Merge & Update (Recommended)</span>
                        <span className="text-slate-400 text-[11px]">
                          Updates existing drivers if full name matches, and appends new high-risk drivers. Zero records lost.
                        </span>
                      </div>
                    </label>

                    <label
                      className={`p-3 rounded-xl border-2 flex items-start gap-3 cursor-pointer transition ${
                        importMode === 'replace'
                          ? 'border-red-500 bg-red-950/30'
                          : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                      }`}
                    >
                      <input
                        type="radio"
                        name="importMode"
                        value="replace"
                        checked={importMode === 'replace'}
                        onChange={() => setImportMode('replace')}
                        className="mt-0.5 text-red-600 focus:ring-red-500"
                      />
                      <div className="text-xs">
                        <span className="font-bold text-red-300 block">Replace Entire Database</span>
                        <span className="text-slate-400 text-[11px]">
                          Replaces current records with this uploaded file. Use for clean fresh fleet restores.
                        </span>
                      </div>
                    </label>
                  </div>
                </div>
              )}

              {/* Data Preview Table */}
              {parseResult && parseResult.validDrivers.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-300 font-bold">
                    <span>Preview of Records to Import (Showing first {Math.min(parseResult.validDrivers.length, 5)} of {parseResult.validDrivers.length})</span>
                    <span className="text-slate-500 font-normal">All columns parsed automatically</span>
                  </div>

                  <div className="border border-slate-800 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#070d1e] text-slate-400 border-b border-slate-800 font-bold uppercase text-[10px]">
                        <tr>
                          <th className="px-3 py-2">Full Name</th>
                          <th className="px-3 py-2">Badge #</th>
                          <th className="px-3 py-2">Risk Level</th>
                          <th className="px-3 py-2">Category</th>
                          <th className="px-3 py-2">Reporting Fleet</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 bg-slate-900/60 text-slate-200">
                        {parseResult.validDrivers.slice(0, 5).map((d) => (
                          <tr key={d.id}>
                            <td className="px-3 py-2 font-black text-white">{d.fullName}</td>
                            <td className="px-3 py-2 font-mono text-[11px] text-slate-400">{d.badgeNumber || 'N/A'}</td>
                            <td className="px-3 py-2">
                              <span
                                className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                  d.riskLevel === 'High Risk'
                                    ? 'bg-red-950 text-red-300 border border-red-800'
                                    : d.riskLevel === 'Caution'
                                    ? 'bg-amber-950 text-amber-300 border border-amber-800'
                                    : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                }`}
                              >
                                {d.riskLevel}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-slate-300">{d.category}</td>
                            <td className="px-3 py-2 text-slate-400">{d.reportingFleet}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#0b132b] border-t border-slate-800 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={!parseResult || parseResult.validDrivers.length === 0}
            onClick={handleConfirm}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-lg transition ${
              parseResult && parseResult.validDrivers.length > 0
                ? 'bg-red-600 hover:bg-red-500 text-white cursor-pointer shadow-red-950'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>
              Confirm &amp; Import{' '}
              {parseResult && parseResult.validDrivers.length > 0
                ? `${parseResult.validDrivers.length} Records`
                : ''}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
