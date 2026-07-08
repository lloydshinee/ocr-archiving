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

  const { data: programs } = await adminClient
    .from("programs")
    .insert(PROGRAMS)
    .select("id, name")

  await adminClient
    .from("categories")
    .insert(CATEGORIES.map((name) => ({ name })))
  await adminClient
    .from("document_types")
    .insert(DOCUMENT_TYPES.map((name) => ({ name })))

  if (programs && programs.length > 0) {
    const { data: dean } = await adminClient
      .from("users")
      .select("id")
      .eq("role", "dean")
      .single()

    if (!dean?.id) return

    const programFolders = programs.map((p) => ({
      name: p.name,
      program_id: p.id,
      parent_id: null,
      owner_id: dean.id,
      created_by: dean.id,
      inherit_permissions: true,
    }))

    await adminClient.from("folders").insert(programFolders)
  }
}
