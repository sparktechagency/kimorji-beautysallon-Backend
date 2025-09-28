import { ISubCategory } from "../app/modules/subCategory/subCategory.interface";

interface PaginationOptions {
  page: number;
  limit: number;
  searchTerm: string;
  categoryId: string;
}

interface PaginatedResult {
  subCategories: ISubCategory[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPage: number;
  };
}

export { PaginationOptions, PaginatedResult };