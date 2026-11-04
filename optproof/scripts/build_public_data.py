#!/usr/bin/env python3
"""Build and validate the static OptProof data distribution using the standard library."""

from __future__ import annotations

import argparse
import csv
import gzip
import hashlib
import io
import json
import re
import statistics
from collections import Counter
from pathlib import Path


PRIVATE_KEY = re.compile(
    r"(?:^|_)(?:extraction|model|review|training|train|judge|writing|prompt|"
    r"rationale|notes|log|filesystem|local_path|file_path|internal|agent)(?:_|$)",
    re.IGNORECASE,
)
LOCAL_PATH = re.compile(
    "|".join(re.escape(chr(47) + root + chr(47)) for root in (
        "Users", "home", "Volumes", "private", "var", "tmp", "mnt", "workspace", "root", "opt"
    )) + r"|file:\x2f\x2f|~\x2f(?:Desktop|Documents|Downloads|Library)\x2f|"
    r"(?<![A-Za-z])[A-Za-z]:\\(?:Users|Documents and Settings|Windows|Temp|"
    r"Program Files|workspace|projects)\\",
    re.IGNORECASE,
)
PRIVATE_MARKER = re.compile(
    r"OPENAI_API_KEY|sk-proj-|"
    r"(?:extraction|model|judge)[_-](?:log|notes|report)|"
    r"(?:review|training)[_-](?:report|motivation)",
    re.IGNORECASE,
)
RECORD_KEYS = {
    "record_id", "paper", "context", "statement", "proof", "nodes", "dependency_graph"
}
PAPER_KEYS = {
    "title", "authors", "arxiv_id", "version", "journal", "doi", "abstract_url", "pdf_url"
}
UNIT_KEYS = {"raw_tex", "start", "end", "start_line", "end_line", "sha256_utf8"}
NODE_KEYS = {
    "id", "semantic_type", "kind", "title", "source_units", "labels",
    "declared_external", "declaration_text", "source_only", "member_ids"
}
CSV_FIELDS = [
    "journal", "year", "doi", "title", "arxiv_ids", "source_collected",
    "source_status", "parse_status", "proof_complete", "record_id"
]


def require(condition: bool, message: str) -> None:
    if not condition:
        raise ValueError(message)


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def json_bytes(value: object) -> bytes:
    return (json.dumps(value, ensure_ascii=False, indent=2) + "\n").encode("utf-8")


def audit(value: object, location: str, counts: Counter) -> None:
    """Inspect all keys and string values; ordinary paper vocabulary is preserved."""
    if isinstance(value, dict):
        for key, child in value.items():
            counts["keys"] += 1
            require(not PRIVATE_KEY.search(key), f"Private metadata key at {location}.{key}")
            require(not LOCAL_PATH.search(key), f"Local path key at {location}")
            audit(child, f"{location}.{key}", counts)
    elif isinstance(value, list):
        for index, child in enumerate(value):
            audit(child, f"{location}[{index}]", counts)
    elif isinstance(value, str):
        counts["strings"] += 1
        require(not LOCAL_PATH.search(value), f"Local path value at {location}")
        require(not PRIVATE_MARKER.search(value), f"Private metadata value at {location}")


def validate_units(units: list, location: str) -> None:
    for unit in units:
        require(set(unit) <= UNIT_KEYS, f"Unexpected source-unit keys at {location}")
        require({"raw_tex", "start", "end"} <= set(unit), f"Incomplete source unit at {location}")
        if "sha256_utf8" in unit:
            require(
                digest(unit["raw_tex"].encode("utf-8")) == unit["sha256_utf8"],
                f"Source-unit hash mismatch at {location}",
            )


def validate_graph(graph: dict, nodes: list, location: str) -> int:
    node_ids = [node["id"] for node in nodes]
    require(len(node_ids) == len(set(node_ids)), f"Duplicate node IDs at {location}")
    node_ids = set(node_ids)
    require(graph["main_result_id"] in node_ids, f"Unknown main result at {location}")
    require(graph["direction_convention"] == "supporter_to_supported", f"Unknown direction at {location}")
    for node in nodes:
        require(set(node) <= NODE_KEYS, f"Unexpected node keys at {location}")
        validate_units(node["source_units"], location)
    for edge in graph["edges"]:
        require(set(edge) == {"source_id", "target_id", "kind"}, f"Unexpected edge keys at {location}")
        require(edge["source_id"] in node_ids, f"Unknown edge source at {location}")
        require(edge["target_id"] in node_ids, f"Unknown edge target at {location}")
    return len(graph["edges"])


