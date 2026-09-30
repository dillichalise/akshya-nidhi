import "server-only";
import { Document, Page, renderToBuffer, StyleSheet, Text, View } from "@react-pdf/renderer";
import { formatDate, formatNPR } from "@/lib/format";
import { MixedText as T, registerPdfFonts } from "@/lib/pdf/shared";
import type { IesReportData, IesReportLabels } from "./ies-handler";

registerPdfFonts();

const styles = StyleSheet.create({
  page: { padding: 36, fontFamily: "NotoLatin", fontSize: 10, color: "#1c1917" },
  title: { fontSize: 16, color: "#92400e" },
  meta: { marginTop: 4, color: "#57534e" },
  summaries: { flexDirection: "row", gap: 10, marginTop: 18, marginBottom: 20 },
  summary: { flexGrow: 1, padding: 10, border: "1pt solid #d6d3d1", backgroundColor: "#fafaf9" },
  tableHead: { flexDirection: "row", backgroundColor: "#fef3c7", paddingVertical: 6, borderBottom: "1pt solid #d6d3d1" },
  row: { flexDirection: "row", paddingVertical: 6, borderBottom: "0.5pt solid #e7e5e4" },
  total: { flexDirection: "row", paddingVertical: 7, borderTop: "1pt solid #1c1917" },
  cell: { paddingHorizontal: 6 },
});

const columns = [150, 175, 175, 175];

function Cell({ width, right, bold, children }: { width: number; right?: boolean; bold?: boolean; children: string }) {
  return (
    <View style={[styles.cell, { width }, right ? { alignItems: "flex-end" } : {}]}>
      <T bold={bold}>{children}</T>
    </View>
  );
}

function IesDocument({ data, labels, locale }: { data: IesReportData; labels: IesReportLabels; locale: string }) {
  const values = [data.totals.income, data.totals.expenditure, data.totals.savings];
  const headings = [labels.income, labels.expenditure, labels.savings];
  return (
    <Document title={labels.title}>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <Text style={styles.title}><T bold>{labels.title}</T></Text>
        <Text style={styles.meta}><T>{data.period}</T></Text>

        <View style={styles.summaries}>
          {headings.map((heading, index) => (
            <View key={heading} style={styles.summary}>
              <Text style={{ color: "#57534e" }}><T>{heading}</T></Text>
              <Text style={{ marginTop: 5, fontSize: 13 }}><T bold>{formatNPR(values[index], locale)}</T></Text>
            </View>
          ))}
        </View>

        <View style={styles.tableHead} fixed>
          <Cell width={columns[0]} bold>{labels.date}</Cell>
          <Cell width={columns[1]} right bold>{labels.income}</Cell>
          <Cell width={columns[2]} right bold>{labels.expenditure}</Cell>
          <Cell width={columns[3]} right bold>{labels.savings}</Cell>
        </View>
        {data.rows.map((row, index) => (
          <View key={`${row.date}-${index}`} style={styles.row} wrap={false}>
            <Cell width={columns[0]}>{row.date ? formatDate(row.date, locale) : labels.overall}</Cell>
            <Cell width={columns[1]} right>{formatNPR(row.income, locale)}</Cell>
            <Cell width={columns[2]} right>{formatNPR(row.expenditure, locale)}</Cell>
            <Cell width={columns[3]} right>{formatNPR(row.savings, locale)}</Cell>
          </View>
        ))}
        <View style={styles.total} wrap={false}>
          <Cell width={columns[0]} bold>{labels.total}</Cell>
          <Cell width={columns[1]} right bold>{formatNPR(data.totals.income, locale)}</Cell>
          <Cell width={columns[2]} right bold>{formatNPR(data.totals.expenditure, locale)}</Cell>
          <Cell width={columns[3]} right bold>{formatNPR(data.totals.savings, locale)}</Cell>
        </View>
      </Page>
    </Document>
  );
}

export function buildIesPdf(data: IesReportData, labels: IesReportLabels, locale: string): Promise<Buffer> {
  return renderToBuffer(<IesDocument data={data} labels={labels} locale={locale} />);
}