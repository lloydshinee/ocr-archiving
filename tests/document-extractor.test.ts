// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest"
import { extractText } from "@/lib/document-extractor"
import AdmZip from "adm-zip"
import * as XLSX from "xlsx"

const { mockRecognize } = vi.hoisted(() => ({
  mockRecognize: vi.fn(),
}))

vi.mock("tesseract.js", () => ({
  default: { recognize: mockRecognize },
}))

const { mockGetText, mockGetScreenshot, mockDestroy, MockPDFParse } =
  vi.hoisted(() => ({
    mockGetText: vi.fn(),
    mockGetScreenshot: vi.fn(),
    mockDestroy: vi.fn(),
    MockPDFParse: vi.fn(),
  }))

vi.mock("pdf-parse", () => ({
  PDFParse: MockPDFParse,
}))

beforeEach(() => {
  vi.resetAllMocks()
  MockPDFParse.mockImplementation(function () {
    return { getText: mockGetText, getScreenshot: mockGetScreenshot, destroy: mockDestroy }
  })
})

function createDocx(documentXml: string, media?: { name: string; data: Buffer }[]): Buffer {
  const zip = new AdmZip()
  zip.addFile(
    "[Content_Types].xml",
    Buffer.from(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`,
    ),
  )
  zip.addFile(
    "_rels/.rels",
    Buffer.from(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`,
    ),
  )
  zip.addFile("word/document.xml", Buffer.from(documentXml))
  zip.addFile(
    "word/_rels/document.xml.rels",
    Buffer.from(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"/>`,
    ),
  )
  if (media) {
    for (const m of media) {
      zip.addFile(`word/media/${m.name}`, m.data)
    }
  }
  return zip.toBuffer()
}

