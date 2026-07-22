using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace FraudCell.Transaction.Service.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.EnsureSchema(
                name: "txn");

            migrationBuilder.CreateTable(
                name: "analyst_eligibility_projection",
                schema: "txn",
                columns: table => new
                {
                    analyst_id = table.Column<string>(type: "character varying(26)", maxLength: 26, nullable: false),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    assignment_enabled = table.Column<bool>(type: "boolean", nullable: false),
                    specialties = table.Column<string>(type: "jsonb", nullable: false),
                    regions = table.Column<string>(type: "jsonb", nullable: false),
                    display_name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    last_source_event_id = table.Column<string>(type: "character varying(26)", maxLength: 26, nullable: false),
                    source_updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    projection_updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_analyst_eligibility_projection", x => x.analyst_id);
                });

            migrationBuilder.CreateTable(
                name: "analyst_workloads",
                schema: "txn",
                columns: table => new
                {
                    analyst_id = table.Column<string>(type: "character varying(26)", maxLength: 26, nullable: false),
                    active_case_count = table.Column<int>(type: "integer", nullable: false),
                    last_assigned_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_analyst_workloads", x => x.analyst_id);
                    table.CheckConstraint("ck_analyst_workloads_range", "active_case_count >= 0 AND active_case_count <= 10");
                });

            migrationBuilder.CreateTable(
                name: "idempotency_records",
                schema: "txn",
                columns: table => new
                {
                    id = table.Column<string>(type: "character varying(26)", maxLength: 26, nullable: false),
                    scope = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    actor_id = table.Column<string>(type: "character varying(26)", maxLength: 26, nullable: false),
                    idempotency_key = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    request_hash = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    response_status_code = table.Column<int>(type: "integer", nullable: true),
                    response_body = table.Column<string>(type: "jsonb", nullable: true),
                    resource_id = table.Column<string>(type: "character varying(26)", maxLength: 26, nullable: true),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    expires_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_idempotency_records", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "inbox_messages",
                schema: "txn",
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
                schema: "txn",
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
                name: "transaction_number_counters",
                schema: "txn",
                columns: table => new
                {
                    year = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    last_value = table.Column<long>(type: "bigint", nullable: false),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_transaction_number_counters", x => x.year);
                    table.CheckConstraint("ck_txn_counter_value", "last_value >= 0");
                    table.CheckConstraint("ck_txn_counter_year", "year >= 2020");
                });

            migrationBuilder.CreateTable(
                name: "transactions",
                schema: "txn",
                columns: table => new
                {
                    id = table.Column<string>(type: "character varying(26)", maxLength: 26, nullable: false),
                    transaction_no = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    customer_id = table.Column<string>(type: "character varying(26)", maxLength: 26, nullable: false),
                    amount = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    currency = table.Column<string>(type: "character(3)", fixedLength: true, maxLength: 3, nullable: false),
                    transaction_type = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    recipient_reference = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: false),
                    device_fingerprint_hash = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    city = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    country_code = table.Column<string>(type: "character(2)", fixedLength: true, maxLength: 2, nullable: false),
                    occurred_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    assessment_status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    assessment_deadline_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    effective_risk_score = table.Column<decimal>(type: "numeric(6,5)", nullable: true),
                    effective_risk_level = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    effective_fraud_type = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: true),
                    screening_decision = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    control_status = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    manual_review_reason = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_transactions", x => x.id);
                    table.CheckConstraint("ck_transactions_amount", "amount > 0");
                });

            migrationBuilder.CreateTable(
                name: "ai_assessments",
                schema: "txn",
                columns: table => new
                {
                    id = table.Column<string>(type: "character varying(26)", maxLength: 26, nullable: false),
                    external_assessment_id = table.Column<string>(type: "character varying(26)", maxLength: 26, nullable: false),
                    transaction_id = table.Column<string>(type: "character varying(26)", maxLength: 26, nullable: false),
                    source_event_id = table.Column<string>(type: "character varying(26)", maxLength: 26, nullable: false),
                    risk_score = table.Column<decimal>(type: "numeric(6,5)", nullable: false),
                    risk_level = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    decision = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    fraud_type = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    model_version = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    reason_codes = table.Column<string>(type: "jsonb", nullable: false),
                    analyst_candidates = table.Column<string>(type: "jsonb", nullable: false),
                    assessed_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    received_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    is_late = table.Column<bool>(type: "boolean", nullable: false),
                    is_primary = table.Column<bool>(type: "boolean", nullable: false),
                    payload_hash = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_ai_assessments", x => x.id);
                    table.ForeignKey(
                        name: "fk_ai_assessments_transactions_transaction_id",
                        column: x => x.transaction_id,
                        principalSchema: "txn",
                        principalTable: "transactions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "risk_cases",
                schema: "txn",
                columns: table => new
                {
                    id = table.Column<string>(type: "character varying(26)", maxLength: 26, nullable: false),
                    transaction_id = table.Column<string>(type: "character varying(26)", maxLength: 26, nullable: false),
                    customer_id = table.Column<string>(type: "character varying(26)", maxLength: 26, nullable: false),
                    primary_assessment_id = table.Column<string>(type: "character varying(26)", maxLength: 26, nullable: true),
                    status = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    assignment_status = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    assigned_analyst_id = table.Column<string>(type: "character varying(26)", maxLength: 26, nullable: true),
                    effective_risk_score = table.Column<decimal>(type: "numeric(6,5)", nullable: true),
                    effective_risk_level = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    effective_fraud_type = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: true),
                    sla_priority = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    sla_started_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    sla_deadline_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    sla_breached_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    sla_stopped_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    review_started_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    final_decision = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    decision_note = table.Column<string>(type: "text", nullable: true),
                    decided_by = table.Column<string>(type: "character varying(26)", maxLength: 26, nullable: true),
                    decided_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    closure_due_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    closed_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_risk_cases", x => x.id);
                    table.CheckConstraint("ck_risk_cases_block_note", "final_decision <> 'BLOCK' OR (decision_note IS NOT NULL AND char_length(trim(decision_note)) > 0)");
                    table.CheckConstraint("ck_risk_cases_closed", "status <> 'KAPANDI' OR closed_at IS NOT NULL");
                    table.CheckConstraint("ck_risk_cases_final_decision", "(status IN ('ONAYLANDI','BLOKLANDI','KAPANDI') AND final_decision IS NOT NULL AND decided_at IS NOT NULL) OR (status NOT IN ('ONAYLANDI','BLOKLANDI','KAPANDI'))");
                    table.ForeignKey(
                        name: "fk_risk_cases_transactions_transaction_id",
                        column: x => x.transaction_id,
                        principalSchema: "txn",
                        principalTable: "transactions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "temporary_blocks",
                schema: "txn",
                columns: table => new
                {
                    id = table.Column<string>(type: "character varying(26)", maxLength: 26, nullable: false),
                    transaction_id = table.Column<string>(type: "character varying(26)", maxLength: 26, nullable: false),
                    reason = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    applied_by = table.Column<string>(type: "character varying(26)", maxLength: 26, nullable: true),
                    source_event_id = table.Column<string>(type: "character varying(26)", maxLength: 26, nullable: true),
                    applied_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    released_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    release_reason = table.Column<string>(type: "text", nullable: true),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_temporary_blocks", x => x.id);
                    table.ForeignKey(
                        name: "fk_temporary_blocks_transactions_transaction_id",
                        column: x => x.transaction_id,
                        principalSchema: "txn",
                        principalTable: "transactions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "analyst_notes",
                schema: "txn",
                columns: table => new
                {
                    id = table.Column<string>(type: "character varying(26)", maxLength: 26, nullable: false),
                    case_id = table.Column<string>(type: "character varying(26)", maxLength: 26, nullable: false),
                    author_id = table.Column<string>(type: "character varying(26)", maxLength: 26, nullable: false),
                    author_role = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    note_text = table.Column<string>(type: "text", nullable: false),
                    parent_note_id = table.Column<string>(type: "character varying(26)", maxLength: 26, nullable: true),
                    revision_number = table.Column<int>(type: "integer", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_analyst_notes", x => x.id);
                    table.ForeignKey(
                        name: "fk_analyst_notes_risk_cases_case_id",
                        column: x => x.case_id,
                        principalSchema: "txn",
                        principalTable: "risk_cases",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "case_assignments",
                schema: "txn",
                columns: table => new
                {
                    id = table.Column<string>(type: "character varying(26)", maxLength: 26, nullable: false),
                    case_id = table.Column<string>(type: "character varying(26)", maxLength: 26, nullable: false),
                    analyst_id = table.Column<string>(type: "character varying(26)", maxLength: 26, nullable: false),
                    status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    assignment_source = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    assigned_by = table.Column<string>(type: "character varying(26)", maxLength: 26, nullable: true),
                    assignment_reason = table.Column<string>(type: "text", nullable: true),
                    assigned_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    started_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    ended_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_case_assignments", x => x.id);
                    table.ForeignKey(
                        name: "fk_case_assignments_risk_cases_case_id",
                        column: x => x.case_id,
                        principalSchema: "txn",
                        principalTable: "risk_cases",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "case_overrides",
                schema: "txn",
                columns: table => new
                {
                    id = table.Column<string>(type: "character varying(26)", maxLength: 26, nullable: false),
                    case_id = table.Column<string>(type: "character varying(26)", maxLength: 26, nullable: false),
                    override_type = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    previous_value = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    new_value = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    reason = table.Column<string>(type: "text", nullable: false),
                    actor_id = table.Column<string>(type: "character varying(26)", maxLength: 26, nullable: false),
                    actor_role = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    source_event_id = table.Column<string>(type: "character varying(26)", maxLength: 26, nullable: true),
                    occurred_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_case_overrides", x => x.id);
                    table.ForeignKey(
                        name: "fk_case_overrides_risk_cases_case_id",
                        column: x => x.case_id,
                        principalSchema: "txn",
                        principalTable: "risk_cases",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "case_transitions",
                schema: "txn",
                columns: table => new
                {
                    id = table.Column<string>(type: "character varying(26)", maxLength: 26, nullable: false),
                    case_id = table.Column<string>(type: "character varying(26)", maxLength: 26, nullable: false),
                    previous_status = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    new_status = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    actor_id = table.Column<string>(type: "character varying(26)", maxLength: 26, nullable: true),
                    actor_role = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: true),
                    transition_source = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    reason = table.Column<string>(type: "text", nullable: true),
                    correlation_id = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    causation_id = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                    source_event_id = table.Column<string>(type: "character varying(26)", maxLength: 26, nullable: true),
                    case_version_before = table.Column<long>(type: "bigint", nullable: false),
                    case_version_after = table.Column<long>(type: "bigint", nullable: false),
                    occurred_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_case_transitions", x => x.id);
                    table.ForeignKey(
                        name: "fk_case_transitions_risk_cases_case_id",
                        column: x => x.case_id,
                        principalSchema: "txn",
                        principalTable: "risk_cases",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "customer_feedback",
                schema: "txn",
                columns: table => new
                {
                    id = table.Column<string>(type: "character varying(26)", maxLength: 26, nullable: false),
                    case_id = table.Column<string>(type: "character varying(26)", maxLength: 26, nullable: false),
                    transaction_id = table.Column<string>(type: "character varying(26)", maxLength: 26, nullable: false),
                    customer_id = table.Column<string>(type: "character varying(26)", maxLength: 26, nullable: false),
                    rating = table.Column<int>(type: "integer", nullable: false),
                    comment = table.Column<string>(type: "text", nullable: true),
                    submitted_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    source_event_id = table.Column<string>(type: "character varying(26)", maxLength: 26, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_customer_feedback", x => x.id);
                    table.CheckConstraint("ck_customer_feedback_rating", "rating >= 1 AND rating <= 5");
                    table.ForeignKey(
                        name: "fk_customer_feedback_risk_cases_case_id",
                        column: x => x.case_id,
                        principalSchema: "txn",
                        principalTable: "risk_cases",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "customer_verifications",
                schema: "txn",
                columns: table => new
                {
                    id = table.Column<string>(type: "character varying(26)", maxLength: 26, nullable: false),
                    case_id = table.Column<string>(type: "character varying(26)", maxLength: 26, nullable: false),
                    customer_id = table.Column<string>(type: "character varying(26)", maxLength: 26, nullable: false),
                    requested_by = table.Column<string>(type: "character varying(26)", maxLength: 26, nullable: false),
                    message = table.Column<string>(type: "text", nullable: true),
                    status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    response = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    requested_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    expires_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    responded_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_customer_verifications", x => x.id);
                    table.CheckConstraint("ck_verifications_expiry", "expires_at > requested_at");
                    table.ForeignKey(
                        name: "fk_customer_verifications_risk_cases_case_id",
                        column: x => x.case_id,
                        principalSchema: "txn",
                        principalTable: "risk_cases",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "ix_ai_assessments_transaction_time",
                schema: "txn",
                table: "ai_assessments",
                columns: new[] { "transaction_id", "received_at" });

            migrationBuilder.CreateIndex(
                name: "ux_ai_assessments_external",
                schema: "txn",
                table: "ai_assessments",
                column: "external_assessment_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ux_ai_assessments_primary",
                schema: "txn",
                table: "ai_assessments",
                column: "transaction_id",
                unique: true,
                filter: "is_primary = true");

            migrationBuilder.CreateIndex(
                name: "ux_ai_assessments_source_event",
                schema: "txn",
                table: "ai_assessments",
                column: "source_event_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_analyst_notes_case_time",
                schema: "txn",
                table: "analyst_notes",
                columns: new[] { "case_id", "created_at" });

            migrationBuilder.CreateIndex(
                name: "ix_case_assignments_analyst_active",
                schema: "txn",
                table: "case_assignments",
                columns: new[] { "analyst_id", "assigned_at" },
                filter: "status IN ('ASSIGNED', 'IN_PROGRESS')");

            migrationBuilder.CreateIndex(
                name: "ux_case_assignments_active_case",
                schema: "txn",
                table: "case_assignments",
                column: "case_id",
                unique: true,
                filter: "status IN ('ASSIGNED', 'IN_PROGRESS')");

            migrationBuilder.CreateIndex(
                name: "ix_case_overrides_case_time",
                schema: "txn",
                table: "case_overrides",
                columns: new[] { "case_id", "occurred_at" });

            migrationBuilder.CreateIndex(
                name: "ix_case_transitions_actor_time",
                schema: "txn",
                table: "case_transitions",
                columns: new[] { "actor_id", "occurred_at" },
                filter: "actor_id IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "ix_case_transitions_case_time",
                schema: "txn",
                table: "case_transitions",
                columns: new[] { "case_id", "occurred_at" });

            migrationBuilder.CreateIndex(
                name: "ux_customer_feedback_case",
                schema: "txn",
                table: "customer_feedback",
                column: "case_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_verifications_expiry",
                schema: "txn",
                table: "customer_verifications",
                column: "expires_at",
                filter: "status = 'PENDING'");

            migrationBuilder.CreateIndex(
                name: "ux_verifications_pending_case",
                schema: "txn",
                table: "customer_verifications",
                column: "case_id",
                unique: true,
                filter: "status = 'PENDING'");

            migrationBuilder.CreateIndex(
                name: "ux_idempotency_scope_actor_key",
                schema: "txn",
                table: "idempotency_records",
                columns: new[] { "scope", "actor_id", "idempotency_key" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_inbox_processed_at",
                schema: "txn",
                table: "inbox_messages",
                column: "processed_at");

            migrationBuilder.CreateIndex(
                name: "ix_outbox_pending",
                schema: "txn",
                table: "outbox_messages",
                columns: new[] { "next_attempt_at", "occurred_at" },
                filter: "published_at IS NULL");

            migrationBuilder.CreateIndex(
                name: "ix_cases_assigned_analyst",
                schema: "txn",
                table: "risk_cases",
                columns: new[] { "assigned_analyst_id", "sla_priority", "sla_deadline_at" },
                filter: "status IN ('ATANDI', 'INCELENIYOR', 'MUSTERI_DOGRULAMA')");

            migrationBuilder.CreateIndex(
                name: "ix_cases_assignment_queue",
                schema: "txn",
                table: "risk_cases",
                columns: new[] { "sla_priority", "sla_deadline_at" },
                filter: "assignment_status = 'QUEUED'");

            migrationBuilder.CreateIndex(
                name: "ix_cases_closure_due",
                schema: "txn",
                table: "risk_cases",
                column: "closure_due_at",
                filter: "status IN ('ONAYLANDI', 'BLOKLANDI') AND closed_at IS NULL");

            migrationBuilder.CreateIndex(
                name: "ix_cases_manual_queue",
                schema: "txn",
                table: "risk_cases",
                column: "created_at",
                filter: "assignment_status = 'MANUAL_QUEUE'");

            migrationBuilder.CreateIndex(
                name: "ix_cases_risk_status_time",
                schema: "txn",
                table: "risk_cases",
                columns: new[] { "effective_risk_level", "status", "created_at" });

            migrationBuilder.CreateIndex(
                name: "ix_cases_sla_due",
                schema: "txn",
                table: "risk_cases",
                column: "sla_deadline_at",
                filter: "sla_breached_at IS NULL AND final_decision IS NULL");

            migrationBuilder.CreateIndex(
                name: "ux_risk_cases_transaction",
                schema: "txn",
                table: "risk_cases",
                column: "transaction_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_temp_blocks_active_transaction",
                schema: "txn",
                table: "temporary_blocks",
                column: "transaction_id",
                filter: "released_at IS NULL");

            migrationBuilder.CreateIndex(
                name: "ux_temp_blocks_active_reason",
                schema: "txn",
                table: "temporary_blocks",
                columns: new[] { "transaction_id", "reason" },
                unique: true,
                filter: "released_at IS NULL");

            migrationBuilder.CreateIndex(
                name: "ix_transactions_assessment_pending",
                schema: "txn",
                table: "transactions",
                column: "assessment_deadline_at",
                filter: "assessment_status = 'PENDING'");

            migrationBuilder.CreateIndex(
                name: "ix_transactions_control_status",
                schema: "txn",
                table: "transactions",
                columns: new[] { "control_status", "created_at" });

            migrationBuilder.CreateIndex(
                name: "ix_transactions_customer_time",
                schema: "txn",
                table: "transactions",
                columns: new[] { "customer_id", "occurred_at" });

            migrationBuilder.CreateIndex(
                name: "ux_transactions_no",
                schema: "txn",
                table: "transactions",
                column: "transaction_no",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ai_assessments",
                schema: "txn");

            migrationBuilder.DropTable(
                name: "analyst_eligibility_projection",
                schema: "txn");

            migrationBuilder.DropTable(
                name: "analyst_notes",
                schema: "txn");

            migrationBuilder.DropTable(
                name: "analyst_workloads",
                schema: "txn");

            migrationBuilder.DropTable(
                name: "case_assignments",
                schema: "txn");

            migrationBuilder.DropTable(
                name: "case_overrides",
                schema: "txn");

            migrationBuilder.DropTable(
                name: "case_transitions",
                schema: "txn");

            migrationBuilder.DropTable(
                name: "customer_feedback",
                schema: "txn");

            migrationBuilder.DropTable(
                name: "customer_verifications",
                schema: "txn");

            migrationBuilder.DropTable(
                name: "idempotency_records",
                schema: "txn");

            migrationBuilder.DropTable(
                name: "inbox_messages",
                schema: "txn");

            migrationBuilder.DropTable(
                name: "outbox_messages",
                schema: "txn");

            migrationBuilder.DropTable(
                name: "temporary_blocks",
                schema: "txn");

            migrationBuilder.DropTable(
                name: "transaction_number_counters",
                schema: "txn");

            migrationBuilder.DropTable(
                name: "risk_cases",
                schema: "txn");

            migrationBuilder.DropTable(
                name: "transactions",
                schema: "txn");
        }
    }
}
