using Microsoft.EntityFrameworkCore;
using TravelAI.Domain.Interfaces;
using TravelAI.Infrastructure.Persistence;

namespace TravelAI.Infrastructure.Repositories;

public class GenericRepository<T> : IGenericRepository<T> where T : class
{
    protected readonly ApplicationDbContext _context;
    public GenericRepository(ApplicationDbContext context) => _context = context;

    public async Task<T?> GetByIdAsync(int id) => await _context.Set<T>().FindAsync(id);
    public async Task<IEnumerable<T>> GetAllAsync() => await _context.Set<T>().ToListAsync();
    public async Task AddAsync(T entity) => await _context.Set<T>().AddAsync(entity);
    public void Update(T entity) => _context.Set<T>().Update(entity);
    public void Remove(T entity) => _context.Set<T>().Remove(entity);
    public IQueryable<T> Find(System.Linq.Expressions.Expression<Func<T, bool>> exp) => _context.Set<T>().Where(exp);
}