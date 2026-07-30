// src/components/pdf/documents/ReceiptDocument.tsx

import React from 'react';
import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer';
import { Transaction } from '../../../types/finance';

interface ReceiptDocumentProps {
  data: Transaction;
  companyDetails: {
    logoUrl?: string;
    fullName: string;
    officialAddress: string;
    phone: string;
    email: string;
  };
}

const styles = StyleSheet.create({
  page:{
    width:227,paddingTop:12,paddingHorizontal:12,paddingBottom:20,
    fontFamily:'Helvetica',fontSize:9,color:'#222',position:'relative'
  },
  logo:{width:58,height:58,alignSelf:'center',marginBottom:6},
  watermark:{position:'absolute',width:120,height:120,opacity:0.06,top:'45%',left:'24%'},
  companyName:{textAlign:'center',fontSize:12,fontWeight:'bold',marginBottom:3},
  companyText:{textAlign:'center',fontSize:9,marginBottom:2},
  divider:{borderBottomWidth:1,borderBottomColor:'#D8D8D8',marginVertical:8},
  info:{textAlign:'center',fontSize:10,marginBottom:3},
  table:{marginTop:2},
  row:{flexDirection:'row',minHeight:30,borderBottomWidth:1,borderBottomColor:'#D8D8D8'},
  left:{width:'42%',borderRightWidth:1,borderRightColor:'#D8D8D8',justifyContent:'center',paddingVertical:7,paddingHorizontal:6},
  right:{width:'58%',justifyContent:'center',paddingVertical:7,paddingHorizontal:6},
  label:{fontWeight:'bold',fontSize:10},
  value:{fontSize:10,textAlign:'left',lineHeight:1.4},
  totalLabel:{fontWeight:'bold',fontSize:11},
  totalValue:{fontWeight:'bold',fontSize:13,textAlign:'right'},
  footer:{textAlign:'center',marginTop:18,fontSize:11,fontStyle:'italic'}
});

const ReceiptDocument:React.FC<ReceiptDocumentProps>=({data,companyDetails})=>{

  const fmtDate=(d:Date|string)=>new Date(d).toLocaleString('en-GB');
  const fmtMoney=(n:number)=>`£${n.toFixed(2)}`;

  const estimate=(t?:string,c=22)=>t?Math.ceil(t.length/c):0;
  const pageHeight=280+estimate(data.customerName)*16+estimate(data.vehicleName)*16+estimate(data.description)*16;

  const receiptNumber=data.id
    ? data.id.replace(/\D/g,'').slice(-4).padStart(4,'0')
    : Math.floor(1000+Math.random()*9000).toString();

  const paidBy=data.paymentMethod
    ? data.paymentMethod.replace(/_/g,' ').replace(/\b\w/g,m=>m.toUpperCase())
    : 'N/A';

  return(
    <Document>
      <Page size={[227, 480]} style={styles.page}>

        {companyDetails.logoUrl && <Image src={companyDetails.logoUrl} style={styles.watermark} fixed/>}
        {companyDetails.logoUrl && <Image src={companyDetails.logoUrl} style={styles.logo}/>}

        <Text style={styles.companyName}>{companyDetails.fullName}</Text>
        <Text style={styles.companyText}>{companyDetails.officialAddress}</Text>
        <Text style={styles.companyText}>Tel: {companyDetails.phone}</Text>
        <Text style={styles.companyText}>Email: {companyDetails.email}</Text>

        <View style={styles.divider}/>

        <Text style={styles.info}>Receipt No: {receiptNumber}</Text>
        <Text style={styles.info}>Date: {fmtDate(data.date)}</Text>

        <View style={styles.divider}/>

        <View style={styles.table}>

          {!!data.customerName && (
            <View style={styles.row}>
              <View style={styles.left}><Text style={styles.label}>Customer:</Text></View>
              <View style={styles.right}><Text style={styles.value}>{data.customerName}</Text></View>
            </View>
          )}

          {!!data.vehicleName && (
            <View style={styles.row}>
              <View style={styles.left}><Text style={styles.label}>Vehicle:</Text></View>
              <View style={styles.right}><Text style={styles.value}>{data.vehicleName}</Text></View>
            </View>
          )}

          <View style={styles.row}>
            <View style={styles.left}><Text style={styles.label}>Description:</Text></View>
            <View style={styles.right}>
              <Text style={styles.value}>{data.description || data.category}</Text>
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.left}><Text style={styles.totalLabel}>Total:</Text></View>
            <View style={styles.right}><Text style={styles.totalValue}>{fmtMoney(data.amount)}</Text></View>
          </View>

          <View style={styles.row}>
            <View style={styles.left}><Text style={styles.label}>Paid By:</Text></View>
            <View style={styles.right}><Text style={styles.value}>{paidBy}</Text></View>
          </View>

        </View>

        <Text style={styles.footer}>Thank you for your business!</Text>

      </Page>
    </Document>
  );
};

export default ReceiptDocument;
