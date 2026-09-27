import "server-only";
import { Document, Page, renderToBuffer, StyleSheet, Text, View } from "@react-pdf/renderer";
import { formatDate, formatNPR } from "@/lib/format";
import { MixedText as T, registerPdfFonts } from "@/lib/pdf/shared";
import type { ReceiptLabels, ReceiptRow } from "./shared";

registerPdfFonts();

const s = StyleSheet.create({
  page: { padding: 40, fontFamily: "NotoLatin", fontSize: 11, color: "#1c1917" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottom: "2pt solid #92400e",
    paddingBottom: 12,
    marginBottom: 20,
  },
  orgName: { fontSize: 18, fontWeight: 700, color: "#92400e" },
  orgTagline: { marginTop: 2, fontSize: 10, color: "#57534e" },
  metaBlock: { alignItems: "flex-end" },
  receiptTitle: { fontSize: 13, fontWeight: 700 },
  metaLine: { marginTop: 2, fontSize: 9, color: "#57534e" },
  sectionTitle: { marginBottom: 8, fontSize: 11, fontWeight: 700, color: "#57534e" },
  row: { flexDirection: "row", paddingVertical: 7, borderBottom: "0.5pt solid #e7e5e4" },
  label: { width: 130, color: "#78716c" },
  value: { flex: 1, fontWeight: 700 },
  amountBox: {
    marginTop: 20,
    padding: 14,
    borderRadius: 6,
    backgroundColor: "#fef3c7",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  amountLabel: { fontSize: 11, color: "#78350f", fontWeight: 700 },
  amountValue: { fontSize: 20, fontWeight: 700, color: "#78350f" },
  thanks: { marginTop: 26, fontSize: 10, color: "#57534e", textAlign: "center" },
  signOff: { marginTop: 40, flexDirection: "row", justifyContent: "flex-end" },
  signOffText: { fontSize: 9, color: "#57534e", textAlign: "right" },
  footer: { position: "absolute", bottom: 24, left: 40, right: 40, fontSize: 8, color: "#a8a29e", textAlign: "center" },
});

function Row({ label, children }: { label: string; children: string }) {
  return (
    <View style={s.row}>
      <Text style={s.label}>
        <T>{label}</T>
      </Text>
      <View style={s.value}>
        <T>{children}</T>
      </View>
    </View>
  );
}

function ReceiptDocument({ data, labels, locale }: { data: ReceiptRow; labels: ReceiptLabels; locale: string }) {
  return (
    <Document title={labels.title}>
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <View>
            <Text style={s.orgName}>
              <T>{labels.orgName}</T>
            </Text>
            <Text style={s.orgTagline}>
              <T>{labels.orgTagline}</T>
            </Text>
          </View>
          <View style={s.metaBlock}>
            <Text style={s.receiptTitle}>
              <T>{labels.title}</T>
            </Text>
            <Text style={s.metaLine}>
              <T>{labels.receiptNo}</T>
            </Text>
            <Text style={s.metaLine}>{formatDate(data.donationDate, locale)}</Text>
          </View>
        </View>

        <Text style={s.sectionTitle}>
          <T>{labels.receivedFrom}</T>
        </Text>
        <View>
          <Row label={labels.name}>{data.donorName}</Row>
          <Row label={labels.phone}>{data.phone}</Row>
          <Row label={labels.address}>{data.address}</Row>
          <Row label={labels.date}>{formatDate(data.donationDate, locale)}</Row>
          {data.remarks && <Row label={labels.remarks}>{data.remarks}</Row>}
        </View>

        <View style={s.amountBox}>
          <Text style={s.amountLabel}>
            <T>{labels.amount}</T>
          </Text>
          <Text style={s.amountValue}>{formatNPR(data.amount)}</Text>
        </View>

        <Text style={s.thanks}>
          <T>{labels.thanks}</T>
        </Text>

        <View style={s.signOff}>
          <View>
            <Text style={s.signOffText}>
              <T>{labels.issuedBy}</T>
            </Text>
            <Text style={s.signOffText}>
              <T>{labels.generatedOn}</T>
            </Text>
          </View>
        </View>

        <Text style={s.footer}>
          <T>{labels.footerNote}</T>
        </Text>
      </Page>
    </Document>
  );
}

export function buildReceiptPdf(data: ReceiptRow, labels: ReceiptLabels, locale: string): Promise<Buffer> {
  return renderToBuffer(<ReceiptDocument data={data} labels={labels} locale={locale} />);
}
