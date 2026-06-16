#!/usr/bin/env python3
"""
Independent re-implementation of rbGyanX Mobile composite metrics (build 17).

Reads engine audit MD/JSON as reference; recomputes from DVH files:
  D95, composite NTCP (LKB log-logistic, mean EQD2), Poisson LQ-DVH TCP,
  UTCP, P+, TWI.

Usage:
  python independent_verification.py <composite_dvh_dir> <output.json> \\
    --audit <engine_results_audit.md> --manifest <case_manifest.md>
"""
from __future__ import annotations

import argparse
import glob
import json
import math
import os
import re
import statistics as st
import sys
from datetime import datetime, timezone

# QUANTEC LKB log-logistic (TD50 Gy, gamma50, risk-weight lambda)
ORG = {
    "Parotid": (28.4, 1.0, 0.3),
    "Larynx": (44.0, 1.0, 0.7),
    "Spinal Cord": (66.5, 4.0, 1.0),
    "Brainstem": (64.0, 3.0, 1.0),
    "Lung": (24.5, 1.0, 0.8),
    "Heart": (48.0, 0.42, 0.9),
}
SERIAL_ORGANS = {"Spinal Cord", "Brainstem"}
AB_OAR = 3.0
TCP_DISPLAY_CAP = 0.95

# HN site TCP params (server/tcp-site-params.ts — HN)
HN_TCP = {
    "alpha": 0.35,
    "beta": 0.035,
    "n0_gtv": 1e7,
    "n0_ctv": 1e5,
    "tk_days": 21,
    "tpot_days": 4,
    "lq_max_dpf": 10.0,
}


def morg(n: str) -> str | None:
    s = n.lower()
    if re.search(r"\bprv\b", s):
        return None  # match engine mapLiteratureOrgan — PRV structures excluded
    for pat, o in [
        (r"combo|parot|prtd|prtoid", "Parotid"),
        (r"larynx|laryn", "Larynx"),
        (r"cord|spinal", "Spinal Cord"),
        (r"brain\s*stem|brainstem", "Brainstem"),
        (r"\blung\b", "Lung"),
        (r"\bheart\b", "Heart"),
    ]:
        if re.search(pat, s):
            return o
    return None


def load_case_manifest(manifest_path: str) -> dict[str, tuple[float, int]]:
    """Return {RBX-XXX-NNN: (rx_gy, fractions)}."""
    if not os.path.isfile(manifest_path):
        raise FileNotFoundError(f"case_manifest not found: {manifest_path}")
    rows: dict[str, tuple[float, int]] = {}
    for ln in open(manifest_path, encoding="utf-8"):
        m = re.match(
            r"\|\s*(RBX-(?:TXT|DCM)-\d+)\s*\|[^|]+\|[^|]+\|\s*([\d.]+)\s*\|\s*(\d+)\s*\|",
            ln,
        )
        if m:
            rows[m.group(1)] = (float(m.group(2)), int(m.group(3)))
    if len(rows) < 17:
        raise ValueError(f"case_manifest has {len(rows)} cases, expected 17")
    return rows


def parse_prescribed_dose_gy(text: str) -> float | None:
    for pat in (
        r"Prescribed\s+dose\s*:\s*([\d.]+)\s*Gy",
        r"Prescription:\s*([\d.]+)\s*Gy",
    ):
        m = re.search(pat, text, re.I)
        if m:
            return float(m.group(1))
    return None


def parse_prescribed_fractions(text: str) -> int | None:
    m = re.search(r"Prescribed\s+fractions?\s*:\s*(\d+)", text, re.I)
    if m:
        return int(m.group(1))
    m = re.search(r"Prescription:\s*[\d.]+\s*Gy\s*/\s*(\d+)", text, re.I)
    return int(m.group(1)) if m else None


def resolve_rx_fx(cid: str, text: str, manifest: dict[str, tuple[float, int]]) -> tuple[float, int]:
    if cid not in manifest:
        raise ValueError(f"{cid}: not in case_manifest.md")
    rx_m, fx_m = manifest[cid]
    rx_h = parse_prescribed_dose_gy(text)
    fx_h = parse_prescribed_fractions(text)
    rx = rx_h if rx_h is not None else rx_m
    fx = fx_h if fx_h is not None else fx_m
    if rx is None or fx is None:
        raise ValueError(f"{cid}: missing prescription (header or manifest)")
    return rx, fx


