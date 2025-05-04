import React from 'react';
import { Document, Page, Text, View, Image } from '@react-pdf/renderer';
import { Rental, Vehicle, Customer, VehicleCondition } from '../../../types';
import { styles } from '../styles';
import { formatDate } from '../../../utils/dateHelpers';

interface RentalDocumentProps {
  data: Rental & {
    checkOutCondition?: VehicleCondition;
    checkOutImages?: string[];
    customerSignature?: string;
    customerSignatureDate?: Date;
    companySignature?: string;
    companySignatureDate?: Date;
  };
  vehicle?: Vehicle;
  customer?: Customer;
  companyDetails: {
    logoUrl: string;
    fullName: string;
    officialAddress: string;
    phone: string;
    email: string;
  };
}

const RentalDocument: React.FC<RentalDocumentProps> = ({ 
  data, 
  vehicle, 
  customer, 
  companyDetails 
}) => {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Image src={companyDetails.logoUrl} style={styles.logo} />
          <View style={styles.companyInfo}>
            <Text>{companyDetails.fullName}</Text>
            <Text>{companyDetails.officialAddress}</Text>
            <Text>Tel: {companyDetails.phone}</Text>
            <Text>Email: {companyDetails.email}</Text>
          </View>
        </View>

        <Text style={styles.title}>Rental Agreement</Text>

        {/* Rental Details */}
        <View style={[styles.section, styles.keepTogether]}>
          <Text style={styles.sectionTitle}>Rental Information</Text>
          <View style={styles.infoCard}>
            <View style={styles.row}>
              <Text style={styles.label}>Type:</Text>
              <Text style={styles.value}>{data.type}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Start Date:</Text>
              <Text style={styles.value}>{formatDate(data.startDate)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>End Date:</Text>
              <Text style={styles.value}>{formatDate(data.endDate)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Status:</Text>
              <Text style={styles.value}>{data.status}</Text>
            </View>
          </View>
        </View>

        {/* Vehicle Details */}
        {vehicle && (
          <View style={[styles.section, styles.keepTogether]}>
            <Text style={styles.sectionTitle}>Vehicle Details</Text>
            <View style={styles.infoCard}>
              <View style={styles.row}>
                <Text style={styles.label}>Make & Model:</Text>
                <Text style={styles.value}>{vehicle.make} {vehicle.model}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Registration:</Text>
                <Text style={styles.value}>{vehicle.registrationNumber}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Current Mileage:</Text>
                <Text style={styles.value}>{vehicle.mileage.toLocaleString()} miles</Text>
              </View>
            </View>
          </View>
        )}

        {/* Vehicle Condition at Check-Out */}
        <View style={[styles.section, styles.keepTogether]}>
          <Text style={styles.sectionTitle}>Vehicle Condition at Check-Out</Text>
          <View style={styles.infoCard}>
            <View style={styles.row}>
              <Text style={styles.label}>Exterior Condition:</Text>
              <Text style={styles.value}>{data.checkOutCondition?.exteriorCondition || 'Not assessed'}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Notes:</Text>
              <Text style={styles.value}>{data.checkOutCondition?.conditionNotes || 'No notes'}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Fuel Level:</Text>
              <Text style={styles.value}>{data.checkOutCondition?.fuelLevel || 'Not recorded'}</Text>
            </View>
          </View>
        </View>

        {/* Vehicle Check-Out Images */}
        {data.checkOutImages && data.checkOutImages.length > 0 && (
          <View style={[styles.section, styles.keepTogether]}>
            <Text style={styles.sectionTitle}>Vehicle Check-Out Images</Text>
            <View style={styles.imageContainer}>
              {data.checkOutImages.map((image: string, index: number) => (
                <Image 
                  key={index}
                  src={image} 
                  style={{
                    ...styles.vehicleImage,
                    width: 180,
                    height: 120
                  }}
                />
              ))}
            </View>
          </View>
        )}

        {/* Customer Details */}
        {customer && (
          <View style={[styles.section, styles.keepTogether]}>
            <Text style={styles.sectionTitle}>Customer Details</Text>
            <View style={styles.infoCard}>
              <View style={styles.row}>
                <Text style={styles.label}>Name:</Text>
                <Text style={styles.value}>{customer.name}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Contact:</Text>
                <Text style={styles.value}>{customer.mobile}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Email:</Text>
                <Text style={styles.value}>{customer.email}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Address:</Text>
                <Text style={styles.value}>{customer.address}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Payment Details */}
        <View style={[styles.section, styles.keepTogether]}>
          <Text style={styles.sectionTitle}>Payment Details</Text>
          <View style={styles.infoCard}>
            <View style={styles.row}>
              <Text style={styles.label}>Total Cost:</Text>
              <Text style={styles.value}>£{data.cost.toFixed(2)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Amount Paid:</Text>
              <Text style={styles.value}>£{data.paidAmount.toFixed(2)}</Text>
            </View>
            {data.remainingAmount > 0 && (
              <View style={styles.row}>
                <Text style={styles.label}>Remaining Amount:</Text>
                <Text style={styles.value}>£{data.remainingAmount.toFixed(2)}</Text>
              </View>
            )}
            <View style={styles.row}>
              <Text style={styles.label}>Payment Status:</Text>
              <Text style={styles.value}>{data.paymentStatus}</Text>
            </View>
          </View>
        </View>

        {/* Terms and Conditions */}
        <View style={[styles.section, styles.keepTogether]}>
          <Text style={styles.sectionTitle}>Terms and Conditions</Text>
          <View style={styles.infoCard}>
            <Text style={styles.value}>
              1. The vehicle must be returned in the same condition as at check-out.{'\n'}
              2. Any damage beyond normal wear and tear will be charged to the customer.{'\n'}
              3. Late returns will incur additional charges.{'\n'}
              4. Fuel must be returned at the same level as at check-out.{'\n'}
              5. The vehicle must not be used for any illegal purposes.{'\n'}
              6. The customer is responsible for any traffic violations during the rental period.
            </Text>
          </View>
        </View>

        {/* Signatures */}
        <View style={styles.signatureSection}>
          <View style={styles.signatureBox}>
            <Text>Customer Signature</Text>
            <Image style={styles.signature} src={data.customerSignature} />
            <Text style={styles.signatureLine}>
              Date: {data.customerSignatureDate ? formatDate(data.customerSignatureDate) : 'Not signed'}
            </Text>
          </View>
          <View style={styles.signatureBox}>
            <Text>Company Representative</Text>
            <Image style={styles.signature} src={data.companySignature} />
            <Text style={styles.signatureLine}>
              Date: {data.companySignatureDate ? formatDate(data.companySignatureDate) : 'Not signed'}
            </Text>
          </View>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          {companyDetails.fullName} | Generated on {formatDate(new Date())}
        </Text>
      </Page>
    </Document>
  );
};

export default RentalDocument;