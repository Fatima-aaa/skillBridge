/**
 * Pagination Utility
 * Provides consistent pagination across all endpoints
 */

const { config } = require('../config/env');

/**
 * Parse and validate pagination parameters
 * @param {Object} query - Request query object
 * @returns {Object} Parsed pagination params
 */
const parsePaginationParams = (query) => {
  const defaultLimit = config.pagination?.defaultLimit || 20;
  const maxLimit = config.pagination?.maxLimit || 100;

  let page = parseInt(query.page, 10) || 1;
  let limit = parseInt(query.limit, 10) || defaultLimit;

  // Ensure positive values
  page = Math.max(1, page);
  limit = Math.min(Math.max(1, limit), maxLimit);

  const skip = (page - 1) * limit;

  // Parse sort parameters
  const sortBy = query.sortBy || 'createdAt';
  const sortOrder = query.sortOrder === 'asc' ? 1 : -1;
  const sort = { [sortBy]: sortOrder };

  return { page, limit, skip, sort, sortBy, sortOrder };
};

/**
 * Build pagination metadata for response
 * @param {number} total - Total count of documents
 * @param {number} page - Current page
 * @param {number} limit - Items per page
 * @returns {Object} Pagination metadata
 */
const buildPaginationMeta = (total, page, limit) => {
  const totalPages = Math.ceil(total / limit);
  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
};

/**
 * Execute paginated query
 * @param {Model} Model - Mongoose model
 * @param {Object} query - Query conditions
 * @param {Object} options - Query options
 * @returns {Object} { data, pagination }
 */
const paginatedQuery = async (Model, query, options = {}) => {
  const {
    page = 1,
    limit = 20,
    sort = { createdAt: -1 },
    select = '',
    populate = null,
  } = options;

  const skip = (page - 1) * limit;

  let queryBuilder = Model.find(query)
    .sort(sort)
    .skip(skip)
    .limit(limit);

  if (select) {
    queryBuilder = queryBuilder.select(select);
  }

  if (populate) {
    if (Array.isArray(populate)) {
      populate.forEach((p) => {
        queryBuilder = queryBuilder.populate(p);
      });
    } else {
      queryBuilder = queryBuilder.populate(populate);
    }
  }

  const [data, total] = await Promise.all([
    queryBuilder.exec(),
    Model.countDocuments(query),
  ]);

  return {
    data,
    pagination: buildPaginationMeta(total, page, limit),
  };
};

module.exports = {
  parsePaginationParams,
  buildPaginationMeta,
  paginatedQuery,
};
