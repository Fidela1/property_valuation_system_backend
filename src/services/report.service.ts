import prisma from '../config/prisma';
import { AppError } from '../utils/AppError';
import puppeteer from 'puppeteer';

// ============================================
// TYPES
// ============================================

export interface CreateReportInput {
  propertyId: string;
  title: string;
  content?: string;
  generatedBy: string;
}

export interface UpdateReportInput {
  title?: string;
  content?: string;
  isPublished?: boolean;
}

// ============================================
// CREATE REPORT
// ============================================

export const createReport = async (data: CreateReportInput) => {
  // Check if property exists
  const property = await prisma.property.findUnique({
    where: { id: data.propertyId },
    include: {
      client: { select: { name: true, email: true, phone: true } },
      fieldData: true
    }
  });

  if (!property) {
    throw new AppError('Property not found', 404);
  }

  // Generate HTML content if not provided
  let content = data.content;
  if (!content) {
    content = generateFullReportHTML(null, property);
  }

  const report = await prisma.report.create({
    data: {
      propertyId: data.propertyId,
      title: data.title,
      content: content,
      generatedBy: data.generatedBy,
      isPublished: true,
      version: 1
    },
    include: {
      property: {
        select: {
          upiNumber: true,
          ownerName: true,
          district: true,
          aiValuation: true
        }
      },
      generator: {
        select: {
          name: true,
          email: true
        }
      }
    }
  });

  return report;
};

