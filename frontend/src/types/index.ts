export interface User {
  id: number;
  email: string;
  role: 'admin' | 'developer' | 'user';
  full_name?: string;
  company?: string;
  bio?: string;
  onboarding_completed: boolean;
  deployment_service_paid: boolean;
  deployment_service_amount?: number;
  created_at: string;
}

export type UserRole = 'admin' | 'developer' | 'user';

export enum AppStatus {
    DRAFT = "draft",
    DEPLOYING = "deploying",
    DEPLOYED = "deployed",
    PUBLISHED = "published",
    FAILED = "failed"
}

export enum FrameworkType {
    REACT = "react",
    NODE = "node",
    PYTHON = "python",
    UNKNOWN = "unknown"
}

export enum AppCategory {
    PRODUCTIVITY = "productivity",
    BUSINESS = "business",
    EDUCATION = "education",
    ENTERTAINMENT = "entertainment",
    UTILITIES = "utilities",
    SOCIAL = "social",
    FINANCE = "finance",
    HEALTH = "health",
    OTHER = "other"
}

export interface App {
  id: number;
  name: string;
  description?: string;
  category: AppCategory;
  price: number;
  developer_id: number;
  status: AppStatus;
  framework: FrameworkType;
  source_path?: string;
  production_url?: string;
  step_completed: number;
  created_at: string;
  images?: string[];
  logo_url?: string;
  tags?: string[];
  features?: string[];
  demo_url?: string;
  support_email?: string;
  website_url?: string;
}
