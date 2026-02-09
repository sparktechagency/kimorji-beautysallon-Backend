class QueryBuilder {
    [x: string]: any;
    queryModel: any;
    query: any;

    constructor(queryModel: any, query: Record<string, any>) {
        this.queryModel = queryModel;
        this.query = query;
    }

    search(searchableFields: string[]) {
        const searchTerm = this?.query?.searchTerm;
        if (searchTerm) {
            this.queryModel = this.queryModel.find({
                $or: searchableFields.map((field) => ({
                    [field]: { $regex: searchTerm, $options: 'i' },
                })),
            });
        }
        return this;
    }

    filter() {
        const queryObj = { ...this.query };
        const excludedFields = ['page', 'limit', 'searchTerm', 'sort', 'fields'];
        excludedFields.forEach((el) => delete queryObj[el]);

        this.queryModel = this.queryModel.find(queryObj);
        return this;
    }

    sort() {
        const sort = this?.query?.sort?.split(',')?.join(' ') || '-createdAt';
        this.queryModel = this.queryModel.sort(sort);
        return this;
    }

    paginate() {
        const page = Number(this.query.page) || 1;
        const limit = Number(this.query.limit) || 10;
        const skip = (page - 1) * limit;
        this.queryModel = this.queryModel.skip(skip).limit(limit);
        return this;
    }

    // Ei method-ti miss chilo
    fields() {
        const fields = this?.query?.fields?.split(',')?.join(' ') || '-__v';
        this.queryModel = this.queryModel.select(fields);
        return this;
    }

    async getPaginationInfo() {
        const total = await this.queryModel.model.countDocuments(this.queryModel.getQuery());
        const limit = Number(this.query.limit) || 10;
        const page = Number(this.query.page) || 1;
        const totalPage = Math.ceil(total / limit); // Ekhon eta dynamic

        return {
            total,
            totalPage,
            page,
            limit
        };
    }
}

export default QueryBuilder;