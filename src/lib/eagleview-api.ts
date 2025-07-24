// EagleView API Configuration and Client
import { createClient } from '@supabase/supabase-js';

// EagleView API Configuration
export const EAGLEVIEW_CONFIG = {
  // These will be stored in environment variables
  API_KEY: process.env.VITE_EAGLEVIEW_API_KEY || '',
  CLIENT_ID: process.env.VITE_EAGLEVIEW_CLIENT_ID || '',
  CLIENT_SECRET: process.env.VITE_EAGLEVIEW_CLIENT_SECRET || '',
  
  // API Endpoints
  BASE_URL: 'https://api.eagleview.com/v2',
  AUTH_URL: 'https://auth.eagleview.com/oauth2/token',
  
  // Webhook URL - This will receive status updates
  WEBHOOK_URL: process.env.VITE_EAGLEVIEW_WEBHOOK_URL || 'https://your-app.com/api/eagleview-webhook',
  
  // Default report settings
  DEFAULT_REPORT_TYPE: 'Premium',
  DEFAULT_MEASUREMENT_TYPE: 'Roof',
  DEFAULT_DELIVERY_PRODUCT: 'PDF'
};

// Types for EagleView API
export interface EagleViewAddress {
  streetNumber: string;
  streetName: string;
  city: string;
  state: string;
  zipCode: string;
}

export interface EagleViewOrderRequest {
  address: EagleViewAddress;
  reportType?: string;
  measurementType?: string;
  deliveryProduct?: string;
  rushOrder?: boolean;
  specialInstructions?: string;
}

export interface EagleViewOrderResponse {
  orderId: string;
  status: string;
  estimatedCompletionDate: string;
  price: number;
  reportUrl?: string;
}

// EagleView API Client
export class EagleViewClient {
  private accessToken: string | null = null;
  private tokenExpiry: Date | null = null;

  constructor(
    private apiKey: string = EAGLEVIEW_CONFIG.API_KEY,
    private clientId: string = EAGLEVIEW_CONFIG.CLIENT_ID,
    private clientSecret: string = EAGLEVIEW_CONFIG.CLIENT_SECRET
  ) {}

  // Get OAuth2 Access Token
  private async getAccessToken(): Promise<string> {
    // Check if we have a valid token
    if (this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
      return this.accessToken;
    }

    try {
      const response = await fetch(EAGLEVIEW_CONFIG.AUTH_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${btoa(`${this.clientId}:${this.clientSecret}`)}`
        },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          scope: 'measurement_orders property_data'
        })
      });

      if (!response.ok) {
        throw new Error(`Authentication failed: ${response.statusText}`);
      }

      const data = await response.json();
      this.accessToken = data.access_token;
      // Set token expiry (usually 1 hour)
      this.tokenExpiry = new Date(Date.now() + (data.expires_in * 1000));
      
      return this.accessToken;
    } catch (error) {
      console.error('EagleView authentication error:', error);
      throw error;
    }
  }

  // Create a new measurement order
  async createMeasurementOrder(request: EagleViewOrderRequest): Promise<EagleViewOrderResponse> {
    const token = await this.getAccessToken();

    try {
      const orderPayload = {
        address: {
          streetAddress: `${request.address.streetNumber} ${request.address.streetName}`,
          city: request.address.city,
          state: request.address.state,
          postalCode: request.address.zipCode
        },
        products: [{
          productType: request.measurementType || EAGLEVIEW_CONFIG.DEFAULT_MEASUREMENT_TYPE,
          deliveryProduct: request.deliveryProduct || EAGLEVIEW_CONFIG.DEFAULT_DELIVERY_PRODUCT,
          reportType: request.reportType || EAGLEVIEW_CONFIG.DEFAULT_REPORT_TYPE
        }],
        webhookUrl: EAGLEVIEW_CONFIG.WEBHOOK_URL,
        rush: request.rushOrder || false,
        specialInstructions: request.specialInstructions
      };

      const response = await fetch(`${EAGLEVIEW_CONFIG.BASE_URL}/measurement-orders`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-API-Key': this.apiKey
        },
        body: JSON.stringify(orderPayload)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Order creation failed: ${error.message || response.statusText}`);
      }

      const data = await response.json();
      
      return {
        orderId: data.orderId,
        status: data.status,
        estimatedCompletionDate: data.estimatedCompletionDate,
        price: data.totalPrice,
        reportUrl: data.reportUrl
      };
    } catch (error) {
      console.error('EagleView order creation error:', error);
      throw error;
    }
  }

  // Get order status
  async getOrderStatus(orderId: string): Promise<EagleViewOrderResponse> {
    const token = await this.getAccessToken();

    try {
      const response = await fetch(`${EAGLEVIEW_CONFIG.BASE_URL}/measurement-orders/${orderId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-API-Key': this.apiKey
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to get order status: ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        orderId: data.orderId,
        status: data.status,
        estimatedCompletionDate: data.estimatedCompletionDate,
        price: data.totalPrice,
        reportUrl: data.reportUrl
      };
    } catch (error) {
      console.error('EagleView order status error:', error);
      throw error;
    }
  }

  // Download report PDF
  async downloadReport(reportUrl: string): Promise<Blob> {
    const token = await this.getAccessToken();

    try {
      const response = await fetch(reportUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-API-Key': this.apiKey
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to download report: ${response.statusText}`);
      }

      return await response.blob();
    } catch (error) {
      console.error('EagleView report download error:', error);
      throw error;
    }
  }
}

// Create singleton instance
export const eagleViewClient = new EagleViewClient(); 