export const getReportsByProperty = async (propertyId: string) => {
  const reports = await prisma.report.findMany({
    where: { propertyId },
    include: {
      generator: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  return reports;
};

export const getReportById = async (reportId: string) => {
  const report = await prisma.report.findUnique({
    where: { id: reportId },
    include: {
      property: {
        select: {
          id: true,
          upiNumber: true,
          ownerName: true,
          district: true,
          aiValuation: true
        }
      },
      generator: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    }
  });

  if (!report) {
    throw new AppError('Report not found', 404);
  }

  return report;
};

export const updateReport = async (
  reportId: string,
  userId: string,
  data: UpdateReportInput
) => {
  const report = await prisma.report.findUnique({
    where: { id: reportId }
  });

  if (!report) {
    throw new AppError('Report not found', 404);
  }

  // Check if user is the generator or admin
  if (report.generatedBy !== userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
    if (user?.role !== 'ADMIN') {
      throw new AppError('You can only edit your own reports', 403);
    }
  }

  const updatedReport = await prisma.report.update({
    where: { id: reportId },
    data: {
      title: data.title,
      content: data.content,
      isPublished: data.isPublished,
      version: { increment: 1 }
    },
    include: {
      generator: {
        select: {
          name: true,
          email: true
        }
      }
    }
  });

  return updatedReport;
};

export const deleteReport = async (reportId: string, userId: string) => {
  const report = await prisma.report.findUnique({
    where: { id: reportId }
  });

  if (!report) {
    throw new AppError('Report not found', 404);
  }

  if (report.generatedBy !== userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
    if (user?.role !== 'ADMIN') {
      throw new AppError('You can only delete your own reports', 403);
    }
  }

  await prisma.report.delete({
    where: { id: reportId }
  });

  return { success: true, message: 'Report deleted successfully' };
};


export const generatePDF = async (reportId: string): Promise<Buffer> => {
  const report = await getReportById(reportId);

  if (!report.content) {
    throw new AppError('Report content not available', 404);
  }

  const property = await prisma.property.findUnique({
    where: { id: report.propertyId },
    include: {
      client: { select: { name: true, email: true, phone: true } },
      fieldData: true
    }
  });

  const fullHTML = generateFullReportHTML(report, property);

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setContent(fullHTML, { waitUntil: 'networkidle0' });

  const pdfBuffer = await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: {
      top: '15mm',
      bottom: '15mm',
      left: '15mm',
      right: '15mm'
    }
  });

  await browser.close();

  return Buffer.from(pdfBuffer);
};

const generateFullReportHTML = (report: any, property: any): string => {
  const fd = property?.fieldData;
  const valuation = property?.aiValuation || 0;
  const date = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
  const confidence = property?.aiConfidence || 85;

  const pricePerSqm = fd?.landSize ? Math.round(valuation / fd.landSize) : 0;

  const getConfidenceLevel = () => {
    if (confidence >= 85) return { text: 'High Confidence', color: '#10b981' };
    if (confidence >= 70) return { text: 'Medium Confidence', color: '#f59e0b' };
    return { text: 'Low Confidence', color: '#ef4444' };
  };
  const confidenceLevel = getConfidenceLevel();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${report?.title || 'Property Valuation Report'}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
      line-height: 1.5;
      color: #1e293b;
      background: #f1f5f9;
    }
    
    .report-container {
      max-width: 1100px;
      margin: 40px auto;
      background: white;
      border-radius: 24px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
      overflow: hidden;
    }
    
    /* Header Section */
    .header {
      background: linear-gradient(135deg, #1e3a5f 0%, #0f2b45 100%);
      color: white;
      padding: 40px;
      position: relative;
    }
    
    .header h1 {
      font-size: 32px;
      font-weight: 700;
      margin-bottom: 8px;
      letter-spacing: -0.5px;
    }
    
    .header .subtitle {
      font-size: 14px;
      opacity: 0.8;
      margin-bottom: 20px;
    }
    
    .report-meta {
      display: flex;
      justify-content: space-between;
      margin-top: 20px;
      padding-top: 20px;
      border-top: 1px solid rgba(255,255,255,0.2);
      font-size: 12px;
    }
    
    /* Content */
    .content {
      padding: 40px;
    }
    
    /* Sections */
    .section {
      margin-bottom: 32px;
      break-inside: avoid;
    }
    
    .section-title {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 20px;
      font-weight: 600;
      color: #1e3a5f;
      margin-bottom: 20px;
      padding-bottom: 8px;
      border-bottom: 3px solid #e2e8f0;
    }
    
    .section-icon {
      font-size: 24px;
    }
    
    /* Info Grid */
    .info-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
      background: #f8fafc;
      border-radius: 16px;
      padding: 20px;
    }
    
    .info-item {
      display: flex;
      align-items: baseline;
      gap: 10px;
    }
    
    .info-label {
      font-size: 13px;
      font-weight: 500;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      min-width: 120px;
    }
    
    .info-value {
      font-size: 15px;
      font-weight: 600;
      color: #0f172a;
    }
    
    /* Valuation Card */
    .valuation-card {
      background: linear-gradient(135deg, #0f2b45 0%, #1e3a5f 100%);
      border-radius: 20px;
      padding: 30px;
      color: white;
      text-align: center;
      margin: 20px 0;
      box-shadow: 0 10px 40px -10px rgba(0, 0, 0, 0.2);
    }
    
    .valuation-label {
      font-size: 13px;
      text-transform: uppercase;
      letter-spacing: 2px;
      opacity: 0.8;
    }
    
    .valuation-amount {
      font-size: 48px;
      font-weight: 800;
      margin: 15px 0;
      letter-spacing: -1px;
    }
    
    .valuation-currency {
      font-size: 20px;
      font-weight: 500;
    }
    
    .confidence-container {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 15px;
      margin-top: 15px;
    }
    
    .confidence-badge {
      background: ${confidenceLevel.color};
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
    }
    
    .confidence-bar {
      width: 200px;
      height: 6px;
      background: rgba(255,255,255,0.2);
      border-radius: 3px;
      overflow: hidden;
    }
    
    .confidence-fill {
      width: ${confidence}%;
      height: 100%;
      background: white;
      border-radius: 3px;
    }
    
    /* Price Range Row */
    .price-range-row {
      display: flex;
      justify-content: space-between;
      margin-top: 20px;
      padding-top: 20px;
      border-top: 1px solid rgba(255,255,255,0.2);
    }
    
    .price-range-item {
      text-align: center;
      flex: 1;
    }
    
    .price-range-label {
      font-size: 11px;
      text-transform: uppercase;
      opacity: 0.7;
      margin-bottom: 5px;
    }
    
    .price-range-value {
      font-size: 14px;
      font-weight: 600;
    }
    
    /* Features Grid */
    .features-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 15px;
    }
    
    .feature-card {
      background: #f8fafc;
      border-radius: 12px;
      padding: 15px;
      text-align: center;
    }
    
    .feature-icon {
      font-size: 24px;
      margin-bottom: 8px;
    }
    
    .feature-label {
      font-size: 12px;
      color: #64748b;
      margin-bottom: 4px;
    }
    
    .feature-value {
      font-size: 18px;
      font-weight: 700;
      color: #1e3a5f;
    }
    
    /* Amenities List */
    .amenities-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
    }
    
    .amenity-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px;
      background: #f8fafc;
      border-radius: 10px;
    }
    
    .amenity-check {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
    }
    
    .amenity-check.yes {
      background: #10b98120;
      color: #10b981;
    }
    
    .amenity-check.no {
      background: #ef444420;
      color: #ef4444;
    }
    
    .amenity-text {
      font-size: 14px;
      font-weight: 500;
    }
    
    .amenity-detail {
      font-size: 12px;
      color: #64748b;
      margin-left: auto;
    }
    
    /* Neighborhood Scores */
    .scores-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 15px;
      margin-bottom: 20px;
    }
    
    .score-card {
      background: #f8fafc;
      border-radius: 12px;
      padding: 15px;
      text-align: center;
    }
    
    .score-value {
      font-size: 24px;
      font-weight: 700;
      color: #1e3a5f;
    }
    
    .score-label {
      font-size: 12px;
      color: #64748b;
      margin-top: 5px;
    }
    
    /* Footer */
    .footer {
      background: #f8fafc;
      padding: 30px 40px;
      text-align: center;
      border-top: 1px solid #e2e8f0;
    }
    
    .signature-section {
      display: flex;
      justify-content: space-between;
      margin-top: 30px;
      padding-top: 30px;
      border-top: 1px solid #e2e8f0;
    }
    
    .signature-line {
      width: 250px;
      text-align: center;
    }
    
    .signature {
      border-top: 1px solid #cbd5e1;
      padding-top: 8px;
      margin-top: 30px;
      font-size: 12px;
      color: #64748b;
    }
    
    .disclaimer {
      background: #fef2f2;
      border-left: 4px solid #ef4444;
      padding: 15px 20px;
      border-radius: 10px;
      margin: 20px 0;
      font-size: 12px;
      color: #991b1b;
    }
    
    @media print {
      body {
        background: white;
        padding: 0;
        margin: 0;
      }
      .report-container {
        box-shadow: none;
        margin: 0;
        border-radius: 0;
      }
      .valuation-card, .feature-card, .score-card {
        break-inside: avoid;
      }
      .section {
        break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="report-container">
    <!-- Header -->
    <div class="header">
      <h1>PROPERTY VALUATION REPORT</h1>
      <div class="subtitle">AI-Powered Real Estate Valuation</div>
      <div class="report-meta">
        <span>Report ID: ${report?.id?.substring(0, 12).toUpperCase() || 'N/A'}</span>
        <span>Generated: ${date}</span>
        <span>Version: ${report?.version || 1}</span>
      </div>
    </div>

    <div class="content">
      <!-- Property Information Section -->
      <div class="section">
        <div class="section-title">
          <span class="section-icon">🏠</span>
          <span>Property Information</span>
        </div>
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">UPI Number</div>
            <div class="info-value">${property?.upiNumber || 'N/A'}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Owner Name</div>
            <div class="info-value">${property?.ownerName || 'N/A'}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Phone Number</div>
            <div class="info-value">${property?.phoneNumber || 'N/A'}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Location</div>
            <div class="info-value">${property?.district || 'N/A'}, ${property?.province || 'Rwanda'}</div>
          </div>
        </div>
      </div>

      <!-- AI Valuation Section -->
      <div class="valuation-card">
        <div class="valuation-label">AI VALUATION</div>
        <div class="valuation-amount">
          <span class="valuation-currency">RWF</span> ${valuation.toLocaleString()}
        </div>
        <div class="confidence-container">
          <span class="confidence-badge">${confidenceLevel.text}</span>
          <div class="confidence-bar">
            <div class="confidence-fill"></div>
          </div>
          <span>${confidence}%</span>
        </div>
        <div class="price-range-row">
          <div class="price-range-item">
            <div class="price-range-label">Conservative Estimate</div>
            <div class="price-range-value">${Math.round(valuation * 0.85).toLocaleString()} RWF</div>
          </div>
          <div class="price-range-item">
            <div class="price-range-label">Market Value</div>
            <div class="price-range-value">${valuation.toLocaleString()} RWF</div>
          </div>
          <div class="price-range-item">
            <div class="price-range-label">Premium Estimate</div>
            <div class="price-range-value">${Math.round(valuation * 1.15).toLocaleString()} RWF</div>
          </div>
        </div>
      </div>

      ${fd ? `
      <!-- Key Features Section -->
      <div class="section">
        <div class="section-title">
          <span class="section-icon">📐</span>
          <span>Key Features</span>
        </div>
        <div class="features-grid">
          <div class="feature-card">
            <div class="feature-icon">📏</div>
            <div class="feature-label">Land Size</div>
            <div class="feature-value">${fd.landSize || 0} m²</div>
          </div>
          <div class="feature-card">
            <div class="feature-icon">🏗️</div>
            <div class="feature-label">Building Size</div>
            <div class="feature-value">${fd.buildingSize || 0} m²</div>
          </div>
          <div class="feature-card">
            <div class="feature-icon">💰</div>
            <div class="feature-label">Price per m²</div>
            <div class="feature-value">${pricePerSqm.toLocaleString()} RWF</div>
          </div>
          <div class="feature-card">
            <div class="feature-icon">🛏️</div>
            <div class="feature-label">Bedrooms</div>
            <div class="feature-value">${fd.bedrooms || 0}</div>
          </div>
          <div class="feature-card">
            <div class="feature-icon">🚽</div>
            <div class="feature-label">Bathrooms</div>
            <div class="feature-value">${fd.bathrooms || 0}</div>
          </div>
          <div class="feature-card">
            <div class="feature-icon">📅</div>
            <div class="feature-label">Year Built</div>
            <div class="feature-value">${fd.yearBuilt || 'N/A'}</div>
          </div>
        </div>
      </div>

      <!-- Amenities Section -->
      <div class="section">
        <div class="section-title">
          <span class="section-icon">✨</span>
          <span>Amenities & Utilities</span>
        </div>
        <div class="amenities-grid">
          <div class="amenity-item">
            <div class="amenity-check ${fd.hasGarden ? 'yes' : 'no'}">
              ${fd.hasGarden ? '✓' : '✗'}
            </div>
            <div class="amenity-text">Garden</div>
            ${fd.hasGarden ? `<div class="amenity-detail">${fd.gardenSize} m²</div>` : ''}
          </div>
          <div class="amenity-item">
            <div class="amenity-check ${fd.hasGate ? 'yes' : 'no'}">
              ${fd.hasGate ? '✓' : '✗'}
            </div>
            <div class="amenity-text">Gate</div>
            ${fd.hasGate ? `<div class="amenity-detail">${fd.gateType}</div>` : ''}
          </div>
          <div class="amenity-item">
            <div class="amenity-check ${fd.hasFence ? 'yes' : 'no'}">
              ${fd.hasFence ? '✓' : '✗'}
            </div>
            <div class="amenity-text">Fence/Wall</div>
            ${fd.hasFence ? `<div class="amenity-detail">${fd.fenceHeight}m</div>` : ''}
          </div>
          <div class="amenity-item">
            <div class="amenity-check ${fd.hasElectricity ? 'yes' : 'no'}">
              ${fd.hasElectricity ? '✓' : '✗'}
            </div>
            <div class="amenity-text">Electricity</div>
          </div>
          <div class="amenity-item">
            <div class="amenity-check ${fd.hasWaterSupply ? 'yes' : 'no'}">
              ${fd.hasWaterSupply ? '✓' : '✗'}
            </div>
            <div class="amenity-text">Water Supply</div>
          </div>
          <div class="amenity-item">
            <div class="amenity-check ${fd.hasWaterTank ? 'yes' : 'no'}">
              ${fd.hasWaterTank ? '✓' : '✗'}
            </div>
            <div class="amenity-text">Water Tank</div>
          </div>
          <div class="amenity-item">
            <div class="amenity-check ${(fd.parkingSpaces || 0) > 0 ? 'yes' : 'no'}">
              ${(fd.parkingSpaces || 0) > 0 ? '✓' : '✗'}
            </div>
            <div class="amenity-text">Parking</div>
            ${(fd.parkingSpaces || 0) > 0 ? `<div class="amenity-detail">${fd.parkingSpaces} spaces</div>` : ''}
          </div>
        </div>
      </div>

      <!-- Neighborhood Section -->
      <div class="section">
        <div class="section-title">
          <span class="section-icon">🏘️</span>
          <span>Neighborhood Scorecard</span>
        </div>
        <div class="scores-grid">
          <div class="score-card">
            <div class="score-value">${fd.nearestSchoolKm ? (fd.nearestSchoolKm <= 1 ? 'Excellent' : fd.nearestSchoolKm <= 2 ? 'Good' : 'Fair') : 'N/A'}</div>
            <div class="score-label">School Access</div>
            <small>${fd.nearestSchoolKm ? `${fd.nearestSchoolKm} km` : 'Not available'}</small>
          </div>
          <div class="score-card">
            <div class="score-value">${fd.nearestHospitalKm ? (fd.nearestHospitalKm <= 2 ? 'Excellent' : fd.nearestHospitalKm <= 4 ? 'Good' : 'Fair') : 'N/A'}</div>
            <div class="score-label">Healthcare Access</div>
            <small>${fd.nearestHospitalKm ? `${fd.nearestHospitalKm} km` : 'Not available'}</small>
          </div>
          <div class="score-card">
            <div class="score-value">${fd.nearestTransportKm ? (fd.nearestTransportKm <= 0.5 ? 'Excellent' : fd.nearestTransportKm <= 1 ? 'Good' : 'Fair') : 'N/A'}</div>
            <div class="score-label">Transport Access</div>
            <small>${fd.nearestTransportKm ? `${fd.nearestTransportKm} km` : 'Not available'}</small>
          </div>
          <div class="score-card">
            <div class="score-value">${fd.roadAccessType === 'PAVED' ? 'Excellent' : fd.roadAccessType === 'UNPAVED' ? 'Fair' : 'Poor'}</div>
            <div class="score-label">Road Quality</div>
            <small>${fd.roadAccessType || 'N/A'}</small>
          </div>
        </div>
        <div class="info-grid" style="margin-top: 15px;">
          <div class="info-item">
            <div class="info-label">Nearest Market</div>
            <div class="info-value">${fd.nearestMarketKm ? `${fd.nearestMarketKm} km` : 'N/A'}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Land Slope</div>
            <div class="info-value">${fd.landSlope || 'Flat'}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Flood Risk</div>
            <div class="info-value">${fd.floodRisk ? 'Yes' : 'No'}</div>
          </div>
        </div>
      </div>
      ` : ''}

      <!-- Disclaimer -->
      <div class="disclaimer">
        <strong>⚠️ Disclaimer</strong><br>
        This valuation report is generated by an AI system based on provided property data and market analysis.
        The estimated value is for informational purposes only and does not constitute a formal appraisal.
        For legal and financial decisions, please consult a certified real estate professional.
      </div>

      <!-- Signature Section -->
      <div class="signature-section">
        <div class="signature-line">
          <div class="signature">Digitally Generated</div>
          <small>AI Valuation System</small>
        </div>
        <div class="signature-line">
          <div class="signature">Property Valuation System</div>
          <small>Authorized Platform</small>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      <p>Property Valuation System © ${new Date().getFullYear()} | AI-Powered Real Estate Intelligence</p>
      <p style="font-size: 11px; margin-top: 8px;">This report is electronically generated and valid without signature.</p>
    </div>
  </div>
</body>
</html>`;
};