using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FraudCell.Gamification.Service.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.EnsureSchema(
                name: "game");

            migrationBuilder.CreateTable(
                name: "analyst_daily_stats",
                schema: "game",
                columns: table => new
                {
                    analyst_id = table.Column<string>(type: "character varying(26)", maxLength: 26, nullable: false),
                    stat_date = table.Column<DateOnly>(type: "date", nullable: false),
                    points = table.Column<long>(type: "bigint", nullable: false),
                    decision_count = table.Column<int>(type: "integer", nullable: false),
                    fast_decision_count = table.Column<int>(type: "integer", nullable: false),
                    confirmed_fraud_count = table.Column<int>(type: "integer", nullable: false),
                    sla_breach_count = table.Column<int>(type: "integer", nullable: false),
                    false_positive_count = table.Column<int>(type: "integer", nullable: false),
                    average_decision_seconds = table.Column<double>(type: "double precision", nullable: true),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_analyst_daily_stats", x => new { x.analyst_id, x.stat_date });
                });

            migrationBuilder.CreateTable(
                name: "analyst_fraud_type_stats",
                schema: "game",
                columns: table => new
                {
                    analyst_id = table.Column<string>(type: "character varying(26)", maxLength: 26, nullable: false),
                    fraud_type = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    decision_count = table.Column<int>(type: "integer", nullable: false),
                    confirmed_fraud_count = table.Column<int>(type: "integer", nullable: false),
                    correct_decision_count = table.Column<int>(type: "integer", nullable: false),
                    false_positive_count = table.Column<int>(type: "integer", nullable: false),
                    accuracy_rate = table.Column<decimal>(type: "numeric(6,5)", nullable: false),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_analyst_fraud_type_stats", x => new { x.analyst_id, x.fraud_type });
                });

            migrationBuilder.CreateTable(
                name: "analyst_performance_summaries",
                schema: "game",
                columns: table => new
                {
                    analyst_id = table.Column<string>(type: "character varying(26)", maxLength: 26, nullable: false),
                    total_decisions = table.Column<int>(type: "integer", nullable: false),
                    correct_decisions = table.Column<int>(type: "integer", nullable: false),
                    false_positive_count = table.Column<int>(type: "integer", nullable: false),
                    sla_compliant_count = table.Column<int>(type: "integer", nullable: false),
                    sla_breach_count = table.Column<int>(type: "integer", nullable: false),
                    total_decision_seconds = table.Column<long>(type: "bigint", nullable: false),
                    average_decision_seconds = table.Column<double>(type: "double precision", nullable: true),
                    accuracy_rate = table.Column<decimal>(type: "numeric(6,5)", nullable: false),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_analyst_performance_summaries", x => x.analyst_id);
                    table.CheckConstraint("ck_perf_summary_range", "total_decisions >= 0 AND correct_decisions >= 0 AND accuracy_rate >= 0 AND accuracy_rate <= 1");
                });

            migrationBuilder.CreateTable(
                name: "analyst_profiles_projection",
                schema: "game",
                columns: table => new
                {
                    analyst_id = table.Column<string>(type: "character varying(26)", maxLength: 26, nullable: false),
                    display_name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    last_source_event_id = table.Column<string>(type: "character varying(26)", maxLength: 26, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_analyst_profiles_projection", x => x.analyst_id);
                });

            migrationBuilder.CreateTable(
                name: "analyst_score_summaries",
                schema: "game",
                columns: table => new
                {
                    analyst_id = table.Column<string>(type: "character varying(26)", maxLength: 26, nullable: false),
                    total_points = table.Column<long>(type: "bigint", nullable: false),
                    level = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    total_decisions = table.Column<int>(type: "integer", nullable: false),
                    total_badges = table.Column<int>(type: "integer", nullable: false),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_analyst_score_summaries", x => x.analyst_id);
                    table.CheckConstraint("ck_score_summary_nonneg", "total_decisions >= 0 AND total_badges >= 0");
                });

            migrationBuilder.CreateTable(
                name: "analyst_weekly_stats",
                schema: "game",
                columns: table => new
                {
                    analyst_id = table.Column<string>(type: "character varying(26)", maxLength: 26, nullable: false),
                    week_start_date = table.Column<DateOnly>(type: "date", nullable: false),
                    points = table.Column<long>(type: "bigint", nullable: false),
                    decision_count = table.Column<int>(type: "integer", nullable: false),
                    fast_decision_count = table.Column<int>(type: "integer", nullable: false),
                    confirmed_fraud_count = table.Column<int>(type: "integer", nullable: false),
                    sla_breach_count = table.Column<int>(type: "integer", nullable: false),
                    false_positive_count = table.Column<int>(type: "integer", nullable: false),
                    average_decision_seconds = table.Column<double>(type: "double precision", nullable: true),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_analyst_weekly_stats", x => new { x.analyst_id, x.week_start_date });
                });

            migrationBuilder.CreateTable(
                name: "badge_definitions",
                schema: "game",
                columns: table => new
                {
                    id = table.Column<string>(type: "character varying(26)", maxLength: 26, nullable: false),
                    code = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    display_name = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    description = table.Column<string>(type: "text", nullable: false),
                    criteria_version = table.Column<int>(type: "integer", nullable: false),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_badge_definitions", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "inbox_messages",
                schema: "game",
                columns: table => new
                {
                    event_id = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    consumer_name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    event_type = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    event_version = table.Column<int>(type: "integer", nullable: false),
                    payload_hash = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: true),
                    status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    attempt_count = table.Column<int>(type: "integer", nullable: false),
                    last_error = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    processed_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    correlation_id = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_inbox_messages", x => new { x.event_id, x.consumer_name });
                });

            migrationBuilder.CreateTable(
                name: "outbox_messages",
                schema: "game",
                columns: table => new
                {
                    id = table.Column<string>(type: "character varying(26)", maxLength: 26, nullable: false),
                    event_type = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    event_version = table.Column<int>(type: "integer", nullable: false),
                    routing_key = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    subject_id = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    correlation_id = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    causation_id = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                    producer = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    occurred_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    payload = table.Column<string>(type: "jsonb", nullable: false),
                    published_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    attempt_count = table.Column<int>(type: "integer", nullable: false),
                    next_attempt_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    locked_until = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    lock_owner = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    headers = table.Column<string>(type: "jsonb", nullable: true),
                    last_error = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_outbox_messages", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "point_ledger",
                schema: "game",
                columns: table => new
                {
                    id = table.Column<string>(type: "character varying(26)", maxLength: 26, nullable: false),
                    analyst_id = table.Column<string>(type: "character varying(26)", maxLength: 26, nullable: false),
                    source_event_id = table.Column<string>(type: "character varying(26)", maxLength: 26, nullable: false),
                    case_id = table.Column<string>(type: "character varying(26)", maxLength: 26, nullable: true),
                    transaction_id = table.Column<string>(type: "character varying(26)", maxLength: 26, nullable: true),
                    rule_code = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    points = table.Column<int>(type: "integer", nullable: false),
                    description = table.Column<string>(type: "text", nullable: false),
                    occurred_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_point_ledger", x => x.id);
                    table.CheckConstraint("ck_point_ledger_nonzero", "points <> 0");
                });

            migrationBuilder.CreateTable(
                name: "rule_evaluations",
                schema: "game",
                columns: table => new
                {
                    id = table.Column<string>(type: "character varying(26)", maxLength: 26, nullable: false),
                    source_event_id = table.Column<string>(type: "character varying(26)", maxLength: 26, nullable: false),
                    analyst_id = table.Column<string>(type: "character varying(26)", maxLength: 26, nullable: true),
                    case_id = table.Column<string>(type: "character varying(26)", maxLength: 26, nullable: true),
                    rule_code = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    result = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    reason = table.Column<string>(type: "text", nullable: true),
                    evaluated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_rule_evaluations", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "earned_badges",
                schema: "game",
                columns: table => new
                {
                    id = table.Column<string>(type: "character varying(26)", maxLength: 26, nullable: false),
                    analyst_id = table.Column<string>(type: "character varying(26)", maxLength: 26, nullable: false),
                    badge_id = table.Column<string>(type: "character varying(26)", maxLength: 26, nullable: false),
                    source_event_id = table.Column<string>(type: "character varying(26)", maxLength: 26, nullable: false),
                    earned_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    criteria_version = table.Column<int>(type: "integer", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_earned_badges", x => x.id);
                    table.ForeignKey(
                        name: "fk_earned_badges_badge_definitions_badge_id",
                        column: x => x.badge_id,
                        principalSchema: "game",
                        principalTable: "badge_definitions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "ix_daily_stats_date_points",
                schema: "game",
                table: "analyst_daily_stats",
                columns: new[] { "stat_date", "points", "analyst_id" });

            migrationBuilder.CreateIndex(
                name: "ix_weekly_stats_week_points",
                schema: "game",
                table: "analyst_weekly_stats",
                columns: new[] { "week_start_date", "points", "analyst_id" });

            migrationBuilder.CreateIndex(
                name: "ux_badge_definitions_code",
                schema: "game",
                table: "badge_definitions",
                column: "code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_earned_badges_analyst_time",
                schema: "game",
                table: "earned_badges",
                columns: new[] { "analyst_id", "earned_at" });

            migrationBuilder.CreateIndex(
                name: "ix_earned_badges_badge_id",
                schema: "game",
                table: "earned_badges",
                column: "badge_id");

            migrationBuilder.CreateIndex(
                name: "ux_earned_badges_analyst_badge",
                schema: "game",
                table: "earned_badges",
                columns: new[] { "analyst_id", "badge_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_inbox_processed_at",
                schema: "game",
                table: "inbox_messages",
                column: "processed_at");

            migrationBuilder.CreateIndex(
                name: "ix_outbox_pending",
                schema: "game",
                table: "outbox_messages",
                columns: new[] { "next_attempt_at", "occurred_at" },
                filter: "published_at IS NULL");

            migrationBuilder.CreateIndex(
                name: "ix_point_ledger_analyst_time",
                schema: "game",
                table: "point_ledger",
                columns: new[] { "analyst_id", "occurred_at" });

            migrationBuilder.CreateIndex(
                name: "ix_point_ledger_case",
                schema: "game",
                table: "point_ledger",
                column: "case_id",
                filter: "case_id IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "ix_point_ledger_daily",
                schema: "game",
                table: "point_ledger",
                columns: new[] { "occurred_at", "analyst_id" });

            migrationBuilder.CreateIndex(
                name: "ux_point_ledger_event_rule",
                schema: "game",
                table: "point_ledger",
                columns: new[] { "source_event_id", "rule_code" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ux_rule_evaluations_event_rule",
                schema: "game",
                table: "rule_evaluations",
                columns: new[] { "source_event_id", "rule_code" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "analyst_daily_stats",
                schema: "game");

            migrationBuilder.DropTable(
                name: "analyst_fraud_type_stats",
                schema: "game");

            migrationBuilder.DropTable(
                name: "analyst_performance_summaries",
                schema: "game");

            migrationBuilder.DropTable(
                name: "analyst_profiles_projection",
                schema: "game");

            migrationBuilder.DropTable(
                name: "analyst_score_summaries",
                schema: "game");

            migrationBuilder.DropTable(
                name: "analyst_weekly_stats",
                schema: "game");

            migrationBuilder.DropTable(
                name: "earned_badges",
                schema: "game");

            migrationBuilder.DropTable(
                name: "inbox_messages",
                schema: "game");

            migrationBuilder.DropTable(
                name: "outbox_messages",
                schema: "game");

            migrationBuilder.DropTable(
                name: "point_ledger",
                schema: "game");

            migrationBuilder.DropTable(
                name: "rule_evaluations",
                schema: "game");

            migrationBuilder.DropTable(
                name: "badge_definitions",
                schema: "game");
        }
    }
}
