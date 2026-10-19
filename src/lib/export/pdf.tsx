import { Document, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import type { Block } from "./blocks";

// Helvetica is a built-in PDF font: no embedding needed and the text stays
// selectable/parseable for ATS systems.
const s = StyleSheet.create({
  page: { paddingVertical: 54, paddingHorizontal: 54, fontFamily: "Helvetica", fontSize: 10.5, lineHeight: 1.35 },
  name: { fontFamily: "Helvetica-Bold", fontSize: 16, marginBottom: 2 },
  subtitle: { fontSize: 12, marginBottom: 2 },
  contact: { marginBottom: 8 },
  heading: {
    fontFamily: "Helvetica-Bold",
    fontSize: 11.5,
    marginTop: 10,
    marginBottom: 4,
    paddingBottom: 2,
    borderBottomWidth: 0.75,
    borderBottomColor: "#999999",
  },
  entryTitle: { fontFamily: "Helvetica-Bold", marginTop: 5 },
  entryMeta: { marginBottom: 2 },
  bulletRow: { flexDirection: "row", marginBottom: 2, paddingLeft: 8 },
  bulletDot: { width: 10 },
  bulletText: { flex: 1 },
  text: { marginBottom: 4 },
  bold: { fontFamily: "Helvetica-Bold", marginBottom: 4 },
  spacer: { height: 8 },
});

function BlockView({ b }: { b: Block }) {
  switch (b.type) {
    case "name":
      return <Text style={s.name}>{b.text}</Text>;
    case "subtitle":
      return <Text style={s.subtitle}>{b.text}</Text>;
    case "contact":
      return <Text style={s.contact}>{b.text}</Text>;
    case "heading":
      return <Text style={s.heading}>{b.text.toUpperCase()}</Text>;
    case "entry":
      return (
        <View wrap={false}>
          <Text style={s.entryTitle}>{b.title}</Text>
          {b.meta ? <Text style={s.entryMeta}>{b.meta}</Text> : null}
        </View>
      );
    case "bullet":
      return (
        <View style={s.bulletRow}>
          <Text style={s.bulletDot}>•</Text>
          <Text style={s.bulletText}>{b.text}</Text>
        </View>
      );
    case "spacer":
      return <View style={s.spacer} />;
    case "text":
      return <Text style={b.bold ? s.bold : s.text}>{b.text}</Text>;
  }
}

export async function blocksToPdf(blocks: Block[], title: string): Promise<Buffer> {
  return renderToBuffer(
    <Document title={title} creator="Job Finder" producer="Job Finder">
      <Page size="LETTER" style={s.page}>
        {blocks.map((b, i) => (
          <BlockView key={i} b={b} />
        ))}
      </Page>
    </Document>,
  );
}
