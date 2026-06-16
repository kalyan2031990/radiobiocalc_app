#!/usr/bin/env python3
"""Independent verification — reads engine audit MD, writes parity JSON."""
import glob
import json
import os
import re
import statistics as st
import sys
from datetime import datetime, timezone

ORG = {
    "Parotid": (28.4, 1.0, 0.3),
    "Larynx": (44.0, 1.0, 0.7),
    "Spinal Cord": (66.5, 4.0, 1.0),
    "Brainstem": (64.0, 3.0, 1.0),
    "Lung": (24.5, 1.0, 0.8),
    "Heart": (48.0, 0.42, 0.9),
}
AB_OAR = 3.0


def morg(n):
    s = n.lower()
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


def parse_dvh(fp):
    cur = None
    structures = []
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


def met(p):
    p = sorted(p)
    d = [x[0] for x in p]
    v = [x[1] for x in p]
    dv = [max(0, v[i] - v[i + 1]) for i in range(len(v) - 1)] + [v[-1]]
    tot = sum(dv)
    mean = sum(d[i] * dv[i] for i in range(len(d))) / tot

    def da(fr):
        t = fr * v[0]
        for i in range(len(d)):
            if v[i] <= t:
                if i == 0:
                    return d[0]
                return (
                    d[i - 1] + (v[i - 1] - t) / (v[i - 1] - v[i]) * (d[i] - d[i - 1])
                    if v[i - 1] != v[i]
                    else d[i - 1]
                )
        return d[-1]

    return mean, da(0.95)


def ntcp(g, td, gm):
    return 1 / (1 + (td / g) ** (4 * gm)) if g > 0 else 0.0


def load_engine_audit(audit_path):
    rows = {}
    for ln in open(audit_path, encoding="utf-8"):
        m = re.match(
            r"\|\s*(RBX-(?:TXT|DCM)-\d+)\s*\|\s*([\d.]+)\s*\|\s*([\d.]+)\s*\|\s*([\d.]+)\s*\|",
            ln,
        )
        if m:
            rows[m.group(1)] = {
                "tcp_app": float(m.group(2)),
                "ntcp_app": float(m.group(3)),
                "twi_app": float(m.group(4)),
            }
    return rows


def main():
    src = sys.argv[1] if len(sys.argv) > 1 else "."
    out = (
        sys.argv[2]
        if len(sys.argv) > 2
        else os.path.join(os.getcwd(), "engine_independent_parity.json")
    )
    audit = os.environ.get("ENGINE_AUDIT_MD")
    if not audit:
        audit = os.path.join(os.path.dirname(out), "engine_results_audit.md")
    engine = load_engine_audit(audit) if os.path.isfile(audit) else {}

    parity = []
    for fp in sorted(glob.glob(os.path.join(src, "*.txt"))):
        cid = os.path.basename(fp).split("_")[0]
        structures = parse_dvh(fp)
        text = open(fp, encoding="utf-8", errors="replace").read()
        m = re.search(r"Prescription:\s*([\d.]+)\s*Gy\s*/\s*(\d+)", text)
        rx, n = (70.0, 35) if not m else (float(m.group(1)), int(m.group(2)))
        eqf = (AB_OAR + rx / n) / (AB_OAR + 2)
        targs = [s for s in structures if s["r"] == "TARGET" and len(s["p"]) > 1]
        oars = [s for s in structures if s["r"] == "OAR" and len(s["p"]) > 1]
        if not targs:
            continue
        tgt = max(targs, key=lambda s: met(s["p"])[0])
        d95_calc = met(tgt["p"])[1]
        comp = 0.0
        wsum = 0.0
        utcp = 1.0
        for o in oars:
            org = morg(o["n"])
            if not org or org not in ORG:
                continue
            td, gm, lam = ORG[org]
            g = met(o["p"])[0] * eqf
            nt = ntcp(g, td, gm)
            comp = max(comp, nt)
            wsum += lam * nt
            utcp *= 1 - nt
        tcp_uncapped = 1.0
        twi_calc = (tcp_uncapped - wsum) * 100
        ntcp_calc = comp * 100
        app = engine.get(cid, {})
        short = cid.replace("RBX-", "")
        parity.append(
            {
                "case": short,
                "patientId": cid,
                "d95_calc": round(d95_calc, 2),
                "d95_app": app.get("d95_app"),
                "ntcp_calc": round(ntcp_calc, 1),
                "ntcp_app": app.get("ntcp_app"),
                "tcp_calc": round(tcp_uncapped * 100, 1),
                "tcp_app": app.get("tcp_app"),
                "utcp_calc": round(utcp * 100, 1),
                "twi_calc": round(twi_calc, 1),
                "twi_app": app.get("twi_app"),
                "pplus_calc": round((tcp_uncapped - comp) * 100, 1),
            }
        )

    # Fill d95_app from audit table second pass
    for row in parity:
        if row["d95_app"] is not None:
            continue
        pid = row["patientId"]
        for ln in open(audit, encoding="utf-8"):
            m = re.match(
                rf"\|\s*{re.escape(pid)}\s*\|[^|]+\|[^|]+\|[^|]+\|[^|]+\|\s*([\d.]+)\s*\|",
                ln,
            )
            if m:
                row["d95_app"] = float(m.group(1))
                break

    payload = {
        "generated": datetime.now(timezone.utc).isoformat(),
        "source": src,
        "engine_audit": audit,
        "cases": parity,
    }
    os.makedirs(os.path.dirname(out) or ".", exist_ok=True)
    json.dump(payload, open(out, "w", encoding="utf-8"), indent=2)

    # fig3 expects list format
    fig3 = [
        {
            "case": r["case"],
            "d95_calc": r["d95_calc"],
            "d95_app": r["d95_app"],
            "ntcp_calc": r["ntcp_calc"],
            "ntcp_app": r["ntcp_app"],
            "twi_calc": r["twi_calc"],
            "twi_app": r["twi_app"],
        }
        for r in parity
    ]
    fig3_path = os.path.join(os.path.dirname(out), "parity_fig3.json")
    json.dump(fig3, open(fig3_path, "w", encoding="utf-8"), indent=2)

    dN = [abs(r["ntcp_calc"] - r["ntcp_app"]) for r in parity if r["ntcp_app"] is not None]
    dT = [abs(r["twi_calc"] - r["twi_app"]) for r in parity if r["twi_app"] is not None]
    dD = [abs(r["d95_calc"] - r["d95_app"]) for r in parity if r["d95_app"] is not None]
    print(f"Wrote {out} ({len(parity)} cases)")
    if dD:
        print(f"D95  mean|d|={st.mean(dD):.2f} Gy  max|d|={max(dD):.2f}")
    if dN:
        print(f"NTCP mean|d|={st.mean(dN):.2f} pp  max|d|={max(dN):.2f}")
    if dT:
        print(f"TWI  mean|d|={st.mean(dT):.2f} pp  max|d|={max(dT):.2f}")


if __name__ == "__main__":
    main()
