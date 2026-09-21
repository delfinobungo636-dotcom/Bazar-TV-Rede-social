export interface Plan {
    id: string;
    name: string;
    price: string;
    period: string;
    quality?: string;     // Opcional (tem ? porque nem todos podem ter)
    resolution?: string;
    devices?: string;
    screens?: number;
    features: string[];
    highlight: boolean;
  }
  
  export interface UserSubscription {
    status: 'active' | 'inactive' | 'past_due' | 'canceled';
    planId: string;
    startDate: any; // Pode ser data do Firebase (Timestamp) ou string
    endDate: any;
  }