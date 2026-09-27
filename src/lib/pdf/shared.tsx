import "server-only";
import path from "node:path";
import { Font, Text } from "@react-pdf/renderer";

export const NOTO_LATIN = "NotoLatin";
export const NOTO_DEVA = "NotoDeva";

let registered = false;

/** Registers the bundled Noto fonts once per process. Safe to call from every PDF builder. */
export function registerPdfFonts() {
  if (registered) return;
  registered = true;
  const fontDir = path.join(process.cwd(), "assets", "fonts");
  Font.register({
    family: NOTO_LATIN,
    fonts: [
      { src: path.join(fontDir, "NotoSans-Regular.woff"), fontWeight: 400 },
      { src: path.join(fontDir, "NotoSans-Bold.woff"), fontWeight: 700 },
    ],
  });
  Font.register({
    family: NOTO_DEVA,
    fonts: [
      { src: path.join(fontDir, "NotoSansDevanagari-Regular.woff"), fontWeight: 400 },
      { src: path.join(fontDir, "NotoSansDevanagari-Bold.woff"), fontWeight: 700 },
    ],
  });
  // No hyphenation: it mangles names and Devanagari words.
  Font.registerHyphenationCallback((w) => [w]);
}

/** Renders mixed English/Devanagari text by switching font per script run. */
export function MixedText({ children, bold }: { children: string; bold?: boolean }) {
  const parts = children.split(/([ऀ-ॿ]+(?:[ ऀ-ॿ]+)*)/g).filter(Boolean);
  return (
    <Text style={{ fontWeight: bold ? 700 : 400 }}>
      {parts.map((p, i) => (
        <Text key={i} style={{ fontFamily: /[ऀ-ॿ]/.test(p) ? NOTO_DEVA : NOTO_LATIN }}>
          {p}
        </Text>
      ))}
    </Text>
  );
}
