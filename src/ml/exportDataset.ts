import fs from 'fs';
import path from 'path';
import { buildDataset } from './datasetBuilder';
import { PropertyFeatures } from './featureBuilder';

/**
 * Flatten features into CSV row
 */
function flatten(features: PropertyFeatures, label: number) {
  return {
    ...features,
    label,
  };
}

/**
 * Convert dataset to CSV format
 */
function toCSV(data: any[]): string {
  const headers = Object.keys(data[0]);

  const rows = data.map(row =>
    headers.map(h => row[h]).join(',')
  );

  return [headers.join(','), ...rows].join('\n');
}

/**
 * MAIN EXPORT FUNCTION
 */
export async function exportDatasetToCSV() {
  const dataset = await buildDataset();

  if (!dataset.samples.length) {
    throw new Error('No training data found. Add properties with aiValuation first.');
  }

  const flatData = dataset.samples.map(sample =>
    flatten(sample.features, sample.label)
  );

  const csv = toCSV(flatData);

  const filePath = path.join(__dirname, '../../ml-data/valuation_dataset.csv');

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, csv);

  console.log(`✅ Dataset exported successfully`);
  console.log(`📊 Samples: ${dataset.size}`);
  console.log(`📁 File: ${filePath}`);

  return {
    path: filePath,
    size: dataset.size,
  };
}