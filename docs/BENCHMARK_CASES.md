# Benchmark case registry (validation)

Target: **20–50 locked cases** with expected outputs for automated regression.

## Case template

| ID | Site | Fractionation | Source DVH | TCP ref | NTCP ref | Notes |
|----|------|---------------|------------|---------|----------|-------|
| HN-001 | HN | 70 Gy / 35 fx | KASTOORI PTV70 + parotid | desktop/py | desktop/py | Composite plan smoke |

## Modules to cover

- DVH import (valid, corrupt, missing structure)
- BED / EQD2 (vs spreadsheet)
- TCP models (literature benchmarks)
- NTCP models (vs Python `project_rbGyanx` engine)
- DVH metrics (Vx, Dx, Dmean, Dmax)
- Therapeutic window (UTCP, P+, TWI)
- Fractionation gating (Paddick/GI only SBRT)
- Export (PDF/DOCX)

## Automation

- `npm run test:cycle` — phase scripts
- `RBGYANX_FULL_SUITE=1` — full `rbgyanx_test_data` suite
- Future: `scripts/run_benchmark_registry.ts` reading this table

## Statistical acceptance (example)

Compare app vs reference (Python/MATLAB):

- Mean absolute error on NTCP
- 95% limits of agreement (Bland–Altman)
- ICC / Pearson r > 0.99 for core metrics

Example acceptance line:

```
NTCP_app vs NTCP_python: mean difference = 0.002, 95% limits = ±0.01
```
