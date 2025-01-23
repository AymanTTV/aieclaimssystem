
import { StyleSheet } from '@react-pdf/renderer';

export const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  logo: {
    width: 120,
    height: 'auto',
  },
  companyInfo: {
    textAlign: 'right',
    fontSize: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    borderBottom: 1,
    borderBottomColor: '#000',
    paddingBottom: 10,
  },
  section: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  text: {
    fontSize: 10,
    marginBottom: 8,
    lineHeight: 1.4,
  },
  list: {
    marginLeft: 20,
    marginBottom: 10,
  },
  listItem: {
    fontSize: 10,
    marginBottom: 5,
  },
  signatureSection: {
    marginTop: 30,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  signatureBox: {
    width: '45%',
  },
  signature: {
    width: '100%',
    height: 50,
    marginBottom: 5,
  },
  signatureLine: {
    borderTop: 1,
    borderTopColor: '#000',
    marginTop: 5,
    paddingTop: 5,
    textAlign: 'center',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    fontSize: 8,
    textAlign: 'center',
    color: '#666',
  },
  reference: {
    fontSize: 10,
    marginBottom: 10,
  },
  date: {
    fontSize: 10,
    marginBottom: 20,
  },
});
