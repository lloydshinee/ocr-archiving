import { createAdminClient } from "./admin-client"

const PROGRAMS = [
  { name: "BSCS", description: "Bachelor of Science in Computer Science" },
  { name: "BSIT", description: "Bachelor of Science in Information Technology" },
]

const CATEGORIES = [
  "Accreditation",
  "Faculty Records",
  "Curriculum",
  "Student Records",
  "Memorandums",
  "Reports",
  "Meeting Minutes",
  "Correspondence",
  "Research",
  "Extension",
  "Administrative",
]

const DOCUMENT_TYPES = [
  "Memo",
  "Report",
  "Minutes",
  "Letter",
  "Form",
  "Policy",
  "Proposal",
  "Assessment",
]

export async function seedReferenceData() {
  const adminClient = createAdminClient()

  const { count } = await adminClient
    .from("programs")
    .select("*", { count: "exact", head: true })

  if (count && count > 0) return

  await adminClient.from("programs").insert(PROGRAMS)
  await adminClient
    .from("categories")
    .insert(CATEGORIES.map((name) => ({ name })))
  await adminClient
    .from("document_types")
    .insert(DOCUMENT_TYPES.map((name) => ({ name })))
}
