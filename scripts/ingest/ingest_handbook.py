#!/usr/bin/env python3
"""Ingest *The Complete Laser Handbook* (.docx) into structured JSON for LASERVERSE.

Usage:
    python3 -I scripts/ingest/ingest_handbook.py "source/The Complete Laser Handbook.docx"
        [--out content/handbook] [--figures public/handbook/figures]

The parser reads the WordprocessingML body in document order:

* ``Title`` / ``Subtitle`` and the first plain paragraphs give document metadata.
* The static "Contents" block gives the Word-rendered page number of each heading.
* ``Heading1`` starts a part (Front Matter, Part I … XXVIII, Back Matter).
* ``Heading2`` starts a section (1.1, 2.4, B.3 …).
* Everything else becomes typed blocks: paragraph, subheading, list, checklist,
  table, figure, preformatted (box-drawing maps) and chart-missing placeholders.

Equations in the handbook are embedded as images. They are linked to LaTeX
transcriptions from ``figure_annotations.json``; every transcription is flagged
``review-required`` in the extraction report because it was produced by reading
the image, not by parsing an equation object.

The script never edits the source; it is safe to re-run. Outputs are overwritten.
"""
from __future__ import annotations

import argparse
import datetime as _dt
import hashlib
import json
import re
import shutil
import sys
from pathlib import Path
from typing import Any

try:
    import docx  # python-docx
    from docx.oxml.ns import qn
except ImportError:  # pragma: no cover - environment guard
    sys.exit("python-docx is required: pip install python-docx")

try:
    from PIL import Image
except ImportError:  # pragma: no cover
    Image = None  # figure dimensions become null

SCHEMA_VERSION = 1
GENERATOR = "scripts/ingest/ingest_handbook.py"
HERE = Path(__file__).resolve().parent

ROMAN = {
    "I": 1, "II": 2, "III": 3, "IV": 4, "V": 5, "VI": 6, "VII": 7, "VIII": 8, "IX": 9,
    "X": 10, "XI": 11, "XII": 12, "XIII": 13, "XIV": 14, "XV": 15, "XVI": 16, "XVII": 17,
    "XVIII": 18, "XIX": 19, "XX": 20, "XXI": 21, "XXII": 22, "XXIII": 23, "XXIV": 24,
    "XXV": 25, "XXVI": 26, "XXVII": 27, "XXVIII": 28,
}
BOX_CHARS = set("│├└─┌┐┘┤┬┴┼")
PART_RE = re.compile(r"^Part\s+([IVXL]+)\s+[—–-]\s+(.*)$")
SECTION_RE = re.compile(r"^((?:\d+|B)\.\d+)\s+(.*)$")
XREF_SECTION_RE = re.compile(r"§\s?(\d+|B)\.(\d+)(?:\s?[–-]\s?(?:(\d+)\.)?(\d+))?")
XREF_PART_RE = re.compile(r"\bParts?\s+([IVXL]+)(?:\s?[–-]\s?([IVXL]+))?\b")


def slugify(text: str) -> str:
    s = text.lower().replace("&", " and ")
    s = re.sub(r"[^a-z0-9]+", "-", s)
    return s.strip("-")


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


