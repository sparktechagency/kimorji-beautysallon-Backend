import { ISubCategory } from "../app/modules/subCategory/subCategory.interface";


export interface PaginationOptions {
  page: number;
  limit: number;
  barberId: string;
  searchTerm?: string;
  categoryId?: string;

}

export interface PaginatedResult<T = any> {
  services: T[];
  subCategories?: any[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPage: number;
  };
}



