/**
 * The source catalogue. Every string in the app lives here.
 *
 * Voice (design.md §2): plain verbs, sentence case, second person. The app
 * talks like a sharp, honest friend — not a utility company and not a lawyer.
 * Errors never apologise and never go vague. Interpretation copy describes and
 * never advises.
 *
 * `{placeholders}` are interpolated by `t()`.
 */
export const en = {
  "app.name": "Vernac",
  "app.tagline": "Official documents, in your true tongue. Verified.",
  "app.hook": "Snap it. Verify it. Sabi it in your language.",

  "lang.label": "Language",
  "lang.en": "EN",
  "lang.yo": "YO",
  "lang.pcm": "PCM",

  "capture.cta": "Snap your document",
  "capture.upload": "Upload a file",
  "capture.uploadHint": "PDF or image",
  "capture.manual": "Type it instead",
  "capture.trust": "Bills checked against the NERC tariff order",
  "capture.offline": "No network — type your bill instead and I can still check it.",

  // The two-tier model is the product's core decision (PRD §1). Stating it on
  // the way in means the boundary is never a surprise on the way out.
  "capture.tierVerifyLabel": "Verify",
  "capture.tierVerifyBody":
    "Electricity bills — I check the numbers against the published NERC rates and show you the math.",
  "capture.tierExplainLabel": "Explain",
  "capture.tierExplainBody":
    "Any other official document — I put it in your language. I don't claim to have checked it.",

  // The three-step strip on the home screen: the whole flow at a glance, in the
  // order it happens (capture → confirm → result).
  "home.stepsLabel": "How it works",
  "home.step1.title": "Snap or upload",
  "home.step1.body": "Photograph any official document, or pick a PDF or image from your phone.",
  "home.step2.title": "Check what I read",
  "home.step2.body": "I show you what I picked up, and you fix anything before I work it out.",
  "home.step3.title": "Get your answer",
  "home.step3.body":
    "A verified verdict where published rules exist, a plain-language explanation everywhere else.",

  "manual.title": "What kind of document is it?",
  "manual.hint": "I need to know before you type, since I can't see it.",
  "manual.continue": "Continue",

  "status.reading": "Reading your document…",
  "status.readingSlow": "Still reading — big photos take a moment.",
  "status.explaining": "Putting it in your language…",
  "status.cancel": "Cancel",
  "status.elapsed": "{seconds}s",

  "confirm.title": "Check what I read",
  "confirm.tierRuleset": "This looks like an electricity bill — I can check its numbers.",
  "confirm.tierNoRuleset":
    "This looks like a {type} — I'll explain it, but I can't verify it against published rules.",
  "confirm.changeType": "Not right? Change the document type",
  "confirm.explainIntro":
    "I've got your document. I'll go through what it says, what it asks of you, and anything worth noticing.",
  "confirm.readingFrom": "Reading from the file you sent",
  "confirm.submitVerify": "Check my bill",
  "confirm.submitExplain": "Explain this to me",
  "confirm.lowConfidence": "I couldn't read your {field} — type it here",
  "confirm.optional": "Leave it empty if it's not on your document",

  "field.band": "Band",
  "field.unitsKwh": "Units (kWh)",
  "field.amountCharged": "Amount charged",
  "field.energyCharge": "Energy charge",
  "field.arrears": "Arrears",
  "field.readingType": "Reading type",
  "field.issuer": "Who sent it",
  "field.subject": "What it's about",
  "field.amounts": "Amounts",
  "field.dates": "Dates and deadlines",
  "field.obligations": "What it asks of you",

  // Field names as they appear mid-sentence in the ask copy. Lowercasing the
  // form labels gave "I couldn't read your units (kwh)"; these read like speech.
  "fieldInline.band": "band",
  "fieldInline.unitsKwh": "units",
  "fieldInline.amountCharged": "amount charged",
  "fieldInline.energyCharge": "energy charge",
  "fieldInline.arrears": "arrears",
  "fieldInline.readingType": "reading type",
  "fieldInline.issuer": "sender",
  "fieldInline.subject": "subject",
  "fieldInline.amounts": "amounts",
  "fieldInline.dates": "dates",
  "fieldInline.obligations": "obligations",

  "reading.estimated": "Estimated",
  "reading.actual": "Actual",
  "band.option": "Band {band}",

  "doctype.electricity_bill": "electricity bill",
  "doctype.tenancy_document": "tenancy document",
  "doctype.government_notice": "government notice",
  "doctype.loan_or_financial": "loan or financial letter",
  "doctype.wage_statement": "wage statement",
  "doctype.legal_document": "legal document",
  "doctype.other": "document",

  "stamp.checksOut": "Checks out ✓",
  "stamp.overcharged": "Overcharged",
  "stamp.mismatch": "Doesn't match",
  "stamp.cannotVerify": "Can't verify yet",

  "result.checksOut": "Your bill checks out.",
  "result.overcharged": "You were charged more than the published rate.",
  "result.mismatch": "This doesn't match the published rate.",
  "result.cannotVerify": "I need your {fields} to check this.",
  "result.noPublishedRate": "I don't have a published rate for that band yet, so I won't guess.",

  "math.header": "What your bill says",
  "math.energy": "{units} kWh × ₦{rate} (Band {band})",
  "math.vat": "+ VAT ({percent}%)",
  "math.expectedTotal": "Should be",
  "math.charged": "You were charged",
  "math.arrears": "Arrears (separate — not an error)",
  "math.comparable": "This month's charge",
  "math.difference": "Difference",

  "trust.verified": "Checked against the {source}, effective {date}.",
  "trust.interpretation":
    "Vernac explains this document. It has not checked it against any published rules.",

  "interpretation.header": "Explained — not verified",
  "interpretation.amountsNote": "(listed, not checked)",
  "interp.reportSubtitle": "Document analysis report",
  "interp.readIn": "Read it in",
  "interp.whatThisIs": "What this is",
  "interp.whatItSays": "What it says",
  "interp.whatItAsks": "What it asks of you",
  "interp.amounts": "Amounts",
  "interp.deadlines": "Deadlines",
  "interp.watchOut": "Watch out for",
  "interp.sentBy": "Sent by",
  "interp.about": "About",
  "interp.sourceLabel": "What I read",

  "bandNote.complaintGround":
    "Band {band} promises {hours}+ hours of light daily. Not getting that? That's a complaint ground too.",

  "complaint.cta": "Draft a complaint",
  "complaint.title": "Your complaint",
  "complaint.formalEnglish": "In formal English, for the DisCo",
  "complaint.copy": "Copy",
  "complaint.copied": "Copied",
  "complaint.whatsapp": "Share on WhatsApp",
  "complaint.note": "You send it yourself — Vernac never sends anything on your behalf.",

  "error.extractionFailed":
    "I couldn't read this photo. Try again with more light, or type it instead.",
  "error.retake": "Take another photo",
  "error.modelDown": "I can't read photos right now — type your bill and I'll check it.",
  "error.timeout": "That's taking too long. Try a clearer photo, or type it instead.",
  "error.fileTooBig": "That file is too big. Try a photo of the page instead.",
  "error.fileRejected": "I can't open that file. Try a photo of the page, or type it instead.",
  "error.explainFailed":
    "I checked your bill, but I couldn't write the explanation. The numbers above are still right.",
  "error.explainOnlyFailed": "I couldn't read this document well enough to explain it. Try again.",

  "install.title": "Add Vernac to your home screen?",
  "install.accept": "Add",
  "install.dismiss": "Not now",

  "action.startOver": "Check another document",
  "action.back": "Back",
} as const;

export type StringKey = keyof typeof en;
export type Catalogue = Record<StringKey, string>;
