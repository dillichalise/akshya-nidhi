import "server-only";
import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import { receiptNumber, type ReceiptLabels, type ReceiptRow } from "./shared";

/** Receipt labels in the current locale (from the locale cookie). */
export async function getReceiptLabels(donation: ReceiptRow) {
  const [t, td, tc, locale, format] = await Promise.all([
    getTranslations("receipt"),
    getTranslations("donation"),
    getTranslations("common"),
    getLocale(),
    getFormatter(),
  ]);
  const labels: ReceiptLabels = {
    orgName: tc("appName"),
    orgTagline: tc("appTagline"),
    title: t("title"),
    receiptNo: t("receiptNo", { id: receiptNumber(donation.id) }),
    receivedFrom: t("receivedFrom"),
    thanks: t("thanks"),
    name: td("name"),
    phone: td("phone"),
    address: td("address"),
    amount: td("amount"),
    date: td("date"),
    remarks: td("remarks"),
    issuedBy: t("issuedBy", { name: donation.createdByName ?? "" }),
    generatedOn: t("generatedOn", { when: format.dateTime(new Date(), { dateStyle: "medium", timeStyle: "short" }) }),
    footerNote: t("footerNote"),
  };
  return { labels, locale };
}