def validate_record(record: dict) -> int:
    location = record["record_id"]
    require(set(record) == RECORD_KEYS, f"Unexpected record keys at {location}")
    require(set(record["paper"]) == PAPER_KEYS, f"Unexpected paper keys at {location}")
    require(re.fullmatch(r"[A-Za-z0-9._-]+", location) is not None, "Unsafe record ID")
    for section in ("context", "statement", "proof"):
        require(set(record[section]) <= {"raw_tex", "units", "unit_separator"}, f"Unexpected section keys at {location}")
        validate_units(record[section]["units"], f"{location}.{section}")
    graph = record["dependency_graph"]
    require(set(graph) <= {"direction_convention", "main_result_id", "edges", "overview"}, f"Unexpected graph keys at {location}")
    validate_graph(graph, record["nodes"], location)
    overview_edges = 0
    if "overview" in graph:
        overview = graph["overview"]
        require(
            set(overview) == {"direction_convention", "main_result_id", "edges", "nodes", "collapse_map"},
            f"Unexpected overview keys at {location}",
        )
        overview_edges = validate_graph(overview, overview["nodes"], f"{location}.overview")
        full_ids = {node["id"] for node in record["nodes"]}
        overview_ids = {node["id"] for node in overview["nodes"]}
        require(set(overview["collapse_map"]) <= full_ids, f"Invalid overview collapse source at {location}")
        require(set(overview["collapse_map"].values()) <= overview_ids, f"Invalid overview collapse target at {location}")
        for node in overview["nodes"]:
            require(set(node["member_ids"]) <= full_ids, f"Invalid overview member at {location}")
    return overview_edges


def raw_texts(value: object, location: str = "") -> list:
    result = []
    if isinstance(value, dict):
        for key, child in value.items():
            child_location = f"{location}.{key}"
            if key == "raw_tex":
                result.append((child_location, child))
            else:
                result.extend(raw_texts(child, child_location))
    elif isinstance(value, list):
        for index, child in enumerate(value):
            result.extend(raw_texts(child, f"{location}[{index}]"))
    return result


def write_gzip(path: Path, content: bytes) -> None:
    with path.open("wb") as handle:
        with gzip.GzipFile(filename="", mode="wb", fileobj=handle, mtime=0) as compressed:
            compressed.write(content)
    require(path.read_bytes()[4:8] == b"\0\0\0\0", "Gzip timestamp was not cleared")
    require(gzip.decompress(path.read_bytes()) == content, "Gzip round-trip mismatch")


