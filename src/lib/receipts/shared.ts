export type ReceiptRow = {
  id: string;
  donorName: string;
  address: string;
  phone: string;
  amount: string;
  donationType: "cash" | "non_cash" | "other";
  itemDescription: string | null;
  otherDescription: string | null;
  donationDate: string;
  remarks: string | null;
  createdByName: string | null;
};

export type ReceiptLabels = {
  orgName: string;
  orgTagline: string;
  title: string;
  receiptNo: string;
  receivedFrom: string;
  thanks: string;
  name: string;
  phone: string;
  address: string;
  amount: string;
  amountInWords: string;
  date: string;
  donationType: string;
  itemDescription: string;
  otherDescription: string;
  remarks: string;
  issuedBy: string;
  generatedOn: string;
  footerNote: string;
};

/** Short, human-shareable reference derived from the donation id (no separate numbering scheme yet). */
export function receiptNumber(donationId: string): string {
  return donationId.slice(0, 8).toUpperCase();
}

export function receiptFileName(donation: {
  id: string;
  donationDate: string;
}): string {
  return `receipt_${donation.donationDate}_${receiptNumber(donation.id)}`;
}
