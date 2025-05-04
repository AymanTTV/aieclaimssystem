// src/pdfWorker.ts
import { pdf } from '@react-pdf/renderer';
import { createElement } from 'react';

// import **all** your PDF components here
import {
  RentalAgreement,
  RentalInvoice
} from './';
import {
  ConditionOfHire,
  NoticeOfRightToCancel,
  HireAgreement,
  CreditStorageAndRecovery
} from './claims';

// our worker receives { type, payload } messages
self.onmessage = async (e: MessageEvent<{ type: string; payload: any }>) => {
  const { type, payload } = e.data;
  try {
    let blob: Blob;
    switch (type) {
      case 'agreement':
        blob = await pdf(createElement(RentalAgreement, payload)).toBlob();
        break;
      case 'invoice':
        blob = await pdf(createElement(RentalInvoice, payload)).toBlob();
        break;
      case 'conditionOfHire':
        blob = await pdf(createElement(ConditionOfHire, payload)).toBlob();
        break;
      case 'noticeOfRightToCancel':
        blob = await pdf(createElement(NoticeOfRightToCancel, payload)).toBlob();
        break;
      case 'hireAgreement':
        blob = await pdf(createElement(HireAgreement, payload)).toBlob();
        break;
      case 'creditStorageAndRecovery':
        blob = await pdf(createElement(CreditStorageAndRecovery, payload)).toBlob();
        break;
      default:
        throw new Error(`Unknown PDF type: ${type}`);
    }
    // send it back
    self.postMessage({ type, blob });
  } catch (error: any) {
    self.postMessage({ type: 'error', error: error.message });
  }
};
