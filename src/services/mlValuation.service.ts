import { spawn } from 'child_process';
import path from 'path';
import prisma from '../config/prisma';

export interface MLValuationResult {
  estimatedValue: number;
  confidenceScore: number;
  modelUsed: string;
  predictionTime: Date;
  featureImportance?: Record<string, number>;
}

class MLValuationService {
  private pythonScriptPath: string;
  private modelPath: string;

  constructor() {
    this.pythonScriptPath = path.join(process.cwd(), 'ml-trainer', 'predict.py');
    this.modelPath = path.join(process.cwd(), 'ml-trainer', 'property_valuation_model.pkl');
  }

  /**
   * Predict property value using ML model
   */
  async predictValue(features: number[]): Promise<number> {
    return new Promise((resolve, reject) => {
      const pythonProcess = spawn('python', [this.pythonScriptPath, ...features.map(f => f.toString())]);
      
      let output = '';
      let error = '';
      
      pythonProcess.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      pythonProcess.stderr.on('data', (data) => {
        error += data.toString();
      });
      
      pythonProcess.on('close', (code) => {
        if (code !== 0) {
          console.error('Python process error:', error);
          reject(new Error(`ML prediction failed: ${error}`));
        } else {
          const prediction = parseFloat(output.trim());
          if (isNaN(prediction)) {
            reject(new Error('Invalid prediction output'));
          } else {
            resolve(prediction);
          }
        }
      });
      
      pythonProcess.on('error', (err) => {
        reject(new Error(`Failed to start Python process: ${err.message}`));
      });
    });
  }

  /**
   * Check if ML model is available
   */
  async isModelAvailable(): Promise<boolean> {
    const fs = require('fs');
    return fs.existsSync(this.modelPath);
  }

  /**
   * Convert features object to array in correct order
   */
  featuresToArray(features: any): number[] {
    const featureOrder = [
      'landSize',
      'buildingSize',
      'yearBuilt',
      'propertyAge',
      'bedrooms',
      'bathrooms',
      'parkingSpaces',
      'hasElectricity',
      'hasWaterSupply',
      'hasWaterTank',
      'floodRisk',
      'propertyType',
      'propertyCategory',
      'landSlope',
      'floorMaterial',
      'roofType',
      'roadAccessType',
      'nearestSchoolKm',
      'nearestHospitalKm',
      'nearestTransportKm',
      'nearestMarketKm',
      'totalRooms',
      'roomDensity',
      'amenitiesScore',
      'districtEncoded'
    ];
    
    return featureOrder.map(key => {
      const value = features[key];
      return value !== undefined && value !== null ? Number(value) : 0;
    });
  }

  /**
   * Calculate confidence score based on feature completeness
   */
  calculateConfidence(features: any): number {
    let confidence = 60; // Base confidence
    
    if (features.landSize && features.landSize > 0) confidence += 5;
    if (features.buildingSize && features.buildingSize > 0) confidence += 5;
    if (features.bedrooms && features.bedrooms > 0) confidence += 3;
    if (features.bathrooms && features.bathrooms > 0) confidence += 3;
    if (features.yearBuilt && features.yearBuilt > 1900) confidence += 4;
    if (features.districtEncoded && features.districtEncoded > 0) confidence += 5;
    if (features.amenitiesScore && features.amenitiesScore > 5) confidence += 5;
    
    // Bonus for premium features (more data = higher confidence)
    if (features.hasSwimmingPool) confidence += 2;
    if (features.hasGym) confidence += 2;
    if (features.hasSmartHome) confidence += 2;
    if (features.viewType && features.viewType > 0) confidence += 2;
    if (features.condition && features.condition > 2) confidence += 3;
    
    return Math.min(confidence, 98);
  }

  /**
   * Get ML valuation for a property
   */
  async getMLValuation(features: any): Promise<MLValuationResult> {
    try {
      const isAvailable = await this.isModelAvailable();
      if (!isAvailable) {
        throw new Error('ML model not available. Please train the model first.');
      }

      // Build features array
      const featureArray = this.featuresToArray(features);
      
      // Get prediction
      const predictedValue = await this.predictValue(featureArray);
      
      // Calculate confidence
      const confidenceScore = this.calculateConfidence(features);
      
      // Calculate price range based on confidence
      const variance = confidenceScore >= 85 ? 0.06 :
                       confidenceScore >= 70 ? 0.10 :
                       confidenceScore >= 55 ? 0.15 : 0.20;
      
      return {
        estimatedValue: Math.round(predictedValue / 100000) * 100000,
        confidenceScore,
        modelUsed: 'RandomForest_v1',
        predictionTime: new Date(),
        priceRange: {
          min: Math.round(predictedValue * (1 - variance) / 100000) * 100000,
          max: Math.round(predictedValue * (1 + variance) / 100000) * 100000
        }
      } as any;
    } catch (error) {
      console.error('ML valuation failed:', error);
      throw error;
    }
  }
}

export const mlValuationService = new MLValuationService();