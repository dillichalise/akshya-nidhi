import "server-only";
import { getLocale, getTranslations } from "next-intl/server";
import { amountInWords, formatDateTime } from "@/lib/format";
import { receiptNumber, type ReceiptLabels, type ReceiptRow } from "./shared";

/** Receipt labels in the current locale (from the locale cookie). */
export async function getReceiptLabels(donation: ReceiptRow) {
  const [t, td, tc, locale] = await Promise.all([
    getTranslations("receipt"),
    getTranslations("donation"),
    getTranslations("common"),
    getLocale(),
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
    amountInWords:
      donation.donationType === "cash"
        ? amountInWords(donation.amount, locale)
        : "",
    date: td("date"),
    donationType: td("donationType"),
    itemDescription: td("itemDescription"),
    otherDescription: td("otherDescription"),
    remarks: td("remarks"),
    issuedBy: t("issuedBy", { name: donation.createdByName ?? "" }),
    generatedOn: t("generatedOn", { when: formatDateTime(new Date(), locale) }),
    footerNote: t("footerNote"),
  };
  return { labels, locale };
}
