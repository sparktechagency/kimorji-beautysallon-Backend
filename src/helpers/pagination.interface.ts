import { ISubCategory } from "../app/modules/subCategory/subCategory.interface";

// interface PaginationOptions {
//   // page: number;
//   // limit: number;
//   // searchTerm: string;
//   // categoryId: string;
//   page: number;
//   limit: number;
//   barberId: string;
//   searchTerm?: string;
//   categoryId?: string;
// }

// interface PaginatedResult {
//   [x: string]: any;
//   subCategories: ISubCategory[];
//   pagination: {
//     page: number;
//     limit: number;
//     total: number;
//     totalPage: number;
//   };
// }
// helpers/pagination.interface.ts

export interface PaginationOptions {
  page: number;
  limit: number;
  barberId: string;
  searchTerm?: string;
}

export interface PaginatedResult<T = any> {
  services: T[];
  subCategories?: any[]; // optional, if needed
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPage: number;
  };
}