def parse_dvh(fp: str) -> list[dict]:
    cur = None
    structures: list[dict] = []
    for ln in open(fp, encoding="utf-8", errors="replace"):
        m = re.match(r"Structure:\s*(.+)", ln)
        if m:
            cur = {"n": m.group(1).strip(), "r": None, "p": []}
            structures.append(cur)
            continue
        m = re.match(r"Role:\s*(\w+)", ln)
        if m and cur:
            cur["r"] = m.group(1).upper()
            continue
        if cur is not None:
            mm = re.match(r"\s*([\d.]+)\s+([\d.]+)\s*$", ln)
            if mm:
                cur["p"].append((float(mm.group(1)), float(mm.group(2))))
    return structures


def met(p: list[tuple[float, float]]) -> tuple[float, float]:
    p = sorted(p)
    d = [x[0] for x in p]
    v = [x[1] for x in p]
    dv = [max(0, v[i] - v[i + 1]) for i in range(len(v) - 1)] + [v[-1]]
    tot = sum(dv)
    mean = sum(d[i] * dv[i] for i in range(len(d))) / tot

    def da(fr: float) -> float:
        t = fr * v[0]
        for i in range(len(d)):
            if v[i] <= t:
                if i == 0:
                    return d[0]
                if v[i - 1] != v[i]:
                    return d[i - 1] + (v[i - 1] - t) / (v[i - 1] - v[i]) * (d[i] - d[i - 1])
                return d[i - 1]
        return d[-1]

    return mean, da(0.95)


def ntcp_lkb_loglogit(g: float, td: float, gm: float) -> float:
    if g <= 0:
        return 0.0
    return 1.0 / (1.0 + (td / g) ** (4.0 * gm))


def infer_target_type(name: str) -> str:
    u = name.upper()
    if "GTV" in u:
        return "GTV"
    if "CTV" in u:
        return "CTV"
    return "PTV"


def n0_for_target(target_type: str) -> float:
    if target_type == "GTV":
        return HN_TCP["n0_gtv"]
    return HN_TCP["n0_ctv"]


def treatment_time_days(num_fractions: int, dpf: float) -> int:
    return max(1, round(num_fractions * max(1.0, dpf / 2.0)))


def repop_factor(treatment_days: int) -> float:
    tk = HN_TCP["tk_days"]
    if treatment_days <= tk:
        return 1.0
    repop_days = treatment_days - tk
    return math.exp(math.log(2) * repop_days / HN_TCP["tpot_days"])


def sf_per_fx(dpf: float, alpha: float, beta: float) -> float:
    if dpf <= 0:
        return 1.0
    return math.exp(-alpha * dpf - beta * dpf * dpf)


def poisson_lq_dvh_tcp(cumulative: list[tuple[float, float]], num_fractions: int, target_type: str) -> float:
    """Poisson LQ-DVH TCP from cumulative DVH (matches server/tcp-dvh-engine.ts)."""
    if len(cumulative) < 2:
        return 0.0
    pts = sorted(cumulative, key=lambda x: x[0])
    v0 = pts[0][1]
    if v0 <= 0:
        return 0.0

    alpha = HN_TCP["alpha"]
    beta = HN_TCP["beta"]
    lq_max = HN_TCP["lq_max_dpf"]
    n0 = n0_for_target(target_type)

    mean_integral = 0.0
    n_eff = 0.0

    for i in range(1, len(pts)):
        shell_vol = max(0.0, pts[i - 1][1] - pts[i][1])
        if shell_vol <= 1e-9:
            continue
        dose_gy = pts[i][0]
        vol_frac = shell_vol / v0
        mean_integral += ((pts[i - 1][0] + pts[i][0]) / 2.0) * shell_vol

        dpf = dose_gy / max(num_fractions, 1)
        use_usc = dpf > lq_max
        dpf_lq = min(dpf, lq_max) if use_usc else dpf
        sf_frac = sf_per_fx(dpf_lq, alpha, beta)
        if use_usc and dpf > lq_max:
            sf_cap = sf_per_fx(lq_max, alpha, beta)
            sf_frac = sf_cap * math.exp(-alpha * (dpf - lq_max))
        sf_total = sf_frac**num_fractions
        n_eff += n0 * vol_frac * sf_total

    mean_dose = mean_integral / v0
    dpf_fallback = mean_dose / max(num_fractions, 1)
    t_days = treatment_time_days(num_fractions, dpf_fallback)
    n_eff *= repop_factor(t_days)

    if n_eff <= 0 or not math.isfinite(n_eff):
        return 0.0
    return max(0.0, min(1.0, math.exp(-n_eff)))