class Ingestor:
    def __init__(self, docx_path: Path, figures_dir: Path, annotations: dict[str, Any]):
        self.path = docx_path
        self.doc = docx.Document(str(docx_path))
        self.rels = self.doc.part.rels
        self.figures_dir = figures_dir
        self.annotations = annotations
        self.flags: list[dict[str, Any]] = []
        self.figures: dict[str, dict[str, Any]] = {}
        self.external_links: list[dict[str, str]] = []
        self.numbering = self._read_numbering()
        self.stats = {"paragraphs": 0, "tables": 0, "tableRows": 0, "listItems": 0,
                      "checklistItems": 0, "subheadings": 0, "preformatted": 0,
                      "emptyParagraphsSkipped": 0}

    # ------------------------------------------------------------------ helpers
    def flag(self, severity: str, code: str, location: str, message: str) -> None:
        self.flags.append({"severity": severity, "code": code, "location": location, "message": message})

    def _read_numbering(self) -> dict[str, str]:
        """numId -> numFmt of level 0 (decimal / bullet)."""
        try:
            el = self.doc.part.numbering_part.element
        except Exception:  # no numbering part
            return {}
        abstract: dict[str, str] = {}
        for an in el.findall(qn("w:abstractNum")):
            lvl = an.find(qn("w:lvl"))
            fmt = lvl.find(qn("w:numFmt")).get(qn("w:val")) if lvl is not None else "bullet"
            abstract[an.get(qn("w:abstractNumId"))] = fmt
        out = {}
        for n in el.findall(qn("w:num")):
            aid = n.find(qn("w:abstractNumId")).get(qn("w:val"))
            out[n.get(qn("w:numId"))] = abstract.get(aid, "bullet")
        return out

    @staticmethod
    def _style(p) -> str | None:
        ppr = p.find(qn("w:pPr"))
        if ppr is None:
            return None
        ps = ppr.find(qn("w:pStyle"))
        return ps.get(qn("w:val")) if ps is not None else None

    @staticmethod
    def _num_id(p) -> str | None:
        ppr = p.find(qn("w:pPr"))
        if ppr is None:
            return None
        num = ppr.find(qn("w:numPr"))
        if num is None:
            return None
        nid = num.find(qn("w:numId"))
        return nid.get(qn("w:val")) if nid is not None else None

    @staticmethod
    def _run_format(r) -> dict[str, Any]:
        fmt: dict[str, Any] = {}
        rpr = r.find(qn("w:rPr"))
        if rpr is None:
            return fmt
        b = rpr.find(qn("w:b"))
        if b is not None and b.get(qn("w:val")) not in ("0", "false"):
            fmt["b"] = 1
        i = rpr.find(qn("w:i"))
        if i is not None and i.get(qn("w:val")) not in ("0", "false"):
            fmt["i"] = 1
        va = rpr.find(qn("w:vertAlign"))
        if va is not None:
            v = va.get(qn("w:val"))
            if v == "superscript":
                fmt["sup"] = 1
            elif v == "subscript":
                fmt["sub"] = 1
        return fmt

    def _run_text(self, r) -> str:
        out = []
        for child in r:
            tag = child.tag
            if tag == qn("w:t"):
                out.append(child.text or "")
            elif tag == qn("w:tab"):
                out.append("\t")
            elif tag in (qn("w:br"), qn("w:cr")):
                out.append("\n")
            elif tag == qn("w:noBreakHyphen"):
                out.append("‑")
        return "".join(out)

    def _drawings(self, el) -> list[str]:
        ids = []
        for blip in el.iter(qn("a:blip")):
            rid = blip.get(qn("r:embed"))
            if rid and rid in self.rels:
                ids.append(Path(self.rels[rid].target_ref).stem)
        return ids

    def inline_spans(self, p) -> list[dict[str, Any]]:
        """Paragraph → list of {t, b?, i?, sup?, sub?, href?}; adjacent equal spans merged."""
        spans: list[dict[str, Any]] = []

        def push(text: str, fmt: dict[str, Any]) -> None:
            if not text:
                return
            if spans and {k: v for k, v in spans[-1].items() if k != "t"} == fmt:
                spans[-1]["t"] += text
            else:
                spans.append({"t": text, **fmt})

        for child in p:
            if child.tag == qn("w:r"):
                push(self._run_text(child), self._run_format(child))
            elif child.tag == qn("w:hyperlink"):
                rid = child.get(qn("r:id"))
                href = None
                if rid and rid in self.rels:
                    href = self.rels[rid].target_ref
                anchor = child.get(qn("w:anchor"))
                for r in child.iter(qn("w:r")):
                    fmt = self._run_format(r)
                    if href:
                        fmt["href"] = href
                    elif anchor:
                        fmt["anchor"] = anchor
                    push(self._run_text(r), fmt)
            elif child.tag in (qn("w:ins"), qn("w:smartTag"), qn("w:sdt")):
                for r in child.iter(qn("w:r")):
                    push(self._run_text(r), self._run_format(r))
        return spans

    @staticmethod
    def plain(spans: list[dict[str, Any]]) -> str:
        return "".join(s["t"] for s in spans)

    # ------------------------------------------------------------------ figures
    def register_figure(self, image_id: str, location: str) -> dict[str, Any]:
        src = None
        for rel in self.rels.values():
            if "image" in rel.reltype and Path(rel.target_ref).stem == image_id:
                src = rel.target_part
                break
        ext = ".png"
        width = height = None
        if src is not None:
            ext = Path(src.partname).suffix or ".png"
            dest = self.figures_dir / f"{image_id}{ext}"
            dest.write_bytes(src.blob)
            if Image is not None:
                try:
                    with Image.open(dest) as im:
                        width, height = im.size
                except Exception:
                    pass
        else:
            self.flag("error", "FIGURE_BINARY_MISSING", location, f"{image_id} referenced but not found in package")
        ann = self.annotations.get(image_id)
        fig: dict[str, Any] = {
            "id": image_id,
            "file": f"/handbook/figures/{image_id}{ext}",
            "width": width,
            "height": height,
            "sectionId": location,
            "kind": ann["kind"] if ann else "unknown",
            "title": ann.get("title") if ann else None,
        }
        if ann and ann.get("kind") == "equation":
            fig["latex"] = ann["latex"]
            fig["transcription"] = "manual-from-image"
            fig["status"] = "review-required"
            self.flag("info", "EQUATION_TRANSCRIBED", location,
                      f"{image_id} ({ann.get('title')}) is an equation image; LaTeX was transcribed manually and needs review against the original image")
        elif ann and ann.get("kind") == "diagram":
            fig["alt"] = ann["alt"]
            fig["status"] = "extracted"
        else:
            fig["status"] = "review-required"
            self.flag("warning", "FIGURE_UNANNOTATED", location, f"{image_id} has no entry in figure_annotations.json")
        self.figures[image_id] = fig
        return fig

    # ------------------------------------------------------------------ tables
    def table_block(self, tbl, location: str, index: int) -> dict[str, Any]:
        rows: list[list[list[dict[str, Any]]]] = []
        merged = False
        for tr in tbl.findall(qn("w:tr")):
            row: list[list[dict[str, Any]]] = []
            for tc in tr.findall(qn("w:tc")):
                tcpr = tc.find(qn("w:tcPr"))
                span = 1
                if tcpr is not None:
                    gs = tcpr.find(qn("w:gridSpan"))
                    if gs is not None:
                        span = int(gs.get(qn("w:val")))
                        merged = True
                    if tcpr.find(qn("w:vMerge")) is not None:
                        merged = True
                cell_spans: list[dict[str, Any]] = []
                paras = tc.findall(qn("w:p"))
                for k, p in enumerate(paras):
                    sp = self.inline_spans(p)
                    if k > 0 and sp and cell_spans:
                        cell_spans.append({"t": "\n"})
                    cell_spans.extend(sp)
                    for img in self._drawings(p):
                        self.flag("warning", "FIGURE_IN_TABLE", location, f"{img} inside table {index}")
                # strip unicode checkbox/whitespace artefacts
                if cell_spans:
                    cell_spans[0]["t"] = cell_spans[0]["t"].lstrip()
                    cell_spans[-1]["t"] = cell_spans[-1]["t"].rstrip()
                cell_spans = [s for s in cell_spans if s["t"]]
                row.append(cell_spans)
                for _ in range(span - 1):
                    row.append([])
            rows.append(row)
        if merged:
            self.flag("warning", "TABLE_MERGED_CELLS", location, f"table {index} contains merged cells; check rendering")
        header = rows[0] if rows else []
        body = rows[1:]
        width = len(header)
        for r_i, r in enumerate(body):
            if len(r) != width:
                self.flag("warning", "TABLE_RAGGED_ROW", location,
                          f"table {index} row {r_i + 1} has {len(r)} cells, header has {width}")
        self.stats["tables"] += 1
        self.stats["tableRows"] += len(body)
        # header cells are plain text; body cells keep spans only when they carry links/marks
        def compact(cell: list[dict[str, Any]]):
            if all(set(s.keys()) == {"t"} for s in cell):
                return "".join(s["t"] for s in cell)
            return cell
        return {
            "type": "table",
            "id": f"{location}#t{index}",
            "header": ["".join(s["t"] for s in c) for c in header],
            "rows": [[compact(c) for c in r] for r in body],
        }

    # ------------------------------------------------------------------ main walk
    def run(self) -> dict[str, Any]:
        body = self.doc.element.body
        meta: dict[str, Any] = {"title": None, "subtitle": None, "author": None, "date": None}
        toc: list[dict[str, Any]] = []
        parts: list[dict[str, Any]] = []
        part: dict[str, Any] | None = None
        section: dict[str, Any] | None = None
        in_toc = False
        pre_heading_plain: list[str] = []
        pending_list: dict[str, Any] | None = None
        table_counter: dict[str, int] = {}

        def current_blocks() -> list[dict[str, Any]]:
            if section is not None:
                return section["blocks"]
            if part is not None:
                return part["lead"]
            raise RuntimeError("content before first heading")

        def location() -> str:
            if section is not None:
                return section["id"]
            if part is not None:
                return part["id"]
            return "preamble"

        def close_list() -> None:
            nonlocal pending_list
            pending_list = None

        for el in body.iterchildren():
            if el.tag == qn("w:sectPr"):
                continue
            if el.tag == qn("w:tbl"):
                close_list()
                if part is None:
                    self.flag("warning", "TABLE_BEFORE_HEADING", "preamble", "table before first heading ignored")
                    continue
                loc = location()
                table_counter[loc] = table_counter.get(loc, 0) + 1
                current_blocks().append(self.table_block(el, loc, table_counter[loc]))
                continue
            if el.tag != qn("w:p"):
                continue

            style = self._style(el)
            spans = self.inline_spans(el)
            text = self.plain(spans)
            stripped = text.strip()
            images = self._drawings(el)

            # ---- metadata and contents block before the first Heading1
            if part is None and style not in ("Heading1",):
                if style == "Title":
                    meta["title"] = stripped
                elif style == "Subtitle":
                    meta["subtitle"] = stripped
                elif stripped == "Contents":
                    in_toc = True
                elif in_toc and stripped:
                    if "\t" in text:
                        title, _, page = text.rpartition("\t")
                    else:
                        m = re.match(r"^(.*?)(\d+)$", stripped)
                        title, page = (m.group(1), m.group(2)) if m else (stripped, "")
                    toc.append({"title": title.strip(), "page": int(page) if page.strip().isdigit() else None})
                elif stripped:
                    pre_heading_plain.append(stripped)
                continue

            if style == "Heading1":
                close_list()
                in_toc = False
                section = None
                m = PART_RE.match(stripped)
                if m:
                    roman, title = m.group(1), m.group(2).strip()
                    num = ROMAN[roman]
                    part = {"id": f"part-{num}", "kind": "part", "number": num, "roman": roman,
                            "title": title, "fullTitle": stripped, "lead": [], "sections": []}
                elif stripped.lower().startswith("front"):
                    part = {"id": "front", "kind": "front", "number": None, "roman": None,
                            "title": stripped, "fullTitle": stripped, "lead": [], "sections": []}
                elif stripped.lower().startswith("back"):
                    part = {"id": "back", "kind": "back", "number": None, "roman": None,
                            "title": stripped, "fullTitle": stripped, "lead": [], "sections": []}
                else:
                    self.flag("warning", "UNKNOWN_HEADING1", stripped, "Heading1 not recognised as a part")
                    part = {"id": slugify(stripped), "kind": "other", "number": None, "roman": None,
                            "title": stripped, "fullTitle": stripped, "lead": [], "sections": []}
                parts.append(part)
                continue

            if style == "Heading2":
                close_list()
                if part is None:
                    self.flag("error", "SECTION_WITHOUT_PART", stripped, "Heading2 before any Heading1")
                    continue
                m = SECTION_RE.match(stripped)
                if m:
                    number, title = m.group(1), m.group(2).strip()
                    sid = number
                    slug = number.lower().replace(".", "-")
                else:
                    number, title = None, stripped
                    sid = f"{part['id']}.{slugify(stripped)}"
                    slug = slugify(stripped)
                section = {"id": sid, "slug": slug, "number": number, "title": title,
                           "fullTitle": stripped, "partId": part["id"], "synthetic": False, "blocks": []}
                part["sections"].append(section)
                continue

            if part is None:
                continue

            loc = location()

            # ---- figures (equations and diagrams)
            for img in images:
                close_list()
                self.register_figure(img, loc)
                current_blocks().append({"type": "figure", "figureId": img})
            if not stripped:
                if not images:
                    self.stats["emptyParagraphsSkipped"] += 1
                continue

            # ---- chart placeholders (links to http://node/...)
            if all(s.get("href", "").startswith("http://node/") for s in spans if s["t"].strip()) and any(
                    s.get("href", "").startswith("http://node/") for s in spans):
                close_list()
                current_blocks().append({"type": "chart-missing", "caption": stripped,
                                         "placeholder": next(s["href"] for s in spans if s.get("href"))})
                self.flag("error", "CHART_MISSING", loc,
                          f"Chart '{stripped}' is referenced but its data/image is not present in the supplied .docx (placeholder link only)")
                continue

            for s in spans:
                href = s.get("href")
                if href and href.startswith("http") and not href.startswith("http://node/"):
                    self.external_links.append({"href": href, "text": s["t"], "location": loc})

            # ---- checklists
            if stripped.startswith("☐"):
                item = re.sub(r"^☐\s*", "", stripped)
                if pending_list is None or pending_list["type"] != "checklist":
                    pending_list = {"type": "checklist", "items": []}
                    current_blocks().append(pending_list)
                idx = len(pending_list["items"]) + 1
                pending_list["items"].append({"id": f"{loc}#c{len(current_blocks())}-{idx}", "text": item})
                self.stats["checklistItems"] += 1
                continue

            # ---- numbered / bulleted lists
            num_id = self._num_id(el)
            if num_id is not None:
                ordered = self.numbering.get(num_id) == "decimal"
                if (pending_list is None or pending_list["type"] != "list" or pending_list.get("_num") != num_id):
                    pending_list = {"type": "list", "ordered": ordered, "items": [], "_num": num_id}
                    current_blocks().append(pending_list)
                pending_list["items"].append(spans)
                self.stats["listItems"] += 1
                continue
            close_list()

            # ---- preformatted (technology map uses box-drawing characters + line breaks)
            if BOX_CHARS & set(text) and "\n" in text:
                current_blocks().append({"type": "preformatted", "text": text.strip("\n")})
                self.stats["preformatted"] += 1
                continue

            # ---- subheadings: whole paragraph bold and short
            text_spans = [s for s in spans if s["t"].strip()]
            if text_spans and all(s.get("b") for s in text_spans) and len(stripped) < 140:
                current_blocks().append({"type": "subheading", "text": stripped})
                self.stats["subheadings"] += 1
                continue

            current_blocks().append({"type": "paragraph", "spans": spans})
            self.stats["paragraphs"] += 1

        # remove private keys
        for p in parts:
            for blocks in [p["lead"]] + [s["blocks"] for s in p["sections"]]:
                for b in blocks:
                    b.pop("_num", None)

        # author/date from the first plain paragraphs
        if pre_heading_plain:
            meta["author"] = pre_heading_plain[0]
        if len(pre_heading_plain) > 1:
            meta["date"] = pre_heading_plain[1]

        self._synthesise_overview_sections(parts)
        self._attach_toc_pages(parts, toc)
        self._cross_references(parts)
        self._validate(parts)
        return {"meta": meta, "toc": toc, "parts": parts}

    def _synthesise_overview_sections(self, parts: list[dict[str, Any]]) -> None:
        """Parts with no Heading2 (XVI, XVII, XX, XXVIII) get one synthetic section holding their content."""
        for p in parts:
            if p["kind"] == "part" and not p["sections"]:
                sid = f"{p['number']}.0"
                p["sections"].append({
                    "id": sid, "slug": sid.replace(".", "-"), "number": None,
                    "title": p["title"], "fullTitle": p["fullTitle"], "partId": p["id"],
                    "synthetic": True, "blocks": p["lead"],
                })
                for fig in self.figures.values():
                    if fig["sectionId"] == p["id"]:
                        fig["sectionId"] = sid
                p["lead"] = []
                self.flag("info", "SYNTHETIC_SECTION", sid,
                          f"{p['fullTitle']} has no numbered sections; its content is exposed as one overview lesson")

    def _attach_toc_pages(self, parts: list[dict[str, Any]], toc: list[dict[str, Any]]) -> None:
        def norm(s: str) -> str:
            return re.sub(r"\s+", " ", s).strip().lower()
        pages = {norm(t["title"]): t["page"] for t in toc}
        for p in parts:
            p["page"] = pages.get(norm(p["fullTitle"]))
            if p["page"] is None:
                self.flag("warning", "TOC_UNMATCHED", p["id"], f"no contents entry for '{p['fullTitle']}'")
            for s in p["sections"]:
                if s["synthetic"]:
                    s["page"] = p["page"]
                    continue
                s["page"] = pages.get(norm(s["fullTitle"]))
                if s["page"] is None:
                    self.flag("warning", "TOC_UNMATCHED", s["id"], f"no contents entry for '{s['fullTitle']}'")

    def _cross_references(self, parts: list[dict[str, Any]]) -> None:
        section_ids = {s["id"] for p in parts for s in p["sections"]}

        def walk_text(blocks: list[dict[str, Any]]):
            for b in blocks:
                if b["type"] == "paragraph":
                    yield "".join(s["t"] for s in b["spans"])
                elif b["type"] == "list":
                    for it in b["items"]:
                        yield "".join(s["t"] for s in it)
                elif b["type"] == "checklist":
                    for it in b["items"]:
                        yield it["text"]
                elif b["type"] == "table":
                    for row in b["rows"]:
                        for c in row:
                            yield c if isinstance(c, str) else "".join(s["t"] for s in c)
                elif b["type"] in ("subheading", "preformatted"):
                    yield b["text"]

        for p in parts:
            for s in p["sections"]:
                refs: set[str] = set()
                part_refs: set[int] = set()
                for text in walk_text(s["blocks"]):
                    for m in XREF_SECTION_RE.finditer(text):
                        major, minor, major2, minor2 = m.group(1), int(m.group(2)), m.group(3), m.group(4)
                        start = f"{major}.{minor}"
                        refs.add(start)
                        if minor2 and (major2 is None or major2 == major):
                            for k in range(minor + 1, int(minor2) + 1):
                                refs.add(f"{major}.{k}")
                        elif minor2 and major2:
                            refs.add(f"{major2}.{minor2}")
                    for m in XREF_PART_RE.finditer(text):
                        a = ROMAN.get(m.group(1))
                        b = ROMAN.get(m.group(2)) if m.group(2) else None
                        if a:
                            part_refs.update(range(a, (b or a) + 1))
                refs.discard(s["id"])
                unknown = sorted(r for r in refs if r not in section_ids)
                for r in unknown:
                    self.flag("warning", "XREF_UNRESOLVED", s["id"], f"cross-reference §{r} does not match a section")
                s["refs"] = sorted((r for r in refs if r in section_ids),
                                   key=lambda x: [int(t) if t.isdigit() else -1 for t in x.split(".")])
                s["partRefs"] = sorted(part_refs)

    def _validate(self, parts: list[dict[str, Any]]) -> None:
        numbered = [p for p in parts if p["kind"] == "part"]
        if [p["number"] for p in numbered] != list(range(1, 29)):
            self.flag("error", "PART_SEQUENCE", "parts", "expected Parts I–XXVIII in order")
        seen = set()
        for p in parts:
            for s in p["sections"]:
                if s["id"] in seen:
                    self.flag("error", "DUPLICATE_SECTION_ID", s["id"], "duplicate section id")
                seen.add(s["id"])
                if not s["blocks"]:
                    self.flag("warning", "EMPTY_SECTION", s["id"], "section has no content blocks")
                if p["kind"] == "part" and s["number"] and not s["number"].startswith(f"{p['number']}."):
                    self.flag("warning", "SECTION_NUMBER_MISMATCH", s["id"], f"section number does not belong to {p['fullTitle']}")


