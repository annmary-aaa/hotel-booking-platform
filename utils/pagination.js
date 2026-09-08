const getPagination = (query) => {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 10, 1), 100);
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

const buildPaginatedResponse = (data, total, page, limit) => ({
  items: data,
  pagination: {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
  },
});

module.exports = { getPagination, buildPaginatedResponse };