def load_engine_audit(audit_path: str) -> dict[str, dict]:
    rows: dict[str, dict] = {}
    for ln in open(audit_path, encoding="utf-8"):
        m = re.match(
            r"\|\s*(RBX-(?:TXT|DCM)-\d+)\s*\|"
            r"\s*([\d.]+)\s*\|"
            r"\s*([\d.]+)\s*\|"
            r"\s*([\d.]+)\s*\|"
            r"\s*([\d.]+|—)\s*\|"
            r"\s*([\d.]+|—)\s*\|"
            r"\s*([\d.]+)\s*\|"
            r"\s*(\d+)\s*\|",
            ln,
        )
        if not m:
            # Extended table with tcp_display / tcp_uncapped
            m2 = re.match(
                r"\|\s*(RBX-(?:TXT|DCM)-\d+)\s*\|"
                r"\s*([\d.]+)\s*\|"
                r"\s*([\d.]+)\s*\|"
                r"\s*([\d.]+)\s*\|"
                r"\s*([\d.]+)\s*\|"
                r"\s*([\d.]+)\s*\|"
                r"\s*([\d.]+)\s*\|"
                r"\s*([\d.]+)\s*\|"
                r"\s*([\d.]+|—)\s*\|"
                r"\s*([\d.]+|—)\s*\|",
                ln,
            )
            if m2:
                pid = m2.group(1)
                rows[pid] = {
                    "tcp_display_app": float(m2.group(2)),
                    "tcp_uncapped_app": float(m2.group(3)),
                    "ntcp_app": float(m2.group(4)),
                    "utcp_app": float(m2.group(5)),
                    "pplus_app": float(m2.group(6)),
                    "twi_app": float(m2.group(7)),
                    "tci_app": None if m2.group(8) == "—" else float(m2.group(8)),
                    "d95_app": None if m2.group(9) == "—" else float(m2.group(9)),
                    "tcp_app": float(m2.group(3)),
                }
            continue
        pid = m.group(1)
        rows[pid] = {
            "tcp_app": float(m.group(2)),
            "tcp_display_app": float(m.group(2)),
            "tcp_uncapped_app": float(m.group(2)),
            "ntcp_app": float(m.group(3)),
            "twi_app": float(m.group(4)),
            "tci_app": None if m.group(5) == "—" else float(m.group(5)),
            "d95_app": None if m.group(6) == "—" else float(m.group(6)),
            "dose_app": float(m.group(7)),
            "fx_app": int(m.group(8)),
        }
    return rows


