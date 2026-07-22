namespace FraudCell.Identity.Service.Features.Staff;

public sealed record StaffResponse(
    string Id,
    string FirstName,
    string LastName,
    string Email,
    string Role,
    IReadOnlyCollection<string> Specialties,
    IReadOnlyCollection<string> Regions,
    bool AssignmentEnabled,
    bool IsActive,
    long Version,
    DateTimeOffset CreatedAt);