def build(source: Path, site_root: Path, validation_report: Path | None) -> dict:
    if validation_report:
        require(not validation_report.resolve().is_relative_to(site_root.resolve()), "The validation report must remain outside the public site")
    source_bytes = {name: (source / name).read_bytes() for name in (
        "dataset.json", "dataset.jsonl", "dataset_summary.json", "source_status.csv"
    )}
    records = json.loads(source_bytes["dataset.json"])
    record_lines = source_bytes["dataset.jsonl"].splitlines(keepends=True)
    jsonl_records = [json.loads(line) for line in record_lines]
    require(records == jsonl_records, "Source JSON and JSONL differ")
    require(len(records) == 155, "Expected exactly 155 records")
    ids = [record["record_id"] for record in records]
    require(len(set(ids)) == len(ids), "Duplicate record IDs")
    source_summary = json.loads(source_bytes["dataset_summary.json"])
    reader = csv.DictReader(io.StringIO(source_bytes["source_status.csv"].decode("utf-8-sig"), newline=""))
    require(reader.fieldnames == CSV_FIELDS, "Unexpected source catalog columns")
    source_rows = list(reader)
    collected = sum(row["source_collected"] == "True" for row in source_rows)
    complete = sum(row["proof_complete"] == "True" for row in source_rows)
    target_ids = [row["record_id"] for row in source_rows if row["record_id"]]
    require(len(source_rows) == 1575 and collected == 1573, "Source collection counts differ from 1575/1573")
    require(len(target_ids) == complete == len(set(target_ids)) == 146, "Expected 146 completed target records")
    require(set(target_ids) <= set(ids), "Catalog contains unknown record IDs")
    earlier_ids = set(ids) - set(target_ids)
    require(len(earlier_ids) == 9, "Expected nine earlier sample records")
    require(
        all(bool(row["record_id"]) == (row["proof_complete"] == "True") for row in source_rows),
        "Catalog record IDs and completion flags differ",
    )

    audit_counts = Counter()
    audit(records, "records", audit_counts)
    audit(source_rows, "source_catalog", audit_counts)
    overview_edges = sum(validate_record(record) for record in records)
    node_count = sum(len(record["nodes"]) for record in records)
    edge_count = sum(len(record["dependency_graph"]["edges"]) for record in records)
    journal_counts = dict(sorted(Counter(record["paper"]["journal"] for record in records).items()))
    proof_lengths = [len(record["proof"]["raw_tex"]) for record in records]
    proof_characters = {
        "median": statistics.median(proof_lengths),
        "minimum": min(proof_lengths),
        "maximum": max(proof_lengths),
        "at_least_10000": sum(length >= 10000 for length in proof_lengths),
    }
    source_papers = len({record["paper"]["arxiv_id"] for record in records})
    for key, actual in {
        "records": len(records), "source_papers": source_papers, "journals": journal_counts,
        "nodes": node_count, "support_edges": edge_count, "proof_characters": proof_characters,
    }.items():
        require(source_summary[key] == actual, f"Source summary mismatch for {key}")
    for key, actual in {
        "target_articles": len(source_rows), "source_articles_collected": collected,
        "target_proofs_complete": complete,
    }.items():
        require(source_summary["collection"][key] == actual, f"Source collection summary mismatch for {key}")

    collection = {
        "name": "OptProof", "homepage": "https://zhr.xyz/optproof/",
        "target_articles": len(source_rows), "source_articles_collected": collected,
        "target_proofs_complete": complete, "earlier_sample_records": len(earlier_ids),
        "target_publication_years": {"minimum": min(int(row["year"]) for row in source_rows), "maximum": max(int(row["year"]) for row in source_rows)},
        "source_catalog": "downloads/source_catalog.csv",
    }
    summary = {
        "schema_version": "optproof-summary-v1", "records": len(records),
        "source_papers": source_papers, "journals": journal_counts,
        "sections": ["context", "statement", "proof", "nodes", "dependency_graph"],
        "nodes": node_count, "support_edges": edge_count,
        "proof_characters": proof_characters, "collection": collection,
    }
    catalog = {
        "schema_version": "optproof-catalog-v1", "collection": collection,
        "records": [{
            "record_id": record["record_id"], "paper": record["paper"],
            "counts": {"nodes": len(record["nodes"]), "edges": len(record["dependency_graph"]["edges"])},
            "url": f"data/records/{record['record_id']}.json",
        } for record in records],
    }
    audit(summary, "summary", Counter())
    audit(catalog, "catalog", Counter())
    data_dir = site_root / "data"
    record_dir = data_dir / "records"
    download_dir = site_root / "downloads"
    record_dir.mkdir(parents=True, exist_ok=True)
    download_dir.mkdir(parents=True, exist_ok=True)
    require(
        {path.stem for path in record_dir.glob("*.json")} <= set(ids),
        "Unexpected stale record files; inspect them before rebuilding",
    )
    for record, line in zip(records, record_lines):
        (record_dir / f"{record['record_id']}.json").write_bytes(line)
    (data_dir / "catalog.json").write_bytes(json_bytes(catalog))
    (data_dir / "summary.json").write_bytes(json_bytes(summary))
    for source_name, download_name in (
        ("dataset.json", "optproof.json"), ("dataset.jsonl", "optproof.jsonl"),
        ("source_status.csv", "source_catalog.csv"),
    ):
        (download_dir / download_name).write_bytes(source_bytes[source_name])
    for name in ("optproof.json", "optproof.jsonl"):
        write_gzip(download_dir / f"{name}.gz", (download_dir / name).read_bytes())
    (download_dir / "summary.json").write_bytes(json_bytes(summary))
    (download_dir / "README.md").write_text(
        "# OptProof\n\n"
        "An optimization-journal proof dataset containing 155 proof records from "
        "Mathematical Programming, SIAM Journal on Optimization, and Journal of "
        "Optimization Theory and Applications.\n\n"
        "The release contains 146 completed records from a target catalog of "
        "1,575 articles published in 2020–2026, plus 9 earlier sample records. "
        "TeX sources are available for 1,573 target articles. The 155 records "
        "contain 10,053 nodes and 21,484 directed support edges.\n\n"
        "- `optproof.json`: an array of all records.\n"
        "- `optproof.jsonl`: one record per line, in the same order.\n"
        "- `optproof.json.gz` and `optproof.jsonl.gz`: lossless gzip versions.\n"
        "- `source_catalog.csv`: bibliographic information and source availability "
        "for the target catalog. A nonempty `record_id` identifies a released record.\n"
        "- `summary.json`: aggregate dataset and collection counts.\n\n"
        "Each record contains `record_id`, `paper`, `context`, `statement`, "
        "`proof`, `nodes`, and `dependency_graph`. Text is preserved as `raw_tex` "
        "with source units. Edges use `source_id`, `target_id`, and `kind`; "
        "their direction runs from supporter to supported. Some records also "
        "include an overview graph. Node order, edge order, and the original "
        "record fields are preserved. Paper metadata includes links to the "
        "original publications and arXiv versions.\n\n"
        "Browse the dataset at [OptProof](https://zhr.xyz/optproof/).\n",
        encoding="utf-8",
    )

    text_fields_checked = 0
    for original in records:
        published = json.loads((record_dir / f"{original['record_id']}.json").read_bytes())
        require(published == original, f"Published record differs: {original['record_id']}")
        require(raw_texts(published) == raw_texts(original), f"Raw text or source-unit order differs: {original['record_id']}")
        require(published["nodes"] == original["nodes"], "Node data or order differs")
        require(published["dependency_graph"] == original["dependency_graph"], "Graph data or edge order differs")
        text_fields_checked += len(raw_texts(original))
    require([entry["record_id"] for entry in catalog["records"]] == ids, "Catalog record order differs")
    for entry in catalog["records"]:
        require((site_root / entry["url"]).is_file(), "Catalog URL does not resolve locally")
    for source_name, download_name in (
        ("dataset.json", "optproof.json"), ("dataset.jsonl", "optproof.jsonl"),
        ("source_status.csv", "source_catalog.csv"),
    ):
        require((download_dir / download_name).read_bytes() == source_bytes[source_name], f"Download bytes differ: {download_name}")
    require((data_dir / "summary.json").read_bytes() == (download_dir / "summary.json").read_bytes(), "Public summaries differ")
    public_files = sorted(path for folder in (data_dir, download_dir) for path in folder.rglob("*") if path.is_file())
    for path in public_files:
        content = path.read_bytes()
        if path.suffix == ".gz":
            content = gzip.decompress(content)
        if path.suffix != ".csv":
            require(not LOCAL_PATH.search(content.decode("utf-8")), f"Published local path in {path.name}")
            require(not PRIVATE_MARKER.search(content.decode("utf-8")), f"Published private metadata in {path.name}")
    report = {
        "status": "passed", "records": len(records), "source_papers": source_papers,
        "nodes": node_count, "support_edges": edge_count, "overview_edges": overview_edges,
        "source_catalog_rows": len(source_rows), "source_articles_collected": collected,
        "target_proofs_complete": complete, "earlier_sample_records": len(earlier_ids),
        "earlier_sample_record_ids": sorted(earlier_ids),
        "raw_text_fields_checked": text_fields_checked,
        "privacy_audit": {"keys_scanned": audit_counts["keys"], "string_values_scanned": audit_counts["strings"], "findings": []},
        "checks": {
            "source_json_equals_jsonl": True, "all_record_ids_and_order_preserved": True,
            "all_record_fields_and_ordered_lists_preserved": True,
            "all_raw_tex_and_source_units_preserved": True,
            "all_graphs_and_ordered_edges_preserved": True,
            "all_full_and_overview_edge_endpoints_exist": True,
            "source_unit_hashes_valid": True, "catalog_urls_resolve": True,
            "download_json_jsonl_csv_byte_identical": True,
            "gzip_round_trip_and_zero_mtime": True, "public_summary_counts_match_source": True,
        },
        "source_sha256": {name: digest(content) for name, content in source_bytes.items()},
        "public_file_count": len(public_files),
        "public_total_bytes": sum(path.stat().st_size for path in public_files),
        "public_files": [{"path": path.relative_to(site_root).as_posix(), "bytes": path.stat().st_size, "sha256": digest(path.read_bytes())} for path in public_files],
    }
    if validation_report:
        validation_report.parent.mkdir(parents=True, exist_ok=True)
        validation_report.write_bytes(json_bytes(report))
    return report


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-review", "--source", dest="source", type=Path, required=True, help="Directory containing the four source data files")
    parser.add_argument("--site-root", type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument("--validation-report", type=Path, help="Optional internal report, outside the public site")
    args = parser.parse_args()
    report = build(args.source, args.site_root, args.validation_report)
    print(json.dumps({key: report[key] for key in (
        "status", "records", "nodes", "support_edges", "source_catalog_rows",
        "source_articles_collected", "public_file_count", "public_total_bytes"
    )}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