def parity_stats(parity: list[dict], key_calc: str, key_app: str) -> dict | None:
    deltas = [
        abs(r[key_calc] - r[key_app])
        for r in parity
        if r.get(key_app) is not None and r.get(key_calc) is not None
    ]
    if not deltas:
        return None
    return {"mean_abs_delta": round(st.mean(deltas), 3), "max_abs_delta": round(max(deltas), 3)}


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("dvh_dir", help="composite_dvh folder")
    ap.add_argument("output_json", help="engine_independent_parity.json path")
    ap.add_argument("--audit", required=True, help="engine_results_audit.md")
    ap.add_argument("--manifest", required=True, help="case_manifest.md")
    args = ap.parse_args()

    manifest = load_case_manifest(args.manifest)
    engine = load_engine_audit(args.audit)
    parity: list[dict] = []

    for fp in sorted(glob.glob(os.path.join(args.dvh_dir, "*.txt"))):
        cid = os.path.basename(fp).split("_")[0]
        text = open(fp, encoding="utf-8", errors="replace").read()
        rx, fx = resolve_rx_fx(cid, text, manifest)
        eqf = (AB_OAR + rx / fx) / (AB_OAR + 2.0)

        structures = parse_dvh(fp)
        targs = [s for s in structures if s["r"] == "TARGET" and len(s["p"]) > 1]
        oars = [s for s in structures if s["r"] == "OAR" and len(s["p"]) > 1]
        if not targs:
            raise ValueError(f"{cid}: no target structures")

        tgt = max(targs, key=lambda s: met(s["p"])[0])
        d95_calc = met(tgt["p"])[1]
        target_type = infer_target_type(tgt["n"])
        tcp_uncapped = poisson_lq_dvh_tcp(tgt["p"], fx, target_type)
        tcp_display = min(tcp_uncapped, TCP_DISPLAY_CAP)

        comp = 0.0
        wsum = 0.0
        utcp = 1.0
        ntcp_crit = 0.0
        has_serial = False
        for o in oars:
            org = morg(o["n"])
            if not org or org not in ORG:
                continue
            td, gm, lam = ORG[org]
            rw = lam
            g = met(o["p"])[0] * eqf
            nt = ntcp_lkb_loglogit(g, td, gm)
            comp = max(comp, nt)
            wsum += rw * nt
            utcp *= 1.0 - nt
            if rw >= 0.9 or org in SERIAL_ORGANS:
                has_serial = True
                if nt > ntcp_crit:
                    ntcp_crit = nt
        # Match lib/therapeutic-window.ts: fallback to max NTCP only when no serial organ contributed
        if ntcp_crit == 0 and not has_serial:
            ntcp_crit = comp

        utcp_calc = tcp_uncapped * utcp
        pplus_calc = tcp_uncapped - ntcp_crit
        twi_calc = tcp_uncapped - wsum

        app = engine.get(cid, {})
        short = cid.replace("RBX-", "")
        parity.append(
            {
                "case": short,
                "patientId": cid,
                "rx_gy": rx,
                "fractions": fx,
                "d95_calc": round(d95_calc, 2),
                "d95_app": app.get("d95_app"),
                "ntcp_calc": round(comp * 100, 1),
                "ntcp_app": app.get("ntcp_app"),
                "tcp_display_calc": round(tcp_display * 100, 1),
                "tcp_display_app": app.get("tcp_display_app", app.get("tcp_app")),
                "tcp_uncapped_calc": round(tcp_uncapped * 100, 1),
                "tcp_uncapped_app": app.get("tcp_uncapped_app", app.get("tcp_app")),
                "utcp_calc": round(utcp_calc * 100, 1),
                "utcp_app": app.get("utcp_app"),
                "pplus_calc": round(pplus_calc * 100, 1),
                "pplus_app": app.get("pplus_app"),
                "twi_calc": round(twi_calc * 100, 1),
                "twi_app": app.get("twi_app"),
                "tci_app": app.get("tci_app"),
            }
        )

    out_dir = os.path.dirname(os.path.abspath(args.output_json)) or "."
    os.makedirs(out_dir, exist_ok=True)

    summary = {
        k: parity_stats(parity, f"{k.split('_')[0]}_calc" if k != "tcp_uncapped" else "tcp_uncapped_calc", f"{k}_app")
        for k in ("d95", "ntcp", "tcp_uncapped", "utcp", "pplus", "twi")
    }
    # fix keys for stats lookup
    summary = {
        "d95": parity_stats(parity, "d95_calc", "d95_app"),
        "ntcp": parity_stats(parity, "ntcp_calc", "ntcp_app"),
        "tcp_uncapped": parity_stats(parity, "tcp_uncapped_calc", "tcp_uncapped_app"),
        "utcp": parity_stats(parity, "utcp_calc", "utcp_app"),
        "pplus": parity_stats(parity, "pplus_calc", "pplus_app"),
        "twi": parity_stats(parity, "twi_calc", "twi_app"),
    }

    payload = {
        "generated": datetime.now(timezone.utc).isoformat(),
        "source": args.dvh_dir,
        "engine_audit": args.audit,
        "cases": parity,
        "summary": {k: v for k, v in summary.items() if v},
    }
    json.dump(payload, open(args.output_json, "w", encoding="utf-8"), indent=2)

    fig3 = [
        {
            "case": r["case"],
            "d95_calc": r["d95_calc"],
            "d95_app": r["d95_app"],
            "ntcp_calc": r["ntcp_calc"],
            "ntcp_app": r["ntcp_app"],
            "tcp_uncapped_calc": r["tcp_uncapped_calc"],
            "tcp_uncapped_app": r["tcp_uncapped_app"],
            "utcp_calc": r["utcp_calc"],
            "utcp_app": r["utcp_app"],
            "pplus_calc": r["pplus_calc"],
            "pplus_app": r["pplus_app"],
            "twi_calc": r["twi_calc"],
            "twi_app": r["twi_app"],
        }
        for r in parity
    ]
    fig3_path = os.path.join(out_dir, "parity_fig3.json")
    json.dump(fig3, open(fig3_path, "w", encoding="utf-8"), indent=2)

    print(f"Wrote {args.output_json} ({len(parity)} cases)")
    for metric, stats in summary.items():
        if stats:
            unit = "Gy" if metric == "d95" else "pp"
            print(
                f"{metric:12s} mean|d|={stats['mean_abs_delta']:.2f} {unit}  "
                f"max|d|={stats['max_abs_delta']:.2f}"
            )


if __name__ == "__main__":
    main()