def write_report_md(path: Path, report: dict[str, Any]) -> None:
    lines = [
        "# Handbook extraction report",
        "",
        f"Generated by `{GENERATOR}` on {report['generatedAt']}.",
        "",
        f"- Source file: `{report['source']['file']}`",
        f"- SHA-256: `{report['source']['sha256']}`",
        f"- Title: {report['meta'].get('title')} — {report['meta'].get('subtitle')}",
        f"- Author / date (as printed): {report['meta'].get('author')} / {report['meta'].get('date')}",
        "",
        "## Counts",
        "",
        "| Item | Count |",
        "|---|---|",
    ]
    for k, v in report["counts"].items():
        lines.append(f"| {k} | {v} |")
    lines += ["", "## Per part", "", "| Part | Title | Sections | Tables | Figures | Page |", "|---|---|---|---|---|---|"]
    for row in report["perPart"]:
        lines.append(f"| {row['id']} | {row['title']} | {row['sections']} | {row['tables']} | {row['figures']} | {row['page'] if row['page'] is not None else '—'} |")
    lines += ["", "## Flags", "", "| Severity | Code | Location | Message |", "|---|---|---|---|"]
    order = {"error": 0, "warning": 1, "info": 2}
    for f in sorted(report["flags"], key=lambda f: (order.get(f["severity"], 3), f["code"], f["location"])):
        msg = f["message"].replace("|", "\\|")
        lines.append(f"| {f['severity']} | {f['code']} | {f['location']} | {msg} |")
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("docx", type=Path, help="path to The Complete Laser Handbook .docx")
    ap.add_argument("--out", type=Path, default=Path("content/handbook"))
    ap.add_argument("--figures", type=Path, default=Path("public/handbook/figures"))
    ap.add_argument("--annotations", type=Path, default=HERE / "figure_annotations.json")
    args = ap.parse_args(argv)

    if not args.docx.is_file():
        print(f"error: handbook not found at {args.docx}", file=sys.stderr)
        return 2
    annotations = json.loads(args.annotations.read_text(encoding="utf-8"))
    annotations.pop("_comment", None)

    args.out.mkdir(parents=True, exist_ok=True)
    if args.figures.exists():
        shutil.rmtree(args.figures)
    args.figures.mkdir(parents=True, exist_ok=True)

    ing = Ingestor(args.docx, args.figures, annotations)
    data = ing.run()
    now = _dt.datetime.now(_dt.timezone.utc).replace(microsecond=0).isoformat()
    source = {"file": args.docx.name, "sha256": sha256(args.docx), "bytes": args.docx.stat().st_size}

    n_sections = sum(len(p["sections"]) for p in data["parts"])
    figs = list(ing.figures.values())
    counts = {
        "parts (incl. front/back matter)": len(data["parts"]),
        "numbered parts": sum(1 for p in data["parts"] if p["kind"] == "part"),
        "sections": n_sections,
        "synthetic overview sections": sum(1 for p in data["parts"] for s in p["sections"] if s["synthetic"]),
        "paragraphs": ing.stats["paragraphs"],
        "subheadings": ing.stats["subheadings"],
        "tables": ing.stats["tables"],
        "table rows": ing.stats["tableRows"],
        "list items": ing.stats["listItems"],
        "checklist items": ing.stats["checklistItems"],
        "preformatted blocks": ing.stats["preformatted"],
        "figures": len(figs),
        "equation images (transcribed)": sum(1 for f in figs if f["kind"] == "equation"),
        "diagram images": sum(1 for f in figs if f["kind"] == "diagram"),
        "missing charts": sum(1 for f in ing.flags if f["code"] == "CHART_MISSING"),
        "external links": len(ing.external_links),
        "contents entries": len(data["toc"]),
        "empty paragraphs skipped": ing.stats["emptyParagraphsSkipped"],
    }

    def count_blocks(p, t):
        return sum(1 for blocks in [p["lead"]] + [s["blocks"] for s in p["sections"]] for b in blocks if b["type"] == t)

    per_part = [{"id": p["id"], "title": p["fullTitle"], "sections": len(p["sections"]),
                 "tables": count_blocks(p, "table"), "figures": count_blocks(p, "figure"), "page": p.get("page")}
                for p in data["parts"]]

    handbook = {
        "schemaVersion": SCHEMA_VERSION,
        "generator": GENERATOR,
        "generatedAt": now,
        "source": source,
        "meta": data["meta"],
        "toc": data["toc"],
        "parts": data["parts"],
        "figures": figs,
        "externalLinks": ing.external_links,
    }
    report = {"schemaVersion": SCHEMA_VERSION, "generatedAt": now, "source": source, "meta": data["meta"],
              "counts": counts, "perPart": per_part, "flags": ing.flags}

    # Small, content-free outline that client components may import (titles, pages, hrefs only).
    outline = {
        "schemaVersion": SCHEMA_VERSION,
        "sourceSha256": source["sha256"],
        "parts": [
            {"id": p["id"], "kind": p["kind"], "number": p["number"], "roman": p["roman"], "title": p["title"],
             "fullTitle": p["fullTitle"], "page": p.get("page"),
             "sections": [{"id": s["id"], "slug": s["slug"], "number": s["number"], "title": s["title"],
                           "page": s.get("page"), "synthetic": s["synthetic"]} for s in p["sections"]]}
            for p in data["parts"]
        ],
    }
    (args.out / "outline.json").write_text(json.dumps(outline, ensure_ascii=False, indent=1), encoding="utf-8")
    (args.out / "handbook.json").write_text(json.dumps(handbook, ensure_ascii=False, indent=1), encoding="utf-8")
    (args.out / "extraction-report.json").write_text(json.dumps(report, ensure_ascii=False, indent=1), encoding="utf-8")
    write_report_md(args.out / "EXTRACTION_REPORT.md", report)

    errors = [f for f in ing.flags if f["severity"] == "error" and f["code"] != "CHART_MISSING"]
    print(json.dumps(counts, indent=1, ensure_ascii=False))
    print(f"flags: {len(ing.flags)} ({sum(1 for f in ing.flags if f['severity']=='error')} error, "
          f"{sum(1 for f in ing.flags if f['severity']=='warning')} warning)")
    return 1 if errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
