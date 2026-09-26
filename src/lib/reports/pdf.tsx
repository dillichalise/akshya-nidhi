import "server-only";
import path from "node:path";
import { Document, Font, Page, renderToBuffer, StyleSheet, Text, View } from "@react-pdf/renderer";
import { formatDate, formatNPR } from "@/lib/format";
import type { ReportData, ReportLabels } from "./shared";

const fontDir = path.join(process.cwd(), "assets", "fonts");
Font.register({
  family: "NotoLatin",
  fonts: [
    { src: path.join(fontDir, "NotoSans-Regular.woff"), fontWeight: 400 },
    { src: path.join(fontDir, "NotoSans-Bold.woff"), fontWeight: 700 },
  ],
});
Font.register({
  family: "NotoDeva",
  fonts: [
    { src: path.join(fontDir, "NotoSansDevanagari-Regular.woff"), fontWeight: 400 },
    { src: path.join(fontDir, "NotoSansDevanagari-Bold.woff"), fontWeight: 700 },
  ],
});
// No hyphenation: it mangles names and Devanagari words.
Font.registerHyphenationCallback((w) => [w]);

const s = StyleSheet.create({
  page: { padding: 28, fontFamily: "NotoLatin", fontSize: 9, color: "#1c1917" },
  title: { fontSize: 16, fontWeight: 700, color: "#92400e" },
  meta: { marginTop: 2, color: "#57534e" },
  head: { flexDirection: "row", backgroundColor: "#fef3c7", borderBottom: "1pt solid #d6d3d1", paddingVertical: 4 },
  row: { flexDirection: "row", borderBottom: "0.5pt solid #e7e5e4", paddingVertical: 3 },
  cell: { paddingHorizontal: 4 },
  totalRow: { flexDirection: "row", marginTop: 6, paddingTop: 6, borderTop: "1pt solid #1c1917" },
  footer: { position: "absolute", bottom: 14, left: 28, right: 28, flexDirection: "row", justifyContent: "space-between", color: "#78716c", fontSize: 8 },
});

const W = { sn: 30, date: 100, name: 112, phone: 76, address: 150, amount: 104, remarks: 174 };

/** Renders mixed English/Devanagari text by switching font per script run. */
function T({ children, bold }: { children: string; bold?: boolean }) {
  const parts = children.split(/([ऀ-ॿ]+(?:[ ऀ-ॿ]+)*)/g).filter(Boolean);
  return (
    <Text style={{ fontWeight: bold ? 700 : 400 }}>
      {parts.map((p, i) => (
        <Text key={i} style={{ fontFamily: /[ऀ-ॿ]/.test(p) ? "NotoDeva" : "NotoLatin" }}>
          {p}
        </Text>
      ))}
    </Text>
  );
}

function Cell({ w, right, bold, children }: { w: number; right?: boolean; bold?: boolean; children: string }) {
  return (
    <View style={[s.cell, { width: w }]}>
      <View style={{ alignItems: right ? "flex-end" : "flex-start" }}>
        <T bold={bold}>{children}</T>
      </View>
    </View>
  );
}

function ReportDocument({ data, labels, locale }: { data: ReportData; labels: ReportLabels; locale: string }) {
  return (
    <Document title={labels.title}>
      <Page size="A4" orientation="landscape" style={s.page}>
        <View fixed={false}>
          <T bold>{labels.title}</T>
          <Text style={s.meta}>
            <T>{labels.period}</T>
          </Text>
          <Text style={s.meta}>
            <T>{`${labels.generatedOn} · ${labels.generatedBy}`}</T>
          </Text>
        </View>

        <View style={{ marginTop: 10 }}>
          <View style={s.head} fixed>
            <Cell w={W.sn} bold>{labels.sn}</Cell>
            <Cell w={W.date} bold>{labels.date}</Cell>
            <Cell w={W.name} bold>{labels.name}</Cell>
            <Cell w={W.phone} bold>{labels.phone}</Cell>
            <Cell w={W.address} bold>{labels.address}</Cell>
            <Cell w={W.amount} right bold>{labels.amount}</Cell>
            <Cell w={W.remarks} bold>{labels.remarks}</Cell>
          </View>
          {data.rows.map((r, i) => (
            <View key={r.id} style={s.row} wrap={false}>
              <Cell w={W.sn}>{String(i + 1)}</Cell>
              <Cell w={W.date}>{formatDate(r.donationDate, locale)}</Cell>
              <Cell w={W.name}>{r.donorName}</Cell>
              <Cell w={W.phone}>{r.phone}</Cell>
              <Cell w={W.address}>{r.address}</Cell>
              <Cell w={W.amount} right>{formatNPR(r.amount)}</Cell>
              <Cell w={W.remarks}>{r.remarks ?? ""}</Cell>
            </View>
          ))}
          <View style={s.totalRow} wrap={false}>
            <Cell w={W.sn + W.date + W.name + W.phone + W.address} right bold>
              {`${labels.grandTotal} (${labels.records})`}
            </Cell>
            <Cell w={W.amount} right bold>{formatNPR(data.total)}</Cell>
          </View>
        </View>

        <View style={s.footer} fixed>
          <T>{labels.title}</T>
          <Text
            render={({ pageNumber, totalPages }) =>
              labels.page.replace("{page}", String(pageNumber)).replace("{pages}", String(totalPages))
            }
            style={{ fontFamily: "NotoDeva" }}
          />
        </View>
      </Page>
    </Document>
  );
}

export function buildPdf(data: ReportData, labels: ReportLabels, locale: string): Promise<Buffer> {
  return renderToBuffer(<ReportDocument data={data} labels={labels} locale={locale} />);
}
