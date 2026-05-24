import prisma from '../config/prisma';
import { AppError } from '../utils/AppError';
import fs from 'fs';
import path from 'path';

// ======================================================
// GET PROPERTIES FOR REPORT
// ======================================================

export const getPropertiesForReport = async (
  supervisorId: string
) => {
  const properties = await prisma.property.findMany({
    where: {
      status: {
        in: ['APPROVED', 'PUBLISHED']
      }
    },
    select: {
      id: true,
      upiNumber: true,
      ownerName: true,
      district: true,
      province: true,
      aiValuation: true,
      status: true
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  return properties;
};

// ======================================================
// UPLOAD REPORT
// ======================================================

export const uploadReport = async (
  supervisorId: string,
  propertyId: string,
  file: Express.Multer.File,
  title: string
) => {
  const property = await prisma.property.findFirst({
    where: {
      id: propertyId,
      status: {
        in: ['APPROVED', 'PUBLISHED']
      }
    }
  });

  if (!property) {
    throw new AppError(
      'Property not found or not available for report',
      404
    );
  }

  // Create upload directory
  const uploadDir = path.join(
    process.cwd(),
    'uploads',
    'reports'
  );

  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  // Generate filename
  const timestamp = Date.now();

  const uniqueFilename = `${timestamp}_${file.originalname.replace(
    /[^a-zA-Z0-9.-]/g,
    '_'
  )}`;

  const filePath = path.join(uploadDir, uniqueFilename);

  const fileUrl = `/uploads/reports/${uniqueFilename}`;

  // Save file
  fs.writeFileSync(filePath, file.buffer);

  // Save report record
  const report = await prisma.report.create({
    data: {
      propertyId,
      title: title || `Valuation Report - ${property.upiNumber}`,
      fileUrl,
      fileName: file.originalname,
      fileSize: file.size,
      mimeType: file.mimetype,
      generatedBy: supervisorId,
      isPublished: true,
      version: 1
    },
    include: {
      property: {
        select: {
          upiNumber: true,
          ownerName: true,
          district: true
        }
      }
    }
  });

  return report;
};

// ======================================================
// GET REPORTS BY SUPERVISOR
// ======================================================

export const getReportsBySupervisor = async (
  supervisorId: string
) => {
  const reports = await prisma.report.findMany({
    where: {
      generatedBy: supervisorId
    },
    include: {
      property: {
        select: {
          upiNumber: true,
          ownerName: true,
          district: true,
          province: true
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  return reports;
};

// ======================================================
// GET REPORTS BY PROPERTY
// ======================================================

export const getReportsByProperty = async (
  propertyId: string,
  userId: string,
  userRole: string
) => {
  const property = await prisma.property.findFirst({
    where: {
      id: propertyId,
      OR: [
        {
          clientId: userId
        },
        {
          assignment: {
            collectorId: userId
          }
        },
        {
          assignment: {
            collector: {
              addedById: userId
            }
          }
        }
      ]
    }
  });

  if (!property && userRole !== 'ADMIN') {
    throw new AppError(
      'You do not have permission to view reports for this property',
      403
    );
  }

  const reports = await prisma.report.findMany({
    where: {
      propertyId
    },
    include: {
      property: {
        select: {
          upiNumber: true,
          ownerName: true,
          district: true,
          province: true,
          aiValuation: true
        }
      },
      generator: {
        select: {
          name: true,
          email: true,
          role: true
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  return reports;
};

// ======================================================
// GET REPORT BY ID
// ======================================================

export const getReportById = async (
  reportId: string,
  userId: string,
  userRole: string
) => {
  const report = await prisma.report.findUnique({
    where: {
      id: reportId
    },
    include: {
      property: {
        include: {
          assignment: {
            include: {
              collector: true
            }
          },
          client: true
        }
      },
      generator: true
    }
  });

  if (!report) {
    throw new AppError('Report not found', 404);
  }

  let hasAccess = false;

  if (userRole === 'ADMIN') {
    hasAccess = true;
  } else if (report.generatedBy === userId) {
    hasAccess = true;
  } else if (report.property.clientId === userId) {
    hasAccess = true;
  } else if (
    report.property.assignment?.collectorId === userId
  ) {
    hasAccess = true;
  } else if (userRole === 'SUPERVISOR') {
    const dataCollector =
      report.property.assignment?.collector;

    if (dataCollector?.addedById === userId) {
      hasAccess = true;
    }
  }

  if (!hasAccess) {
    throw new AppError(
      'You do not have permission to view this report',
      403
    );
  }

  return report;
};

// ======================================================
// DOWNLOAD REPORT
// ======================================================

export const downloadReport = async (
  reportId: string,
  userId: string,
  userRole: string
) => {
  const report = await getReportById(
    reportId,
    userId,
    userRole
  );

  // Uploaded file
  if (report.fileUrl) {
    const cleanPath = report.fileUrl.replace(/^\/+/, '');

    const filePath = path.join(
      process.cwd(),
      cleanPath
    );

    if (!fs.existsSync(filePath)) {
      throw new AppError('Report file not found', 404);
    }

    return {
      buffer: fs.readFileSync(filePath),
      filename:
        report.fileName || `report-${reportId}.pdf`,
      mimeType:
        report.mimeType || 'application/pdf'
    };
  }

  // AI generated HTML report
  if (report.content) {
    const puppeteer = require('puppeteer');

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    await page.setContent(report.content, {
      waitUntil: 'networkidle0'
    });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true
    });

    await browser.close();

    return {
      buffer: pdfBuffer,
      filename: `report-${reportId}.pdf`,
      mimeType: 'application/pdf'
    };
  }

  throw new AppError('Report content not available', 404);
};

// ======================================================
// GET CLIENT REPORTS
// ======================================================

export const getClientReports = async (
  clientId: string
) => {
  const reports = await prisma.report.findMany({
    where: {
      property: {
        clientId
      }
    },
    include: {
      property: {
        select: {
          upiNumber: true,
          ownerName: true,
          district: true,
          province: true,
          aiValuation: true
        }
      },
      generator: {
        select: {
          name: true,
          email: true
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  return reports;
};

// ======================================================
// GET DATA COLLECTOR REPORTS
// ======================================================

export const getDataCollectorReports = async (
  dataCollectorId: string
) => {
  const reports = await prisma.report.findMany({
    where: {
      property: {
        assignment: {
          collectorId: dataCollectorId
        }
      }
    },
    include: {
      property: {
        select: {
          upiNumber: true,
          ownerName: true,
          district: true,
          province: true,
          aiValuation: true
        }
      },
      generator: {
        select: {
          name: true,
          email: true
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  return reports;
};

// ======================================================
// DELETE REPORT
// ======================================================

export const deleteReport = async (
  reportId: string,
  supervisorId: string
) => {
  const report = await prisma.report.findFirst({
    where: {
      id: reportId,
      generatedBy: supervisorId
    }
  });

  if (!report) {
    throw new AppError('Report not found', 404);
  }

  // Delete uploaded file
  if (report.fileUrl) {
    const cleanPath = report.fileUrl.replace(/^\/+/, '');

    const filePath = path.join(
      process.cwd(),
      cleanPath
    );

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  await prisma.report.delete({
    where: {
      id: reportId
    }
  });

  return {
    success: true
  };
};