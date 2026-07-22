using System.Globalization;
using System.Text;
using Microsoft.EntityFrameworkCore;

namespace FraudCell.BuildingBlocks.Persistence;

/// <summary>
/// Tum tablo, kolon, index ve constraint adlarini snake_case'e cevirir.
///
/// PostgreSQL'de tirnaksiz tanimlayicilar kucuk harfe indirgenir; PascalCase
/// kolonlar her sorguda tirnak gerektirir ve elle yazilan SQL'de (FOR UPDATE
/// SKIP LOCKED gibi) hataya davetiye cikarir. Harici pakete bagimli olmamak
/// icin donusum burada yapilir.
/// </summary>
public static class SnakeCaseNaming
{
    public static ModelBuilder ApplySnakeCaseNaming(this ModelBuilder modelBuilder)
    {
        foreach (var entity in modelBuilder.Model.GetEntityTypes())
        {
            var tableName = entity.GetTableName();
            if (tableName is not null)
            {
                entity.SetTableName(ToSnakeCase(tableName));
            }

            foreach (var property in entity.GetProperties())
            {
                property.SetColumnName(ToSnakeCase(property.GetColumnName()));
            }

            foreach (var key in entity.GetKeys())
            {
                key.SetName(ToSnakeCase(key.GetName() ?? string.Empty));
            }

            foreach (var foreignKey in entity.GetForeignKeys())
            {
                foreignKey.SetConstraintName(ToSnakeCase(foreignKey.GetConstraintName() ?? string.Empty));
            }

            foreach (var index in entity.GetIndexes())
            {
                index.SetDatabaseName(ToSnakeCase(index.GetDatabaseName() ?? string.Empty));
            }
        }

        return modelBuilder;
    }

    /// <summary>
    /// "AssignedAnalystId" -> "assigned_analyst_id", "SLADeadline" -> "sla_deadline".
    /// Ardisik buyuk harfler tek kisaltma sayilir.
    /// </summary>
    public static string ToSnakeCase(string name)
    {
        if (string.IsNullOrEmpty(name))
        {
            return name;
        }

        var builder = new StringBuilder(name.Length + 8);

        for (var i = 0; i < name.Length; i++)
        {
            var current = name[i];

            if (current == '_')
            {
                builder.Append('_');
                continue;
            }

            if (char.IsUpper(current) && i > 0)
            {
                var previous = name[i - 1];
                var nextIsLower = i + 1 < name.Length && char.IsLower(name[i + 1]);

                // "IdX" -> alt cizgi; "IDX" icinde yalnizca son harften once ayir.
                if (previous != '_' && (char.IsLower(previous) || char.IsDigit(previous) || nextIsLower))
                {
                    builder.Append('_');
                }
            }

            builder.Append(char.ToLower(current, CultureInfo.InvariantCulture));
        }

        return builder.ToString();
    }
}