function createPptx(slideXml: string): Buffer {
  const zip = new AdmZip()
  zip.addFile(
    "[Content_Types].xml",
    Buffer.from(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/ppt/slides/slide1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>
</Types>`,
    ),
  )
  zip.addFile("ppt/slides/slide1.xml", Buffer.from(slideXml))
  return zip.toBuffer()
}

describe("extractText", () => {
  describe("image OCR", () => {
    it("extracts text from image types", async () => {
      mockRecognize.mockResolvedValue({ data: { text: "OCR result" } })

      const result = await extractText(
        Buffer.from("fake-image"),
        "image/png",
      )

      expect(result).toBe("OCR result")
      expect(mockRecognize).toHaveBeenCalledOnce()
    })

    it("handles all image MIME types", async () => {
      mockRecognize.mockResolvedValue({ data: { text: "ok" } })
      for (const mime of ["image/jpeg", "image/tiff", "image/bmp", "image/gif"]) {
        const result = await extractText(Buffer.from("x"), mime)
        expect(result).toBe("ok")
      }
      expect(mockRecognize).toHaveBeenCalledTimes(4)
    })
  })

  describe("plain text", () => {
    it("returns buffer content as string", async () => {
      const result = await extractText(
        Buffer.from("Hello, world!"),
        "text/plain",
      )
      expect(result).toBe("Hello, world!")
    })

    it("trims whitespace", async () => {
      const result = await extractText(
        Buffer.from("  spaced out  \n"),
        "text/plain",
      )
      expect(result).toBe("spaced out")
    })
  })

  describe("PDF", () => {
    it("returns extracted text when text is long enough", async () => {
      mockGetText.mockResolvedValue({ text: "This is a PDF with enough text content for extraction" })

      const result = await extractText(
        Buffer.from("fake-pdf"),
        "application/pdf",
      )

      expect(result).toBe("This is a PDF with enough text content for extraction")
      expect(mockGetText).toHaveBeenCalledOnce()
      expect(mockGetScreenshot).not.toHaveBeenCalled()
      expect(mockRecognize).not.toHaveBeenCalled()
    })

    it("falls back to OCR when text is too short (< 20 chars)", async () => {
      mockGetText.mockResolvedValue({ text: "Short" })
      mockGetScreenshot.mockResolvedValue({
        pages: [
          {
            dataUrl:
              "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
            pageNumber: 1,
            width: 1,
            height: 1,
            scale: 2,
          },
        ],
        total: 1,
      })
      mockRecognize.mockResolvedValue({ data: { text: "OCR text from PDF" } })

      const result = await extractText(
        Buffer.from("fake-pdf"),
        "application/pdf",
      )

      expect(result).toBe("OCR text from PDF")
      expect(mockGetText).toHaveBeenCalledOnce()
      expect(mockGetScreenshot).toHaveBeenCalledOnce()
      expect(mockRecognize).toHaveBeenCalledOnce()
    })

    it("falls back to OCR when text is empty", async () => {
      mockGetText.mockResolvedValue({ text: "" })
      mockGetScreenshot.mockResolvedValue({
        pages: [
          {
            dataUrl:
              "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
            pageNumber: 1,
            width: 1,
            height: 1,
            scale: 2,
          },
        ],
        total: 1,
      })
      mockRecognize.mockResolvedValue({ data: { text: "OCR fallback" } })

      const result = await extractText(
        Buffer.from("fake-pdf"),
        "application/pdf",
      )

      expect(result).toBe("OCR fallback")
    })

    it("OCR fallback processes multiple pages", async () => {
      mockGetText.mockResolvedValue({ text: "Hi" })
      mockGetScreenshot.mockResolvedValue({
        pages: [
          {
            dataUrl:
              "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
            pageNumber: 1,
            width: 1,
            height: 1,
            scale: 2,
          },
          {
            dataUrl:
              "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
            pageNumber: 2,
            width: 1,
            height: 1,
            scale: 2,
          },
        ],
        total: 2,
      })
      mockRecognize
        .mockResolvedValueOnce({ data: { text: "Page 1" } })
        .mockResolvedValueOnce({ data: { text: "Page 2" } })

      const result = await extractText(
        Buffer.from("fake-pdf"),
        "application/pdf",
      )

      expect(result).toBe("Page 1\nPage 2")
      expect(mockRecognize).toHaveBeenCalledTimes(2)
    })

    it("destroys PDFParse on success", async () => {
      mockGetText.mockResolvedValue({ text: "Normal text content for extraction" })

      await extractText(Buffer.from("fake-pdf"), "application/pdf")

      expect(mockDestroy).toHaveBeenCalledOnce()
    })

    it("destroys PDFParse on OCR fallback", async () => {
      mockGetText.mockResolvedValue({ text: "" })
      mockGetScreenshot.mockResolvedValue({ pages: [], total: 0 })

      await extractText(Buffer.from("fake-pdf"), "application/pdf")

      expect(mockDestroy).toHaveBeenCalledTimes(2)
    })
  })

  describe("DOCX", () => {
    it("extracts text from DOCX via mammoth", async () => {
      const docx = createDocx(
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t>Hello from DOCX</w:t></w:r></w:p>
  </w:body>
</w:document>`,
      )

      const result = await extractText(
        docx,
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      )

      expect(result).toBe("Hello from DOCX")
    })

    it("falls back to image OCR when DOCX has no text", async () => {
      mockRecognize.mockResolvedValue({ data: { text: "Image OCR text" } })

      const docx = createDocx(
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body><w:p></w:p></w:body>
</w:document>`,
        [{ name: "image.png", data: Buffer.from("fake-png-bytes") }],
      )

      const result = await extractText(
        docx,
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      )

      expect(result).toBe("Image OCR text")
      expect(mockRecognize).toHaveBeenCalledOnce()
    })

    it("returns empty string when DOCX has no text and no images", async () => {
      const docx = createDocx(
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body><w:p></w:p></w:body>
</w:document>`,
      )

      const result = await extractText(
        docx,
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      )

      expect(result).toBe("")
    })
  })

  describe("XLSX", () => {
    it("extracts cell text from XLSX", async () => {
      const wb = XLSX.utils.book_new()
      const ws = XLSX.utils.aoa_to_sheet([
        ["Name", "Score"],
        ["Alice", "95"],
        ["Bob", "87"],
      ])
      XLSX.utils.book_append_sheet(wb, ws, "Sheet1")
      const buffer = Buffer.from(
        XLSX.write(wb, { type: "buffer", bookType: "xlsx" }),
      )

      const result = await extractText(
        buffer,
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      )

      expect(result).toContain("Name")
      expect(result).toContain("Alice")
      expect(result).toContain("95")
      expect(result).toContain("Bob")
    })

    it("extracts across multiple sheets", async () => {
      const wb = XLSX.utils.book_new()
      const ws1 = XLSX.utils.aoa_to_sheet([["Sheet1Data"]])
      const ws2 = XLSX.utils.aoa_to_sheet([["Sheet2Data"]])
      XLSX.utils.book_append_sheet(wb, ws1, "Sheet1")
      XLSX.utils.book_append_sheet(wb, ws2, "Sheet2")
      const buffer = Buffer.from(
        XLSX.write(wb, { type: "buffer", bookType: "xlsx" }),
      )

      const result = await extractText(
        buffer,
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      )

      expect(result).toContain("Sheet1Data")
      expect(result).toContain("Sheet2Data")
    })
  })

  describe("PPTX", () => {
    it("extracts text from PPTX slides", async () => {
      const pptx = createPptx(
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
       xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
  <p:cSld>
    <p:spTree>
      <p:nvGrpSpPr></p:nvGrpSpPr>
      <p:grpSpPr></p:grpSpPr>
      <p:sp>
        <p:nvSpPr><p:cNvPr name="Title 1"/></p:nvSpPr>
        <p:spPr></p:spPr>
        <p:txBody>
          <a:p>
            <a:r>
              <a:t>Hello from PPTX</a:t>
            </a:r>
          </a:p>
        </p:txBody>
      </p:sp>
    </p:spTree>
  </p:cSld>
</p:sld>`,
      )

      const result = await extractText(
        pptx,
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      )

      expect(result).toBe("Hello from PPTX")
    })

    it("handles legacy .ppt MIME type", async () => {
      const pptx = createPptx(
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
       xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
  <p:cSld>
    <p:spTree>
      <p:sp>
        <p:txBody>
          <a:p><a:r><a:t>Legacy PPT</a:t></a:r></a:p>
        </p:txBody>
      </p:sp>
    </p:spTree>
  </p:cSld>
</p:sld>`,
      )

      const result = await extractText(pptx, "application/vnd.ms-powerpoint")

      expect(result).toBe("Legacy PPT")
    })

    it("extracts text from multiple slides", async () => {
      const zip = new AdmZip()
      zip.addFile(
        "[Content_Types].xml",
        Buffer.from(
          `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Override PartName="/ppt/slides/slide1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>
  <Override PartName="/ppt/slides/slide2.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>
</Types>`,
        ),
      )
      zip.addFile(
        "ppt/slides/slide1.xml",
        Buffer.from(
          `<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><p:cSld><p:spTree><p:sp><p:txBody><a:p><a:r><a:t>Slide 1</a:t></a:r></a:p></p:txBody></p:sp></p:spTree></p:cSld></p:sld>`,
        ),
      )
      zip.addFile(
        "ppt/slides/slide2.xml",
        Buffer.from(
          `<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><p:cSld><p:spTree><p:sp><p:txBody><a:p><a:r><a:t>Slide 2</a:t></a:r></a:p></p:txBody></p:sp></p:spTree></p:cSld></p:sld>`,
        ),
      )

      const result = await extractText(
        zip.toBuffer(),
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      )

      expect(result).toBe("Slide 1\nSlide 2")
    })
  })

  describe("error handling", () => {
    it("throws for unsupported file types", async () => {
      await expect(
        extractText(Buffer.from("data"), "application/unsupported"),
      ).rejects.toThrow("Unsupported file type: application/unsupported")
    })

    it("throws for unknown MIME types", async () => {
      await expect(
        extractText(Buffer.from("data"), "video/mp4"),
      ).rejects.toThrow("Unsupported file type: video/mp4")
    })
  })
})
