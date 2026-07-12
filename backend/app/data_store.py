"""
Loads all sample data (applications, SBOM dependencies, vulnerability DB,
license rules, transitive dependency edges) once at process startup and
builds fast lookup indexes used by the risk engine.
"""
import json
import os
from collections import defaultdict
from datetime import date

import pandas as pd

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")

# The sample dataset was generated relative to this fixed reference date
# (verified against the "days ago" figures baked into dependency_labels.csv).
REFERENCE_DATE = date(2026, 4, 21)
UNMAINTAINED_THRESHOLD_DAYS = 730  # 2 years

VIRAL_LICENSE_RISK_LEVELS = {"CRITICAL", "HIGH"}


class DataStore:
    def __init__(self):
        self.applications = self._load_json("applications.json")
        self.applications_by_id = {a["app_id"]: a for a in self.applications}

        self.sbom_df = pd.read_csv(
            os.path.join(DATA_DIR, "sbom_dependencies.csv"), encoding="latin-1"
        )
        self.sbom_df["last_updated"] = pd.to_datetime(self.sbom_df["last_updated"]).dt.date

        self.vulnerability_db = self._load_json("vulnerability_db.json")
        self.license_rules = self._load_json("license_rules.json")
        self.transitive_edges = self._load_json("transitive_dependencies.json")

        try:
            self.labels_df = pd.read_csv(
                os.path.join(DATA_DIR, "dependency_labels.csv"), encoding="latin-1"
            )
        except FileNotFoundError:
            self.labels_df = None

        self._build_indexes()

    def _load_json(self, filename):
        with open(os.path.join(DATA_DIR, filename), "r", encoding="utf-8") as f:
            return json.load(f)

    def _build_indexes(self):
        # library name (lowercase) -> list of vulnerability records
        self.vuln_index = defaultdict(list)
        for v in self.vulnerability_db:
            self.vuln_index[v["library"].lower()].append(v)

        # license name -> rule record
        self.license_index = {r["license"]: r for r in self.license_rules}

        # (application_id, parent_library, parent_version) -> list of child edges
        self.transitive_index = defaultdict(list)
        for edge in self.transitive_edges:
            key = (edge["application_id"], edge["parent_library"], edge["parent_version"])
            self.transitive_index[key].append(edge)

        # dep_id -> ground truth label row (for self-evaluation panel)
        self.labels_by_dep_id = {}
        if self.labels_df is not None:
            for _, row in self.labels_df.iterrows():
                self.labels_by_dep_id[row["dep_id"]] = row.to_dict()


store = DataStore()
