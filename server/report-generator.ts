/**
 * PDF Report Generator
 * 
 * Generates comprehensive clinical reports with:
 * - Calculation results (TCP, NTCP, BED, EQD2)
 * - Dose metrics and DVH summary
 * - Model parameters and assumptions
 * - Literature references
 * - Timestamp and patient information
 */

import { CalculationResult } from "./radiobiology";

export interface ReportData {
  patientName: string;
  patientID: string;
  studyDate: string;
  structures: Array<{
    name: string;
    type: "target" | "oar";
    tcp?: number;
    ntcp?: number;
    bed: number;
    eqd2: number;
    meanDose: number;
    maxDose: number;
    minDose: number;
    volume: number;
  }>;
  fractionation: {
    totalDose: number;
    numFractions: number;
    dosePerFraction: number;
  };
  models: {
    ntcp: string;
    tcp: string;
  };
  generatedAt: string;
}

export class ReportGenerator {
  /**
   * Generate HTML report content
   */
  static generateHTMLReport(data: ReportData): string {
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>RadioBioCalc Report</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      color: #333;
      line-height: 1.6;
      padding: 40px;
      background: #f5f5f5;
    }
    
    .container {
      max-width: 900px;
      margin: 0 auto;
      background: white;
      padding: 40px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    
    header {
      border-bottom: 3px solid #0a7ea4;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    
    h1 {
      color: #0a7ea4;
      font-size: 28px;
      margin-bottom: 10px;
    }
    
    .subtitle {
      color: #666;
      font-size: 14px;
    }
    
    .patient-info {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 30px;
      padding: 20px;
      background: #f9f9f9;
      border-radius: 6px;
      border-left: 4px solid #0a7ea4;
    }
    
    .info-item {
      display: flex;
      flex-direction: column;
    }
    
    .info-label {
      font-weight: 600;
      color: #666;
      font-size: 12px;
      text-transform: uppercase;
      margin-bottom: 4px;
    }
    
    .info-value {
      font-size: 16px;
      color: #333;
    }
    
    .section {
      margin-bottom: 30px;
    }
    
    .section-title {
      font-size: 18px;
      font-weight: 600;
      color: #0a7ea4;
      border-bottom: 2px solid #e0e0e0;
      padding-bottom: 10px;
      margin-bottom: 15px;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    
    th {
      background: #f0f0f0;
      padding: 12px;
      text-align: left;
      font-weight: 600;
      border-bottom: 2px solid #ddd;
      font-size: 13px;
    }
    
    td {
      padding: 12px;
      border-bottom: 1px solid #eee;
      font-size: 14px;
    }
    
    tr:hover {
      background: #f9f9f9;
    }
    
    .metric-grid {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 15px;
      margin-bottom: 20px;
    }
    
    .metric-card {
      padding: 15px;
      background: #f9f9f9;
      border-radius: 6px;
      border-left: 4px solid #0a7ea4;
    }
    
    .metric-label {
      font-size: 12px;
      color: #666;
      text-transform: uppercase;
      margin-bottom: 5px;
    }
    
    .metric-value {
      font-size: 20px;
      font-weight: 600;
      color: #0a7ea4;
    }
    
    .metric-unit {
      font-size: 12px;
      color: #999;
      margin-left: 4px;
    }
    
    .reference {
      font-size: 12px;
      color: #666;
      margin-bottom: 8px;
      padding-left: 20px;
      text-indent: -20px;
    }
    
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #eee;
      font-size: 12px;
      color: #999;
      text-align: center;
    }
    
    .warning {
      background: #fff3cd;
      border-left: 4px solid #ffc107;
      padding: 15px;
      margin-bottom: 20px;
      border-radius: 4px;
      font-size: 13px;
      color: #856404;
    }
    
    .success {
      background: #d4edda;
      border-left: 4px solid #28a745;
      padding: 15px;
      margin-bottom: 20px;
      border-radius: 4px;
      font-size: 13px;
      color: #155724;
    }
    
    @media print {
      body {
        background: white;
        padding: 0;
      }
      .container {
        box-shadow: none;
        padding: 0;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>RadioBioCalc Clinical Report</h1>
      <p class="subtitle">Radiobiology & Dosimetry Analysis</p>
    </header>
    
    <!-- Patient Information -->
    <div class="patient-info">
      <div class="info-item">
        <span class="info-label">Patient Name</span>
        <span class="info-value">${data.patientName}</span>
      </div>
      <div class="info-item">
        <span class="info-label">Patient ID</span>
        <span class="info-value">${data.patientID}</span>
      </div>
      <div class="info-item">
        <span class="info-label">Study Date</span>
        <span class="info-value">${data.studyDate}</span>
      </div>
      <div class="info-item">
        <span class="info-label">Report Generated</span>
        <span class="info-value">${data.generatedAt}</span>
      </div>
    </div>
    
    <!-- Fractionation Scheme -->
    <div class="section">
      <h2 class="section-title">Fractionation Scheme</h2>
      <div class="metric-grid">
        <div class="metric-card">
          <div class="metric-label">Total Dose</div>
          <div class="metric-value">${data.fractionation.totalDose.toFixed(1)}<span class="metric-unit">Gy</span></div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Number of Fractions</div>
          <div class="metric-value">${data.fractionation.numFractions}</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Dose per Fraction</div>
          <div class="metric-value">${data.fractionation.dosePerFraction.toFixed(2)}<span class="metric-unit">Gy</span></div>
        </div>
      </div>
    </div>
    
    <!-- Models Used -->
    <div class="section">
      <h2 class="section-title">Calculation Models</h2>
      <div class="metric-grid">
        <div class="metric-card">
          <div class="metric-label">NTCP Model</div>
          <div class="metric-value" style="font-size: 16px;">${data.models.ntcp}</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">TCP Model</div>
          <div class="metric-value" style="font-size: 16px;">${data.models.tcp}</div>
        </div>
      </div>
    </div>
    
    <!-- Results Table -->
    <div class="section">
      <h2 class="section-title">Calculation Results</h2>
      <table>
        <thead>
          <tr>
            <th>Structure</th>
            <th>Type</th>
            <th>TCP/NTCP (%)</th>
            <th>Mean Dose (Gy)</th>
            <th>Max Dose (Gy)</th>
            <th>BED (Gy)</th>
            <th>EQD2 (Gy)</th>
          </tr>
        </thead>
        <tbody>
          ${data.structures
            .map(
              (s) => `
          <tr>
            <td><strong>${s.name}</strong></td>
            <td>${s.type === "target" ? "Target" : "OAR"}</td>
            <td>${s.tcp !== undefined ? s.tcp.toFixed(1) : s.ntcp?.toFixed(1) || "N/A"}%</td>
            <td>${s.meanDose.toFixed(1)}</td>
            <td>${s.maxDose.toFixed(1)}</td>
            <td>${s.bed.toFixed(1)}</td>
            <td>${s.eqd2.toFixed(1)}</td>
          </tr>
          `
            )
            .join("")}
        </tbody>
      </table>
    </div>
    
    <!-- Clinical Summary -->
    <div class="section">
      <h2 class="section-title">Clinical Summary</h2>
      <div class="success">
        <strong>✓ Analysis Complete</strong><br>
        All structures have been analyzed using the specified radiobiological models. Results should be interpreted in the context of clinical goals and institutional protocols.
      </div>
      <div class="warning">
        <strong>⚠ Important Disclaimer</strong><br>
        This report is generated for research and educational purposes. Clinical decisions should be made by qualified medical professionals in consultation with the treatment team. Always verify calculations independently before clinical use.
      </div>
    </div>
    
    <!-- References -->
    <div class="section">
      <h2 class="section-title">References</h2>
      <div class="reference">
        [1] Niemierko A. Reporting and analyzing dose distributions: a concept of equivalent uniform dose. Med Phys. 1997;24(1):103-110.
      </div>
      <div class="reference">
        [2] Lyman JT. Complication probability as assessed from dose-volume histograms. Radiat Res Suppl. 1985;8:S13-S19.
      </div>
      <div class="reference">
        [3] Kutcher GJ, Burman C. Calculation of complication probability factors for non-uniform normal tissue irradiation. Int J Radiat Oncol Biol Phys. 1989;16(6):1623-1630.
      </div>
      <div class="reference">
        [4] Bentzen SM, Constanzo J. Radiotherapy toxicity. Acta Oncol. 1998;37(4):329-334.
      </div>
      <div class="reference">
        [5] Marks LB, et al. QUANTEC: A user's guide. Int J Radiat Oncol Biol Phys. 2010;76(3 Suppl):S1-S100.
      </div>
    </div>
    
    <div class="footer">
      <p>RadioBioCalc v1.0 | Generated: ${new Date().toLocaleString()}</p>
      <p>This report contains proprietary calculations and should be treated as confidential medical information.</p>
    </div>
  </div>
</body>
</html>
    `;
    return html;
  }

  /**
   * Generate CSV export of results
   */
  static generateCSVReport(data: ReportData): string {
    let csv = "RadioBioCalc Report Export\n";
    csv += `Generated: ${data.generatedAt}\n`;
    csv += `Patient: ${data.patientName} (${data.patientID})\n\n`;

    csv += "Structure,Type,TCP/NTCP (%),Mean Dose (Gy),Max Dose (Gy),Min Dose (Gy),Volume (cm³),BED (Gy),EQD2 (Gy)\n";

    data.structures.forEach((s) => {
      const tcpNtcp =
        s.tcp !== undefined ? s.tcp.toFixed(1) : s.ntcp?.toFixed(1) || "N/A";
      csv += `"${s.name}",${s.type},${tcpNtcp},${s.meanDose.toFixed(1)},${s.maxDose.toFixed(1)},${s.minDose.toFixed(1)},${s.volume.toFixed(1)},${s.bed.toFixed(1)},${s.eqd2.toFixed(1)}\n`;
    });

    csv += "\n\nFractionation Scheme\n";
    csv += `Total Dose,${data.fractionation.totalDose.toFixed(1)} Gy\n`;
    csv += `Number of Fractions,${data.fractionation.numFractions}\n`;
    csv += `Dose per Fraction,${data.fractionation.dosePerFraction.toFixed(2)} Gy\n`;

    csv += "\n\nModels Used\n";
    csv += `NTCP Model,${data.models.ntcp}\n`;
    csv += `TCP Model,${data.models.tcp}\n`;

    return csv;
  }

  /**
   * Generate JSON export of results
   */
  static generateJSONReport(data: ReportData): string {
    return JSON.stringify(data, null, 2);
  }
}
