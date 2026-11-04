# OptProof

An optimization-journal proof dataset containing 155 proof records from Mathematical Programming, SIAM Journal on Optimization, and Journal of Optimization Theory and Applications.

The release contains 146 completed records from a target catalog of 1,575 articles published in 2020–2026, plus 9 earlier sample records. TeX sources are available for 1,573 target articles. The 155 records contain 10,053 nodes and 21,484 directed support edges.

- `optproof.json`: an array of all records.
- `optproof.jsonl`: one record per line, in the same order.
- `optproof.json.gz` and `optproof.jsonl.gz`: lossless gzip versions.
- `source_catalog.csv`: bibliographic information and source availability for the target catalog. A nonempty `record_id` identifies a released record.
- `summary.json`: aggregate dataset and collection counts.

Each record contains `record_id`, `paper`, `context`, `statement`, `proof`, `nodes`, and `dependency_graph`. Text is preserved as `raw_tex` with source units. Edges use `source_id`, `target_id`, and `kind`; their direction runs from supporter to supported. Some records also include an overview graph. Node order, edge order, and the original record fields are preserved. Paper metadata includes links to the original publications and arXiv versions.

Browse the dataset at [OptProof](https://zhr.xyz/optproof/).
