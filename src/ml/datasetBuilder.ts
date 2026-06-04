import prisma from '../config/prisma';
import { buildFeatures, PropertyFeatures } from './featureBuilder';

/**
 * Training sample format
 */
export interface TrainingSample {
  features: PropertyFeatures;
  label: number; // aiValuation (target)
}

/**
 * Dataset output
 */
export interface Dataset {
  samples: TrainingSample[];
  size: number;
}

/**
 * MAIN FUNCTION: Build dataset from database
 */
export async function buildDataset(): Promise<Dataset> {
  const properties = await prisma.property.findMany({
    where: {
      aiValuation: {
        not: null,
      },
    },
    include: {
      fieldData: true,
    },
  });

  const samples: TrainingSample[] = [];

  for (const property of properties) {
    if (!property.fieldData) continue;
    if (!property.aiValuation) continue;

    const features = buildFeatures(property.fieldData);

    samples.push({
      features,
      label: property.aiValuation,
    });
  }

  return {
    samples,
    size: samples.length,
  };
}